/**
 * Sales Controller — Phase 2
 * Sales Dashboard, metrics, client profiles
 */
const salesService = require('../services/salesService');
const clientService = require('../services/clientService');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

function redactAgreementsForRole(agreements, role) {
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

class SalesController {
  /**
   * GET /api/sales/dashboard
   * Get sales dashboard KPIs
   */
  async getDashboard(req, res, next) {
    try {
      // Verify user has sales role
      const salesRoles = ['ADMIN', 'SUPER_ADMIN', 'SALES_MANAGER', 'SALES_EXEC', 'SALES_EXECUTIVE', 'RECRUITMENT_MANAGER', 'MANAGEMENT'];
      if (!salesRoles.includes(req.user.role)) {
        return sendError(res, 'Unauthorized — Sales module access required', 403);
      }

      const kpis = await salesService.getSalesDashboardKPIs(req.user.id, req.user.role);
      const pulse = await salesService.getSalesPulse(req.user.id, req.user.role);
      const topClients = await salesService.getTopClients(req.user.id, req.user.role, 5);
      const recentSubmissions = await salesService.getRecentSubmissions(req.user.id, req.user.role, 25);

      return sendSuccess(res, {
        kpis,
        pulse,
        topClients,
        recentSubmissions,
      });
    } catch (err) {
      logger.error('Dashboard error', err);
      next(err);
    }
  }

  /**
   * GET /api/sales/requisitions
   * Open client requirements (jobs) with application counts for CV pipeline tracking
   */
  async getRequisitions(req, res, next) {
    try {
      const salesRoles = [
        'ADMIN',
        'SUPER_ADMIN',
        'SALES_MANAGER',
        'SALES_EXEC',
        'SALES_EXECUTIVE',
        'RECRUITMENT_MANAGER',
        'MANAGEMENT',
      ];
      if (!salesRoles.includes(req.user.role)) {
        return sendError(res, 'Unauthorized — Sales module access required', 403);
      }

      const limit = Math.min(parseInt(req.query.limit, 10) || 80, 200);
      const requisitions = await salesService.getOpenRequisitions(limit);
      return sendSuccess(res, { requisitions }, 'Open client requirements', 200);
    } catch (err) {
      logger.error('Requisitions error', err);
      next(err);
    }
  }

  /**
   * GET /api/sales/clients
   * Get all clients (delegates to clientService)
   */
  async getClients(req, res, next) {
    try {
      const allowed = ['ADMIN', 'MANAGEMENT', 'SALES_MANAGER', 'SALES_EXEC', 'SALES_EXECUTIVE', 'RECRUITMENT_MANAGER', 'FINANCE', 'FINANCE_HEAD'];
      if (!allowed.includes(req.user.role)) {
        return sendError(res, 'Unauthorized', 403);
      }

      const filters = {
        status: req.query.status || undefined,
        search: req.query.search || undefined,
        limit: parseInt(req.query.limit) || 20,
        page: parseInt(req.query.page) || 1,
      };
      if (req.user.role === 'SALES_EXEC' || req.user.role === 'SALES_EXECUTIVE') {
        filters.portfolioOwnerId = req.user.id;
      }

      const result = await clientService.getAllClients(filters);
      return sendSuccess(res, result);
    } catch (err) {
      logger.error('Get clients error', err);
      next(err);
    }
  }

  /**
   * GET /api/sales/clients/:id
   * Get client full profile (Client 360)
   */
  async getClientProfile(req, res, next) {
    try {
      const allowed = ['ADMIN', 'MANAGEMENT', 'SALES_MANAGER', 'SALES_EXEC', 'SALES_EXECUTIVE', 'RECRUITMENT_MANAGER', 'FINANCE', 'FINANCE_HEAD'];
      if (!allowed.includes(req.user.role)) {
        return sendError(res, 'Unauthorized', 403);
      }

      const client = await salesService.getClientFullProfile(req.params.id);
      if (!client) {
        return sendError(res, 'Client not found', 404);
      }

      const portfolioExec = req.user.role === 'SALES_EXEC' || req.user.role === 'SALES_EXECUTIVE';
      if (portfolioExec && client.ownerId !== req.user.id) {
        return sendError(res, 'Unauthorized', 403);
      }

      const commercialVisible = [
        'ADMIN',
        'SALES_MANAGER',
        'SALES_EXEC',
        'SALES_EXECUTIVE',
        'FINANCE',
        'FINANCE_HEAD',
        'FINANCE_MANAGER',
        'CFO',
      ];
      if (!commercialVisible.includes(req.user.role)) {
        client.commercials = [];
      }
      if (client.agreements) {
        client.agreements = redactAgreementsForRole(client.agreements, req.user.role);
      }

      return sendSuccess(res, { client });
    } catch (err) {
      logger.error('Get client profile error', err);
      next(err);
    }
  }
}

module.exports = new SalesController();
