const prisma = require('../config/database');
const aiService = require('./ai/openaiService');
const logger = require('../utils/logger');

class AIScreeningService {
  /**
   * Perform batch AI screening for candidates against a job
   */
  async screenCandidatesForJob(jobId, candidateIds = null, userId) {
    try {
      // Get job details
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          screenings: {
            select: { candidateId: true },
          },
        },
      });

      if (!job) {
        throw new Error('Job not found');
      }

      // Get candidates to screen
      let candidates;
      if (candidateIds && candidateIds.length > 0) {
        candidates = await prisma.candidate.findMany({
          where: { id: { in: candidateIds } },
          include: {
            applications: {
              where: { jobId },
            },
          },
        });
      } else {
        candidates = await prisma.candidate.findMany({
          include: {
            applications: {
              where: { jobId },
            },
          },
        });
      }

      const screeningResults = [];

      // Screen each candidate
      for (const candidate of candidates) {
        if (!candidate.resumeText) {
          continue;
        }

        try {
          // Check if already screened
          const existingScreening = await prisma.screening.findFirst({
            where: {
              candidateId: candidate.id,
              jobId: jobId,
            },
          });

          if (existingScreening) {
            screeningResults.push({
              ...existingScreening,
              candidate: {
                id: candidate.id,
                firstName: candidate.firstName,
                lastName: candidate.lastName,
                email: candidate.email,
              },
              isNew: false,
            });
            continue;
          }

          // Score candidate using AI
          const scoringResult = await aiService.scoreCandidate(
            candidate.resumeText,
            job.description,
            job.requiredSkills
          );

          // Create screening record
          const screening = await prisma.screening.create({
            data: {
              candidateId: candidate.id,
              jobId: jobId,
              score: scoringResult.score,
              reasoning: scoringResult.reasoning,
              extractedSkills: scoringResult.matchedSkills || [],
              matchedSkills: scoringResult.matchedSkills || [],
              gap: typeof scoringResult.weaknesses === 'string' ? scoringResult.weaknesses : null,
              recommendation: scoringResult.recommendation,
              userId,
            },
          });

          // Create or update application
          let applicationStatus = 'SCREENED';
          if (scoringResult.score >= 70) {
            applicationStatus = 'SHORTLISTED';
          } else if (scoringResult.score < 40) {
            applicationStatus = 'REJECTED';
          }

          if (candidate.applications.length === 0) {
            await prisma.application.create({
              data: {
                candidateId: candidate.id,
                jobId: jobId,
                status: applicationStatus,
              },
            });
          } else {
            await prisma.application.update({
              where: { id: candidate.applications[0].id },
              data: { status: applicationStatus },
            });
          }

          screeningResults.push({
            ...screening,
            candidate: {
              id: candidate.id,
              firstName: candidate.firstName,
              lastName: candidate.lastName,
              email: candidate.email,
            },
            isNew: true,
          });

          logger.info(`Candidate ${candidate.id} screened for job ${jobId} with score ${scoringResult.score}`);
        } catch (error) {
          logger.error(`Failed to screen candidate ${candidate.id}:`, error);
          continue;
        }
      }

      // Sort by score
      screeningResults.sort((a, b) => b.score - a.score);

      return {
        jobId,
        jobTitle: job.title,
        totalScreened: screeningResults.length,
        results: screeningResults,
      };
    } catch (error) {
      logger.error('Batch screening error', error);
      throw error;
    }
  }

  /**
   * Get screening results for a job
   */
  async getScreeningResults(jobId, limit = 50, page = 1) {
    try {
      const skip = (page - 1) * limit;

      const job = await prisma.job.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error('Job not found');
      }

      const screenings = await prisma.screening.findMany({
        where: { jobId },
        orderBy: { score: 'desc' },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              currentRole: true,
              experience: true,
              skills: true,
            },
          },
          applications: {
            select: {
              status: true,
            },
          },
        },
        skip,
        take: limit,
      });

      const total = await prisma.screening.count({
        where: { jobId },
      });

      return {
        jobId,
        jobTitle: job.title,
        jobDescription: job.description,
        total,
        page,
        limit,
        results: screenings.map((s, idx) => ({
          rank: skip + idx + 1,
          ...s,
        })),
      };
    } catch (error) {
      logger.error('Get screening results error', error);
      throw error;
    }
  }

  /**
   * Get detailed screening analysis for candidate-job pair
   */
  async getScreeningDetails(candidateId, jobId) {
    try {
      const screening = await prisma.screening.findFirst({
        where: {
          candidateId,
          jobId,
        },
        include: {
          candidate: true,
          job: true,
        },
      });

      if (!screening) {
        throw new Error('Screening not found');
      }

      return screening;
    } catch (error) {
      logger.error('Get screening details error', error);
      throw error;
    }
  }

  /**
   * Update screening recommendation
   */
  async updateScreeningRecommendation(candidateId, jobId, recommendation, notes) {
    try {
      const screening = await prisma.screening.update({
        where: {
          candidateId_jobId: {
            candidateId,
            jobId,
          },
        },
        data: {
          recommendation,
          notes,
          updatedAt: new Date(),
        },
      });

      return screening;
    } catch (error) {
      logger.error('Update screening recommendation error', error);
      throw error;
    }
  }
}

module.exports = new AIScreeningService();
