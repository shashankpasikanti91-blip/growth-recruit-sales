import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MyHubService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Profile ────────────────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: {
        id: true, businessId: true, firstName: true, lastName: true,
        fullName: true, email: true, role: true, status: true,
        lastLoginAt: true, createdAt: true, settings: true,
      },
    });
    return user;
  }

  async updateProfile(userId: string, tenantId: string, dto: {
    firstName?: string;
    lastName?: string;
    settings?: Record<string, any>;
  }) {
    const data: any = {};
    if (dto.firstName !== undefined) { data.firstName = dto.firstName; data.fullName = `${dto.firstName} ${dto.lastName ?? ''}`; }
    if (dto.lastName  !== undefined) { data.lastName  = dto.lastName;  data.fullName = `${dto.firstName ?? ''} ${dto.lastName}`; }
    if (dto.settings  !== undefined) data.settings    = dto.settings;

    await this.prisma.user.updateMany({
      where: { id: userId, tenantId },
      data,
    });
    return this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true, firstName: true, lastName: true, fullName: true, email: true, role: true, settings: true },
    });
  }

  // ── Role-aware Dashboard ───────────────────────────────────────────────────

  async getDashboard(userId: string, tenantId: string, role: string) {
    const now   = new Date();
    const month = new Date(now.getFullYear(), now.getMonth(), 1);

    const isRecruiter = ['RECRUITER', 'TENANT_ADMIN', 'SUPER_ADMIN'].includes(role);
    const isSales     = ['SALES', 'TENANT_ADMIN', 'SUPER_ADMIN'].includes(role);

    const [
      myActiveJDs, mySubmissionsThisMonth, myOpenLeads, myFollowUpsToday, myOverdueFollowUps,
    ] = await Promise.all([
      isRecruiter
        ? this.prisma.job.count({ where: { assignedRecruiterId: userId, tenantId, isActive: true } })
        : 0,
      isRecruiter
        ? this.prisma.submission.count({ where: { recruiterId: userId, tenantId, deletedAt: null, createdAt: { gte: month } } })
        : 0,
      isSales
        ? this.prisma.lead.count({ where: { assignedToId: userId, tenantId, isActive: true, convertedToClientId: null } })
        : 0,
      this.prisma.followUp.count({
        where: {
          ownerId: userId, tenantId, status: 'PENDING',
          scheduledAt: { gte: new Date(now.setHours(0,0,0,0)), lte: new Date(now.setHours(23,59,59,999)) },
        },
      }),
      this.prisma.followUp.count({
        where: { ownerId: userId, tenantId, status: 'PENDING', scheduledAt: { lt: new Date() } },
      }),
    ]);

    return {
      myActiveJDs,
      mySubmissionsThisMonth,
      myOpenLeads,
      myFollowUpsToday,
      myOverdueFollowUps,
    };
  }

  // ── My JDs ─────────────────────────────────────────────────────────────────

  async getMyJDs(userId: string, tenantId: string, opts: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 20 } = opts;
    const where = { assignedRecruiterId: userId, tenantId };

    const [items, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, businessId: true, title: true, department: true,
          location: true, isActive: true, createdAt: true,
          _count: { select: { applications: true } },
        },
      }),
      this.prisma.job.count({ where }),
    ]);

    // Attach submission counts per job
    const jobIds = items.map(j => j.id);
    const submissionCounts = await this.prisma.submission.groupBy({
      by: ['jobId'],
      where: { jobId: { in: jobIds }, recruiterId: userId, deletedAt: null },
      _count: { id: true },
    });
    const subMap = Object.fromEntries(submissionCounts.map(s => [s.jobId, s._count.id]));

    const enriched = items.map(j => ({ ...j, mySubmissions: subMap[j.id] ?? 0 }));
    return { items: enriched, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ── My Submissions ─────────────────────────────────────────────────────────

  async getMySubmissions(userId: string, tenantId: string, opts: { page?: number; limit?: number; stage?: string } = {}) {
    const { page = 1, limit = 20, stage } = opts;
    const where: any = { recruiterId: userId, tenantId, deletedAt: null, ...(stage && { stage }) };

    const [items, total] = await Promise.all([
      this.prisma.submission.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          candidate: { select: { id: true, firstName: true, lastName: true, currentTitle: true } },
          job:       { select: { id: true, title: true } },
          client:    { select: { id: true, name: true } },
        },
      }),
      this.prisma.submission.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ── My Leads ───────────────────────────────────────────────────────────────

  async getMyLeads(userId: string, tenantId: string, opts: { page?: number; limit?: number; stage?: string } = {}) {
    const { page = 1, limit = 20, stage } = opts;
    const where: any = {
      assignedToId: userId, tenantId, isActive: true,
      convertedToClientId: null, ...(stage && { stage }),
    };

    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          icp:     { select: { id: true, name: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ── My Follow-ups ──────────────────────────────────────────────────────────

  async getMyFollowUps(userId: string, tenantId: string, opts: { view?: string; page?: number; limit?: number } = {}) {
    const { view = 'all', page = 1, limit = 25 } = opts;
    const now = new Date();

    let scheduledFilter: any = {};
    if (view === 'today') {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const end   = new Date(now); end.setHours(23, 59, 59, 999);
      scheduledFilter = { scheduledAt: { gte: start, lte: end } };
    } else if (view === 'overdue') {
      scheduledFilter = { scheduledAt: { lt: now }, status: 'PENDING' };
    } else if (view === 'week') {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const end   = new Date(now); end.setDate(now.getDate() + 7);
      scheduledFilter = { scheduledAt: { gte: start, lte: end } };
    } else if (view === 'completed') {
      const since = new Date(now); since.setDate(now.getDate() - 30);
      scheduledFilter = { status: 'COMPLETED', completedAt: { gte: since } };
    }

    const statusFilter = view === 'completed' ? 'COMPLETED' : 'PENDING';
    const where: any = {
      ownerId: userId, tenantId, status: statusFilter,
      ...scheduledFilter,
    };

    const [items, total] = await Promise.all([
      this.prisma.followUp.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: {
          lead:   { select: { id: true, businessId: true, companyName: true } },
          client: { select: { id: true, name: true } },
        },
      }),
      this.prisma.followUp.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ── My Activity ────────────────────────────────────────────────────────────

  async getMyActivity(userId: string, tenantId: string, opts: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 50 } = opts;
    const where = { userId, tenantId };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, action: true, entityType: true, entityId: true,
          newValue: true, createdAt: true,
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
