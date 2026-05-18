import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreatePoolDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
}

export class AddMemberDto {
  @IsString() candidateId: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreateSavedSearchDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  queryJson: Record<string, any>;
  @IsOptional() @IsString() entityType?: string;
}

@Injectable()
export class TalentPoolsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Talent Pools ──────────────────────────────────────────────────────────

  async listPools(tenantId: string) {
    const pools = await this.prisma.talentPool.findMany({
      where: { tenantId },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return pools;
  }

  async createPool(tenantId: string, dto: CreatePoolDto, createdById?: string) {
    return this.prisma.talentPool.create({
      data: { tenantId, name: dto.name, description: dto.description, createdById },
    });
  }

  async getPool(tenantId: string, id: string) {
    const pool = await this.prisma.talentPool.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { members: true } },
        members: {
          orderBy: { createdAt: 'desc' },
          include: {
            candidate: {
              select: {
                id: true,
                businessId: true,
                firstName: true,
                lastName: true,
                email: true,
                currentTitle: true,
                currentCompany: true,
                stage: true,
                skills: true,
                location: true,
                yearsExperience: true,
              },
            },
          },
        },
      },
    });
    if (!pool) throw new NotFoundException('Talent pool not found');
    return pool;
  }

  async deletePool(tenantId: string, id: string) {
    const pool = await this.prisma.talentPool.findFirst({ where: { id, tenantId } });
    if (!pool) throw new NotFoundException('Talent pool not found');
    await this.prisma.talentPool.deleteMany({ where: { id, tenantId } });
    return { deleted: true };
  }

  async addMember(tenantId: string, poolId: string, dto: AddMemberDto, addedById?: string) {
    const pool = await this.prisma.talentPool.findFirst({ where: { id: poolId, tenantId } });
    if (!pool) throw new NotFoundException('Talent pool not found');

    const candidate = await this.prisma.candidate.findFirst({
      where: { id: dto.candidateId, tenantId, isActive: true },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');

    const existing = await this.prisma.talentPoolMember.findUnique({
      where: { poolId_candidateId: { poolId, candidateId: dto.candidateId } },
    });
    if (existing) throw new ConflictException('Candidate is already in this pool');

    return this.prisma.talentPoolMember.create({
      data: { tenantId, poolId, candidateId: dto.candidateId, addedById, notes: dto.notes },
    });
  }

  async removeMember(tenantId: string, poolId: string, candidateId: string) {
    const pool = await this.prisma.talentPool.findFirst({ where: { id: poolId, tenantId } });
    if (!pool) throw new NotFoundException('Talent pool not found');

    const member = await this.prisma.talentPoolMember.findUnique({
      where: { poolId_candidateId: { poolId, candidateId } },
    });
    if (!member) throw new NotFoundException('Member not found in pool');

    await this.prisma.talentPoolMember.delete({
      where: { poolId_candidateId: { poolId, candidateId } },
    });
    return { removed: true };
  }

  /** Return the pool IDs a candidate belongs to (for Candidate 360 badge) */
  async getCandidatePools(tenantId: string, candidateId: string) {
    const memberships = await this.prisma.talentPoolMember.findMany({
      where: { tenantId, candidateId },
      include: { pool: { select: { id: true, name: true } } },
    });
    return memberships.map((m: any) => ({ poolId: m.pool.id, poolName: m.pool.name, addedAt: m.createdAt }));
  }

  // ─── Saved Searches ────────────────────────────────────────────────────────

  async listSavedSearches(tenantId: string) {
    return this.prisma.savedSearch.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSavedSearch(tenantId: string, dto: CreateSavedSearchDto, createdById?: string) {
    return this.prisma.savedSearch.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        queryJson: dto.queryJson,
        entityType: dto.entityType ?? 'candidate',
        createdById,
      },
    });
  }

  async deleteSavedSearch(tenantId: string, id: string) {
    const search = await this.prisma.savedSearch.findFirst({ where: { id, tenantId } });
    if (!search) throw new NotFoundException('Saved search not found');
    await this.prisma.savedSearch.deleteMany({ where: { id, tenantId } });
    return { deleted: true };
  }
}
