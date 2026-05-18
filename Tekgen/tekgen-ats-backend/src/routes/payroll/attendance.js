const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { requireRecentBackup } = require('../../middleware/backupGuard');
const prisma = require('../../config/database');
const notificationService = require('../../services/notificationService');

const router = express.Router();
const PAYROLL_LOCKED_STATUSES = new Set(['APPROVED', 'GENERATED', 'PUBLISHED', 'CLOSED']);

function getPayrollBucketFromDate(inputDate) {
  const d = new Date(inputDate);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  if (day >= 25) {
    if (month === 12) return { month: 1, year: year + 1 };
    return { month: month + 1, year };
  }
  return { month, year };
}

async function ensureDateNotLockedForPayroll(date, actorRole) {
  const bucket = getPayrollBucketFromDate(date);
  const lockedRun = await prisma.payrollRun.findFirst({
    where: {
      month: bucket.month,
      year: bucket.year,
      status: { in: Array.from(PAYROLL_LOCKED_STATUSES) }
    },
    select: { id: true, displayId: true, status: true, month: true, year: true }
  });

  if (!lockedRun) return null;
  if (['ADMIN', 'SUPER_ADMIN'].includes(actorRole)) return null;

  return lockedRun;
}

// GET attendance records
router.get('/', authenticate, authorize('PAYROLL_ADMIN', 'HR_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { employeeId, month, year, status } = req.query;

    const where = {};
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    // If month/year provided, filter by date range
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      where.date = {
        gte: startDate,
        lte: endDate
      };
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            employeeId: true,
            user: { select: { firstName: true, lastName: true } }
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    res.json({ success: true, data: attendance });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE/UPDATE attendance record (Payroll Admin or HR Admin)
router.post('/', authenticate, authorize('PAYROLL_ADMIN', 'HR_ADMIN', 'ADMIN'), requireRecentBackup(24), async (req, res) => {
  try {
    const { employeeId, date, status, checkInTime, checkOutTime, overtimeHours, reason } = req.body;
    const lockedRun = await ensureDateNotLockedForPayroll(date, req.user.role);
    if (lockedRun) {
      return res.status(409).json({
        success: false,
        message: `Attendance is locked for payroll period ${lockedRun.month}/${lockedRun.year} (${lockedRun.displayId || lockedRun.id}, status ${lockedRun.status})`
      });
    }

    // Validate employee
    const employee = await prisma.employeeProfile.findUnique({
      where: { id: employeeId }
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const attendanceDate = new Date(date);

    // Check if record already exists for this date
    const existing = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: {
          gte: new Date(attendanceDate.getFullYear(), attendanceDate.getMonth(), attendanceDate.getDate()),
          lt: new Date(attendanceDate.getFullYear(), attendanceDate.getMonth(), attendanceDate.getDate() + 1)
        }
      }
    });

    let record;
    if (existing) {
      // Update existing
      record = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status,
          checkInTime: checkInTime ? new Date(checkInTime) : existing.checkInTime,
          checkOutTime: checkOutTime ? new Date(checkOutTime) : existing.checkOutTime,
          overtimeHours: overtimeHours ?? existing.overtimeHours,
          reason,
          approvedBy: req.user.id
        },
        include: {
          employee: { select: { employeeId: true, user: { select: { firstName: true, lastName: true } } } }
        }
      });
    } else {
      // Create new
      record = await prisma.attendance.create({
        data: {
          employeeId,
          date: attendanceDate,
          status,
          checkInTime: checkInTime ? new Date(checkInTime) : null,
          checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
          overtimeHours: overtimeHours ?? 0,
          reason,
          approvedBy: req.user.id,
          displayId: `TKG-ATT-${Date.now()}`
        },
        include: {
          employee: { select: { employeeId: true, user: { select: { firstName: true, lastName: true } } } }
        }
      });
    }

    if (employee?.userId) {
      try {
        await notificationService.createNotification({
          userId: employee.userId,
          type: 'ATTENDANCE_REVIEW_UPDATED',
          title: `Attendance ${existing ? 'updated' : 'recorded'}`,
          message: `Your attendance for ${new Date(date).toLocaleDateString()} is marked as ${status}.`,
          relatedId: record.id,
          severity: 'NORMAL'
        });
      } catch (notifyError) {
        console.error('Attendance notification error:', notifyError.message);
      }
    }
    res.status(existing ? 200 : 201).json({ success: true, message: existing ? 'Attendance updated' : 'Attendance recorded', data: record });
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE attendance record
router.delete('/:id', authenticate, authorize('PAYROLL_ADMIN', 'HR_ADMIN', 'ADMIN'), requireRecentBackup(24), async (req, res) => {
  try {
    const record = await prisma.attendance.findUnique({
      where: { id: req.params.id }
    });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    const lockedRun = await ensureDateNotLockedForPayroll(record.date, req.user.role);
    if (lockedRun) {
      return res.status(409).json({
        success: false,
        message: `Attendance is locked for payroll period ${lockedRun.month}/${lockedRun.year} (${lockedRun.displayId || lockedRun.id}, status ${lockedRun.status})`
      });
    }

    await prisma.attendance.delete({
      where: { id: req.params.id }
    });

    if (record?.employeeId) {
      const employee = await prisma.employeeProfile.findUnique({
        where: { id: record.employeeId },
        select: { userId: true }
      });
      if (employee?.userId) {
        try {
          await notificationService.createNotification({
            userId: employee.userId,
            type: 'ATTENDANCE_REVIEW_UPDATED',
            title: 'Attendance record removed',
            message: `An attendance record for ${new Date(record.date).toLocaleDateString()} was removed by authorized review.`,
            relatedId: record.id,
            severity: 'MEDIUM'
          });
        } catch (notifyError) {
          console.error('Attendance delete notification error:', notifyError.message);
        }
      }
    }
    res.json({ success: true, message: 'Attendance record deleted' });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET attendance summary for an employee (month view)
router.get('/:employeeId/summary', authenticate, authorize('PAYROLL_ADMIN', 'HR_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required' });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const records = await prisma.attendance.findMany({
      where: {
        employeeId: req.params.employeeId,
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Calculate summary
    const summary = {
      present: records.filter(r => r.status === 'PRESENT').length,
      absent: records.filter(r => r.status === 'ABSENT').length,
      halfDay: records.filter(r => r.status === 'HALF_DAY').length,
      leave: records.filter(r => r.status === 'LEAVE').length,
      unpaidLeave: records.filter(r => r.status === 'UNPAID_LEAVE').length,
      sick: records.filter(r => r.status === 'SICK').length,
      totalOvertimeHours: records.reduce((sum, r) => sum + (r.overtimeHours || 0), 0),
      totalWorkDays: records.length
    };

    res.json({ success: true, data: { records, summary } });
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
