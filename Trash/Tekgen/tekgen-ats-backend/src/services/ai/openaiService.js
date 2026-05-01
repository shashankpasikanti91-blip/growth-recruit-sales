const { OpenAI } = require('openai');
const config = require('../../config/environment');
const logger = require('../../utils/logger');

const openai = new OpenAI({
  apiKey: config.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

class AIService {
  /**
   * Extract skills from resume text using OpenAI
   */
  async extractSkillsFromResume(resumeText, jobDescription = null) {
    try {
      const prompt = `
        Analyze the following resume and extract ALL technical and soft skills mentioned.
        ${jobDescription ? `Also compare with this job description: ${jobDescription}` : ''}
        
        Return the response as a JSON object with:
        {
          "skills": ["skill1", "skill2", ...],
          "technicalSkills": ["tech1", "tech2", ...],
          "softSkills": ["soft1", "soft2", ...],
          "yearsOfExperience": number
        }
        
        Resume:
        ${resumeText}
      `;

      const response = await openai.chat.completions.create({
        model: config.OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        logger.warn('AI response did not contain JSON — returning empty skill defaults');
        return { skills: [], technicalSkills: [], softSkills: [], yearsOfExperience: 0 };
      }

      try {
        return JSON.parse(jsonMatch[0]);
      } catch (parseErr) {
        logger.warn('Failed to JSON.parse AI response — returning empty skill defaults');
        return { skills: [], technicalSkills: [], softSkills: [], yearsOfExperience: 0 };
      }
    } catch (error) {
      logger.error('Extract skills error', error);
      // AI failure is non-fatal — return empty defaults so upload still succeeds
      return { skills: [], technicalSkills: [], softSkills: [], yearsOfExperience: 0 };
    }
  }

  /**
   * Score a candidate against a job using AI
   */
  async scoreCandidate(candidateResume, jobDescription, requiredSkills) {
    try {
      const systemPrompt = `You are an elite Recruitment AI system built to evaluate candidate resumes against a Job Description (JD) with precision, consistency, and zero tolerance for assumptions. Your analysis directly impacts hiring decisions, so you must be rigorous, fair, and fully explainable.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORE MISSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Evaluate the resume STRICTLY against the provided JD — not against generic job expectations.
2. Surface only evidence that appears explicitly in the resume text. DO NOT infer, assume, or hallucinate.
3. Score each dimension independently, then compute a weighted final score.
4. Provide specific, quoted evidence from the resume to justify every score.
5. Flag any anomaly, inconsistency, or resume manipulation attempt.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCORING DIMENSIONS (total = 100 points)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[A] JD SKILL RELEVANCE — 40 points
  • Mandatory skills match: each mandatory skill found in recent (<3 years) roles = full credit
  • Preferred skills match: partial credit
  • Skills listed only in a "skills section" without supporting job experience = 50% credit only
  • Skills last used >5 years ago = 20% credit only
  • Keyword-stuffed skills with no role context = 0 credit + flag as red flag

[B] EXPERIENCE QUALITY & DEPTH — 20 points
  • Role seniority matches JD level (junior/mid/senior/lead): full credit
  • Measurable achievements (%, numbers, scale) present: +2 bonus
  • Vague bullet points with no outcomes: deduct points
  • Contract/freelance roles: evaluate by skill relevance, not by employment type
  • Career progression visible (growth in responsibilities): +2 bonus

[C] TIMELINE & TENURE INTEGRITY — 15 points
  • Each job must have: Company Name + Job Title + Start Date + End Date (or "Present")
  • Missing dates for any role: -3 per missing entry
  • Employment gaps > 6 months unexplained: flag and deduct -3 per gap
  • Overlapping tenures: flag as red flag, deduct -5
  • Reverse chronological order (most recent first): required; non-chronological = -5
  • Total experience must add up to claimed years; discrepancy > 1 year = red flag

[D] EDUCATION INTEGRITY — 10 points
  • Degree/diploma present with institution name: required
  • Graduation/passout year present: required (missing = -5)
  • Degree relevant to JD field: +2 bonus
  • Certificate courses (online/short): do not substitute for formal degree

[E] SKILL AUTHENTICITY — 10 points
  • For each claimed skill, verify it appears in at least one role's responsibilities
  • Skills only in a "self-assessment" or proficiency bar: do not count as authenticated
  • Mismatch between skill claims and actual job roles = red flag

[F] PROFILE COMPLETENESS & QUALITY — 5 points
  • Resume has contact details (email/phone): required
  • Clear role titles present: required
  • Current/most recent position clearly identifiable: required
  • Excessively short resume (<300 words) for senior role: penalize -2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLASSIFICATION THRESHOLDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • 80–100 → Strong (STRONG_MATCH or GOOD_MATCH)
  • 55–79  → KIV — Keep In View (MODERATE_MATCH)
  • <55    → Rejected (WEAK_MATCH or NOT_SUITABLE)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RED FLAG TRIGGERS (auto-flag each)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • Overlapping employment dates
  • Total experience claimed > sum of all tenures
  • Graduation year after first employment start
  • Skills listed without any supporting role experience
  • Missing dates for 2+ roles
  • Identical bullet points copied across multiple roles
  • Job title mismatch with responsibilities described
  • Jumps >3 companies in <2 years (job hopping — not an auto-reject, but flag)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANTI-HALLUCINATION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • NEVER assume a skill is present if not stated explicitly
  • NEVER infer experience years beyond what dates show
  • NEVER give credit for skills only in resume section headings
  • If resume text is too short or garbled, flag as INCOMPLETE and score accordingly
  • Do not be influenced by candidate's self-assessment words ("expert", "proficient") — validate against role evidence

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (MANDATORY — return valid JSON only, no markdown)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "finalScore": number,
  "classification": "Strong" | "KIV" | "Rejected",
  "summary": string,
  "strengths": [string],
  "weaknesses": [string],
  "jdMatchAnalysis": {
    "matchPercent": string,
    "keyMatchedSkills": [string],
    "missingSkills": [string]
  },
  "experienceValidation": {
    "isRecent": "Yes" | "No",
    "gaps": string,
    "chronologicalOrder": "Yes" | "No"
  },
  "educationCheck": {
    "degreePresent": "Yes" | "No",
    "passoutYearPresent": "Yes" | "No"
  },
  "redFlags": [string],
  "requiredImprovements": [string],
  "recommendation": "STRONG_MATCH" | "GOOD_MATCH" | "MODERATE_MATCH" | "WEAK_MATCH" | "NOT_SUITABLE",
  "reasoning": string,
  "matchedSkills": [string],
  "missingSkills": [string],
  "candidateProfile": {
    "fullName": "candidate's full personal name (first + last) — NOT a company name",
    "currentJobTitle": "most recent job title from the resume",
    "totalYearsExperience": number,
    "city": "city or location extracted from the resume",
    "educationHighest": "highest education qualification line"
  }
}

Return ONLY the JSON object. No prose before or after. No markdown code blocks.`;

      const userPrompt = `Evaluate the following candidate resume against the job description below.

=== JOB DESCRIPTION ===
${jobDescription}

=== MANDATORY REQUIRED SKILLS ===
${requiredSkills && requiredSkills.length ? requiredSkills.join(', ') : 'Refer to the JD above'}

=== CANDIDATE RESUME ===
${candidateResume}

Evaluate strictly per the scoring dimensions defined in your instructions. Return only valid JSON.`;

      const response = await openai.chat.completions.create({
        model: config.OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 2500,
      });

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response');
      }

      const result = JSON.parse(jsonMatch[0]);

      // Normalize score field from AI response and ensure valid range
      result.score = Number(result.score ?? result.finalScore ?? 0);
      if (Number.isNaN(result.score)) {
        result.score = 0;
      }
      result.score = Math.max(0, Math.min(100, result.score));

      // Bring classification in line with score thresholds if missing
      if (!result.classification) {
        result.classification = result.score >= 70 ? 'Strong' : result.score >= 55 ? 'KIV' : 'Rejected';
      }

      // Normalize recommendation to valid Prisma enum
      const validRecs = ['STRONG_MATCH', 'GOOD_MATCH', 'MODERATE_MATCH', 'WEAK_MATCH', 'NOT_SUITABLE'];
      const rawRec = (result.recommendation || '').toUpperCase().replace(/[\s-]+/g, '_');
      if (!validRecs.includes(rawRec)) {
        if (result.score >= 80) result.recommendation = 'STRONG_MATCH';
        else if (result.score >= 65) result.recommendation = 'GOOD_MATCH';
        else if (result.score >= 50) result.recommendation = 'MODERATE_MATCH';
        else if (result.score >= 30) result.recommendation = 'WEAK_MATCH';
        else result.recommendation = 'NOT_SUITABLE';
      } else {
        result.recommendation = rawRec;
      }

      // Normalize weaknesses to a single string (Prisma gap field is String?)
      if (Array.isArray(result.weaknesses)) {
        result.weaknesses = result.weaknesses.join('; ');
      }

      // Ensure matchedSkills is always an array
      if (!Array.isArray(result.matchedSkills)) {
        result.matchedSkills = result.jdMatchAnalysis?.keyMatchedSkills || [];
      }

      // Ensure reasoning is always a string
      if (!result.reasoning) {
        result.reasoning = result.summary || 'AI screening completed';
      }

      return result;
    } catch (error) {
      logger.error('Score candidate error', error);
      throw error;
    }
  }

  /**
   * Generate interview questions based on resume and job
   */
  async generateInterviewQuestions(candidateResume, jobDescription, numberOfQuestions = 5) {
    try {
      const prompt = `
        Based on the candidate's resume and job requirements, generate ${numberOfQuestions} relevant interview questions.
        
        Job Description:
        ${jobDescription}
        
        Candidate Resume:
        ${candidateResume}
        
        Return a JSON object with:
        {
          "questions": [
            { "question": "Question text", "type": "technical|behavioral", "difficulty": "easy|medium|hard" },
            ...
          ]
        }
      `;

      const response = await openai.chat.completions.create({
        model: config.OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Generate questions error', error);
      throw error;
    }
  }

  /**
   * Generate follow-up email content
   */
  async generateFollowUpEmail(candidateName, jobTitle, daysWaiting) {
    try {
      const prompt = `
        Generate a professional and friendly follow-up email for a job application.
        
        Candidate Name: ${candidateName}
        Job Title: ${jobTitle}
        Days since application: ${daysWaiting}
        
        Return a JSON object with:
        {
          "subject": "Email subject",
          "body": "Email body (professional HTML-safe text)"
        }
      `;

      const response = await openai.chat.completions.create({
        model: config.OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Generate follow-up email error', error);
      throw error;
    }
  }

  /**
   * Parse a Job Description text using AI to extract structured fields
   * Phase 1: Full field extraction including salary, experience, contract details
   * @param {string} jdText - Raw text extracted from JD file
   * @param {string} [manualClientName] - If provided, never override with parsed value
   * @returns {Object} Structured job details
   */
  async parseJobDescription(jdText, manualClientName = null) {
    try {
      const systemPrompt = `You are an expert HR/Recruitment AI specialising in Malaysian and Southeast Asian job markets.
Extract ALL job information from the raw JD text into a structured JSON format.

SALARY DETECTION — detect any of these formats and return raw numeric values:
- "MYR 8000" or "RM 8,000" → salaryMin: 8000
- "MYR 6000 - 8000" → salaryMin: 6000, salaryMax: 8000
- "8k - 10k" → salaryMin: 8000, salaryMax: 10000
- "8000 monthly" → salaryMin: 8000, salaryFrequency: "monthly"
- "USD 5000" → salaryCurrency: "USD"
- Always return salary as integer (no currency symbol)

EXPERIENCE DETECTION:
- "5 years", "5+ years", "5-8 years", "minimum 4 years", "at least 3 years" → minExperience/maxExperience as integers
- "fresh graduate" or "entry level" → minExperience: 0

CONTRACT/EMPLOYMENT TYPE:
- "permanent", "full time", "full-time" → contractType: "PERMANENT"
- "contract", "contract basis" → contractType: "CONTRACT"
- "freelance" → contractType: "FREELANCE"
- "internship", "intern" → contractType: "INTERNSHIP"
- "part time", "part-time" → contractType: "PART_TIME"

CONTRACT DURATION:
- "6 months contract", "12 months", "1 year renewable" → contractDuration as string

SKILLS CLASSIFICATION:
- mandatorySkills: MUST HAVE — look for "required", "must have", "mandatory", "essential"
- preferredSkills: NICE TO HAVE — look for "preferred", "advantage", "good to have", "plus"
- requiredSkills: all other technical skills mentioned

WORK AUTHORIZATION:
- Look for "citizen only", "PR", "work permit", "employment pass", "open to all" etc.

Return ONLY a valid JSON object:
{
  "title": "job title or null",
  "department": "Engineering|Sales|Marketing|HR|Finance|Operations|IT|Healthcare|Manufacturing|Customer Service|General" or null,
  "location": "city/state or 'Remote' or 'Hybrid' or null",
  "country": "country name or null",
  "contractType": "PERMANENT|CONTRACT|FREELANCE|INTERNSHIP|PART_TIME" or null,
  "contractDuration": "duration string or null",
  "minExperience": integer or 0,
  "maxExperience": integer or null,
  "salaryMin": integer or null,
  "salaryMax": integer or null,
  "salaryCurrency": "MYR|USD|SGD|INR|GBP|EUR" or "MYR",
  "salaryFrequency": "monthly|yearly|daily|hourly" or "monthly",
  "workAuthorization": "string or null",
  "requiredSkills": ["skill1", "skill2"],
  "preferredSkills": ["skill1"],
  "mandatorySkills": ["skill1"],
  "description": "2-4 sentence clean summary",
  "responsibilities": ["resp1"],
  "requirements": ["req1"],
  "clientName": "company/client name if explicitly mentioned or null"
}`;

      const response = await openai.chat.completions.create({
        model: config.OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Parse this job description:\n\n${jdText}` },
        ],
        temperature: 0.2,
        max_tokens: 2500,
      });

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      const fallback = {
        title: null, description: jdText.substring(0, 500),
        requiredSkills: [], preferredSkills: [], mandatorySkills: [],
        minExperience: 0, maxExperience: 0,
        department: null, location: null, country: null,
        contractType: null, contractDuration: null,
        salaryMin: null, salaryMax: null, salaryCurrency: 'MYR', salaryFrequency: 'monthly',
        workAuthorization: null, clientName: null,
        responsibilities: [], requirements: [],
      };

      if (!jsonMatch) {
        logger.warn('AI JD parse failed to return JSON, falling back to regex extraction');
        return { ...fallback, ...this._regexExtractJD(jdText) };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Never override manually-supplied client name
      const resolvedClientName = manualClientName || parsed.clientName || null;

      return {
        title: parsed.title || null,
        description: parsed.description || jdText.substring(0, 500),
        requiredSkills: Array.isArray(parsed.requiredSkills) ? parsed.requiredSkills.filter(s => typeof s === 'string') : [],
        preferredSkills: Array.isArray(parsed.preferredSkills) ? parsed.preferredSkills.filter(s => typeof s === 'string') : [],
        mandatorySkills: Array.isArray(parsed.mandatorySkills) ? parsed.mandatorySkills.filter(s => typeof s === 'string') : [],
        minExperience: typeof parsed.minExperience === 'number' ? Math.max(0, parsed.minExperience) : 0,
        maxExperience: typeof parsed.maxExperience === 'number' ? parsed.maxExperience : null,
        department: parsed.department || null,
        location: parsed.location || null,
        country: parsed.country || null,
        contractType: parsed.contractType || null,
        contractDuration: parsed.contractDuration || null,
        salaryMin: typeof parsed.salaryMin === 'number' ? parsed.salaryMin : null,
        salaryMax: typeof parsed.salaryMax === 'number' ? parsed.salaryMax : null,
        salaryCurrency: parsed.salaryCurrency || 'MYR',
        salaryFrequency: parsed.salaryFrequency || 'monthly',
        workAuthorization: parsed.workAuthorization || null,
        clientName: resolvedClientName,
        responsibilities: Array.isArray(parsed.responsibilities) ? parsed.responsibilities : [],
        requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
      };
    } catch (error) {
      logger.error('AI JD parse error', error);
      return {
        title: null, description: jdText.substring(0, 500),
        requiredSkills: [], preferredSkills: [], mandatorySkills: [],
        minExperience: 0, maxExperience: 0,
        department: null, location: null, country: null,
        contractType: null, contractDuration: null,
        salaryMin: null, salaryMax: null, salaryCurrency: 'MYR', salaryFrequency: 'monthly',
        workAuthorization: null, clientName: null,
        responsibilities: [], requirements: [],
      };
    }
  }

  /**
   * Regex-based fallback JD field extractor for when AI fails
   */
  _regexExtractJD(text) {
    const result = {};

    // Salary detection
    const salaryPatterns = [
      /(?:RM|MYR)\s*([\d,]+)\s*(?:[-–]\s*(?:RM|MYR)?\s*([\d,]+))?/i,
      /([\d,]+)\s*(?:[-–]\s*([\d,]+))?\s*(?:monthly|per month|\/month)/i,
      /([\d]+)k\s*(?:[-–]\s*([\d]+)k)?/i,
    ];
    for (const p of salaryPatterns) {
      const m = text.match(p);
      if (m) {
        const raw1 = m[1].replace(/,/g, '');
        const raw2 = m[2] ? m[2].replace(/,/g, '') : null;
        const mult = raw1.length <= 2 ? 1000 : 1; // "8k" → 8000
        result.salaryMin = parseInt(raw1) * mult;
        if (raw2) result.salaryMax = parseInt(raw2) * mult;
        break;
      }
    }

    // Experience detection
    const expMatch = text.match(/(\d+)\s*(?:\+|-\s*(\d+))?\s*years?\s*(?:of\s*)?(?:experience|exp)/i)
      || text.match(/(?:minimum|min|at least)\s*(\d+)\s*years?/i);
    if (expMatch) {
      result.minExperience = parseInt(expMatch[1]);
      if (expMatch[2]) result.maxExperience = parseInt(expMatch[2]);
    }

    // Contract type
    if (/\bpermanent\b|\bfull.?time\b/i.test(text)) result.contractType = 'PERMANENT';
    else if (/\bcontract\b/i.test(text)) result.contractType = 'CONTRACT';
    else if (/\bfreelance\b/i.test(text)) result.contractType = 'FREELANCE';
    else if (/\bintern(ship)?\b/i.test(text)) result.contractType = 'INTERNSHIP';

    // Duration
    const durMatch = text.match(/(\d+)\s*(?:months?|years?)\s*(?:contract|renewable|duration)?/i);
    if (durMatch) result.contractDuration = durMatch[0].trim();

    return result;
  }

  /**
   * Generate Boolean search string from job details
   * Phase 1: proper Boolean string with skills count
   */
  generateBooleanSearch(jobTitle, mandatorySkills = [], preferredSkills = [], requiredSkills = [], location = null, contractType = null) {
    const allSkills = [...new Set([...mandatorySkills, ...requiredSkills])];
    const preferred = [...new Set(preferredSkills)];

    const titlePart = jobTitle ? `"${jobTitle}"` : '';
    const mandatoryPart = allSkills.length
      ? `(${allSkills.map(s => `"${s}"`).join(' AND ')})`
      : '';
    const preferredPart = preferred.length
      ? `(${preferred.map(s => `"${s}"`).join(' OR ')})`
      : '';
    const locationPart = location ? `"${location}"` : '';
    const exclusions = 'NOT (Intern OR Internship OR "Junior" OR Trainee)';

    const parts = [titlePart, mandatoryPart, preferredPart, locationPart]
      .filter(Boolean);

    const booleanStr = parts.join(' AND ') + (parts.length ? ` ${exclusions}` : exclusions);

    const skillsIncluded = allSkills.length + preferred.length;

    return { booleanSearchString: booleanStr, skillsIncluded };
  }

  /**
   * Generic text generation — used by the AI writing assistant
   */
  async generateText(prompt) {
    const response = await openai.chat.completions.create({
      model: config.OPENROUTER_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.6,
    });
    return response.choices[0]?.message?.content?.trim() || '';
  }

  async generateTextWithSystem(systemPrompt, userPrompt) {
    const response = await openai.chat.completions.create({
      model: config.OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.6,
    });
    return response.choices[0]?.message?.content?.trim() || '';
  }
}

module.exports = new AIService();
