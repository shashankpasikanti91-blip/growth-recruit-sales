import { Controller, Get, Post, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { BillingService } from './billing.service';
import { UsageService } from './usage.service';
import { ChangePlanDto, SetCustomLimitsDto } from './dto/billing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '../../common/types/user-payload.type';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'billing', version: '1' })
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly usageService: UsageService,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'List all available pricing plans' })
  getPlans() {
    return this.billing.getPlans();
  }

  @Get('subscription')
  @ApiOperation({ summary: 'Get current subscription for the authenticated tenant' })
  getSubscription(@CurrentUser() user: UserPayload) {
    return this.billing.getSubscription(user.tenantId);
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get usage summary vs plan limits' })
  getUsage(@CurrentUser() user: UserPayload) {
    return this.billing.getUsageSummary(user.tenantId);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List invoices for the tenant' })
  getInvoices(
    @CurrentUser() user: UserPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.billing.getInvoices(user.tenantId, Number(page), Number(limit));
  }

  @Post('change-plan')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Upgrade or downgrade subscription plan (TENANT_ADMIN+ only)' })
  changePlan(@CurrentUser() user: UserPayload, @Body() dto: ChangePlanDto) {
    return this.billing.changePlan(user.tenantId, dto.planId, dto.billingCycle);
  }

  @Get('tenant/usage')
  @ApiOperation({ summary: 'Get tenant usage vs plan limits (the standard usage API)' })
  getTenantUsage(@CurrentUser() user: UserPayload) {
    return this.usageService.getUsageSummary(user.tenantId);
  }

  @Post('admin/limits')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Set custom limits for a tenant (SUPER_ADMIN only)' })
  setCustomLimits(@Body() dto: SetCustomLimitsDto) {
    const { tenantId, ...limits } = dto;
    return this.usageService.setCustomLimits(tenantId, limits);
  }
}
