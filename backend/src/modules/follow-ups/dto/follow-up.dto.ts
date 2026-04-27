import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsEnum, IsDateString,
} from 'class-validator';
import { FollowUpType, FollowUpStatus } from '@prisma/client';

export class CreateFollowUpDto {
  @ApiProperty() @IsDateString() scheduledAt: string;
  @ApiPropertyOptional({ enum: FollowUpType }) @IsOptional() @IsEnum(FollowUpType) type?: FollowUpType;
  @ApiPropertyOptional() @IsOptional() @IsString() clientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() leadId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subject?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ownerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() reminderAt?: string;
}

export class UpdateFollowUpDto {
  @ApiPropertyOptional({ enum: FollowUpStatus }) @IsOptional() @IsEnum(FollowUpStatus) status?: FollowUpStatus;
  @ApiPropertyOptional({ enum: FollowUpType }) @IsOptional() @IsEnum(FollowUpType) type?: FollowUpType;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() completedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subject?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ownerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() reminderAt?: string;
}
