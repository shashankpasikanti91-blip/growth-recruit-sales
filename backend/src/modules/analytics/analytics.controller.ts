import { Controller, Get, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import { WorkflowsService } from '../workflows/workflows.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly workflowsService: WorkflowsService,
  ) {}

  @Get('recruitment')
  @ApiOperation({ summary: 'Recruitment funnel summary' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getRecruitment(
    @CurrentUser('tenantId') tenantId: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getRecruitmentSummary(tenantId, days);
  }

  @Get('sales')
  @ApiOperation({ summary: 'Sales pipeline summary' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getSales(
    @CurrentUser('tenantId') tenantId: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getSalesSummary(tenantId, days);
  }

  @Get('ai-usage')
  @ApiOperation({ summary: 'AI token usage and cost breakdown' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getAiUsage(
    @CurrentUser('tenantId') tenantId: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getAiUsage(tenantId, days);
  }

  @Get('workflows')
  @ApiOperation({ summary: 'Workflow automation statistics — success rate, failures, paused runs' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getWorkflowStats(
    @CurrentUser('tenantId') tenantId: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.workflowsService.getStats(tenantId, days);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard KPI cards and recent activity' })
  getDashboard(@CurrentUser('tenantId') tenantId: string) {
    return this.analyticsService.getDashboardKpis(tenantId);
  }
}
