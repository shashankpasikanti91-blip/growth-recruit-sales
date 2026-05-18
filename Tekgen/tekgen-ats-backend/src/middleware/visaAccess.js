const { sendError } = require('../utils/response');

const READ = new Set(['VISA_ADMIN', 'HR_ADMIN', 'ADMIN']);
const CASE_WRITE = new Set(['VISA_ADMIN', 'ADMIN']);
const CHECKLIST_WRITE = new Set(['VISA_ADMIN', 'HR_ADMIN', 'ADMIN']);
const COMPLIANCE_WRITE = new Set(['VISA_ADMIN', 'ADMIN']);

function requireVisaRead(req, res, next) {
  if (!req.user) return sendError(res, 'Authentication required', 401);
  if (!READ.has(req.user.role)) {
    return sendError(res, 'Visa desk access required', 403);
  }
  return next();
}

function requireVisaCaseWrite(req, res, next) {
  if (!req.user) return sendError(res, 'Authentication required', 401);
  if (!CASE_WRITE.has(req.user.role)) {
    return sendError(res, 'Only Visa Admin or Managing Director can modify visa cases', 403);
  }
  return next();
}

function requireVisaChecklistWrite(req, res, next) {
  if (!req.user) return sendError(res, 'Authentication required', 401);
  if (!CHECKLIST_WRITE.has(req.user.role)) {
    return sendError(res, 'Insufficient permissions to update checklist', 403);
  }
  return next();
}

function requireComplianceWrite(req, res, next) {
  if (!req.user) return sendError(res, 'Authentication required', 401);
  if (!COMPLIANCE_WRITE.has(req.user.role)) {
    return sendError(res, 'Only Admin or Visa Admin can change compliance rules', 403);
  }
  return next();
}

module.exports = {
  requireVisaRead,
  requireVisaCaseWrite,
  requireVisaChecklistWrite,
  requireComplianceWrite,
};
