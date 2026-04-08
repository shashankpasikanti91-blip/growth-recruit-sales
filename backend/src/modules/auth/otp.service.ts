import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import * as nodemailer from 'nodemailer';
import * as https from 'https';

type OtpPurpose = 'verify-email' | 'reset-password';

interface OtpRecord {
  otp: string;
  attempts: number;
  createdAt: number;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private mailer: nodemailer.Transporter | null = null;
  private readonly botToken: string;
  private readonly chatId: string;

  constructor(
    private readonly cache: CacheService,
    private readonly config: ConfigService,
  ) {
    const smtpHost = config.get<string>('SMTP_HOST');
    const smtpUser = config.get<string>('SMTP_USER');
    const smtpPass = config.get<string>('SMTP_PASSWORD');

    if (smtpHost && smtpUser && smtpPass && smtpPass !== 'changeme_smtp') {
      this.mailer = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(config.get<string>('SMTP_PORT') ?? '587'),
        secure: false,
        auth: { user: smtpUser, pass: smtpPass },
      });
    }

    this.botToken = config.get<string>('OWNER_TELEGRAM_BOT_TOKEN') ?? '';
    this.chatId   = config.get<string>('OWNER_TELEGRAM_CHAT_ID') ?? '';
  }

  // ── Generate & store OTP ──────────────────────────────────────────────────

  generate(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private key(email: string, purpose: OtpPurpose): string {
    return `otp:${purpose}:${email.toLowerCase()}`;
  }

  async store(email: string, purpose: OtpPurpose): Promise<string> {
    const otp = this.generate();
    const record: OtpRecord = { otp, attempts: 0, createdAt: Date.now() };
    await this.cache.set(this.key(email, purpose), record, 600); // 10 min TTL
    return otp;
  }

  async verify(email: string, purpose: OtpPurpose, input: string): Promise<boolean> {
    const record = await this.cache.get<OtpRecord>(this.key(email, purpose));
    if (!record) return false;

    // Max 5 attempts
    if (record.attempts >= 5) {
      await this.cache.del(this.key(email, purpose));
      return false;
    }

    if (record.otp !== input.trim()) {
      record.attempts += 1;
      await this.cache.set(this.key(email, purpose), record, 600);
      return false;
    }

    // Valid — consume immediately (single-use)
    await this.cache.del(this.key(email, purpose));
    return true;
  }

  async invalidate(email: string, purpose: OtpPurpose): Promise<void> {
    await this.cache.del(this.key(email, purpose));
  }

  // ── Send OTP via email ────────────────────────────────────────────────────

  async sendVerificationOtp(email: string, firstName: string, otp: string): Promise<void> {
    const subject = `Your SRP AI Labs verification code: ${otp}`;
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <div style="background:#1e40af;padding:16px 24px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">SRP AI Labs</h1>
        </div>
        <div style="background:#f8faff;padding:24px;border:1px solid #e0e7ff;border-top:none;border-radius:0 0 8px 8px">
          <h2 style="color:#1e3a8a;margin-top:0">Verify your email address</h2>
          <p style="color:#475569">Hi ${firstName},</p>
          <p style="color:#475569">Use the code below to verify your email. It expires in <strong>10 minutes</strong>.</p>
          <div style="background:#1e40af;color:#fff;font-size:32px;font-weight:bold;letter-spacing:10px;padding:20px;text-align:center;border-radius:8px;margin:20px 0">
            ${otp}
          </div>
          <p style="color:#94a3b8;font-size:12px">If you didn't create an account, ignore this email.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0"/>
          <p style="color:#94a3b8;font-size:11px;margin:0">SRP AI Labs — Recruitment & Sales Automation Platform</p>
        </div>
      </div>`;

    await this.sendEmail(email, subject, html);
  }

  async sendPasswordResetOtp(email: string, firstName: string, otp: string): Promise<void> {
    const subject = `Your SRP AI Labs password reset code: ${otp}`;
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <div style="background:#dc2626;padding:16px 24px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">SRP AI Labs — Password Reset</h1>
        </div>
        <div style="background:#fff5f5;padding:24px;border:1px solid #fecaca;border-top:none;border-radius:0 0 8px 8px">
          <h2 style="color:#991b1b;margin-top:0">Reset your password</h2>
          <p style="color:#475569">Hi ${firstName},</p>
          <p style="color:#475569">Use the code below to reset your password. It expires in <strong>10 minutes</strong>.</p>
          <div style="background:#dc2626;color:#fff;font-size:32px;font-weight:bold;letter-spacing:10px;padding:20px;text-align:center;border-radius:8px;margin:20px 0">
            ${otp}
          </div>
          <p style="color:#94a3b8;font-size:12px">If you didn't request a password reset, you can safely ignore this email. Your password will not change.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0"/>
          <p style="color:#94a3b8;font-size:11px;margin:0">SRP AI Labs — Recruitment & Sales Automation Platform</p>
        </div>
      </div>`;

    await this.sendEmail(email, subject, html);
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (this.mailer) {
      try {
        const from = this.config.get<string>('SMTP_FROM') ?? 'SRP AI Labs <noreply@srp-ai-labs.com>';
        await this.mailer.sendMail({ from, to, subject, html });
        this.logger.log(`OTP email sent to ${to}`);
        return;
      } catch (err: any) {
        this.logger.warn(`OTP email failed: ${err.message} — falling back to Telegram`);
      }
    }

    // Fallback: notify owner via Telegram (dev/misconfigured SMTP)
    if (this.botToken && this.chatId) {
      const text = `⚠️ *SMTP not configured — dev fallback*\n\n📧 To: ${to}\n📋 Subject: ${subject}\n\n🔑 OTP has been stored in Redis. User must retrieve it another way or configure SMTP.`;
      await this.sendTelegram(text).catch(() => {});
    }

    this.logger.warn(`OTP email to ${to} could not be sent — SMTP not configured. Subject: ${subject}`);
  }

  private sendTelegram(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.botToken || !this.chatId) { resolve(); return; }
      const body = JSON.stringify({ chat_id: this.chatId, text, parse_mode: 'Markdown' });
      const req = https.request(
        { hostname: 'api.telegram.org', path: `/bot${this.botToken}/sendMessage`, method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
        (res) => { res.on('data', () => {}); res.on('end', () => resolve()); },
      );
      req.on('error', () => resolve());
      req.write(body);
      req.end();
    });
  }
}
