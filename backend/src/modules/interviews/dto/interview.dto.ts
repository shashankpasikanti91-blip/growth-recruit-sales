import { IsString, IsOptional, IsInt, IsDateString, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInterviewDto {
  @IsString()
  submissionId: string;

  @IsString()
  candidateId: string;

  @IsString()
  jobId: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  round?: number;

  @IsOptional()
  @IsString()
  mode?: string; // VIDEO | IN_PERSON | PHONE

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  meetingLink?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInterviewDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string; // SCHEDULED | COMPLETED | CANCELLED | RESCHEDULED | NO_SHOW

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingLink?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  result?: string; // PASS | FAIL | HOLD

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  round?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mode?: string;
}
