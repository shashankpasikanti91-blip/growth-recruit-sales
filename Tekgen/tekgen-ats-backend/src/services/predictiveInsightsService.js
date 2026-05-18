const prisma = require('../config/database');
const logger = require('../utils/logger');

class PredictiveInsightsService {
  /**
   * Predict candidate success probability
   */
  async predictCandidateSuccess(candidateId, jobId) {
    try {
      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
      });

      const job = await prisma.job.findUnique({
        where: { id: jobId },
      });

      if (!candidate || !job) {
        throw new Error('Candidate or Job not found');
      }

      // Get similar successful candidates
      const successfulCandidates = await prisma.candidate.findMany({
        where: { status: 'HIRED' },
        include: {
          screenings: true,
        },
      });

      // Calculate success factors
      let successScore = 0;

      // Factor 1: Experience match (30%)
      const experienceMatch = Math.min(
        ((candidate.experience || 0) / Math.max(job.minExperience || 1, 1)) * 100,
        100
      );
      successScore += (experienceMatch / 100) * 30;

      // Factor 2: Skills match (40%)
      let skillsMatch = 0;
      if (candidate.skills && job.requiredSkills) {
        const matchedSkills = candidate.skills.filter(skill =>
          job.requiredSkills.some(reqSkill =>
            reqSkill.toLowerCase().includes(skill.toLowerCase()) ||
            skill.toLowerCase().includes(reqSkill.toLowerCase())
          )
        );
        skillsMatch = (matchedSkills.length / job.requiredSkills.length) * 100;
      }
      successScore += (skillsMatch / 100) * 40;

      // Factor 3: Historical success rate of similar candidates (30%)
      const successRate = await this.calculateHistoricalSuccessRate(
        candidate.skills,
        job.requiredSkills
      );
      successScore += (successRate / 100) * 30;

      // Calculate time to hire estimate
      const timeToHireEstimate = await this.estimateTimeToHire(jobId);

      return {
        candidateId,
        jobId,
        successProbability: Math.round(successScore),
        factors: {
          experienceMatch: Math.round(experienceMatch),
          skillsMatch: Math.round(skillsMatch),
          historicalSuccessRate: Math.round(successRate),
        },
        estimatedTimeToHire: timeToHireEstimate,
        recommendation: successScore >= 75
          ? 'STRONG_CANDIDATE'
          : successScore >= 50
          ? 'GOOD_CANDIDATE'
          : 'REVIEW_FURTHER',
      };
    } catch (error) {
      logger.error('Predict candidate success error', error);
      throw error;
    }
  }

  /**
   * Calculate historical success rate for skill combination
   */
  async calculateHistoricalSuccessRate(candidateSkills = [], requiredSkills = []) {
    try {
      const hiredCandidates = await prisma.candidate.findMany({
        where: { status: 'HIRED' },
      });

      if (hiredCandidates.length === 0) return 50; // Default 50% if no history

      let matchedSuccessful = 0;
      hiredCandidates.forEach(candidate => {
        if (candidate.skills && requiredSkills) {
          const matches = (candidate.skills || []).filter(skill =>
            (requiredSkills || []).some(reqSkill =>
              reqSkill.toLowerCase().includes(skill.toLowerCase())
            )
          );
          if (matches.length >= requiredSkills.length * 0.5) {
            matchedSuccessful++;
          }
        }
      });

      return (matchedSuccessful / hiredCandidates.length) * 100;
    } catch (error) {
      logger.error('Calculate historical success rate error', error);
      return 50;
    }
  }

  /**
   * Estimate time to hire
   */
  async estimateTimeToHire(jobId) {
    try {
      const closedJobs = await prisma.job.findMany({
        where: { status: 'FILLED' },
      });

      if (closedJobs.length === 0) return 30; // Default 30 days

      let totalDays = 0;
      closedJobs.forEach(job => {
        const days = Math.floor(
          (new Date(job.closedAt || new Date()) - new Date(job.createdAt)) /
          (1000 * 60 * 60 * 24)
        );
        totalDays += days;
      });

      return Math.round(totalDays / closedJobs.length);
    } catch (error) {
      logger.error('Estimate time to hire error', error);
      return 30;
    }
  }

  /**
   * Predict job difficulty to fill
   */
  async predictJobFillDifficulty(jobId) {
    try {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          applications: true,
          screenings: true,
        },
      });

      if (!job) throw new Error('Job not found');

      let difficultyScore = 50; // Base score

      // Factor 1: Number of required skills (more skills = harder)
      const skillComplexity = (job.requiredSkills?.length || 0) / 5;
      difficultyScore += Math.min(skillComplexity * 20, 30);

      // Factor 2: Experience requirement level
      const experienceRequirement = (job.minExperience || 0) / 10;
      difficultyScore += Math.min(experienceRequirement * 20, 20);

      // Factor 3: Application quality and screening performance
      if (job.screenings.length > 0) {
        const avgScore = job.screenings.reduce((sum, s) => sum + s.score, 0) / job.screenings.length;
        difficultyScore -= (avgScore / 100) * 40; // Lower score = harder to fill
      }

      difficultyScore = Math.max(0, Math.min(100, difficultyScore));

      return {
        jobId,
        difficulty: difficultyScore >= 75
          ? 'HIGH'
          : difficultyScore >= 50
          ? 'MEDIUM'
          : 'LOW',
        score: Math.round(difficultyScore),
        factors: {
          skillComplexity: Math.round(skillComplexity * 20),
          experienceRequirement: Math.round(experienceRequirement * 20),
          qualityOfApplicants: job.screenings.length > 0
            ? Math.round(
                job.screenings.reduce((sum, s) => sum + s.score, 0) / job.screenings.length
              )
            : 0,
        },
      };
    } catch (error) {
      logger.error('Predict job fill difficulty error', error);
      throw error;
    }
  }

  /**
   * Get attrition risk for hired candidates
   */
  async getAttritionRisk(hiredCandidateIds = []) {
    try {
      const hiredCandidates = await prisma.candidate.findMany({
        where: {
          id: hiredCandidateIds.length > 0 ? { in: hiredCandidateIds } : { status: 'HIRED' },
        },
        include: {
          applications: {
            include: { job: true },
          },
        },
      });

      const attritionAnalysis = hiredCandidates.map(candidate => {
        let riskScore = 0;

        // Factor 1: Low experience (higher risk)
        if ((candidate.experience || 0) < 2) {
          riskScore += 30;
        } else if ((candidate.experience || 0) < 5) {
          riskScore += 15;
        }

        // Factor 2: Multiple job applications (might be interviewing elsewhere)
        const applicationCount = candidate.applications.length;
        if (applicationCount > 3) {
          riskScore += 20;
        }

        // Factor 3: Skills mismatch (people tend to leave when overqualified)
        if (candidate.skills && candidate.skills.length > 10) {
          riskScore += 10;
        }

        return {
          candidateId: candidate.id,
          candidateName: `${candidate.firstName} ${candidate.lastName}`,
          riskLevel: riskScore >= 60
            ? 'HIGH'
            : riskScore >= 40
            ? 'MEDIUM'
            : 'LOW',
          riskScore: Math.min(100, riskScore),
        };
      });

      return attritionAnalysis;
    } catch (error) {
      logger.error('Get attrition risk error', error);
      throw error;
    }
  }
}

module.exports = new PredictiveInsightsService();
