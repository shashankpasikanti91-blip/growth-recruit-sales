const emailService = require('../services/email/emailService');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');
const prisma = require('../config/database');

class EmailController {
  async sendApplicationReceivedEmail(req, res) {
    try {
      const { candidateEmail, candidateName, jobTitle, candidateId } = req.body;

      await emailService.sendApplicationReceivedEmail(candidateEmail, candidateName, jobTitle);

      sendSuccess(res, { message: 'Email sent successfully' }, 'Application received email sent');
    } catch (error) {
      logger.error('Send application received email error', error);
      sendError(res, error.message, 500);
    }
  }

  async sendShortlistedEmail(req, res) {
    try {
      const { candidateEmail, candidateName, jobTitle } = req.body;

      await emailService.sendShortlistedEmail(candidateEmail, candidateName, jobTitle);

      sendSuccess(res, { message: 'Email sent successfully' }, 'Shortlisted email sent');
    } catch (error) {
      logger.error('Send shortlisted email error', error);
      sendError(res, error.message, 500);
    }
  }

  async sendRejectionEmail(req, res) {
    try {
      const { candidateEmail, candidateName, jobTitle } = req.body;

      await emailService.sendRejectionEmail(candidateEmail, candidateName, jobTitle);

      sendSuccess(res, { message: 'Email sent successfully' }, 'Rejection email sent');
    } catch (error) {
      logger.error('Send rejection email error', error);
      sendError(res, error.message, 500);
    }
  }

  async sendInterviewScheduledEmail(req, res) {
    try {
      const { candidateEmail, candidateName, jobTitle, interviewDate, interviewTime, meetingLink } = req.body;

      await emailService.sendInterviewScheduledEmail(
        candidateEmail,
        candidateName,
        jobTitle,
        interviewDate,
        interviewTime,
        meetingLink
      );

      sendSuccess(res, { message: 'Email sent successfully' }, 'Interview scheduled email sent');
    } catch (error) {
      logger.error('Send interview scheduled email error', error);
      sendError(res, error.message, 500);
    }
  }

  async sendFollowUpEmail(req, res) {
    try {
      const { candidateEmail, candidateName, jobTitle, customContent } = req.body;

      await emailService.sendFollowUpEmail(candidateEmail, candidateName, jobTitle, customContent);

      sendSuccess(res, { message: 'Email sent successfully' }, 'Follow-up email sent');
    } catch (error) {
      logger.error('Send follow-up email error', error);
      sendError(res, error.message, 500);
    }
  }

  async getEmailLogs(req, res) {
    try {
      const logs = await prisma.emailLog.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: parseInt(req.query.limit) || 50,
      });

      sendSuccess(res, logs, 'Email logs retrieved');
    } catch (error) {
      logger.error('Get email logs error', error);
      sendError(res, error.message, 500);
    }
  }
}

module.exports = new EmailController();
