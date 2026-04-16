import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CandidateImportedDto {
  @ApiProperty()
  @IsString()
  tenantId: string;

  @ApiProperty()
  @IsString()
  candidateId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceImportId?: string;
}

export class LeadImportedDto {
  @ApiProperty()
  @IsString()
  tenantId: string;

  @ApiProperty()
  @IsString()
  leadId: string;
}

export class TriggerScreeningDto {
  @ApiProperty()
  @IsString()
  tenantId: string;

  @ApiProperty()
  @IsString()
  applicationId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resumeText?: string;
}

export class TriggerOutreachDto {
  @ApiProperty()
  @IsString()
  tenantId: string;

  @ApiProperty({ enum: ['CANDIDATE', 'LEAD'] })
  @IsEnum(['CANDIDATE', 'LEAD'])
  targetType: 'CANDIDATE' | 'LEAD';

  @ApiProperty()
  @IsString()
  targetId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  sequenceSteps?: number;
}

export class ScoreLeadDto {
  @ApiProperty()
  @IsString()
  tenantId: string;

  @ApiProperty()
  @IsString()
  leadId: string;
}

export class MessageStatusDto {
  @ApiProperty()
  @IsString()
  tenantId: string;

  @ApiProperty()
  @IsString()
  messageId: string;

  @ApiProperty()
  @IsString()
  status: string;
}

export class OptOutDto {
  @ApiProperty()
  @IsString()
  tenantId: string;

  @ApiProperty()
  @IsString()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
