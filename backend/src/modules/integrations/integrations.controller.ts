import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { IntegrationsService } from './integrations.service';
import { IsString, IsObject, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UpsertIntegrationDto {
  @ApiProperty() @IsString() provider: string;
  @ApiProperty() @IsObject() config: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

@ApiTags('Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  @ApiOperation({ summary: 'List configured integrations' })
  list(@CurrentUser('tenantId') tenantId: string) {
    return this.integrationsService.list(tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Add or update an integration' })
  upsert(@CurrentUser('tenantId') tenantId: string, @Body() dto: UpsertIntegrationDto) {
    return this.integrationsService.upsert(tenantId, dto.provider, dto.config, dto.isActive ?? true);
  }

  @Post(':provider/test')
  @ApiOperation({ summary: 'Test an integration connection' })
  test(@CurrentUser('tenantId') tenantId: string, @Param('provider') provider: string) {
    return this.integrationsService.test(tenantId, provider);
  }
}
