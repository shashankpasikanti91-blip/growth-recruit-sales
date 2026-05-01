import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOfferDto {
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
  @IsNumber()
  offeredSalary?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsDateString()
  joiningDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOfferDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string; // PENDING | EXTENDED | ACCEPTED | DECLINED | WITHDRAWN | EXPIRED

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  offeredSalary?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  joiningDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  offerLetterUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declineReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
