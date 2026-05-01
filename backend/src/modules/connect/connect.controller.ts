import {
  Controller, Get, Post, Delete, Query, Body, Param, Headers,
  UseGuards, HttpCode, Res, Redirect,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ConnectService } from './connect.service';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SaveWhatsAppDto {
  @ApiProperty({ description: 'Meta WhatsApp Business phone number ID' }) @IsString() phoneNumberId: string;
  @ApiProperty({ description: 'Permanent Meta access token' }) @IsString() accessToken: string;
}

class SaveTelegramDto {
  @ApiProperty({ description: 'Bot token from @BotFather' }) @IsString() botToken: string;
  @ApiPropertyOptional({ description: 'Telegram chat ID for team alerts (channel or group)' }) @IsOptional() @IsString() teamChatId?: string;
}

class SaveTeamsDto {
  @ApiProperty({ description: 'Microsoft Teams incoming webhook URL' }) @IsString() webhookUrl: string;
  @ApiPropertyOptional() @IsOptional() @IsString() channel?: string;
}

class DirectSendEmailDto {
  @ApiProperty() @IsString() to: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toName?: string;
  @ApiProperty() @IsString() subject: string;
  @ApiProperty() @IsString() body: string;
}

class DirectSendWhatsAppDto {
  @ApiProperty({ description: 'Recipient phone number (E.164 or numeric)' }) @IsString() to: string;
  @ApiProperty() @IsString() text: string;
  @ApiPropertyOptional({ description: 'Template name for first-contact / outside 24h window' }) @IsOptional() @IsString() templateName?: string;
}

class DirectSendTelegramDto {
  @ApiProperty({ description: 'Telegram chat ID or @username' }) @IsString() chatId: string;
  @ApiProperty() @IsString() text: string;
}

// ─────────────────────────────────────────────────────────────────────────────

@ApiTags('Connect')
@Controller('integrations')
export class ConnectController {
  constructor(private readonly connect: ConnectService) {}

  // ── Status summary ──────────────────────────────────────────────────────────

  @Get('connect/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get all communication channel statuses for the current user' })
  getChannelStatuses(@CurrentUser('id') userId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.connect.getChannelStatuses(userId, tenantId);
  }

  // ── Gmail (per-user) ────────────────────────────────────────────────────────

  @Get('gmail/auth-url')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get Google OAuth2 authorization URL for Gmail connect' })
  getGmailAuthUrl(@CurrentUser('id') userId: string, @CurrentUser('tenantId') tenantId: string) {
    const url = this.connect.getGmailAuthUrl(userId, tenantId);
    return { url };
  }

  @Get('gmail/callback')
  @ApiOperation({ summary: 'OAuth2 callback from Google — stores Gmail tokens and redirects to frontend' })
  async gmailCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.connect.handleGmailCallback(code ?? '', state ?? '');
    return res.redirect(302, redirectUrl);
  }

  @Get('gmail/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Check Gmail connection status for current user' })
  getGmailStatus(@CurrentUser('id') userId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.connect.getGmailStatus(userId, tenantId);
  }

  @Delete('gmail')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Disconnect Gmail for current user' })
  disconnectGmail(@CurrentUser('id') userId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.connect.disconnectGmail(userId, tenantId);
  }

  // ── Outlook (per-user) ──────────────────────────────────────────────────────

  @Get('outlook/auth-url')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get Microsoft OAuth2 authorization URL for Outlook connect' })
  getOutlookAuthUrl(@CurrentUser('id') userId: string, @CurrentUser('tenantId') tenantId: string) {
    const url = this.connect.getOutlookAuthUrl(userId, tenantId);
    return { url };
  }

  @Get('outlook/callback')
  @ApiOperation({ summary: 'OAuth2 callback from Microsoft — stores Outlook tokens and redirects' })
  async outlookCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.connect.handleOutlookCallback(code ?? '', state ?? '');
    return res.redirect(302, redirectUrl);
  }

  @Get('outlook/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Check Outlook connection status for current user' })
  getOutlookStatus(@CurrentUser('id') userId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.connect.getOutlookStatus(userId, tenantId);
  }

  @Delete('outlook')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Disconnect Outlook for current user' })
  disconnectOutlook(@CurrentUser('id') userId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.connect.disconnectOutlook(userId, tenantId);
  }

  // ── WhatsApp (admin/tenant-level) ───────────────────────────────────────────

  @Post('whatsapp')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Save WhatsApp Business API credentials (phone number ID + access token)' })
  saveWhatsApp(@CurrentUser('tenantId') tenantId: string, @Body() dto: SaveWhatsAppDto) {
    return this.connect.saveWhatsApp(tenantId, dto.phoneNumberId, dto.accessToken);
  }

  @Get('whatsapp/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Check WhatsApp Business connection status' })
  getWhatsAppStatus(@CurrentUser('tenantId') tenantId: string) {
    return this.connect.getWhatsAppStatus(tenantId);
  }

  /** Meta webhook verification (GET) — public, no auth */
  @Get('whatsapp/webhook')
  @ApiOperation({ summary: 'WhatsApp webhook verification endpoint (Meta callback)' })
  @ApiQuery({ name: 'hub.mode', required: false })
  @ApiQuery({ name: 'hub.verify_token', required: false })
  @ApiQuery({ name: 'hub.challenge', required: false })
  verifyWhatsAppWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    return this.connect.verifyWhatsAppWebhook(mode ?? '', token ?? '', challenge ?? '');
  }

  /** Meta webhook incoming messages (POST) — public, no auth; verified via HMAC */
  @Post('whatsapp/webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'WhatsApp webhook incoming messages (HMAC-verified)' })
  async whatsAppIncoming(
    @Body() body: any,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    await this.connect.handleWhatsAppIncoming(body, signature ?? '');
    return { status: 'ok' };
  }

  // ── Telegram (admin/tenant-level) ───────────────────────────────────────────

  @Post('telegram')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Save Telegram Bot API token' })
  saveTelegram(@CurrentUser('tenantId') tenantId: string, @Body() dto: SaveTelegramDto) {
    return this.connect.saveTelegram(tenantId, dto.botToken, dto.teamChatId);
  }

  @Get('telegram/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Check Telegram Bot connection status' })
  getTelegramStatus(@CurrentUser('tenantId') tenantId: string) {
    return this.connect.getTelegramStatus(tenantId);
  }

  // ── Microsoft Teams (admin/tenant-level) ────────────────────────────────────

  @Post('teams')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Save Microsoft Teams incoming webhook URL' })
  saveTeams(@CurrentUser('tenantId') tenantId: string, @Body() dto: SaveTeamsDto) {
    return this.connect.saveTeams(tenantId, dto.webhookUrl, dto.channel);
  }

  @Get('teams/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Check Microsoft Teams connection status' })
  getTeamsStatus(@CurrentUser('tenantId') tenantId: string) {
    return this.connect.getTeamsStatus(tenantId);
  }

  // ── Direct send endpoints ───────────────────────────────────────────────────

  @Post('send-email')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Send email via connected Gmail or Outlook (auto-selects active channel)' })
  sendEmail(@CurrentUser('id') userId: string, @CurrentUser('tenantId') tenantId: string, @Body() dto: DirectSendEmailDto) {
    return this.connect.sendEmail(userId, tenantId, dto.to, dto.toName ?? '', dto.subject, dto.body);
  }

  @Post('send-whatsapp')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Send WhatsApp message via Meta Business API' })
  sendWhatsApp(@CurrentUser('tenantId') tenantId: string, @Body() dto: DirectSendWhatsAppDto) {
    return this.connect.sendViaWhatsApp(tenantId, dto.to, dto.text, dto.templateName);
  }

  @Post('send-telegram')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Send Telegram message via Bot API' })
  sendTelegram(@CurrentUser('tenantId') tenantId: string, @Body() dto: DirectSendTelegramDto) {
    return this.connect.sendViaTelegram(tenantId, dto.chatId, dto.text);
  }
}
