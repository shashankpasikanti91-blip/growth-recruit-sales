const prisma = require('../config/database');
const logger = require('../utils/logger');

class AdvancedMatchingService {
  /**
   * Multi-factor candidate matching algorithm
   */
  async calculateAdvancedMatch(candidateId, jobId) {
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

      const scoring = {
        experienceScore: this.scoreExperience(candidate.experience, job.minExperience, job.maxExperience),
        skillsScore: this.scoreSkills(candidate.skills || [], job.requiredSkills || []),
        educationScore: this.scoreEducation(candidate.education, job),
        locationScore: this.scoreLocation(candidate.location, job.location),
        salaryAlignmentScore: this.scoreSalaryAlignment(candidate, job),
      };

      const weights = {
        experienceScore: 0.25,
        skillsScore: 0.35,
        educationScore: 0.15,
        locationScore: 0.10,
        salaryAlignmentScore: 0.15,
      };

      const overallScore = Object.entries(scoring).reduce((sum, [key, score]) => {
        return sum + (score * (weights[key] || 0));
      }, 0);

      return {
        candidateId,
        jobId,
        overallScore: Math.round(overallScore),
        scores: {
          experience: Math.round(scoring.experienceScore),
          skills: Math.round(scoring.skillsScore),
          education: Math.round(scoring.educationScore),
          location: Math.round(scoring.locationScore),
          salaryAlignment: Math.round(scoring.salaryAlignmentScore),
        },
        weights,
        recommendation: this.getMatchRecommendation(overallScore),
      };
    } catch (error) {
      logger.error('Calculate advanced match error', error);
      throw error;
    }
  }

  /**
   * Score experience match
   */
  scoreExperience(candidateExp = 0, minExp = 0, maxExp = null) {
    if (candidateExp < minExp) {
      return Math.max(0, (candidateExp / minExp) * 70); // Underexperienced
    }

    if (maxExp && candidateExp > maxExp) {
      return Math.min(100, (maxExp / candidateExp) * 100); // Overexperienced
    }

    return 100; // Perfect fit
  }

  /**
   * Score skills match
   */
  scoreSkills(candidateSkills = [], requiredSkills = []) {
    if (requiredSkills.length === 0) return 100;
    if (candidateSkills.length === 0) return 0;

    let matchedSkills = 0;
    let partialMatches = 0;

    requiredSkills.forEach(requiredSkill => {
      const matched = candidateSkills.some(candidateSkill =>
        requiredSkill.toLowerCase() === candidateSkill.toLowerCase()
      );

      if (matched) {
        matchedSkills++;
      } else {
        // Check for partial matches
        const partial = candidateSkills.some(candidateSkill =>
          requiredSkill.toLowerCase().includes(candidateSkill.toLowerCase()) ||
          candidateSkill.toLowerCase().includes(requiredSkill.toLowerCase())
        );
        if (partial) {
          partialMatches++;
        }
      }
    });

    // 80% for exact matches, 40% for partial matches
    const score = (matchedSkills * 80 + partialMatches * 40) / requiredSkills.length;
    return Math.min(100, score);
  }

  /**
   * Score education match
   */
  scoreEducation(candidateEducation = '', job = {}) {
    if (!candidateEducation) return 50;

    const educationKeywords = [
      'bachelor', 'master', 'phd', 'diploma',
      'degree', 'certification', 'associate',
    ];

    const education = candidateEducation.toLowerCase();
    const hasRelevantEducation = educationKeywords.some(keyword =>
      education.includes(keyword)
    );

    return hasRelevantEducation ? 85 : 60;
  }

  /**
   * Score location match
   */
  scoreLocation(candidateLocation = '', jobLocation = '') {
    if (!candidateLocation || !jobLocation) return 70;

    const normalized1 = candidateLocation.toLowerCase().split(',')[0].trim();
    const normalized2 = jobLocation.toLowerCase().split(',')[0].trim();

    if (normalized1 === normalized2) {
      return 100; // Perfect location match
    }

    // Check for partial matches (country or state level)
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      return 70;
    }

    return 40; // Different locations (consider remote-friendly)
  }

  /**
   * Score salary alignment
   */
  scoreSalaryAlignment(candidate = {}, job = {}) {
    // If no salary data provided, assume good match
    if (!job.salaryMin || !job.salaryMax) return 80;

    // Without candidate salary expectations, give neutral score
    return 75;
  }

  /**
   * Get match recommendation
   */
  getMatchRecommendation(score) {
    if (score >= 85) return 'EXCELLENT_MATCH';
    if (score >= 70) return 'GOOD_MATCH';
    if (score >= 50) return 'FAIR_MATCH';
    return 'POOR_MATCH';
  }

  /**
   * Find best matches for a job
   */
  async findBestMatches(jobId, limit = 10) {
    try {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
      });

      if (!job) throw new Error('Job not found');

      const candidates = await prisma.candidate.findMany({
        where: {
          status: { in: ['NEW', 'APPLIED', 'SCREENED'] },
        },
      });

      const matches = await Promise.all(
        candidates.map(async (candidate) => {
          const matchResult = await this.calculateAdvancedMatch(candidate.id, jobId);
          return {
            candidate,
            ...matchResult,
          };
        })
      );

      return matches
        .sort((a, b) => b.overallScore - a.overallScore)
        .slice(0, limit);
    } catch (error) {
      logger.error('Find best matches error', error);
      throw error;
    }
  }

  /**
   * Find best jobs for a candidate
   */
  async findBestJobs(candidateId, limit = 5) {
    try {
      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
      });

      if (!candidate) throw new Error('Candidate not found');

      const jobs = await prisma.job.findMany({
        where: { status: 'OPEN' },
      });

      const matches = await Promise.all(
        jobs.map(async (job) => {
          const matchResult = await this.calculateAdvancedMatch(candidateId, job.id);
          return {
            job,
            ...matchResult,
          };
        })
      );

      return matches
        .sort((a, b) => b.overallScore - a.overallScore)
        .slice(0, limit);
    } catch (error) {
      logger.error('Find best jobs error', error);
      throw error;
    }
  }
}

module.exports = new AdvancedMatchingService();
