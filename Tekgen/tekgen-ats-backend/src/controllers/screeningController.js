const { validationResult } = require('express-validator');
const screeningService = require('../services/screeningService');
const jobService = require('../services/jobService');
const candidateService = require('../services/candidateService');
const aiService = require('../services/ai/openaiService');
const resumeParserService = require('../services/resume/resumeParserService');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const prisma = require('../config/database');
const { generateCandidateId } = require('../utils/idGenerator');

class ScreeningController {
  /**
   * Get pipeline stats for dashboard
   */
  async getPipelineStats(req, res) {
    try {
      const userId = req.user.id;

      // Count applications by status for this user's jobs
      const applications = await prisma.application.findMany({
        where: {
          job: { userId },
        },
        select: { status: true },
      });

      const stats = { total: applications.length };
      applications.forEach(app => {
        stats[app.status] = (stats[app.status] || 0) + 1;
      });

      // Also count total candidates
      const totalCandidates = await prisma.candidate.count({
        where: { userId },
      });
      stats.total = totalCandidates;

      sendSuccess(res, stats, 'Pipeline stats retrieved');
    } catch (error) {
      logger.error('Get pipeline stats error', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * Screen single candidate against single job
   */
  async screenSingle(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, 'Validation failed', 400, errors.array());
      }

      const { candidateId, jobId, forceRerun = false } = req.body;

      // Check authorization
      const job = await jobService.getJobById(jobId);
      if (!job) return sendError(res, 'Job not found', 404);
      if (job.userId !== req.user.id && req.user.role !== 'ADMIN') {
        return sendError(res, 'Unauthorized', 403);
      }

      const result = await screeningService.screenSingleCandidate(candidateId, jobId, req.user.id, forceRerun);

      sendSuccess(res, result, result.fromCache ? 'Saved screening result loaded' : 'Single screening completed', 200);
    } catch (error) {
      logger.error('Screen single error', error);
      sendError(res, error.message, 400);
    }
  }

  /**
   * Bulk screen candidates
   * - Multiple candidates for one job: { jobId, candidateIds: [id1, id2...] }
   * - One candidate for multiple jobs: { jobIds: [id1, id2...], candidateIds: [id] }
   */
  async screenBulk(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, 'Validation failed', 400, errors.array());
      }

      let { jobId, jobIds = [], candidateIds = [] } = req.body;

      // Handle single jobId parameter
      if (jobId && !jobIds.includes(jobId)) {
        jobIds = [jobId];
      }

      if (jobIds.length === 0 || candidateIds.length === 0) {
        return sendError(res, 'Provide either (1 jobId + candidateIds) or (jobIds + 1 candidateId)', 400);
      }

      // Check authorization on job(s)
      for (const jId of jobIds) {
        const job = await jobService.getJobById(jId);
        if (!job) return sendError(res, `Job ${jId} not found`, 404);
        if (job.userId !== req.user.id && req.user.role !== 'ADMIN') {
          return sendError(res, 'Unauthorized for one or more jobs', 403);
        }
      }

      const result = await screeningService.bulkScreen(jobIds, candidateIds, req.user.id, req.body.forceRerun || false);

      sendSuccess(res, result, 'Bulk screening completed', 200);
    } catch (error) {
      logger.error('Screen bulk error', error);
      sendError(res, error.message, 400);
    }
  }

  /**
   * Get screening results for a job
   */
  async getJobResults(req, res) {
    try {
      const { jobId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      // Check authorization
      const job = await jobService.getJobById(jobId);
      if (!job) return sendError(res, 'Job not found', 404);
      if (job.userId !== req.user.id && req.user.role !== 'ADMIN') {
        return sendError(res, 'Unauthorized', 403);
      }

      const result = await screeningService.getJobScreenings(jobId, parseInt(page), parseInt(limit));

      sendSuccess(res, result, 'Job screening results', 200);
    } catch (error) {
      logger.error('Get job results error', error);
      sendError(res, error.message, 400);
    }
  }

  /**
   * Get screening analysis for a candidate-job pair
   */
  async getAnalysis(req, res) {
    try {
      const { candidateId, jobId } = req.params;

      const screening = await screeningService.getScreeningDetails(candidateId, jobId);

      sendSuccess(res, screening, 'Screening analysis', 200);
    } catch (error) {
      logger.error('Get analysis error', error);
      sendError(res, error.message, 400);
    }
  }

  /**
   * Screen with direct text input (resume text + job description text)
   * Now persists: creates candidate, screening, and application records
   */
  async screenDirectText(req, res) {
    try {
      const { resumeText, jobDescription, jobTitle, requiredSkills, jobId, clientName: clientNameFromText } = req.body;

      if (!resumeText || !jobDescription) {
        return sendError(res, 'Resume text and job description are required', 400);
      }

      const skills = requiredSkills || [];
      const scoringResult = await aiService.scoreCandidate(resumeText, jobDescription, skills);

      // Use AI-extracted profile (more reliable than regex for name/location/exp)
      const aiProfile = scoringResult.candidateProfile || {};

      // Use resumeParserService for proper name/contact extraction
      const contactInfo = resumeParserService.extractContactInfo(resumeText);
      const rawExtractedName = aiProfile.fullName || resumeParserService.extractName(resumeText);
      // Clean name: strip comma-separated title (e.g. "John Doe, Senior Engineer" → "John Doe")
      const cleanExtractedName = rawExtractedName ? rawExtractedName.split(',')[0].trim() : 'Screened Candidate';
      const nameParts = cleanExtractedName.split(/\s+/).filter(Boolean);

      const candidatePhone = contactInfo.phone || null;

      // Resolve email: use extracted, or look up by phone, or generate placeholder
      let candidateEmail = contactInfo.email || null;
      if (!candidateEmail && candidatePhone) {
        const byPhone = await prisma.candidate.findFirst({ where: { phone: candidatePhone }, select: { email: true } });
        if (byPhone) candidateEmail = byPhone.email;
      }
      if (!candidateEmail) {
        candidateEmail = `candidate+${Date.now()}@tekgen-screened.com`;
      }

      // Extract additional resume fields — AI profile takes priority over regex
      const parsedExp = (aiProfile.totalYearsExperience != null ? aiProfile.totalYearsExperience : null)
        ?? resumeParserService.extractExperienceYears(resumeText);
      const parsedIcInfo = resumeParserService.extractIcInfo(resumeText);
      const parsedNationality = resumeParserService.extractNationality(resumeText);
      const parsedGender = resumeParserService.extractGender(resumeText) || parsedIcInfo.gender || null;
      const parsedDob = resumeParserService.extractDob(resumeText) || parsedIcInfo.dob || null;
      const parsedMarital = resumeParserService.extractMaritalStatus(resumeText);
      const parsedLocation = aiProfile.city || resumeParserService.extractLocation(resumeText);
      const parsedEducation = resumeParserService.extractEducation(resumeText);
      if (aiProfile.educationHighest && !parsedEducation.includes(aiProfile.educationHighest)) {
        parsedEducation.unshift(aiProfile.educationHighest);
      }
      const parsedCurrentRole = aiProfile.currentJobTitle || resumeParserService.extractCurrentRole(resumeText);
      const parsedCurrentCompany = resumeParserService.extractCurrentCompany(resumeText);

      // Upsert candidate record
      const displayId = await generateCandidateId();
      const candidate = await prisma.candidate.upsert({
        where: { email: candidateEmail },
        update: {
          resumeText,
          skills: scoringResult.matchedSkills || [],
          ...(parsedExp != null && { experience: parsedExp }),
          ...(candidatePhone && { phone: candidatePhone }),
          ...(parsedLocation && { location: parsedLocation }),
          ...(parsedEducation.length > 0 && { education: parsedEducation.join(' | ') }),
          ...(parsedCurrentRole && { currentRole: parsedCurrentRole }),
          ...(parsedCurrentCompany && { currentCompany: parsedCurrentCompany }),
          ...(parsedNationality && { nationality: parsedNationality }),
        },
        create: {
          displayId,
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(' ') || '',
          email: candidateEmail,
          phone: candidatePhone,
          resumeText,
          skills: scoringResult.matchedSkills || [],
          experience: parsedExp,
          location: parsedLocation,
          education: parsedEducation.length > 0 ? parsedEducation.join(' | ') : null,
          currentRole: parsedCurrentRole,
          currentCompany: parsedCurrentCompany,
          nationality: parsedNationality,
          gender: parsedGender,
          dob: parsedDob,
          maritalStatus: parsedMarital,
          icNumber: parsedIcInfo.icNumber,
          status: 'SCREENED',
          sourceChannel: 'AI_SCREENING',
          userId: req.user.id,
        },
      });

      // If a jobId was provided, or create a temporary job from description
      let actualJobId = jobId;
      if (!actualJobId) {
        // Create or find a job for this JD
        const existingJob = await prisma.job.findFirst({
          where: { title: jobTitle || 'Direct Screening', userId: req.user.id },
        });
        if (existingJob) {
          actualJobId = existingJob.id;
        } else {
          const { generateJobId } = require('../utils/idGenerator');
          const jobDisplayId = await generateJobId();
          const newJob = await prisma.job.create({
            data: {
              displayId: jobDisplayId,
              title: jobTitle || 'Direct Screening',
              description: jobDescription,
              requiredSkills: skills,
              minExperience: 0,
              maxExperience: 0,
              department: 'Screening',
              location: 'Not Specified',
              clientName: clientNameFromText || null,
              userId: req.user.id,
            },
          });
          actualJobId = newJob.id;
        }
      }

      // Map AI recommendation to valid enum
      const mapRecommendation = (rec, score) => {
        const validEnums = ['STRONG_MATCH', 'GOOD_MATCH', 'MODERATE_MATCH', 'WEAK_MATCH', 'NOT_SUITABLE'];
        const upper = (rec || '').toUpperCase().replace(/[\s-]+/g, '_');
        if (validEnums.includes(upper)) return upper;
        if (score >= 80) return 'STRONG_MATCH';
        if (score >= 65) return 'GOOD_MATCH';
        if (score >= 50) return 'MODERATE_MATCH';
        if (score >= 30) return 'WEAK_MATCH';
        return 'NOT_SUITABLE';
      };

      // Ensure gap is a single string
      const gapValue = Array.isArray(scoringResult.weaknesses)
        ? scoringResult.weaknesses.join('; ')
        : (scoringResult.weaknesses || null);

      // Create screening record
      const screening = await prisma.screening.create({
        data: {
          candidateId: candidate.id,
          jobId: actualJobId,
          score: scoringResult.score,
          reasoning: scoringResult.reasoning,
          extractedSkills: scoringResult.matchedSkills || [],
          matchedSkills: scoringResult.matchedSkills || [],
          gap: gapValue,
          recommendation: mapRecommendation(scoringResult.recommendation, scoringResult.score),
          fullResult: scoringResult,
          userId: req.user.id,
        },
      });

      // Create application record
      const appStatus = scoringResult.score >= 70 ? 'SHORTLISTED' : scoringResult.score >= 55 ? 'SCREENED' : 'REJECTED';
      await prisma.application.upsert({
        where: { candidateId_jobId: { candidateId: candidate.id, jobId: actualJobId } },
        update: { status: appStatus },
        create: { candidateId: candidate.id, jobId: actualJobId, status: appStatus, userId: req.user.id },
      });

      logger.info(`Direct text screening saved: ${candidate.firstName} ${candidate.lastName} - ${scoringResult.score}/100`);

      sendSuccess(res, {
        score: scoringResult.score,
        classification: scoringResult.classification || '',
        summary: scoringResult.summary || '',
        reasoning: scoringResult.reasoning,
        strengths: scoringResult.strengths || [],
        weaknesses: scoringResult.weaknesses || '',
        matchedSkills: scoringResult.matchedSkills || [],
        missingSkills: scoringResult.missingSkills || scoringResult.jdMatchAnalysis?.missingSkills || [],
        jdMatchAnalysis: scoringResult.jdMatchAnalysis || null,
        redFlags: scoringResult.redFlags || [],
        requiredImprovements: scoringResult.requiredImprovements || [],
        experienceValidation: scoringResult.experienceValidation || null,
        educationCheck: scoringResult.educationCheck || null,
        recommendation: scoringResult.recommendation || 'Review',
        jobTitle: jobTitle || 'Direct Screening',
        type: 'DIRECT_TEXT',
        candidateId: candidate.id,
        screeningId: screening.id,
      }, 'Direct text screening completed', 200);
    } catch (error) {
      logger.error('Direct text screening error', error);
      sendError(res, error.message, 400);
    }
  }

  /**
   * Screen with file upload (one or more resume files + job description text or jobId)
   * Now persists: creates candidate, screening, and application records for each file
   */
  async screenDirectFile(req, res) {
    try {
      const files = req.files;
      const { jobDescription, jobId, jobTitle, requiredSkills, clientName: clientNameFromBody } = req.body;

      if (!files || files.length === 0) {
        return sendError(res, 'At least one file is required', 400);
      }

      if (!jobDescription && !jobId) {
        return sendError(res, 'Job description text or job ID is required', 400);
      }

      let jdText = jobDescription || '';
      let skills = [];
      let jTitle = jobTitle || 'Direct File Screening';
      let actualJobId = jobId;

      if (jobId) {
        const job = await jobService.getJobById(jobId);
        if (!job) return sendError(res, 'Job not found', 404);
        jdText = job.description;
        skills = job.requiredSkills || [];
        jTitle = job.title;
      } else if (requiredSkills) {
        try { skills = JSON.parse(requiredSkills); } catch (e) { skills = requiredSkills.split(',').map(s => s.trim()); }
      }

      // If no jobId, create/find a job from the description
      if (!actualJobId) {
        const existingJob = await prisma.job.findFirst({
          where: { title: jTitle, userId: req.user.id },
        });
        if (existingJob) {
          actualJobId = existingJob.id;
        } else {
          const { generateJobId } = require('../utils/idGenerator');
          const jobDisplayId = await generateJobId();
          const newJob = await prisma.job.create({
            data: {
              displayId: jobDisplayId,
              title: jTitle,
              description: jdText,
              requiredSkills: skills,
              minExperience: 0,
              maxExperience: 0,
              department: 'Screening',
              location: 'Not Specified',
              clientName: clientNameFromBody || null,
              userId: req.user.id,
            },
          });
          actualJobId = newJob.id;
        }
      }

      const results = [];
      const errors = [];

      for (const file of files) {
        try {
          let text = '';
          const ext = path.extname(file.originalname).toLowerCase();

          if (ext === '.pdf') {
            text = await resumeParserService.extractTextFromPDF(file.path);
          } else if (ext === '.docx') {
            text = await resumeParserService.extractTextFromDOCX(file.path);
          } else if (ext === '.doc') {
            text = await resumeParserService.extractTextFromDOCX(file.path);
          } else if (ext === '.txt' || ext === '.csv') {
            text = fs.readFileSync(file.path, 'utf-8');
          } else if (ext === '.xls' || ext === '.xlsx') {
            text = fs.readFileSync(file.path, 'utf-8');
          }

          if (!text || text.trim().length < 10) {
            errors.push({ file: file.originalname, error: 'Could not extract text from file' });
            continue;
          }

          const scoringResult = await aiService.scoreCandidate(text, jdText, skills);

          // Use resumeParserService for proper name/contact extraction
          // Use AI-extracted profile (more reliable than regex for name/location/exp)
          const aiProfile = scoringResult.candidateProfile || {};

          const fileContactInfo = resumeParserService.extractContactInfo(text);
          const rawName = aiProfile.fullName || resumeParserService.extractName(text) || file.originalname.replace(/\.[^.]+$/, '');
          // Clean name: strip commas and anything after (e.g. "Ashok Reddy, Senior Engineer" → ["Ashok", "Reddy"])
          const cleanName = rawName.split(',')[0].trim();
          const fileNameParts = cleanName.split(/\s+/).filter(Boolean);
          const candidatePhone = fileContactInfo.phone || null;
          const cFirstName = fileNameParts[0] || 'Unknown';
          const cLastName = fileNameParts.slice(1).join(' ') || '';

          // Resolve email: use extracted, or look up by phone, or generate placeholder
          let candidateEmail = fileContactInfo.email || null;
          if (!candidateEmail && candidatePhone) {
            const byPhone = await prisma.candidate.findFirst({ where: { phone: candidatePhone }, select: { email: true } });
            if (byPhone) candidateEmail = byPhone.email;
          }
          if (!candidateEmail) {
            candidateEmail = `candidate+${Date.now()}+${Math.random().toString(36).slice(2, 6)}@tekgen-screened.com`;
          }

          // Extract additional resume fields — AI profile takes priority over regex
          const parsedExp = (aiProfile.totalYearsExperience != null ? aiProfile.totalYearsExperience : null)
            ?? resumeParserService.extractExperienceYears(text);
          const parsedIcInfo = resumeParserService.extractIcInfo(text);
          const parsedNationality = resumeParserService.extractNationality(text);
          const parsedGender = resumeParserService.extractGender(text) || parsedIcInfo.gender || null;
          const parsedDob = resumeParserService.extractDob(text) || parsedIcInfo.dob || null;
          const parsedMarital = resumeParserService.extractMaritalStatus(text);
          const parsedLocation = aiProfile.city || resumeParserService.extractLocation(text);
          const parsedEducation = resumeParserService.extractEducation(text);
          // Combine AI education with regex results
          if (aiProfile.educationHighest && !parsedEducation.includes(aiProfile.educationHighest)) {
            parsedEducation.unshift(aiProfile.educationHighest);
          }
          const parsedCurrentRole = aiProfile.currentJobTitle || resumeParserService.extractCurrentRole(text);
          const parsedCurrentCompany = resumeParserService.extractCurrentCompany(text);
          const resumeUrl = '/uploads/' + path.basename(file.path);

          // Create candidate record
          const displayId = await generateCandidateId();
          const candidate = await prisma.candidate.upsert({
            where: { email: candidateEmail },
            update: {
              resumeText: text,
              resumeUrl,
              skills: scoringResult.matchedSkills || [],
              ...(parsedExp != null && { experience: parsedExp }),
              ...(candidatePhone && { phone: candidatePhone }),
              ...(parsedLocation && { location: parsedLocation }),
              ...(parsedEducation.length > 0 && { education: parsedEducation.join(' | ') }),
              ...(parsedCurrentRole && { currentRole: parsedCurrentRole }),
              ...(parsedCurrentCompany && { currentCompany: parsedCurrentCompany }),
              ...(parsedNationality && { nationality: parsedNationality }),
            },
            create: {
              displayId,
              firstName: cFirstName,
              lastName: cLastName,
              email: candidateEmail,
              phone: candidatePhone,
              resumeText: text,
              resumeUrl,
              skills: scoringResult.matchedSkills || [],
              experience: parsedExp,
              location: parsedLocation,
              education: parsedEducation.length > 0 ? parsedEducation.join(' | ') : null,
              currentRole: parsedCurrentRole,
              currentCompany: parsedCurrentCompany,
              nationality: parsedNationality,
              gender: parsedGender,
              dob: parsedDob,
              maritalStatus: parsedMarital,
              icNumber: parsedIcInfo.icNumber,
              status: 'SCREENED',
              sourceChannel: 'AI_SCREENING',
              userId: req.user.id,
            },
          });

          // Map AI recommendation to valid enum
          const validEnums = ['STRONG_MATCH', 'GOOD_MATCH', 'MODERATE_MATCH', 'WEAK_MATCH', 'NOT_SUITABLE'];
          const recUpper = (scoringResult.recommendation || '').toUpperCase().replace(/[\s-]+/g, '_');
          let mappedRec;
          if (validEnums.includes(recUpper)) { mappedRec = recUpper; }
          else if (scoringResult.score >= 80) { mappedRec = 'STRONG_MATCH'; }
          else if (scoringResult.score >= 65) { mappedRec = 'GOOD_MATCH'; }
          else if (scoringResult.score >= 50) { mappedRec = 'MODERATE_MATCH'; }
          else if (scoringResult.score >= 30) { mappedRec = 'WEAK_MATCH'; }
          else { mappedRec = 'NOT_SUITABLE'; }

          const fileGapValue = Array.isArray(scoringResult.weaknesses)
            ? scoringResult.weaknesses.join('; ')
            : (scoringResult.weaknesses || null);

          // Create screening record
          await prisma.screening.create({
            data: {
              candidateId: candidate.id,
              jobId: actualJobId,
              score: scoringResult.score,
              reasoning: scoringResult.reasoning,
              extractedSkills: scoringResult.matchedSkills || [],
              matchedSkills: scoringResult.matchedSkills || [],
              gap: fileGapValue,
              recommendation: mappedRec,
              fullResult: scoringResult,
              userId: req.user.id,
            },
          });

          // Create application record
          const appStatus = scoringResult.score >= 70 ? 'SHORTLISTED' : scoringResult.score >= 55 ? 'SCREENED' : 'REJECTED';
          await prisma.application.upsert({
            where: { candidateId_jobId: { candidateId: candidate.id, jobId: actualJobId } },
            update: { status: appStatus },
            create: { candidateId: candidate.id, jobId: actualJobId, status: appStatus, userId: req.user.id },
          });

          results.push({
            fileName: file.originalname,
            score: scoringResult.score,
            classification: scoringResult.classification || '',
            reasoning: scoringResult.reasoning,
            matchedSkills: scoringResult.matchedSkills || [],
            missingSkills: scoringResult.missingSkills || scoringResult.jdMatchAnalysis?.missingSkills || [],
            strengths: scoringResult.strengths || [],
            weaknesses: scoringResult.weaknesses || '',
            redFlags: scoringResult.redFlags || [],
            jdMatchAnalysis: scoringResult.jdMatchAnalysis || null,
            recommendation: scoringResult.recommendation || 'Review',
            candidateId: candidate.id,
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
          });

          logger.info(`File screening saved: ${candidate.firstName} ${candidate.lastName} - ${scoringResult.score}/100`);
        } catch (err) {
          errors.push({ file: file.originalname, error: err.message });
          // Only delete file on error (keep successful uploads for "View Resume File")
          try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch (e) { /* ignore */ }
        }
      }

      sendSuccess(res, {
        type: 'DIRECT_FILE',
        jobTitle: jTitle,
        totalFiles: files.length,
        screened: results.length,
        failed: errors.length,
        results: results.sort((a, b) => b.score - a.score),
        errors,
      }, 'File screening completed', 200);
    } catch (error) {
      logger.error('Direct file screening error', error);
      sendError(res, error.message, 400);
    }
  }

  /**
   * Get all saved screenings for the current user's jobs (history list)
   */
  async getAllScreenings(req, res) {
    try {
      const { page = 1, limit = 100, search } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {
        job: { userId: req.user.id },
      };

      if (search) {
        where.OR = [
          { candidate: { firstName: { contains: search, mode: 'insensitive' } } },
          { candidate: { lastName: { contains: search, mode: 'insensitive' } } },
          { candidate: { email: { contains: search, mode: 'insensitive' } } },
          { job: { title: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const [screenings, total] = await Promise.all([
        prisma.screening.findMany({
          where,
          include: {
            candidate: { select: { id: true, displayId: true, firstName: true, lastName: true, email: true } },
            job: { select: { id: true, displayId: true, title: true } },
            user: { select: { firstName: true, lastName: true } },
          },
          orderBy: { screenedAt: 'desc' },
          take: parseInt(limit),
          skip,
        }),
        prisma.screening.count({ where }),
      ]);

      sendSuccess(res, { screenings, total, page: parseInt(page) }, 'Screenings retrieved');
    } catch (error) {
      logger.error('Get all screenings error', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * Extract text from a JD file (PDF, DOCX, DOC, TXT)
   * POST /api/screenings/extract-jd  — single file field: 'jdFile'
   */
  async extractJdText(req, res) {
    try {
      const file = req.file;
      if (!file) return sendError(res, 'No file uploaded', 400);

      let text = '';
      const ext = path.extname(file.originalname).toLowerCase();

      if (ext === '.pdf') {
        text = await resumeParserService.extractTextFromPDF(file.path);
      } else if (ext === '.docx' || ext === '.doc') {
        text = await resumeParserService.extractTextFromDOCX(file.path);
      } else if (ext === '.txt') {
        text = fs.readFileSync(file.path, 'utf-8');
      } else {
        try { fs.unlinkSync(file.path); } catch (e) { /* ignore */ }
        return sendError(res, 'Unsupported JD file type. Use PDF, DOCX, DOC, or TXT.', 400);
      }

      try { fs.unlinkSync(file.path); } catch (e) { /* ignore */ }

      if (!text || text.trim().length < 10) {
        return sendError(res, 'Could not extract readable text from the JD file.', 400);
      }

      sendSuccess(res, { text }, 'JD text extracted');
    } catch (error) {
      logger.error('Extract JD text error', error);
      sendError(res, error.message, 400);
    }
  }

  /**
   * AI writing helper — improve / reformat text using OpenAI
   */
  async aiWrite(req, res) {
    try {
      const { text, instruction } = req.body;
      if (!text || text.trim().length < 3) {
        return sendError(res, 'Text is required', 400);
      }
      const systemGuardrail = 'You are a professional recruitment email writer. Always write in a natural, human, polite tone. Never produce rude, offensive, vulgar, harassing or discriminatory content. Keep language respectful, encouraging and clear.';
      const userPrompt = (instruction || 'Improve the following text professionally:\n\n') + text;
      const result = await aiService.generateTextWithSystem(systemGuardrail, userPrompt);
      sendSuccess(res, { result }, 'Text improved');
    } catch (error) {
      logger.error('AI write error', error);
      sendError(res, error.message || 'AI service error', 500);
    }
  }

  /**
   * GET /sessions — list all screening sessions for current user (Phase 4)
   */
  async getSessions(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const data = await screeningService.getScreeningSessions(req.user.id, parseInt(page), parseInt(limit));
      sendSuccess(res, data, 'Screening sessions retrieved');
    } catch (error) {
      logger.error('Get sessions error', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * GET /sessions/latest — load latest session results without rerunning (Phase 4)
   */
  async getLatestSession(req, res) {
    try {
      const data = await screeningService.getLatestSessionResults(req.user.id);
      sendSuccess(res, data, 'Latest session results');
    } catch (error) {
      logger.error('Get latest session error', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * GET /sessions/:sessionId — load specific session results (Phase 4)
   */
  async getSessionById(req, res) {
    try {
      const { sessionId } = req.params;
      const data = await screeningService.getSessionResults(sessionId, req.user.id);
      sendSuccess(res, data, 'Session results');
    } catch (error) {
      logger.error('Get session error', error);
      sendError(res, error.message, 404);
    }
  }
}

module.exports = new ScreeningController();
