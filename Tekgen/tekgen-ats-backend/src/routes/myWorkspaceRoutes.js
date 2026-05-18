const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/myWorkspaceController');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /\.(jpg|jpeg|png|gif|pdf|doc|docx)$/i;
  if (allowed.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error('Only image, PDF, and doc files allowed'));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// All routes require authentication — scoped to the requesting user only
router.use(authenticate);

// Profile
router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);
router.post('/profile/avatar', upload.single('avatar'), ctrl.uploadAvatar);

// Leave
router.get('/leave/balance', ctrl.getLeaveBalance);
router.get('/leave', ctrl.getLeaveHistory);
router.post('/leave', upload.array('attachments', 5), ctrl.applyLeave);
router.put('/leave/:id/cancel', ctrl.cancelLeave);

// Claims
router.get('/claims', ctrl.getClaims);
router.post('/claims', upload.array('attachments', 5), ctrl.submitClaim);

// Documents & forms (own records only)
router.get('/documents', ctrl.getDocuments);
router.get('/documents/:id/download', ctrl.downloadDocument);
router.get('/statutory-forms', ctrl.getStatutoryForms);
router.get('/statutory-forms/:id/download', ctrl.downloadStatutoryForm);

// Dashboard summary
router.get('/summary', ctrl.getSummary);
router.get('/attendance', ctrl.getAttendance);
router.post('/attendance/submit', ctrl.submitAttendance);
router.post('/attendance/submit-monthly', ctrl.submitMonthlyAttendance);

module.exports = router;
