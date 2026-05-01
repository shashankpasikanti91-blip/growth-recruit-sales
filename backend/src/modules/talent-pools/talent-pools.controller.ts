import {
  Controller, Get, Post, Delete, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  TalentPoolsService, CreatePoolDto, AddMemberDto, CreateSavedSearchDto,
} from './talent-pools.service';

@ApiTags('talent-pools')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('talent-pools')
export class TalentPoolsController {
  constructor(private readonly svc: TalentPoolsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'TENANT_ADMIN', 'RECRUITER', 'SALES')
  list(@Request() req: any) {
    return this.svc.listPools(req.user.tenantId);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'TENANT_ADMIN', 'RECRUITER')
  create(@Request() req: any, @Body() dto: CreatePoolDto) {
    return this.svc.createPool(req.user.tenantId, dto, req.user.id);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'TENANT_ADMIN', 'RECRUITER', 'SALES')
  get(@Request() req: any, @Param('id') id: string) {
    return this.svc.getPool(req.user.tenantId, id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'TENANT_ADMIN', 'RECRUITER')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.svc.deletePool(req.user.tenantId, id);
  }

  @Post(':id/members')
  @Roles('SUPER_ADMIN', 'TENANT_ADMIN', 'RECRUITER')
  addMember(@Request() req: any, @Param('id') poolId: string, @Body() dto: AddMemberDto) {
    return this.svc.addMember(req.user.tenantId, poolId, dto, req.user.id);
  }

  @Delete(':id/members/:candidateId')
  @Roles('SUPER_ADMIN', 'TENANT_ADMIN', 'RECRUITER')
  removeMember(
    @Request() req: any,
    @Param('id') poolId: string,
    @Param('candidateId') candidateId: string,
  ) {
    return this.svc.removeMember(req.user.tenantId, poolId, candidateId);
  }

  @Get(':id/candidates/:candidateId/pools')
  @Roles('SUPER_ADMIN', 'TENANT_ADMIN', 'RECRUITER', 'SALES')
  getCandidatePools(@Request() req: any, @Param('candidateId') candidateId: string) {
    return this.svc.getCandidatePools(req.user.tenantId, candidateId);
  }
}

@ApiTags('saved-searches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('saved-searches')
export class SavedSearchesController {
  constructor(private readonly svc: TalentPoolsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'TENANT_ADMIN', 'RECRUITER', 'SALES')
  list(@Request() req: any) {
    return this.svc.listSavedSearches(req.user.tenantId);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'TENANT_ADMIN', 'RECRUITER', 'SALES')
  create(@Request() req: any, @Body() dto: CreateSavedSearchDto) {
    return this.svc.createSavedSearch(req.user.tenantId, dto, req.user.id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'TENANT_ADMIN', 'RECRUITER')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.svc.deleteSavedSearch(req.user.tenantId, id);
  }
}
