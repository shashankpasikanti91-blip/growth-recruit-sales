import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards,
  DefaultValuePipe, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto, ConvertToClientDto } from './dto/client.dto';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // ── Create ───────────────────────────────────────────────────────────────────
  @Post()
  @ApiOperation({ summary: 'Create a new client' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.SALES)
  create(@CurrentUser('tenantId') tenantId: string, @Body() dto: CreateClientDto) {
    return this.clientsService.create(tenantId, dto);
  }

  // ── Convert lead/company to client ───────────────────────────────────────────
  @Post('convert')
  @ApiOperation({ summary: 'Convert a lead or company to a client' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.SALES)
  convert(@CurrentUser('tenantId') tenantId: string, @Body() dto: ConvertToClientDto) {
    return this.clientsService.convertToClient(tenantId, dto);
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  @Get('stats')
  @ApiOperation({ summary: 'Get client statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.clientsService.getStats(tenantId);
  }

  // ── List ─────────────────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'List clients with pagination + filters' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'industry', required: false })
  @ApiQuery({ name: 'countryCode', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('industry') industry?: string,
    @Query('countryCode') countryCode?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.clientsService.findAll(tenantId, { search, status, industry, countryCode, page, limit });
  }

  // ── Single ───────────────────────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get client 360 (with jobs, submissions, timeline)' })
  findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.clientsService.findOne(tenantId, id);
  }

  // ── Update ───────────────────────────────────────────────────────────────────
  @Patch(':id')
  @ApiOperation({ summary: 'Update client fields' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.SALES)
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(tenantId, id, dto);
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete client' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.clientsService.remove(tenantId, id);
  }
}
