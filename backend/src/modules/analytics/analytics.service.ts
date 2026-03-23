import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  private sinceDate(days: number) {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  private buildDailyBuckets(days: number): { date: string; label: string }[] {
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(Date.now() - (days - 1 - i) * 86400000);
      return {
        date: d.toISOString().split('T')[0],
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      };
    });
  }

  async getRecruitmentSummary(tenantId: string, days = 30) {
    const cacheKey = `analytics:recruitment:${tenantId}:${days}`;
    return this.cache.getOrSet(cacheKey, async () => {
      const since = this.sinceDate(days);
      const prevSince = this.sinceDate(days * 2);

    const [
      totalCandidates, prevCandidates,
      totalApplications, prevApplications,
      stageBreakdown,
      aiScreened, prevAiScreened,
      placed, prevPlaced,
      candidatesOverTime,
      applicationsOverTime,
      topSkillsData,
    ] = await Promise.all([
      this.prisma.candidate.count({ where: { tenantId, createdAt: { gte: since } } }),
      this.prisma.candidate.count({ where: { tenantId, createdAt: { gte: prevSince, lt: since } } }),
      this.prisma.application.count({ where: { tenantId, appliedAt: { gte: since } } }),
      this.prisma.application.count({ where: { tenantId, appliedAt: { gte: prevSince, lt: since } } }),
      this.prisma.application.groupBy({ by: ['stage'], where: { tenantId }, _count: true }),
      this.prisma.aiAnalysisResult.count({ where: { tenantId, createdAt: { gte: since } } }),
      this.prisma.aiAnalysisResult.count({ where: { tenantId, createdAt: { gte: prevSince, lt: since } } }),
      this.prisma.application.count({ where: { tenantId, stage: 'PLACED', updatedAt: { gte: since } } }),
      this.prisma.application.count({ where: { tenantId, stage: 'PLACED', updatedAt: { gte: prevSince, lt: since } } }),
      this.prisma.candidate.findMany({ where: { tenantId, createdAt: { gte: since } }, select: { createdAt: true } }),
      this.prisma.application.findMany({ where: { tenantId, appliedAt: { gte: since } }, select: { appliedAt: true } }),
      this.prisma.candidate.findMany({ where: { tenantId }, select: { skills: true }, take: 1000 }),
    ]);

    const buckets = this.buildDailyBuckets(Math.min(days, 30));
    const candMap: Record<string, number> = {};
    for (const c of candidatesOverTime) {
      const d = c.createdAt.toISOString().split('T')[0];
      candMap[d] = (candMap[d] ?? 0) + 1;
    }
    const appMap: Record<string, number> = {};
    for (const a of applicationsOverTime) {
      const d = a.appliedAt.toISOString().split('T')[0];
      appMap[d] = (appMap[d] ?? 0) + 1;
    }
    const timeSeries = buckets.map(b => ({
      date: b.date,
      label: b.label,
      candidates: candMap[b.date] ?? 0,
      applications: appMap[b.date] ?? 0,
    }));

    const skillMap: Record<string, number> = {};
    for (const c of topSkillsData) {
      for (const s of (c.skills as string[]) ?? []) {
        skillMap[s] = (skillMap[s] ?? 0) + 1;
      }
    }
    const topSkills = Object.entries(skillMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([skill, count]) => ({ skill, count }));

    const stageOrder = ['SOURCED', 'SCREENED', 'INTERVIEWING', 'OFFERED', 'PLACED'];
    const stageMap: Record<string, number> = {};
    for (const s of stageBreakdown) stageMap[s.stage] = s._count;
    const sourcedCount = stageMap['SOURCED'] ?? 1;
    const funnel = stageOrder.map(stage => ({
      stage,
      count: stageMap[stage] ?? 0,
      rate: Math.round(((stageMap[stage] ?? 0) / sourcedCount) * 100),
    }));

    const pct = (curr: number, prev: number) =>
      prev === 0 ? 100 : Math.round(((curr - prev) / prev) * 100);

      return {
        period: { days, since: since.toISOString() },
        kpis: {
          candidates: { value: totalCandidates, change: pct(totalCandidates, prevCandidates) },
          applications: { value: totalApplications, change: pct(totalApplications, prevApplications) },
          aiScreenings: { value: aiScreened, change: pct(aiScreened, prevAiScreened) },
          placed: { value: placed, change: pct(placed, prevPlaced) },
        },
        stageBreakdown: stageBreakdown.map(s => ({ stage: s.stage, count: s._count })),
        funnel,
        timeSeries,
        topSkills,
      };
    }, 5 * 60); // cache 5 minutes
  }

  async getSalesSummary(tenantId: string, days = 30) {
    const cacheKey = `analytics:sales:${tenantId}:${days}`;
    return this.cache.getOrSet(cacheKey, async () => {
      const since = this.sinceDate(days);
      const prevSince = this.sinceDate(days * 2);

    const [
      totalLeads, prevLeads,
      totalCompanies,
      wonDeals, prevWonDeals,
      stageBreakdown,
      leadsOverTime,
      avgScore,
      topIndustries,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { tenantId, createdAt: { gte: since } } }),
      this.prisma.lead.count({ where: { tenantId, createdAt: { gte: prevSince, lt: since } } }),
      this.prisma.company.count({ where: { tenantId } }),
      this.prisma.lead.count({ where: { tenantId, stage: 'CLOSED_WON', updatedAt: { gte: since } } }),
      this.prisma.lead.count({ where: { tenantId, stage: 'CLOSED_WON', updatedAt: { gte: prevSince, lt: since } } }),
      this.prisma.lead.groupBy({ by: ['stage'], where: { tenantId }, _count: true }),
      this.prisma.lead.findMany({ where: { tenantId, createdAt: { gte: since } }, select: { createdAt: true } }),
      this.prisma.lead.aggregate({ where: { tenantId, score: { not: null } }, _avg: { score: true } }),
      this.prisma.company.groupBy({
        by: ['industry'],
        where: { tenantId, industry: { not: null } },
        _count: true,
        orderBy: { _count: { industry: 'desc' } },
        take: 8,
      }),
    ]);

    const buckets = this.buildDailyBuckets(Math.min(days, 30));
    const leadMap: Record<string, number> = {};
    for (const l of leadsOverTime) {
      const d = l.createdAt.toISOString().split('T')[0];
      leadMap[d] = (leadMap[d] ?? 0) + 1;
    }
    const timeSeries = buckets.map(b => ({ date: b.date, label: b.label, leads: leadMap[b.date] ?? 0 }));

    const pct = (curr: number, prev: number) =>
      prev === 0 ? 100 : Math.round(((curr - prev) / prev) * 100);

    const totalCount = stageBreakdown.reduce((s, x) => s + x._count, 0);
    const stageData = stageBreakdown.map(s => ({
      stage: s.stage,
      count: s._count,
      pct: totalCount > 0 ? Math.round((s._count / totalCount) * 100) : 0,
    }));

      return {
        period: { days, since: since.toISOString() },
        kpis: {
          leads: { value: totalLeads, change: pct(totalLeads, prevLeads) },
          companies: { value: totalCompanies, change: 0 },
          wonDeals: { value: wonDeals, change: pct(wonDeals, prevWonDeals) },
          avgScore: { value: Math.round(avgScore._avg.score ?? 0), change: 0 },
        },
        stageBreakdown: stageData,
        timeSeries,
        topIndustries: topIndustries.map(i => ({ industry: i.industry ?? 'Unknown', count: i._count })),
      };
    }, 5 * 60); // cache 5 minutes
  }

  async getAiUsage(tenantId: string, days = 30) {
    const cacheKey = `analytics:ai-usage:${tenantId}:${days}`;
    return this.cache.getOrSet(cacheKey, async () => {
      const since = this.sinceDate(days);

    const [logs, daily, totalAgg] = await Promise.all([
      this.prisma.aiUsageLog.groupBy({
        by: ['serviceType', 'model'],
        where: { tenantId, createdAt: { gte: since } },
        _count: true,
        _sum: { tokensInput: true, tokensOutput: true, cost: true },
      }),
      this.prisma.aiUsageLog.findMany({
        where: { tenantId, createdAt: { gte: since } },
        select: { createdAt: true, cost: true, tokensInput: true, tokensOutput: true },
      }),
      this.prisma.aiUsageLog.aggregate({
        where: { tenantId, createdAt: { gte: since } },
        _sum: { cost: true, tokensInput: true, tokensOutput: true },
      }),
    ]);

    const buckets = this.buildDailyBuckets(Math.min(days, 30));
    const costMap: Record<string, number> = {};
    const callMap: Record<string, number> = {};
    for (const l of daily) {
      const d = l.createdAt.toISOString().split('T')[0];
      costMap[d] = (costMap[d] ?? 0) + (l.cost ?? 0);
      callMap[d] = (callMap[d] ?? 0) + 1;
    }
    const timeSeries = buckets.map(b => ({
      date: b.date,
      label: b.label,
      calls: callMap[b.date] ?? 0,
      cost: Math.round((costMap[b.date] ?? 0) * 1000) / 1000,
    }));

      return {
        period: { days },
        summary: {
          totalCalls: daily.length,
          totalTokens: (totalAgg._sum.tokensInput ?? 0) + (totalAgg._sum.tokensOutput ?? 0),
          totalCost: Math.round((totalAgg._sum.cost ?? 0) * 100) / 100,
        },
        byService: logs.map(l => ({
          serviceType: l.serviceType,
          model: l.model,
          calls: l._count,
          tokensIn: l._sum.tokensInput ?? 0,
          tokensOut: l._sum.tokensOutput ?? 0,
          cost: Math.round((l._sum.cost ?? 0) * 100) / 100,
        })),
        timeSeries,
      };
    }, 5 * 60); // cache 5 minutes
  }

  async getDashboardKpis(tenantId: string) {
    const cacheKey = `analytics:dashboard:${tenantId}`;
    return this.cache.getOrSet(cacheKey, async () => {
      const since7 = this.sinceDate(7);
      const since30 = this.sinceDate(30);

    const [
      totalCandidates, newCandidates7d,
      totalLeads, newLeads7d,
      openJobs,
      openApplications,
      aiCallsThisMonth,
      recentActivities,
    ] = await Promise.all([
      this.prisma.candidate.count({ where: { tenantId, isActive: true } }),
      this.prisma.candidate.count({ where: { tenantId, createdAt: { gte: since7 } } }),
      this.prisma.lead.count({ where: { tenantId, isActive: true } }),
      this.prisma.lead.count({ where: { tenantId, createdAt: { gte: since7 } } }),
      this.prisma.job.count({ where: { tenantId, isActive: true } }),
      this.prisma.application.count({ where: { tenantId, stage: { notIn: ['PLACED', 'REJECTED', 'WITHDRAWN'] } } }),
      this.prisma.aiUsageLog.count({ where: { tenantId, createdAt: { gte: since30 } } }),
      this.prisma.activity.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          candidate: { select: { firstName: true, lastName: true } },
          lead: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

      return {
        kpis: [
          { label: 'Total Candidates', value: totalCandidates, sub: `+${newCandidates7d} this week`, color: 'blue', icon: 'users' },
          { label: 'Total Leads', value: totalLeads, sub: `+${newLeads7d} this week`, color: 'purple', icon: 'target' },
          { label: 'Open Jobs', value: openJobs, sub: `${openApplications} active applications`, color: 'green', icon: 'briefcase' },
          { label: 'AI Calls (30d)', value: aiCallsThisMonth, sub: 'Screenings + scoring', color: 'orange', icon: 'zap' },
        ],
        recentActivities,
      };
    }, 2 * 60); // cache 2 minutes — dashboard is high-traffic
  }
}
