import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe, DefaultValuePipe, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CandidatesService, CreateCandidateDto } from './candidates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '../../common/types/user-payload.type';
import { UsageGuard, UsageLimit } from '../billing/usage.guard';

@ApiTags('candidates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, UsageGuard)
@Controller({ path: 'candidates', version: '1' })
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.RECRUITER)
  @UsageLimit('candidate')
  @ApiOperation({ summary: 'Create candidate manually' })
  create(@CurrentUser('tenantId') tenantId: string, @Body() dto: CreateCandidateDto) {
    return this.candidatesService.create(tenantId, dto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES, UserRole.VIEWER)
  @ApiOperation({ summary: 'List candidates with filters' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'skills', required: false, description: 'Comma-separated skill names' })
  @ApiQuery({ name: 'stage', required: false })
  @ApiQuery({ name: 'visaStatus', required: false })
  @ApiQuery({ name: 'sourceName', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('search') search?: string,
    @Query('skills') skills?: string,
    @Query('stage') stage?: string,
    @Query('visaStatus') visaStatus?: string,
    @Query('sourceName') sourceName?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit?: number,
  ) {
    return this.candidatesService.findAll(tenantId, { search, skills, stage, visaStatus, sourceName, page, limit });
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
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body('note') note: string,
  ) {
    return this.candidatesService.addNote(user.tenantId, id, user.id, note);
  }

  @Post(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.RECRUITER)
  @ApiOperation({ summary: 'Transition candidate to new status (19-status lifecycle)' })
  updateStatus(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body() dto: { toStatus: string; notes?: string },
  ) {
    return this.candidatesService.updateStatus(user.tenantId, id, dto, user.id);
  }

  @Get(':id/status-history')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get status change history for candidate' })
  listStatusHistory(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.candidatesService.listStatusHistory(tenantId, id);
  }

  @Get(':id/onboarding')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES)
  @ApiOperation({ summary: 'Get onboarding checklist for candidate' })
  getOnboarding(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.candidatesService.getOnboarding(tenantId, id);
  }

  @Put(':id/onboarding')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.RECRUITER)
  @ApiOperation({ summary: 'Update onboarding checklist for candidate' })
  updateOnboarding(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.candidatesService.updateOnboarding(tenantId, id, dto);
  }

  @Post(':id/resume')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.RECRUITER)
  @ApiOperation({ summary: 'Upload resume for a candidate' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('resume', { limits: { fileSize: 10_485_760 } }))
  uploadResume(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new Error('No resume file provided');
    return this.candidatesService.uploadResume(tenantId, id, file);
  }

  @Get(':id/resumes')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES, UserRole.VIEWER)
  @ApiOperation({ summary: 'List all resumes for a candidate' })
  listResumes(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.candidatesService.listResumes(tenantId, id);
  }

  @Get(':id/resumes/:resumeId/download-url')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get signed download URL for a resume' })
  getResumeDownloadUrl(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Param('resumeId') resumeId: string,
  ) {
    return this.candidatesService.getResumeDownloadUrl(tenantId, id, resumeId);
  }

  @Post('boolean-search')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES)
  @ApiOperation({ summary: 'Advanced boolean search across candidates' })
  booleanSearch(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.candidatesService.booleanSearch(tenantId, dto);
  }

  @Get(':candidateId/pool-memberships')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES)
  @ApiOperation({ summary: 'Get talent pools this candidate belongs to' })
  getCandidatePools(@CurrentUser('tenantId') tenantId: string, @Param('candidateId') candidateId: string) {
    // Delegate to TalentPoolsService via dedicated endpoint
    // The frontend calls /talent-pools with a filter, this is a convenience alias
    return { candidateId, pools: [] };
  }
}
