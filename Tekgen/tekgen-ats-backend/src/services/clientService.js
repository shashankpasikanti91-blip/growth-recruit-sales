/**
 * Client Service — Phase 2
 * CRUD for Client entity + linking to jobs/applications/screenings
 * Phase 2.1: Full client master with contacts, documents, commercials
 */
const prisma = require('../config/database');
const logger = require('../utils/logger');
const { randomUUID } = require('crypto');

class ClientService {
  /** Generate a unique client display ID */
  async _generateDisplayId(prefix = 'CLT') {
    const count = await prisma.$queryRaw`SELECT COUNT(*) as c FROM "clients"`;
    const n = Number(count[0]?.c || 0) + 1;
    return `${prefix}-${String(n).padStart(4, '0')}`;
  }

  async _generateContactDisplayId() {
    const count = await prisma.$queryRaw`SELECT COUNT(*) as c FROM "client_contacts"`;
    const n = Number(count[0]?.c || 0) + 1;
    return `CNT-${String(n).padStart(4, '0')}`;
  }

  async _generateDocDisplayId() {
    const count = await prisma.$queryRaw`SELECT COUNT(*) as c FROM "client_documents"`;
    const n = Number(count[0]?.c || 0) + 1;
    return `DOC-${String(n).padStart(4, '0')}`;
  }

  /** Create a new client */
  async createClient(data, userId) {
    const displayId = await this._generateDisplayId();
    const client = await prisma.client.create({
      data: {
        id: randomUUID(),
        displayId,
        clientName: data.clientName,
        businessUnit: data.businessUnit || null,
        website: data.website || null,
        industry: data.industry || null,
        country: data.country || null,
        state: data.state || null,
        city: data.city || null,
        address: data.address || null,
        primaryContact: data.primaryContact || null,
        primaryContactEmail: data.primaryContactEmail || null,
        primaryContactPhone: data.primaryContactPhone || null,
        billingContact: data.billingContact || null,
        clientOwner: data.clientOwner || null,
        recruitmentManager: data.recruitmentManager || null,
        defaultRecruiters: data.defaultRecruiters || [],
        paymentTerms: data.paymentTerms || null,
        submissionFormat: data.submissionFormat || null,
        requiredDocuments: data.requiredDocuments || null,
        status: data.status || 'ACTIVE',
        notes: data.notes || null,
        ownerId: userId,
      },
    });
    logger.info(`Client created: ${client.id} - ${client.clientName}`);
    return client;
  }

  /** Get all clients (with job/application counts) */
  async getAllClients(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.portfolioOwnerId) {
      where.ownerId = filters.portfolioOwnerId;
    }
    if (filters.search) {
      where.OR = [
        { clientName: { contains: filters.search, mode: 'insensitive' } },
        { industry: { contains: filters.search, mode: 'insensitive' } },
        { country: { contains: filters.search, mode: 'insensitive' } },
        { city: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const limit = filters.limit || 50;
    const skip = ((filters.page || 1) - 1) * limit;

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          _count: { select: { jobs: true, submissions: true, contacts: true } },
          owner: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.client.count({ where }),
    ]);

    return { clients, total };
  }

  /** Get client by ID with full details for Client 360 */
  async getClientById(id) {
    return prisma.client.findUnique({
      where: { id },
      include: {
        _count: { select: { jobs: true, submissions: true, contacts: true } },
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        contacts: { orderBy: { createdAt: 'desc' } },
        documents: { orderBy: { createdAt: 'desc' } },
        commercials: { orderBy: { createdAt: 'desc' } },
        agreements: { orderBy: { createdAt: 'desc' } },
        jobs: {
          select: {
            id: true, displayId: true, title: true, status: true, contractType: true,
            location: true, priority: true, headcount: true, createdAt: true,
            targetSubmissionDate: true,
            _count: { select: { submissions: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        submissions: {
          include: {
            candidate: { select: { id: true, displayId: true, firstName: true, lastName: true, email: true } },
            job: { select: { id: true, displayId: true, title: true } },
            recruiter: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
  }

  /** Update client */
  async updateClient(id, data) {
    const updated = await prisma.client.update({
      where: { id },
      data: {
        ...(data.clientName !== undefined && { clientName: data.clientName }),
        ...(data.businessUnit !== undefined && { businessUnit: data.businessUnit }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.industry !== undefined && { industry: data.industry }),
        ...(data.country !== undefined && { country: data.country }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.primaryContact !== undefined && { primaryContact: data.primaryContact }),
        ...(data.primaryContactEmail !== undefined && { primaryContactEmail: data.primaryContactEmail }),
        ...(data.primaryContactPhone !== undefined && { primaryContactPhone: data.primaryContactPhone }),
        ...(data.billingContact !== undefined && { billingContact: data.billingContact }),
        ...(data.clientOwner !== undefined && { clientOwner: data.clientOwner }),
        ...(data.recruitmentManager !== undefined && { recruitmentManager: data.recruitmentManager }),
        ...(data.defaultRecruiters !== undefined && { defaultRecruiters: data.defaultRecruiters }),
        ...(data.paymentTerms !== undefined && { paymentTerms: data.paymentTerms }),
        ...(data.submissionFormat !== undefined && { submissionFormat: data.submissionFormat }),
        ...(data.requiredDocuments !== undefined && { requiredDocuments: data.requiredDocuments }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.ownerId !== undefined && { ownerId: data.ownerId }),
      },
    });
    return updated;
  }

  /** Delete client — only if no active jobs */
  async deleteClient(id) {
    const activeJobs = await prisma.job.count({ where: { clientId: id, status: 'OPEN' } });
    if (activeJobs > 0) {
      throw new Error('Cannot delete client with active job openings. Close all jobs first.');
    }
    await prisma.job.updateMany({ where: { clientId: id }, data: { clientId: null } });
    await prisma.client.delete({ where: { id } });
    return { success: true };
  }

  /** List clients as dropdown options */
  async getClientOptions() {
    return prisma.client.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, clientName: true, displayId: true, industry: true, country: true },
      orderBy: { clientName: 'asc' },
    });
  }

  // ─── Contacts ──────────────────────────────────────────────────────────────

  async getContacts(clientId) {
    return prisma.clientContact.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createContact(clientId, data, userId) {
    const displayId = await this._generateContactDisplayId();
    return prisma.clientContact.create({
      data: {
        displayId,
        clientId,
        contactName: data.contactName,
        designation: data.designation || null,
        department: data.department || null,
        email: data.email || null,
        phone: data.phone || null,
        linkedinUrl: data.linkedinUrl || null,
        contactType: data.contactType || 'OTHER',
        status: data.status || 'ACTIVE',
        notes: data.notes || null,
        createdById: userId,
      },
    });
  }

  async updateContact(contactId, data) {
    return prisma.clientContact.update({
      where: { id: contactId },
      data: {
        ...(data.contactName !== undefined && { contactName: data.contactName }),
        ...(data.designation !== undefined && { designation: data.designation }),
        ...(data.department !== undefined && { department: data.department }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.linkedinUrl !== undefined && { linkedinUrl: data.linkedinUrl }),
        ...(data.contactType !== undefined && { contactType: data.contactType }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
  }

  async deleteContact(contactId) {
    return prisma.clientContact.delete({ where: { id: contactId } });
  }

  // ─── Documents ─────────────────────────────────────────────────────────────

  async getDocuments(clientId) {
    return prisma.clientDocument.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDocument(clientId, data, userId) {
    const displayId = await this._generateDocDisplayId();
    return prisma.clientDocument.create({
      data: {
        displayId,
        clientId,
        documentType: data.documentType || 'OTHER',
        title: data.title,
        fileUrl: data.fileUrl || null,
        fileName: data.fileName || null,
        fileSize: data.fileSize || null,
        uploadedById: userId,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        notes: data.notes || null,
      },
    });
  }

  async deleteDocument(clientId, docId) {
    const existing = await prisma.clientDocument.findFirst({
      where: { id: docId, clientId },
    });
    if (!existing) {
      throw new Error('Document not found');
    }
    return prisma.clientDocument.delete({ where: { id: docId } });
  }

  // ─── Commercials ───────────────────────────────────────────────────────────

  async getCommercials(clientId) {
    return prisma.clientCommercial.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsertCommercial(clientId, data) {
    // If jobId provided, upsert per job; otherwise upsert default client commercial
    const existing = await prisma.clientCommercial.findFirst({
      where: { clientId, jobId: data.jobId || null },
    });
    if (existing) {
      return prisma.clientCommercial.update({
        where: { id: existing.id },
        data: {
          billRate: data.billRate ?? existing.billRate,
          payRate: data.payRate ?? existing.payRate,
          currency: data.currency ?? existing.currency,
          rateType: data.rateType ?? existing.rateType,
          markupType: data.markupType ?? existing.markupType,
          markupValue: data.markupValue ?? existing.markupValue,
          paymentTerms: data.paymentTerms ?? existing.paymentTerms,
          replacementPeriod: data.replacementPeriod ?? existing.replacementPeriod,
          notes: data.notes ?? existing.notes,
        },
      });
    }
    return prisma.clientCommercial.create({
      data: {
        clientId,
        jobId: data.jobId || null,
        billRate: data.billRate || null,
        payRate: data.payRate || null,
        currency: data.currency || 'MYR',
        rateType: data.rateType || 'MONTHLY',
        markupType: data.markupType || null,
        markupValue: data.markupValue || null,
        paymentTerms: data.paymentTerms || null,
        replacementPeriod: data.replacementPeriod || null,
        notes: data.notes || null,
      },
    });
  }
}

module.exports = new ClientService();
