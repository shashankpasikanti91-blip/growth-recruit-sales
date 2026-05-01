import {
  Controller, Get, Patch, Param, Query, UseGuards,
  DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  list(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.list(userId, tenantId, {
      page,
      limit,
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async unreadCount(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const count = await this.notificationsService.unreadCount(userId, tenantId);
    return { count };
  }

  @Get('preview')
  @ApiOperation({ summary: 'Latest 5 notifications for bell dropdown' })
  preview(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.notificationsService.preview(userId, tenantId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.notificationsService.markRead(id, userId, tenantId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.notificationsService.markAllRead(userId, tenantId);
  }
}
