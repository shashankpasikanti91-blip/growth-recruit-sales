import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Tenant slug "${dto.slug}" already exists`);

    return this.prisma.tenant.create({ data: dto });
  }

  async findAll(page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, slug: true, isActive: true,
          countryCode: true, timezone: true, currency: true, createdAt: true,
          _count: { select: { users: true, candidates: true, leads: true } },
        },
      }),
      this.prisma.tenant.count(),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, candidates: true, jobs: true, leads: true, companies: true } },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id);
    return this.prisma.tenant.update({ where: { id }, data: dto });
  }

  async toggleActive(id: string) {
    const tenant = await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data: { isActive: !tenant.isActive },
    });
  }
}
