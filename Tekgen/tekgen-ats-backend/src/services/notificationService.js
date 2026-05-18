/**
 * Notification Service
 * Handles email and in-app notifications for approval alerts and month-end reminders
 */

const prisma = require('../config/database');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  /**
   * Create in-app notification
   * @param {Object} data - { userId, type, title, message, relatedId, severity }
   */
  async createNotification(data) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type || 'INFO',
          title: data.title,
          message: data.message,
          relatedId: data.relatedId || null,
          severity: data.severity || 'NORMAL',
          isRead: false,
          createdAt: new Date()
        }
      });

      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Send email notification
   * @param {Object} data - { to, subject, html, text }
   */
  async sendEmailNotification(data) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@tekgen.com',
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text
      };

      const info = await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Email sent to ${data.to}:`, info.messageId);
      return info;
    } catch (error) {
      logger.error('Error sending email:', error);
      // Don't throw - continue processing even if email fails
      return null;
    }
  }

  /**
   * Notify employee about pending approvals
   * @param {String} employeeId - Employee ID
   */
  async notifyEmployeeAboutPendingApprovals(employeeId) {
    try {
      const employee = await prisma.employeeProfile.findUnique({
        where: { id: employeeId },
        include: { user: true }
      });

      if (!employee) return;

      // Get pending leaves
      const pendingLeaves = await prisma.leaveRequest.count({
        where: { employeeId, status: 'SUBMITTED' }
      });

      // Get pending claims
      const pendingClaims = await prisma.claim.count({
        where: { employeeId, status: 'SUBMITTED' }
      });

      // Get pending overtime
      const pendingOvertimes = await prisma.overtimeClaim.count({
        where: { employeeId, status: 'SUBMITTED' }
      });

      const totalPending = pendingLeaves + pendingClaims + pendingOvertimes;

      if (totalPending === 0) return;

      // Create in-app notification
      await this.createNotification({
        userId: employee.userId,
        type: 'PENDING_APPROVALS',
        title: 'Pending Approvals Reminder',
        message: `You have ${totalPending} pending items: ${pendingLeaves} leaves, ${pendingClaims} claims, ${pendingOvertimes} overtime claims`,
        severity: 'MEDIUM'
      });

      // Send email
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Pending Approvals Reminder</h2>
          <p>Hi ${employee.user.firstName},</p>
          <p>You have submitted the following items awaiting approval:</p>
          <ul>
            <li><strong>${pendingLeaves}</strong> Leave Request(s)</li>
            <li><strong>${pendingClaims}</strong> Expense Claim(s)</li>
            <li><strong>${pendingOvertimes}</strong> Overtime Claim(s)</li>
          </ul>
          <p>Please log in to your workspace to track the status of your submissions.</p>
          <p>Best regards,<br/>Tekgen HR System</p>
        </div>
      `;

      await this.sendEmailNotification({
        to: employee.user.email,
        subject: `Pending Approvals Reminder - ${totalPending} items`,
        html: emailHtml,
        text: `You have ${totalPending} pending items awaiting approval.`
      });

      logger.info(`Sent pending approval notification to ${employee.user.email}`);
    } catch (error) {
      logger.error('Error in notifyEmployeeAboutPendingApprovals:', error);
    }
  }

  /**
   * Send month-end alert to all employees
   * Alert about pending submissions before month closes
   */
  async sendMonthEndAlerts() {
    try {
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const daysUntilMonthEnd = daysInMonth - today.getDate();

      // Only send alerts in the last 5 days of the month
      if (daysUntilMonthEnd > 5) {
        logger.info('Not yet time for month-end alerts (more than 5 days remaining)');
        return;
      }

      // Get all active employees
      const employees = await prisma.employeeProfile.findMany({
        where: { isActive: true },
        include: { user: true }
      });

      for (const employee of employees) {
        // Check for pending items
        const [pendingLeaves, pendingClaims, pendingOvertimes] = await Promise.all([
          prisma.leaveRequest.count({
            where: { employeeId: employee.id, status: { in: ['SUBMITTED', 'PENDING_APPROVAL'] } }
          }),
          prisma.claim.count({
            where: { employeeId: employee.id, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } }
          }),
          prisma.overtimeClaim.count({
            where: { employeeId: employee.id, status: 'SUBMITTED' }
          })
        ]);

        if (pendingLeaves > 0 || pendingClaims > 0 || pendingOvertimes > 0) {
          // Create notification
          await this.createNotification({
            userId: employee.userId,
            type: 'MONTH_END_ALERT',
            title: '⚠️ Month-End Alert: Complete Pending Submissions',
            message: `${daysUntilMonthEnd} days remaining in the month. Please complete your pending approvals: ${pendingLeaves} leaves, ${pendingClaims} claims, ${pendingOvertimes} overtime claims.`,
            severity: 'HIGH'
          });

          // Send email
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px;">
                <h2 style="margin-top: 0; color: #856404;">⚠️ Month-End Alert</h2>
                <p style="margin: 10px 0;"><strong>Only ${daysUntilMonthEnd} days left in the month!</strong></p>
              </div>
              <p>Hi ${employee.user.firstName},</p>
              <p>To ensure smooth payroll processing, please complete your pending submissions before month-end:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background-color: #f8f9fa;">
                  <th style="padding: 10px; text-align: left; border: 1px solid #dee2e6;">Item Type</th>
                  <th style="padding: 10px; text-align: center; border: 1px solid #dee2e6;">Count</th>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #dee2e6;">Leave Requests</td>
                  <td style="padding: 10px; text-align: center; border: 1px solid #dee2e6; font-weight: bold; color: ${pendingLeaves > 0 ? '#dc3545' : '#28a745'};">${pendingLeaves}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #dee2e6;">Expense Claims</td>
                  <td style="padding: 10px; text-align: center; border: 1px solid #dee2e6; font-weight: bold; color: ${pendingClaims > 0 ? '#dc3545' : '#28a745'};">${pendingClaims}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #dee2e6;">Overtime Claims</td>
                  <td style="padding: 10px; text-align: center; border: 1px solid #dee2e6; font-weight: bold; color: ${pendingOvertimes > 0 ? '#dc3545' : '#28a745'};">${pendingOvertimes}</td>
                </tr>
              </table>
              <div style="background-color: #e7f3ff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0;">
                <p><strong>Action Required:</strong></p>
                <ol>
                  <li>Log in to your Tekgen workspace</li>
                  <li>Review and confirm any pending submissions</li>
                  <li>Notify your manager if approvals are pending</li>
                </ol>
              </div>
              <p style="color: #666; font-size: 12px;">
                This is an automated notification. Please do not reply to this email.
              </p>
            </div>
          `;

          await this.sendEmailNotification({
            to: employee.user.email,
            subject: `⚠️ Month-End Alert: ${daysUntilMonthEnd} Days - Complete Your Submissions`,
            html: emailHtml,
            text: `Only ${daysUntilMonthEnd} days left. Please complete pending submissions.`
          });

          logger.info(`Sent month-end alert to ${employee.user.email}`);
        }
      }

      logger.info(`Month-end alerts sent to all employees with pending items`);
    } catch (error) {
      logger.error('Error in sendMonthEndAlerts:', error);
    }
  }

  /**
   * Notify approver about pending approvals
   * @param {String} approverId - User ID of the approver
   */
  async notifyApproverAboutPendingApprovals(approverId) {
    try {
      const approver = await prisma.user.findUnique({
        where: { id: approverId }
      });

      if (!approver) return;

      // Get pending approvals assigned to this user
      const [pendingLeaveApprovals, pendingClaimApprovals, pendingOvertimes] = await Promise.all([
        prisma.leaveApproval.count({
          where: { assignedTo: approverId, status: 'PENDING' }
        }),
        prisma.claimApproval.count({
          where: { assignedTo: approverId, status: 'PENDING' }
        }),
        prisma.overtimeClaim.count({
          where: { currentApprover: approverId, status: 'SUBMITTED' }
        })
      ]);

      const totalPending = pendingLeaveApprovals + pendingClaimApprovals + pendingOvertimes;

      if (totalPending === 0) return;

      // Create in-app notification
      await this.createNotification({
        userId: approverId,
        type: 'APPROVALS_PENDING',
        title: 'Pending Approvals Queue',
        message: `You have ${totalPending} items pending approval: ${pendingLeaveApprovals} leaves, ${pendingClaimApprovals} claims, ${pendingOvertimes} overtime claims`,
        severity: 'HIGH'
      });

      // Send email
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Pending Approvals in Your Queue</h2>
          <p>Hi ${approver.firstName},</p>
          <p>You have the following items pending approval:</p>
          <ul>
            <li><strong>${pendingLeaveApprovals}</strong> Leave Request(s)</li>
            <li><strong>${pendingClaimApprovals}</strong> Expense Claim(s)</li>
            <li><strong>${pendingOvertimes}</strong> Overtime Claim(s)</li>
          </ul>
          <p>Please log in to your approval queue to review and process these items.</p>
          <p>Best regards,<br/>Tekgen HR System</p>
        </div>
      `;

      await this.sendEmailNotification({
        to: approver.email,
        subject: `Approval Queue: ${totalPending} items pending your review`,
        html: emailHtml,
        text: `You have ${totalPending} items pending approval.`
      });

      logger.info(`Sent approval queue notification to ${approver.email}`);
    } catch (error) {
      logger.error('Error in notifyApproverAboutPendingApprovals:', error);
    }
  }

  /**
   * Send approval status change notification to employee
   * @param {String} employeeId - Employee ID
   * @param {Object} approval - { type, itemId, displayId, status, comment }
   */
  async notifyApprovalStatusChange(employeeId, approval) {
    try {
      const employee = await prisma.employeeProfile.findUnique({
        where: { id: employeeId },
        include: { user: true }
      });

      if (!employee) return;

      const statusEmoji = approval.status === 'APPROVED' ? '✅' : '❌';
      const statusColor = approval.status === 'APPROVED' ? '#28a745' : '#dc3545';

      // Create in-app notification
      await this.createNotification({
        userId: employee.userId,
        type: 'APPROVAL_STATUS_CHANGED',
        title: `${statusEmoji} ${approval.type} ${approval.status}`,
        message: `Your ${approval.type.toLowerCase()} (${approval.displayId}) has been ${approval.status.toLowerCase()}${approval.comment ? ': ' + approval.comment : ''}`,
        relatedId: approval.itemId,
        severity: approval.status === 'REJECTED' ? 'HIGH' : 'NORMAL'
      });

      // Send email
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="background-color: ${approval.status === 'APPROVED' ? '#d4edda' : '#f8d7da'}; border-left: 4px solid ${statusColor}; padding: 15px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; color: ${statusColor};">${statusEmoji} Your ${approval.type} has been ${approval.status}</h2>
          </div>
          <p>Hi ${employee.user.firstName},</p>
          <p><strong>${approval.type}:</strong> ${approval.displayId}</p>
          <p><strong>Status:</strong> ${approval.status}</p>
          ${approval.comment ? `<p><strong>Comment:</strong> ${approval.comment}</p>` : ''}
          <p>You can view more details in your workspace dashboard.</p>
          <p>Best regards,<br/>Tekgen HR System</p>
        </div>
      `;

      await this.sendEmailNotification({
        to: employee.user.email,
        subject: `${statusEmoji} Your ${approval.type} ${approval.displayId} has been ${approval.status}`,
        html: emailHtml,
        text: `Your ${approval.type} ${approval.displayId} has been ${approval.status}.`
      });

      logger.info(`Sent approval status notification to ${employee.user.email}`);
    } catch (error) {
      logger.error('Error in notifyApprovalStatusChange:', error);
    }
  }

  /**
   * Notify about payroll generated
   * @param {String} employeeId - Employee ID
   * @param {Object} payslip - { displayId, month, year, netSalary }
   */
  async notifyPayslipGenerated(employeeId, payslip) {
    try {
      const employee = await prisma.employeeProfile.findUnique({
        where: { id: employeeId },
        include: { user: true }
      });

      if (!employee) return;

      // Create in-app notification
      await this.createNotification({
        userId: employee.userId,
        type: 'PAYSLIP_GENERATED',
        title: '💰 Payslip Generated',
        message: `Your payslip for ${payslip.month}/${payslip.year} (${payslip.displayId}) is ready. Net Salary: ₹${payslip.netSalary.toLocaleString()}`,
        relatedId: payslip.id,
        severity: 'NORMAL'
      });

      // Send email
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>💰 Your Payslip is Ready</h2>
          <p>Hi ${employee.user.firstName},</p>
          <p>Your payslip for <strong>${payslip.month}/${payslip.year}</strong> has been generated.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Payslip ID:</strong> ${payslip.displayId}</p>
            <p><strong>Net Salary:</strong> ₹${payslip.netSalary.toLocaleString()}</p>
          </div>
          <p>You can download your payslip from the Payroll section in your workspace.</p>
          <p>Best regards,<br/>Tekgen HR System</p>
        </div>
      `;

      await this.sendEmailNotification({
        to: employee.user.email,
        subject: `💰 Your Payslip ${payslip.displayId} is Ready`,
        html: emailHtml,
        text: `Your payslip for ${payslip.month}/${payslip.year} is ready.`
      });

      logger.info(`Sent payslip notification to ${employee.user.email}`);
    } catch (error) {
      logger.error('Error in notifyPayslipGenerated:', error);
    }
  }
}

module.exports = new NotificationService();
