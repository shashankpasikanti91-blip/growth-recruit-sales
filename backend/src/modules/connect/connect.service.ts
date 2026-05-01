import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHmac, timingSafeEqual } from 'crypto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ConnectService {
  private readonly logger = new Logger(ConnectService.name);
  private readonly encKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const secret = this.config.get<string>('auth.jwtSecret');
    if (!secret) throw new Error('[ConnectService] auth.jwtSecret is not configured');
    // Different salt than IntegrationsService to keep key domains separate
    this.encKey = scryptSync(secret, 'srp-connect-salt-v1', 32) as Buffer;
  }

  // ─── Crypto helpers ───────────────────────────────────────────────────────────

  private encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + authTag.toString('hex') + encrypted.toString('hex');
  }

  private decrypt(ciphertext: string): string {
    try {
      const iv = Buffer.from(ciphertext.slice(0, 24), 'hex');
      const authTag = Buffer.from(ciphertext.slice(24, 56), 'hex');
      const encrypted = Buffer.from(ciphertext.slice(56), 'hex');
      const decipher = createDecipheriv('aes-256-gcm', this.encKey, iv);
      decipher.setAuthTag(authTag);
      return decipher.update(encrypted) + decipher.final('utf8');
    } catch {
      this.logger.warn('Failed to decrypt Connect credentials — may be keyed differently');
      return '{}';
    }
  }

  // ─── Integration storage ─────────────────────────────────────────────────────
  // Per-user integrations: name = `TYPE:userId` (e.g. GMAIL_OAUTH:abc-123)
  // Tenant-wide integrations: name = TYPE (e.g. WHATSAPP)

  private integrationName(type: string, userId?: string): string {
    return userId ? `${type}:${userId}` : type;
  }

  private async upsertIntegration(
    tenantId: string,
    type: string,
    credentials: Record<string, any>,
    config: Record<string, any> = {},
    userId?: string,
  ) {
    const name = this.integrationName(type, userId);
    const credentialsEnc = this.encrypt(JSON.stringify(credentials));
    const cfgJson = { ...config, type, updatedAt: new Date().toISOString() };

    const existing = await this.prisma.integration.findFirst({
      where: { tenantId, type, name },
    });

    if (existing) {
      return this.prisma.integration.update({
        where: { id: existing.id },
        data: { credentialsEnc, config: cfgJson as any, isActive: true, status: 'ACTIVE' },
      });
    }

    return this.prisma.integration.create({
      data: { tenantId, name, type, credentialsEnc, config: cfgJson as any, isActive: true, status: 'ACTIVE' },
    });
  }

  private async getCredentials(tenantId: string, type: string, userId?: string): Promise<Record<string, any>> {
    const name = this.integrationName(type, userId);
    const rec = await this.prisma.integration.findFirst({
      where: { tenantId, type, name, isActive: true },
    });
    if (!rec?.credentialsEnc) return {};
    return JSON.parse(this.decrypt(rec.credentialsEnc));
  }

  private async getRecord(tenantId: string, type: string, userId?: string) {
    const name = this.integrationName(type, userId);
    return this.prisma.integration.findFirst({
      where: { tenantId, type, name },
      select: { id: true, isActive: true, status: true, config: true, updatedAt: true },
    });
  }

  private async removeIntegration(tenantId: string, type: string, userId?: string) {
    const name = this.integrationName(type, userId);
    const rec = await this.prisma.integration.findFirst({ where: { tenantId, type, name } });
    if (!rec) return null;
    return this.prisma.integration.delete({ where: { id: rec.id } });
  }

  // ─── OAuth state encoding ─────────────────────────────────────────────────────

  encodeState(userId: string, tenantId: string, provider: string): string {
    return Buffer.from(`${userId}:${tenantId}:${provider}`).toString('base64url');
  }

  decodeState(state: string): { userId: string; tenantId: string; provider: string } | null {
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf8');
      const parts = decoded.split(':');
      // UUID contains hyphens, tenantId may also. Split only on first two colons.
      if (parts.length < 3) return null;
      const provider = parts[parts.length - 1];
      const tenantId = parts[parts.length - 2];
      const userId = parts.slice(0, parts.length - 2).join(':');
      if (!userId || !tenantId || !provider) return null;
      return { userId, tenantId, provider };
    } catch {
      return null;
    }
  }

  // ─── Gmail OAuth ─────────────────────────────────────────────────────────────

  getGmailAuthUrl(userId: string, tenantId: string): string {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) throw new BadRequestException('GOOGLE_CLIENT_ID is not configured on the server.');
    const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI')
      ?? `${this.config.get<string>('APP_URL') ?? 'http://localhost:3001'}/api/v1/integrations/gmail/callback`;
    const state = this.encodeState(userId, tenantId, 'gmail');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile https://mail.google.com/',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleGmailCallback(code: string, state: string): Promise<string> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const parsed = this.decodeState(state);
    if (!parsed || parsed.provider !== 'gmail') {
      return `${frontendUrl}/my-hub/profile?error=invalid_state`;
    }

    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID') ?? '';
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET') ?? '';
    const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI')
      ?? `${this.config.get<string>('APP_URL') ?? 'http://localhost:3001'}/api/v1/integrations/gmail/callback`;

    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }).toString(),
      });
      const tokens = (await tokenRes.json()) as any;
      if (!tokenRes.ok || tokens.error) {
        this.logger.error(`Gmail token exchange failed: ${JSON.stringify(tokens)}`);
        return `${frontendUrl}/my-hub/profile?error=gmail_token_failed`;
      }

      // Fetch user info to get email address
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const userInfo = (await userRes.json()) as any;

      await this.upsertIntegration(
        parsed.tenantId,
        'GMAIL_OAUTH',
        {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: Date.now() + (tokens.expires_in ?? 3600) * 1000,
          email: userInfo.email,
        },
        { email: userInfo.email },
        parsed.userId,
      );

      return `${frontendUrl}/my-hub/profile?connected=gmail`;
    } catch (err) {
      this.logger.error(`Gmail callback error: ${err}`);
      return `${frontendUrl}/my-hub/profile?error=gmail_failed`;
    }
  }

  async getGmailStatus(userId: string, tenantId: string) {
    const rec = await this.getRecord(tenantId, 'GMAIL_OAUTH', userId);
    if (!rec) return { connected: false };
    const creds = await this.getCredentials(tenantId, 'GMAIL_OAUTH', userId);
    return { connected: rec.isActive, email: creds.email, updatedAt: rec.updatedAt };
  }

  async disconnectGmail(userId: string, tenantId: string) {
    await this.removeIntegration(tenantId, 'GMAIL_OAUTH', userId);
    return { disconnected: true };
  }

  async sendViaGmail(userId: string, tenantId: string, to: string, toName: string, subject: string, body: string) {
    const creds = await this.getCredentials(tenantId, 'GMAIL_OAUTH', userId);
    if (!creds.access_token) {
      throw new BadRequestException('Gmail not connected. Connect in My Hub → Profile.');
    }

    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID') ?? '';
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET') ?? '';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: creds.email,
        clientId,
        clientSecret,
        refreshToken: creds.refresh_token,
        accessToken: creds.access_token,
        expires: creds.expiry_date,
      },
    } as any);

    const info = await transporter.sendMail({
      from: creds.email,
      to: toName ? `${toName} <${to}>` : to,
      subject,
      html: body,
    });

    return { messageId: info.messageId, from: creds.email };
  }

  // ─── Outlook OAuth ────────────────────────────────────────────────────────────

  getOutlookAuthUrl(userId: string, tenantId: string): string {
    const clientId = this.config.get<string>('AZURE_AD_CLIENT_ID');
    if (!clientId) throw new BadRequestException('AZURE_AD_CLIENT_ID is not configured on the server.');
    const redirectUri = this.config.get<string>('AZURE_AD_REDIRECT_URI')
      ?? `${this.config.get<string>('APP_URL') ?? 'http://localhost:3001'}/api/v1/integrations/outlook/callback`;
    const azureTenant = this.config.get<string>('AZURE_AD_TENANT') ?? 'common';
    const state = this.encodeState(userId, tenantId, 'outlook');
    const scopes = [
      'openid', 'email', 'profile', 'offline_access',
      'https://graph.microsoft.com/Mail.Send',
      'https://graph.microsoft.com/User.Read',
    ].join(' ');
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scopes,
      state,
      response_mode: 'query',
    });
    return `https://login.microsoftonline.com/${azureTenant}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async handleOutlookCallback(code: string, state: string): Promise<string> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const parsed = this.decodeState(state);
    if (!parsed || parsed.provider !== 'outlook') {
      return `${frontendUrl}/my-hub/profile?error=invalid_state`;
    }

    const clientId = this.config.get<string>('AZURE_AD_CLIENT_ID') ?? '';
    const clientSecret = this.config.get<string>('AZURE_AD_CLIENT_SECRET') ?? '';
    const redirectUri = this.config.get<string>('AZURE_AD_REDIRECT_URI')
      ?? `${this.config.get<string>('APP_URL') ?? 'http://localhost:3001'}/api/v1/integrations/outlook/callback`;
    const azureTenant = this.config.get<string>('AZURE_AD_TENANT') ?? 'common';

    try {
      const tokenRes = await fetch(`https://login.microsoftonline.com/${azureTenant}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }).toString(),
      });
      const tokens = (await tokenRes.json()) as any;
      if (!tokenRes.ok || tokens.error) {
        this.logger.error(`Outlook token exchange failed: ${JSON.stringify(tokens)}`);
        return `${frontendUrl}/my-hub/profile?error=outlook_token_failed`;
      }

      // Get user profile from Microsoft Graph
      const meRes = await fetch('https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName,displayName', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const me = (await meRes.json()) as any;
      const email = me.mail ?? me.userPrincipalName;

      await this.upsertIntegration(
        parsed.tenantId,
        'OUTLOOK_OAUTH',
        {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: Date.now() + (tokens.expires_in ?? 3600) * 1000,
          email,
          account_id: me.id,
          display_name: me.displayName,
        },
        { email, display_name: me.displayName, tenant: azureTenant },
        parsed.userId,
      );

      return `${frontendUrl}/my-hub/profile?connected=outlook`;
    } catch (err) {
      this.logger.error(`Outlook callback error: ${err}`);
      return `${frontendUrl}/my-hub/profile?error=outlook_failed`;
    }
  }

  async getOutlookStatus(userId: string, tenantId: string) {
    const rec = await this.getRecord(tenantId, 'OUTLOOK_OAUTH', userId);
    if (!rec) return { connected: false };
    const creds = await this.getCredentials(tenantId, 'OUTLOOK_OAUTH', userId);
    return { connected: rec.isActive, email: creds.email, displayName: creds.display_name, updatedAt: rec.updatedAt };
  }

  async disconnectOutlook(userId: string, tenantId: string) {
    await this.removeIntegration(tenantId, 'OUTLOOK_OAUTH', userId);
    return { disconnected: true };
  }

  private async refreshOutlookTokenIfNeeded(userId: string, tenantId: string, creds: Record<string, any>): Promise<Record<string, any>> {
    if (!creds.expiry_date || Date.now() < creds.expiry_date - 60_000) return creds;

    const clientId = this.config.get<string>('AZURE_AD_CLIENT_ID') ?? '';
    const clientSecret = this.config.get<string>('AZURE_AD_CLIENT_SECRET') ?? '';
    const azureTenant = this.config.get<string>('AZURE_AD_TENANT') ?? 'common';

    const tokenRes = await fetch(`https://login.microsoftonline.com/${azureTenant}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ refresh_token: creds.refresh_token, client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token' }).toString(),
    });
    const newTokens = (await tokenRes.json()) as any;
    if (!tokenRes.ok || newTokens.error) throw new Error('Outlook token refresh failed');

    const updated = { ...creds, access_token: newTokens.access_token, expiry_date: Date.now() + (newTokens.expires_in ?? 3600) * 1000 };
    await this.upsertIntegration(tenantId, 'OUTLOOK_OAUTH', updated, { email: creds.email }, userId);
    return updated;
  }

  async sendViaOutlook(userId: string, tenantId: string, to: string, toName: string, subject: string, body: string) {
    let creds = await this.getCredentials(tenantId, 'OUTLOOK_OAUTH', userId);
    if (!creds.access_token) {
      throw new BadRequestException('Outlook not connected. Connect in My Hub → Profile.');
    }
    creds = await this.refreshOutlookTokenIfNeeded(userId, tenantId, creds);

    const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: { Authorization: `Bearer ${creds.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'HTML', content: body },
          toRecipients: [{ emailAddress: { address: to, name: toName ?? to } }],
        },
        saveToSentItems: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new BadRequestException(`Failed to send via Outlook: ${errText}`);
    }

    return { sent: true, from: creds.email };
  }

  // ─── Smart email (Gmail → Outlook → error) ────────────────────────────────────

  async sendEmail(userId: string, tenantId: string, to: string, toName: string, subject: string, body: string) {
    const gmailCreds = await this.getCredentials(tenantId, 'GMAIL_OAUTH', userId);
    if (gmailCreds.access_token) {
      return this.sendViaGmail(userId, tenantId, to, toName, subject, body);
    }
    const outlookCreds = await this.getCredentials(tenantId, 'OUTLOOK_OAUTH', userId);
    if (outlookCreds.access_token) {
      return this.sendViaOutlook(userId, tenantId, to, toName, subject, body);
    }
    throw new BadRequestException(
      'No email channel connected. Connect Gmail or Outlook in My Hub → Profile.',
    );
  }

  // ─── WhatsApp Business ────────────────────────────────────────────────────────

  async saveWhatsApp(tenantId: string, phoneNumberId: string, accessToken: string) {
    await this.upsertIntegration(
      tenantId,
      'WHATSAPP',
      { phone_number_id: phoneNumberId, access_token: accessToken },
      { phone_number_id: phoneNumberId },
    );
    return { saved: true };
  }

  async getWhatsAppStatus(tenantId: string) {
    const rec = await this.getRecord(tenantId, 'WHATSAPP');
    if (!rec) return { connected: false };
    return { connected: rec.isActive, config: rec.config };
  }

  /**
   * Verifies Meta's GET challenge when registering the webhook.
   * Returns the challenge string on success. Throws on mismatch.
   */
  verifyWhatsAppWebhook(mode: string, verifyToken: string, challenge: string): string {
    const configToken = this.config.get<string>('META_WA_WEBHOOK_VERIFY_TOKEN') ?? '';
    if (mode === 'subscribe' && verifyToken === configToken) return challenge;
    throw new UnauthorizedException('WhatsApp webhook verification failed — token mismatch');
  }

  /**
   * Handles incoming WhatsApp messages (POST from Meta).
   * Verifies HMAC-SHA256 signature before processing.
   */
  async handleWhatsAppIncoming(body: any, signature: string): Promise<void> {
    const appSecret = this.config.get<string>('META_WA_APP_SECRET');
    if (appSecret && signature) {
      const hmac = createHmac('sha256', appSecret).update(JSON.stringify(body), 'utf8').digest('hex');
      const expected = `sha256=${hmac}`;
      try {
        const sig = Buffer.from(signature.padEnd(expected.length), 'utf8');
        const exp = Buffer.from(expected, 'utf8');
        if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
          this.logger.warn('WhatsApp webhook signature mismatch — dropping payload');
          return;
        }
      } catch {
        this.logger.warn('WhatsApp webhook signature check error');
        return;
      }
    }

    // Log incoming for now — future: store in OutreachMessage + link to Lead
    const messages = body?.entry?.[0]?.changes?.[0]?.value?.messages;
    if (messages?.length) {
      const msg = messages[0];
      this.logger.log(`WhatsApp incoming from ${msg.from}: type=${msg.type}`);
    }
  }

  async sendViaWhatsApp(tenantId: string, to: string, text: string, templateName?: string) {
    const creds = await this.getCredentials(tenantId, 'WHATSAPP');
    if (!creds.phone_number_id || !creds.access_token) {
      throw new BadRequestException('WhatsApp not configured. Add credentials in Settings → Integrations.');
    }

    const phone = to.replace(/[^0-9]/g, '');
    const payload = templateName
      ? { messaging_product: 'whatsapp', to: phone, type: 'template', template: { name: templateName, language: { code: 'en' } } }
      : { messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: text } };

    const res = await fetch(`https://graph.facebook.com/v18.0/${creds.phone_number_id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creds.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new BadRequestException(`WhatsApp send failed: ${errText}`);
    }

    const result = (await res.json()) as any;
    return { messageId: result.messages?.[0]?.id, to: phone };
  }

  // ─── Telegram ─────────────────────────────────────────────────────────────────

  async saveTelegram(tenantId: string, botToken: string, teamChatId?: string) {
    await this.upsertIntegration(
      tenantId,
      'TELEGRAM',
      { bot_token: botToken },
      { team_chat_id: teamChatId ?? null, outreach_enabled: true },
    );
    return { saved: true };
  }

  async getTelegramStatus(tenantId: string) {
    const rec = await this.getRecord(tenantId, 'TELEGRAM');
    if (!rec) return { connected: false };
    return { connected: rec.isActive, config: rec.config };
  }

  async sendViaTelegram(tenantId: string, chatId: string, text: string) {
    const creds = await this.getCredentials(tenantId, 'TELEGRAM');
    if (!creds.bot_token) {
      throw new BadRequestException('Telegram not configured. Add bot token in Settings → Integrations.');
    }

    const res = await fetch(`https://api.telegram.org/bot${creds.bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });

    if (!res.ok) {
      const errBody = (await res.json()) as any;
      throw new BadRequestException(`Telegram send failed: ${errBody.description ?? 'Unknown error'}`);
    }

    const result = (await res.json()) as any;
    return { messageId: result.result?.message_id, chatId };
  }

  /**
   * Sends an alert to the configured team_chat_id (internal notifications channel).
   * Silently swallows errors so it doesn't break the calling flow.
   */
  async sendTelegramTeamAlert(tenantId: string, text: string) {
    const rec = await this.getRecord(tenantId, 'TELEGRAM');
    if (!rec?.isActive) return;
    const config = rec.config as any;
    if (!config?.team_chat_id) return;
    try {
      await this.sendViaTelegram(tenantId, String(config.team_chat_id), text);
    } catch (err) {
      this.logger.warn(`Telegram team alert failed: ${err}`);
    }
  }

  // ─── Microsoft Teams ──────────────────────────────────────────────────────────

  async saveTeams(tenantId: string, webhookUrl: string, channel?: string) {
    await this.upsertIntegration(
      tenantId,
      'MS_TEAMS',
      { webhook_url: webhookUrl },
      { channel: channel ?? '#general', events: ['PLACEMENT_WON', 'NEW_HIGH_SCORE_LEAD'] },
    );
    return { saved: true };
  }

  async getTeamsStatus(tenantId: string) {
    const rec = await this.getRecord(tenantId, 'MS_TEAMS');
    if (!rec) return { connected: false };
    return { connected: rec.isActive, config: rec.config };
  }

  async sendTeamsMessage(tenantId: string, text: string) {
    const creds = await this.getCredentials(tenantId, 'MS_TEAMS');
    if (!creds.webhook_url) {
      throw new BadRequestException('Microsoft Teams incoming webhook not configured.');
    }

    const res = await fetch(creds.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) throw new BadRequestException('Teams notification send failed');
    return { sent: true };
  }

  // ─── Status summary ───────────────────────────────────────────────────────────

  async getChannelStatuses(userId: string, tenantId: string) {
    const [gmail, outlook, whatsapp, telegram, teams] = await Promise.all([
      this.getGmailStatus(userId, tenantId),
      this.getOutlookStatus(userId, tenantId),
      this.getWhatsAppStatus(tenantId),
      this.getTelegramStatus(tenantId),
      this.getTeamsStatus(tenantId),
    ]);
    return { gmail, outlook, whatsapp, telegram, teams };
  }
}
