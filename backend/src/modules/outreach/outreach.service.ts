import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OutreachGenerationService } from '../ai/services/outreach-generation.service';
import { IsString, IsOptional, IsEnum, IsArray, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  ) {}

  // ─── Generate outreach message(s) via AI ──────────────────────────────────

  async generate(tenantId: string, dto: GenerateOutreachDto) {
    // Load target profile
    let targetProfile: any;
    let context: any = { channel: dto.channel ?? 'EMAIL' };

    if (dto.targetType === 'CANDIDATE') {
      const candidate = await this.prisma.candidate.findFirst({ where: { id: dto.targetId, tenantId } });
      if (!candidate) throw new NotFoundException('Candidate not found');
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
      targetProfile = {
        name: `${lead.firstName} ${lead.lastName}`,
        title: lead.title,
        company: lead.company?.name,
        industry: (lead.company as any)?.industry,
      };
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
      const sequence = await this.prisma.outreachSequence.create({
        data: {
          tenantId,
          name: `AI Sequence - ${targetProfile.name} - ${new Date().toISOString().slice(0, 10)}`,
          entityType: dto.targetType,
          steps: outreachResult.sequence as any,
          isActive: true,
          messages: {
            create: outreachResult.sequence.map((msg) => ({
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

  // ─── Queries ────────────────────────────────────────────────────────────────

  async listMessages(tenantId: string, filters: { candidateId?: string; leadId?: string; status?: string; page?: number; limit?: number }) {
    const { candidateId, leadId, status, page = 1, limit = 20 } = filters;
    const where: any = { tenantId };
    if (candidateId) where.candidateId = candidateId;
    if (leadId) where.leadId = leadId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.outreachMessage.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
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
