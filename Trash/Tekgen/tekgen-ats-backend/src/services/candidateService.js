const prisma = require('../config/database');
const logger = require('../utils/logger');
const { generateCandidateId } = require('../utils/idGenerator');

class CandidateService {
  /**
   * Create or update candidate (respects manuallyOverridden flag)
   */
  async upsertCandidate(candidateData, userId) {
    try {
      const displayId = await generateCandidateId();

      // Common parsed fields to update
      const updateData = {
        firstName: candidateData.firstName,
        lastName: candidateData.lastName,
        phone: candidateData.phone,
        location: candidateData.location,
        currentRole: candidateData.currentRole || undefined,
        currentCompany: candidateData.currentCompany || undefined,
        experience: candidateData.experience,
        skills: candidateData.skills,
        education: candidateData.education,
        resumeUrl: candidateData.resumeUrl,
        resumeText: candidateData.resumeText,
        resumeHash: candidateData.resumeHash || undefined,
        linkedinUrl: candidateData.linkedinUrl,
        portfolio: candidateData.portfolio,
        sourceChannel: candidateData.sourceChannel || undefined,
        parserConfidence: candidateData.parserConfidence || undefined,
        parsingStatus: candidateData.parsingStatus || undefined,
        parsedAt: candidateData.parsedAt || undefined,
        // Identity fields — only update if not null (preserve existing)
        nationality: candidateData.nationality || undefined,
        icNumber: candidateData.icNumber || undefined,
        passportNumber: candidateData.passportNumber || undefined,
        dob: candidateData.dob || undefined,
        gender: candidateData.gender || undefined,
        maritalStatus: candidateData.maritalStatus || undefined,
      };

      const candidate = await prisma.candidate.upsert({
        where: { email: candidateData.email },
        update: updateData,
        create: {
          displayId,
          firstName: candidateData.firstName,
          lastName: candidateData.lastName,
          email: candidateData.email,
          phone: candidateData.phone || null,
          location: candidateData.location || null,
          currentRole: candidateData.currentRole || null,
          currentCompany: candidateData.currentCompany || null,
          experience: candidateData.experience || 0,
          skills: candidateData.skills || [],
          education: candidateData.education || null,
          resumeUrl: candidateData.resumeUrl || null,
          resumeText: candidateData.resumeText || null,
          resumeHash: candidateData.resumeHash || null,
          linkedinUrl: candidateData.linkedinUrl || null,
          portfolio: candidateData.portfolio || null,
          sourceChannel: candidateData.sourceChannel || null,
          parserConfidence: candidateData.parserConfidence || null,
          parsingStatus: candidateData.parsingStatus || 'COMPLETE',
          parsedAt: candidateData.parsedAt || null,
          nationality: candidateData.nationality || null,
          icNumber: candidateData.icNumber || null,
          passportNumber: candidateData.passportNumber || null,
          dob: candidateData.dob || null,
          gender: candidateData.gender || null,
          maritalStatus: candidateData.maritalStatus || null,
          userId,
        },
      });

      logger.info(`Candidate upserted: ${candidate.id}`);
      return candidate;
    } catch (error) {
      logger.error('Upsert candidate error', error);
      throw error;
    }
  }

  /**
   * Find a candidate by SHA-256 resume hash (exact same file uploaded before)
   */
  async findByResumeHash(resumeHash) {
    if (!resumeHash) return null;
    return prisma.candidate.findFirst({
      where: { resumeHash },
      select: {
        id: true, displayId: true, firstName: true, lastName: true,
        email: true, status: true, resumeUrl: true, icNumber: true,
        passportNumber: true, nationality: true, updatedAt: true,
      },
    });
  }

  /**
   * Find a candidate by email (for duplicate detection)
   */
  async findByEmail(email) {
    return prisma.candidate.findUnique({
      where: { email },
      select: {
        id: true, displayId: true, firstName: true, lastName: true,
        email: true, status: true, resumeUrl: true, icNumber: true,
        passportNumber: true, nationality: true, updatedAt: true,
      },
    });
  }

  /**
   * Find a candidate by IC number or passport number (primary duplicate signals)
   */
  async findByIcOrPassport(icNumber, passportNumber) {
    if (!icNumber && !passportNumber) return null;
    const orClauses = [];
    if (icNumber) orClauses.push({ icNumber });
    if (passportNumber) orClauses.push({ passportNumber });
    return prisma.candidate.findFirst({
      where: { OR: orClauses },
      select: {
        id: true, displayId: true, firstName: true, lastName: true,
        email: true, status: true, resumeUrl: true, icNumber: true,
        passportNumber: true, nationality: true, updatedAt: true,
      },
    });
  }

  /**
   * Get candidates by user
   */
  async getCandidatesByUser(userId, filters = {}) {
    try {
      const where = {};

      // Recruiters only see their own candidates; Admins see all
      if (filters.ownerId) {
        where.userId = filters.ownerId;
      }

      // Trash filter: default = exclude trash; trash=true = only trash
      if (filters.trash === 'true' || filters.trash === true) {
        where.isTrashed = true;
      } else {
        where.isTrashed = false;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.contractType) {
        where.applications = {
          some: { job: { contractType: filters.contractType } },
        };
      }

      if (filters.search) {
        const s = filters.search.trim();
        where.OR = [
          { firstName:   { contains: s, mode: 'insensitive' } },
          { lastName:    { contains: s, mode: 'insensitive' } },
          { email:       { contains: s, mode: 'insensitive' } },
          { currentRole: { contains: s, mode: 'insensitive' } },
          { location:    { contains: s, mode: 'insensitive' } },
          // Skills is String[] in Postgres; search each element
          { skills: { has: s } },
          // Also partial match in resumeText
          { resumeText:  { contains: s, mode: 'insensitive' } },
        ];
      }

      const limit = filters.limit || 50;
      const skip = ((filters.page || 1) - 1) * limit;

      const [candidates, total] = await Promise.all([
        prisma.candidate.findMany({
          where,
          include: {
            _count: {
              select: { applications: true, screenings: true },
            },
            screenings: {
              select: { score: true, recommendation: true, screenedAt: true, job: { select: { title: true, clientName: true } } },
              orderBy: { score: 'desc' },
              take: 1,
            },
            applications: {
              select: { status: true, job: { select: { title: true, clientName: true, contractType: true } } },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip,
        }),
        prisma.candidate.count({ where }),
      ]);

      return { candidates, total };
    } catch (error) {
      logger.error('Get candidates error', error);
      throw error;
    }
  }

  /**
   * Get candidate by ID
   */
  async getCandidateById(candidateId) {
    try {
      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
        include: {
          applications: {
            include: {
              job: true,
            },
          },
          screenings: {
            include: {
              job: true,
            },
            orderBy: { screenedAt: 'desc' },
          },
        },
      });

      return candidate;
    } catch (error) {
      logger.error('Get candidate by ID error', error);
      throw error;
    }
  }

  /**
   * Update candidate
   */
  async updateCandidate(candidateId, updateData) {
    try {
      const candidate = await prisma.candidate.update({
        where: { id: candidateId },
        data: updateData,
      });

      logger.info(`Candidate updated: ${candidateId}`);
      return candidate;
    } catch (error) {
      logger.error('Update candidate error', error);
      throw error;
    }
  }

  /**
   * Change candidate status
   */
  async updateCandidateStatus(candidateId, status) {
    try {
      const candidate = await prisma.candidate.update({
        where: { id: candidateId },
        data: { status },
      });

      logger.info(`Candidate status updated: ${candidateId} -> ${status}`);
      return candidate;
    } catch (error) {
      logger.error('Update candidate status error', error);
      throw error;
    }
  }

  /**
   * Delete candidate
   */
  async deleteCandidate(candidateId) {
    try {
      await prisma.screening.deleteMany({
        where: { candidateId },
      });

      await prisma.application.deleteMany({
        where: { candidateId },
      });

      await prisma.candidate.delete({
        where: { id: candidateId },
      });

      logger.info(`Candidate deleted: ${candidateId}`);
      return { success: true };
    } catch (error) {
      logger.error('Delete candidate error', error);
      throw error;
    }
  }
}

module.exports = new CandidateService();
