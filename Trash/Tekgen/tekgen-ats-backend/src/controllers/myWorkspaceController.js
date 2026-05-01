const prisma = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

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
   * Update own employee profile (sensitive fields handled separately)
   */
  async updateProfile(req, res, next) {
    try {
      const {
        // personal
        nricPassport, nationality, dob, gender, personalEmail, phone, address,
        // emergency
        emergencyName, emergencyPhone, emergencyRelation,
        // employment (read-only fields ignored if sent by non-admin)
        workLocation, workState,
        // bank / tax — sensitive
        bankName, bankAccountNo, taxNumber, epfNumber, socsoNumber, eisNumber,
      } = req.body;

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
          ...(nricPassport !== undefined && { nricPassport }),
          ...(nationality !== undefined && { nationality }),
          ...(dob !== undefined && { dob: dob ? new Date(dob) : null }),
          ...(gender !== undefined && { gender }),
          ...(personalEmail !== undefined && { personalEmail }),
          ...(phone !== undefined && { phone }),
          ...(address !== undefined && { address }),
          ...(emergencyName !== undefined && { emergencyName }),
          ...(emergencyPhone !== undefined && { emergencyPhone }),
          ...(emergencyRelation !== undefined && { emergencyRelation }),
          ...(workLocation !== undefined && { workLocation }),
          ...(workState !== undefined && { workState }),
          ...(bankName !== undefined && { bankName }),
          ...(bankAccountNo !== undefined && { bankAccountNo }),
          ...(taxNumber !== undefined && { taxNumber }),
          ...(epfNumber !== undefined && { epfNumber }),
          ...(socsoNumber !== undefined && { socsoNumber }),
          ...(eisNumber !== undefined && { eisNumber }),
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
      const { year, status, page = 1, limit = 20 } = req.query;
      const profile = await getOrCreateProfile(req.user.id, null);

      const where = { employeeId: profile.id };
      if (year) {
        const y = parseInt(year);
        where.startDate = { gte: new Date(`${y}-01-01`), lt: new Date(`${y + 1}-01-01`) };
      }
      if (status) where.status = status;

      const [requests, total] = await Promise.all([
        prisma.leaveRequest.findMany({
          where,
          orderBy: { appliedAt: 'desc' },
          skip: (parseInt(page) - 1) * parseInt(limit),
          take: parseInt(limit),
        }),
        prisma.leaveRequest.count({ where }),
      ]);

      return sendSuccess(res, { requests, total, page: parseInt(page), limit: parseInt(limit) });
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
        },
      });

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
}

module.exports = new MyWorkspaceController();
