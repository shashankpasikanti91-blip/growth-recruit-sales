import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MappingsService } from './mappings.service';
import { IsString, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class UpsertMappingDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() sourceType: string;
  @ApiProperty() @IsObject() mappingConfig: Record<string, string>;
}

@ApiTags('Mappings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('mappings')
export class MappingsController {
  constructor(private readonly mappingsService: MappingsService) {}

  @Get()
  @ApiOperation({ summary: 'List mapping templates for tenant' })
  list(@CurrentUser('tenantId') tenantId: string) {
    return this.mappingsService.listTemplates(tenantId);
  }

  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create or update a mapping template' })
  upsert(@CurrentUser('tenantId') tenantId: string, @Body() dto: UpsertMappingDto) {
    return this.mappingsService.upsertTemplate(tenantId, dto.name, dto.sourceType, dto.mappingConfig);
  }

  @Delete(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a mapping template' })
  delete(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.mappingsService.deleteTemplate(tenantId, id);
  }
}
