import { Controller, Get, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('owner')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'owner', version: '1' })
export class OwnerController {
  constructor(private readonly prisma: PrismaService) {}

  private guard(user: any) {
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Owner access only');
    }
  }

  // ── Platform Overview ────────────────────────────────────────────────────────

  @Get('overview')
  @ApiOperation({ summary: 'Platform-wide stats — SUPER_ADMIN only' })
  async overview(@CurrentUser() user: any) {
    this.guard(user);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
    const today         = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalTenants, activeTenants, newTenantsLast30, newTenantsLast7, newTenantsToday,
      totalUsers, totalCandidates, totalLeads, totalJobs,
      totalAiCalls, aiCallsLast30,
      activeSubscriptions, trialingSubscriptions,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { isActive: true } }),
      this.prisma.tenant.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.tenant.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.tenant.count({ where: { createdAt: { gte: today } } }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.candidate.count({ where: { isActive: true } }),
      this.prisma.lead.count({ where: { isActive: true } }),
      this.prisma.job.count({ where: { isActive: true } }),
      this.prisma.aiUsageLog.count(),
      this.prisma.aiUsageLog.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.subscription.count({ where: { status: 'TRIALING' } }),
    ]);

    return {
      tenants: {
        total: totalTenants,
        active: activeTenants,
        newLast30Days: newTenantsLast30,
        newLast7Days: newTenantsLast7,
        newToday: newTenantsToday,
      },
      users: { total: totalUsers },
      data: { candidates: totalCandidates, leads: totalLeads, jobs: totalJobs },
      ai: { totalCalls: totalAiCalls, callsLast30Days: aiCallsLast30 },
      subscriptions: { active: activeSubscriptions, trialing: trialingSubscriptions },
    };
  }

  // ── All Tenants ──────────────────────────────────────────────────────────────

  @Get('tenants')
  @ApiOperation({ summary: 'List all tenants with usage — SUPER_ADMIN only' })
  async tenants(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('search') search?: string,
  ) {
    this.guard(user);

    const skip = (Number(page) - 1) * Number(limit);

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where: search
          ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { slug: { contains: search, mode: 'insensitive' } }] }
          : undefined,
        include: {
          _count: { select: { users: { where: { isActive: true } }, candidates: { where: { isActive: true } }, leads: { where: { isActive: true } } } },
          subscription: { include: { plan: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.tenant.count({
        where: search
          ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { slug: { contains: search, mode: 'insensitive' } }] }
          : undefined,
      }),
    ]);

    return {
      data: data.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        plan: t.plan,
        isActive: t.isActive,
        createdAt: t.createdAt,
        users: t._count.users,
        candidates: t._count.candidates,
        leads: t._count.leads,
        subscription: t.subscription
          ? {
              status: t.subscription.status,
              planName: (t.subscription as any).plan?.name ?? '—',
              trialEndsAt: t.subscription.trialEndsAt,
              currentPeriodEnd: t.subscription.currentPeriodEnd,
            }
          : null,
      })),
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    };
  }

  // ── Subscription / Revenue Breakdown ─────────────────────────────────────────

  @Get('subscriptions')
  @ApiOperation({ summary: 'All subscriptions with tenant details — SUPER_ADMIN only' })
  async subscriptions(@CurrentUser() user: any) {
    this.guard(user);

    const subs = await this.prisma.subscription.findMany({
      include: {
        plan: true,
        tenant: { select: { id: true, name: true, plan: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const planBreakdown = subs.reduce<Record<string, number>>((acc, s) => {
      const key = (s as any).plan?.name ?? 'Unknown';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const statusBreakdown = subs.reduce<Record<string, number>>((acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    }, {});

    return {
      total: subs.length,
      planBreakdown,
      statusBreakdown,
      list: subs.map((s) => ({
        id: s.id,
        tenantId: s.tenantId,
        tenantName: (s as any).tenant?.name ?? '—',
        planName: (s as any).plan?.name ?? '—',
        status: s.status,
        billingCycle: s.billingCycle,
        trialEndsAt: s.trialEndsAt,
        currentPeriodEnd: s.currentPeriodEnd,
        createdAt: s.createdAt,
      })),
    };
  }

  // ── Recent Signups ────────────────────────────────────────────────────────────

  @Get('signups')
  @ApiOperation({ summary: 'Recent signup feed — SUPER_ADMIN only' })
  async signups(@CurrentUser() user: any, @Query('days') days = 30) {
    this.guard(user);

    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    const tenants = await this.prisma.tenant.findMany({
      where: { createdAt: { gte: since } },
      include: {
        users: {
          where: { role: 'TENANT_ADMIN' },
          select: { email: true, firstName: true, lastName: true, createdAt: true },
          take: 1,
        },
        subscription: { include: { plan: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tenants.map((t) => ({
      tenantId: t.id,
      tenantName: t.name,
      plan: t.plan,
      createdAt: t.createdAt,
      admin: t.users[0] ?? null,
      subscription: t.subscription
        ? { status: t.subscription.status, planName: (t.subscription as any).plan?.name }
        : null,
    }));
  }

  // ── AI Usage Stats ────────────────────────────────────────────────────────────

  @Get('ai-usage')
  @ApiOperation({ summary: 'AI usage across all tenants — SUPER_ADMIN only' })
  async aiUsage(@CurrentUser() user: any, @Query('days') days = 30) {
    this.guard(user);

    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    const logs = await this.prisma.aiUsageLog.findMany({
      where: { createdAt: { gte: since } },
      select: { tenantId: true, serviceType: true, tokensInput: true, tokensOutput: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const byTenant = logs.reduce<Record<string, { calls: number; tokens: number }>>((acc, l) => {
      if (!acc[l.tenantId]) acc[l.tenantId] = { calls: 0, tokens: 0 };
      acc[l.tenantId].calls += 1;
      acc[l.tenantId].tokens += (l.tokensInput ?? 0) + (l.tokensOutput ?? 0);
      return acc;
    }, {});

    const byAction = logs.reduce<Record<string, number>>((acc, l) => {
      acc[l.serviceType] = (acc[l.serviceType] ?? 0) + 1;
      return acc;
    }, {});

    return {
      totalCalls: logs.length,
      totalTokens: logs.reduce((s, l) => s + (l.tokensInput ?? 0) + (l.tokensOutput ?? 0), 0),
      byAction,
      topTenants: Object.entries(byTenant)
        .sort((a, b) => b[1].calls - a[1].calls)
        .slice(0, 20)
        .map(([tenantId, stats]) => ({ tenantId, ...stats })),
    };
  }
}
