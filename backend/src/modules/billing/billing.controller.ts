import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'billing', version: '1' })
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('plans')
  @ApiOperation({ summary: 'List all available pricing plans' })
  getPlans() {
    return this.billing.getPlans();
  }

  @Get('subscription')
  @ApiOperation({ summary: 'Get current subscription for the authenticated tenant' })
  getSubscription(@CurrentUser() user: any) {
    return this.billing.getSubscription(user.tenantId);
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get usage summary vs plan limits' })
  getUsage(@CurrentUser() user: any) {
    return this.billing.getUsageSummary(user.tenantId);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List invoices for the tenant' })
  getInvoices(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.billing.getInvoices(user.tenantId, Number(page), Number(limit));
  }

  @Post('change-plan')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Upgrade or downgrade subscription plan (TENANT_ADMIN+ only)' })
  changePlan(@CurrentUser() user: any, @Body() body: { planId: string; billingCycle: 'monthly' | 'annual' }) {
    return this.billing.changePlan(user.tenantId, body.planId, body.billingCycle);
  }
}
