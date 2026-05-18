const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../../middleware/auth');
const prisma = require('../../config/database');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../..', 'uploads');
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

/**
 * GET My Leave Requests
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const userId = req.user.id;

    // Get employee profile
    const profile = await prisma.employeeProfile.findFirst({
      where: { userId },
      select: { id: true }
    });

    if (!profile) {
      return res.json({ success: true, data: { leaves: [], total: 0 } });
    }

    const leaves = await prisma.leaveRequest.findMany({
      where: { employeeId: profile.id },
      include: {
        attachments: { select: { id: true, fileName: true, mimeType: true, fileSize: true, uploadedAt: true } },
        approvals: { select: { id: true, approvalLevel: true, status: true, approverRole: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.leaveRequest.count({ where: { employeeId: profile.id } });

    res.json({ success: true, data: { leaves, total } });
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leave requests' });
  }
});

/**
 * POST Submit Leave Request — with optional file uploads
 */
router.post('/', authenticate, upload.array('attachments', 5), async (req, res) => {
  try {
    const { leaveType, startDate, endDate, session, reason } = req.body;
    const userId = req.user.id;

    if (!leaveType || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Get employee profile
    const profile = await prisma.employeeProfile.findFirst({
      where: { userId },
      select: { id: true }
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    // Create leave request
    const leave = await prisma.leaveRequest.create({
      data: {
        displayId: `TKG-LV-${Date.now()}`.slice(0, 12),
        employeeId: profile.id,
        leaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        session: session || 'FULL_DAY',
        reason,
        status: 'SUBMITTED',
        createdAt: new Date()
      }
    });

    // Attach files if uploaded
    if (req.files && req.files.length > 0) {
      const attachments = req.files.map(file => ({
        leaveRequestId: leave.id,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        filePath: `/uploads/${file.filename}`,
        fileUrl: `/uploads/${file.filename}`,
        uploadedBy: userId,
        uploadedAt: new Date()
      }));

      await prisma.attachment.createMany({ data: attachments });
    }

    res.json({ success: true, data: { message: 'Leave request submitted', leave } });
  } catch (error) {
    console.error('Error submitting leave request:', error);
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, () => {});
      });
    }
    res.status(500).json({ success: false, message: 'Failed to submit leave request' });
  }
});

module.exports = router;
