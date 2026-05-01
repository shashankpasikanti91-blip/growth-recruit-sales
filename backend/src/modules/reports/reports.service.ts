import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as xlsx from 'xlsx';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── 9.1 Placement Velocity ──────────────────────────────────────────────

  async getPlacementVelocity(
    tenantId: string,
    from?: string,
    to?: string,
    recruiterId?: string,
    clientId?: string,
  ) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 90 * 86400000);
    const toDate = to ? new Date(to) : new Date();

    const offers = await this.prisma.offer.findMany({
      where: {
        tenantId,
        status: 'ACCEPTED',
        createdAt: { gte: fromDate, lte: toDate },
      },
      include: {
        submission: {
          include: {
            job: {
              include: {
                client: { select: { name: true } },
              },
            },
            candidate: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const filtered = offers.filter((o) => {
      if (recruiterId && o.submission?.job?.assignedRecruiterId !== recruiterId) return false;
      if (clientId && o.submission?.job?.clientId !== clientId) return false;
      return true;
    });

    // Batch load recruiter names
    const recruiterIds = [...new Set(
      filtered.map(o => o.submission?.job?.assignedRecruiterId).filter((id): id is string => !!id),
    )];
    const recruiterUsers = recruiterIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: recruiterIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const recruiterMap = Object.fromEntries(
      recruiterUsers.map(u => [u.id, `${u.firstName} ${u.lastName}`]),
    );

    return filtered.map((o) => {
        const sub = o.submission;
        const job = sub?.job;
        const jobCreated = job?.createdAt ?? sub?.createdAt ?? o.createdAt;
        const subCreated = sub?.createdAt ?? o.createdAt;
        const offerDate = o.createdAt;

        const timeToSubmit = Math.round(
          (subCreated.getTime() - jobCreated.getTime()) / 86400000,
        );
        const timeToOffer = Math.round(
          (offerDate.getTime() - subCreated.getTime()) / 86400000,
        );

        return {
          offerDate: offerDate.toISOString().split('T')[0],
          candidate: sub?.candidate
            ? `${sub.candidate.firstName} ${sub.candidate.lastName}`.trim() || '—'
            : '—',
          jobTitle: job?.title ?? '—',
          client: job?.client?.name ?? '—',
          recruiter: job?.assignedRecruiterId
            ? recruiterMap[job.assignedRecruiterId] ?? '—'
            : '—',
          timeToSubmitDays: timeToSubmit,
          timeToOfferDays: timeToOffer,
          totalDays: timeToSubmit + timeToOffer,
        };
      });
  }

  // ─── 9.2 Sales Pipeline Report ───────────────────────────────────────────

  async getSalesPipeline(tenantId: string, from?: string, to?: string, userId?: string) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const toDate = to ? new Date(to) : new Date();

    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        role: { in: ['SALES', 'TENANT_ADMIN'] },
        isActive: true,
        ...(userId ? { id: userId } : {}),
      },
      select: { id: true, firstName: true, lastName: true },
    });

    const rows = await Promise.all(
      users.map(async (u) => {
        const [leads, converted, opps, overdue] = await Promise.all([
          this.prisma.lead.count({
            where: { tenantId, assignedToId: u.id, createdAt: { gte: fromDate, lte: toDate } },
          }),
          this.prisma.lead.count({
            where: {
              tenantId,
              assignedToId: u.id,
              convertedToClientId: { not: null },
              createdAt: { gte: fromDate, lte: toDate },
            },
          }),
          this.prisma.opportunity.findMany({
            where: { tenantId, ownerId: u.id },
            select: { value: true },
          }),
          this.prisma.followUp.count({
            where: {
              tenantId,
              ownerId: u.id,
              scheduledAt: { lt: new Date() },
              status: { not: 'DONE' },
            },
          }),
        ]);

        const pipeline = opps.reduce((sum, op) => sum + (Number(op.value) || 0), 0);
        const conversionRate = leads > 0 ? Math.round((converted / leads) * 100) : 0;

        return {
          user: `${u.firstName} ${u.lastName}`,
          leadsThisPeriod: leads,
          leadsConverted: converted,
          conversionRatePct: conversionRate,
          pipelineValue: pipeline,
          overdueFollowUps: overdue,
        };
      }),
    );

    return rows;
  }

  // ─── 9.3 Recruiter Performance ───────────────────────────────────────────

  async getRecruiterPerformance(tenantId: string, from?: string, to?: string, userId?: string) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const toDate = to ? new Date(to) : new Date();

    const recruiters = await this.prisma.user.findMany({
      where: {
        tenantId,
        role: { in: ['RECRUITER', 'TENANT_ADMIN'] },
        isActive: true,
        ...(userId ? { id: userId } : {}),
      },
      select: { id: true, firstName: true, lastName: true },
    });

    const rows = await Promise.all(
      recruiters.map(async (u) => {
        const [jds, candidates, submissions, interviews, acceptedOffers, totalSubs] =
          await Promise.all([
            this.prisma.job.count({ where: { tenantId, assignedRecruiterId: u.id } }),
            this.prisma.candidate.count({
              where: { tenantId, assignedToId: u.id, createdAt: { gte: fromDate, lte: toDate } },
            }),
            this.prisma.submission.count({
              where: { tenantId, recruiterId: u.id, createdAt: { gte: fromDate, lte: toDate } },
            }),
            this.prisma.interview.count({
              where: {
                tenantId,
                submission: { recruiterId: u.id },
                createdAt: { gte: fromDate, lte: toDate },
              },
            }),
            this.prisma.offer.count({
              where: {
                tenantId,
                status: 'ACCEPTED',
                submission: { recruiterId: u.id },
                createdAt: { gte: fromDate, lte: toDate },
              },
            }),
            this.prisma.submission.count({ where: { tenantId, recruiterId: u.id } }),
          ]);

        const placementRate =
          totalSubs > 0 ? Math.round((acceptedOffers / totalSubs) * 100) : 0;

        return {
          recruiter: `${u.firstName} ${u.lastName}`,
          jdsAssigned: jds,
          candidatesSourced: candidates,
          submissionsMade: submissions,
          interviewsArranged: interviews,
          offersAccepted: acceptedOffers,
          placementRatePct: placementRate,
        };
      }),
    );

    return rows.sort((a, b) => b.offersAccepted - a.offersAccepted);
  }

  // ─── 9.4 Client Activity ─────────────────────────────────────────────────

  async getClientActivity(tenantId: string, from?: string, to?: string, clientId?: string) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const toDate = to ? new Date(to) : new Date();

    const clients = await this.prisma.client.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(clientId ? { id: clientId } : {}),
      },
      select: { id: true, name: true, updatedAt: true },
      take: 100,
    });

    const rows = await Promise.all(
      clients.map(async (c) => {
        const [openJds, submissions, interviews, offers, placements] = await Promise.all([
          this.prisma.job.count({ where: { tenantId, clientId: c.id, isActive: true, deletedAt: null } }),
          this.prisma.submission.count({
            where: {
              tenantId,
              job: { clientId: c.id },
              createdAt: { gte: fromDate, lte: toDate },
            },
          }),
          this.prisma.interview.count({
            where: {
              tenantId,
              submission: { job: { clientId: c.id } },
              createdAt: { gte: fromDate, lte: toDate },
            },
          }),
          this.prisma.offer.count({
            where: {
              tenantId,
              submission: { job: { clientId: c.id } },
              createdAt: { gte: fromDate, lte: toDate },
            },
          }),
          this.prisma.offer.count({
            where: {
              tenantId,
              status: 'ACCEPTED',
              submission: { job: { clientId: c.id } },
              createdAt: { gte: fromDate, lte: toDate },
            },
          }),
        ]);

        return {
          client: c.name,
          openJds,
          submissions,
          interviews,
          offers,
          placements,
          lastActivity: c.updatedAt.toISOString().split('T')[0],
        };
      }),
    );

    return rows.sort((a, b) => b.submissions - a.submissions);
  }

  // ─── 9.5 AI Usage ────────────────────────────────────────────────────────

  async getAiUsage(tenantId: string, from?: string, to?: string, userId?: string) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const toDate = to ? new Date(to) : new Date();

    const users = await this.prisma.user.findMany({
      where: { tenantId, isActive: true, ...(userId ? { id: userId } : {}) },
      select: { id: true, firstName: true, lastName: true },
    });

    const rows = await Promise.all(
      users.map(async (u) => {
        const [screens, leadsGenerated] = await Promise.all([
          this.prisma.aiAnalysisResult.count({
            where: { tenantId, createdAt: { gte: fromDate, lte: toDate } },
          }),
          this.prisma.lead.count({
            where: {
              tenantId,
              assignedToId: u.id,
              sourceName: { in: ['APOLLO', 'APIFY', 'GOOGLE_MAPS'] },
              createdAt: { gte: fromDate, lte: toDate },
            },
          }),
        ]);

        return {
          user: `${u.firstName} ${u.lastName}`,
          aiScreensRun: screens,
          leadsGenerated,
        };
      }),
    );

    return rows.filter((r) => r.aiScreensRun > 0 || r.leadsGenerated > 0);
  }

  // ─── Dashboard widget layout (stored in user.settings JSON) ───────────────

  async getWidgetLayout(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true, role: true },
    });

    const settings = (user?.settings ?? {}) as Record<string, unknown>;
    const layout = (settings['dashboardWidgets'] as string[] | undefined) ?? this.defaultWidgets(user?.role ?? 'VIEWER');
    return { layout };
  }

  async saveWidgetLayout(userId: string, layout: string[]) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });
    const existing = (user?.settings ?? {}) as Record<string, unknown>;
    await this.prisma.user.update({
      where: { id: userId },
      data: { settings: { ...existing, dashboardWidgets: layout } },
    });
    return { layout };
  }

  private defaultWidgets(role: string): string[] {
    if (role === 'RECRUITER') {
      return ['my_submission_funnel', 'open_jds_by_client', 'follow_ups_overdue', 'ai_screening_volume'];
    }
    if (role === 'SALES') {
      return ['revenue_pipeline', 'lead_conversion_rate', 'follow_ups_overdue', 'open_jds_by_client'];
    }
    return ['placement_velocity', 'revenue_pipeline', 'lead_conversion_rate', 'top_recruiter', 'ai_screening_volume', 'follow_ups_overdue'];
  }

  // ─── Export helpers ───────────────────────────────────────────────────────

  buildCsv(rows: Record<string, unknown>[]): string {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const lines = [
      headers.join(','),
      ...rows.map((r) =>
        headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','),
      ),
    ];
    return lines.join('\n');
  }

  buildXlsx(rows: Record<string, unknown>[], sheetName = 'Report'): Buffer {
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(wb, ws, sheetName);
    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
