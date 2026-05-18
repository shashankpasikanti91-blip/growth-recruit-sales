/**
 * Screening Service — Phase 4: Persistent sessions + Phase 5: Application mapping
 */
const prisma = require('../config/database');
const aiService = require('./ai/openaiService');
const logger = require('../utils/logger');
const config = require('../config/environment');

const VALID_RECS = ['STRONG_MATCH', 'GOOD_MATCH', 'MODERATE_MATCH', 'WEAK_MATCH', 'NOT_SUITABLE'];

function safeRec(score, raw) {
  const cleaned = (raw || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (VALID_RECS.includes(cleaned)) return cleaned;
  if (score >= 80) return 'STRONG_MATCH';
  if (score >= 65) return 'GOOD_MATCH';
  if (score >= 50) return 'MODERATE_MATCH';
  if (score >= 30) return 'WEAK_MATCH';
  return 'NOT_SUITABLE';
}

function gapStr(result) {
  if (typeof result.weaknesses === 'string') return result.weaknesses;
  if (Array.isArray(result.weaknesses)) return result.weaknesses.join('; ');
  return null;
}

async function upsertApp(candidateId, jobId, userId, clientId, status, screeningId, aiScore) {
  const existing = await prisma.application.findUnique({ where: { candidateId_jobId: { candidateId, jobId } } });
  if (existing) {
    return prisma.application.update({
      where: { id: existing.id },
      data: { status, aiMatchScore: aiScore, screeningId, ...(clientId && { clientId }), updatedAt: new Date() },
    });
  }
  return prisma.application.create({
    data: { candidateId, jobId, clientId: clientId || null, status, aiMatchScore: aiScore, screeningId, userId },
  });
}

async function updateCandidateLatest(candidateId, jobId, jobTitle, clientId, clientName, score) {
  try {
    await prisma.candidate.update({
      where: { id: candidateId },
      data: { latestScreenedJobId: jobId, latestScreenedJobTitle: jobTitle, latestClientId: clientId || null, latestClientName: clientName || null, latestAiScore: score },
    });
  } catch (e) { logger.warn(`Failed to update candidate latest: ${e.message}`); }
}

class ScreeningService {
  /**
   * Screen single candidate against single job — Phase 4 persistent sessions
   */
  async screenSingleCandidate(candidateId, jobId, userId, forceRerun = false) {
    try {
      const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
      if (!candidate || !candidate.resumeText) throw new Error('Candidate or resume not found');

      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: { client: { select: { id: true, clientName: true } } },
      });
      if (!job) throw new Error('Job not found');

      const clientId = job.clientId || null;
      const clientName = job.client?.clientName || job.clientName || null;

      // Return saved result unless forced rerun
      if (!forceRerun) {
        const existing = await prisma.screening.findFirst({
          where: { candidateId, jobId },
          include: {
            candidate: { select: { id: true, firstName: true, lastName: true, email: true, currentRole: true } },
            job: { select: { id: true, title: true, clientName: true, clientId: true } },
            session: { select: { id: true, screeningType: true, createdAt: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
        if (existing) return { ...existing, fromCache: true };
      }

      // Create a session for this screening
      const session = await prisma.screeningSession.create({
        data: { screeningType: 'single', jobId, clientId, status: 'RUNNING', totalCandidates: 1, createdById: userId },
      });

      try {
        const scoringResult = await aiService.scoreCandidate(candidate.resumeText, job.description, job.requiredSkills);
        const score = Number(scoringResult.score ?? scoringResult.finalScore ?? 0);
        const recommendation = safeRec(score, scoringResult.recommendation);
        const appStatus = score >= 70 ? 'SHORTLISTED' : score >= 55 ? 'SCREENED' : 'REJECTED';
        const matchedSkills = scoringResult.matchedSkills || scoringResult.jdMatchAnalysis?.keyMatchedSkills || [];
        const missingSkills = [...(Array.isArray(scoringResult.missingSkills) ? scoringResult.missingSkills : []), ...(Array.isArray(scoringResult.jdMatchAnalysis?.missingSkills) ? scoringResult.jdMatchAnalysis.missingSkills : [])];
        const redFlags = Array.isArray(scoringResult.redFlags) ? scoringResult.redFlags : [];
        const skillMatchPct = scoringResult.jdMatchAnalysis?.matchPercent ? parseInt(scoringResult.jdMatchAnalysis.matchPercent) || null : null;

        const screening = await prisma.screening.create({
          data: {
            candidateId, jobId, clientId, sessionId: session.id,
            score, reasoning: scoringResult.reasoning || scoringResult.summary || '',
            extractedSkills: matchedSkills, matchedSkills, missingSkills,
            gap: gapStr(scoringResult), recommendation, aiSummary: scoringResult.summary || null,
            redFlags, skillMatchPct, modelUsed: config.OPENROUTER_MODEL, fullResult: scoringResult, userId,
          },
        });

        const app = await upsertApp(candidateId, jobId, userId, clientId, appStatus, screening.id, score);
        await updateCandidateLatest(candidateId, jobId, job.title, clientId, clientName, score);
        await prisma.screeningSession.update({ where: { id: session.id }, data: { status: 'COMPLETED', completedCount: 1 } });

        logger.info(`✓ Screened ${candidate.firstName}: ${score}/100 for ${job.title}`);
        return {
          ...screening, fromCache: false, application: app,
          candidate: { id: candidate.id, firstName: candidate.firstName, lastName: candidate.lastName, email: candidate.email, currentRole: candidate.currentRole },
          job: { id: job.id, title: job.title, clientName, clientId },
          session: { id: session.id },
        };
      } catch (err) {
        await prisma.screeningSession.update({ where: { id: session.id }, data: { status: 'FAILED', failedCount: 1 } });
        throw err;
      }
    } catch (error) {
      logger.error('Single screening error', error);
      throw error;
    }
  }

  /**
   * Bulk screen multiple candidates for one job OR one candidate for multiple jobs — Phase 4
   */
  async bulkScreen(jobIds = [], candidateIds = [], userId, forceRerun = false) {
    try {
      const results = [];
      const errors = [];

      // Scenario 1: Multiple candidates for one job
      if (jobIds.length === 1 && candidateIds.length > 0) {
        const jobId = jobIds[0];
        const job = await prisma.job.findUnique({
          where: { id: jobId },
          include: { client: { select: { id: true, clientName: true } } },
        });
        if (!job) throw new Error('Job not found');

        const clientId = job.clientId || null;
        const clientName = job.client?.clientName || job.clientName || null;
        const candidates = await prisma.candidate.findMany({ where: { id: { in: candidateIds } } });

        const session = await prisma.screeningSession.create({
          data: { screeningType: 'bulk', jobId, clientId, status: 'RUNNING', totalCandidates: candidateIds.length, createdById: userId },
        });

        let completedCount = 0, failedCount = 0;

        for (const candidate of candidates) {
          try {
            if (!candidate.resumeText) { errors.push({ candidateId: candidate.id, error: 'No resume text' }); failedCount++; continue; }

            if (!forceRerun) {
              const existing = await prisma.screening.findFirst({ where: { candidateId: candidate.id, jobId } });
              if (existing) {
                results.push({ ...existing, isNew: false, candidate: { id: candidate.id, firstName: candidate.firstName, lastName: candidate.lastName, email: candidate.email } });
                completedCount++;
                continue;
              }
            }

            const scoringResult = await aiService.scoreCandidate(candidate.resumeText, job.description, job.requiredSkills);
            const score = Number(scoringResult.score ?? scoringResult.finalScore ?? 0);
            const recommendation = safeRec(score, scoringResult.recommendation);
            const appStatus = score >= 70 ? 'SHORTLISTED' : score >= 40 ? 'SCREENED' : 'REJECTED';
            const matchedSkills = scoringResult.matchedSkills || [];
            const missingSkills = [...(Array.isArray(scoringResult.missingSkills) ? scoringResult.missingSkills : []), ...(Array.isArray(scoringResult.jdMatchAnalysis?.missingSkills) ? scoringResult.jdMatchAnalysis.missingSkills : [])];

            const screening = await prisma.screening.create({
              data: {
                candidateId: candidate.id, jobId, clientId, sessionId: session.id,
                score, reasoning: scoringResult.reasoning || '', extractedSkills: matchedSkills,
                matchedSkills, missingSkills, gap: gapStr(scoringResult), recommendation,
                aiSummary: scoringResult.summary || null, redFlags: scoringResult.redFlags || [],
                modelUsed: config.OPENROUTER_MODEL, fullResult: scoringResult, userId,
              },
            });

            await upsertApp(candidate.id, jobId, userId, clientId, appStatus, screening.id, score);
            await updateCandidateLatest(candidate.id, jobId, job.title, clientId, clientName, score);

            results.push({ ...screening, isNew: true, candidate: { id: candidate.id, firstName: candidate.firstName, lastName: candidate.lastName, email: candidate.email } });
            completedCount++;
            logger.info(`✓ Bulk: ${candidate.firstName}: ${score}/100`);
          } catch (err) {
            errors.push({ candidateId: candidate.id, error: err.message });
            failedCount++;
          }
        }

        await prisma.screeningSession.update({ where: { id: session.id }, data: { status: 'COMPLETED', completedCount, failedCount } });

        return {
          type: 'CANDIDATES_FOR_JOB', sessionId: session.id,
          job: { id: job.id, title: job.title, clientName, clientId },
          totalCandidates: candidateIds.length, screened: results.length, skipped: errors.length,
          results: results.sort((a, b) => b.score - a.score), errors,
        };
      }

      // Scenario 2: One candidate for multiple jobs
      if (candidateIds.length === 1 && jobIds.length > 0) {
        const candidateId = candidateIds[0];
        const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
        if (!candidate || !candidate.resumeText) throw new Error('Candidate or resume not found');

        const jobs = await prisma.job.findMany({ where: { id: { in: jobIds } }, include: { client: { select: { id: true, clientName: true } } } });
        const session = await prisma.screeningSession.create({
          data: { screeningType: 'bulk', status: 'RUNNING', totalCandidates: jobIds.length, createdById: userId },
        });

        let completedCount = 0, failedCount = 0;

        for (const job of jobs) {
          try {
            const clientId = job.clientId || null;
            const clientName = job.client?.clientName || job.clientName || null;

            if (!forceRerun) {
              const existing = await prisma.screening.findFirst({ where: { candidateId, jobId: job.id } });
              if (existing) { results.push({ ...existing, isNew: false, job: { id: job.id, title: job.title } }); completedCount++; continue; }
            }

            const scoringResult = await aiService.scoreCandidate(candidate.resumeText, job.description, job.requiredSkills);
            const score = Number(scoringResult.score ?? scoringResult.finalScore ?? 0);
            const recommendation = safeRec(score, scoringResult.recommendation);
            const appStatus = score >= 70 ? 'SHORTLISTED' : score >= 40 ? 'SCREENED' : 'REJECTED';
            const matchedSkills = scoringResult.matchedSkills || [];
            const missingSkills = [...(Array.isArray(scoringResult.missingSkills) ? scoringResult.missingSkills : []), ...(Array.isArray(scoringResult.jdMatchAnalysis?.missingSkills) ? scoringResult.jdMatchAnalysis.missingSkills : [])];

            const screening = await prisma.screening.create({
              data: {
                candidateId, jobId: job.id, clientId, sessionId: session.id,
                score, reasoning: scoringResult.reasoning || '', extractedSkills: matchedSkills,
                matchedSkills, missingSkills, gap: gapStr(scoringResult), recommendation,
                aiSummary: scoringResult.summary || null, modelUsed: config.OPENROUTER_MODEL, fullResult: scoringResult, userId,
              },
            });

            await upsertApp(candidateId, job.id, userId, clientId, appStatus, screening.id, score);
            await updateCandidateLatest(candidateId, job.id, job.title, clientId, clientName, score);

            results.push({ ...screening, isNew: true, job: { id: job.id, title: job.title, clientName, clientId } });
            completedCount++;
          } catch (err) {
            errors.push({ jobId: job.id, error: err.message });
            failedCount++;
          }
        }

        await prisma.screeningSession.update({ where: { id: session.id }, data: { status: 'COMPLETED', completedCount, failedCount } });

        return {
          type: 'JOBS_FOR_CANDIDATE', sessionId: session.id,
          candidate: { id: candidate.id, firstName: candidate.firstName, lastName: candidate.lastName, email: candidate.email },
          totalJobs: jobIds.length, screened: results.length, skipped: errors.length,
          results: results.sort((a, b) => b.score - a.score), errors,
        };
      }

      throw new Error('Invalid: provide either (1 job + N candidates) or (1 candidate + N jobs)');
    } catch (error) {
      logger.error('Bulk screening error', error);
      throw error;
    }
  }

  /**
   * Get all screening sessions for a user (Phase 4 history)
   */
  async getScreeningSessions(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [sessions, total] = await Promise.all([
      prisma.screeningSession.findMany({
        where: { createdById: userId },
        include: {
          screenings: {
            select: { score: true, recommendation: true, candidate: { select: { firstName: true, lastName: true } } },
            orderBy: { score: 'desc' },
            take: 5,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.screeningSession.count({ where: { createdById: userId } }),
    ]);
    return { sessions, total, page, limit };
  }

  /**
   * Get latest session results — load from DB, never rerun (Phase 4)
   */
  async getLatestSessionResults(userId) {
    const latestSession = await prisma.screeningSession.findFirst({
      where: { createdById: userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!latestSession) return { session: null, results: [] };

    const results = await prisma.screening.findMany({
      where: { sessionId: latestSession.id },
      include: {
        candidate: { select: { id: true, displayId: true, firstName: true, lastName: true, email: true, currentRole: true, resumeUrl: true } },
        job: { select: { id: true, displayId: true, title: true, clientName: true, clientId: true } },
        client: { select: { id: true, clientName: true } },
      },
      orderBy: { score: 'desc' },
    });

    return { session: latestSession, results };
  }

  /**
   * Get session results by session ID
   */
  async getSessionResults(sessionId, userId) {
    const session = await prisma.screeningSession.findFirst({
      where: { id: sessionId, createdById: userId },
    });
    if (!session) throw new Error('Session not found or unauthorized');

    const results = await prisma.screening.findMany({
      where: { sessionId },
      include: {
        candidate: { select: { id: true, displayId: true, firstName: true, lastName: true, email: true, currentRole: true, resumeUrl: true } },
        job: { select: { id: true, displayId: true, title: true, clientName: true } },
        client: { select: { id: true, clientName: true } },
      },
      orderBy: { score: 'desc' },
    });

    return { session, results };
  }

  /**
   * Get screening results for a job
   */
  async getJobScreenings(jobId, page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;
      const [screenings, total] = await Promise.all([
        prisma.screening.findMany({
          where: { jobId },
          orderBy: { score: 'desc' },
          include: { candidate: { select: { id: true, firstName: true, lastName: true, email: true, currentRole: true } } },
          skip,
          take: limit,
        }),
        prisma.screening.count({ where: { jobId } }),
      ]);
      return { jobId, total, page, limit, results: screenings };
    } catch (error) {
      logger.error('Get job screenings error', error);
      throw error;
    }
  }

  /**
   * Get detailed screening analysis
   */
  async getScreeningDetails(candidateId, jobId) {
    try {
      const screening = await prisma.screening.findFirst({
        where: { candidateId, jobId },
        include: { candidate: true, job: true, client: true, session: true },
        orderBy: { createdAt: 'desc' },
      });
      if (!screening) throw new Error('Screening not found');
      return screening;
    } catch (error) {
      logger.error('Get screening details error', error);
      throw error;
    }
  }
}

module.exports = new ScreeningService();

