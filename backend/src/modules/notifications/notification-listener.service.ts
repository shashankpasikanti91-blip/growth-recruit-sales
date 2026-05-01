import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationListenerService {
  private readonly logger = new Logger(NotificationListenerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── JD Assigned ────────────────────────────────────────────────────────────
  @OnEvent('job.assigned')
  async onJobAssigned(payload: {
    tenantId: string;
    jobId: string;
    jobTitle: string;
    recruiterId: string;
  }) {
    try {
      await this.notifications.create({
        tenantId: payload.tenantId,
        userId: payload.recruiterId,
        type: 'JD_ASSIGNED',
        title: 'New JD Assigned to You',
        body: `You have been assigned to "${payload.jobTitle}". Please review the requirements and start sourcing.`,
        entityType: 'job',
        entityId: payload.jobId,
      });
    } catch (err) {
      this.logger.error('job.assigned notification failed', err);
    }
  }

  // ── Submission Received ────────────────────────────────────────────────────
  @OnEvent('submission.created')
  async onSubmissionCreated(payload: {
    tenantId: string;
    submissionId: string;
    businessId: string;
    candidateId: string;
    jobId?: string;
    salesOwnerId?: string;
    createdById?: string;
  }) {
    if (!payload.salesOwnerId) return;
    try {
      // Fetch candidate name for a readable notification body
      const candidate = await this.prisma.candidate.findUnique({
        where: { id: payload.candidateId },
        select: { firstName: true, lastName: true },
      }).catch(() => null);

      const name = candidate
        ? `${candidate.firstName} ${candidate.lastName}`.trim()
        : 'A candidate';

      await this.notifications.create({
        tenantId: payload.tenantId,
        userId: payload.salesOwnerId,
        type: 'SUBMISSION_RECEIVED',
        title: 'Submission Created',
        body: `${name} has been submitted (${payload.businessId}). Track progress in the submissions view.`,
        entityType: 'submission',
        entityId: payload.submissionId,
      });
    } catch (err) {
      this.logger.error('submission.created notification failed', err);
    }
  }

  // ── Interview Scheduled ────────────────────────────────────────────────────
  @OnEvent('interview.scheduled')
  async onInterviewScheduled(payload: {
    tenantId: string;
    interviewId: string;
    submissionId: string;
    salesOwnerId?: string;
    candidateName: string;
    jobTitle: string;
    scheduledAt?: Date;
  }) {
    if (!payload.salesOwnerId) return;
    try {
      const when = payload.scheduledAt
        ? new Date(payload.scheduledAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
        : 'TBD';

      await this.notifications.create({
        tenantId: payload.tenantId,
        userId: payload.salesOwnerId,
        type: 'INTERVIEW_SCHEDULED',
        title: 'Interview Scheduled',
        body: `Interview for ${payload.candidateName || 'candidate'} on "${payload.jobTitle}" scheduled for ${when}.`,
        entityType: 'interview',
        entityId: payload.interviewId,
      });
    } catch (err) {
      this.logger.error('interview.scheduled notification failed', err);
    }
  }

  // ── Feedback Reminder Cron ─────────────────────────────────────────────────
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async feedbackReminder() {
    this.logger.log('Running feedback reminder cron…');
    try {
      const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

      const stale = await this.prisma.submission.findMany({
        where: {
          stage: 'SUBMITTED_TO_CLIENT',
          clientFeedback: null,
          submittedAt: { lte: since },
          deletedAt: null,
        },
        include: {
          job: { select: { title: true } },
          candidate: { select: { firstName: true, lastName: true } },
        },
      });

      for (const sub of stale) {
        if (!sub.salesOwnerId) continue;

        // Avoid duplicate reminders: check if one was sent in the last 24 h
        const recentlySent = await this.prisma.notification.findFirst({
          where: {
            userId: sub.salesOwnerId,
            type: 'FEEDBACK_REMINDER',
            entityId: sub.id,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });
        if (recentlySent) continue;

        const candidateName = `${sub.candidate?.firstName ?? ''} ${sub.candidate?.lastName ?? ''}`.trim();
        await this.notifications.create({
          tenantId: sub.tenantId,
          userId: sub.salesOwnerId,
          type: 'FEEDBACK_REMINDER',
          title: 'Client Feedback Overdue',
          body: `No feedback received for ${candidateName} on "${sub.job?.title ?? 'a job'}". Submitted 3+ days ago — please follow up with the client.`,
          entityType: 'submission',
          entityId: sub.id,
        }).catch(() => { /* non-critical */ });
      }

      this.logger.log(`Feedback reminders sent for ${stale.length} submission(s).`);
    } catch (err) {
      this.logger.error('Feedback reminder cron failed', err);
    }
  }
}
