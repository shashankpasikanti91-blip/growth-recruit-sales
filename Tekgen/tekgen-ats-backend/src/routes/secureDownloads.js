'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/secureDownloadController');

const router = express.Router();
router.use(authenticate);

router.get('/attachments/:id/download', ctrl.downloadAttachment);
router.get('/client-documents/:id/download', ctrl.downloadClientDocument);
router.get('/client-agreements/:id/download', ctrl.downloadClientAgreement);

module.exports = router;
