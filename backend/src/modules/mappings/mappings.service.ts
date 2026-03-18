import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MappingsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTemplates(tenantId: string) {
    return this.prisma.mappingTemplate.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async upsertTemplate(tenantId: string, name: string, entityType: string, mappings: Record<string, string>) {
    const existing = await this.prisma.mappingTemplate.findFirst({ where: { tenantId, name } });
    if (existing) {
      return this.prisma.mappingTemplate.update({
        where: { id: existing.id },
        data: { mappings, entityType },
      });
    }
    return this.prisma.mappingTemplate.create({
      data: { tenantId, name, entityType, mappings },
    });
  }

  async deleteTemplate(tenantId: string, id: string) {
    return this.prisma.mappingTemplate.deleteMany({ where: { id, tenantId } });
  }
}
