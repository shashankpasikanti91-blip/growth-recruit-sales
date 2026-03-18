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
    return this.prisma.integration.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async upsert(
    tenantId: string,
    provider: string,
    config: Record<string, any>,
    isActive = true,
  ) {
    const existing = await this.prisma.integration.findFirst({ where: { tenantId, type: provider } });
    if (existing) {
      return this.prisma.integration.update({
        where: { id: existing.id },
        data: { config, isActive, status: isActive ? 'ACTIVE' : 'INACTIVE' },
      });
    }
    return this.prisma.integration.create({
      data: { tenantId, name: provider, type: provider, config, isActive, status: 'ACTIVE' },
    });
  }

  async test(tenantId: string, provider: string): Promise<{ success: boolean; message: string }> {
    const integration = await this.prisma.integration.findFirst({ where: { tenantId, type: provider } });
    if (!integration) return { success: false, message: 'Integration not configured' };
    // Placeholder — real implementations would call the external API
    return { success: true, message: `${provider} integration is configured` };
  }
}
