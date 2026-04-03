import { IsString, IsOptional, IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CompanyDetailsDto {
  @ApiProperty() @IsString() companyName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() companySize?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() industry?: string;
}

export class TeamInviteItemDto {
  @ApiProperty() @IsString() email: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fullName?: string;
  @ApiProperty() @IsString() role: string;
}

export class TeamSetupDto {
  @ApiProperty({ type: [TeamInviteItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamInviteItemDto)
  invites: TeamInviteItemDto[];
}

export class ModulePreferencesDto {
  @ApiProperty() @IsBoolean() recruitmentEnabled: boolean;
  @ApiProperty() @IsBoolean() salesEnabled: boolean;
}

export class UpdateOnboardingStepDto {
  @ApiProperty({ example: 'company_details' })
  @IsString()
  step: string;

  @ApiPropertyOptional()
  @IsOptional()
  data?: any;
}
