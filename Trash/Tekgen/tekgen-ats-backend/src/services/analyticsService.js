const prisma = require('../config/database');
const logger = require('../utils/logger');

class AnalyticsService {
  /**
   * Get comprehensive analytics for recruitment funnel
   */
  async getFunnelAnalytics(userId, jobId = null) {
    try {
      const whereClause = { userId };
      let screeningWhere = {};

      if (jobId) {
        whereClause.id = jobId;
        screeningWhere.jobId = jobId;
      }

      // Get all applications data
      const applications = await prisma.application.findMany({
        where: {
          job: {
            userId,
          },
        },
        include: {
          candidate: true,
          job: true,
        },
      });

      // Group by status
      const statusCounts = {};
      applications.forEach(app => {
        statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
      });

      // Calculate conversion rates
      const total = applications.length;
      const conversionRates = {
        applied_to_screened: 0,
        screened_to_shortlisted: 0,
        shortlisted_to_interview: 0,
        interview_to_offered: 0,
      };

      if (statusCounts.APPLIED) {
        conversionRates.applied_to_screened = Math.round(
          ((statusCounts.SCREENED || 0) / statusCounts.APPLIED) * 100
        );
      }

      if (statusCounts.SCREENED) {
        conversionRates.screened_to_shortlisted = Math.round(
          ((statusCounts.SHORTLISTED || 0) / statusCounts.SCREENED) * 100
        );
      }

      if (statusCounts.INTERVIEWED || 0) {
        conversionRates.interview_to_offered = Math.round(
          ((statusCounts.OFFERED || 0) / (statusCounts.INTERVIEWED || 1)) * 100
        );
      }

      return {
        total,
        statusBreakdown: statusCounts,
        conversionRates,
        avgTimeInPipeline: await this.calculateAverageTimeInPipeline(userId),
      };
    } catch (error) {
      logger.error('Get funnel analytics error', error);
      throw error;
    }
  }

  /**
   * Calculate average time candidates spend in pipeline
   */
  async calculateAverageTimeInPipeline(userId) {
    try {
      const applications = await prisma.application.findMany({
        where: {
          job: {
            userId,
          },
        },
        include: {
          candidate: true,
        },
      });

      if (applications.length === 0) return 0;

      let totalTime = 0;
      applications.forEach(app => {
        const timeInDays = Math.floor(
          (new Date() - new Date(app.appliedAt)) / (1000 * 60 * 60 * 24)
        );
        totalTime += timeInDays;
      });

      return Math.round(totalTime / applications.length);
    } catch (error) {
      logger.error('Calculate average time error', error);
      return 0;
    }
  }

  /**
   * Get screening score distribution
   */
  async getScoreDistribution(userId, jobId = null) {
    try {
      const screenings = await prisma.screening.findMany({
        where: jobId ? { jobId, job: { userId } } : { job: { userId } },
      });

      // Create score ranges
      const ranges = {
        '0-20': 0,
        '21-40': 0,
        '41-60': 0,
        '61-80': 0,
        '81-100': 0,
      };

      screenings.forEach(screening => {
        if (screening.score <= 20) ranges['0-20']++;
        else if (screening.score <= 40) ranges['21-40']++;
        else if (screening.score <= 60) ranges['41-60']++;
        else if (screening.score <= 80) ranges['61-80']++;
        else ranges['81-100']++;
      });

      const avgScore = screenings.length > 0
        ? Math.round(screenings.reduce((sum, s) => sum + s.score, 0) / screenings.length)
        : 0;

      return {
        distribution: ranges,
        averageScore: avgScore,
        totalScreened: screenings.length,
      };
    } catch (error) {
      logger.error('Get score distribution error', error);
      throw error;
    }
  }

  /**
   * Get job performance metrics
   */
  async getJobMetrics(jobId) {
    try {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          applications: {
            include: {
              candidate: true,
            },
          },
        },
      });

      if (!job) return null;

      const screenings = await prisma.screening.findMany({
        where: { jobId },
      });

      const metrics = {
        jobTitle: job.title,
        department: job.department,
        location: job.location,
        applications: job.applications.length,
        screened: screenings.length,
        topCandidates: screenings
          .sort((a, b) => b.score - a.score)
          .slice(0, 5),
        avgScore: screenings.length > 0
          ? Math.round(screenings.reduce((sum, s) => sum + s.score, 0) / screenings.length)
          : 0,
        timeToFill: Math.floor(
          (new Date() - new Date(job.createdAt)) / (1000 * 60 * 60 * 24)
        ),
      };

      return metrics;
    } catch (error) {
      logger.error('Get job metrics error', error);
      throw error;
    }
  }

  /**
   * Get recruiter performance analytics
   */
  async getRecruiterPerformance(userId) {
    try {
      const candidates = await prisma.candidate.findMany({
        where: { userId },
      });

      const jobs = await prisma.job.findMany({
        where: { userId },
      });

      const applications = await prisma.application.findMany({
        where: { userId },
      });

      const screenings = await prisma.screening.findMany({
        where: { userId },
      });

      const hiredCandidates = candidates.filter(c => c.status === 'HIRED').length;

      return {
        totalCandidates: candidates.length,
        totalJobs: jobs.length,
        totalApplications: applications.length,
        totalScreenings: screenings.length,
        hiredCount: hiredCandidates,
        hireSuccessRate: applications.length > 0
          ? Math.round((hiredCandidates / applications.length) * 100)
          : 0,
        avgScreeningScore: screenings.length > 0
          ? Math.round(screenings.reduce((sum, s) => sum + s.score, 0) / screenings.length)
          : 0,
      };
    } catch (error) {
      logger.error('Get recruiter performance error', error);
      throw error;
    }
  }

  /**
   * Get candidate quality insights
   */
  async getCandidateQualityInsights(userId) {
    try {
      const screenings = await prisma.screening.findMany({
        where: { user: { id: userId } },
        include: {
          candidate: true,
          job: true,
        },
        orderBy: { score: 'desc' },
      });

      const recommendations = {
        STRONG_MATCH: screenings.filter(s => s.recommendation === 'STRONG_MATCH').length,
        GOOD_MATCH: screenings.filter(s => s.recommendation === 'GOOD_MATCH').length,
        MODERATE_MATCH: screenings.filter(s => s.recommendation === 'MODERATE_MATCH').length,
        WEAK_MATCH: screenings.filter(s => s.recommendation === 'WEAK_MATCH').length,
        NOT_SUITABLE: screenings.filter(s => s.recommendation === 'NOT_SUITABLE').length,
      };

      return {
        totalScreenings: screenings.length,
        recommendations,
        topPerformers: screenings.slice(0, 10).map(s => ({
          candidateName: `${s.candidate.firstName} ${s.candidate.lastName}`,
          jobTitle: s.job.title,
          score: s.score,
          recommendation: s.recommendation,
        })),
      };
    } catch (error) {
      logger.error('Get candidate quality insights error', error);
      throw error;
    }
  }

  /**
   * Get skills gap analysis
   */
  async getSkillsGapAnalysis(jobId) {
    try {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
      });

      if (!job) return null;

      const screenings = await prisma.screening.findMany({
        where: { jobId },
      });

      const skillsGap = {};

      job.requiredSkills.forEach(skill => {
        let found = 0;
        screenings.forEach(screening => {
          if (screening.matchedSkills.includes(skill)) {
            found++;
          }
        });
        skillsGap[skill] = {
          required: true,
          coverage: screenings.length > 0 ? Math.round((found / screenings.length) * 100) : 0,
          candidatesHaving: found,
        };
      });

      return {
        jobTitle: job.title,
        requiredSkills: job.requiredSkills,
        skillsGap,
        overallCoverage: Object.values(skillsGap).reduce((sum, s) => sum + s.coverage, 0) / Object.keys(skillsGap).length,
      };
    } catch (error) {
      logger.error('Get skills gap analysis error', error);
      throw error;
    }
  }
}

module.exports = new AnalyticsService();
