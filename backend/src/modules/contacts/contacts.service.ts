import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IsString, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty() @IsString() firstName: string;
  @ApiProperty() @IsString() lastName: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() companyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() linkedinUrl?: string;
}

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateContactDto) {
    return this.prisma.contact.create({ data: { tenantId, ...dto } });
  }

  async findAll(tenantId: string, companyId?: string) {
    return this.prisma.contact.findMany({
      where: { tenantId, ...(companyId ? { companyId } : {}) },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      include: { company: { select: { id: true, name: true } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, tenantId },
      include: {
        company: true,
        outreachMessages: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateContactDto>) {
    await this.findOne(tenantId, id);
    return this.prisma.contact.update({ where: { id }, data: dto });
  }
}
