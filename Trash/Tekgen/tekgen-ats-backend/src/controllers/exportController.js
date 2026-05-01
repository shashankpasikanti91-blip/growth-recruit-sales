/**
 * Export Controller
 * Handles export endpoints for CSV and PDF generation
 */

const { validationResult } = require('express-validator');
const exportService = require('../services/exportService');
const logger = require('../utils/logger');
const response = require('../utils/response');

/**
 * Export candidates to CSV
 * GET /api/export/candidates/csv
 */
exports.exportCandidatesCSV = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.sendError(res, 'Validation failed', 400, errors.array());
    }

    const filters = {
      status: req.query.status,
      search: req.query.search,
    };

    const filePath = await exportService.exportCandidatesCSV(filters);
    
    res.download(filePath, `candidates_${Date.now()}.csv`, (err) => {
      if (err) {
        logger.error('Error downloading file:', err);
      }
    });
  } catch (error) {
    logger.error('Error exporting candidates:', error);
    response.sendError(res, error.message, 500);
  }
};

/**
 * Export jobs to CSV
 * GET /api/export/jobs/csv
 */
exports.exportJobsCSV = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
    };

    const filePath = await exportService.exportJobsCSV(filters);
    
    res.download(filePath, `jobs_${Date.now()}.csv`, (err) => {
      if (err) {
        logger.error('Error downloading file:', err);
      }
    });
  } catch (error) {
    logger.error('Error exporting jobs:', error);
    response.sendError(res, error.message, 500);
  }
};

/**
 * Export screenings to CSV
 * GET /api/export/screenings/csv
 */
exports.exportScreeningsCSV = async (req, res) => {
  try {
    const filePath = await exportService.exportScreeningsCSV();
    
    res.download(filePath, `screenings_${Date.now()}.csv`, (err) => {
      if (err) {
        logger.error('Error downloading file:', err);
      }
    });
  } catch (error) {
    logger.error('Error exporting screenings:', error);
    response.sendError(res, error.message, 500);
  }
};

/**
 * Generate analytics report PDF
 * POST /api/export/analytics/pdf
 */
exports.generateAnalyticsReportPDF = async (req, res) => {
  try {
    const { analytics } = req.body;

    if (!analytics) {
      return response.sendError(res, 'Analytics data is required', 400);
    }

    const filePath = await exportService.generateAnalyticsReportPDF(analytics);
    
    res.download(filePath, `analytics_report_${Date.now()}.pdf`, (err) => {
      if (err) {
        logger.error('Error downloading file:', err);
      }
    });
  } catch (error) {
    logger.error('Error generating analytics PDF:', error);
    response.sendError(res, error.message, 500);
  }
};

/**
 * Generate candidate profile PDF
 * GET /api/export/candidates/:candidateId/pdf
 */
exports.generateCandidateProfilePDF = async (req, res) => {
  try {
    const { candidateId } = req.params;

    if (!candidateId) {
      return response.sendError(res, 'Candidate ID is required', 400);
    }

    const filePath = await exportService.generateCandidateProfilePDF(candidateId);
    
    res.download(filePath, `candidate_profile_${Date.now()}.pdf`, (err) => {
      if (err) {
        logger.error('Error downloading file:', err);
      }
    });
  } catch (error) {
    logger.error('Error generating candidate PDF:', error);
    response.sendError(res, error.message, 500);
  }
};

/**
 * Cleanup old exports
 * POST /api/export/cleanup
 * (Admin only)
 */
exports.cleanupOldExports = async (req, res) => {
  try {
    await exportService.cleanupOldExports();
    
    response.sendSuccess(res, {}, 'Old export files cleaned up successfully', 200);
  } catch (error) {
    logger.error('Error cleaning up exports:', error);
    response.sendError(res, error.message, 500);
  }
};
