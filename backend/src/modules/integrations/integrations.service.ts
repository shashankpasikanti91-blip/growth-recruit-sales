import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

export enum IntegrationProvider {
  LINKEDIN = 'LINKEDIN',
  INDEED = 'INDEED',
  APOLLO = 'APOLLO',
  HUNTER = 'HUNTER',
  CLEARBIT = 'CLEARBIT',
  SMTP = 'SMTP',
  SLACK = 'SLACK',
  WEBHOOK = 'WEBHOOK',
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  private readonly encKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    // Derive a 32-byte AES-256 key from JWT_SECRET so no extra env var is needed.
    // scryptSync is deterministic — same key always produced for same secret+salt.
    const secret = this.config.get<string>('auth.jwtSecret');
    if (!secret) {
      throw new Error('[IntegrationsService] auth.jwtSecret is not configured — cannot derive encryption key');
    }
    this.encKey = scryptSync(secret, 'srp-integration-salt-v1', 32) as Buffer;
  }

  // ─── Encryption helpers ─────────────────────────────────────────────────────

  private encrypt(plaintext: string): string {
    const iv = randomBytes(12); // 96-bit IV for GCM
    const cipher = createCipheriv('aes-256-gcm', this.encKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Format: iv(24 hex) + authTag(32 hex) + ciphertext(hex)
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
      this.logger.warn('Failed to decrypt integration credentials — may be corrupted or re-keyed');
      return '{}';
    }
  }

  private sanitizeForResponse(integration: any) {
    // Never return raw credentials to the API consumer
    const { credentialsEnc: _enc, ...safe } = integration;
    return { ...safe, hasCredentials: !!_enc };
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  async list(tenantId: string) {
    const integrations = await this.prisma.integration.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
    return integrations.map(i => this.sanitizeForResponse(i));
  }

  async upsert(
    tenantId: string,
    provider: string,
    credentials: Record<string, any>,
    isActive = true,
  ) {
    // Encrypt credentials with AES-256-GCM before storing
    const credentialsEnc = this.encrypt(JSON.stringify(credentials));

    // The config field stores only non-sensitive metadata (provider name, enabled features, etc.)
    const config = { provider, updatedAt: new Date().toISOString() };

    const existing = await this.prisma.integration.findFirst({ where: { tenantId, type: provider } });
    const result = existing
      ? await this.prisma.integration.update({
          where: { id: existing.id },
          data: { credentialsEnc, config, isActive, status: isActive ? 'ACTIVE' : 'INACTIVE' },
        })
      : await this.prisma.integration.create({
          data: {
            tenantId,
            name: provider,
            type: provider,
            credentialsEnc,
            config,
            isActive,
            status: 'ACTIVE',
          },
        });

    return this.sanitizeForResponse(result);
  }

  /**
   * Returns decrypted credentials for internal use only (e.g. sending email via SMTP).
   * NEVER expose this via an API endpoint.
   */
  async getCredentials(tenantId: string, provider: string): Promise<Record<string, any>> {
    const integration = await this.prisma.integration.findFirst({
      where: { tenantId, type: provider, isActive: true },
    });
    if (!integration?.credentialsEnc) return {};
    return JSON.parse(this.decrypt(integration.credentialsEnc));
  }

  async test(tenantId: string, provider: string): Promise<{ success: boolean; message: string }> {
    const integration = await this.prisma.integration.findFirst({
      where: { tenantId, type: provider },
    });
    if (!integration) return { success: false, message: 'Integration not configured' };
    if (!integration.isActive) return { success: false, message: `${provider} integration is disabled` };
    if (!integration.credentialsEnc) return { success: false, message: 'No credentials stored — please configure first' };
    // Real connection tests would be implemented per-provider here
    return { success: true, message: `${provider} integration is configured and active` };
  }

  async disable(tenantId: string, provider: string) {
    const existing = await this.prisma.integration.findFirst({ where: { tenantId, type: provider } });
    if (!existing) return null;
    return this.sanitizeForResponse(
      await this.prisma.integration.update({
        where: { id: existing.id },
        data: { isActive: false, status: 'INACTIVE' },
      }),
    );
  }
}
