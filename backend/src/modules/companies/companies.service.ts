import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IsString, IsOptional, IsUrl, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() domain?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() industry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() size?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() linkedinUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() employeeCount?: number;
}

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateCompanyDto) {
    return this.prisma.company.create({
      data: { tenantId, ...dto },
    });
  }

  async findAll(tenantId: string, filters: { search?: string; industry?: string; page?: number; limit?: number }) {
    const { search, industry, page = 1, limit = 20 } = filters;
    const where: any = { tenantId };
    if (industry) where.industry = { contains: industry, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { domain: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { leads: true, contacts: true } },
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findOne(tenantId: string, id: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, tenantId },
      include: {
        leads: { orderBy: { createdAt: 'desc' }, take: 20 },
        contacts: { orderBy: { firstName: 'asc' } },
      },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateCompanyDto>) {
    await this.findOne(tenantId, id);
    return this.prisma.company.update({ where: { id }, data: dto });
  }
}
