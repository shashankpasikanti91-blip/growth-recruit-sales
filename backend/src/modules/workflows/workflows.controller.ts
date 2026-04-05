import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { WorkflowsService } from './workflows.service';

class PauseRunDto {
  @ApiProperty({ description: 'Reason for pausing this run' })
  @IsString()
  reason: string;
}

class CancelRunDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

class ManualOverrideDto {
  @ApiProperty({ description: 'Reason / justification for the override (logged in audit)' })
  @IsString()
  note: string;

  @ApiPropertyOptional({ description: 'Force a specific status (e.g. QUEUED, SUCCESS)' })
  @IsOptional()
  @IsString()
  forceStatus?: string;
}

@ApiTags('Workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  // ─── List / Read ──────────────────────────────────────────────────────────

  @Get('runs')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES, UserRole.VIEWER)
  @ApiOperation({ summary: 'List workflow runs with filters' })
  @ApiQuery({ name: 'workflowType', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'isPaused', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('workflowType') workflowType?: string,
    @Query('status') status?: string,
    @Query('isPaused') isPaused?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.workflowsService.findAll(tenantId, {
      workflowType,
      status,
      isPaused: isPaused !== undefined ? isPaused === 'true' : undefined,
      page,
      limit,
    });
  }

  @Get('stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get workflow run statistics for analytics dashboard' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getStats(
    @CurrentUser('tenantId') tenantId: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days?: number,
  ) {
    return this.workflowsService.getStats(tenantId, days);
  }

  @Get('runs/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get a single workflow run by ID' })
  @ApiParam({ name: 'id' })
  findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.workflowsService.findOne(tenantId, id);
  }

  // ─── Control actions ─────────────────────────────────────────────────────

  @Patch('runs/:id/pause')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Pause a workflow run' })
  @ApiParam({ name: 'id' })
  pause(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: PauseRunDto,
  ) {
    return this.workflowsService.pause(tenantId, id, dto.reason);
  }

  @Patch('runs/:id/resume')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Resume a paused workflow run' })
  @ApiParam({ name: 'id' })
  @HttpCode(HttpStatus.OK)
  resume(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.workflowsService.resume(tenantId, id);
  }

  @Patch('runs/:id/retry')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.RECRUITER)
  @ApiOperation({ summary: 'Retry a failed or paused workflow run' })
  @ApiParam({ name: 'id' })
  @HttpCode(HttpStatus.OK)
  retry(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.workflowsService.retry(tenantId, id);
  }

  @Patch('runs/:id/cancel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Cancel a workflow run' })
  @ApiParam({ name: 'id' })
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: CancelRunDto,
  ) {
    return this.workflowsService.cancel(tenantId, id, dto.reason);
  }

  /**
   * Manual Override — admin-only action to force a run past a blocked/paused state.
   * The override note and actor are stored permanently in the run record for audit purposes.
   */
  @Post('runs/:id/override')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Admin manual override — force run past blocked state (audit logged)' })
  @ApiParam({ name: 'id' })
  @HttpCode(HttpStatus.OK)
  manualOverride(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('email') overriddenBy: string,
    @Param('id') id: string,
    @Body() dto: ManualOverrideDto,
  ) {
    return this.workflowsService.manualOverride(tenantId, id, overriddenBy, dto.note, dto.forceStatus);
  }
}
