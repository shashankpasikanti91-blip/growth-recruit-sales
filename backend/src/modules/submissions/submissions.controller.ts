import {
  Controller, Get, Post, Patch, Delete, Put,
  Body, Param, Query, UseGuards,
  DefaultValuePipe, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, SubmissionStage } from '@prisma/client';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto, UpdateSubmissionDto } from './dto/submission.dto';

class ClientFeedbackDto {
  @IsString() feedback: string;
  @IsOptional() @IsString() stage?: SubmissionStage;
}

@ApiTags('Submissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly service: SubmissionsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a candidate to a client JD' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.SALES, UserRole.RECRUITER)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSubmissionDto,
  ) {
    return this.service.create(tenantId, dto, userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get submission stage statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.service.getStats(tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List submissions with filters' })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'jobId', required: false })
  @ApiQuery({ name: 'candidateId', required: false })
  @ApiQuery({ name: 'recruiterId', required: false })
  @ApiQuery({ name: 'stage', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('clientId') clientId?: string,
    @Query('jobId') jobId?: string,
    @Query('candidateId') candidateId?: string,
    @Query('recruiterId') recruiterId?: string,
    @Query('stage') stage?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.service.findAll(tenantId, {
      clientId, jobId, candidateId, recruiterId, stage, page, limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get submission detail (360 view)' })
  findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update submission (stage, feedback, interview date)' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSubmissionDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Put(':id/client-feedback')
  @ApiOperation({ summary: 'Record client feedback and optionally advance stage (Sales only)' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.SALES)
  updateClientFeedback(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ClientFeedbackDto,
  ) {
    return this.service.updateClientFeedback(tenantId, id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete submission' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
