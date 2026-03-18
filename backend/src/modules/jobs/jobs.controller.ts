import {
  Controller,
  Get,
  Post,
  Put,
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
import { JobsService } from './jobs.service';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';

@ApiTags('Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new job (auto-parses JD via AI if no skills provided)' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SUPER_ADMIN)
  create(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: CreateJobDto) {
    return this.jobsService.create(tenantId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all jobs with optional filters' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.jobsService.findAll(tenantId, {
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job by ID with applications' })
  findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.jobsService.findOne(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update job' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SUPER_ADMIN)
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobsService.update(tenantId, id, dto);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Close a job posting' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SUPER_ADMIN)
  close(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.jobsService.close(tenantId, id);
  }
}
