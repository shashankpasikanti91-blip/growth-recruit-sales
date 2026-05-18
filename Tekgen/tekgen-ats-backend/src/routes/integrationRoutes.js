const express = require('express');
const { authenticate } = require('../middleware/auth');
const integrationController = require('../controllers/integrationController');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all integrations (masked keys, status, type)
router.get('/', integrationController.getIntegrations);

// Save job board / messaging API keys (encrypted) — ALL platforms allowed
router.post('/', integrationController.saveIntegration);

// Delete integration
router.delete('/:platform', integrationController.deleteIntegration);

// Test integration connection
router.post('/test/:platform', integrationController.testIntegration);

// Get status for a specific platform
router.get('/status/:platform', integrationController.getPlatformStatus);

// Outlook SMTP test — verify SMTP credentials connect
router.post('/outlook/test-smtp', integrationController.testOutlookSmtp);

// OAuth flow for Teams
router.post('/:platform/connect', integrationController.oauthConnect);
router.post('/:platform/disconnect', integrationController.oauthDisconnect);

module.exports = router;
