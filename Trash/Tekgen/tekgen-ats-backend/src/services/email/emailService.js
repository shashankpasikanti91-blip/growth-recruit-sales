const nodemailer = require('nodemailer');
const crypto = require('crypto');
const config = require('../../config/environment');
const logger = require('../../utils/logger');
const prisma = require('../../config/database');

// Decrypt AES-256-GCM encrypted value (matches integrationController)
function decryptIntegrationKey(ciphertext) {
  if (!ciphertext) return null;
  try {
    const secret = process.env.ENCRYPTION_SECRET || 'tekgen-default-secret-key-32bytes!';
    const key = crypto.scryptSync(secret, 'tekgen-salt', 32);
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) { return null; }
}

function parseConfig(str) {
  try { return JSON.parse(str || '{}'); } catch { return {}; }
}

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASSWORD,
      },
    });
  }

  /**
   * Get the best available transporter:
   *  1. Any global (system-wide) Outlook SMTP saved by admin
   *  2. Any user's own Outlook SMTP
   *  3. Fall back to .env SMTP config
   */
  async getActiveTransporter() {
    try {
      const allEnabled = await prisma.integrationSetting.findMany({
        where: { platform: 'outlook', isEnabled: true },
      });
      // Prefer global (admin set isGlobal:true in config)
      const sorted = allEnabled.sort((a, b) => {
        const aGlobal = parseConfig(a.config).isGlobal === true ? 1 : 0;
        const bGlobal = parseConfig(b.config).isGlobal === true ? 1 : 0;
        return bGlobal - aGlobal;
      });
      const setting = sorted[0];
      if (setting?.apiKey && setting?.config) {
        const cfg = parseConfig(setting.config);
        const password = decryptIntegrationKey(setting.apiKey);
        if (cfg.smtpUser && password) {
          return {
            transporter: nodemailer.createTransport({
              host: cfg.smtpHost || 'smtp.office365.com',
              port: cfg.smtpPort || 587,
              secure: false,
              auth: { user: cfg.smtpUser, pass: password },
              tls: { rejectUnauthorized: false },
            }),
            from: cfg.smtpUser,
          };
        }
      }
    } catch (e) {
      logger.warn('Could not load Outlook SMTP from DB, using .env config', e.message);
    }
    return { transporter: this.transporter, from: config.EMAIL_FROM };
  }

  /**
   * Send application received email
   */
  async sendApplicationReceivedEmail(candidateEmail, candidateName, jobTitle) {
    const subject = `Application Received - ${jobTitle}`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px; }
            .content { padding: 20px; background-color: #f9f9f9; margin-top: 20px; border-radius: 5px; }
            .footer { margin-top: 20px; font-size: 12px; color: #888; text-align: center; }
            .button { 
              display: inline-block; 
              background-color: #007bff; 
              color: white; 
              padding: 10px 20px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Application Received!</h1>
            </div>
            <div class="content">
              <p>Dear ${candidateName},</p>
              <p>Thank you for applying for the position of <strong>${jobTitle}</strong> at Tekgen.</p>
              <p>We have received your application and will review your qualifications carefully. Our recruitment team will contact you within 3-5 business days if your profile matches our requirements.</p>
              <p>In the meantime, you can track your application status by logging into your account.</p>
              <p>Best regards,</p>
              <p><strong>Tekgen Recruitment Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2024 Tekgen. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail(candidateEmail, subject, htmlContent, 'APPLICATION_RECEIVED');
  }

  /**
   * Send shortlisted email
   */
  async sendShortlistedEmail(candidateEmail, candidateName, jobTitle) {
    const subject = `Great News! You're Shortlisted for ${jobTitle}`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px; }
            .content { padding: 20px; background-color: #f9f9f9; margin-top: 20px; border-radius: 5px; }
            .button { 
              display: inline-block; 
              background-color: #28a745; 
              color: white; 
              padding: 10px 20px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Congratulations! 🎉</h1>
            </div>
            <div class="content">
              <p>Dear ${candidateName},</p>
              <p>We are pleased to inform you that you have been selected to move forward in our recruitment process for the position of <strong>${jobTitle}</strong>.</p>
              <p>Our team will be in touch shortly to schedule an interview at your convenience.</p>
              <p>Thank you for your interest in joining Tekgen!</p>
              <p>Best regards,</p>
              <p><strong>Tekgen Recruitment Team</strong></p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail(candidateEmail, subject, htmlContent, 'SHORTLISTED');
  }

  /**
   * Send rejection email
   */
  async sendRejectionEmail(candidateEmail, candidateName, jobTitle) {
    const subject = `Application Status Update - ${jobTitle}`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #6c757d; color: white; padding: 20px; text-align: center; border-radius: 5px; }
            .content { padding: 20px; background-color: #f9f9f9; margin-top: 20px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Application Update</h1>
            </div>
            <div class="content">
              <p>Dear ${candidateName},</p>
              <p>Thank you for your interest in the <strong>${jobTitle}</strong> position at Tekgen.</p>
              <p>After careful consideration of your application, we have decided to move forward with other candidates whose qualifications closely match our current needs.</p>
              <p>We encourage you to apply for future positions that match your profile. We wish you the best in your career endeavors.</p>
              <p>Best regards,</p>
              <p><strong>Tekgen Recruitment Team</strong></p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail(candidateEmail, subject, htmlContent, 'REJECTED');
  }

  /**
   * Send interview scheduled email
   */
  async sendInterviewScheduledEmail(candidateEmail, candidateName, jobTitle, interviewDate, interviewTime, meetingLink = null) {
    const subject = `Interview Scheduled - ${jobTitle}`;
    const meetingInfo = meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>` : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px; }
            .content { padding: 20px; background-color: #f9f9f9; margin-top: 20px; border-radius: 5px; }
            .details { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Interview Scheduled!</h1>
            </div>
            <div class="content">
              <p>Dear ${candidateName},</p>
              <p>We are excited to invite you for an interview for the position of <strong>${jobTitle}</strong>.</p>
              <div class="details">
                <p><strong>Date:</strong> ${new Date(interviewDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${interviewTime}</p>
                ${meetingInfo}
              </div>
              <p>Please confirm your attendance by replying to this email or logging into your account.</p>
              <p>Best regards,</p>
              <p><strong>Tekgen Recruitment Team</strong></p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail(candidateEmail, subject, htmlContent, 'INTERVIEW_SCHEDULED');
  }

  /**
   * Send follow-up email
   */
  async sendFollowUpEmail(candidateEmail, candidateName, jobTitle, customContent = null) {
    const subject = `Following Up on Your Application - ${jobTitle}`;
    const content = customContent || `
      <p>We wanted to check in regarding your application for the <strong>${jobTitle}</strong> position.</p>
      <p>Our recruitment team is actively reviewing applications. We will be in touch with updates soon.</p>
    `;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px; }
            .content { padding: 20px; background-color: #f9f9f9; margin-top: 20px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Application Follow-up</h1>
            </div>
            <div class="content">
              <p>Dear ${candidateName},</p>
              ${content}
              <p>Best regards,</p>
              <p><strong>Tekgen Recruitment Team</strong></p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail(candidateEmail, subject, htmlContent, 'FOLLOW_UP');
  }

  /**
   * Send generic email
   */
  async sendEmail(recipientEmail, subject, htmlContent, templateType, candidateId = null, userId = null) {
    try {
      // Use Outlook SMTP from Integrations if configured, else fall back to .env
      const { transporter, from } = await this.getActiveTransporter();

      // Send email
      const info = await transporter.sendMail({
        from,
        to: recipientEmail,
        subject,
        html: htmlContent,
      });

      logger.info(`Email sent to ${recipientEmail}: ${info.response}`);

      // Log email in database
      if (userId) {
        await prisma.emailLog.create({
          data: {
            templateType,
            recipientEmail,
            subject,
            body: htmlContent,
            status: 'SENT',
            sentAt: new Date(),
            candidateId,
            userId,
          },
        });
      }

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      logger.error('Send email error', error);

      // Log failed email
      if (userId) {
        await prisma.emailLog.create({
          data: {
            templateType,
            recipientEmail,
            subject,
            body: htmlContent,
            status: 'FAILED',
            failureReason: error.message,
            candidateId,
            userId,
          },
        });
      }

      throw error;
    }
  }
}

module.exports = new EmailService();
