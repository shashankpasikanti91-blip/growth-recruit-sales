import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsArray, IsEnum,
  IsEmail, MaxLength, IsBoolean,
} from 'class-validator';
import { ClientStatus } from '@prisma/client';

export class CreateClientDto {
  @ApiProperty() @IsString() @MaxLength(255) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() industry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() primaryContactId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() billingContactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() billingContactEmail?: string;
  @ApiPropertyOptional({ enum: ClientStatus }) @IsOptional() @IsEnum(ClientStatus) status?: ClientStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() salesOwnerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() recruitmentManagerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() submissionFormat?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() requiredDocuments?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceLeadId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceCompanyId?: string;
}

export class UpdateClientDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() industry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() primaryContactId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() billingContactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() billingContactEmail?: string;
  @ApiPropertyOptional({ enum: ClientStatus }) @IsOptional() @IsEnum(ClientStatus) status?: ClientStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() salesOwnerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() recruitmentManagerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() submissionFormat?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() requiredDocuments?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ConvertToClientDto {
  @ApiPropertyOptional() @IsOptional() @IsString() leadId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() companyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() salesOwnerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
