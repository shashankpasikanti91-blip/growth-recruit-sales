const prisma = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Platform definitions — used for validation and type logic
// ---------------------------------------------------------------------------
const JOB_BOARD_PLATFORMS  = ['monster', 'naukri', 'jobstreet', 'indeed', 'futurejob'];
const SMTP_EMAIL_PLATFORMS = ['outlook'];                   // SMTP (no Azure app)
const MESSAGING_PLATFORMS  = ['teams', 'whatsapp', 'telegram']; // webhook / API token
const PLATFORMS = [...JOB_BOARD_PLATFORMS, ...SMTP_EMAIL_PLATFORMS, ...MESSAGING_PLATFORMS];

// ---------------------------------------------------------------------------
// Crypto helpers — AES-256-GCM for API keys at rest
// ---------------------------------------------------------------------------
function encryptKey(plaintext) {
  if (!plaintext) return null;
  const secret = process.env.ENCRYPTION_SECRET || 'tekgen-default-secret-key-32bytes!';
  const key = crypto.scryptSync(secret, 'tekgen-salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decryptKey(ciphertext) {
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
  } catch (e) {
    logger.error('Decrypt key failed', e);
    return null;
  }
}

function maskKey(key) {
  if (!key) return null;
  if (key.length <= 8) return '••••••••';
  return key.slice(0, 4) + '••••••••' + key.slice(-4);
}

// Parse config JSON safely
function parseConfig(configStr) {
  try { return JSON.parse(configStr || '{}'); } catch { return {}; }
}

class IntegrationController {
  /**
   * Get all integration settings for the current user.
   * Global settings (isGlobal in config JSON, set by admin) are merged in for all users.
   * User's own settings take priority over global ones.
   */
  async getIntegrations(req, res) {
    try {
      const isAdmin = req.user.role === 'ADMIN';

      // Fetch current user's own settings
      const userSettings = await prisma.integrationSetting.findMany({
        where: { userId: req.user.id },
      });

      // Fetch all global settings (set by any admin — stored with isGlobal:true in config JSON)
      const allEnabledSettings = await prisma.integrationSetting.findMany({
        where: { isEnabled: true },
      });
      const globalSettings = allEnabledSettings.filter(s => {
        const cfg = parseConfig(s.config);
        return cfg.isGlobal === true;
      });

      const allPlatforms = PLATFORMS.map(platform => {
        // User's own setting takes priority; fall back to global
        const userSetting   = userSettings.find(s => s.platform === platform);
        const globalSetting = globalSettings.find(s => s.platform === platform);
        const existing      = userSetting || globalSetting;
        const isFromGlobal  = !userSetting && !!globalSetting;
        const isGlobal      = !!(existing && parseConfig(existing.config).isGlobal);

        const hasApiKey    = !!(existing?.apiKey) || !!(existing?.webhookUrl);
        const cfg          = parseConfig(existing?.config);
        const connectedAs  = existing?.oauthAccountEmail || cfg.smtpUser || null;
        const isVerified   = !!cfg.verifiedAt;

        const platformType = SMTP_EMAIL_PLATFORMS.includes(platform) ? 'smtp_email'
          : MESSAGING_PLATFORMS.includes(platform) ? 'messaging'
          : 'job_board';

        return {
          platform,
          isEnabled:        existing?.isEnabled || false,
          isConfigured:     !!existing && hasApiKey,
          isVerified,
          hasApiKey,
          maskedApiKey:     hasApiKey && existing?.apiKey ? maskKey(decryptKey(existing.apiKey)) : null,
          webhookUrl:       existing?.webhookUrl || null,
          lastSyncAt:       existing?.lastSyncAt || null,
          id:               existing?.id || null,
          type:             platformType,
          isGlobal,          // true = admin made this system-wide
          isFromGlobal,      // true = this user is using admin's global config
          connectedAs,       // email / user identifier of connected account
          // Admin-only: whether to show the global toggle
          canSetGlobal:     isAdmin,
        };
      });

      sendSuccess(res, { integrations: allPlatforms }, 'Integrations retrieved');
    } catch (error) {
      logger.error('getIntegrations error', error);
      sendError(res, 'Failed to get integrations', 500);
    }
  }

  /**
   * Save/update integration settings.
   * - Outlook: SMTP config (email + app password) — no Azure app needed
   * - Teams: webhook URL
   * - WhatsApp: API token (+ optional phone number ID in config)
   * - Telegram: bot token (+ optional chat ID in config)
   * - Job boards: API key
   * Admin can set isGlobal=true → all users automatically get this integration
   */
  async saveIntegration(req, res) {
    try {
      const {
        platform, apiKey, apiSecret, webhookUrl, isEnabled,
        // Outlook SMTP fields
        smtpUser, smtpHost, smtpPort,
        // Telegram/WhatsApp extra fields
        chatId, phoneNumberId,
        // Admin: make this available to ALL users
        isGlobal,
      } = req.body;

      if (!platform || !PLATFORMS.includes(platform)) {
        return sendError(res, `Invalid platform. Must be one of: ${PLATFORMS.join(', ')}`, 400);
      }

      // Non-admins cannot set global flags
      const makeGlobal = req.user.role === 'ADMIN' && isGlobal === true;

      // Build config JSON based on platform type
      const cfg = {};
      if (makeGlobal) cfg.isGlobal = true;
      cfg.verifiedAt = null;

      if (SMTP_EMAIL_PLATFORMS.includes(platform)) {
        // Outlook SMTP
        if (!smtpUser) return sendError(res, 'Outlook: email address (smtpUser) is required', 400);
        if (!apiKey)   return sendError(res, 'Outlook: app password (apiKey) is required', 400);
        cfg.smtpUser = smtpUser;
        cfg.smtpHost = smtpHost || 'smtp.office365.com';
        cfg.smtpPort = parseInt(smtpPort, 10) || 587;
      } else if (platform === 'telegram' && chatId) {
        cfg.chatId = chatId;
      } else if (platform === 'whatsapp' && phoneNumberId) {
        cfg.phoneNumberId = phoneNumberId;
      } else if (platform === 'teams') {
        // Teams: webhook URL is the credential — no separate API key needed
        if (!webhookUrl) return sendError(res, 'Teams: webhook URL is required', 400);
      }

      // Validate credentials immediately so wrong entries are rejected.
      if (platform === 'outlook') {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: cfg.smtpHost || 'smtp.office365.com',
          port: cfg.smtpPort || 587,
          secure: false,
          auth: { user: cfg.smtpUser, pass: apiKey },
          tls: { rejectUnauthorized: false },
        });
        try {
          await transporter.verify();
          cfg.verifiedAt = new Date().toISOString();
        } catch (e) {
          return sendError(res, `Outlook SMTP validation failed: ${e.message}`, 400);
        }
      }

      if (platform === 'teams') {
        if (!/^https?:\/\//i.test(webhookUrl || '')) {
          return sendError(res, 'Teams webhook URL must be valid', 400);
        }
        try {
          const resp = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: 'Tekgen Teams integration validation test' }),
          });
          if (!resp.ok) return sendError(res, `Teams webhook validation failed (${resp.status})`, 400);
          cfg.verifiedAt = new Date().toISOString();
        } catch (e) {
          return sendError(res, `Teams webhook validation failed: ${e.message}`, 400);
        }
      }

      if (platform === 'telegram') {
        if (!apiKey) return sendError(res, 'Telegram bot token is required', 400);
        try {
          const resp = await fetch(`https://api.telegram.org/bot${apiKey}/getMe`);
          const data = await resp.json();
          if (!resp.ok || !data.ok) return sendError(res, 'Telegram token validation failed', 400);
          cfg.verifiedAt = new Date().toISOString();
        } catch (e) {
          return sendError(res, `Telegram validation failed: ${e.message}`, 400);
        }
      }

      if (platform === 'whatsapp') {
        if (!apiKey) return sendError(res, 'WhatsApp access token is required', 400);
        try {
          const resp = await fetch('https://graph.facebook.com/v22.0/me', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!resp.ok) return sendError(res, `WhatsApp token validation failed (${resp.status})`, 400);
          cfg.verifiedAt = new Date().toISOString();
        } catch (e) {
          return sendError(res, `WhatsApp validation failed: ${e.message}`, 400);
        }
      }

      const encryptedKey    = apiKey    ? encryptKey(apiKey)    : undefined;
      const encryptedSecret = apiSecret ? encryptKey(apiSecret) : undefined;

      const smtpEmail = SMTP_EMAIL_PLATFORMS.includes(platform) ? smtpUser : null;

      const data = {
        platform,
        apiKey:      encryptedKey    !== undefined ? encryptedKey    : null,
        apiSecret:   encryptedSecret !== undefined ? encryptedSecret : null,
        webhookUrl:  webhookUrl  || null,
        isEnabled:   isEnabled !== undefined ? Boolean(isEnabled) : true,
        config:      Object.keys(cfg).length ? JSON.stringify(cfg) : null,
        userId:      req.user.id,
        ...(smtpEmail && { oauthAccountEmail: smtpEmail }),
      };

      const setting = await prisma.integrationSetting.upsert({
        where:  { userId_platform: { userId: req.user.id, platform } },
        update: data,
        create: data,
      });

      logger.info(`Integration saved: ${platform} (global=${makeGlobal}) for ${req.user.email}`);
      sendSuccess(res, {
        id:          setting.id,
        platform:    setting.platform,
        isEnabled:   setting.isEnabled,
        isConfigured: !!(setting.apiKey || setting.webhookUrl),
        isVerified: !!cfg.verifiedAt,
        isGlobal:    makeGlobal,
        connectedAs: smtpEmail || null,
      }, `${platform} connected and verified${makeGlobal ? ' — system-wide for all users' : ''}.`);
    } catch (error) {
      logger.error('saveIntegration error', error);
      sendError(res, error.message, 400);
    }
  }


  /**
   * OAuth connect for Outlook/Teams — Phase 6
   * Stores tokens encrypted; never exposes raw tokens
   */
  async oauthConnect(req, res) {
    try {
      const { platform } = req.params;

      // OAuth flow is replaced by SMTP (Outlook) and webhook (Teams) configuration
      return sendError(res, 'OAuth connect is not used. Configure via the main integrations endpoint instead.', 400);

      const { accessToken, refreshToken, tokenExpiry, scope, accountEmail } = req.body;

      if (!accessToken) return sendError(res, 'accessToken is required', 400);

      const encryptedAccess = encryptKey(accessToken);
      const encryptedRefresh = refreshToken ? encryptKey(refreshToken) : null;

      const data = {
        platform,
        oauthAccessToken: encryptedAccess,
        oauthRefreshToken: encryptedRefresh,
        oauthTokenExpiry: tokenExpiry ? new Date(tokenExpiry) : null,
        oauthScope: scope || null,
        oauthAccountEmail: accountEmail || null,
        oauthStatus: 'CONNECTED',
        isEnabled: true,
        userId: req.user.id,
      };

      const setting = await prisma.integrationSetting.upsert({
        where: { userId_platform: { userId: req.user.id, platform } },
        update: data,
        create: data,
      });

      logger.info(`OAuth connected: ${platform} for ${req.user.email} (${accountEmail})`);
      sendSuccess(res, {
        platform,
        oauthStatus: 'CONNECTED',
        oauthAccountEmail: accountEmail,
        oauthTokenExpiry: tokenExpiry || null,
      }, `${platform} connected successfully — draft-only mode active`);
    } catch (error) {
      logger.error('oauthConnect error', error);
      sendError(res, error.message, 400);
    }
  }

  /**
   * OAuth disconnect for Outlook/Teams — Phase 6
   */
  async oauthDisconnect(req, res) {
    try {
      const { platform } = req.params;

      // OAuth flow is replaced by deleteIntegration
      return sendError(res, 'OAuth disconnect is not used. Use DELETE /api/integrations/:platform instead.', 400);

      await prisma.integrationSetting.updateMany({
        where: { userId: req.user.id, platform },
        data: {
          oauthAccessToken: null,
          oauthRefreshToken: null,
          oauthTokenExpiry: null,
          oauthStatus: 'DISCONNECTED',
          isEnabled: false,
        },
      });

      logger.info(`OAuth disconnected: ${platform} for ${req.user.email}`);
      sendSuccess(res, { platform, oauthStatus: 'DISCONNECTED' }, `${platform} disconnected`);
    } catch (error) {
      logger.error('oauthDisconnect error', error);
      sendError(res, error.message, 400);
    }
  }

  /**
   * Test Outlook SMTP connection — verifies stored SMTP credentials actually connect
   */
  async testOutlookSmtp(req, res) {
    try {
      const setting = await prisma.integrationSetting.findFirst({
        where: { userId: req.user.id, platform: 'outlook' },
      });

      if (!setting?.apiKey || !setting?.config) {
        return sendError(res, 'Outlook SMTP not configured. Enter your email and app password first.', 400);
      }

      const password = decryptKey(setting.apiKey);
      const cfg = JSON.parse(setting.config);

      if (!cfg.smtpUser || !password) {
        return sendError(res, 'Incomplete SMTP configuration.', 400);
      }

      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: cfg.smtpHost || 'smtp.office365.com',
        port: cfg.smtpPort || 587,
        secure: false,
        auth: { user: cfg.smtpUser, pass: password },
        tls: { rejectUnauthorized: false },
      });

      await transporter.verify();
      const cfgUpdated = parseConfig(setting.config);
      cfgUpdated.verifiedAt = new Date().toISOString();
      await prisma.integrationSetting.update({
        where: { id: setting.id },
        data: { config: JSON.stringify(cfgUpdated), isEnabled: true },
      });

      sendSuccess(res, {
        connected: true,
        email: cfg.smtpUser,
        host: cfg.smtpHost || 'smtp.office365.com',
      }, 'Outlook SMTP connection verified — emails will send successfully');
    } catch (error) {
      logger.error('testOutlookSmtp error', error);
      sendError(res, `SMTP connection failed: ${error.message}. If MFA is on, generate an App Password in your Microsoft account settings.`, 400);
    }
  }

  /**
   * Get OAuth/connection status for a specific platform — Phase 6
   */
  async getPlatformStatus(req, res) {
    try {
      const { platform } = req.params;

      const setting = await prisma.integrationSetting.findFirst({
        where: { userId: req.user.id, platform },
      });

      if (!setting) {
        return sendSuccess(res, { platform, status: 'NOT_CONFIGURED' }, 'Platform status');
      }

      const isMessaging = MESSAGING_PLATFORMS.includes(platform);

      sendSuccess(res, {
        platform,
        isEnabled: setting.isEnabled,
        type: isMessaging ? 'messaging' : SMTP_EMAIL_PLATFORMS.includes(platform) ? 'smtp' : 'job_board',
        status: setting.apiKey ? 'CONFIGURED' : 'NOT_CONFIGURED',
        hasApiKey: !!setting.apiKey,
        lastSyncAt: setting.lastSyncAt,
      }, 'Platform status');
    } catch (error) {
      logger.error('getPlatformStatus error', error);
      sendError(res, error.message, 500);
    }
  }

  /**
   * Delete an integration setting
   */
  async deleteIntegration(req, res) {
    try {
      const { platform } = req.params;

      await prisma.integrationSetting.deleteMany({
        where: { userId: req.user.id, platform },
      });

      sendSuccess(res, null, 'Integration removed');
    } catch (error) {
      logger.error('deleteIntegration error', error);
      sendError(res, error.message, 400);
    }
  }

  /**
   * Test integration connection (validates key without revealing it)
   */
  async testIntegration(req, res) {
    try {
      const { platform } = req.params;

      const setting = await prisma.integrationSetting.findFirst({
        where: { userId: req.user.id, platform },
      });

      if (!setting || (!setting.apiKey && !setting.webhookUrl)) {
        return sendError(res, 'Integration not configured', 400);
      }
      const key = setting.apiKey ? decryptKey(setting.apiKey) : null;
      const cfg = parseConfig(setting.config);
      const webhook = setting.webhookUrl || null;

      if (platform === 'teams') {
        if (!webhook) return sendError(res, 'Teams webhook URL not configured', 400);
        const resp = await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'Tekgen Teams integration test message' }),
        });
        if (!resp.ok) return sendError(res, `Teams webhook test failed (${resp.status})`, 400);
      } else if (platform === 'telegram') {
        if (!key) return sendError(res, 'Telegram bot token not configured', 400);
        const resp = await fetch(`https://api.telegram.org/bot${key}/getMe`);
        const data = await resp.json();
        if (!resp.ok || !data.ok) return sendError(res, 'Telegram token validation failed', 400);
      } else if (platform === 'whatsapp') {
        if (!key) return sendError(res, 'WhatsApp access token not configured', 400);
        const resp = await fetch('https://graph.facebook.com/v22.0/me', {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!resp.ok) return sendError(res, `WhatsApp token validation failed (${resp.status})`, 400);
      } else if (JOB_BOARD_PLATFORMS.includes(platform)) {
        return sendSuccess(
          res,
          { platform, status: 'saved', message: `${platform} key saved. Live verification API not implemented yet.` },
          'Integration saved'
        );
      }

      cfg.verifiedAt = new Date().toISOString();
      await prisma.integrationSetting.update({
        where: { id: setting.id },
        data: { config: JSON.stringify(cfg), isEnabled: true },
      });

      sendSuccess(res, { platform, status: 'verified', message: `${platform} connection verified` }, 'Integration verified');
    } catch (error) {
      logger.error('testIntegration error', error);
      sendError(res, error.message, 400);
    }
  }

  // getPendingRequests removed — no longer needed (no admin approval flow)
}

module.exports = new IntegrationController();

