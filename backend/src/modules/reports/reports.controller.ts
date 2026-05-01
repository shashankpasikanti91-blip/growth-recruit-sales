import {
  Controller,
  Get,
  Put,
  Query,
  Body,
  Res,
  UseGuards,
  Version,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Reports & Exports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  // ─── 9.1 Placement Velocity ──────────────────────────────────────────────

  @Get('placement-velocity')
  @Roles('SUPER_ADMIN', 'TENANT_ADMIN', 'SALES', 'RECRUITER')
  @ApiOperation({ summary: 'Placement velocity report' })
  async placementVelocity(
    @CurrentUser('tenantId') tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('recruiterId') recruiterId?: string,
    @Query('clientId') clientId?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.svc.getPlacementVelocity(tenantId, from, to, recruiterId, clientId);
    return this.respond(res!, format, data, 'placement-velocity');
  }

  // ─── 9.2 Sales Pipeline ───────────────────────────────────────────────────

  @Get('sales-pipeline')
  @Roles('SUPER_ADMIN', 'TENANT_ADMIN', 'SALES')
  @ApiOperation({ summary: 'Sales pipeline report per sales rep' })
  async salesPipeline(
    @CurrentUser('tenantId') tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('userId') userId?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.svc.getSalesPipeline(tenantId, from, to, userId);
    return this.respond(res!, format, data, 'sales-pipeline');
  }

  // ─── 9.3 Recruiter Performance ───────────────────────────────────────────

  @Get('recruiter-performance')
  @Roles('SUPER_ADMIN', 'TENANT_ADMIN', 'RECRUITER')
  @ApiOperation({ summary: 'Recruiter performance leaderboard' })
  async recruiterPerformance(
    @CurrentUser('tenantId') tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('userId') userId?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.svc.getRecruiterPerformance(tenantId, from, to, userId);
    return this.respond(res!, format, data, 'recruiter-performance');
  }

  // ─── 9.4 Client Activity ─────────────────────────────────────────────────

  @Get('client-activity')
  @Roles('SUPER_ADMIN', 'TENANT_ADMIN', 'SALES')
  @ApiOperation({ summary: 'Client activity & placement counts' })
  async clientActivity(
    @CurrentUser('tenantId') tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('clientId') clientId?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.svc.getClientActivity(tenantId, from, to, clientId);
    return this.respond(res!, format, data, 'client-activity');
  }

  // ─── 9.5 AI Usage ────────────────────────────────────────────────────────

  @Get('ai-usage')
  @Roles('SUPER_ADMIN', 'TENANT_ADMIN')
  @ApiOperation({ summary: 'AI screening + lead gen usage per user' })
  async aiUsage(
    @CurrentUser('tenantId') tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('userId') userId?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.svc.getAiUsage(tenantId, from, to, userId);
    return this.respond(res!, format, data, 'ai-usage');
  }

  // ─── Dashboard widget layout ──────────────────────────────────────────────

  @Get('dashboard/widgets')
  @Roles('SUPER_ADMIN', 'TENANT_ADMIN', 'SALES', 'RECRUITER', 'VIEWER')
  @ApiOperation({ summary: 'Get personalised dashboard widget layout' })
  getWidgets(@CurrentUser('id') userId: string) {
    return this.svc.getWidgetLayout(userId);
  }

  @Put('dashboard/widgets')
  @Roles('SUPER_ADMIN', 'TENANT_ADMIN', 'SALES', 'RECRUITER', 'VIEWER')
  @ApiOperation({ summary: 'Save dashboard widget layout' })
  saveWidgets(
    @CurrentUser('id') userId: string,
    @Body() body: { layout: string[] },
  ) {
    return this.svc.saveWidgetLayout(userId, body.layout ?? []);
  }

  // ─── Private helper ───────────────────────────────────────────────────────

  private respond(
    res: Response,
    format: string | undefined,
    data: Record<string, unknown>[],
    filename: string,
  ) {
    if (format === 'csv') {
      const csv = this.svc.buildCsv(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csv);
      return;
    }
    if (format === 'xlsx') {
      const buf = this.svc.buildXlsx(data, filename);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      res.send(buf);
      return;
    }
    return { data };
  }
}
