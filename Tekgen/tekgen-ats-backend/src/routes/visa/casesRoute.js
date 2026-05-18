const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const config = require('../../config/environment');
const prisma = require('../../config/database');
const {
  nextCaseDisplayId,
  renewalDueFromExpiry,
  seedOnboardingItems,
  syncPermitExpiryAlerts,
} = require('../../services/visaService');
const notificationService = require('../../services/notificationService');
const { requireVisaCaseWrite, requireVisaChecklistWrite } = require('../../middleware/visaAccess');
const { resolveUploadAbsolute } = require('../../utils/secureUploadPath');

const uploadDir = config.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _f, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const safe = `visa-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
      cb(null, safe);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const caseInclude = {
  employeeProfile: {
    select: { id: true, employeeId: true, user: { select: { firstName: true, lastName: true, email: true } } },
  },
  candidate: { select: { id: true, displayId: true, firstName: true, lastName: true, email: true } },
  caseOwner: { select: { id: true, firstName: true, lastName: true, email: true } },
  documents: { orderBy: { uploadedAt: 'desc' } },
  onboardingItems: { orderBy: { sortOrder: 'asc' } },
  expiryAlerts: { orderBy: [{ alertDays: 'desc' }] },
  dependents: { orderBy: { createdAt: 'asc' } },
};

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const {
      permitStatus,
      workerCategory,
      expiringWithinDays,
      search,
      page = 1,
      limit = 20,
    } = req.query;
    const where = {};
    if (permitStatus) where.permitStatus = permitStatus;
    if (workerCategory) where.workerCategory = workerCategory;
    if (expiringWithinDays) {
      const d = parseInt(expiringWithinDays, 10);
      if (!Number.isNaN(d)) {
        where.expiryDate = {
          lte: new Date(Date.now() + d * 86400000),
          gte: new Date(),
        };
      }
    }
    if (search) {
      where.OR = [
        { workerName: { contains: search, mode: 'insensitive' } },
        { displayId: { contains: search, mode: 'insensitive' } },
        { workerDisplayId: { contains: search, mode: 'insensitive' } },
      ];
    }
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [cases, total] = await Promise.all([
      prisma.visaCase.findMany({
        where,
        skip,
        take: parseInt(limit, 10),
        orderBy: { updatedAt: 'desc' },
        include: {
          employeeProfile: { select: { employeeId: true } },
          candidate: { select: { displayId: true, firstName: true, lastName: true } },
          caseOwner: { select: { firstName: true, lastName: true } },
          _count: { select: { documents: true, dependents: true } },
        },
      }),
      prisma.visaCase.count({ where }),
    ]);
    res.json({
      success: true,
      data: { cases, pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10) } },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/', requireVisaCaseWrite, async (req, res) => {
  try {
    const {
      workerType,
      employeeProfileId,
      candidateId,
      workerDisplayId,
      workerName,
      nationality,
      workerCategory,
      permitType,
      permitStatus,
      applicationDate,
      approvalDate,
      expiryDate,
      caseOwnerId,
      notes,
      seedChecklist,
    } = req.body;

    if (!workerType || !workerName || !workerCategory || !permitType) {
      return res.status(400).json({
        success: false,
        message: 'workerType, workerName, workerCategory, permitType are required',
      });
    }
    if (['EMPLOYEE', 'DEPLOYED_STAFF'].includes(workerType) && !employeeProfileId) {
      return res.status(400).json({
        success: false,
        message: 'employeeProfileId is required when workerType is EMPLOYEE or DEPLOYED_STAFF',
      });
    }
    if (workerType === 'CANDIDATE' && !candidateId) {
      return res.status(400).json({ success: false, message: 'candidateId is required for CANDIDATE' });
    }

    let empId = employeeProfileId || null;
    let candId = candidateId || null;
    let displayWorkerId = workerDisplayId || null;
    let name = workerName;
    let nat = nationality || null;

    if (empId) {
      const emp = await prisma.employeeProfile.findUnique({
        where: { id: empId },
        include: { user: { select: { firstName: true, lastName: true } } },
      });
      if (emp) {
        displayWorkerId = displayWorkerId || emp.employeeId;
        if (!name) name = `${emp.user.firstName} ${emp.user.lastName}`.trim();
        nat = nat || emp.nationality;
      }
    } else if (candId) {
      const c = await prisma.candidate.findUnique({ where: { id: candId } });
      if (c) {
        displayWorkerId = displayWorkerId || c.displayId || undefined;
        if (!name) name = `${c.firstName} ${c.lastName}`.trim();
        nat = nat || c.nationality;
      }
    }

    const exp = expiryDate ? new Date(expiryDate) : null;
    const renewalDue = renewalDueFromExpiry(exp);

    const displayId = await nextCaseDisplayId();
    const created = await prisma.visaCase.create({
      data: {
        displayId,
        workerType,
        employeeProfileId: empId,
        candidateId: candId,
        workerDisplayId: displayWorkerId,
        workerName: name,
        nationality: nat,
        workerCategory,
        permitType,
        permitStatus: permitStatus || 'APPLICATION',
        applicationDate: applicationDate ? new Date(applicationDate) : null,
        approvalDate: approvalDate ? new Date(approvalDate) : null,
        expiryDate: exp,
        renewalDueDate: renewalDue,
        caseOwnerId: caseOwnerId || req.user.id,
        notes: notes || null,
        createdById: req.user.id,
        updatedById: req.user.id,
      },
    });

    const doSeed = seedChecklist !== false;
    if (doSeed && ['EXPAT_OVERSEAS', 'LOCAL_MY'].includes(workerCategory)) {
      await seedOnboardingItems(created.id, workerCategory);
    }
    await syncPermitExpiryAlerts(created.id, exp);

    const full = await prisma.visaCase.findUnique({
      where: { id: created.id },
      include: caseInclude,
    });
    res.status(201).json({ success: true, data: full });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/:caseRef/documents/:docId/download', async (req, res) => {
  try {
    const c = await prisma.visaCase.findFirst({
      where: { OR: [{ id: req.params.caseRef }, { displayId: req.params.caseRef }] },
      select: { id: true },
    });
    if (!c) return res.status(404).json({ success: false, message: 'Case not found' });
    const doc = await prisma.visaDocument.findFirst({
      where: { id: req.params.docId, visaCaseId: c.id },
    });
    if (!doc?.fileUrl) return res.status(404).json({ success: false, message: 'Document not found' });
    const abs = resolveUploadAbsolute(doc.fileUrl);
    if (!abs) return res.status(404).json({ success: false, message: 'File not available' });
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName || 'visa-document')}"`);
    return res.sendFile(abs);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/:id/alerts', async (req, res) => {
  try {
    const c = await prisma.visaCase.findFirst({
      where: { OR: [{ id: req.params.id }, { displayId: req.params.id }] },
    });
    if (!c) return res.status(404).json({ success: false, message: 'Case not found' });
    const alerts = await prisma.visaExpiryAlert.findMany({
      where: { visaCaseId: c.id },
      orderBy: { alertDays: 'desc' },
    });
    res.json({ success: true, data: { alerts } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/:id/documents', requireVisaCaseWrite, upload.single('file'), async (req, res) => {
  try {
    const c = await prisma.visaCase.findFirst({
      where: { OR: [{ id: req.params.id }, { displayId: req.params.id }] },
    });
    if (!c) return res.status(404).json({ success: false, message: 'Case not found' });
    if (!req.file) return res.status(400).json({ success: false, message: 'file is required' });
    const documentType = req.body.documentType || 'OTHER';
    const doc = await prisma.visaDocument.create({
      data: {
        visaCaseId: c.id,
        documentType,
        fileName: req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
        uploadedById: req.user.id,
      },
    });
    res.status(201).json({ success: true, data: doc });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/:id/documents/bulk', requireVisaCaseWrite, upload.array('files', 12), async (req, res) => {
  try {
    const c = await prisma.visaCase.findFirst({
      where: { OR: [{ id: req.params.id }, { displayId: req.params.id }] },
    });
    if (!c) return res.status(404).json({ success: false, message: 'Case not found' });
    if (!req.files || !req.files.length) {
      return res.status(400).json({ success: false, message: 'files[] is required' });
    }

    const uploaded = [];
    for (const f of req.files) {
      const documentType = (req.body.documentType || 'OTHER').toString();
      const row = await prisma.visaDocument.create({
        data: {
          visaCaseId: c.id,
          documentType,
          fileName: f.originalname,
          fileUrl: `/uploads/${f.filename}`,
          uploadedById: req.user.id,
        },
      });
      uploaded.push(row);
    }
    res.status(201).json({ success: true, data: { documents: uploaded } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/:id/dependents', requireVisaCaseWrite, async (req, res) => {
  try {
    const c = await prisma.visaCase.findFirst({
      where: { OR: [{ id: req.params.id }, { displayId: req.params.id }] },
    });
    if (!c) return res.status(404).json({ success: false, message: 'Case not found' });
    const { name, relationship, passportNo, passStatus, expiryDate, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    const dep = await prisma.visaDependent.create({
      data: {
        visaCaseId: c.id,
        name,
        relationship: relationship || null,
        passportNo: passportNo || null,
        passStatus: passStatus || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        notes: notes || null,
      },
    });
    res.status(201).json({ success: true, data: dep });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/:id/onboarding-items', requireVisaChecklistWrite, async (req, res) => {
  try {
    const c = await prisma.visaCase.findFirst({
      where: { OR: [{ id: req.params.id }, { displayId: req.params.id }] },
    });
    if (!c) return res.status(404).json({ success: false, message: 'Case not found' });

    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'items[] is required' });
    }

    const valid = items
      .map((i) => ({
        itemName: (i.itemName || '').toString().trim(),
        itemPhase: (i.itemPhase || 'DOC_REQUEST').toString(),
        dueDate: i.dueDate ? new Date(i.dueDate) : null,
      }))
      .filter((i) => i.itemName);

    if (!valid.length) {
      return res.status(400).json({ success: false, message: 'At least one itemName is required' });
    }

    const latest = await prisma.visaOnboardingItem.findFirst({
      where: { visaCaseId: c.id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    let nextOrder = (latest?.sortOrder || 0) + 1;

    const created = [];
    for (const item of valid) {
      const row = await prisma.visaOnboardingItem.create({
        data: {
          visaCaseId: c.id,
          itemName: item.itemName,
          itemPhase: item.itemPhase,
          dueDate: item.dueDate,
          status: 'PENDING',
          sortOrder: nextOrder++,
        },
      });
      created.push(row);
    }

    res.status(201).json({ success: true, data: { items: created } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.patch('/:id', requireVisaCaseWrite, async (req, res) => {
  try {
    const c = await prisma.visaCase.findFirst({
      where: { OR: [{ id: req.params.id }, { displayId: req.params.id }] },
    });
    if (!c) return res.status(404).json({ success: false, message: 'Case not found' });

    const {
      workerName,
      nationality,
      workerCategory,
      permitType,
      permitStatus,
      applicationDate,
      approvalDate,
      expiryDate,
      caseOwnerId,
      notes,
    } = req.body;

    const exp = expiryDate !== undefined ? (expiryDate ? new Date(expiryDate) : null) : undefined;
    const renewalDue = exp !== undefined ? renewalDueFromExpiry(exp) : undefined;

    const updated = await prisma.visaCase.update({
      where: { id: c.id },
      data: {
        ...(workerName !== undefined && { workerName }),
        ...(nationality !== undefined && { nationality }),
        ...(workerCategory !== undefined && { workerCategory }),
        ...(permitType !== undefined && { permitType }),
        ...(permitStatus !== undefined && { permitStatus }),
        ...(applicationDate !== undefined && { applicationDate: applicationDate ? new Date(applicationDate) : null }),
        ...(approvalDate !== undefined && { approvalDate: approvalDate ? new Date(approvalDate) : null }),
        ...(exp !== undefined && { expiryDate: exp }),
        ...(renewalDue !== undefined && { renewalDueDate: renewalDue }),
        ...(caseOwnerId !== undefined && { caseOwnerId }),
        ...(notes !== undefined && { notes }),
        updatedById: req.user.id,
      },
    });
    if (exp !== undefined) {
      await syncPermitExpiryAlerts(updated.id, updated.expiryDate);
    }

    if (permitStatus !== undefined && permitStatus !== c.permitStatus) {
      const fullEmployee = await prisma.employeeProfile.findUnique({
        where: { id: updated.employeeProfileId || '' },
        select: { userId: true, department: true }
      }).catch(() => null);

      if (fullEmployee?.userId) {
        await notificationService.createNotification({
          userId: fullEmployee.userId,
          type: 'VISA_CASE_STATUS_UPDATED',
          title: `Visa case status updated (${updated.displayId})`,
          message: `Your visa case status changed from ${c.permitStatus || 'N/A'} to ${permitStatus}.`,
          relatedId: updated.id,
          severity: ['REJECTED', 'EXPIRED', 'RENEWAL_REQUIRED'].includes(permitStatus) ? 'HIGH' : 'NORMAL'
        }).catch(() => {});
      }

      const departmentManagers = await prisma.user.findMany({
        where: {
          department: fullEmployee?.department || undefined,
          role: { in: ['HR_ADMIN', 'MANAGEMENT', 'ADMIN', 'VISA_ADMIN'] },
          id: { not: req.user.id }
        },
        select: { id: true }
      }).catch(() => []);

      for (const manager of departmentManagers) {
        await notificationService.createNotification({
          userId: manager.id,
          type: 'VISA_CASE_STATUS_UPDATED',
          title: `Visa case review update (${updated.displayId})`,
          message: `Case ${updated.displayId} status changed to ${permitStatus}.`,
          relatedId: updated.id,
          severity: ['REJECTED', 'EXPIRED', 'RENEWAL_REQUIRED'].includes(permitStatus) ? 'HIGH' : 'NORMAL'
        }).catch(() => {});
      }
    }

    const full = await prisma.visaCase.findUnique({
      where: { id: updated.id },
      include: caseInclude,
    });
    res.json({ success: true, data: full });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const full = await prisma.visaCase.findFirst({
      where: { OR: [{ id: req.params.id }, { displayId: req.params.id }] },
      include: caseInclude,
    });
    if (!full) return res.status(404).json({ success: false, message: 'Case not found' });
    res.json({ success: true, data: full });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/:id', requireVisaCaseWrite, async (req, res) => {
  try {
    const c = await prisma.visaCase.findFirst({
      where: { OR: [{ id: req.params.id }, { displayId: req.params.id }] },
    });
    if (!c) return res.status(404).json({ success: false, message: 'Case not found' });
    await prisma.visaCase.delete({ where: { id: c.id } });
    res.json({ success: true, message: 'Case deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
