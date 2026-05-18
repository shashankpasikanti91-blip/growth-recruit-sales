/**
 * Client Controller  Phase 2
 */
const prisma = require('../config/database');
const clientService = require('../services/clientService');
const submissionMergeService = require('../services/submissionMergeService');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

const COMMERCIAL_ROLES = ['ADMIN', 'SALES_MANAGER', 'SALES_EXEC', 'SALES_EXECUTIVE', 'FINANCE', 'FINANCE_HEAD', 'FINANCE_MANAGER', 'CFO'];

function redactClientAgreements(agreements, role) {
  const fullCommercial = ['ADMIN', 'FINANCE', 'FINANCE_HEAD', 'FINANCE_MANAGER', 'CFO'];
  if (!agreements || fullCommercial.includes(role)) return agreements;
  return agreements.map((a) => ({
    ...a,
    billRate: null,
    payRate: null,
    markup: null,
    minimumBilling: null,
  }));
}

class ClientController {
  _isPortfolioSalesUser(req) {
    return req.user.role === 'SALES_EXEC' || req.user.role === 'SALES_EXECUTIVE';
  }

  _denyPortfolioClient(req, client) {
    return this._isPortfolioSalesUser(req) && client.ownerId !== req.user.id;
  }
  // --- Client CRUD -----------------------------------------------------------

  async createClient(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return sendError(res, 'Validation failed', 400, errors.array());
      const client = await clientService.createClient(req.body, req.user.id);
      sendSuccess(res, client, 'Client created successfully', 201);
    } catch (err) {
      logger.error('Create client error', err);
      sendError(res, err.message, 500);
    }
  }

  async getClients(req, res) {
    try {
      const filters = {
        status: req.query.status || undefined,
        search: req.query.search || undefined,
        limit: parseInt(req.query.limit) || 50,
        page: parseInt(req.query.page) || 1,
      };
      if (this._isPortfolioSalesUser(req)) {
        filters.portfolioOwnerId = req.user.id;
      }
      const result = await clientService.getAllClients(filters);
      sendSuccess(res, result, 'Clients retrieved');
    } catch (err) {
      logger.error('Get clients error', err);
      sendError(res, err.message, 500);
    }
  }

  async getClientById(req, res) {
    try {
      const client = await clientService.getClientById(req.params.id);
      if (!client) return sendError(res, 'Client not found', 404);
      if (this._denyPortfolioClient(req, client)) {
        return sendError(res, 'Unauthorized', 403);
      }
      if (!COMMERCIAL_ROLES.includes(req.user.role)) {
        delete client.commercials;
      }
      if (client.agreements) {
        client.agreements = redactClientAgreements(client.agreements, req.user.role);
      }
      sendSuccess(res, client, 'Client retrieved');
    } catch (err) {
      logger.error('Get client error', err);
      sendError(res, err.message, 500);
    }
  }

  async updateClient(req, res) {
    try {
      const client = await clientService.getClientById(req.params.id);
      if (!client) return sendError(res, 'Client not found', 404);
      if (this._denyPortfolioClient(req, client)) {
        return sendError(res, 'Unauthorized', 403);
      }
      const updated = await clientService.updateClient(req.params.id, req.body);
      sendSuccess(res, updated, 'Client updated');
    } catch (err) {
      logger.error('Update client error', err);
      sendError(res, err.message, 500);
    }
  }

  async deleteClient(req, res) {
    try {
      if (req.user.role !== 'ADMIN') return sendError(res, 'Unauthorized', 403);
      await clientService.deleteClient(req.params.id);
      sendSuccess(res, { success: true }, 'Client deleted');
    } catch (err) {
      logger.error('Delete client error', err);
      sendError(res, err.message, 500);
    }
  }

  async getClientOptions(req, res) {
    try {
      const options = await clientService.getClientOptions();
      sendSuccess(res, options, 'Client options retrieved');
    } catch (err) {
      logger.error('Get client options error', err);
      sendError(res, err.message, 500);
    }
  }

  /** GET /api/clients/submission-field-reference  merge tokens + Excel keys for UI */
  async getSubmissionFieldReference(req, res) {
    try {
      const excelFields = Object.entries(submissionMergeService.EXCEL_FIELD_META).map(([key, v]) => ({
        key,
        label: v.label,
      }));
      sendSuccess(
        res,
        {
          mergeTokens: submissionMergeService.MERGE_TOKENS,
          excelFields,
          defaultExcelKeys: submissionMergeService.DEFAULT_EXCEL_KEYS,
        },
        'Submission field reference'
      );
    } catch (err) {
      logger.error('Submission field reference error', err);
      sendError(res, err.message, 500);
    }
  }

  /**
   * POST /api/clients/:id/preview-submission
   * Build merged email + Excel row from client template (bridges recruitment data ? client pack).
   */
  async previewClientSubmission(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, 'Validation failed', 400, errors.array());
      }
      const { id: clientId } = req.params;
      const { jobId, candidateId } = req.body || {};
      if (!jobId || !candidateId) {
        return sendError(res, 'jobId and candidateId are required', 400);
      }
      const [client, job, candidate] = await Promise.all([
        prisma.client.findUnique({ where: { id: clientId } }),
        prisma.job.findUnique({ where: { id: jobId } }),
        prisma.candidate.findUnique({ where: { id: candidateId } }),
      ]);
      if (!client || !job || !candidate) {
        return sendError(res, 'Client, job, or candidate not found', 404);
      }
      if (req.user.role === 'SALES_EXEC' || req.user.role === 'SALES_EXECUTIVE') {
        if (client.ownerId !== req.user.id) {
          return sendError(res, 'Unauthorized', 403);
        }
      }
      if (job.clientId && job.clientId !== clientId) {
        return sendError(res, 'This requirement is linked to a different client', 400);
      }
      const tmpl = submissionMergeService.parseSubmissionFormat(client.submissionFormat);
      const mergeMap = submissionMergeService.buildMergeMap({ client, job, candidate });
      const subject = submissionMergeService.applyMergeTemplate(tmpl.emailSubject, mergeMap);
      const body = submissionMergeService.applyMergeTemplate(tmpl.emailBody, mergeMap);
      const excelRow = submissionMergeService.buildExcelPreviewRow(candidate, tmpl.excelFieldKeys);
      sendSuccess(
        res,
        {
          subject,
          body,
          excelRow,
          excelFieldOrder: tmpl.excelFieldKeys,
        },
        'Submission preview'
      );
    } catch (err) {
      logger.error('Preview client submission error', err);
      sendError(res, err.message, 500);
    }
  }

  // --- Contacts --------------------------------------------------------------

  async getContacts(req, res) {
    try {
      const contacts = await clientService.getContacts(req.params.id);
      sendSuccess(res, contacts, 'Contacts retrieved');
    } catch (err) {
      logger.error('Get contacts error', err);
      sendError(res, err.message, 500);
    }
  }

  async createContact(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return sendError(res, 'Validation failed', 400, errors.array());
      const contact = await clientService.createContact(req.params.id, req.body, req.user.id);
      sendSuccess(res, contact, 'Contact created', 201);
    } catch (err) {
      logger.error('Create contact error', err);
      sendError(res, err.message, 500);
    }
  }

  async updateContact(req, res) {
    try {
      const contact = await clientService.updateContact(req.params.contactId, req.body);
      sendSuccess(res, contact, 'Contact updated');
    } catch (err) {
      logger.error('Update contact error', err);
      sendError(res, err.message, 500);
    }
  }

  async deleteContact(req, res) {
    try {
      await clientService.deleteContact(req.params.contactId);
      sendSuccess(res, { success: true }, 'Contact deleted');
    } catch (err) {
      logger.error('Delete contact error', err);
      sendError(res, err.message, 500);
    }
  }

  // --- Documents -------------------------------------------------------------

  async getDocuments(req, res) {
    try {
      const client = await clientService.getClientById(req.params.id);
      if (!client) return sendError(res, 'Client not found', 404);
      if (this._denyPortfolioClient(req, client)) {
        return sendError(res, 'Unauthorized', 403);
      }
      const docs = await clientService.getDocuments(req.params.id);
      sendSuccess(res, docs, 'Documents retrieved');
    } catch (err) {
      logger.error('Get documents error', err);
      sendError(res, err.message, 500);
    }
  }

  async createDocument(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return sendError(res, 'Validation failed', 400, errors.array());
      const client = await clientService.getClientById(req.params.id);
      if (!client) return sendError(res, 'Client not found', 404);
      if (this._denyPortfolioClient(req, client)) {
        return sendError(res, 'Unauthorized', 403);
      }
      const doc = await clientService.createDocument(req.params.id, req.body, req.user.id);
      sendSuccess(res, doc, 'Document created', 201);
    } catch (err) {
      logger.error('Create document error', err);
      sendError(res, err.message, 500);
    }
  }

  async uploadClientDocuments(req, res) {
    try {
      const files = req.files;
      if (!files || files.length === 0) {
        return sendError(res, 'No files uploaded', 400);
      }
      const client = await clientService.getClientById(req.params.id);
      if (!client) return sendError(res, 'Client not found', 404);
      if (this._denyPortfolioClient(req, client)) {
        return sendError(res, 'Unauthorized', 403);
      }

      const path = require('path');
      const config = require('../config/environment');
      const uploadsRoot = path.resolve(config.UPLOAD_DIR);

      const documentType = (req.body && req.body.documentType) || 'OTHER';
      const docs = [];

      for (const f of files) {
        const rel = path.relative(uploadsRoot, f.path).split(path.sep).join('/');
        const fileUrl = `/uploads/${rel}`;
        const doc = await clientService.createDocument(
          req.params.id,
          {
            documentType,
            title: (req.body && req.body.title) || f.originalname,
            fileUrl,
            fileName: f.originalname,
            fileSize: f.size,
            notes: (req.body && req.body.notes) || null,
          },
          req.user.id
        );
        docs.push(doc);
      }

      sendSuccess(res, { documents: docs }, 'Documents uploaded', 201);
    } catch (err) {
      logger.error('Upload client documents error', err);
      sendError(res, err.message, 500);
    }
  }

  async deleteDocument(req, res) {
    try {
      const client = await clientService.getClientById(req.params.id);
      if (!client) return sendError(res, 'Client not found', 404);
      if (this._denyPortfolioClient(req, client)) {
        return sendError(res, 'Unauthorized', 403);
      }
      await clientService.deleteDocument(req.params.id, req.params.docId);
      sendSuccess(res, { success: true }, 'Document deleted');
    } catch (err) {
      logger.error('Delete document error', err);
      sendError(res, err.message, 500);
    }
  }

  // --- Commercials -----------------------------------------------------------

  async getCommercials(req, res) {
    try {
      if (!COMMERCIAL_ROLES.includes(req.user.role)) return sendError(res, 'Unauthorized', 403);
      const commercials = await clientService.getCommercials(req.params.id);
      sendSuccess(res, commercials, 'Commercials retrieved');
    } catch (err) {
      logger.error('Get commercials error', err);
      sendError(res, err.message, 500);
    }
  }

  async upsertCommercial(req, res) {
    try {
      if (!COMMERCIAL_ROLES.includes(req.user.role)) return sendError(res, 'Unauthorized', 403);
      const commercial = await clientService.upsertCommercial(req.params.id, req.body);
      sendSuccess(res, commercial, 'Commercial saved');
    } catch (err) {
      logger.error('Upsert commercial error', err);
      sendError(res, err.message, 500);
    }
  }
}

module.exports = new ClientController();
