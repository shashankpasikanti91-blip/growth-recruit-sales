import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsNumber, IsEnum, IsDateString, Min, Max,
} from 'class-validator';
import { OpportunityStage } from '@prisma/client';

export class CreateOpportunityDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() leadId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() value?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional({ enum: OpportunityStage }) @IsOptional() @IsEnum(OpportunityStage) stage?: OpportunityStage;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) probability?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedCloseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ownerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateOpportunityDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() value?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional({ enum: OpportunityStage }) @IsOptional() @IsEnum(OpportunityStage) stage?: OpportunityStage;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) probability?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedCloseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ownerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lostReason?: string;
}
