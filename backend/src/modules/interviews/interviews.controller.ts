import {
  Controller, Get, Post, Put, Delete, Body, Param,
  Query, UseGuards, DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { InterviewsService } from './interviews.service';
import { CreateInterviewDto, UpdateInterviewDto } from './dto/interview.dto';

@ApiTags('Interviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post()
  @ApiOperation({ summary: 'Schedule an interview for a submission' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.SALES, UserRole.RECRUITER, UserRole.SUPER_ADMIN)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateInterviewDto,
  ) {
    return this.interviewsService.create(tenantId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List interviews with optional filters' })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('submissionId') submissionId?: string,
    @Query('candidateId') candidateId?: string,
    @Query('jobId') jobId?: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.interviewsService.findAll(tenantId, { submissionId, candidateId, jobId, status, page, limit });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get interview counts by status' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.interviewsService.getStats(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get interview by ID' })
  findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.interviewsService.findOne(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update interview (status, feedback, result, reschedule)' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.SALES, UserRole.RECRUITER, UserRole.SUPER_ADMIN)
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInterviewDto,
  ) {
    return this.interviewsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel / soft-delete an interview' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  remove(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.interviewsService.remove(tenantId, id);
  }
}
