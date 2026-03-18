import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MappingsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTemplates(tenantId: string) {
    return this.prisma.mappingTemplate.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async upsertTemplate(tenantId: string, name: string, sourceType: string, mappingConfig: Record<string, string>) {
    return this.prisma.mappingTemplate.upsert({
      where: { tenantId_name: { tenantId, name } },
      create: { tenantId, name, sourceType, mappingConfig },
      update: { mappingConfig, sourceType },
    });
  }

  async deleteTemplate(tenantId: string, id: string) {
    return this.prisma.mappingTemplate.deleteMany({ where: { id, tenantId } });
  }
}
