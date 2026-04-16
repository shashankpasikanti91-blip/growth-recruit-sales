import { Controller, Get, Param, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CountriesService } from './countries.service';
import { UpsertTenantCountryConfigDto } from './dto/country.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('countries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'countries', version: '1' })
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all country configs' })
  findAll() {
    return this.countriesService.findAll();
  }

  @Get('visa-rules')
  @ApiOperation({ summary: 'Get all visa rules grouped by country' })
  getAllVisaRules() {
    return this.countriesService.getAllVisaRulesGrouped();
  }

  @Get(':code')
  @ApiOperation({ summary: 'Get country config by code' })
  findOne(@Param('code') code: string) {
    return this.countriesService.findOne(code.toUpperCase());
  }

  @Get(':code/visa-rules')
  @ApiOperation({ summary: 'Get visa rules for a specific country' })
  getVisaRules(@Param('code') code: string) {
    return this.countriesService.getVisaRules(code.toUpperCase());
  }

  @Get(':code/visa-rules/:visaType')
  @ApiOperation({ summary: 'Get specific visa rule details' })
  getVisaRule(@Param('code') code: string, @Param('visaType') visaType: string) {
    return this.countriesService.getVisaRule(code.toUpperCase(), visaType.toUpperCase());
  }

  @Get('tenant/configs')
  @ApiOperation({ summary: 'Get tenant country configs' })
  getTenantConfigs(@CurrentUser('tenantId') tenantId: string) {
    return this.countriesService.getTenantCountryConfigs(tenantId);
  }

  @Put('tenant/:code')
  @Roles(UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Upsert tenant country config' })
  upsertTenantConfig(
    @CurrentUser('tenantId') tenantId: string,
    @Param('code') code: string,
    @Body() dto: UpsertTenantCountryConfigDto,
  ) {
    return this.countriesService.upsertTenantCountryConfig(
      tenantId,
      code.toUpperCase(),
      dto.customTemplates || {},
      dto.isDefault || false,
    );
  }
}
