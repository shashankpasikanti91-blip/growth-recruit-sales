'use strict';

const path = require('path');
const prisma = require('../config/database');
const { sendError } = require('../utils/response');
const { resolveUploadAbsolute } = require('../utils/secureUploadPath');
const clientController = require('./clientController');

/** Roles that may download leave/claim attachments for employees other than themselves (approvers / ops). */
const CAN_DOWNLOAD_CROSS_ATTACHMENTS = new Set([
  'ADMIN',
  'SUPER_ADMIN',
  'MANAGEMENT',
  'ASSISTANT_MANAGER',
  'DIRECTOR',
  'HEAD',
  'MD',
  'MANAGING_DIRECTOR',
  'COMPANY_HEAD',
  'DEPT_HEAD',
  'DEPARTMENT_HEAD',
  'MANAGER',
  'DEPT_MANAGER',
  'DEPARTMENT_MANAGER',
  'HR_ADMIN',
  'PAYROLL_ADMIN',
  'FINANCE_HEAD',
  'FINANCE',
  'FINANCE_MANAGER',
  'CFO',
  'RECRUITMENT_MANAGER',
  'VISA_ADMIN',
]);

class SecureDownloadController {
  async downloadAttachment(req, res, next) {
    try {
      const att = await prisma.attachment.findUnique({
        where: { id: req.params.id },
        include: {
          claim: { include: { employee: { select: { userId: true } } } },
          leaveRequest: { include: { employee: { select: { userId: true } } } },
        },
      });
      if (!att || (!att.claimId && !att.leaveRequestId)) {
        return sendError(res, 'Attachment not found', 404);
      }

      const ownerUserId =
        att.claim?.employee?.userId || att.leaveRequest?.employee?.userId || null;
      const isOwner = ownerUserId && ownerUserId === req.user.id;
      const isElevated = CAN_DOWNLOAD_CROSS_ATTACHMENTS.has(req.user.role);
      if (!isOwner && !isElevated) return sendError(res, 'Forbidden', 403);

      const ref = att.fileUrl || att.filePath;
      const abs = resolveUploadAbsolute(ref);
      if (!abs) return sendError(res, 'File not available', 404);

      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(att.fileName || 'attachment')}"`
      );
      return res.sendFile(abs);
    } catch (e) {
      next(e);
    }
  }

  /** Client portfolio document — same access rules as GET /api/clients/:id */
  async downloadClientDocument(req, res, next) {
    try {
      const doc = await prisma.clientDocument.findUnique({
        where: { id: req.params.id },
        include: { client: true },
      });
      if (!doc?.client) return sendError(res, 'Document not found', 404);
      if (clientController._denyPortfolioClient(req, doc.client)) {
        return sendError(res, 'Unauthorized', 403);
      }

      const abs = resolveUploadAbsolute(doc.fileUrl);
      if (!abs) return sendError(res, 'File not available', 404);

      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(doc.fileName || doc.title || 'document')}"`
      );
      return res.sendFile(abs);
    } catch (e) {
      next(e);
    }
  }

  /** Commercial agreement PDF stored under UPLOAD_DIR — same portfolio rules as GET /api/clients/:id */
  async downloadClientAgreement(req, res, next) {
    try {
      const agr = await prisma.agreement.findUnique({
        where: { id: req.params.id },
        include: { client: true },
      });
      if (!agr?.client) return sendError(res, 'Agreement not found', 404);
      if (clientController._denyPortfolioClient(req, agr.client)) {
        return sendError(res, 'Unauthorized', 403);
      }

      const abs = resolveUploadAbsolute(agr.documentUrl);
      if (!abs) return sendError(res, 'File not available', 404);

      const base = path.basename(abs);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(base)}"`
      );
      return res.sendFile(abs);
    } catch (e) {
      next(e);
    }
  }
}

module.exports = new SecureDownloadController();
