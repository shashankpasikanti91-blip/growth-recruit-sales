const { validationResult } = require('express-validator');
const candidateService = require('../services/candidateService');
const resumeParserService = require('../services/resume/resumeParserService');
const aiService = require('../services/ai/openaiService');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

class CandidateController {
  async uploadResume(req, res) {
    try {
      if (!req.file) {
        return sendError(res, 'No file uploaded', 400);
      }

      const { firstName, lastName, email, phone, location, address, linkedinUrl, portfolio, sourceChannel } = req.body;

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
      const finalEmail = email || parsedResume.email || null;
      const finalIc = req.body.icNumber || parsedResume.icNumber || null;
      const finalPassport = req.body.passportNumber || parsedResume.passportNumber || null;
      const finalNationality = req.body.nationality || parsedResume.nationality || null;
      const finalDob = req.body.dob ? new Date(req.body.dob) : parsedResume.dob || null;
      const finalGender = req.body.gender || parsedResume.gender || null;
      const finalMarital = req.body.maritalStatus || parsedResume.maritalStatus || null;

      // Duplicate detection: IC/Passport first (strongest signals), then email, then resumeHash
      if (!forceUpdate) {
        // 1) Same IC or Passport
        const dupByDoc = await candidateService.findByIcOrPassport(finalIc, finalPassport);
        if (dupByDoc) {
          if (req.file) fs.unlinkSync(req.file.path);
          const docType = dupByDoc.icNumber === finalIc ? `IC ${finalIc}` : `Passport ${finalPassport}`;
          return res.status(409).json({
            success: false,
            duplicate: true,
            duplicateType: dupByDoc.icNumber === finalIc ? 'IC' : 'PASSPORT',
            message: `A candidate with ${docType} already exists in the system.`,
            existing: dupByDoc,
          });
        }
        // 2) Same email
        if (finalEmail && finalEmail !== 'no-email@example.com') {
          const dupByEmail = await candidateService.findByEmail(finalEmail);
          if (dupByEmail) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(409).json({
              success: false,
              duplicate: true,
              duplicateType: 'EMAIL',
              message: `A candidate with email ${finalEmail} already exists in the system.`,
              existing: dupByEmail,
            });
          }
        }
        // 3) Same resume file (hash match — exact duplicate upload)
        if (parsedResume.resumeHash) {
          const dupByHash = await candidateService.findByResumeHash(parsedResume.resumeHash);
          if (dupByHash) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(409).json({
              success: false,
              duplicate: true,
              duplicateType: 'RESUME_FILE',
              message: `This exact resume file has already been uploaded for candidate ${dupByHash.firstName} ${dupByHash.lastName} (${dupByHash.displayId}).`,
              existing: dupByHash,
            });
          }
        }
      }

      // Create/update candidate immediately (no AI wait)
      const candidate = await candidateService.upsertCandidate(
        {
          firstName: firstName || parsedResume.name?.split(' ')[0] || 'Unknown',
          lastName: lastName || parsedResume.name?.split(' ').slice(1).join(' ') || '',
          email: finalEmail || 'no-email@example.com',
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
          resumeUrl: '/uploads/' + path.basename(req.file.path),
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
        },
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
      const filters = {
        status: req.query.status,
        search: req.query.search,
        contractType: req.query.contractType,
        limit: parseInt(req.query.limit) || 50,
        page: parseInt(req.query.page) || 1,
        // Restrict to own candidates unless ADMIN
        ownerId: req.user.role === 'ADMIN' ? undefined : req.user.id,
      };

      const result = await candidateService.getCandidatesByUser(req.user.id, filters);

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

      // All authenticated team members can view any candidate
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
      const { text, firstName, lastName, email, phone, location, address: addressText, linkedinUrl, portfolio, sourceChannel: sourceChannelText } = req.body;

      if (!text || !text.trim()) {
        return sendError(res, 'Resume text is required', 400);
      }

      const parsedResume = await resumeParserService.parseText(text);

      // Duplicate detection
      const forceUpdateText = req.body.forceUpdate === 'true';
      const finalEmailText = email || parsedResume.email || null;
      const finalIcText = req.body.icNumber || parsedResume.icNumber || null;
      const finalPassportText = req.body.passportNumber || parsedResume.passportNumber || null;
      const finalNationalityText = req.body.nationality || parsedResume.nationality || null;
      const finalDobText = req.body.dob ? new Date(req.body.dob) : parsedResume.dob || null;
      const finalGenderText = req.body.gender || parsedResume.gender || null;
      const finalMaritalText = req.body.maritalStatus || parsedResume.maritalStatus || null;

      if (!forceUpdateText) {
        const dupByDoc = await candidateService.findByIcOrPassport(finalIcText, finalPassportText);
        if (dupByDoc) {
          const docType = dupByDoc.icNumber === finalIcText ? `IC ${finalIcText}` : `Passport ${finalPassportText}`;
          return res.status(409).json({
            success: false,
            duplicate: true,
            duplicateType: dupByDoc.icNumber === finalIcText ? 'IC' : 'PASSPORT',
            message: `A candidate with ${docType} already exists in the system.`,
            existing: dupByDoc,
          });
        }
        if (finalEmailText) {
          const dupByEmail = await candidateService.findByEmail(finalEmailText);
          if (dupByEmail) {
            return res.status(409).json({
              success: false,
              duplicate: true,
              duplicateType: 'EMAIL',
              message: `A candidate with email ${finalEmailText} already exists in the system.`,
              existing: dupByEmail,
            });
          }
        }
      }

      const candidate = await candidateService.upsertCandidate(
        {
          firstName: firstName || parsedResume.name?.split(' ')[0] || 'Unknown',
          lastName: lastName || parsedResume.name?.split(' ').slice(1).join(' ') || '',
          email: finalEmailText || `candidate+${Date.now()}@tekgen.com`,
          phone: phone || parsedResume.phone,
          location: location || parsedResume.location || null,
          address: addressText || null,
          linkedinUrl,
          portfolio,
          experience: parsedResume.experience,
          education: parsedResume.education.join(', '),
          skills: [],
          resumeText: parsedResume.fullText,
          sourceChannel: sourceChannelText || 'MANUAL_UPLOAD',
          nationality: finalNationalityText,
          icNumber: finalIcText,
          passportNumber: finalPassportText,
          dob: finalDobText,
          gender: finalGenderText,
          maritalStatus: finalMaritalText,
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
}

module.exports = new CandidateController();
