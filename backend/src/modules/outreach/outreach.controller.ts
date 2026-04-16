import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OutreachService, GenerateOutreachDto, UpdateMessageStatusDto } from './outreach.service';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class SuppressionDto { @ApiProperty() @IsString() email: string; @ApiProperty() @IsString() reason?: string; }

@ApiTags('Outreach')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('outreach')
export class OutreachController {
  constructor(private readonly outreachService: OutreachService) {}

  @Post('generate')
  @Roles(UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'AI-generate outreach message or sequence for candidate/lead' })
  generate(@CurrentUser('tenantId') tenantId: string, @Body() dto: GenerateOutreachDto) {
    return this.outreachService.generate(tenantId, dto);
  }

  @Get('messages')
  @ApiQuery({ name: 'candidateId', required: false })
  @ApiQuery({ name: 'leadId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  listMessages(
    @CurrentUser('tenantId') tenantId: string,
    @Query('candidateId') candidateId?: string,
    @Query('leadId') leadId?: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.outreachService.listMessages(tenantId, { candidateId, leadId, status, page, limit });
  }

  @Get('sequences')
  @ApiOperation({ summary: 'List all outreach sequences' })
  listSequences(@CurrentUser('tenantId') tenantId: string) {
    return this.outreachService.listSequences(tenantId);
  }

  @Patch('messages/:id/status')
  @Roles(UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update message delivery status (e.g. SENT, OPENED, REPLIED)' })
  updateStatus(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMessageStatusDto,
  ) {
    return this.outreachService.updateMessageStatus(tenantId, id, dto.status);
  }

  @Post('messages/:id/send')
  @Roles(UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Send an outreach email message directly via SMTP' })
  sendMessage(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.outreachService.sendMessage(tenantId, id);
  }

  @Post('suppression')
  @Roles(UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add email to suppression list (opted-out)' })
  addSuppression(@CurrentUser('tenantId') tenantId: string, @Body() dto: SuppressionDto) {
    return this.outreachService.addToSuppression(tenantId, dto.email, dto.reason);
  }
}
