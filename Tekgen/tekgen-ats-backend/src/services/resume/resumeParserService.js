const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');
const logger = require('../../utils/logger');

class ResumeParserService {
  /**
   * Extract text from PDF file
   */
  async extractTextFromPDF(filePath) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(fileBuffer);
      return data.text;
    } catch (error) {
      logger.error('PDF extraction error', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Extract text from DOCX file
   */
  async extractTextFromDOCX(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      logger.error('DOCX extraction error', error);
      throw new Error('Failed to extract text from DOCX');
    }
  }

  /**
   * Extract contact information from resume text.
   * Supports Malaysia, India, Indonesia, Singapore, Philippines,
   * Sri Lanka, Bangladesh, Pakistan and generic international formats.
   */
  extractContactInfo(text) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex) || [];

    // ── Phone extraction (mobile-first, avoids landline/fax/home) ─────────
    let phone = null;
    const cleanPhone = (s) => s.trim().replace(/[^\d+\s\-]/g, '').replace(/[\s]{2,}/g, ' ').trim();
    const digitsOnly = (s) => s.replace(/\D/g, '');
    const looksMobile = (value) => {
      const d = digitsOnly(value);
      // MY mobile: +601x / 01x
      if (/^(60)?1[0-9]/.test(d) && d.length >= 10 && d.length <= 12) return true;
      // IN mobile: 10 digits starts 6-9
      if (/^[6-9]\d{9}$/.test(d)) return true;
      // Generic mobile-ish fallback
      return d.length >= 10 && d.length <= 15;
    };

    const labeledRegex = /(?:phone|mobile|tel(?:ephone)?|h\/p|hp|handphone|cell(?:phone)?|contact\s*no\.?|whatsapp|office|landline|home|fax)\s*(?:no\.?|number|num|#)?\s*[:\-–]?\s*([\+\d][\d\s\-\.\(\)]{6,22})/gi;
    const labeledCandidates = [];
    let lm;
    while ((lm = labeledRegex.exec(text)) !== null) {
      const full = lm[0].toLowerCase();
      const raw = cleanPhone(lm[1]);
      if (!raw) continue;
      if (/(fax|landline|home|office)/.test(full)) continue;
      if (!looksMobile(raw)) continue;
      let score = 10;
      if (/(mobile|whatsapp|handphone|cell|h\/p|\bhp\b)/.test(full)) score += 30;
      labeledCandidates.push({ raw, score });
    }
    if (labeledCandidates.length) {
      labeledCandidates.sort((a, b) => b.score - a.score);
      phone = labeledCandidates[0].raw;
    }

    // Unlabeled mobile formats
    if (!phone) {
      const candidates = [];
      const patterns = [
        /\b0(?:1[0-9])[\s\-\.]?\d{3,4}[\s\-\.]?\d{4}\b/g, // MY local mobile only
        /\b60[\s\-]?1[0-9][\s\-]?\d{3,4}[\s\-]?\d{4}\b/g, // MY with 60 prefix
        /\+\d{1,3}[\s\-]?\(?\d{1,4}\)?[\s\-]?\d{2,4}[\s\-]?\d{3,5}[\s\-]?\d{0,5}/g, // intl
        /\b[6-9]\d{4}[\s\-]?\d{5}\b/g, // IN local mobile
      ];
      for (const re of patterns) {
        let m;
        while ((m = re.exec(text)) !== null) {
          const raw = cleanPhone(m[0]);
          if (looksMobile(raw)) candidates.push(raw);
        }
      }
      if (candidates.length) phone = candidates[0];
    }

    // normalize MY `60...` to `+60...`
    if (phone && /^60/.test(phone) && !phone.startsWith('+')) {
      phone = `+${phone}`;
    }

    return {
      email: emails[0] || null,
      phone,
    };
  }

  /**
   * Extract Malaysian IC number (YYMMDD-PB-NNNG) and decode DOB + gender
   */
  extractIcInfo(text) {
    // IC format: 123456-78-9012 or 123456789012 (12 digits)
    const icDash = text.match(/\b(\d{6})-(\d{2})-(\d{4})\b/);
    const icPlain = text.match(/\bic\s*(?:no\.?|number|#)?\s*[:\-]?\s*(\d{12})\b/i);

    let icNumber = null;
    let dob = null;
    let gender = null;

    if (icDash) {
      const raw = icDash[0];
      icNumber = raw;
      // Decode DOB from first 6 digits
      const yy = parseInt(icDash[1].substring(0, 2));
      const mm = parseInt(icDash[1].substring(2, 4));
      const dd = parseInt(icDash[1].substring(4, 6));
      const year = yy <= 25 ? 2000 + yy : 1900 + yy; // 2026 cutoff
      if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
        dob = new Date(Date.UTC(year, mm - 1, dd));
      }
      // Decode gender from last digit of 4th group
      const lastDigit = parseInt(icDash[3].charAt(3));
      gender = lastDigit % 2 === 0 ? 'FEMALE' : 'MALE';
    } else if (icPlain) {
      const raw = icPlain[1];
      icNumber = `${raw.substring(0,6)}-${raw.substring(6,8)}-${raw.substring(8)}`;
      const yy = parseInt(raw.substring(0, 2));
      const mm = parseInt(raw.substring(2, 4));
      const dd = parseInt(raw.substring(4, 6));
      const year = yy <= 25 ? 2000 + yy : 1900 + yy;
      if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
        dob = new Date(Date.UTC(year, mm - 1, dd));
      }
      const lastDigit = parseInt(raw.charAt(11));
      gender = lastDigit % 2 === 0 ? 'FEMALE' : 'MALE';
    }

    return { icNumber, dob, gender };
  }

  /**
   * Extract passport number (expat)
   */
  extractPassportNumber(text) {
    // Malaysian passport: A + 8 digits. Generic: 1-2 letters + 6-9 digits
    const passportMatch = text.match(/\bpassport\s*(?:no\.?|number|#)?\s*[:\-]?\s*([A-Z]{1,2}[0-9]{6,9})\b/i)
      || text.match(/\b([A-Z]{1,2}[0-9]{7,9})\b/);
    return passportMatch ? passportMatch[1].toUpperCase() : null;
  }

  /**
   * Extract nationality from resume text
   */
  extractNationality(text) {
    const match = text.match(/(?:nationality|citizenship|citizen)\s*[:\-]\s*([A-Za-z\s]{2,40})/i);
    if (match) return match[1].trim().replace(/\s+/g, ' ');
    // Common phrases
    if (/\bmalaysian\b/i.test(text)) return 'Malaysian';
    if (/\bsingaporean\b/i.test(text)) return 'Singaporean';
    if (/\bindian\b.*\bcitizen\b|\bcitizen\b.*\bindian\b/i.test(text)) return 'Indian';
    if (/\bindonesian\b/i.test(text)) return 'Indonesian';
    if (/\bphilippine\b|\bfilipino\b/i.test(text)) return 'Filipino';
    if (/\bbangladeshi\b/i.test(text)) return 'Bangladeshi';
    if (/\bpakistani\b/i.test(text)) return 'Pakistani';
    return null;
  }

  /**
   * Extract date of birth explicitly stated in resume
   */
  extractDob(text) {
    const patterns = [
      /(?:date of birth|dob|born|d\.o\.b)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /(?:date of birth|dob|born|d\.o\.b)\s*[:\-]?\s*(\d{1,2}\s+\w+\s+\d{4})/i,
    ];
    for (const pat of patterns) {
      const m = text.match(pat);
      if (m) {
        const parsed = new Date(m[1]);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }
    return null;
  }

  /**
   * Extract gender when explicitly stated
   */
  extractGender(text) {
    const m = text.match(/(?:gender|sex)\s*[:\-]\s*(male|female|m|f)\b/i);
    if (!m) return null;
    const v = m[1].toLowerCase();
    return v === 'm' ? 'MALE' : v === 'f' ? 'FEMALE' : v.toUpperCase();
  }

  /**
   * Extract marital status
   */
  extractMaritalStatus(text) {
    const m = text.match(/(?:marital\s+status|married|relationship\s+status)\s*[:\-]?\s*(single|married|divorced|widowed|separated)/i);
    if (m) return m[1].toUpperCase();
    if (/\bsingle\b/i.test(text)) return 'SINGLE';
    if (/\bmarried\b/i.test(text)) return 'MARRIED';
    return null;
  }

  /**
   * Extract name from resume — handles styled/multi-column resumes correctly.
   *
   * Priority order:
   *  1. Explicit "Name:" label  (structured resumes)
   *  2. ALL-CAPS pure-alpha line (styled/designed templates — e.g. "MUHAMAD DANIAL MAHMAD KISIM")
   *  3. Title-Case or mixed-case line passing all noise filters
   *  4. Broad fallback
   */
  extractName(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // ── Shared noise detectors ──────────────────────────────────────────────
    const labelPattern = /^(?:name|full\s*name|candidate\s*name|applicant\s*name|contact\s*name)\s*[:\-–]\s*/i;

    const sectionKeyword = /^(profile|summary|objective|skills|experience|education|contact|address|phone|email|mobile|references|achievements|hobbies|languages|certifications|awards|projects|work\s+history|personal\s+details|information|highlights|qualifications|career|about|introduction|key\s+achievement|key\s+skills|technical\s+skills|professional\s+summary|work\s+experience|employment|declaration|activities|volunteer|training|publications|curriculum\s+vitae|resume|c\.v\.|bio|linkedin|github|website|portfolio|job\s+title|current\s+address|current\s+position|current\s+role|personal\s+information|personal\s+info|contact\s+information|contact\s+no|contact\s+details|certification|certifications|declaration|accomplishments|professional\s+background|career\s+objective|career\s+summary|profile\s+summary|executive\s+summary|candidate|applicant|curriculum|vitae)s?\b/i;

    // Known ALL-CAPS two-word section headers to exclude from name detection
    const capsSection = /^(WORK EXPERIENCE|WORK HISTORY|PERSONAL DETAILS|CONTACT DETAILS|CONTACT INFORMATION|KEY SKILLS|TECHNICAL SKILLS|SOFT SKILLS|PROFESSIONAL SUMMARY|CAREER OBJECTIVE|CAREER SUMMARY|EXECUTIVE SUMMARY|ABOUT ME|JOB TITLE|CURRENT POSITION|EMPLOYMENT HISTORY|PERSONAL INFORMATION|PROFILE SUMMARY|CORE COMPETENCIES|AREAS OF EXPERTISE|PROFESSIONAL EXPERIENCE|EDUCATIONAL BACKGROUND|ACADEMIC BACKGROUND)$/;

    // Address indicators — covers MY states, address fragments, digit-comma patterns
    const looksLikeAddress = /\b(no\.|lot\s|jalan|jln|taman|kl\b|kuala\s+lumpur|petaling|subang|selangor|malaysia|singapore|indonesia|bangalore|chennai|mumbai|delhi|block|floor|level|street|road|avenue|drive|lane|city|state|zip|postcode|wangsa|maju|cheras|puchong|klang|rawang|shah\s+alam|ampang|damansara|bangsar|mont\s+kiara|cyberjaya|putrajaya|penang|johor|kedah|kelantan|perak|pahang|terengganu|perlis|sabah|sarawak|negeri\s+sembilan|melaka|malacca|labuan|\bsik\b|kampung|kampong|kg\.\s|batu\s+\d)\b|\d+\s*,\s*[a-z]|,\s*\d+/i;

    const looksLikeContact = /[@\+\(\)]|^\d|\btel\b|\bfax\b|\bwww\b|^http/i;
    const looksLikeCompany = /\b(sdn\.?\s*bhd|berhad|pte\.?\s*ltd|inc\.|corp\.|llc|limited|pvt|private|technologies|solutions|services|consulting|group|holdings)\b/i;
    const hasDegree = /\b(bachelor|master|phd|diploma|b\.sc|m\.sc|b\.eng|mba|llb|foundation|sijil|maktab|universiti|university|college|institute|school)\b/i;
    const looksLikeDate = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})\b/i;
    const looksLikeJobTitle = /^(senior|junior|lead|principal|staff|chief|head|director|manager|engineer|developer|analyst|architect|consultant|specialist|executive|officer|associate|coordinator|administrator|technician|intern|fresher|experienced|skilled|result|hands-on|motivated|dynamic|proactive|data|business|information|project|product|sales|marketing|finance|financial|operations|operation|human|customer|account|digital|corporate|strategic|global|regional|national|technical|quality|supply|procurement|legal|compliance|risk|audit|software|hardware|network|security|cloud|research|design|creative|content|media|communications?|public|government|policy|program|service|support|field|medical|clinical|health|manufacturing|production|warehouse|inventory|administration|management)\b/i;
    const endsInPunctuationOrDigit = /[.,;:!?\d]$/;
    const looksLikeInfraCompany = /\b(water|energy|power|electric|telecom|networks?|systems?|solutions?|technologies|services?|consulting|construction|transport|logistics|oil|gas|mining|utilities?)\b/i;
    // Lines with 2+ commas are almost certainly address parts ("Batu 5, Sik, Kedah")
    const hasMultipleCommas = (s) => (s.match(/,/g) || []).length >= 2;

    // Helper: convert ALL-CAPS to Title Case
    const toTitleCase = (s) => s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    // A line is name-like if it's mostly alphabetic (names can have hyphens, apostrophes)
    const isNameLike = (s) => s.replace(/[^a-zA-Z\s\-']/g, '').length / s.length >= 0.85;
    // Allow up to 8 words — handles long South Asian / Malay names like "Muhamad Danial Bin Mahmad Kisim"
    const hasReasonableWordCount = (s) => { const w = s.trim().split(/\s+/); return w.length >= 1 && w.length <= 8; };

    // ── PRIORITY 1: Explicit name label ─────────────────────────────────────
    for (const line of lines.slice(0, 20)) {
      if (!labelPattern.test(line)) continue;
      const stripped = line.replace(labelPattern, '').trim();
      if (stripped.length >= 2 && stripped.length <= 80 && isNameLike(stripped) && hasReasonableWordCount(stripped)) {
        return stripped;
      }
    }

    // ── PRIORITY 2: ALL-CAPS pure-alpha name header ─────────────────────────
    // Very common in designed/templated resumes: "MUHAMAD DANIAL MAHMAD KISIM"
    // Search up to 60 lines — two-column PDFs often dump contact info before the name.
    for (const line of lines.slice(0, 60)) {
      if (line.length < 4 || line.length > 80) continue;
      // Must be purely uppercase letters, spaces, hyphens, apostrophes
      if (!/^[A-Z][A-Z\s\-']+$/.test(line)) continue;
      const words = line.trim().split(/\s+/);
      if (words.length < 2 || words.length > 8) continue;
      if (capsSection.test(line.trim())) continue;
      if (words.length === 1 && sectionKeyword.test(words[0])) continue;
      // Single generic word like "CONTACT", "PROFILE" — skip
      if (words.length === 1) continue;
      return toTitleCase(line.trim());
    }

    // ── PRIORITY 3: Heuristic scan (first 15 lines) ─────────────────────────
    for (const line of lines.slice(0, 15)) {
      if (line.length < 2 || line.length > 80) continue;
      if (sectionKeyword.test(line)) continue;
      if (looksLikeAddress.test(line)) continue;
      if (hasMultipleCommas(line)) continue;
      if (looksLikeContact.test(line)) continue;
      if (looksLikeCompany.test(line)) continue;
      if (hasDegree.test(line)) continue;
      if (looksLikeDate.test(line)) continue;
      if (looksLikeJobTitle.test(line)) continue;
      if (endsInPunctuationOrDigit.test(line)) continue;
      if (looksLikeInfraCompany.test(line)) continue;
      if (!hasReasonableWordCount(line)) continue;
      if (!isNameLike(line)) continue;
      return line;
    }

    // ── PRIORITY 4: Broad fallback (first 25 lines) ─────────────────────────
    for (const line of lines.slice(0, 25)) {
      if (!line || line.length < 2 || line.length > 80) continue;
      if (sectionKeyword.test(line)) continue;
      if (looksLikeContact.test(line)) continue;
      if (looksLikeAddress.test(line)) continue;
      if (hasMultipleCommas(line)) continue;
      if (looksLikeCompany.test(line)) continue;
      if (looksLikeJobTitle.test(line)) continue;
      if (hasDegree.test(line)) continue;
      if (looksLikeDate.test(line)) continue;
      if (endsInPunctuationOrDigit.test(line)) continue;
      if (!isNameLike(line)) continue;
      if (!hasReasonableWordCount(line)) continue;
      const stripped = line.replace(labelPattern, '').trim();
      if (stripped.length >= 2) return stripped;
    }
    return null;
  }

  /**
   * Compute parser confidence (0.0 - 1.0) based on extracted fields
   */
  _computeConfidence(parsed) {
    let score = 0;
    const fields = ['name', 'email', 'phone', 'experience'];
    fields.forEach(f => { if (parsed[f]) score += 0.2; });
    if (parsed.education && parsed.education.length > 0) score += 0.1;
    if (parsed.currentRole) score += 0.1;
    // Penalise if name contains label-like words
    if (parsed.name && /^(name|contact|candidate|applicant)\s*:/i.test(parsed.name)) score -= 0.3;
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Extract location — returns CITY or STATE only (short, clean).
   * Examples: "Penang", "Kuala Lumpur", "KL", "Selangor", "Singapore"
   * Recruiters enter the full address manually via the form.
   */
  extractLocation(text) {
    const cleanCity = (s) => s.trim().replace(/\s+/g, ' ').replace(/[,;.\s]+$/, '');
    const isValidCity = (s) => s.length >= 2 && s.length <= 60 && !/^(yes|no|na|n\/a|nil|none|-+)$/i.test(s);

    // City / state / country recognition regex — ordered so more specific comes first
    const cityRe = /\b(Kuala\s+Lumpur|KL\b|Petaling\s+Jaya|PJ\b|Subang\s+Jaya|Shah\s+Alam|Klang|Cheras|Ampang|Damansara|Bangsar|Mont\s+Kiara|Cyberjaya|Putrajaya|Puchong|Wangsa\s+Maju|Rawang|Penang|Butterworth|George\s+Town|Johor\s+Bahru|JB\b|Kota\s+Kinabalu|KK\b|Kuching|Ipoh|Seremban|Melaka|Malacca|Kota\s+Bharu|Alor\s+Setar|Miri|Sibu|Sandakan|Batu\s+Pahat|Kajang|Nilai|Sepang|Selangor|Kedah|Kelantan|Perak|Pahang|Terengganu|Perlis|Sabah|Sarawak|Negeri\s+Sembilan|Labuan|Malaysia|Singapore|Bangalore|Bengaluru|Chennai|Madras|Mumbai|Bombay|New\s+Delhi|Delhi|Hyderabad|Pune|Kolkata|Calcutta|Noida|Gurgaon|Gurugram|Ahmedabad|Coimbatore|Kochi|Thiruvananthapuram|Jaipur|Chandigarh|Lucknow|Nagpur|Indore|Bhopal|Visakhapatnam|Vadodara|Surat|Patna|India|Jakarta|Surabaya|Bandung|Medan|Semarang|Makassar|Palembang|Tangerang|Depok|Bekasi|Yogyakarta|Indonesia|Manila|Cebu|Davao|Quezon\s+City|Pasig|Makati|Taguig|Philippines|Colombo|Kandy|Galle|Sri\s+Lanka|Dhaka|Chittagong|Sylhet|Bangladesh|Karachi|Lahore|Islamabad|Rawalpindi|Faisalabad|Pakistan|Dubai|Abu\s+Dhabi|Sharjah|UAE|Bangkok|Chiang\s+Mai|Thailand|Hanoi|Ho\s+Chi\s+Minh|Vietnam|Yangon|Myanmar|Kathmandu|Nepal)\b/i;

    // Helper: extract the city name from any string (labeled value or full address line)
    const extractCityFromStr = (s) => {
      const m = s.match(cityRe);
      return m ? cleanCity(m[0]) : null;
    };

    // 1) Explicit city/location label — extract just the city part from the value
    const cityLabels = [
      /(?:location|current\s+location|base\s+location|present\s+location|city|town|district)\s*[:\-–]\s*([^\n,;]{2,80})/i,
      /(?:based\s+(?:in|at)|residing\s+(?:in|at)|living\s+(?:in|at))\s*[:\-–]?\s*([^\n,;]{2,60})/i,
      /(?:state|province|region)\s*[:\-–]\s*([^\n,;]{2,60})/i,
    ];
    for (const p of cityLabels) {
      const m = text.match(p);
      if (m) {
        const raw = cleanCity(m[1].split('\n')[0]);
        // Return just the recognized city from the value
        const city = extractCityFromStr(raw);
        if (city && isValidCity(city)) return city;
        // If no known city but value is short enough, return it directly
        if (raw.length >= 2 && raw.length <= 40 && !/^(yes|no|na|n\/a)$/i.test(raw)) return raw;
      }
    }

    // 2) Address label — find city keyword inside the full address string
    const addrLabel = text.match(/(?:(?:current|home|residential|mailing|permanent)\s+)?address\s*[:\-–]\s*([^\n]{5,200})/i);
    if (addrLabel) {
      const city = extractCityFromStr(addrLabel[1]);
      if (city && isValidCity(city)) return city;
    }

    // 3) Postcode pattern → extract city after the postcode
    const postcodeMatch = text.match(/\b\d{5,6}\b[,\s]+([A-Za-z][A-Za-z\s]{2,40})/);
    if (postcodeMatch) {
      const city = extractCityFromStr(postcodeMatch[1]) || cleanCity(postcodeMatch[1]);
      if (city && isValidCity(city)) return city;
    }

    // 4) Direct city/state scan in top 2500 chars
    const topText = text.substring(0, 2500);
    const directMatch = topText.match(cityRe);
    if (directMatch) return cleanCity(directMatch[0]);

    return null;
  }

  /**
   * Extract current job title / role from resume.
   * Tries labeled fields first, then infers from work experience section.
   */
  extractCurrentRole(text) {
    const clean = (s) => s.trim().split('\n')[0].trim().replace(/\s+/g, ' ');
    const isValidRole = (s) =>
      s.length >= 3 && s.length <= 100 &&
      !/^\d{4}/.test(s) &&          // not a year
      !/@/.test(s) &&               // not email
      !/^(and|or|the|a|an)\b/i.test(s); // not a conjunction

    // 1) Explicit labeled current role fields
    const labeled = [
      /current\s+(?:position|role|title|designation|job)\s*[:\-–]\s*(.+)/i,
      /(?:position|designation|job\s+title|title|role)\s*[:\-–]\s*(.+)/i,
      /applying\s+(?:for|as)\s*[:\-–]?\s*(.+)/i,
      /(?:currently\s+working\s+as|working\s+as|presently\s+working\s+as)\s*[:\-–]?\s*(.+)/i,
      /(?:professional\s+title|current\s+designation)\s*[:\-–]\s*(.+)/i,
    ];
    for (const p of labeled) {
      const m = text.match(p);
      if (m) {
        const val = clean(m[1]);
        if (isValidRole(val)) return val;
      }
    }

    // 2) Infer from work experience section — look for the first job-title-like line
    //    after the section header, before a company / date line
    const expSectionMatch = text.match(
      /(?:work\s+experience|employment\s+(?:history|record)|professional\s+experience|experience|career\s+(?:history|summary))\s*[:\-–]?\s*\n+([\s\S]{0,2500})/i
    );
    if (expSectionMatch) {
      const jobTitleRe = /^(?:senior|junior|lead|principal|staff|chief|head|vp|vice\s+president|director|manager|engineer|developer|analyst|architect|consultant|specialist|executive|officer|associate|coordinator|administrator|technician|intern|software|data|it\b|systems?|network|security|web|mobile|full[\s-]?stack|back[\s-]?end|front[\s-]?end|cloud|devops|product|project|program|account|sales|hr\b|business|finance|marketing|operations|quality|qa\b|test)/i;
      const lines = expSectionMatch[1].split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of lines.slice(0, 10)) {
        if (jobTitleRe.test(line) && isValidRole(line)) return line;
      }
    }

    // 3) Look near the top of the resume for a job title line (common in modern CVs)
    //    Usually appears in the header: Name → Job Title → Contact Info
    const headerLines = text.split('\n').slice(0, 20).map(l => l.trim()).filter(Boolean);
    const headerJobRe = /^(?:senior|junior|lead|principal|staff|chief|head|director|manager|software|data|systems?|network|security|web|mobile|full[\s-]?stack|cloud|devops|product|project|business|marketing|operations|qa\b|quality|finance|hr\b|account|sales)[\s\w&\/\-,]{2,80}$/i;
    for (const line of headerLines) {
      if (headerJobRe.test(line) && isValidRole(line) && !/@/.test(line)) {
        return line;
      }
    }

    return null;
  }

  /**
   * Extract current/most recent company name
   */
  extractCurrentCompany(text) {
    const patterns = [
      /current\s+(?:company|employer|organization|organisation)\s*[:\-]\s*(.+)/i,
      /employer\s*[:\-]\s*(.+)/i,
      /company\s*[:\-]\s*(.+)/i,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) {
        const val = m[1].trim().split('\n')[0].trim();
        if (val.length >= 2 && val.length <= 100) return val;
      }
    }
    return null;
  }

  /**
   * Compute SHA-256 hash of file buffer for deduplication
   */
  _hashBuffer(buffer) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Extract education — returns highest degree + any additional professional certs.
   * Does NOT return every line that mentions a university name.
   */
  extractEducation(text) {
    // ── Degree hierarchy (higher index = higher level) ──────────────────────
    const DEGREE_LEVELS = [
      { level: 0, re: /\b(spm|ssce|o[- ]level|secondary\s+school|high\s+school|ssc|igcse)\b/i, label: 'Secondary' },
      { level: 1, re: /\b(stpm|a[- ]level|pre[- ]university|matriculation|foundation|hsc|pre-u)\b/i, label: 'Pre-University' },
      { level: 2, re: /\b(diploma|hnd|higher\s+national\s+diploma|advanced\s+diploma|associate\s+degree)\b/i, label: 'Diploma' },
      { level: 3, re: /\b(bachelor|b\.?sc|b\.?eng|b\.?tech|b\.?a\b|b\.?e\b|b\.?s\b|llb|undergraduate|degree\s+in|bachelor'?s)\b/i, label: 'Bachelor' },
      { level: 4, re: /\b(master|m\.?sc|m\.?eng|m\.?tech|m\.?a\b|m\.?s\b|mba|postgraduate|master'?s)\b/i, label: 'Master' },
      { level: 5, re: /\b(ph\.?d|doctorate|doctor\s+of\s+philosophy|d\.?phil)\b/i, label: 'PhD' },
    ];

    // Professional cert keywords (separately tracked)
    // Keep this STRICT. Do NOT match generic words like "training" (too noisy).
    const CERT_RE = /\b(certified|certificate(?:\s+in)?|certification|professional\s+cert|pmp|aws\s+certified|google\s+certified|microsoft\s+certified|cisco|ccna|ccnp|ceh|cpa|acca|cima|cfa|hrdf|iso\s+\d|six\s+sigma|prince2|itil|comptia|cissp|cism|oracle\s+certified|java\s+certified|azure\s+certified|gcp\s+certified)\b/i;

    // Lines that are clearly NOT education (section headers, summaries, etc.)
    const NOISE_RE = /^(about|profile|summary|objective|skills|experience|contact|references|achievements|hobbies|languages|projects|work\s+history|personal|declaration|activities|volunteer|training|publications|career|introduction|highlights|qualifications|employment|accomplishments|background|overview|executive|curriculum|vitae|resume|responsibilities|duties|key\s+skills|technical\s+skills|soft\s+skills|professional\s+summary|areas\s+of\s+expertise|core\s+competencies)\b/i;

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length >= 6 && l.length <= 250);

    let highestDegree = null;
    let highestLevel = -1;
    const certs = [];

    for (const line of lines) {
      // Skip obvious noise lines
      if (NOISE_RE.test(line)) continue;
      // Skip long sentence-like lines (common false positives)
      if (line.length > 120) continue;
      if ((line.match(/[.?!]/g) || []).length >= 2) continue;
      // Reject motivational sentences that are not education
      if (/\b(opportunity|persistence|family|hardworking|team\s+player|self[-\s]?motivated|objective)\b/i.test(line)) continue;
      // Skip lines that look like job descriptions (too many action verbs, no edu keywords)
      if (/^(developed|managed|led|responsible|worked|handled|created|designed|built|implemented|maintained|assisted|supported|ensured|provided|coordinated|performed|reported|analysed|analyzed)\b/i.test(line)) continue;

      // Check for professional certificates (collect all unique ones)
      if (CERT_RE.test(line) && !/bachelor|master|phd|diploma/i.test(line)) {
        certs.push(line);
        continue;
      }

      // Check degree levels
      for (const d of DEGREE_LEVELS) {
        if (d.re.test(line)) {
          if (d.level > highestLevel) {
            highestLevel = d.level;
            highestDegree = line;
          }
          break;
        }
      }
    }

    const result = [];
    if (highestDegree) result.push(highestDegree);
    // Add unique certs (up to 5 to avoid noise)
    const uniqueCerts = [...new Set(certs)].slice(0, 5);
    result.push(...uniqueCerts);

    return result;
  }

  /**
   * Extract experience years — extended pattern matching + work history calculation
   */
  extractExperienceYears(text) {
    const patterns = [
      // "8+ years of experience", "8 years work experience", "8 yrs of professional experience"
      /(\d{1,2})\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:work\s+|professional\s+|industry\s+|relevant\s+|total\s+)?experience/gi,
      // "experience: 8 years", "experience of 8 years"
      /experience\s*(?:of\s+)?[:\-]\s*(\d{1,2})\+?\s*(?:years?|yrs?)/gi,
      // "total experience: 8 years", "total work experience 5 yrs"
      /total\s+(?:work\s+|professional\s+)?experience\s*[:\-]?\s*(\d{1,2})\+?\s*(?:years?|yrs?)/gi,
      // "8 years in software", "5 years in the field"
      /(\d{1,2})\+?\s*(?:years?|yrs?)\s+(?:in\s+|working\s+)/gi,
      // "exp: 8 years", "exp.: 5 yrs"
      /\bexp(?:erience)?\.?\s*[:\-]\s*(\d{1,2})\s*(?:years?|yrs?)/gi,
      // "8 years as a developer"
      /(\d{1,2})\+?\s*(?:years?|yrs?)\s+as\s+/gi,
    ];

    let maxExp = null;
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const num = parseInt(match[1]);
        if (!isNaN(num) && num >= 0 && num < 60) {
          maxExp = maxExp === null ? num : Math.max(maxExp, num);
        }
      }
    }

    if (maxExp !== null) return maxExp;

    // Fallback: calculate from employment year ranges (e.g. "2015 – 2020", "2018 - Present")
    const rangeRe = /(\d{4})\s*[-–—]\s*(\d{4}|present|current|now|till\s+date|to\s+date)/gi;
    const currentYear = new Date().getFullYear();
    const seenPairs = new Set();
    let totalMonths = 0;
    let match;
    rangeRe.lastIndex = 0;
    while ((match = rangeRe.exec(text)) !== null) {
      const start = parseInt(match[1]);
      const end = /\d{4}/.test(match[2]) ? parseInt(match[2]) : currentYear;
      if (start >= 1970 && start <= currentYear && end >= start && end <= currentYear + 1) {
        const key = `${start}-${end}`;
        if (!seenPairs.has(key)) {
          seenPairs.add(key);
          totalMonths += (end - start) * 12;
        }
      }
    }
    if (totalMonths > 0) return Math.round(totalMonths / 12);

    return null;
  }

  /**
   * Parse resume text from plain text input
   */
  async parseText(text) {
    try {
      const contactInfo = this.extractContactInfo(text);
      const name = this.extractName(text);
      const education = this.extractEducation(text);
      const experience = this.extractExperienceYears(text);
      const icInfo = this.extractIcInfo(text);
      const passportNumber = this.extractPassportNumber(text);
      const nationality = this.extractNationality(text);
      const dobExplicit = this.extractDob(text);
      const genderExplicit = this.extractGender(text);
      const maritalStatus = this.extractMaritalStatus(text);
      const currentRole = this.extractCurrentRole(text);
      const currentCompany = this.extractCurrentCompany(text);
      const location = this.extractLocation(text);

      const parsed = {
        fullText: text,
        email: contactInfo.email,
        phone: contactInfo.phone,
        name,
        education,
        experience,
        currentRole,
        currentCompany,
        location,
        icNumber: icInfo.icNumber,
        passportNumber,
        nationality,
        dob: dobExplicit || icInfo.dob || null,
        gender: genderExplicit || icInfo.gender || null,
        maritalStatus,
      };

      parsed.confidence = this._computeConfidence(parsed);
      parsed.parsingStatus = parsed.confidence >= 0.4 ? 'COMPLETE' : 'NEEDS_REVIEW';

      return parsed;
    } catch (error) {
      logger.error('Resume text parsing error', error);
      throw new Error('Failed to parse resume text');
    }
  }

  /**
   * Parse complete resume
   */
  async parseResume(filePath) {
    try {
      let resumeText = '';
      const extension = filePath.split('.').pop().toLowerCase();

      if (extension === 'pdf') {
        resumeText = await this.extractTextFromPDF(filePath);
      } else if (extension === 'docx' || extension === 'doc') {
        resumeText = await this.extractTextFromDOCX(filePath);
      } else if (extension === 'txt' || extension === 'csv') {
        resumeText = fs.readFileSync(filePath, 'utf-8');
      } else {
        throw new Error('Unsupported file format. Supported: PDF, DOC, DOCX, TXT, CSV.');
      }

      const contactInfo = this.extractContactInfo(resumeText);
      const name = this.extractName(resumeText);
      const education = this.extractEducation(resumeText);
      const experience = this.extractExperienceYears(resumeText);
      const icInfo = this.extractIcInfo(resumeText);
      const passportNumber = this.extractPassportNumber(resumeText);
      const nationality = this.extractNationality(resumeText);
      const dobExplicit = this.extractDob(resumeText);
      const genderExplicit = this.extractGender(resumeText);
      const maritalStatus = this.extractMaritalStatus(resumeText);
      const currentRole = this.extractCurrentRole(resumeText);
      const currentCompany = this.extractCurrentCompany(resumeText);
      const location = this.extractLocation(resumeText);

      // Compute hash from file for dedup
      const fileBuffer = fs.readFileSync(filePath);
      const resumeHash = this._hashBuffer(fileBuffer);

      const parsed = {
        fullText: resumeText,
        email: contactInfo.email,
        phone: contactInfo.phone,
        name,
        education,
        experience,
        currentRole,
        currentCompany,
        location,
        resumeHash,
        icNumber: icInfo.icNumber,
        passportNumber,
        nationality,
        dob: dobExplicit || icInfo.dob || null,
        gender: genderExplicit || icInfo.gender || null,
        maritalStatus,
      };

      parsed.confidence = this._computeConfidence(parsed);
      parsed.parsingStatus = parsed.confidence >= 0.4 ? 'COMPLETE' : 'NEEDS_REVIEW';

      return parsed;
    } catch (error) {
      logger.error('Resume parsing error', error);
      throw error;
    }
  }
}

module.exports = new ResumeParserService();
