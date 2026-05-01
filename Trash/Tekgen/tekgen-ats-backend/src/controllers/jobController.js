const { validationResult } = require('express-validator');
const jobService = require('../services/jobService');
const jobDescriptionParserService = require('../services/jobDescriptionParserService');
const aiService = require('../services/ai/openaiService');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

class JobController {
  async createJob(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, 'Validation failed', 400, errors.array());
      }

      const job = await jobService.createJob(req.body, req.user.id);

      sendSuccess(res, job, 'Job created successfully', 201);
    } catch (error) {
      logger.error('Create job error', error);
      sendError(res, error.message, 500);
    }
  }

  async getJobs(req, res) {
    try {
      const filters = {
        status:       req.query.status       || undefined,
        contractType: req.query.contractType || undefined,
        clientName:   req.query.clientName   || undefined,
        search:       req.query.search       || undefined,
        limit: parseInt(req.query.limit) || 50,
        page:  parseInt(req.query.page)  || 1,
      };

      const result = await jobService.getJobsByRecruiter(req.user.id, filters);
      // result is now { jobs, total }
      sendSuccess(res, result, 'Jobs retrieved');
    } catch (error) {
      logger.error('Get jobs error', error);
      sendError(res, error.message, 500);
    }
  }

  async getJobById(req, res) {
    try {
      const job = await jobService.getJobById(req.params.id);

      if (!job) {
        return sendError(res, 'Job not found', 404);
      }

      // All authenticated team members can view any job
      sendSuccess(res, job, 'Job retrieved');
    } catch (error) {
      logger.error('Get job by ID error', error);
      sendError(res, error.message, 500);
    }
  }

  async updateJob(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, 'Validation failed', 400, errors.array());
      }

      const job = await jobService.getJobById(req.params.id);

      if (!job) {
        return sendError(res, 'Job not found', 404);
      }

      // All authenticated team members can update jobs
      const updatedJob = await jobService.updateJob(req.params.id, req.body);

      sendSuccess(res, updatedJob, 'Job updated');
    } catch (error) {
      logger.error('Update job error', error);
      sendError(res, error.message, 500);
    }
  }

  async closeJob(req, res) {
    try {
      const job = await jobService.getJobById(req.params.id);

      if (!job) {
        return sendError(res, 'Job not found', 404);
      }

      // Check authorization
      if (job.userId !== req.user.id && req.user.role !== 'ADMIN') {
        return sendError(res, 'Unauthorized', 403);
      }

      const closedJob = await jobService.closeJob(req.params.id);

      sendSuccess(res, closedJob, 'Job closed');
    } catch (error) {
      logger.error('Close job error', error);
      sendError(res, error.message, 500);
    }
  }

  async deleteJob(req, res) {
    try {
      const job = await jobService.getJobById(req.params.id);

      if (!job) {
        return sendError(res, 'Job not found', 404);
      }

      // Check authorization
      if (job.userId !== req.user.id && req.user.role !== 'ADMIN') {
        return sendError(res, 'Unauthorized', 403);
      }

      await jobService.deleteJob(req.params.id);

      sendSuccess(res, { message: 'Job deleted' }, 'Job deleted successfully');
    } catch (error) {
      logger.error('Delete job error', error);
      sendError(res, error.message, 500);
    }
  }

  async parseJobDescriptionFile(req, res) {
    try {
      if (!req.file) {
        return sendError(res, 'No file uploaded', 400);
      }

      const jobDescriptionText = await jobDescriptionParserService.parseFile(
        req.file.buffer,
        req.file.mimetype
      );

      const manualClientName = req.body.clientName || null;

      // Use AI to extract structured job details from raw text
      const aiParsed = await aiService.parseJobDescription(jobDescriptionText, manualClientName);

      // Generate boolean search string
      const { booleanSearchString, skillsIncluded } = aiService.generateBooleanSearch(
        aiParsed.title || '',
        aiParsed.mandatorySkills || [],
        aiParsed.preferredSkills || [],
        aiParsed.requiredSkills || [],
        aiParsed.location,
        aiParsed.contractType
      );
      aiParsed.booleanSearchString = booleanSearchString;
      aiParsed.skillsIncluded = skillsIncluded;

      sendSuccess(res, {
        description: jobDescriptionText,
        details: aiParsed,
      }, 'Job description parsed successfully');
    } catch (error) {
      logger.error('Parse job description file error', error);
      sendError(res, error.message, 400);
    }
  }

  async parseJobDescriptionText(req, res) {
    try {
      const { text, clientName } = req.body;

      if (!text) {
        return sendError(res, 'Job description text is required', 400);
      }

      const jobDescriptionText = await jobDescriptionParserService.parseText(text);

      // Use AI to extract structured job details from raw text
      const aiParsed = await aiService.parseJobDescription(jobDescriptionText, clientName || null);

      // Generate boolean search string
      const { booleanSearchString, skillsIncluded } = aiService.generateBooleanSearch(
        aiParsed.title || '',
        aiParsed.mandatorySkills || [],
        aiParsed.preferredSkills || [],
        aiParsed.requiredSkills || [],
        aiParsed.location,
        aiParsed.contractType
      );
      aiParsed.booleanSearchString = booleanSearchString;
      aiParsed.skillsIncluded = skillsIncluded;

      sendSuccess(res, {
        description: jobDescriptionText,
        details: aiParsed,
      }, 'Job description parsed successfully');
    } catch (error) {
      logger.error('Parse job description text error', error);
      sendError(res, error.message, 400);
    }
  }

  // ── Phase 1: Get Boolean search for a job ────────────────────────────────
  async getJobBoolean(req, res) {
    try {
      const job = await jobService.getJobById(req.params.id);
      if (!job) return sendError(res, 'Job not found', 404);

      // Use stored string if available, otherwise regenerate
      let booleanStr = job.booleanSearchString;
      let skillsIncluded = (job.mandatorySkills?.length || 0) + (job.requiredSkills?.length || 0) + (job.preferredSkills?.length || 0);

      if (!booleanStr) {
        const result = aiService.generateBooleanSearch(
          job.title,
          job.mandatorySkills || [],
          job.preferredSkills || [],
          job.requiredSkills || [],
          job.location,
          job.contractType
        );
        booleanStr = result.booleanSearchString;
        skillsIncluded = result.skillsIncluded;
        // Save it
        await jobService.updateJob(job.id, { booleanSearchString: booleanStr });
      }

      sendSuccess(res, { booleanSearchString: booleanStr, skillsIncluded }, 'Boolean search retrieved');
    } catch (error) {
      logger.error('Get job boolean error', error);
      sendError(res, error.message, 500);
    }
  }
}

module.exports = new JobController();
