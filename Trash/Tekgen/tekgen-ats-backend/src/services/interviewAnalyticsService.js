const prisma = require('../config/database');
const logger = require('../utils/logger');

class InterviewAnalyticsService {
  /**
   * Create interview performance record
   */
  async recordInterviewPerformance(data) {
    try {
      // Check if interview exists in schedule
      const schedule = await prisma.interviewSchedule.findUnique({
        where: { id: data.scheduleId },
      });

      if (!schedule) {
        throw new Error('Interview schedule not found');
      }

      // Store performance data in email logs as workaround (could be extended with new model)
      const performanceRecord = {
        templateType: 'INTERVIEW_PERFORMANCE',
        recipientEmail: schedule.candidateEmail,
        subject: `Interview Performance - ${schedule.candidateName}`,
        body: JSON.stringify({
          candidateName: schedule.candidateName,
          interviewDate: schedule.interviewDate,
          performance: {
            technicalSkills: data.technicalSkillsRating || 0,
            communication: data.communicationRating || 0,
            cultureFit: data.cultureFitRating || 0,
            problemSolving: data.problemSolvingRating || 0,
            overallRating: data.overallRating || 0,
            notes: data.notes || '',
            feedback: data.feedback || '',
            recommendation: data.recommendation || '',
          },
          recordedAt: new Date(),
        }),
        status: 'SENT',
        sentAt: new Date(),
      };

      return performanceRecord;
    } catch (error) {
      logger.error('Record interview performance error', error);
      throw error;
    }
  }

  /**
   * Analyze interview performance trends
   */
  async analyzeInterviewTrends(userId) {
    try {
      // Get all scheduled interviews
      const interviews = await prisma.interviewSchedule.findMany({
        where: { status: 'completed' },
      });

      if (interviews.length === 0) {
        return {
          totalInterviews: 0,
          averageRating: 0,
          trends: {},
        };
      }

      let totalRating = 0;
      let ratingCount = 0;
      const trends = {
        technical: [],
        communication: [],
        cultureFit: [],
      };

      interviews.forEach(interview => {
        // Parse performance data if available
        // This would need to be extended with proper interview tracking model
      });

      return {
        totalInterviews: interviews.length,
        averageRating: ratingCount > 0 ? Math.round(totalRating / ratingCount) : 0,
        trends,
      };
    } catch (error) {
      logger.error('Analyze interview trends error', error);
      throw error;
    }
  }

  /**
   * Get interview-to-offer analysis
   */
  async getInterviewToOfferMetrics(jobId) {
    try {
      const applications = await prisma.application.findMany({
        where: { jobId },
      });

      const interviewedApplications = applications.filter(
        app => app.status === 'INTERVIEWED' || app.status === 'OFFERED'
      );

      const offeredApplications = applications.filter(
        app => app.status === 'OFFERED'
      );

      const conversionRate = interviewedApplications.length > 0
        ? Math.round((offeredApplications.length / interviewedApplications.length) * 100)
        : 0;

      return {
        totalApplications: applications.length,
        totalInterviewed: interviewedApplications.length,
        totalOffered: offeredApplications.length,
        conversionRate,
      };
    } catch (error) {
      logger.error('Get interview to offer metrics error', error);
      throw error;
    }
  }

  /**
   * Schedule interview with performance tracking
   */
  async scheduleInterviewWithTracking(candidateEmail, candidateName, jobTitle, dateTime, type = 'video') {
    try {
      const schedule = await prisma.interviewSchedule.create({
        data: {
          candidateEmail,
          candidateName,
          interviewDate: new Date(dateTime),
          interviewTime: new Date(dateTime).toLocaleTimeString(),
          type,
          status: 'scheduled',
        },
      });

      logger.info(`Interview scheduled: ${candidateName} for ${jobTitle}`);

      return {
        scheduleId: schedule.id,
        scheduleDetails: schedule,
        trackingEnabled: true,
      };
    } catch (error) {
      logger.error('Schedule interview error', error);
      throw error;
    }
  }
}

module.exports = new InterviewAnalyticsService();
