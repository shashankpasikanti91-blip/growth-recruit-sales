/**
 * Public Holidays API Route
 * Returns Malaysian public holidays for use in attendance calendar
 */
const express = require('express');
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// Malaysia national public holidays (static fallback for 2025/2026)
const MALAYSIA_NATIONAL_HOLIDAYS = {
  2025: [
    { date: '2025-01-01', name: "New Year's Day", type: 'NATIONAL' },
    { date: '2025-01-29', name: 'Chinese New Year', type: 'NATIONAL' },
    { date: '2025-01-30', name: 'Chinese New Year (Day 2)', type: 'NATIONAL' },
    { date: '2025-02-11', name: 'Thaipusam', type: 'NATIONAL' },
    { date: '2025-03-31', name: 'Hari Raya Aidilfitri', type: 'NATIONAL' },
    { date: '2025-04-01', name: 'Hari Raya Aidilfitri (Day 2)', type: 'NATIONAL' },
    { date: '2025-04-18', name: 'Good Friday', type: 'NATIONAL' },
    { date: '2025-05-01', name: 'Labour Day', type: 'NATIONAL' },
    { date: '2025-05-12', name: 'Wesak Day', type: 'NATIONAL' },
    { date: '2025-06-02', name: "Yang di-Pertuan Agong's Birthday", type: 'NATIONAL' },
    { date: '2025-06-07', name: 'Hari Raya Haji', type: 'NATIONAL' },
    { date: '2025-06-27', name: 'Awal Muharram', type: 'NATIONAL' },
    { date: '2025-08-31', name: 'National Day', type: 'NATIONAL' },
    { date: '2025-09-05', name: "Prophet Muhammad's Birthday", type: 'NATIONAL' },
    { date: '2025-09-16', name: 'Malaysia Day', type: 'NATIONAL' },
    { date: '2025-10-20', name: 'Deepavali', type: 'NATIONAL' },
    { date: '2025-12-25', name: 'Christmas Day', type: 'NATIONAL' },
  ],
  2026: [
    { date: '2026-01-01', name: "New Year's Day", type: 'NATIONAL' },
    { date: '2026-01-17', name: 'Chinese New Year', type: 'NATIONAL' },
    { date: '2026-01-18', name: 'Chinese New Year (Day 2)', type: 'NATIONAL' },
    { date: '2026-03-02', name: 'Thaipusam', type: 'NATIONAL' },
    { date: '2026-03-20', name: 'Hari Raya Aidilfitri', type: 'NATIONAL' },
    { date: '2026-03-21', name: 'Hari Raya Aidilfitri (Day 2)', type: 'NATIONAL' },
    { date: '2026-05-01', name: 'Labour Day', type: 'NATIONAL' },
    { date: '2026-05-26', name: "Yang di-Pertuan Agong's Birthday", type: 'NATIONAL' },
    { date: '2026-05-31', name: 'Wesak Day', type: 'NATIONAL' },
    { date: '2026-06-24', name: 'Hari Raya Haji', type: 'NATIONAL' },
    { date: '2026-07-16', name: 'Awal Muharram', type: 'NATIONAL' },
    { date: '2026-08-31', name: 'National Day', type: 'NATIONAL' },
    { date: '2026-09-16', name: 'Malaysia Day', type: 'NATIONAL' },
    { date: '2026-09-25', name: "Prophet Muhammad's Birthday", type: 'NATIONAL' },
    { date: '2026-11-08', name: 'Deepavali', type: 'NATIONAL' },
    { date: '2026-12-25', name: 'Christmas Day', type: 'NATIONAL' },
  ],
};

/**
 * GET /api/holidays
 * Get public holidays (from DB, falling back to static list)
 * Query params: year, month (optional filter)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { year = new Date().getFullYear(), month } = req.query;
    const yearInt = parseInt(year);
    const monthInt = month ? parseInt(month) : null;

    // Try to fetch from DB first
    let holidays = [];
    try {
      const where = { year: yearInt };
      if (monthInt) {
        const startDate = new Date(`${yearInt}-${String(monthInt).padStart(2, '0')}-01`);
        const endDate = new Date(yearInt, monthInt, 0); // last day of month
        where.holidayDate = { gte: startDate, lte: endDate };
      }
      holidays = await prisma.publicHoliday.findMany({
        where,
        orderBy: { holidayDate: 'asc' },
      });
    } catch (dbErr) {
      // DB table might not exist yet, use static fallback
    }

    // If no DB records, use static list
    if (holidays.length === 0) {
      const staticList = MALAYSIA_NATIONAL_HOLIDAYS[yearInt] || [];
      holidays = staticList.filter(h => {
        if (!monthInt) return true;
        const hDate = new Date(h.date);
        return hDate.getMonth() + 1 === monthInt;
      }).map(h => ({
        id: h.date,
        date: h.date,
        name: h.name,
        type: h.type,
        year: yearInt,
        isNational: true
      }));
    } else {
      // Format DB records to consistent shape
      holidays = holidays.map(h => ({
        id: h.id,
        date: h.holidayDate.toISOString().split('T')[0],
        name: h.holidayName,
        type: h.type || 'NATIONAL',
        year: h.year,
        isNational: h.isNational
      }));
    }

    res.json({ success: true, data: { holidays, year: yearInt, month: monthInt } });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch holidays', error: error.message });
  }
});

/**
 * POST /api/holidays
 * Create holiday record (HR Ops / Management)
 */
router.post('/', authenticate, authorize('HR_ADMIN', 'ADMIN', 'MANAGEMENT'), async (req, res) => {
  try {
    const { holidayName, holidayDate, state = null, isNational = false, replacementDate = null, notes = null } = req.body;
    if (!holidayName || !holidayDate) {
      return res.status(400).json({ success: false, message: 'holidayName and holidayDate are required' });
    }
    const dateObj = new Date(holidayDate);
    if (Number.isNaN(dateObj.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid holidayDate' });
    }
    const year = dateObj.getFullYear();

    const created = await prisma.publicHoliday.create({
      data: {
        holidayName,
        holidayDate: dateObj,
        state: state || null,
        isNational: Boolean(isNational),
        replacementDate: replacementDate ? new Date(replacementDate) : null,
        year,
        notes: notes || null,
      },
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('Error creating holiday:', error);
    return res.status(500).json({ success: false, message: 'Failed to create holiday', error: error.message });
  }
});

/**
 * DELETE /api/holidays/:id
 * Delete holiday record (HR Ops / Management)
 */
router.delete('/:id', authenticate, authorize('HR_ADMIN', 'ADMIN', 'MANAGEMENT'), async (req, res) => {
  try {
    const existing = await prisma.publicHoliday.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Holiday not found' });
    }
    await prisma.publicHoliday.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Holiday deleted' });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete holiday', error: error.message });
  }
});

module.exports = router;
