const { validationResult } = require('express-validator');
const submissionService = require('../services/submissionService');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

const WRITE_ROLES = [
  'ADMIN',
  'SUPER_ADMIN',
  'MANAGEMENT',
  'RECRUITMENT_MANAGER',
  'SALES_MANAGER',
  'SALES_EXEC',
  'SALES_EXECUTIVE',
  'RECRUITER',
];

class SubmissionController {
  async listForJob(req, res) {
    try {
      if (!WRITE_ROLES.includes(req.user.role)) {
        return sendError(res, 'Unauthorized', 403);
      }
      const jobId = req.query.jobId;
      if (!jobId || typeof jobId !== 'string') {
        return sendError(res, 'Query jobId is required', 400);
      }
      const list = await submissionService.listForJob(jobId, req.user);
      return sendSuccess(res, { submissions: list });
    } catch (error) {
      logger.error('List submissions error', error);
      const status = error.statusCode || 500;
      return sendError(res, error.message || 'Failed to list submissions', status);
    }
  }

  async patchStage(req, res) {
    try {
      if (!WRITE_ROLES.includes(req.user.role)) {
        return sendError(res, 'Unauthorized', 403);
      }
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, 'Validation failed', 400, errors.array());
      }
      const updated = await submissionService.updateStage(req.params.id, req.body, req.user);
      return sendSuccess(res, { submission: updated }, 'Submission updated');
    } catch (error) {
      logger.error('Patch submission stage error', error);
      const status = error.statusCode || 500;
      return sendError(res, error.message || 'Failed to update submission', status);
    }
  }
}

module.exports = new SubmissionController();
