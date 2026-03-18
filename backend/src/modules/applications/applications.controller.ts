import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { ApplicationsService } from './applications.service';
import {
  CreateApplicationDto,
  UpdateApplicationStageDto,
  ScreenApplicationDto,
} from './dto/application.dto';

@ApiTags('Applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create application (links candidate to job)' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SUPER_ADMIN)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateApplicationDto,
  ) {
    return this.applicationsService.create(tenantId, userId, dto);
  }

  @Post(':id/screen')
  @ApiOperation({ summary: 'Run 6-step AI screening on this application' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SUPER_ADMIN)
  screen(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: ScreenApplicationDto,
  ) {
    return this.applicationsService.screenApplication(tenantId, id, dto.resumeText);
  }

  @Patch(':id/stage')
  @ApiOperation({ summary: 'Manually update application stage' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SUPER_ADMIN)
  updateStage(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStageDto,
  ) {
    return this.applicationsService.updateStage(tenantId, id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List applications with filters' })
  @ApiQuery({ name: 'jobId', required: false })
  @ApiQuery({ name: 'candidateId', required: false })
  @ApiQuery({ name: 'stage', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('jobId') jobId?: string,
    @Query('candidateId') candidateId?: string,
    @Query('stage') stage?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.applicationsService.findAll(tenantId, { jobId, candidateId, stage, page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application details with scorecards and AI analyses' })
  findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.applicationsService.findOne(tenantId, id);
  }
}
