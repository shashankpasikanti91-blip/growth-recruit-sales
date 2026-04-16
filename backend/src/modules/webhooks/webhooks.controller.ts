import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ApplicationsService } from '../applications/applications.service';
import { LeadsService } from '../leads/leads.service';
import { OutreachService } from '../outreach/outreach.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import {
  CandidateImportedDto,
  LeadImportedDto,
  TriggerScreeningDto,
  TriggerOutreachDto,
  ScoreLeadDto,
  MessageStatusDto,
  OptOutDto,
} from './dto/webhook.dto';

/**
 * Secured webhook endpoints for n8n to call back into the backend.
 * ALL n8n workflows must hit these endpoints — they cannot touch the DB directly.
 * Auth: X-N8N-Secret header checked against N8N_WEBHOOK_SECRET env var.
 */
@ApiTags('Webhooks (n8n)')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly applicationsService: ApplicationsService,
    private readonly leadsService: LeadsService,
    private readonly outreachService: OutreachService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Auth Guard ──────────────────────────────────────────────────────────────

  private verifySecret(secret: string | undefined) {
    const expected = this.config.get<string>('N8N_WEBHOOK_SECRET');
    if (!expected || !secret) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
    // Timing-safe comparison: both buffers must be the same length
    const secretBuf = Buffer.from(secret, 'utf8');
    const expectedBuf = Buffer.from(expected, 'utf8');
    if (secretBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(secretBuf, expectedBuf)) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
  }

  // ─── Candidate imported from n8n source workflow ─────────────────────────────

  @Post('candidate-imported')
  @ApiOperation({ summary: 'n8n notifies backend that a candidate was imported' })
  @ApiHeader({ name: 'X-N8N-Secret', required: true })
  async candidateImported(
    @Headers('x-n8n-secret') secret: string,
    @Body() payload: CandidateImportedDto,
  ) {
    this.verifySecret(secret);
    this.logger.log(`Candidate imported webhook: ${payload.candidateId}`);

    this.eventEmitter.emit('candidate.imported', {
      tenantId: payload.tenantId,
      candidateId: payload.candidateId,
    });

    return { received: true };
  }

  // ─── Lead imported from n8n source workflow ───────────────────────────────────

  @Post('lead-imported')
  @ApiOperation({ summary: 'n8n notifies backend that a lead was ingested' })
  @ApiHeader({ name: 'X-N8N-Secret', required: true })
  async leadImported(
    @Headers('x-n8n-secret') secret: string,
    @Body() payload: LeadImportedDto,
  ) {
    this.verifySecret(secret);
    this.logger.log(`Lead imported webhook: ${payload.leadId}`);

    this.eventEmitter.emit('lead.imported', {
      tenantId: payload.tenantId,
      leadId: payload.leadId,
    });

    return { received: true };
  }

  // ─── Trigger AI screening for an application ─────────────────────────────────

  @Post('trigger-screening')
  @ApiOperation({ summary: 'n8n triggers AI screening for an application' })
  @ApiHeader({ name: 'X-N8N-Secret', required: true })
  async triggerScreening(
    @Headers('x-n8n-secret') secret: string,
    @Body() payload: TriggerScreeningDto,
  ) {
    this.verifySecret(secret);
    return this.applicationsService.screenApplication(payload.tenantId, payload.applicationId, payload.resumeText);
  }

  // ─── Trigger outreach generation ──────────────────────────────────────────────

  @Post('trigger-outreach')
  @ApiOperation({ summary: 'n8n triggers AI outreach generation for a candidate or lead' })
  @ApiHeader({ name: 'X-N8N-Secret', required: true })
  async triggerOutreach(
    @Headers('x-n8n-secret') secret: string,
    @Body() payload: TriggerOutreachDto,
  ) {
    this.verifySecret(secret);
    return this.outreachService.generate(payload.tenantId, {
      targetType: payload.targetType,
      targetId: payload.targetId,
      jobId: payload.jobId,
      channel: payload.channel,
      sequenceSteps: payload.sequenceSteps,
    });
  }

  // ─── Score a lead ─────────────────────────────────────────────────────────────

  @Post('score-lead')
  @ApiOperation({ summary: 'n8n triggers AI ICP scoring for a lead' })
  @ApiHeader({ name: 'X-N8N-Secret', required: true })
  async scoreLead(
    @Headers('x-n8n-secret') secret: string,
    @Body() payload: ScoreLeadDto,
  ) {
    this.verifySecret(secret);
    return this.leadsService.scoreLead(payload.tenantId, payload.leadId);
  }

  // ─── Outreach message delivery status from n8n email/LinkedIn node ───────────

  @Post('message-status')
  @ApiOperation({ summary: 'n8n reports delivery status of an outreach message' })
  @ApiHeader({ name: 'X-N8N-Secret', required: true })
  async messageStatus(
    @Headers('x-n8n-secret') secret: string,
    @Body() payload: MessageStatusDto,
  ) {
    this.verifySecret(secret);
    return this.outreachService.updateMessageStatus(payload.tenantId, payload.messageId, payload.status);
  }

  // ─── Opt-out / unsubscribe ────────────────────────────────────────────────────

  @Post('opt-out')
  @ApiOperation({ summary: 'n8n reports that a contact opted out — add to suppression list' })
  @ApiHeader({ name: 'X-N8N-Secret', required: true })
  async optOut(
    @Headers('x-n8n-secret') secret: string,
    @Body() payload: OptOutDto,
  ) {
    this.verifySecret(secret);
    return this.outreachService.addToSuppression(payload.tenantId, payload.email, payload.reason);
  }
}
