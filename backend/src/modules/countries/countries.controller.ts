import { Controller, Get, Param, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CountriesService } from './countries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('countries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
  @ApiOperation({ summary: 'Upsert tenant country config' })
  upsertTenantConfig(
    @CurrentUser('tenantId') tenantId: string,
    @Param('code') code: string,
    @Body() body: { customTemplates?: Record<string, any>; isDefault?: boolean },
  ) {
    return this.countriesService.upsertTenantCountryConfig(
      tenantId,
      code.toUpperCase(),
      body.customTemplates || {},
      body.isDefault || false,
    );
  }
}
