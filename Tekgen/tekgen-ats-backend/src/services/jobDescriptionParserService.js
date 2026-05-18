const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Job Description Parser Service
 * Parses job descriptions from PDF, Word (DOCX), Excel (XLS/XLSX), CSV, and plain text.
 */

class JobDescriptionParserService {
  /**
   * Extract text from PDF file
   * @param {Buffer} fileBuffer - PDF file buffer
   * @returns {Promise<string>} Extracted text
   */
  async extractTextFromPDF(fileBuffer) {
    try {
      const data = await pdfParse(fileBuffer);
      return data.text;
    } catch (error) {
      logger.error('PDF parsing error', error);
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }
  }

  /**
   * Extract text from DOCX file
   * @param {Buffer} fileBuffer - DOCX file buffer
   * @returns {Promise<string>} Extracted text
   */
  async extractTextFromDOCX(fileBuffer) {
    try {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value;
    } catch (error) {
      logger.error('DOCX parsing error', error);
      throw new Error(`Failed to parse DOCX: ${error.message}`);
    }
  }

  /**
   * XLSX / XLS → plain text (all sheets as CSV blocks)
   */
  extractTextFromSpreadsheet(fileBuffer) {
    try {
      const wb = XLSX.read(fileBuffer, { type: 'buffer' });
      const parts = [];
      for (const name of wb.SheetNames) {
        const sheet = wb.Sheets[name];
        if (!sheet) continue;
        const csv = XLSX.utils.sheet_to_csv(sheet);
        parts.push(`[Sheet: ${name}]\n${csv}`);
      }
      return parts.join('\n\n').trim();
    } catch (error) {
      logger.error('Spreadsheet parsing error', error);
      throw new Error(`Failed to parse spreadsheet: ${error.message}`);
    }
  }

  _ext(filename) {
    if (!filename) return '';
    return path.extname(filename).toLowerCase();
  }

  /**
   * Parse job description from file
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} mimeType - File MIME type
   * @param {string} [originalName] - Original filename (extension fallback)
   * @returns {Promise<string>} Parsed job description text
   */
  async parseFile(fileBuffer, mimeType, originalName = '') {
    let jobDescriptionText = '';
    const ext = this._ext(originalName);

    if (mimeType === 'application/pdf' || ext === '.pdf') {
      jobDescriptionText = await this.extractTextFromPDF(fileBuffer);
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ext === '.docx'
    ) {
      jobDescriptionText = await this.extractTextFromDOCX(fileBuffer);
    } else if (
      mimeType === 'application/vnd.ms-excel' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      ext === '.xls' ||
      ext === '.xlsx'
    ) {
      jobDescriptionText = this.extractTextFromSpreadsheet(fileBuffer);
    } else if (mimeType === 'text/csv' || ext === '.csv') {
      jobDescriptionText = fileBuffer.toString('utf8');
    } else if (
      mimeType === 'text/plain' ||
      ext === '.txt' ||
      ['.md', '.log'].includes(ext)
    ) {
      jobDescriptionText = fileBuffer.toString('utf8');
    } else {
      throw new Error(
        'Unsupported file type. Use PDF, DOCX, Excel (XLS/XLSX), CSV, or plain text.'
      );
    }

    return jobDescriptionText.trim();
  }

  /**
   * Parse plain text job description
   * @param {string} text - Plain text job description
   * @returns {Promise<string>} Parsed text
   */
  async parseText(text) {
    if (!text || text.trim().length === 0) {
      throw new Error('Job description text is empty');
    }
    return text.trim();
  }

  /**
   * Extract job details from description text
   * @param {string} text - Job description text
   * @returns {Object} Extracted details
   */
  extractJobDetails(text) {
    const details = {
      rawText: text,
      keywords: [],
      requirements: [],
      responsibilities: [],
    };

    // Extract keywords (words that appear to be skills/requirements)
    const keywords = text.match(/\b[A-Z][a-z]+(?:[+-][a-z.]+)*\b/g) || [];
    details.keywords = [...new Set(keywords)].slice(0, 20);

    // Extract email if present
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) {
      details.contactEmail = emailMatch[0];
    }

    // Extract phone if present
    const phoneMatch = text.match(/\b(?:\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\d{10})\b/);
    if (phoneMatch) {
      details.contactPhone = phoneMatch[0];
    }

    // Extract Requirements section
    const requirementsSection = text.match(/(?:Requirements?|Qualifications?)([\s\S]*?)(?:Responsibilities?|About|Skills|$)/i);
    if (requirementsSection) {
      const reqs = requirementsSection[1].match(/[-•*]\s*([^\n]+)/g) || [];
      details.requirements = reqs.map(r => r.replace(/^[-•*]\s*/, '').trim());
    }

    // Extract Responsibilities section
    const responsibilitiesSection = text.match(/Responsibilitie?s?([\s\S]*?)(?:Requirements?|Qualifications?|About|Skills|$)/i);
    if (responsibilitiesSection) {
      const resps = responsibilitiesSection[1].match(/[-•*]\s*([^\n]+)/g) || [];
      details.responsibilities = resps.map(r => r.replace(/^[-•*]\s*/, '').trim());
    }

    return details;
  }
}

module.exports = new JobDescriptionParserService();
