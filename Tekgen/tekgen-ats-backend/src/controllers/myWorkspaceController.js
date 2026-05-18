const prisma = require('../config/database');
const { resolveUploadAbsolute } = require('../utils/secureUploadPath');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');
const approvalService = require('../services/approvalService');

// ─── ID generators ────────────────────────────────────────────────────────────
async function generateEmployeeId() {
  const last = await prisma.employeeProfile.findFirst({
    where: { employeeId: { contains: 'TKG-EMP-' } },
    orderBy: { employeeId: 'desc' },
    select: { employeeId: true },
  });
  let nextNum = 1;
  if (last?.employeeId) {
    const m = last.employeeId.match(/TKG-EMP-(\d+)/);
    if (m) nextNum = parseInt(m[1], 10) + 1;
  }
  return `TKG-EMP-${String(nextNum).padStart(4, '0')}`;
}

async function generateLeaveId() {
  const last = await prisma.leaveRequest.findFirst({
    where: { displayId: { not: null } },
    orderBy: { displayId: 'desc' },
    select: { displayId: true },
  });
  let nextNum = 1;
  if (last?.displayId) {
    const m = last.displayId.match(/TKG-LV-(\d+)/);
    if (m) nextNum = parseInt(m[1], 10) + 1;
  }
  return `TKG-LV-${String(nextNum).padStart(4, '0')}`;
}

async function generateClaimId() {
  const last = await prisma.claim.findFirst({
    where: { displayId: { not: null } },
    orderBy: { displayId: 'desc' },
    select: { displayId: true },
  });
  let nextNum = 1;
  if (last?.displayId) {
    const m = last.displayId.match(/TKG-CLM-(\d+)/);
    if (m) nextNum = parseInt(m[1], 10) + 1;
  }
  return `TKG-CLM-${String(nextNum).padStart(4, '0')}`;
}

// ─── Helper: get or auto-create employee profile for a user ──────────────────
async function getOrCreateProfile(userId, userRecord) {
  let profile = await prisma.employeeProfile.findUnique({ where: { userId } });
  if (!profile) {
    const employeeId = await generateEmployeeId();
    profile = await prisma.employeeProfile.create({
      data: {
        employeeId,
        userId,
        department: userRecord?.department || null,
        status: 'ACTIVE',
      },
    });
    logger.info(`Auto-created EmployeeProfile ${employeeId} for user ${userId}`);
  }
  return profile;
}

// ─── Helper: mask bank account number ────────────────────────────────────────
function maskAccount(num) {
  if (!num) return null;
  if (num.length <= 4) return '****';
  return '*'.repeat(num.length - 4) + num.slice(-4);
}

class MyWorkspaceController {
  /**
   * GET /api/my/profile
   * Return own employee profile (bank account masked)
   */
  async getProfile(req, res, next) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, firstName: true, lastName: true, email: true, role: true, phone: true, department: true, avatar: true },
      });
      if (!user) return sendError(res, 'User not found', 404);

      const profile = await getOrCreateProfile(req.user.id, user);

      return sendSuccess(res, {
        user,
        profile: {
          ...profile,
          bankAccountNo: maskAccount(profile.bankAccountNo),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/my/profile
   * Update own employee profile (strict self-service: phone only)
   */
  async updateProfile(req, res, next) {
    try {
      const { phone } = req.body;

      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          ...(phone !== undefined && { phone }),
        },
      });

      const profile = await getOrCreateProfile(req.user.id, null);

      const updated = await prisma.employeeProfile.update({
        where: { id: profile.id },
        data: {
          ...(phone !== undefined && { phone }),
        },
      });

      return sendSuccess(res, {
        profile: {
          ...updated,
          bankAccountNo: maskAccount(updated.bankAccountNo),
        },
      }, 'Profile updated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/my/profile/avatar
   * Upload own profile image
   */
  async uploadAvatar(req, res, next) {
    try {
      if (!req.file) return sendError(res, 'Avatar file is required', 400);
      const mime = req.file.mimetype || '';
      if (!mime.startsWith('image/')) {
        return sendError(res, 'Avatar must be an image file', 400);
      }

      const avatarUrl = `/uploads/${req.file.filename}`;
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { avatar: avatarUrl },
        select: { id: true, firstName: true, lastName: true, email: true, role: true, phone: true, department: true, avatar: true },
      });

      return sendSuccess(res, { user, avatarUrl }, 'Avatar updated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/my/leave/balance
   * Own leave balances for current year
   */
  async getLeaveBalance(req, res, next) {
    try {
      const year = parseInt(req.query.year) || new Date().getFullYear();
      const profile = await getOrCreateProfile(req.user.id, null);

      const balances = await prisma.leaveBalance.findMany({
        where: { employeeId: profile.id, year },
        orderBy: { leaveType: 'asc' },
      });

      // Seed default leave types if none exist yet
      if (balances.length === 0) {
        const defaults = [
          { leaveType: 'ANNUAL', entitlement: 14 },
          { leaveType: 'MEDICAL', entitlement: 14 },
          { leaveType: 'HOSPITALIZATION', entitlement: 60 },
          { leaveType: 'COMPASSIONATE', entitlement: 3 },
          { leaveType: 'NO_PAY', entitlement: 0 },
        ];
        const created = await Promise.all(
          defaults.map(d =>
            prisma.leaveBalance.create({
              data: { employeeId: profile.id, year, ...d },
            })
          )
        );
        return sendSuccess(res, { year, balances: created.map(b => ({
          ...b,
          remaining: Math.max(0, b.entitlement + b.carryForward - b.taken - b.pendingApproval),
        })) });
      }

      return sendSuccess(res, {
        year,
        balances: balances.map(b => ({
          ...b,
          remaining: Math.max(0, b.entitlement + b.carryForward - b.taken - b.pendingApproval),
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/my/leave
   * Own leave request history
   */
  async getLeaveHistory(req, res, next) {
    try {
      const { year, month, status, page = 1, limit = 20 } = req.query;
      const profile = await getOrCreateProfile(req.user.id, null);

      const where = { employeeId: profile.id };
      if (year) {
        const y = parseInt(year);
        if (month) {
          const m = parseInt(month);
          where.startDate = {
            gte: new Date(`${y}-${String(m).padStart(2, '0')}-01`),
            lt: new Date(y, m, 1), // first day of next month
          };
        } else {
          where.startDate = { gte: new Date(`${y}-01-01`), lt: new Date(`${y + 1}-01-01`) };
        }
      }
      if (status) where.status = status;

      const [leaves, total] = await Promise.all([
        prisma.leaveRequest.findMany({
          where,
          orderBy: { appliedAt: 'desc' },
          skip: (parseInt(page) - 1) * parseInt(limit),
          take: parseInt(limit),
        }),
        prisma.leaveRequest.count({ where }),
      ]);

      return sendSuccess(res, { leaves, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/my/leave
   * Apply for leave
   */
  async applyLeave(req, res, next) {
    try {
      const { leaveType, startDate, endDate, session = 'FULL_DAY', reason } = req.body;

      if (!leaveType || !startDate || !endDate) {
        return sendError(res, 'leaveType, startDate, and endDate are required', 400);
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start) || isNaN(end)) return sendError(res, 'Invalid date format', 400);
      if (end < start) return sendError(res, 'End date cannot be before start date', 400);

      // Calculate calendar days (basic; Malaysia holiday deduction handled in Phase 03)
      const msPerDay = 24 * 60 * 60 * 1000;
      let daysCount = Math.round((end - start) / msPerDay) + 1;
      if (session === 'MORNING' || session === 'AFTERNOON') daysCount = 0.5;

      const profile = await getOrCreateProfile(req.user.id, null);
      const year = start.getFullYear();

      // Check leave balance (warn — don't block for NO_PAY)
      const balance = await prisma.leaveBalance.findUnique({
        where: { employeeId_leaveType_year: { employeeId: profile.id, leaveType, year } },
      });
      const remaining = balance
        ? Math.max(0, balance.entitlement + balance.carryForward - balance.taken - balance.pendingApproval)
        : null;
      const isInsufficient = leaveType !== 'NO_PAY' && remaining !== null && daysCount > remaining;

      const displayId = await generateLeaveId();
      const request = await prisma.leaveRequest.create({
        data: {
          displayId,
          employeeId: profile.id,
          leaveType,
          startDate: start,
          endDate: end,
          session,
          daysCount,
          reason: reason || null,
          status: 'SUBMITTED',
          isPaid: !['NO_PAY', 'UNPAID'].includes(leaveType),
        },
      });

      // Initialize multi-level approval chain
      await approvalService.initializeLeaveApprovals(request.id);

      // Attach files if uploaded
      if (req.files && req.files.length > 0) {
        const attachments = req.files.map(file => ({
          leaveRequestId: request.id,
          fileName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          filePath: `/uploads/${file.filename}`,
          fileUrl: `/uploads/${file.filename}`,
          uploadedBy: req.user.id,
          uploadedAt: new Date()
        }));

        await prisma.attachment.createMany({ data: attachments });
      }

      // Update pendingApproval in leave balance
      if (balance) {
        await prisma.leaveBalance.update({
          where: { id: balance.id },
          data: { pendingApproval: { increment: daysCount } },
        });
      }

      return sendSuccess(res, {
        request,
        warning: isInsufficient
          ? `Insufficient balance: ${remaining} day(s) remaining, ${daysCount} requested`
          : null,
      }, 'Leave request submitted successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/my/leave/:id/cancel
   * Cancel own pending leave
   */
  async cancelLeave(req, res, next) {
    try {
      const profile = await getOrCreateProfile(req.user.id, null);
      const request = await prisma.leaveRequest.findFirst({
        where: { id: req.params.id, employeeId: profile.id },
      });
      if (!request) return sendError(res, 'Leave request not found', 404);
      if (!['SUBMITTED', 'PENDING_APPROVAL'].includes(request.status)) {
        return sendError(res, 'Only pending requests can be cancelled', 400);
      }

      const updated = await prisma.leaveRequest.update({
        where: { id: req.params.id },
        data: { status: 'CANCELLED', updatedAt: new Date() },
      });

      // Revert pendingApproval
      const balance = await prisma.leaveBalance.findUnique({
        where: {
          employeeId_leaveType_year: {
            employeeId: profile.id,
            leaveType: request.leaveType,
            year: request.startDate.getFullYear(),
          },
        },
      });
      if (balance) {
        await prisma.leaveBalance.update({
          where: { id: balance.id },
          data: { pendingApproval: { decrement: request.daysCount } },
        });
      }

      return sendSuccess(res, { request: updated }, 'Leave request cancelled');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/my/claims
   * Own claims
   */
  async getClaims(req, res, next) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const profile = await getOrCreateProfile(req.user.id, null);
      const where = { employeeId: profile.id };
      if (status) where.status = status;

      const [claims, total] = await Promise.all([
        prisma.claim.findMany({
          where,
          include: {
            attachments: {
              select: {
                id: true,
                fileName: true,
                fileUrl: true,
                fileSize: true,
                mimeType: true,
                uploadedAt: true,
              },
            },
            approvals: {
              select: {
                id: true,
                approvalLevel: true,
                approverRole: true,
                status: true,
                approvedAt: true,
              },
              orderBy: { approvalLevel: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (parseInt(page) - 1) * parseInt(limit),
          take: parseInt(limit),
        }),
        prisma.claim.count({ where }),
      ]);

      return sendSuccess(res, { claims, total });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/my/claims
   * Submit a new claim
   */
  async submitClaim(req, res, next) {
    try {
      const { claimType, amount, currency = 'MYR', claimDate, description } = req.body;

      if (!claimType || !amount || !claimDate) {
        return sendError(res, 'claimType, amount, and claimDate are required', 400);
      }
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return sendError(res, 'Amount must be a positive number', 400);
      }

      const profile = await getOrCreateProfile(req.user.id, null);
      const displayId = await generateClaimId();

      const claim = await prisma.claim.create({
        data: {
          displayId,
          employeeId: profile.id,
          claimType,
          amount: parsedAmount,
          currency,
          claimDate: new Date(claimDate),
          description: description || null,
          status: 'SUBMITTED',
        },
      });

      // Initialize multi-level approval chain
      await approvalService.initializeClaimApprovals(claim.id);

      // Attach files if uploaded
      if (req.files && req.files.length > 0) {
        const attachments = req.files.map(file => ({
          claimId: claim.id,
          fileName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          filePath: `/uploads/${file.filename}`,
          fileUrl: `/uploads/${file.filename}`,
          uploadedBy: req.user.id,
          uploadedAt: new Date()
        }));

        await prisma.attachment.createMany({ data: attachments });
      }

      return sendSuccess(res, { claim }, 'Claim submitted successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/my/summary
   * Dashboard summary: leave pending, claims pending, profile completeness
   */
  async getSummary(req, res, next) {
    try {
      const profile = await getOrCreateProfile(req.user.id, null);
      const year = new Date().getFullYear();

      const [pendingLeave, pendingClaims, balances] = await Promise.all([
        prisma.leaveRequest.count({
          where: { employeeId: profile.id, status: { in: ['SUBMITTED', 'PENDING_APPROVAL'] } },
        }),
        prisma.claim.count({
          where: { employeeId: profile.id, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
        }),
        prisma.leaveBalance.findMany({
          where: { employeeId: profile.id, year },
          select: { leaveType: true, entitlement: true, carryForward: true, taken: true, pendingApproval: true },
        }),
      ]);

      // Profile completeness check (simple)
      const requiredFields = ['nricPassport', 'nationality', 'phone', 'emergencyName', 'emergencyPhone', 'bankName', 'bankAccountNo'];
      const filledCount = requiredFields.filter(f => profile[f]).length;
      const profileComplete = Math.round((filledCount / requiredFields.length) * 100);

      return sendSuccess(res, {
        employeeId: profile.employeeId,
        status: profile.status,
        pendingLeave,
        pendingClaims,
        profileComplete,
        leaveSnapshot: balances.map(b => ({
          leaveType: b.leaveType,
          remaining: Math.max(0, b.entitlement + b.carryForward - b.taken - b.pendingApproval),
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/my/documents
   * Own employee documents only
   */
  async getDocuments(req, res, next) {
    try {
      const { documentType, page = 1, limit = 20 } = req.query;
      const profile = await getOrCreateProfile(req.user.id, null);

      const where = { employeeId: profile.id };
      if (documentType) where.documentType = documentType;

      const [documents, total] = await Promise.all([
        prisma.employeeDocument.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (parseInt(page) - 1) * parseInt(limit),
          take: parseInt(limit),
          select: {
            id: true,
            displayId: true,
            documentType: true,
            documentName: true,
            fileName: true,
            fileUrl: true,
            fileSize: true,
            expiryDate: true,
            issueDate: true,
            uploadedAt: true,
            verifiedAt: true,
          },
        }),
        prisma.employeeDocument.count({ where }),
      ]);

      return sendSuccess(res, { documents, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/my/documents/:id/download
   * Stream own employee document file (authenticated); prefer this over public /uploads.
   */
  async downloadDocument(req, res, next) {
    try {
      const profile = await getOrCreateProfile(req.user.id, null);
      const doc = await prisma.employeeDocument.findFirst({
        where: { id: req.params.id, employeeId: profile.id },
      });
      if (!doc?.fileUrl) return sendError(res, 'Document not found', 404);
      const abs = resolveUploadAbsolute(doc.fileUrl);
      if (!abs) return sendError(res, 'File not available', 404);
      const downloadName = doc.fileName || doc.documentName || 'document';
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(downloadName)}"`);
      return res.sendFile(abs);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/my/statutory-forms/:id/download
   */
  async downloadStatutoryForm(req, res, next) {
    try {
      const profile = await getOrCreateProfile(req.user.id, null);
      const row = await prisma.statutoryForm.findFirst({
        where: { id: req.params.id, employeeId: profile.id },
      });
      if (!row?.fileUrl) return sendError(res, 'Form file not found', 404);
      const abs = resolveUploadAbsolute(row.fileUrl);
      if (!abs) return sendError(res, 'File not available', 404);
      const downloadName = row.fileName || row.formName || 'statutory-form';
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(downloadName)}"`);
      return res.sendFile(abs);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/my/statutory-forms
   * Own statutory forms only
   */
  async getStatutoryForms(req, res, next) {
    try {
      const { formType, financialYear, page = 1, limit = 20 } = req.query;
      const profile = await getOrCreateProfile(req.user.id, null);

      const where = { employeeId: profile.id };
      if (formType) where.formType = formType;
      if (financialYear) where.financialYear = parseInt(financialYear);

      const [forms, total] = await Promise.all([
        prisma.statutoryForm.findMany({
          where,
          orderBy: [{ financialYear: 'desc' }, { createdAt: 'desc' }],
          skip: (parseInt(page) - 1) * parseInt(limit),
          take: parseInt(limit),
          select: {
            id: true,
            displayId: true,
            formType: true,
            formName: true,
            financialYear: true,
            dueDate: true,
            submissionDate: true,
            status: true,
            fileUrl: true,
            fileName: true,
            submittedAt: true,
            approvedAt: true,
          },
        }),
        prisma.statutoryForm.count({ where }),
      ]);

      return sendSuccess(res, { forms, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/my/attendance
   * Own attendance submissions
   */
  async getAttendance(req, res, next) {
    try {
      const profile = await getOrCreateProfile(req.user.id, null);
      const { month, year } = req.query;
      const where = { employeeId: profile.id };
      if (month && year) {
        const y = parseInt(year, 10);
        const m = parseInt(month, 10);
        where.date = {
          gte: new Date(y, m - 1, 1),
          lt: new Date(y, m, 1),
        };
      }
      const records = await prisma.attendance.findMany({
        where,
        orderBy: { date: 'desc' },
      });
      return sendSuccess(res, { records });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/my/attendance/submit
   * One-time attendance submission per day (no self-edit endpoint)
   */
  async submitAttendance(req, res, next) {
    try {
      const profile = await getOrCreateProfile(req.user.id, null);
      const { date = new Date().toISOString(), status = 'PRESENT', reason = null } = req.body || {};
      const allowedStatus = ['PRESENT', 'HALF_DAY', 'ON_DUTY', 'SICK', 'ABSENT'];
      if (!allowedStatus.includes(status)) {
        return sendError(res, 'Invalid attendance status', 400);
      }

      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return sendError(res, 'Invalid date', 400);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

      const existing = await prisma.attendance.findFirst({
        where: { employeeId: profile.id, date: { gte: dayStart, lt: dayEnd } },
      });
      if (existing) {
        return sendError(res, 'Attendance already submitted for this date. Editing is disabled.', 400);
      }

      const record = await prisma.attendance.create({
        data: {
          displayId: `TKG-ATT-${Date.now()}`,
          employeeId: profile.id,
          date: dayStart,
          status,
          reason,
          checkInTime: new Date(),
          approvalStatus: 'AUTO',
        },
      });
      return sendSuccess(res, { record }, 'Attendance submitted successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/my/attendance/submit-monthly
   * Flexible option: submit month attendance in one action (employee self-service)
   */
  async submitMonthlyAttendance(req, res, next) {
    try {
      const profile = await getOrCreateProfile(req.user.id, null);
      const now = new Date();
      const month = parseInt(req.body?.month, 10) || (now.getMonth() + 1);
      const year = parseInt(req.body?.year, 10) || now.getFullYear();
      const status = req.body?.status || 'PRESENT';
      const includeWeekends = req.body?.includeWeekends === true;

      const allowedStatus = ['PRESENT', 'HALF_DAY', 'ON_DUTY', 'SICK', 'ABSENT', 'LEAVE', 'UNPAID_LEAVE'];
      if (!allowedStatus.includes(status)) {
        return sendError(res, 'Invalid attendance status', 400);
      }
      if (month < 1 || month > 12) {
        return sendError(res, 'Invalid month', 400);
      }
      if (year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1)) {
        return sendError(res, 'Cannot submit attendance for future months', 400);
      }

      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      const endBoundary = (year === now.getFullYear() && month === now.getMonth() + 1)
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : monthEnd;

      const existing = await prisma.attendance.findMany({
        where: {
          employeeId: profile.id,
          date: { gte: monthStart, lte: endBoundary },
        },
        select: { date: true },
      });
      const existingDateSet = new Set(
        existing.map((r) => `${r.date.getFullYear()}-${r.date.getMonth()}-${r.date.getDate()}`)
      );

      const rows = [];
      for (let d = new Date(monthStart); d <= endBoundary; d.setDate(d.getDate() + 1)) {
        const day = d.getDay();
        if (!includeWeekends && (day === 0 || day === 6)) continue;
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (existingDateSet.has(key)) continue;

        const rowDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        rows.push({
          displayId: `TKG-ATT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          employeeId: profile.id,
          date: rowDate,
          status,
          reason: 'Monthly self submission',
          approvalStatus: 'AUTO',
          checkInTime: status === 'PRESENT' || status === 'ON_DUTY' ? new Date() : null,
        });
      }

      if (rows.length === 0) {
        return sendSuccess(res, { created: 0 }, 'No new attendance records were required');
      }

      await prisma.attendance.createMany({
        data: rows,
        skipDuplicates: true,
      });

      return sendSuccess(
        res,
        { created: rows.length, month, year },
        `Monthly attendance submitted for ${rows.length} day(s)`,
        201
      );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new MyWorkspaceController();
