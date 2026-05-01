import {
  Controller, Get, Post, Put, Delete, Body, Param,
  Query, UseGuards, DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { OffersService } from './offers.service';
import { CreateOfferDto, UpdateOfferDto } from './dto/offer.dto';

@ApiTags('Offers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post()
  @ApiOperation({ summary: 'Create an offer for a submission' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.SALES, UserRole.SUPER_ADMIN)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOfferDto,
  ) {
    return this.offersService.create(tenantId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List offers with optional filters' })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('submissionId') submissionId?: string,
    @Query('candidateId') candidateId?: string,
    @Query('jobId') jobId?: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.offersService.findAll(tenantId, { submissionId, candidateId, jobId, status, page, limit });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get offer counts by status' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.offersService.getStats(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get offer by ID' })
  findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.offersService.findOne(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update offer (status, salary, joining date, offer letter URL)' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.SALES, UserRole.SUPER_ADMIN)
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOfferDto,
  ) {
    return this.offersService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete / withdraw an offer' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  remove(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.offersService.remove(tenantId, id);
  }
}
