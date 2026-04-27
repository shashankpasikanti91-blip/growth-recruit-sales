import { IsString, IsOptional, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { ProposalStatus } from '@prisma/client';
import { PartialType } from '@nestjs/mapped-types';

export class CreateProposalDto {
  @IsString() title: string;

  @IsOptional() @IsString() description?: string;

  @IsOptional() @IsEnum(ProposalStatus) status?: ProposalStatus;

  @IsOptional() @IsNumber() value?: number;

  @IsOptional() @IsString() currency?: string;

  @IsOptional() @IsDateString() sentAt?: string;

  @IsOptional() @IsDateString() validUntil?: string;

  @IsOptional() @IsString() documentUrl?: string;

  @IsOptional() @IsString() clientId?: string;

  @IsOptional() @IsString() leadId?: string;

  @IsOptional() @IsString() notes?: string;
}

export class UpdateProposalDto extends PartialType(CreateProposalDto) {}
