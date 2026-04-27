import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
  DefaultValuePipe, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FollowUpsService } from './follow-ups.service';
import { CreateFollowUpDto, UpdateFollowUpDto } from './dto/follow-up.dto';

@ApiTags('Follow Ups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('follow-ups')
export class FollowUpsController {
  constructor(private readonly service: FollowUpsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a follow-up' })
  create(@CurrentUser('tenantId') tenantId: string, @Body() dto: CreateFollowUpDto) {
    return this.service.create(tenantId, dto);
  }

  @Get('today')
  @ApiOperation({ summary: "Get today's follow-ups" })
  getToday(@CurrentUser('tenantId') tenantId: string) {
    return this.service.getUpcomingToday(tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List follow-ups' })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'leadId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'upcoming', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('clientId') clientId?: string,
    @Query('leadId') leadId?: string,
    @Query('status') status?: string,
    @Query('upcoming') upcoming?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.service.findAll(tenantId, {
      clientId, leadId, status,
      upcoming: upcoming === 'true',
      page, limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get follow-up detail' })
  findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update follow-up' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFollowUpDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Patch(':id/done')
  @ApiOperation({ summary: 'Mark follow-up as done' })
  markDone(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.service.markDone(tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete follow-up' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
