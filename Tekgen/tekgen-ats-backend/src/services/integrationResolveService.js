const prisma = require('../config/database');
const logger = require('../utils/logger');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

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
    logger.error('integrationResolve decrypt failed', e);
    return null;
  }
}

function parseConfig(configStr) {
  try {
    return JSON.parse(configStr || '{}');
  } catch {
    return {};
  }
}

/**
 * User row wins over global (same merge as Integrations UI).
 */
async function pickIntegrationSetting(platform, userId) {
  const userSetting = await prisma.integrationSetting.findFirst({
    where: { userId, platform, isEnabled: true },
  });
  if (userSetting) return { setting: userSetting, fromGlobal: false };

  const globals = await prisma.integrationSetting.findMany({
    where: { platform, isEnabled: true },
  });
  const globalOne = globals.find((s) => parseConfig(s.config).isGlobal === true);
  return globalOne ? { setting: globalOne, fromGlobal: true } : { setting: null, fromGlobal: false };
}

async function getOutlookTransporter(userId) {
  const { setting } = await pickIntegrationSetting('outlook', userId);
  if (!setting?.apiKey || !setting.config) return null;
  const cfg = parseConfig(setting.config);
  const password = decryptKey(setting.apiKey);
  if (!cfg.smtpUser || !password) return null;
  const transporter = nodemailer.createTransport({
    host: cfg.smtpHost || 'smtp.office365.com',
    port: cfg.smtpPort || 587,
    secure: false,
    auth: { user: cfg.smtpUser, pass: password },
    tls: { rejectUnauthorized: false },
  });
  return { transporter, from: cfg.smtpUser };
}

async function getTeamsWebhookUrl(userId) {
  const { setting } = await pickIntegrationSetting('teams', userId);
  const url = setting?.webhookUrl || null;
  if (!url || !/^https?:\/\//i.test(url)) return null;
  return url;
}

async function getWhatsAppCredentials(userId) {
  const { setting } = await pickIntegrationSetting('whatsapp', userId);
  if (!setting?.apiKey || !setting.config) return null;
  const cfg = parseConfig(setting.config);
  const token = decryptKey(setting.apiKey);
  const phoneNumberId = cfg.phoneNumberId;
  if (!token || !phoneNumberId) return null;
  return { accessToken: token, phoneNumberId };
}

async function sendWhatsAppText({ accessToken, phoneNumberId, to, body }) {
  const cleanTo = String(to).replace(/\D/g, '');
  if (cleanTo.length < 8) throw new Error('Invalid phone number for WhatsApp');
  const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: cleanTo,
      type: 'text',
      text: { body },
    }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data.error?.message || `WhatsApp send failed (${resp.status})`);
  }
  return data;
}

module.exports = {
  parseConfig,
  decryptKey,
  pickIntegrationSetting,
  getOutlookTransporter,
  getTeamsWebhookUrl,
  getWhatsAppCredentials,
  sendWhatsAppText,
};
