const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const {
  uploadDocument,
  getDocuments,
  deleteDocument,
  getEmployeeDocuments,
  uploadEmployeeDocument,
  getStatutoryForms,
  submitStatutoryForm,
} = require('../controllers/documentsController');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/documents/');
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      cb(null, `${timestamp}-${file.originalname}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and images allowed.'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

router.use(authenticate);

// Generic document uploads (claims, leave requests, etc.)
router.post('/upload', upload.single('file'), uploadDocument);
router.get('/entity/:entityType/:entityId', getDocuments);
router.delete('/:documentId', deleteDocument);

// Employee documents (ID, certificates, etc.)
router.get('/employee/:employeeId', getEmployeeDocuments);
router.post('/employee/upload', upload.single('file'), uploadEmployeeDocument);

// Statutory forms
router.get('/forms/employee/:employeeId', authorize(['ADMIN', 'HR_MANAGER']), getStatutoryForms);
router.post('/forms/submit', submitStatutoryForm);

module.exports = router;
