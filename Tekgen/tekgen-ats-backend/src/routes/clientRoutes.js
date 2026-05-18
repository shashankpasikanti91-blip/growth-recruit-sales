const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const clientController = require('../controllers/clientController');
const config = require('../config/environment');

const router = express.Router();
router.use(authenticate);

const uploadsRoot = path.resolve(config.UPLOAD_DIR);
const clientWriteRoles = ['ADMIN', 'RECRUITMENT_MANAGER', 'SALES_MANAGER', 'SALES_EXEC', 'SALES_EXECUTIVE'];

const clientDocStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(uploadsRoot, 'client-documents', req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${String(file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    cb(null, safe);
  },
});

const ALLOWED_CLIENT_DOC_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
]);

const clientDocUpload = multer({
  storage: clientDocStorage,
  limits: { fileSize: 15 * 1024 * 1024, files: 25 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const okExt = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'].includes(ext);
    const okMime = ALLOWED_CLIENT_DOC_MIME.has(file.mimetype);
    if (okExt || okMime) return cb(null, true);
    cb(new Error('Unsupported file type for client document'));
  },
});

// Dropdown options for forms
router.get('/options', clientController.getClientOptions);
router.get('/submission-field-reference', clientController.getSubmissionFieldReference);

// CRUD
router.post('/', [
  body('clientName').trim().notEmpty().withMessage('Client name is required'),
  body('website').optional().isURL().withMessage('Invalid website URL'),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'PROSPECT']),
], clientController.createClient);

router.get('/', clientController.getClients);
router.post(
  '/:id/preview-submission',
  [body('jobId').notEmpty().isString(), body('candidateId').notEmpty().isString()],
  clientController.previewClientSubmission
);

router.get('/:id/documents', clientController.getDocuments);
router.post(
  '/:id/documents',
  authorize(...clientWriteRoles),
  [body('title').trim().notEmpty(), body('documentType').optional()],
  clientController.createDocument
);
router.post(
  '/:id/documents/upload',
  authorize(...clientWriteRoles),
  clientDocUpload.array('files', 20),
  clientController.uploadClientDocuments
);
router.delete(
  '/:id/documents/:docId',
  authorize(...clientWriteRoles),
  clientController.deleteDocument
);

router.get('/:id', clientController.getClientById);

router.put('/:id', [
  body('clientName').trim().optional(),
  body('website').optional().isURL().optional({ nullable: true }),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'PROSPECT']),
  body('submissionFormat').optional({ nullable: true }),
], clientController.updateClient);

router.delete('/:id', clientController.deleteClient);

module.exports = router;
