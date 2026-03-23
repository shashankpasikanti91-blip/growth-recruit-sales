import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CandidatesService, CreateCandidateDto } from './candidates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('candidates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'candidates', version: '1' })
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.RECRUITER)
  @ApiOperation({ summary: 'Create candidate manually' })
  create(@CurrentUser('tenantId') tenantId: string, @Body() dto: CreateCandidateDto) {
    return this.candidatesService.create(tenantId, dto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES, UserRole.VIEWER)
  @ApiOperation({ summary: 'List candidates with filters' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'skills', required: false, description: 'Comma-separated skill names' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('search') search?: string,
    @Query('skills') skills?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.candidatesService.findAll(tenantId, { search, skills, page, limit });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get candidate full profile' })
  findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.candidatesService.findOne(tenantId, id);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.RECRUITER)
  @ApiOperation({ summary: 'Update candidate' })
  update(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string, @Body() dto: Partial<CreateCandidateDto>) {
    return this.candidatesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.RECRUITER)
  @ApiOperation({ summary: 'Archive candidate (soft delete)' })
  archive(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.candidatesService.archive(tenantId, id);
  }

  @Post(':id/notes')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.RECRUITER)
  @ApiOperation({ summary: 'Add recruiter note to candidate' })
  addNote(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('note') note: string,
  ) {
    return this.candidatesService.addNote(user.tenantId, id, user.id, note);
  }
}
