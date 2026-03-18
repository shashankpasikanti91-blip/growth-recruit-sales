import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'asc' },
    });
  }

  async getPlanById(id: string) {
    return this.prisma.plan.findUnique({ where: { id } });
  }

  async getSubscription(tenantId: string) {
    return this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });
  }

  async getInvoices(tenantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.invoice.count({ where: { tenantId } }),
    ]);
    return { data, total, page, limit };
  }

  async getUsageSummary(tenantId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    const [candidates, leads, aiCalls, imports] = await Promise.all([
      this.prisma.candidate.count({ where: { tenantId, isActive: true } }),
      this.prisma.lead.count({ where: { tenantId, isActive: true } }),
      this.prisma.aiUsageLog.count({
        where: {
          tenantId,
          createdAt: { gte: subscription?.currentPeriodStart ?? new Date(0) },
        },
      }),
      this.prisma.sourceImport.count({
        where: {
          tenantId,
          createdAt: { gte: subscription?.currentPeriodStart ?? new Date(0) },
        },
      }),
    ]);

    const plan = subscription?.plan;

    return {
      subscription,
      usage: {
        candidates: { used: candidates, limit: plan?.maxCandidates ?? 0 },
        leads: { used: leads, limit: plan?.maxLeads ?? 0 },
        aiCalls: { used: aiCalls, limit: plan?.maxAiCalls ?? 0 },
        imports: { used: imports, limit: plan?.maxImports ?? 0 },
      },
    };
  }

  async changePlan(tenantId: string, planId: string, billingCycle: 'monthly' | 'annual') {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error('Plan not found');

    const now = new Date();
    const days = billingCycle === 'annual' ? 365 : 30;
    const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.prisma.subscription.upsert({
      where: { tenantId },
      update: {
        planId,
        billingCycle,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
      },
      create: {
        tenantId,
        planId,
        billingCycle,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      include: { plan: true },
    });
  }
}
