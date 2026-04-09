import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { OutreachGenerationService } from '../ai/services/outreach-generation.service';
import { BusinessIdService } from '../billing/business-id.service';
import { IsString, IsOptional, IsEnum, IsArray, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as nodemailer from 'nodemailer';

export class GenerateOutreachDto {
  @ApiProperty({ enum: ['CANDIDATE', 'LEAD'] })
  @IsEnum(['CANDIDATE', 'LEAD'])
  targetType: 'CANDIDATE' | 'LEAD';

  @ApiProperty()
  @IsString()
  targetId: string;

  @ApiPropertyOptional({ description: 'Job ID for candidate outreach context' })
  @IsOptional()
  @IsString()
  jobId?: string;

  @ApiPropertyOptional({ description: 'Channel: EMAIL | LINKEDIN | WHATSAPP' })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional({ description: 'Number of follow-up steps in sequence' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  sequenceSteps?: number;
}

export class UpdateMessageStatusDto {
  @ApiProperty({ enum: ['PENDING', 'SENT', 'DELIVERED', 'OPENED', 'REPLIED', 'BOUNCED', 'OPTED_OUT'] })
  @IsString()
  status: string;
}

@Injectable()
export class OutreachService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outreachGen: OutreachGenerationService,
    private readonly businessIdService: BusinessIdService,
    private readonly config: ConfigService,
  ) {}

  // ─── Generate outreach message(s) via AI ──────────────────────────────────

  async generate(tenantId: string, dto: GenerateOutreachDto) {
    // Load target profile
    let targetProfile: any;
    let targetEmail: string | undefined;
    let context: any = { channel: dto.channel ?? 'EMAIL' };

    if (dto.targetType === 'CANDIDATE') {
      const candidate = await this.prisma.candidate.findFirst({ where: { id: dto.targetId, tenantId } });
      if (!candidate) throw new NotFoundException('Candidate not found');
      targetEmail = candidate.email ?? undefined;
      targetProfile = { name: `${candidate.firstName} ${candidate.lastName}`, title: candidate.currentTitle, skills: candidate.skills };

      if (dto.jobId) {
        const job = await this.prisma.job.findFirst({ where: { id: dto.jobId, tenantId } });
        if (job) context.jobTitle = job.title;
      }
    } else {
      const lead = await this.prisma.lead.findFirst({
        where: { id: dto.targetId, tenantId },
        include: { company: { select: { name: true, industry: true } } },
      });
      if (!lead) throw new NotFoundException('Lead not found');
      targetEmail = lead.email ?? undefined;
      targetProfile = {
        name: `${lead.firstName} ${lead.lastName}`,
        title: lead.title,
        company: lead.company?.name,
        industry: (lead.company as any)?.industry,
      };
    }

    // Check suppression list before generating — honour opt-outs
    if (targetEmail) {
      const isSuppressed = await this.checkSuppression(tenantId, targetEmail);
      if (isSuppressed) {
        throw new NotFoundException(`${targetEmail} is on the suppression list. Remove from suppression to generate outreach.`);
      }
    }

    if (dto.sequenceSteps && dto.sequenceSteps > 1) {
      // Multi-step sequence
      const outreachResult = await this.outreachGen.generateFollowUpSequence({
        entityType: dto.targetType.toLowerCase() as 'candidate' | 'lead',
        recipientData: targetProfile,
        previousOutreach: '',
        steps: dto.sequenceSteps,
      });

      // Create a sequence + messages in DB
      const messageBusinessIds = await this.businessIdService.generateBatch('outreachMessage', outreachResult.sequence.length);
      const sequence = await this.prisma.outreachSequence.create({
        data: {
          tenantId,
          name: `AI Sequence - ${targetProfile.name} - ${new Date().toISOString().slice(0, 10)}`,
          entityType: dto.targetType,
          steps: outreachResult.sequence as any,
          isActive: true,
          messages: {
            create: outreachResult.sequence.map((msg, idx) => ({
              businessId: messageBusinessIds[idx],
              tenantId,
              channel: dto.channel ?? 'EMAIL',
              subject: msg.subject,
              body: msg.body,
              status: 'DRAFT',
              ...(dto.targetType === 'CANDIDATE' ? { candidateId: dto.targetId } : { leadId: dto.targetId }),
            })),
          },
        },
        include: { messages: true },
      });
      return sequence;
    } else {
      // Single message
      const msg = await this.outreachGen.generate({
        channel: (dto.channel?.toLowerCase() ?? 'email') as 'email' | 'linkedin' | 'whatsapp',
        entityType: dto.targetType.toLowerCase() as 'candidate' | 'lead',
        tone: 'professional',
        recipientData: targetProfile,
        contextData: context,
      });

      const message = await this.prisma.outreachMessage.create({
        data: {
          businessId: await this.businessIdService.generate('outreachMessage'),
          tenantId,
          channel: dto.channel ?? 'EMAIL',
          subject: msg.subject,
          body: msg.body,
          status: 'DRAFT',
          ...(dto.targetType === 'CANDIDATE' ? { candidateId: dto.targetId } : { leadId: dto.targetId }),
        },
      });
      return message;
    }
  }

  // ─── Send email directly via SMTP ──────────────────────────────────────────

  async sendMessage(tenantId: string, messageId: string) {
    const msg = await this.prisma.outreachMessage.findFirst({
      where: { id: messageId, tenantId },
      include: {
        candidate: { select: { email: true, firstName: true, lastName: true } },
        lead: { select: { email: true, firstName: true, lastName: true } },
      },
    });
    if (!msg) throw new NotFoundException('Message not found');
    if (msg.channel !== 'EMAIL') throw new BadRequestException('Only EMAIL channel messages can be sent directly');
    if (msg.status === 'SENT') throw new BadRequestException('Message already sent');

    const recipientEmail = msg.candidate?.email ?? msg.lead?.email;
    if (!recipientEmail) throw new BadRequestException('Recipient has no email address');

    const smtpHost = this.config.get<string>('SMTP_HOST');
    const smtpUser = this.config.get<string>('SMTP_USER');
    const smtpPass = this.config.get<string>('SMTP_PASSWORD');
    const smtpFrom = this.config.get<string>('SMTP_FROM') ?? `SRP AI Labs <${smtpUser}>`;

    if (!smtpHost || !smtpUser || !smtpPass || smtpPass === 'changeme_smtp') {
      throw new BadRequestException(
        'SMTP is not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in server environment to send emails.',
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(this.config.get<string>('SMTP_PORT') ?? '587'),
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const recipientName = msg.candidate
      ? `${msg.candidate.firstName} ${msg.candidate.lastName}`.trim()
      : msg.lead
        ? `${msg.lead.firstName} ${msg.lead.lastName}`.trim()
        : recipientEmail;

    await transporter.sendMail({
      from: smtpFrom,
      to: `${recipientName} <${recipientEmail}>`,
      subject: msg.subject ?? 'Message from SRP AI Labs',
      html: msg.body,
    });

    const updated = await this.prisma.outreachMessage.update({
      where: { id: messageId },
      data: { status: 'SENT', sentAt: new Date() },
    });

    return { ...updated, recipientEmail };
  }

  // ─── Queries ────────────────────────────────────────────────────────────────

  async listMessages(tenantId: string, filters: { candidateId?: string; leadId?: string; status?: string; page?: number; limit?: number }) {
    const { candidateId, leadId, status, page = 1, limit = 20 } = filters;
    const where: any = { tenantId };
    if (candidateId) where.candidateId = candidateId;
    if (leadId) where.leadId = leadId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.outreachMessage.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          candidate: { select: { firstName: true, lastName: true, email: true } },
          lead: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.outreachMessage.count({ where }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async listSequences(tenantId: string) {
    return this.prisma.outreachSequence.findMany({
      where: { tenantId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateMessageStatus(tenantId: string, id: string, status: string) {
    const msg = await this.prisma.outreachMessage.findFirst({ where: { id, tenantId } });
    if (!msg) throw new NotFoundException('Message not found');
    return this.prisma.outreachMessage.update({ where: { id }, data: { status: status as any, sentAt: status === 'SENT' ? new Date() : undefined } });
  }

  async checkSuppression(tenantId: string, email: string): Promise<boolean> {
    const suppressed = await this.prisma.suppressionList.findFirst({ where: { tenantId, email } });
    return !!suppressed;
  }

  async addToSuppression(tenantId: string, email: string, reason?: string) {
    return this.prisma.suppressionList.upsert({
      where: { tenantId_email: { tenantId, email } },
      create: { tenantId, email, reason },
      update: { reason },
    });
  }
}
