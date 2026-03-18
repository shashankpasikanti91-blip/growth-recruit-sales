import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CandidatesService, CreateCandidateDto } from './candidates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('candidates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'candidates', version: '1' })
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create candidate manually' })
  create(@CurrentUser('tenantId') tenantId: string, @Body() dto: CreateCandidateDto) {
    return this.candidatesService.create(tenantId, dto);
  }

  @Get()
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
  @ApiOperation({ summary: 'Get candidate full profile' })
  findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.candidatesService.findOne(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update candidate' })
  update(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string, @Body() dto: Partial<CreateCandidateDto>) {
    return this.candidatesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive candidate' })
  archive(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.candidatesService.archive(tenantId, id);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add recruiter note to candidate' })
  addNote(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('note') note: string,
  ) {
    return this.candidatesService.addNote(user.tenantId, id, user.id, note);
  }
}
