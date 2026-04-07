import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import * as nodemailer from 'nodemailer';

export interface NewSignupPayload {
  tenantName: string;
  email: string;
  firstName: string;
  lastName: string;
  plan: string;
  signupAt: Date;
}

export interface PaymentPayload {
  tenantName: string;
  email: string;
  amount: number;
  currency: string;
  plan: string;
  billingCycle: string;
  paidAt: Date;
}

@Injectable()
export class OwnerNotificationService {
  private readonly logger = new Logger(OwnerNotificationService.name);
  private readonly botToken: string;
  private readonly chatId: string;
  private readonly ownerEmail: string;
  private readonly fromEmail: string;
  private mailer: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    this.botToken = this.config.get<string>('OWNER_TELEGRAM_BOT_TOKEN') ?? '';
    this.chatId   = this.config.get<string>('OWNER_TELEGRAM_CHAT_ID') ?? '';
    this.ownerEmail = this.config.get<string>('OWNER_EMAIL') ?? '';
    this.fromEmail  = this.config.get<string>('SMTP_FROM') ?? 'SRP AI Labs <noreply@srp-ai-labs.com>';

    const smtpHost = this.config.get<string>('SMTP_HOST');
    const smtpUser = this.config.get<string>('SMTP_USER');
    const smtpPass = this.config.get<string>('SMTP_PASSWORD');
    if (smtpHost && smtpUser && smtpPass && smtpPass !== 'changeme_smtp') {
      this.mailer = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(this.config.get<string>('SMTP_PORT') ?? '587'),
        secure: false,
        auth: { user: smtpUser, pass: smtpPass },
      });
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  async notifyNewSignup(payload: NewSignupPayload): Promise<void> {
    const text = [
      `🆕 *New Signup — SRP AI Labs*`,
      ``,
      `👤 *Name:* ${payload.firstName} ${payload.lastName}`,
      `📧 *Email:* ${payload.email}`,
      `🏢 *Company:* ${payload.tenantName}`,
      `📦 *Plan:* ${payload.plan} (14-day trial)`,
      `🕒 *At:* ${payload.signupAt.toISOString().replace('T',' ').slice(0,19)} UTC`,
      ``,
      `🔗 Admin: https://growth.srpailabs.com/owner`,
    ].join('\n');

    await Promise.allSettled([
      this.sendTelegram(text),
      this.sendEmail(
        `[SRP AI] New signup: ${payload.firstName} ${payload.lastName} (${payload.tenantName})`,
        `<h2>New Signup</h2>
        <table>
          <tr><td><b>Name</b></td><td>${payload.firstName} ${payload.lastName}</td></tr>
          <tr><td><b>Email</b></td><td>${payload.email}</td></tr>
          <tr><td><b>Company</b></td><td>${payload.tenantName}</td></tr>
          <tr><td><b>Plan</b></td><td>${payload.plan} (14-day trial)</td></tr>
          <tr><td><b>Signed up at</b></td><td>${payload.signupAt.toISOString()}</td></tr>
        </table>
        <p><a href="https://growth.srpailabs.com/owner">Open Owner Dashboard →</a></p>`,
      ),
    ]);
  }

  async notifyPayment(payload: PaymentPayload): Promise<void> {
    const text = [
      `💰 *Payment Received — SRP AI Labs*`,
      ``,
      `🏢 *Tenant:* ${payload.tenantName}`,
      `📧 *Email:* ${payload.email}`,
      `💵 *Amount:* ${payload.currency.toUpperCase()} ${(payload.amount / 100).toFixed(2)}`,
      `📦 *Plan:* ${payload.plan} (${payload.billingCycle})`,
      `🕒 *At:* ${payload.paidAt.toISOString().replace('T',' ').slice(0,19)} UTC`,
    ].join('\n');

    await Promise.allSettled([
      this.sendTelegram(text),
      this.sendEmail(
        `[SRP AI] Payment received: ${payload.currency.toUpperCase()} ${(payload.amount/100).toFixed(2)} from ${payload.tenantName}`,
        `<h2>Payment Received</h2>
        <table>
          <tr><td><b>Tenant</b></td><td>${payload.tenantName}</td></tr>
          <tr><td><b>Email</b></td><td>${payload.email}</td></tr>
          <tr><td><b>Amount</b></td><td>${payload.currency.toUpperCase()} ${(payload.amount/100).toFixed(2)}</td></tr>
          <tr><td><b>Plan</b></td><td>${payload.plan} (${payload.billingCycle})</td></tr>
          <tr><td><b>Paid at</b></td><td>${payload.paidAt.toISOString()}</td></tr>
        </table>`,
      ),
    ]);
  }

  async notifyPlanChange(tenantName: string, fromPlan: string, toPlan: string, email: string): Promise<void> {
    const text = [
      `🔄 *Plan Change — SRP AI Labs*`,
      ``,
      `🏢 *Tenant:* ${tenantName}`,
      `📧 *Email:* ${email}`,
      `📦 *Change:* ${fromPlan} → ${toPlan}`,
      `🕒 *At:* ${new Date().toISOString().replace('T',' ').slice(0,19)} UTC`,
    ].join('\n');

    await Promise.allSettled([
      this.sendTelegram(text),
      this.sendEmail(
        `[SRP AI] Plan change: ${tenantName} moved to ${toPlan}`,
        `<h2>Plan Change</h2>
        <p><b>${tenantName}</b> (${email}) changed plan: <b>${fromPlan} → ${toPlan}</b></p>`,
      ),
    ]);
  }

  // ── Telegram ────────────────────────────────────────────────────────────────

  private async sendTelegram(text: string): Promise<void> {
    if (!this.botToken || !this.chatId) {
      this.logger.warn('Telegram not configured — skipping notification');
      return;
    }

    const body = JSON.stringify({
      chat_id: this.chatId,
      text,
      parse_mode: 'Markdown',
    });

    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: 'api.telegram.org',
          path: `/bot${this.botToken}/sendMessage`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        },
        (res) => {
          res.on('data', () => {});
          res.on('end', () => resolve());
        },
      );
      req.on('error', (err) => {
        this.logger.warn(`Telegram send failed: ${err.message}`);
        resolve();
      });
      req.write(body);
      req.end();
    });
  }

  // ── Email ───────────────────────────────────────────────────────────────────

  private async sendEmail(subject: string, html: string): Promise<void> {
    if (!this.mailer || !this.ownerEmail) {
      this.logger.warn('Email not configured — skipping notification');
      return;
    }
    try {
      await this.mailer.sendMail({
        from: this.fromEmail,
        to: this.ownerEmail,
        subject,
        html,
      });
    } catch (err: any) {
      this.logger.warn(`Email send failed: ${err.message}`);
    }
  }
}
