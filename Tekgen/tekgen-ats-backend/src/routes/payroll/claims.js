const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate, authorize } = require('../../middleware/auth');
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
 * GET My Claims — employee view (read-only after submitted)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const userId = req.user.id;

    // Get employee profile for this user
    const profile = await prisma.employeeProfile.findFirst({
      where: { userId },
      select: { id: true }
    });

    if (!profile) {
      return res.json({ success: true, data: { claims: [], total: 0 } });
    }

    const claims = await prisma.claim.findMany({
      where: { employeeId: profile.id },
      include: {
        attachments: { select: { id: true, fileName: true, mimeType: true, fileSize: true, uploadedAt: true } },
        approvals: { select: { id: true, approvalLevel: true, status: true, approverRole: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.claim.count({ where: { employeeId: profile.id } });

    res.json({ success: true, data: { claims, total } });
  } catch (error) {
    console.error('Error fetching claims:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch claims' });
  }
});

/**
 * POST Submit Claim — with optional file uploads
 */
router.post('/', authenticate, upload.array('attachments', 5), async (req, res) => {
  try {
    const { claimType, amount, description, claimDate } = req.body;
    const userId = req.user.id;

    if (!claimType || !amount || !claimDate) {
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

    // Create claim
    const claim = await prisma.claim.create({
      data: {
        displayId: `TKG-CLM-${Date.now()}`.slice(0, 15),
        employeeId: profile.id,
        claimType,
        amount: parseFloat(amount),
        claimDate: new Date(claimDate),
        description,
        status: 'SUBMITTED',
        createdAt: new Date()
      }
    });

    // Attach files if uploaded
    if (req.files && req.files.length > 0) {
      const attachments = req.files.map(file => ({
        claimId: claim.id,
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

    res.json({ success: true, data: { message: 'Claim submitted', claim } });
  } catch (error) {
    console.error('Error submitting claim:', error);
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cleanupError) {
          console.error('Failed to cleanup uploaded claim file:', cleanupError);
        }
      });
    }
    res.status(500).json({ success: false, message: 'Failed to submit claim' });
  }
});

module.exports = router;
