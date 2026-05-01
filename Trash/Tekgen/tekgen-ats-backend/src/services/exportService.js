/**
 * Export Service
 * Handles CSV and PDF generation for reports and data exports
 */

const fs = require('fs');
const path = require('path');
const prisma = require('../config/database');
const PDFDocument = require('pdfkit');
const logger = require('../utils/logger');

class ExportService {
  /**
   * Export candidates to CSV
   * @param {Object} filters - Filter options (status, search, etc.)
   * @returns {Promise<string>} - Path to generated CSV file
   */
  async exportCandidatesCSV(filters = {}) {
    try {
      logger.info('Exporting candidates to CSV...');

      // Build query
      const where = {};
      if (filters.status) where.status = filters.status;
      if (filters.search) {
        where.OR = [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const candidates = await prisma.candidate.findMany({
        where,
        include: {
          applications: {
            include: {
              job: true,
            },
          },
        },
      });

      // Build CSV content
      const headers = [
        'ID',
        'First Name',
        'Last Name',
        'Email',
        'Phone',
        'Location',
        'Current Role',
        'Experience (Years)',
        'Status',
        'Skills',
        'LinkedIn',
        'Portfolio',
        'Applications',
        'Created At',
      ];

      let csv = headers.join(',') + '\n';

      for (const candidate of candidates) {
        const skills = (candidate.skills || []).join(';');
        const applications = candidate.applications.map(a => a.job.title).join(';');
        
        const row = [
          candidate.id,
          `"${candidate.firstName}"`,
          `"${candidate.lastName}"`,
          candidate.email,
          candidate.phone || '',
          candidate.location || '',
          candidate.currentRole || '',
          candidate.experience || '',
          candidate.status,
          `"${skills}"`,
          candidate.linkedinUrl || '',
          candidate.portfolio || '',
          `"${applications}"`,
          new Date(candidate.createdAt).toLocaleDateString(),
        ];

        csv += row.join(',') + '\n';
      }

      // Save to file
      const fileName = `candidates_${Date.now()}.csv`;
      const filePath = path.join(process.cwd(), 'uploads', fileName);
      
      fs.writeFileSync(filePath, csv);
      logger.info(`Candidates exported to CSV: ${fileName}`);

      return filePath;
    } catch (error) {
      logger.error('Error exporting candidates to CSV:', error);
      throw error;
    }
  }

  /**
   * Export jobs to CSV
   * @param {Object} filters - Filter options (status, etc.)
   * @returns {Promise<string>} - Path to generated CSV file
   */
  async exportJobsCSV(filters = {}) {
    try {
      logger.info('Exporting jobs to CSV...');

      const where = {};
      if (filters.status) where.status = filters.status;

      const jobs = await prisma.job.findMany({
        where,
        include: {
          applications: true,
          screenings: true,
        },
      });

      const headers = [
        'ID',
        'Title',
        'Department',
        'Location',
        'Status',
        'Min Experience',
        'Max Experience',
        'Salary Min',
        'Salary Max',
        'Required Skills',
        'Applications',
        'Screenings',
        'Created At',
      ];

      let csv = headers.join(',') + '\n';

      for (const job of jobs) {
        const skills = (job.requiredSkills || []).join(';');
        
        const row = [
          job.id,
          `"${job.title}"`,
          job.department || '',
          job.location || '',
          job.status,
          job.minExperience || '',
          job.maxExperience || '',
          job.salaryMin || '',
          job.salaryMax || '',
          `"${skills}"`,
          job.applications?.length || 0,
          job.screenings?.length || 0,
          new Date(job.createdAt).toLocaleDateString(),
        ];

        csv += row.join(',') + '\n';
      }

      const fileName = `jobs_${Date.now()}.csv`;
      const filePath = path.join(process.cwd(), 'uploads', fileName);
      
      fs.writeFileSync(filePath, csv);
      logger.info(`Jobs exported to CSV: ${fileName}`);

      return filePath;
    } catch (error) {
      logger.error('Error exporting jobs to CSV:', error);
      throw error;
    }
  }

  /**
   * Export screenings/analytics to CSV
   * @returns {Promise<string>} - Path to generated CSV file
   */
  async exportScreeningsCSV() {
    try {
      logger.info('Exporting screenings to CSV...');

      const screenings = await prisma.screening.findMany({
        include: {
          candidate: true,
          job: true,
        },
      });

      const headers = [
        'Candidate',
        'Job',
        'Score',
        'Recommendation',
        'Matched Skills',
        'Skill Gaps',
        'Reasoning',
        'Screened At',
      ];

      let csv = headers.join(',') + '\n';

      for (const screening of screenings) {
        const matchedSkills = (screening.matchedSkills || []).join(';');
        const gaps = (screening.skillGaps || []). join(';');
        
        const row = [
          `"${screening.candidate.firstName} ${screening.candidate.lastName}"`,
          `"${screening.job.title}"`,
          screening.score,
          screening.recommendation,
          `"${matchedSkills}"`,
          `"${gaps}"`,
          `"${screening.reasoning.substring(0, 100)}..."`,
          new Date(screening.screenedAt).toLocaleDateString(),
        ];

        csv += row.join(',') + '\n';
      }

      const fileName = `screenings_${Date.now()}.csv`;
      const filePath = path.join(process.cwd(), 'uploads', fileName);
      
      fs.writeFileSync(filePath, csv);
      logger.info(`Screenings exported to CSV: ${fileName}`);

      return filePath;
    } catch (error) {
      logger.error('Error exporting screenings to CSV:', error);
      throw error;
    }
  }

  /**
   * Generate PDF report with recruitment analytics
   * @param {Object} analytics - Analytics data
   * @returns {Promise<string>} - Path to generated PDF file
   */
  async generateAnalyticsReportPDF(analytics) {
    try {
      logger.info('Generating analytics PDF report...');

      const doc = new PDFDocument();
      const fileName = `analytics_report_${Date.now()}.pdf`;
      const filePath = path.join(process.cwd(), 'uploads', fileName);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('Recruitment Analytics Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).font('Helvetica').text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Summary Section
      doc.fontSize(14).font('Helvetica-Bold').text('Summary Metrics', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      
      if (analytics.funnel) {
        doc.text(`Total Candidates: ${analytics.funnel.total || 0}`);
        doc.text(`Applied: ${analytics.funnel.statusBreakdown?.APPLIED || 0}`);
        doc.text(`Screened: ${analytics.funnel.statusBreakdown?.SCREENED || 0}`);
        doc.text(`Interviews: ${analytics.funnel.statusBreakdown?.INTERVIEW || 0}`);
        doc.text(`Hired: ${analytics.funnel.statusBreakdown?.HIRED || 0}`);
        doc.moveDown();
      }

      // Conversion Rates
      if (analytics.conversionRates) {
        doc.fontSize(14).font('Helvetica-Bold').text('Conversion Rates', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica');
        
        for (const [stage, rate] of Object.entries(analytics.conversionRates)) {
          doc.text(`${stage}: ${(rate * 100).toFixed(2)}%`);
        }
        doc.moveDown();
      }

      // Performance Metrics
      if (analytics.recruiterPerformance) {
        doc.fontSize(14).font('Helvetica-Bold').text('Recruiter Performance', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica');
        
        const perf = analytics.recruiterPerformance;
        doc.text(`Total Candidates Managed: ${perf.totalCandidates || 0}`);
        doc.text(`Total Jobs Created: ${perf.totalJobs || 0}`);
        doc.text(`Applications Processed: ${perf.totalApplications || 0}`);
        doc.text(`Successful Hires: ${perf.hiredCount || 0}`);
        doc.text(`Success Rate: ${(perf.hireSuccessRate * 100).toFixed(2)}%`);
        doc.moveDown();
      }

      // Skills Gap
      if (analytics.skillsGap) {
        doc.fontSize(14).font('Helvetica-Bold').text('Skills Gap Analysis', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica');
        
        doc.text(`Average Skill Coverage: ${(analytics.skillsGap.skillsCoveragePercentage).toFixed(2)}%`);
        
        if (analytics.skillsGap.topMissingSkills?.length > 0) {
          doc.moveDown(0.3);
          doc.text('Top Missing Skills:');
          analytics.skillsGap.topMissingSkills.slice(0, 5).forEach(skill => {
            doc.text(`  • ${skill}`, { indent: 20 });
          });
        }
      }

      doc.moveDown();
      doc.fontSize(9).font('Helvetica').text('End of Report', { align: 'center' });

      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', () => {
          logger.info(`Analytics PDF report generated: ${fileName}`);
          resolve(filePath);
        });
        stream.on('error', reject);
      });
    } catch (error) {
      logger.error('Error generating analytics PDF:', error);
      throw error;
    }
  }

  /**
   * Generate candidate profile PDF
   * @param {string} candidateId - Candidate ID
   * @returns {Promise<string>} - Path to generated PDF file
   */
  async generateCandidateProfilePDF(candidateId) {
    try {
      logger.info(`Generating candidate profile PDF for ${candidateId}...`);

      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
        include: {
          applications: {
            include: {
              job: true,
              screening: true,
            },
          },
        },
      });

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      const doc = new PDFDocument();
      const fileName = `candidate_${candidate.id}_${Date.now()}.pdf`;
      const filePath = path.join(process.cwd(), 'uploads', fileName);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Header
      doc.fontSize(18).font('Helvetica-Bold').text(`${candidate.firstName} ${candidate.lastName}`);
      doc.fontSize(11).font('Helvetica').text(candidate.email);
      doc.text(candidate.phone || 'N/A');
      doc.text(`Location: ${candidate.location || 'N/A'}`);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Professional Info
      doc.fontSize(12).font('Helvetica-Bold').text('Professional Information');
      doc.fontSize(11).font('Helvetica').text(`Current Role: ${candidate.currentRole || 'N/A'}`);
      doc.text(`Experience: ${candidate.experience || 0} years`);
      doc.moveDown();

      // Skills
      if (candidate.skills && candidate.skills.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('Skills');
        doc.fontSize(11).font('Helvetica');
        candidate.skills.forEach(skill => {
          doc.text(`• ${skill}`);
        });
        doc.moveDown();
      }

      // Application History
      if (candidate.applications.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('Application History');
        doc.fontSize(11).font('Helvetica');

        candidate.applications.forEach((app, index) => {
          doc.text(`${index + 1}. ${app.job.title}`);
          doc.text(`   Status: ${app.status}`, { indent: 20 });
          if (app.screening) {
            doc.text(`   Score: ${app.screening.score}/100`, { indent: 20 });
            doc.text(`   Recommendation: ${app.screening.recommendation}`, { indent: 20 });
          }
        });
      }

      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', () => {
          logger.info(`Candidate PDF generated: ${fileName}`);
          resolve(filePath);
        });
        stream.on('error', reject);
      });
    } catch (error) {
      logger.error('Error generating candidate PDF:', error);
      throw error;
    }
  }

  /**
   * Clean up old export files (older than 7 days)
   */
  async cleanupOldExports() {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const files = fs.readdirSync(uploadsDir);
      const now = Date.now();
      const seveDaysMs = 7 * 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (file.endsWith('.csv') || file.endsWith('.pdf')) {
          const filePath = path.join(uploadsDir, file);
          const stats = fs.statSync(filePath);
          
          if (now - stats.mtime.getTime() > seveDaysMs) {
            fs.unlinkSync(filePath);
            logger.info(`Deleted old export file: ${file}`);
          }
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old exports:', error);
    }
  }
}

module.exports = new ExportService();
