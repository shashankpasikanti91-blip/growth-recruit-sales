/**
 * Email Automation Service
 * Handles scheduled email tasks and follow-ups using node-cron
 */

const cron = require('node-cron');
const prisma = require('../config/database');
const emailService = require('./email/emailService');
const logger = require('../utils/logger');

class EmailAutomationService {
  constructor() {
    this.jobs = [];
  }

  /**
   * Initialize all scheduled email tasks
   * Call this once during server startup
   */
  initializeSchedules() {
    logger.info('Initializing email automation schedules...');

    // Run every day at 9 AM
    this.scheduleFollowUpReminders();

    // Run every Monday at 10 AM
    this.scheduleWeeklyInterviewReminders();

    // Run every 6 hours
    this.scheduleRejectionFollowUps();

    // Run every day at 2 PM
    this.scheduleOfferReminders();

    logger.info('Email automation schedules initialized successfully');
  }

  /**
   * Send follow-up emails to candidates who applied 7 days ago
   * Runs daily at 9 AM
   */
  scheduleFollowUpReminders() {
    const job = cron.schedule('0 9 * * *', async () => {
      try {
        logger.info('Running follow-up reminder task...');
        
        // Get candidates who applied 7 days ago
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const oldApplications = await prisma.application.findMany({
          where: {
            status: 'APPLIED',
            createdAt: {
              lte: sevenDaysAgo,
              gte: new Date(sevenDaysAgo.getTime() - 24 * 60 * 60 * 1000),
            },
          },
          include: {
            candidate: true,
            job: true,
          },
        });

        for (const application of oldApplications) {
          await emailService.sendFollowUpEmail(
            application.candidate.email,
            application.candidate.firstName + ' ' + application.candidate.lastName,
            application.job.title,
            'We\'re still reviewing your application and will update you soon.'
          );
        }

        logger.info(`Sent ${oldApplications.length} follow-up reminder emails`);
      } catch (error) {
        logger.error('Error in follow-up reminder task:', error);
      }
    });

    this.jobs.push(job);
  }

  /**
   * Send interview reminders to candidates
   * Runs every Monday at 10 AM
   */
  scheduleWeeklyInterviewReminders() {
    const job = cron.schedule('0 10 * * 1', async () => {
      try {
        logger.info('Running weekly interview reminder task...');

        // Get interviews scheduled for this week or next week
        const today = new Date();
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        const upcomingInterviews = await prisma.interviewSchedule.findMany({
          where: {
            interviewDate: {
              gte: today,
              lte: weekFromNow,
            },
            status: 'SCHEDULED',
          },
        });

        for (const interview of upcomingInterviews) {
          const dateString = new Date(interview.interviewDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });

          await emailService.sendInterviewScheduledEmail(
            interview.candidateEmail,
            interview.candidateName,
            interview.interviewType,
            `${dateString} at ${interview.time}`,
            interview.meetLink || interview.location || 'Details to follow'
          );
        }

        logger.info(`Sent ${upcomingInterviews.length} interview reminder emails`);
      } catch (error) {
        logger.error('Error in interview reminder task:', error);
      }
    });

    this.jobs.push(job);
  }

  /**
   * Send rejection follow-up emails to rejected candidates
   * Encourages re-application for future roles
   * Runs daily at 3 PM (every 24 hours starting from first rejection)
   */
  scheduleRejectionFollowUps() {
    const job = cron.schedule('0 15 * * *', async () => {
      try {
        logger.info('Running rejection follow-up task...');

        // Get candidates rejected 14 days ago
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const rejectedCandidates = await prisma.application.findMany({
          where: {
            status: 'REJECTED',
            updatedAt: {
              lte: twoWeeksAgo,
              gte: new Date(twoWeeksAgo.getTime() - 24 * 60 * 60 * 1000),
            },
          },
          include: {
            candidate: true,
            job: true,
          },
        });

        for (const application of rejectedCandidates) {
          // Only send if candidate has no active or recent applications
          const recentApps = await prisma.application.findMany({
            where: {
              candidateId: application.candidateId,
              status: { in: ['APPLIED', 'SCREENED', 'INTERVIEW'] },
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          });

          if (recentApps.length === 0) {
            await emailService.sendFollowUpEmail(
              application.candidate.email,
              application.candidate.firstName + ' ' + application.candidate.lastName,
              application.job.title,
              'We appreciate your interest. We\'d love to keep you in mind for future opportunities that match your profile better.'
            );
          }
        }

        logger.info(`Sent ${rejectedCandidates.length} rejection follow-up emails`);
      } catch (error) {
        logger.error('Error in rejection follow-up task:', error);
      }
    });

    this.jobs.push(job);
  }

  /**
   * Send offer acceptance reminder emails
   * Runs daily at 2 PM
   */
  scheduleOfferReminders() {
    const job = cron.schedule('0 14 * * *', async () => {
      try {
        logger.info('Running offer reminder task...');

        // Get candidates who are in HIRED status but didn't confirm
        const hiredCandidates = await prisma.candidate.findMany({
          where: {
            status: 'HIRED',
            updatedAt: {
              // Updated in the last 3 days
              gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
              lte: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            },
          },
          include: {
            applications: {
              include: {
                job: true,
              },
              take: 1,
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        });

        for (const candidate of hiredCandidates) {
          const recentApp = candidate.applications[0];
          if (recentApp) {
            await emailService.sendFollowUpEmail(
              candidate.email,
              candidate.firstName + ' ' + candidate.lastName,
              recentApp.job.title,
              'We\'re excited to have you join our team! Please confirm your acceptance of the offer.'
            );
          }
        }

        logger.info(`Sent ${hiredCandidates.length} offer reminder emails`);
      } catch (error) {
        logger.error('Error in offer reminder task:', error);
      }
    });

    this.jobs.push(job);
  }

  /**
   * Send custom scheduled email
   * @param {string} recipientEmail - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} htmlContent - HTML email content
   * @param {number} delayMinutes - Delay in minutes before sending
   */
  async sendScheduledEmail(recipientEmail, subject, htmlContent, delayMinutes = 0) {
    try {
      const delayMs = delayMinutes * 60 * 1000;

      setTimeout(async () => {
        try {
          await emailService.sendEmail(recipientEmail, subject, htmlContent);
          logger.info(`Scheduled email sent to ${recipientEmail}`);
        } catch (error) {
          logger.error(`Failed to send scheduled email to ${recipientEmail}:`, error);
        }
      }, delayMs);

      logger.info(`Email scheduled for ${recipientEmail} in ${delayMinutes} minutes`);
    } catch (error) {
      logger.error('Error scheduling email:', error);
      throw error;
    }
  }

  /**
   * Pause all scheduled tasks
   */
  pauseAll() {
    this.jobs.forEach(job => job.stop());
    logger.info('All email automation tasks paused');
  }

  /**
   * Resume all scheduled tasks
   */
  resumeAll() {
    this.jobs.forEach(job => job.start());
    logger.info('All email automation tasks resumed');
  }

  /**
   * Get status of all scheduled tasks
   */
  getStatus() {
    return {
      totalTasks: this.jobs.length,
      tasks: [
        'Daily follow-up reminders (9 AM)',
        'Weekly interview reminders (Monday 10 AM)',
        'Rejection follow-up emails (3 PM)',
        'Offer acceptance reminders (2 PM)',
      ],
    };
  }
}

module.exports = new EmailAutomationService();
