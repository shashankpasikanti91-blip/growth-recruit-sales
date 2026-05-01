/**
 * Client Controller — Phase 2
 */
const clientService = require('../services/clientService');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

const COMMERCIAL_ROLES = ['ADMIN', 'SALES_MANAGER', 'SALES_EXEC', 'FINANCE'];

class ClientController {
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
      if (!COMMERCIAL_ROLES.includes(req.user.role)) {
        delete client.commercials;
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
      const doc = await clientService.createDocument(req.params.id, req.body, req.user.id);
      sendSuccess(res, doc, 'Document created', 201);
    } catch (err) {
      logger.error('Create document error', err);
      sendError(res, err.message, 500);
    }
  }

  async deleteDocument(req, res) {
    try {
      await clientService.deleteDocument(req.params.docId);
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
