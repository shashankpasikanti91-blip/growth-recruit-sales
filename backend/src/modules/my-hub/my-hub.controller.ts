import {
  Controller, Get, Put, Body, Query, UseGuards,
  DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MyHubService } from './my-hub.service';

@ApiTags('my-hub')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'my', version: '1' })
export class MyHubController {
  constructor(private readonly myHubService: MyHubService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get my own profile' })
  getProfile(@CurrentUser('id') userId: string) {
    return this.myHubService.getProfile(userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update my own profile' })
  updateProfile(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: { firstName?: string; lastName?: string; settings?: Record<string, any> },
  ) {
    return this.myHubService.updateProfile(userId, tenantId, dto);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'My role-aware productivity dashboard' })
  getDashboard(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.myHubService.getDashboard(userId, tenantId, role);
  }

  @Get('jds')
  @ApiOperation({ summary: 'My assigned JDs (recruiter)' })
  @ApiQuery({ name: 'page',  required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMyJDs(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.myHubService.getMyJDs(userId, tenantId, { page, limit });
  }

  @Get('submissions')
  @ApiOperation({ summary: 'My submissions (recruiter)' })
  @ApiQuery({ name: 'page',  required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'stage', required: false, type: String })
  getMySubmissions(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('stage') stage?: string,
  ) {
    return this.myHubService.getMySubmissions(userId, tenantId, { page, limit, stage });
  }

  @Get('leads')
  @ApiOperation({ summary: 'My assigned leads (sales)' })
  @ApiQuery({ name: 'page',  required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'stage', required: false, type: String })
  getMyLeads(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('stage') stage?: string,
  ) {
    return this.myHubService.getMyLeads(userId, tenantId, { page, limit, stage });
  }

  @Get('follow-ups')
  @ApiOperation({ summary: 'My follow-ups (all roles)' })
  @ApiQuery({ name: 'view',  required: false, type: String, enum: ['today', 'overdue', 'week', 'completed', 'all'] })
  @ApiQuery({ name: 'page',  required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMyFollowUps(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Query('view')  view?: string,
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number = 25,
  ) {
    return this.myHubService.getMyFollowUps(userId, tenantId, { view, page, limit });
  }

  @Get('activity')
  @ApiOperation({ summary: 'My recent activity feed' })
  @ApiQuery({ name: 'page',  required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMyActivity(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.myHubService.getMyActivity(userId, tenantId, { page, limit });
  }
}
