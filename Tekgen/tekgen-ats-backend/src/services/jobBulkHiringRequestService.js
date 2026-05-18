/**
 * Parse client "Hiring Request" workbooks (e.g. CIMB) — many JD rows with JR No + Hiring Request ID.
 * Preview on server; commit creates jobs with per-row recruiter assignment and shared bulkImportBatchId.
 */
const XLSX = require('xlsx');
const crypto = require('crypto');
const prisma = require('../config/database');
const logger = require('../utils/logger');
const { generateJobId } = require('../utils/idGenerator');

const PREFERRED_SHEET_HINTS = ['hiring request', 'hiring', 'job', 'requisition'];

function normKey(k) {
  return String(k || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function rowMap(rawRow) {
  const m = {};
  for (const [k, v] of Object.entries(rawRow || {})) {
    m[normKey(k)] = v;
  }
  return m;
}

function pick(m, aliases) {
  for (const a of aliases) {
    const nk = normKey(a);
    if (m[nk] !== undefined && m[nk] !== null && String(m[nk]).trim() !== '') return m[nk];
  }
  return '';
}

function parseBillingRate(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).replace(/,/g, '').replace(/[^\d.]/g, '').trim();
  if (!s) return null;
  const n = Math.round(parseFloat(s));
  return Number.isFinite(n) ? n : null;
}

function buildDescriptionFromRow(r) {
  const parts = [];
  const add = (h, body) => {
    const t = String(body || '').trim();
    if (t) parts.push(`## ${h}\n\n${t}`);
  };
  add('Competencies and skills', r.competencies);
  add('Key responsibilities', r.responsibilities);
  add('Job specification', r.jobSpecification);
  const billing = r.billingRate != null ? `\n\n---\nBilling rate (client): ${r.billingRate}` : '';
  return (parts.join('\n\n') || 'Imported from client hiring request spreadsheet.') + billing;
}

function normalizeWorkbookToRows(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  let sheetName = wb.SheetNames[0];
  for (const name of wb.SheetNames) {
    const low = name.toLowerCase();
    if (PREFERRED_SHEET_HINTS.some((h) => low.includes(h))) {
      sheetName = name;
      break;
    }
  }
  const sheet = wb.Sheets[sheetName];
  if (!sheet) throw new Error('No worksheet found in workbook');

  const json = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  const rows = [];
  json.forEach((raw, idx) => {
    const m = rowMap(raw);
    const hiringRequestId = pick(m, ['Hiring Request ID', 'Request ID', 'HiringRequestId']);
    const jrNo = pick(m, ['JR No', 'JR Number', 'JR #', 'Jr No', 'Ref', 'Reference']);
    const position = pick(m, ['Position', 'Role', 'Job Title', 'Title']);
    if (!String(position).trim() && !String(jrNo).trim()) return;

    const contractMonths = pick(m, ['Contract Duration', 'Duration (Month)', 'Tenure']);
    const workLocation = pick(m, ['Work Location']);
    const workLocationDetail = pick(m, ['Work Location Detail', 'Location Detail', 'Site']);
    const competencies = pick(m, ['Competencies and Skills', 'Skills', 'Competencies']);
    const responsibilities = pick(m, ['Key Responsibilities', 'Responsibilities']);
    const jobSpecification = pick(m, ['Job Specification', 'Specification', 'Job Spec']);
    const billingRaw = pick(m, ['Billing Rate', 'Rate', 'Max Rate']);
    const billingRate = parseBillingRate(billingRaw);

    const durationNum = parseInt(String(contractMonths).replace(/\D/g, ''), 10);
    const hasDuration = Number.isFinite(durationNum) && durationNum > 0;
    const contractType = hasDuration ? 'CONTRACT' : 'PERMANENT';
    const contractDuration = hasDuration ? `${durationNum} months` : null;
    const location =
      String(workLocationDetail || workLocation || 'Malaysia')
        .trim()
        .slice(0, 250) || 'Malaysia';

    const row = {
      rowIndex: idx,
      clientRequestUuid: String(hiringRequestId || '').trim() || null,
      clientJrNumber: String(jrNo || '').trim() || null,
      position: String(position || `Role ${jrNo || idx + 1}`).trim().slice(0, 500),
      contractType,
      contractDuration,
      location,
      workLocation: String(workLocation || '').trim() || null,
      workLocationDetail: String(workLocationDetail || '').trim() || null,
      competencies: String(competencies || '').trim(),
      responsibilities: String(responsibilities || '').trim(),
      jobSpecification: String(jobSpecification || '').trim(),
      billingRate,
      description: '',
    };
    row.description = buildDescriptionFromRow(row);
    rows.push(row);
  });

  if (!rows.length) {
    throw new Error(
      'No recognizable job rows in this sheet (expected columns like Position and/or JR No). If the client sent only one JD, use Job Openings → New client requirement — Tekgen still creates a client CRM displayId (on the client record) and a Tekgen job displayId (TKG-J-…) when you save.'
    );
  }

  return {
    sheetName,
    sheetNames: wb.SheetNames,
    rowCount: rows.length,
    rows,
  };
}

function newBatchId() {
  return `bulk-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

class JobBulkHiringRequestService {
  previewBuffer(buffer, originalName = '') {
    try {
      const parsed = normalizeWorkbookToRows(buffer);
      logger.info(`Hiring request preview: ${originalName} rows=${parsed.rowCount} sheet=${parsed.sheetName}`);
      return {
        fileName: originalName,
        ...parsed,
      };
    } catch (err) {
      const msg = err?.message || 'Invalid workbook';
      logger.warn(`Hiring request preview failed: ${originalName} ${msg}`);
      throw new Error(msg);
    }
  }

  /**
   * @param {object} params
   * @param {string} params.clientId
   * @param {string} params.userId - creator
   * @param {string} params.clientName
   * @param {string} params.jobReceivedDate - ISO date
   * @param {string} params.targetSubmissionDate - ISO date
   * @param {string} [params.priority]
   * @param {string} [params.batchLabel]
   * @param {Array<{ import?: boolean, assignedRecruiters?: string[], row: object }>} params.rows - row = normalized row from preview
   */
  async commitImport(params) {
    const {
      clientId,
      userId,
      clientName,
      jobReceivedDate,
      targetSubmissionDate,
      priority = 'MEDIUM',
      batchLabel = null,
      rows: inputRows,
    } = params;

    if (!clientId) throw new Error('clientId is required');
    if (!userId) throw new Error('userId is required');
    const jrd = jobReceivedDate ? new Date(jobReceivedDate) : null;
    const tsd = targetSubmissionDate ? new Date(targetSubmissionDate) : null;
    if (!jrd || !tsd || Number.isNaN(jrd.getTime()) || Number.isNaN(tsd.getTime())) {
      throw new Error('jobReceivedDate and targetSubmissionDate are required for client-linked bulk import');
    }

    const batchId = newBatchId();
    const label = batchLabel || `Bulk import ${new Date().toISOString().slice(0, 10)}`;

    const toCreate = (inputRows || []).filter((r) => r && r.import !== false && r.row);
    if (!toCreate.length) throw new Error('No rows selected for import');

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, ownerId: true, defaultRecruiters: true, clientName: true },
    });
    if (!client) throw new Error('Client not found');

    const created = [];
    const skipped = [];

    await prisma.$transaction(async (tx) => {
      for (const item of toCreate) {
        const row = item.row;
        const assignedRecruiters = Array.isArray(item.assignedRecruiters) ? [...item.assignedRecruiters] : [];

        if (row.clientJrNumber && row.clientRequestUuid) {
          const dup = await tx.job.findFirst({
            where: {
              clientId,
              clientJrNumber: row.clientJrNumber,
              clientRequestUuid: row.clientRequestUuid,
            },
            select: { id: true },
          });
          if (dup) {
            skipped.push({ rowIndex: row.rowIndex, reason: 'duplicate_jr_and_request_id', jobId: dup.id });
            continue;
          }
        } else if (row.clientJrNumber) {
          const dup = await tx.job.findFirst({
            where: { clientId, clientJrNumber: row.clientJrNumber },
            select: { id: true },
          });
          if (dup) {
            skipped.push({ rowIndex: row.rowIndex, reason: 'duplicate_jr_number', jobId: dup.id });
            continue;
          }
        }

        let salesOwnerId = client.ownerId || null;
        let recruiters = assignedRecruiters;
        if (recruiters.length === 0 && client.defaultRecruiters?.length) {
          recruiters = [...client.defaultRecruiters];
        }

        const displayId = await generateJobId();
        const billing = row.billingRate != null ? Number(row.billingRate) : null;

        const job = await tx.job.create({
          data: {
            displayId,
            title: row.position,
            description: row.description || 'Imported hiring request',
            requiredSkills: [],
            preferredSkills: [],
            mandatorySkills: [],
            minExperience: 0,
            maxExperience: null,
            department: 'General',
            location: row.location,
            country: null,
            salaryMin: null,
            salaryMax: billing,
            salaryCurrency: 'MYR',
            salaryFrequency: 'monthly',
            clientName: clientName || client.clientName || null,
            clientId,
            contractType: row.contractType || 'CONTRACT',
            contractDuration: row.contractDuration,
            headcount: 1,
            targetCvSubmissions: null,
            shareJdWithClient: false,
            slaTargetDays: 30,
            targetSubmissionDate: tsd,
            jobReceivedDate: jrd,
            jobDescriptionRaw: row.description,
            priority: String(priority || 'MEDIUM').toUpperCase(),
            candidateType: 'ANY',
            salesOwnerId,
            assignedRecruiters: recruiters,
            assignedTo: recruiters.length === 1 ? recruiters[0] : null,
            clientJrNumber: row.clientJrNumber,
            clientRequestUuid: row.clientRequestUuid,
            bulkImportBatchId: batchId,
            bulkImportLabel: label,
            userId,
          },
        });
        created.push(job);
      }
    });

    return {
      batchId,
      batchLabel: label,
      createdCount: created.length,
      skipped,
      jobs: created.map((j) => ({
        id: j.id,
        displayId: j.displayId,
        title: j.title,
        clientJrNumber: j.clientJrNumber,
        clientRequestUuid: j.clientRequestUuid,
      })),
    };
  }

  async listBatches({ clientId = null, limit = 15 } = {}) {
    const where = { bulkImportBatchId: { not: null } };
    if (clientId) where.clientId = clientId;

    const grouped = await prisma.job.groupBy({
      by: ['bulkImportBatchId'],
      where,
      _count: { id: true },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: 'desc' } },
      take: limit,
    });

    const enriched = await Promise.all(
      grouped.map(async (g) => {
        const sample = await prisma.job.findFirst({
          where: { bulkImportBatchId: g.bulkImportBatchId },
          select: {
            bulkImportLabel: true,
            clientId: true,
            client: { select: { id: true, clientName: true, displayId: true } },
          },
        });
        return {
          bulkImportBatchId: g.bulkImportBatchId,
          bulkImportLabel: sample?.bulkImportLabel,
          clientId: sample?.clientId,
          client: sample?.client || null,
          jobCount: g._count.id,
          lastCreatedAt: g._max.createdAt,
        };
      })
    );

    return enriched;
  }

  async getBatchDetail(batchId) {
    if (!batchId) return null;
    const jobs = await prisma.job.findMany({
      where: { bulkImportBatchId: batchId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        client: { select: { id: true, clientName: true, displayId: true } },
      },
      orderBy: [{ clientJrNumber: 'asc' }, { createdAt: 'asc' }],
    });
    if (!jobs.length) return null;
    return {
      bulkImportBatchId: batchId,
      bulkImportLabel: jobs[0].bulkImportLabel,
      client: jobs[0].client,
      jobs,
    };
  }
}

module.exports = new JobBulkHiringRequestService();
