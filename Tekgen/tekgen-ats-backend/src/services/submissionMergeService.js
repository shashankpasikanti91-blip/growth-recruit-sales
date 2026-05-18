/**
 * Client submission pack: merge tokens + Excel preview rows for recruiters.
 * Used by /api/clients/submission-field-reference and preview-submission.
 */

const DEFAULT_EXCEL_KEYS = [
  'fullName',
  'email',
  'phone',
  'experienceYears',
  'skills',
  'salaryExpectation',
  'noticePeriod',
];

const EXCEL_FIELD_META = {
  fullName: { label: 'Full name' },
  email: { label: 'Email' },
  phone: { label: 'Phone' },
  experienceYears: { label: 'Years experience' },
  skills: { label: 'Key skills' },
  salaryExpectation: { label: 'Salary expectation' },
  noticePeriod: { label: 'Notice period' },
};

const MERGE_TOKENS = [
  { token: '{{candidateName}}', description: 'Candidate full name' },
  { token: '{{jobTitle}}', description: 'Job / requirement title' },
  { token: '{{clientName}}', description: 'Client company name' },
  { token: '{{candidateEmail}}', description: 'Candidate email' },
];

function candidateFullName(candidate) {
  const n = `${candidate?.firstName || ''} ${candidate?.lastName || ''}`.trim();
  return n || candidate?.email || '';
}

function parseSubmissionFormat(raw) {
  if (!raw || typeof raw !== 'string') {
    return {
      emailSubject: '',
      emailBody: '',
      excelFieldKeys: [...DEFAULT_EXCEL_KEYS],
    };
  }
  try {
    const j = JSON.parse(raw);
    const cols = j.excelColumnOrder || j.excelFieldKeys;
    let excelFieldKeys = Array.isArray(cols) && cols.length ? cols : [...DEFAULT_EXCEL_KEYS];
    // Normalize human column labels to keys when they match known labels
    excelFieldKeys = excelFieldKeys.map((col) => {
      const s = String(col).trim();
      const entry = Object.entries(EXCEL_FIELD_META).find(([, v]) => v.label === s);
      return entry ? entry[0] : s;
    });
    return {
      emailSubject: j.emailSubject || '',
      emailBody: j.emailBody || j.emailBodyHint || '',
      excelFieldKeys,
    };
  } catch {
    return {
      emailSubject: '',
      emailBody: raw.trim(),
      excelFieldKeys: [...DEFAULT_EXCEL_KEYS],
    };
  }
}

function buildMergeMap({ client, job, candidate }) {
  const map = new Map();
  map.set('candidateName', candidateFullName(candidate));
  map.set('jobTitle', job?.title || '');
  map.set('clientName', client?.clientName || '');
  map.set('candidateEmail', candidate?.email || '');
  return map;
}

function applyMergeTemplate(str, mergeMap) {
  if (str == null || str === '') return '';
  let out = String(str);
  mergeMap.forEach((value, key) => {
    const safe = value == null ? '' : String(value);
    out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), safe);
  });
  return out;
}

function valueForExcelKey(key, candidate) {
  const k = String(key).toLowerCase();
  const name = candidateFullName(candidate);
  if (k === 'fullname' || k.includes('full name') || k === 'name') return name;
  if (k.includes('email')) return candidate?.email || '';
  if (k.includes('phone') || k.includes('mobile')) return candidate?.phone || '';
  if (k.includes('experience') || k.includes('years')) {
    const y = candidate?.experienceYears ?? candidate?.yearsOfExperience;
    return y != null ? String(y) : '';
  }
  if (k.includes('skill')) {
    const s = candidate?.skills;
    if (Array.isArray(s)) return s.join(', ');
    if (typeof s === 'string') return s;
    return '';
  }
  if (k.includes('salary') || k.includes('expectation')) return candidate?.salaryExpectation || '';
  if (k.includes('notice')) return candidate?.noticePeriod || '';
  return '';
}

function buildExcelPreviewRow(candidate, excelFieldKeys) {
  const keys = Array.isArray(excelFieldKeys) && excelFieldKeys.length ? excelFieldKeys : DEFAULT_EXCEL_KEYS;
  const row = {};
  for (const key of keys) {
    row[key] = valueForExcelKey(key, candidate);
  }
  return row;
}

module.exports = {
  DEFAULT_EXCEL_KEYS,
  EXCEL_FIELD_META,
  MERGE_TOKENS,
  parseSubmissionFormat,
  buildMergeMap,
  applyMergeTemplate,
  buildExcelPreviewRow,
};
