import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export type UsageMetric = 'candidate' | 'lead' | 'ai';

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a tenant can perform an action. Throws ForbiddenException if over limit.
   */
  async enforce(tenantId: string, metric: UsageMetric, increment = 1): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        plan: true,
        maxCandidatesPerMonth: true,
        maxLeadsPerMonth: true,
        maxAiUsagePerMonth: true,
        currentCandidateUsage: true,
        currentLeadUsage: true,
        currentAiUsage: true,
      },
    });

    if (!tenant) throw new ForbiddenException('Tenant not found');

    const checks: Record<UsageMetric, { current: number; max: number; label: string }> = {
      candidate: {
        current: tenant.currentCandidateUsage,
        max: tenant.maxCandidatesPerMonth,
        label: 'candidate import',
      },
      lead: {
        current: tenant.currentLeadUsage,
        max: tenant.maxLeadsPerMonth,
        label: 'lead import',
      },
      ai: {
        current: tenant.currentAiUsage,
        max: tenant.maxAiUsagePerMonth,
        label: 'AI processing',
      },
    };

    const check = checks[metric];
    if (check.current + increment > check.max) {
      throw new ForbiddenException(
        `You've reached your monthly ${check.label} capacity (${check.max}). ` +
        `Please upgrade your plan to continue.`,
      );
    }
  }

  /**
   * Increment usage counter after a successful operation.
   */
  async increment(tenantId: string, metric: UsageMetric, amount = 1): Promise<void> {
    const field = {
      candidate: 'currentCandidateUsage',
      lead: 'currentLeadUsage',
      ai: 'currentAiUsage',
    }[metric];

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { [field]: { increment: amount } },
    });
  }

  /**
   * Check and increment in one call (enforce first, then increment).
   */
  async enforceAndIncrement(tenantId: string, metric: UsageMetric, amount = 1): Promise<void> {
    await this.enforce(tenantId, metric, amount);
    await this.increment(tenantId, metric, amount);
  }

  /**
   * Get usage summary for a tenant.
   */
  async getUsageSummary(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        plan: true,
        maxUsers: true,
        maxCandidatesPerMonth: true,
        maxLeadsPerMonth: true,
        maxAiUsagePerMonth: true,
        currentCandidateUsage: true,
        currentLeadUsage: true,
        currentAiUsage: true,
        usageResetAt: true,
        _count: { select: { users: { where: { isActive: true } } } },
      },
    });

    if (!tenant) throw new ForbiddenException('Tenant not found');

    return {
      plan: tenant.plan,
      users_used: tenant._count.users,
      users_limit: tenant.maxUsers,
      candidates_used: tenant.currentCandidateUsage,
      candidates_limit: tenant.maxCandidatesPerMonth,
      leads_used: tenant.currentLeadUsage,
      leads_limit: tenant.maxLeadsPerMonth,
      ai_used: tenant.currentAiUsage,
      ai_limit: tenant.maxAiUsagePerMonth,
      usage_reset_at: tenant.usageResetAt,
    };
  }

  /**
   * Monthly usage reset job — runs at midnight on the 1st of each month.
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async resetMonthlyUsage(): Promise<void> {
    await this.prisma.tenant.updateMany({
      data: {
        currentCandidateUsage: 0,
        currentLeadUsage: 0,
        currentAiUsage: 0,
        usageResetAt: new Date(),
      },
    });
  }

  /**
   * Admin override: manually set limits for enterprise tenants.
   */
  async setCustomLimits(
    tenantId: string,
    limits: {
      maxUsers?: number;
      maxCandidatesPerMonth?: number;
      maxLeadsPerMonth?: number;
      maxAiUsagePerMonth?: number;
    },
  ) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: limits,
    });
  }
}
