import { IsBoolean, IsObject, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertTenantCountryConfigDto {
  @ApiPropertyOptional({ description: 'Custom templates for this country' })
  @IsOptional()
  @IsObject()
  customTemplates?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Set as default country for the tenant' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
