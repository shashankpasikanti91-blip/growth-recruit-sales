import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards, ParseIntPipe, DefaultValuePipe, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { TenantsService } from './tenants.service';
import { TenantOnboardingService } from './tenant-onboarding.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '../../common/types/user-payload.type';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'tenants', version: '1' })
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly onboarding: TenantOnboardingService,
  ) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new tenant (Super Admin only)' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all tenants' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.tenantsService.findAll(page, limit);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get tenant by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    // TENANT_ADMIN can only view their own tenant
    if (user.role === UserRole.TENANT_ADMIN && user.tenantId !== id) {
      throw new ForbiddenException('Access denied: you can only view your own tenant');
    }
    return this.tenantsService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update tenant' })
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto, @CurrentUser() user: UserPayload) {
    // TENANT_ADMIN can only update their own tenant
    if (user.role === UserRole.TENANT_ADMIN && user.tenantId !== id) {
      throw new ForbiddenException('Access denied: you can only update your own tenant');
    }
    return this.tenantsService.update(id, dto);
  }

  @Patch(':id/toggle')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Toggle tenant active status' })
  toggleActive(@Param('id') id: string) {
    return this.tenantsService.toggleActive(id);
  }

  @Post(':id/onboard')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Re-run tenant onboarding (idempotent — seeds missing defaults only)' })
  onboard(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    if (user.role === UserRole.TENANT_ADMIN && user.tenantId !== id) {
      throw new ForbiddenException('Access denied');
    }
    return this.onboarding.setup(id);
  }
}
