const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate, authorize } = require('../middleware/auth');
const { requireRecentBackup } = require('../middleware/backupGuard');
const hrmsController = require('../controllers/hrmsController');

const router = express.Router();
const importUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const employeeDocsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(employeeDocsDir)) {
  fs.mkdirSync(employeeDocsDir, { recursive: true });
}
const employeeDocUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, employeeDocsDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
  }),
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|pdf|doc|docx)$/i;
    if (allowed.test(file.originalname)) return cb(null, true);
    return cb(new Error('Only PDF, image, and document files are allowed'));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(authenticate);

const HRMS_EXEC_OR_OPS = [
  'HR_ADMIN',
  'PAYROLL_ADMIN',
  'ADMIN',
  'MANAGEMENT',
  'ASSISTANT_MANAGER',
  'DIRECTOR',
  'HEAD',
  'MD',
  'MANAGING_DIRECTOR',
  'DEPT_HEAD',
  'DEPARTMENT_HEAD',
  'COMPANY_HEAD',
  'SUPER_ADMIN',
];

router.get('/kpis', hrmsController.getKpis);
router.get('/employees', authorize('HR_ADMIN', 'PAYROLL_ADMIN', 'ADMIN', 'MANAGEMENT', 'VISA_ADMIN'), hrmsController.getEmployees);
router.get('/employees/:id', authorize('HR_ADMIN', 'PAYROLL_ADMIN', 'ADMIN', 'MANAGEMENT', 'VISA_ADMIN'), hrmsController.getEmployeeById);
router.post('/employees', authorize('HR_ADMIN', 'ADMIN', 'MANAGEMENT'), requireRecentBackup(24), hrmsController.createEmployee);
router.post('/employees/import', authorize('HR_ADMIN', 'ADMIN', 'MANAGEMENT'), requireRecentBackup(24), importUpload.single('file'), hrmsController.importEmployees);
router.post('/clients/import', authorize('HR_ADMIN', 'ADMIN', 'MANAGEMENT', 'FINANCE_HEAD'), requireRecentBackup(24), importUpload.single('file'), hrmsController.importClients);
router.put('/employees/:id', authorize('HR_ADMIN', 'ADMIN', 'MANAGEMENT'), requireRecentBackup(24), hrmsController.updateEmployee);
router.get('/employees/:id/documents', authorize('HR_ADMIN', 'PAYROLL_ADMIN', 'ADMIN', 'MANAGEMENT'), hrmsController.getEmployeeDocuments);
router.get(
  '/employees/:id/documents/:docId/download',
  authorize('HR_ADMIN', 'PAYROLL_ADMIN', 'ADMIN', 'MANAGEMENT'),
  hrmsController.downloadEmployeeDocument
);
router.post('/employees/:id/documents', authorize('HR_ADMIN', 'ADMIN', 'MANAGEMENT'), employeeDocUpload.array('files', 10), hrmsController.uploadEmployeeDocument);
router.get('/attendance/summary', authorize('HR_ADMIN', 'PAYROLL_ADMIN', 'ADMIN', 'MANAGEMENT'), hrmsController.getAttendanceSummary);
router.get('/leaves/pending', authorize(...HRMS_EXEC_OR_OPS), hrmsController.getPendingLeaves);
router.get('/executive/pending-queue', authorize(...HRMS_EXEC_OR_OPS), hrmsController.getExecutivePendingQueue);
router.get('/onboarding', authorize('HR_ADMIN', 'PAYROLL_ADMIN', 'ADMIN', 'MANAGEMENT'), hrmsController.getOnboardingTracker);
router.post('/onboarding/:id/complete', authorize('HR_ADMIN', 'ADMIN', 'MANAGEMENT'), hrmsController.completeOnboarding);
router.get('/offboarding', authorize('HR_ADMIN', 'PAYROLL_ADMIN', 'ADMIN', 'MANAGEMENT'), hrmsController.getOffboardingTracker);
router.post('/offboarding/:id/initiate', authorize('HR_ADMIN', 'ADMIN', 'MANAGEMENT'), hrmsController.initiateOffboarding);
router.post('/offboarding/:id/complete', authorize('HR_ADMIN', 'ADMIN', 'MANAGEMENT'), hrmsController.completeOffboarding);

module.exports = router;
