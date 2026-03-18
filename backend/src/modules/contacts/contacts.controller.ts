import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ContactsService, CreateContactDto } from './contacts.service';

@ApiTags('Contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  create(@CurrentUser('tenantId') tenantId: string, @Body() dto: CreateContactDto) {
    return this.contactsService.create(tenantId, dto);
  }

  @Get()
  @ApiQuery({ name: 'companyId', required: false })
  findAll(@CurrentUser('tenantId') tenantId: string, @Query('companyId') companyId?: string) {
    return this.contactsService.findAll(tenantId, companyId);
  }

  @Get(':id')
  findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.contactsService.findOne(tenantId, id);
  }

  @Put(':id')
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateContactDto,
  ) {
    return this.contactsService.update(tenantId, id, dto);
  }
}
