const analyticsService = require('../services/analyticsService');
const predictiveInsightsService = require('../services/predictiveInsightsService');
const advancedMatchingService = require('../services/advancedMatchingService');
const interviewAnalyticsService = require('../services/interviewAnalyticsService');
const prisma = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

class AdvancedAnalyticsController {
  // ========== Analytics Endpoints ==========

  async getFunnelAnalytics(req, res) {
    try {
      const { jobId } = req.query;
      const analytics = await analyticsService.getFunnelAnalytics(req.user.id, jobId);
      sendSuccess(res, analytics, 'Funnel analytics retrieved');
    } catch (error) {
      logger.error('Get funnel analytics error', error);
      sendError(res, error.message, 500);
    }
  }

  async getScoreDistribution(req, res) {
    try {
      const { jobId } = req.query;
      const distribution = await analyticsService.getScoreDistribution(req.user.id, jobId);
      sendSuccess(res, distribution, 'Score distribution retrieved');
    } catch (error) {
      logger.error('Get score distribution error', error);
      sendError(res, error.message, 500);
    }
  }

  async getJobMetrics(req, res) {
    try {
      const { jobId } = req.params;
      const metrics = await analyticsService.getJobMetrics(jobId);
      if (!metrics) {
        return sendError(res, 'Job not found', 404);
      }
      sendSuccess(res, metrics, 'Job metrics retrieved');
    } catch (error) {
      logger.error('Get job metrics error', error);
      sendError(res, error.message, 500);
    }
  }

  async getRecruiterPerformance(req, res) {
    try {
      const performance = await analyticsService.getRecruiterPerformance(req.user.id);
      sendSuccess(res, performance, 'Recruiter performance retrieved');
    } catch (error) {
      logger.error('Get recruiter performance error', error);
      sendError(res, error.message, 500);
    }
  }

  async getCandidateQualityInsights(req, res) {
    try {
      const insights = await analyticsService.getCandidateQualityInsights(req.user.id);
      sendSuccess(res, insights, 'Candidate quality insights retrieved');
    } catch (error) {
      logger.error('Get candidate quality insights error', error);
      sendError(res, error.message, 500);
    }
  }

  async getSkillsGapAnalysis(req, res) {
    try {
      const { jobId } = req.params;
      const analysis = await analyticsService.getSkillsGapAnalysis(jobId);
      if (!analysis) {
        return sendError(res, 'Job not found', 404);
      }
      sendSuccess(res, analysis, 'Skills gap analysis retrieved');
    } catch (error) {
      logger.error('Get skills gap analysis error', error);
      sendError(res, error.message, 500);
    }
  }

  // ========== Predictive Insights Endpoints ==========

  async predictCandidateSuccess(req, res) {
    try {
      const { candidateId, jobId } = req.body;
      if (!candidateId || !jobId) {
        return sendError(res, 'Missing candidateId or jobId', 400);
      }
      const prediction = await predictiveInsightsService.predictCandidateSuccess(candidateId, jobId);
      sendSuccess(res, prediction, 'Candidate success prediction generated');
    } catch (error) {
      logger.error('Predict candidate success error', error);
      sendError(res, error.message, 500);
    }
  }

  async predictJobFillDifficulty(req, res) {
    try {
      const { jobId } = req.body;
      if (!jobId) {
        return sendError(res, 'Missing jobId', 400);
      }
      const prediction = await predictiveInsightsService.predictJobFillDifficulty(jobId);
      sendSuccess(res, prediction, 'Job fill difficulty prediction generated');
    } catch (error) {
      logger.error('Predict job fill difficulty error', error);
      sendError(res, error.message, 500);
    }
  }

  async getAttritionRisk(req, res) {
    try {
      const { hiredCandidateIds } = req.body;
      const risks = await predictiveInsightsService.getAttritionRisk(hiredCandidateIds);
      sendSuccess(res, risks, 'Attrition risk analysis retrieved');
    } catch (error) {
      logger.error('Get attrition risk error', error);
      sendError(res, error.message, 500);
    }
  }

  // ========== Advanced Matching Endpoints ==========

  async calculateAdvancedMatch(req, res) {
    try {
      const { candidateId, jobId } = req.body;
      if (!candidateId || !jobId) {
        return sendError(res, 'Missing candidateId or jobId', 400);
      }
      const match = await advancedMatchingService.calculateAdvancedMatch(candidateId, jobId);
      sendSuccess(res, match, 'Advanced candidate-job match calculated');
    } catch (error) {
      logger.error('Calculate advanced match error', error);
      sendError(res, error.message, 500);
    }
  }

  async findBestMatches(req, res) {
    try {
      const { jobId, limit } = req.body;
      if (!jobId) {
        return sendError(res, 'Missing jobId', 400);
      }
      const matches = await advancedMatchingService.findBestMatches(jobId, limit || 10);
      sendSuccess(res, matches, 'Best matches for job retrieved');
    } catch (error) {
      logger.error('Find best matches error', error);
      sendError(res, error.message, 500);
    }
  }

  async findBestJobs(req, res) {
    try {
      const { candidateId, limit } = req.body;
      if (!candidateId) {
        return sendError(res, 'Missing candidateId', 400);
      }
      const jobs = await advancedMatchingService.findBestJobs(candidateId, limit || 5);
      sendSuccess(res, jobs, 'Best jobs for candidate retrieved');
    } catch (error) {
      logger.error('Find best jobs error', error);
      sendError(res, error.message, 500);
    }
  }

  // ========== Interview Analytics Endpoints ==========

  async recordInterviewPerformance(req, res) {
    try {
      const performance = await interviewAnalyticsService.recordInterviewPerformance(req.body);
      sendSuccess(res, performance, 'Interview performance recorded', 201);
    } catch (error) {
      logger.error('Record interview performance error', error);
      sendError(res, error.message, 500);
    }
  }

  async getInterviewMetrics(req, res) {
    try {
      const { jobId } = req.params;
      const metrics = await interviewAnalyticsService.getInterviewToOfferMetrics(jobId);
      sendSuccess(res, metrics, 'Interview metrics retrieved');
    } catch (error) {
      logger.error('Get interview metrics error', error);
      sendError(res, error.message, 500);
    }
  }

  async scheduleInterviewWithTracking(req, res) {
    try {
      const { candidateEmail, candidateName, jobTitle, dateTime, type } = req.body;
      if (!candidateEmail || !candidateName || !jobTitle || !dateTime) {
        return sendError(res, 'Missing required fields', 400);
      }
      const schedule = await interviewAnalyticsService.scheduleInterviewWithTracking(
        candidateEmail,
        candidateName,
        jobTitle,
        dateTime,
        type
      );
      sendSuccess(res, schedule, 'Interview scheduled with tracking', 201);
    } catch (error) {
      logger.error('Schedule interview error', error);
      sendError(res, error.message, 500);
    }
  }

  async getTimelineAnalytics(req, res) {
    try {
      const now = new Date();
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Monthly hiring data (past 6 months)
      const candidates = await prisma.candidate.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: 'asc' },
      });

      const jobs = await prisma.job.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: 'asc' },
      });

      const screenings = await prisma.screening.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, score: true, recommendation: true },
        orderBy: { createdAt: 'asc' },
      });

      const applications = await prisma.application.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: 'asc' },
      });

      // Build monthly breakdown
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(d.getMonth() - i);
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const m = d.getMonth();
        const y = d.getFullYear();

        const monthCandidates = candidates.filter(c => c.createdAt.getMonth() === m && c.createdAt.getFullYear() === y);
        const monthJobs = jobs.filter(j => j.createdAt.getMonth() === m && j.createdAt.getFullYear() === y);
        const monthScreenings = screenings.filter(s => s.createdAt.getMonth() === m && s.createdAt.getFullYear() === y);
        const monthApps = applications.filter(a => a.createdAt.getMonth() === m && a.createdAt.getFullYear() === y);

        months.push({
          month: label,
          candidates: monthCandidates.length,
          jobs: monthJobs.length,
          screenings: monthScreenings.length,
          applications: monthApps.length,
          hired: monthCandidates.filter(c => c.status === 'HIRED').length,
          avgScore: monthScreenings.length > 0
            ? Math.round(monthScreenings.reduce((sum, s) => sum + s.score, 0) / monthScreenings.length)
            : 0,
        });
      }

      // Current pipeline (present)
      const allCandidates = await prisma.candidate.groupBy({
        by: ['status'],
        _count: true,
      });
      const allJobs = await prisma.job.groupBy({
        by: ['status'],
        _count: true,
      });

      const pipeline = {
        candidatesByStatus: Object.fromEntries(allCandidates.map(c => [c.status, c._count])),
        jobsByStatus: Object.fromEntries(allJobs.map(j => [j.status, j._count])),
      };

      // Future projections (simple trend)
      const recentMonths = months.slice(-3);
      const avgCandidatesPerMonth = Math.round(recentMonths.reduce((s, m) => s + m.candidates, 0) / 3);
      const avgJobsPerMonth = Math.round(recentMonths.reduce((s, m) => s + m.jobs, 0) / 3);
      const avgScreeningsPerMonth = Math.round(recentMonths.reduce((s, m) => s + m.screenings, 0) / 3);
      const avgHiredPerMonth = Math.round(recentMonths.reduce((s, m) => s + m.hired, 0) / 3);

      const projections = [];
      for (let i = 1; i <= 3; i++) {
        const d = new Date(now);
        d.setMonth(d.getMonth() + i);
        projections.push({
          month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          candidates: avgCandidatesPerMonth,
          jobs: avgJobsPerMonth,
          screenings: avgScreeningsPerMonth,
          hired: avgHiredPerMonth,
          projected: true,
        });
      }

      sendSuccess(res, {
        past: months,
        present: pipeline,
        future: projections,
        totals: {
          totalCandidates: await prisma.candidate.count(),
          totalJobs: await prisma.job.count(),
          totalScreenings: await prisma.screening.count(),
          totalApplications: await prisma.application.count(),
          totalHired: await prisma.candidate.count({ where: { status: 'HIRED' } }),
        },
      }, 'Timeline analytics retrieved');
    } catch (error) {
      logger.error('Timeline analytics error', error);
      sendError(res, error.message, 500);
    }
  }
}

module.exports = new AdvancedAnalyticsController();
