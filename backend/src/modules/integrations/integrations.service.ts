import { Injectable } from '@nestjs/common';
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
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    return this.prisma.integration.findMany({ where: { tenantId }, orderBy: { provider: 'asc' } });
  }

  async upsert(
    tenantId: string,
    provider: string,
    config: Record<string, any>,
    isActive = true,
  ) {
    return this.prisma.integration.upsert({
      where: { tenantId_provider: { tenantId, provider } },
      create: { tenantId, provider, config, isActive, status: 'ACTIVE' },
      update: { config, isActive, status: isActive ? 'ACTIVE' : 'INACTIVE' },
    });
  }

  async test(tenantId: string, provider: string): Promise<{ success: boolean; message: string }> {
    const integration = await this.prisma.integration.findFirst({ where: { tenantId, provider } });
    if (!integration) return { success: false, message: 'Integration not configured' };
    // Placeholder — real implementations would call the external API
    return { success: true, message: `${provider} integration is configured` };
  }
}
