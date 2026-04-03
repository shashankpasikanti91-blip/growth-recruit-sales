import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
  ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { TeamService } from './team.service';
import { InviteService } from './invite.service';
import { CreateInviteDto, UpdateUserRoleDto, UpdateUserStatusDto } from './dto/team.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('team')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'team', version: '1' })
export class TeamController {
  constructor(
    private readonly teamService: TeamService,
    private readonly inviteService: InviteService,
  ) {}

  // ── Team Users ────────────────────────────────────────────────────────────

  @Get('users')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'List users in the current tenant' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  listUsers(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.teamService.listUsers(tenantId, page, limit);
  }

  @Patch('users/:id/role')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Change user role' })
  updateRole(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') currentUserId: string,
    @Param('id') userId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.teamService.updateUserRole(tenantId, userId, dto.role, currentUserId);
  }

  @Patch('users/:id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Activate or deactivate user' })
  updateStatus(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') currentUserId: string,
    @Param('id') userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.teamService.updateUserStatus(tenantId, userId, dto.isActive, currentUserId);
  }

  // ── Invites ───────────────────────────────────────────────────────────────

  @Post('invites')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Send invite to join tenant' })
  createInvite(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateInviteDto,
  ) {
    return this.inviteService.createInvite(tenantId, userId, dto);
  }

  @Get('invites')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'List all invites for tenant' })
  listInvites(@CurrentUser('tenantId') tenantId: string) {
    return this.inviteService.listInvites(tenantId);
  }

  @Post('invites/:id/resend')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Resend invite with new token' })
  resendInvite(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.inviteService.resendInvite(tenantId, id);
  }

  @Post('invites/:id/revoke')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Revoke a pending invite' })
  revokeInvite(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.inviteService.revokeInvite(tenantId, id);
  }

  // ── Public Invite Validation (no auth required) ────────────────────────────
}

// Separate controller for public invite validation (no auth)
@ApiTags('team')
@Controller({ path: 'team', version: '1' })
export class TeamPublicController {
  constructor(private readonly inviteService: InviteService) {}

  @Get('invites/validate/:token')
  @ApiOperation({ summary: 'Validate an invite token (public)' })
  validateInvite(@Param('token') token: string) {
    return this.inviteService.validateInvite(token);
  }
}
