import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { LeadsService } from './leads.service';
import { CreateLeadDto, UpdateLeadDto, UpdateLeadStageDto } from './dto/lead.dto';
import { LeadImportService, GoogleMapsImportDto, ApifyImportDto, GenerateLeadsDto } from './lead-import.service';
import { UsageGuard, UsageLimit } from '../billing/usage.guard';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class AddNoteDto { @ApiProperty() @IsString() note: string; }

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, UsageGuard)
@Controller('leads')
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly leadImport: LeadImportService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create lead' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.SALES, UserRole.SUPER_ADMIN)
  @UsageLimit('lead')
  create(@CurrentUser('tenantId') tenantId: string, @Body() dto: CreateLeadDto) {
    return this.leadsService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List leads with filters' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'stage', required: false })
  @ApiQuery({ name: 'countryCode', required: false })
  @ApiQuery({ name: 'source', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('search') search?: string,
    @Query('stage') stage?: string,
    @Query('countryCode') countryCode?: string,
    @Query('source') source?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.leadsService.findAll(tenantId, { search, stage, countryCode, source, page, limit });
  }

  // ── Lead Generation (must be BEFORE :id routes) ──────────────────────────

  @Get('generate/usage')
  @ApiOperation({ summary: 'Get daily/monthly lead generation usage and limits' })
  getGenerateUsage(@CurrentUser('tenantId') tenantId: string) {
    return this.leadImport.getDailyUsage(tenantId);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate leads using platform AI — Google Search, Google Maps, or Apollo via Apify' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.SALES, UserRole.SUPER_ADMIN)
  generateLeads(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: GenerateLeadsDto,
  ) {
    return this.leadImport.generateLeads(tenantId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead profile with activities and outreach' })
  findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.leadsService.findOne(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update lead' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.SALES, UserRole.SUPER_ADMIN)
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadsService.update(tenantId, id, dto);
  }

  @Patch(':id/stage')
  @ApiOperation({ summary: 'Update lead pipeline stage' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.SALES, UserRole.SUPER_ADMIN)
  updateStage(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeadStageDto,
  ) {
    return this.leadsService.updateStage(tenantId, id, dto);
  }

  @Post(':id/score')
  @ApiOperation({ summary: 'Run AI ICP scoring on lead' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.SALES, UserRole.SUPER_ADMIN)
  score(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.leadsService.scoreLead(tenantId, id);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add note to lead' })
  addNote(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: AddNoteDto,
  ) {
    return this.leadsService.addNote(tenantId, id, dto.note);
  }

  // ── Lead Import endpoints ──────────────────────────────────────────────────

  @Post('import/google-maps')
  @ApiOperation({ summary: 'Search Google Maps Places and import results as leads' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.SALES, UserRole.SUPER_ADMIN)
  importFromGoogleMaps(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: GoogleMapsImportDto,
  ) {
    return this.leadImport.importFromGoogleMaps(tenantId, dto);
  }

  @Post('import/apify')
  @ApiOperation({ summary: 'Bulk import leads from an Apify dataset' })
  @Roles(UserRole.TENANT_ADMIN, UserRole.SALES, UserRole.SUPER_ADMIN)
  importFromApify(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: ApifyImportDto,
  ) {
    return this.leadImport.importFromApify(tenantId, dto);
  }
}
