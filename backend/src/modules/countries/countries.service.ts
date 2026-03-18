import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CountriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.countryConfig.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(code: string) {
    const country = await this.prisma.countryConfig.findUnique({ where: { code } });
    if (!country) throw new NotFoundException(`Country config "${code}" not found`);
    return country;
  }

  async getTenantCountryConfigs(tenantId: string) {
    return this.prisma.tenantCountryConfig.findMany({
      where: { tenantId },
      include: { country: true },
    });
  }

  async upsertTenantCountryConfig(tenantId: string, countryCode: string, customTemplates: Record<string, any>, isDefault: boolean) {
    await this.findOne(countryCode);
    return this.prisma.tenantCountryConfig.upsert({
      where: { tenantId_countryCode: { tenantId, countryCode } },
      update: { customTemplates, isDefault },
      create: { tenantId, countryCode, customTemplates, isDefault },
    });
  }

  async getDefaultCountryForTenant(tenantId: string) {
    const tenantDefault = await this.prisma.tenantCountryConfig.findFirst({
      where: { tenantId, isDefault: true },
      include: { country: true },
    });
    if (tenantDefault) return tenantDefault.country;

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.findOne(tenant.countryCode);
  }
}
