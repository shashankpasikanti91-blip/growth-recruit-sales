const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const advancedAnalyticsController = require('../controllers/advancedAnalyticsController');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// =========== Analytics Routes ===========

router.get('/funnel', advancedAnalyticsController.getFunnelAnalytics);

router.get('/score-distribution', advancedAnalyticsController.getScoreDistribution);

router.get('/job/:jobId/metrics', advancedAnalyticsController.getJobMetrics);

router.get('/recruiter/performance', advancedAnalyticsController.getRecruiterPerformance);

router.get('/quality-insights', advancedAnalyticsController.getCandidateQualityInsights);

router.get('/job/:jobId/skills-gap', advancedAnalyticsController.getSkillsGapAnalysis);

// =========== Predictive Insights Routes ===========

router.post('/predict/candidate-success', [
  body('candidateId').notEmpty(),
  body('jobId').notEmpty(),
], advancedAnalyticsController.predictCandidateSuccess);

router.post('/predict/job-difficulty', [
  body('jobId').notEmpty(),
], advancedAnalyticsController.predictJobFillDifficulty);

router.post('/predict/attrition-risk', [
  body('hiredCandidateIds').isArray().optional(),
], advancedAnalyticsController.getAttritionRisk);

// =========== Advanced Matching Routes ===========

router.post('/match/calculate', [
  body('candidateId').notEmpty(),
  body('jobId').notEmpty(),
], advancedAnalyticsController.calculateAdvancedMatch);

router.post('/match/best-candidates', [
  body('jobId').notEmpty(),
  body('limit').isInt({ min: 1 }).optional(),
], advancedAnalyticsController.findBestMatches);

router.post('/match/best-jobs', [
  body('candidateId').notEmpty(),
  body('limit').isInt({ min: 1 }).optional(),
], advancedAnalyticsController.findBestJobs);

// =========== Interview Analytics Routes ===========

router.post('/interview/record-performance', [
  body('scheduleId').notEmpty(),
], advancedAnalyticsController.recordInterviewPerformance);

router.get('/interview/:jobId/metrics', advancedAnalyticsController.getInterviewMetrics);

router.post('/interview/schedule-with-tracking', [
  body('candidateEmail').isEmail(),
  body('candidateName').notEmpty(),
  body('jobTitle').notEmpty(),
  body('dateTime').notEmpty(),
], advancedAnalyticsController.scheduleInterviewWithTracking);

// Timeline analytics for Power BI dashboard
router.get('/timeline', advancedAnalyticsController.getTimelineAnalytics);

module.exports = router;
