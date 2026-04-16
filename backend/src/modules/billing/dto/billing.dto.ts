import { IsString, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChangePlanDto {
  @ApiProperty({ description: 'Target plan ID' })
  @IsString()
  planId: string;

  @ApiProperty({ enum: ['monthly', 'annual'] })
  @IsEnum(['monthly', 'annual'])
  billingCycle: 'monthly' | 'annual';
}

export class SetCustomLimitsDto {
  @ApiProperty({ description: 'Target tenant ID (SUPER_ADMIN only)' })
  @IsString()
  tenantId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maxCandidatesPerMonth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maxLeadsPerMonth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maxAiUsagePerMonth?: number;
}
