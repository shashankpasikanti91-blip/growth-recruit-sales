const { validationResult } = require('express-validator');
const candidateService = require('../services/candidateService');
const resumeParserService = require('../services/resume/resumeParserService');
const aiService = require('../services/ai/openaiService');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

function buildCandidatePayload({ req, parsedResume, resumeUrl = null }) {
  const { firstName, lastName, email, phone, location, address, linkedinUrl, portfolio, sourceChannel } = req.body;
  const finalEmail = email || parsedResume.email || null;
  const finalIc = req.body.icNumber || parsedResume.icNumber || null;
  const finalPassport = req.body.passportNumber || parsedResume.passportNumber || null;
  const finalNationality = req.body.nationality || parsedResume.nationality || null;
  const finalDob = req.body.dob ? new Date(req.body.dob) : parsedResume.dob || null;
  const finalGender = req.body.gender || parsedResume.gender || null;
  const finalMarital = req.body.maritalStatus || parsedResume.maritalStatus || null;

  return {
    firstName: firstName || parsedResume.name?.split(' ')[0] || 'Unknown',
    lastName: lastName || parsedResume.name?.split(' ').slice(1).join(' ') || '',
    email: finalEmail || `candidate+${Date.now()}@tekgen.com`,
    phone: phone || parsedResume.phone,
    location: location || parsedResume.location || null,
    address: address || null,
    currentRole: parsedResume.currentRole || null,
    currentCompany: parsedResume.currentCompany || null,
    linkedinUrl,
    portfolio,
    experience: parsedResume.experience || 0,
    education: parsedResume.education.join(' | '),
    skills: [],
    resumeUrl,
    resumeText: parsedResume.fullText,
    resumeHash: parsedResume.resumeHash || null,
    sourceChannel: sourceChannel || 'MANUAL_UPLOAD',
    nationality: finalNationality,
    icNumber: finalIc,
    passportNumber: finalPassport,
    dob: finalDob,
    gender: finalGender,
    maritalStatus: finalMarital,
    parserConfidence: parsedResume.confidence || null,
    parsingStatus: parsedResume.parsingStatus || 'COMPLETE',
    parsedAt: new Date(),
  };
}

const GLOBAL_CANDIDATE_ACCESS_ROLES = new Set([
  'ADMIN',
  'RECRUITMENT_MANAGER',
  'MANAGEMENT',
  'HEAD',
  'DEPT_HEAD',
  'DEPARTMENT_HEAD',
  'COMPANY_HEAD',
  'MD',
  'MANAGING_DIRECTOR',
]);

function canViewAllCandidates(role) {
  return GLOBAL_CANDIDATE_ACCESS_ROLES.has(role);
}

class CandidateController {
  async uploadResume(req, res) {
    try {
      if (!req.file) {
        return sendError(res, 'No file uploaded', 400);
      }

      // Validate file type
      const allowedExtensions = ['.pdf', '.docx'];
      const fileExtension = path.extname(req.file.originalname).toLowerCase();

      if (!allowedExtensions.includes(fileExtension)) {
        fs.unlinkSync(req.file.path);
        return sendError(res, 'Only PDF and DOCX files are supported', 400);
      }

      // Parse resume (fast — local extraction)
      const parsedResume = await resumeParserService.parseResume(req.file.path);

      // Resolve identity fields (form override takes priority over parsed)
      const forceUpdate = req.body.forceUpdate === 'true';
      const payload = buildCandidatePayload({
        req,
        parsedResume,
        resumeUrl: '/uploads/' + path.basename(req.file.path),
      });
      const finalEmail = payload.email;
      const finalIc = payload.icNumber;
      const finalPassport = payload.passportNumber;
      const staleTakeoverAllowed = req.body.staleTakeover !== 'false';
      const existingId = req.body.existingId || null;
      let duplicateCandidate = null;

      // Duplicate detection: IC/Passport first (strongest signals), then email, then resumeHash
      if (!forceUpdate) {
        // 1) Same IC or Passport
        const dupByDoc = await candidateService.findByIcOrPassport(finalIc, finalPassport);
        if (dupByDoc) {
          duplicateCandidate = dupByDoc;
        }
        // 2) Same email
        if (!duplicateCandidate && finalEmail && finalEmail !== 'no-email@example.com') {
          const dupByEmail = await candidateService.findByEmail(finalEmail);
          if (dupByEmail) {
            duplicateCandidate = dupByEmail;
          }
        }
        // 3) Same resume file (hash match — exact duplicate upload)
        if (!duplicateCandidate && parsedResume.resumeHash) {
          const dupByHash = await candidateService.findByResumeHash(parsedResume.resumeHash);
          if (dupByHash) {
            duplicateCandidate = dupByHash;
          }
        }
      }

      if (duplicateCandidate) {
        const isStale = candidateService.isStaleForOwnershipTransfer(duplicateCandidate.updatedAt);
        const duplicateType = duplicateCandidate.icNumber === finalIc
          ? 'IC'
          : duplicateCandidate.passportNumber === finalPassport
            ? 'PASSPORT'
            : duplicateCandidate.email === finalEmail
              ? 'EMAIL'
              : 'RESUME_FILE';

        // Auto-transfer stale profiles (>= 6 months) to latest uploader.
        if (staleTakeoverAllowed && isStale) {
          const updatedExisting = await candidateService.refreshCandidateFromUpload(
            duplicateCandidate.id,
            payload,
            req.user.id,
            `Ownership moved to latest uploader after 6-month inactivity rule.`
          );
          return sendSuccess(
            res,
            {
              candidate: updatedExisting,
              updatedExisting: true,
              staleTakeover: true,
            },
            'Existing candidate was updated and reassigned to latest uploader (6-month rule)',
            200
          );
        }

        if (req.file) fs.unlinkSync(req.file.path);
        const docType = duplicateCandidate.icNumber === finalIc ? `IC ${finalIc}` : `Passport ${finalPassport}`;
        const message = duplicateType === 'EMAIL'
          ? `A candidate with email ${finalEmail} already exists in the system.`
          : duplicateType === 'RESUME_FILE'
            ? `This exact resume file has already been uploaded for candidate ${duplicateCandidate.firstName} ${duplicateCandidate.lastName} (${duplicateCandidate.displayId}).`
            : `A candidate with ${docType} already exists in the system.`;
        return res.status(409).json({
          success: false,
          duplicate: true,
          duplicateType,
          message,
          staleEligible: isStale,
          existing: duplicateCandidate,
        });
      }

      if (forceUpdate && existingId) {
        const updatedExisting = await candidateService.refreshCandidateFromUpload(
          existingId,
          payload,
          req.user.id,
          `Updated from duplicate override by recruiter ${req.user.id}.`
        );
        return sendSuccess(
          res,
          { candidate: updatedExisting, updatedExisting: true },
          'Existing candidate profile updated with latest resume',
          200
        );
      }

      // Create/update candidate immediately (no AI wait)
      const candidate = await candidateService.upsertCandidate(
        payload,
        req.user.id
      );

      // Respond immediately — AI skill extraction runs in the background
      sendSuccess(
        res,
        {
          candidate,
          parsedData: {
            skills: [],
            technicalSkills: [],
            softSkills: [],
            yearsOfExperience: parsedResume.experience || 0,
            icNumber: parsedResume.icNumber,
            passportNumber: parsedResume.passportNumber,
            nationality: parsedResume.nationality,
            dob: parsedResume.dob,
            gender: parsedResume.gender,
            maritalStatus: parsedResume.maritalStatus,
          },
        },
        'Resume uploaded and parsed successfully',
        201
      );

      // Background: extract skills via AI and update candidate (non-blocking)
      aiService.extractSkillsFromResume(parsedResume.fullText)
        .then(async (skillsData) => {
          if ((skillsData.skills && skillsData.skills.length > 0) || skillsData.yearsOfExperience) {
            await candidateService.updateCandidate(candidate.id, {
              skills: skillsData.skills || [],
              experience: skillsData.yearsOfExperience || candidate.experience || 0,
            });
          }
        })
        .catch((err) => logger.warn('Background AI skill extraction failed', { err: err.message }));
    } catch (error) {
      logger.error('Upload resume error', error);

      if (req.file) {
        fs.unlinkSync(req.file.path);
      }

      sendError(res, error.message, 500);
    }
  }

  async getCandidates(req, res) {
    try {
      const hasGlobalAccess = canViewAllCandidates(req.user.role);
      // Regular users: always own records only.
      // Global roles: all by default, mine=1 for personal view.
      const mineOnly = hasGlobalAccess
        ? (req.query.mine === '1' || req.query.mine === 'true')
        : true;
      const filters = {
        status: req.query.status,
        search: req.query.search,
        contractType: req.query.contractType,
        trash: req.query.trash,
        limit: parseInt(req.query.limit, 10) || 50,
        page: parseInt(req.query.page, 10) || 1,
        ownerId: mineOnly ? req.user.id : undefined,
      };

      const result = await candidateService.getCandidatesByUser(filters);

      sendSuccess(res, { candidates: result.candidates, total: result.total }, 'Candidates retrieved');
    } catch (error) {
      logger.error('Get candidates error', error);
      sendError(res, error.message, 500);
    }
  }

  async getCandidateById(req, res) {
    try {
      const candidate = await candidateService.getCandidateById(req.params.id);

      if (!candidate) {
        return sendError(res, 'Candidate not found', 404);
      }

      const hasGlobalAccess = canViewAllCandidates(req.user.role);
      if (!hasGlobalAccess && candidate.userId !== req.user.id) {
        return sendError(res, 'Candidate not found', 404);
      }

      sendSuccess(res, candidate, 'Candidate retrieved');
    } catch (error) {
      logger.error('Get candidate by ID error', error);
      sendError(res, error.message, 500);
    }
  }

  async updateCandidate(req, res) {
    try {
      const candidate = await candidateService.getCandidateById(req.params.id);

      if (!candidate) {
        return sendError(res, 'Candidate not found', 404);
      }

      // Whitelist all valid Candidate fields (schema fields only — prevents injection)
      const ALLOWED = new Set([
        'firstName','lastName','email','phone','location','currentRole',
        'experience','skills','education','resumeUrl','linkedinUrl','portfolio',
        'sourceChannel','status','nationality','icNumber','passportNumber',
        'dob','gender','maritalStatus','address',
        // Submission / profiling fields
        'relevantExperience','visaType','visaValidity','currentEmployer',
        'preferredLocation','currentSalary','expectedSalary','noticePeriod',
        'interviewMode','offersInHand','recruiterNotes','callStatus','submissionDate',
        // Applying-for fields (new)
        'applyingForRole','hireType','applyingClientName',
      ]);
      const safeData = Object.fromEntries(
        Object.entries(req.body).filter(([k]) => ALLOWED.has(k))
      );
      // Coerce numeric fields
      if (safeData.experience !== undefined) safeData.experience = safeData.experience === '' ? null : Number(safeData.experience);
      if (safeData.relevantExperience !== undefined) safeData.relevantExperience = safeData.relevantExperience === '' ? null : Number(safeData.relevantExperience);
      if (safeData.currentSalary !== undefined) safeData.currentSalary = safeData.currentSalary === '' ? null : Number(safeData.currentSalary);
      if (safeData.expectedSalary !== undefined) safeData.expectedSalary = safeData.expectedSalary === '' ? null : Number(safeData.expectedSalary);
      if (safeData.submissionDate !== undefined) safeData.submissionDate = safeData.submissionDate ? new Date(safeData.submissionDate) : null;
      if (safeData.dob !== undefined) safeData.dob = safeData.dob ? new Date(safeData.dob) : null;

      // Non-admins can only edit candidates they uploaded
      if (req.user.role !== 'ADMIN' && candidate.userId !== req.user.id) {
        return sendError(res, 'Candidate not found', 404);
      }

      // All authenticated team members can update candidates
      const updatedCandidate = await candidateService.updateCandidate(req.params.id, safeData);

      sendSuccess(res, updatedCandidate, 'Candidate updated');
    } catch (error) {
      logger.error('Update candidate error', error);
      sendError(res, error.message, 500);
    }
  }

  async updateCandidateStatus(req, res) {
    try {
      const { status } = req.body;

      if (!['NEW', 'APPLIED', 'SCREENED', 'INTERVIEW', 'REJECTED', 'HIRED', 'ON_HOLD'].includes(status)) {
        return sendError(res, 'Invalid status', 400);
      }

      // Non-admins can only update status of their own candidates
      if (req.user.role !== 'ADMIN') {
        const existing = await candidateService.getCandidateById(req.params.id);
        if (!existing || existing.userId !== req.user.id) {
          return sendError(res, 'Candidate not found', 404);
        }
      }

      const candidate = await candidateService.updateCandidateStatus(req.params.id, status);

      sendSuccess(res, candidate, 'Candidate status updated');
    } catch (error) {
      logger.error('Update candidate status error', error);
      sendError(res, error.message, 500);
    }
  }

  async deleteCandidate(req, res) {
    try {
      const candidate = await candidateService.getCandidateById(req.params.id);

      if (!candidate) {
        return sendError(res, 'Candidate not found', 404);
      }

      // Only ADMIN or users explicitly granted canDeleteCandidates permission
      const isAdmin = req.user.role === 'ADMIN';
      const hasPermission = req.user.canDeleteCandidates === true;
      if (!isAdmin && !hasPermission) {
        return sendError(res, 'Only admins can delete candidates. Contact your admin to request delete permission.', 403);
      }

      await candidateService.deleteCandidate(req.params.id);

      sendSuccess(res, { message: 'Candidate deleted' }, 'Candidate deleted successfully');
    } catch (error) {
      logger.error('Delete candidate error', error);
      sendError(res, error.message, 500);
    }
  }

  async parseResumeText(req, res) {
    try {
      const { text } = req.body;

      if (!text || !text.trim()) {
        return sendError(res, 'Resume text is required', 400);
      }

      const parsedResume = await resumeParserService.parseText(text);

      // Duplicate detection
      const forceUpdateText = req.body.forceUpdate === 'true';
      const payloadText = buildCandidatePayload({ req, parsedResume, resumeUrl: null });
      const finalEmailText = payloadText.email;
      const finalIcText = payloadText.icNumber;
      const finalPassportText = payloadText.passportNumber;
      const existingId = req.body.existingId || null;
      let duplicateCandidate = null;

      if (!forceUpdateText) {
        const dupByDoc = await candidateService.findByIcOrPassport(finalIcText, finalPassportText);
        if (dupByDoc) duplicateCandidate = dupByDoc;
        if (finalEmailText) {
          const dupByEmail = await candidateService.findByEmail(finalEmailText);
          if (!duplicateCandidate && dupByEmail) duplicateCandidate = dupByEmail;
        }
      }

      if (duplicateCandidate) {
        const isStale = candidateService.isStaleForOwnershipTransfer(duplicateCandidate.updatedAt);
        const duplicateType = duplicateCandidate.icNumber === finalIcText
          ? 'IC'
          : duplicateCandidate.passportNumber === finalPassportText
            ? 'PASSPORT'
            : 'EMAIL';

        if (isStale) {
          const updatedExisting = await candidateService.refreshCandidateFromUpload(
            duplicateCandidate.id,
            payloadText,
            req.user.id,
            `Ownership moved to latest uploader after 6-month inactivity rule.`
          );
          return sendSuccess(
            res,
            { candidate: updatedExisting, updatedExisting: true, staleTakeover: true },
            'Existing candidate updated and reassigned to latest uploader (6-month rule)',
            200
          );
        }

        const docType = duplicateCandidate.icNumber === finalIcText ? `IC ${finalIcText}` : `Passport ${finalPassportText}`;
        return res.status(409).json({
          success: false,
          duplicate: true,
          duplicateType,
          message: duplicateType === 'EMAIL'
            ? `A candidate with email ${finalEmailText} already exists in the system.`
            : `A candidate with ${docType} already exists in the system.`,
          staleEligible: isStale,
          existing: duplicateCandidate,
        });
      }

      if (forceUpdateText && existingId) {
        const updatedExisting = await candidateService.refreshCandidateFromUpload(
          existingId,
          payloadText,
          req.user.id,
          `Updated from duplicate override by recruiter ${req.user.id}.`
        );
        return sendSuccess(
          res,
          { candidate: updatedExisting, updatedExisting: true },
          'Existing candidate profile updated with latest parsed resume text',
          200
        );
      }

      const candidate = await candidateService.upsertCandidate(
        {
          ...payloadText,
          education: parsedResume.education.join(', '),
        },
        req.user.id
      );

      // Respond immediately
      sendSuccess(
        res,
        {
          candidate,
          parsedData: {
            skills: [],
            technicalSkills: [],
            softSkills: [],
            yearsOfExperience: parsedResume.experience || 0,
          },
        },
        'Resume text parsed successfully',
        201
      );

      // Background: AI skill extraction (non-blocking)
      aiService.extractSkillsFromResume(parsedResume.fullText)
        .then(async (skillsData) => {
          if ((skillsData.skills && skillsData.skills.length > 0) || skillsData.yearsOfExperience) {
            await candidateService.updateCandidate(candidate.id, {
              skills: skillsData.skills || [],
              experience: skillsData.yearsOfExperience || candidate.experience || 0,
            });
          }
        })
        .catch((err) => logger.warn('Background AI skill extraction (text) failed', { err: err.message }));
    } catch (error) {
      logger.error('Parse resume text error', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * Preview resume file: parse and extract data WITHOUT saving to DB.
   * Used to auto-fill form fields on the upload page.
   */
  async previewResume(req, res) {
    try {
      if (!req.file) {
        return sendError(res, 'No file uploaded', 400);
      }
      const parsedResume = await resumeParserService.parseResume(req.file.path);
      // Delete temp file after parsing (preview only — not saved)
      try { fs.unlinkSync(req.file.path); } catch (_) {}

      const nameParts = (parsedResume.name || '').trim().split(/\s+/);
      const icInfo = parsedResume.icNumber ? {
        icNumber: parsedResume.icNumber,
        dob: parsedResume.dob ? parsedResume.dob.toISOString().substring(0, 10) : '',
        gender: parsedResume.gender || '',
      } : {};

      // Return immediately — no AI call for preview (keeps form auto-fill fast)
      sendSuccess(res, {
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: parsedResume.email || '',
        phone: parsedResume.phone || '',
        nationality: parsedResume.nationality || '',
        passportNumber: parsedResume.passportNumber || '',
        maritalStatus: parsedResume.maritalStatus || '',
        location: parsedResume.location || '',
        skills: [],
        experience: parsedResume.experience || 0,
        education: parsedResume.education || [],
        ...icInfo,
      }, 'Resume preview extracted');
    } catch (error) {
      logger.error('Preview resume error', error);
      sendError(res, error.message || 'Failed to preview resume', 500);
    }
  }

  /**
   * Preview resume text: parse and extract data WITHOUT saving to DB.
   */
  async previewText(req, res) {
    try {
      const { text } = req.body;
      if (!text || !text.trim()) {
        return sendError(res, 'Text is required', 400);
      }
      const parsedResume = await resumeParserService.parseText(text);
      const skillsData = await aiService.extractSkillsFromResume(parsedResume.fullText);

      const nameParts = (parsedResume.name || '').trim().split(/\s+/);
      const icInfo = parsedResume.icNumber ? {
        icNumber: parsedResume.icNumber,
        dob: parsedResume.dob ? parsedResume.dob.toISOString().substring(0, 10) : '',
        gender: parsedResume.gender || '',
      } : {};

      sendSuccess(res, {
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: parsedResume.email || '',
        phone: parsedResume.phone || '',
        nationality: parsedResume.nationality || '',
        passportNumber: parsedResume.passportNumber || '',
        maritalStatus: parsedResume.maritalStatus || '',
        skills: skillsData.skills || [],
        experience: skillsData.yearsOfExperience || parsedResume.experience || 0,
        education: parsedResume.education || [],
        ...icInfo,
      }, 'Text preview extracted');
    } catch (error) {
      logger.error('Preview text error', error);
      sendError(res, error.message || 'Failed to preview text', 500);
    }
  }

  /**
   * POST /api/candidates/:id/whatsapp-message
   * Sends a plain text WhatsApp message using the recruiter's (or global) Cloud API config.
   */
  async sendWhatsAppToCandidate(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, errors.array()[0].msg, 400);
      }
      const { message } = req.body;
      if (!message || !String(message).trim()) {
        return sendError(res, 'Message is required', 400);
      }
      const candidate = await candidateService.getCandidateById(req.params.id);
      if (!candidate) return sendError(res, 'Candidate not found', 404);
      if (!candidate.phone) return sendError(res, 'Candidate has no phone number on file', 400);

      const { getWhatsAppCredentials, sendWhatsAppText } = require('../services/integrationResolveService');
      const wa = await getWhatsAppCredentials(req.user.id);
      if (!wa) return sendError(res, 'WhatsApp Cloud API is not configured. Add it under Integrations.', 400);

      await sendWhatsAppText({
        accessToken: wa.accessToken,
        phoneNumberId: wa.phoneNumberId,
        to: candidate.phone,
        body: String(message).trim(),
      });

      try {
        await candidateService.updateCandidate(req.params.id, { callStatus: 'WHATSAPP_SENT' });
      } catch (_) {
        /* non-fatal */
      }

      return sendSuccess(res, { sent: true }, 'WhatsApp message sent');
    } catch (error) {
      logger.error('sendWhatsAppToCandidate', error);
      sendError(res, error.message || 'Failed to send WhatsApp', 400);
    }
  }
}

module.exports = new CandidateController();
