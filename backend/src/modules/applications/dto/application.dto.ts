import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ApplicationStage {
  APPLIED = 'APPLIED',
  SCREENING = 'SCREENING',
  SHORTLISTED = 'SHORTLISTED',
  INTERVIEW = 'INTERVIEW',
  OFFER = 'OFFER',
  HIRED = 'HIRED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export class CreateApplicationDto {
  @ApiProperty()
  @IsUUID()
  candidateId: string;

  @ApiProperty()
  @IsUUID()
  jobId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resumeText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;
}

export class UpdateApplicationStageDto {
  @ApiProperty({ enum: ApplicationStage })
  @IsEnum(ApplicationStage)
  stage: ApplicationStage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stageNote?: string;
}

export class ScreenApplicationDto {
  @ApiPropertyOptional({ description: 'Override resume text for screening' })
  @IsOptional()
  @IsString()
  resumeText?: string;
}
