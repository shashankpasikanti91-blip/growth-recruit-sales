import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsEnum, IsNumber, IsDateString,
} from 'class-validator';
import { SubmissionStage } from '@prisma/client';

export class CreateSubmissionDto {
  @ApiProperty() @IsString() clientId: string;
  @ApiProperty() @IsString() jobId: string;
  @ApiProperty() @IsString() candidateId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() recruiterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() salesOwnerId?: string;
  @ApiPropertyOptional({ enum: SubmissionStage }) @IsOptional() @IsEnum(SubmissionStage) stage?: SubmissionStage;
  @ApiPropertyOptional() @IsOptional() @IsNumber() aiScore?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() recruiterNotes?: string;
}

export class UpdateSubmissionDto {
  @ApiPropertyOptional({ enum: SubmissionStage }) @IsOptional() @IsEnum(SubmissionStage) stage?: SubmissionStage;
  @ApiPropertyOptional() @IsOptional() @IsString() clientFeedback?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() interviewDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() offerStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() recruiterNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() aiScore?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() salesOwnerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() recruiterId?: string;
}
