import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { UserRole, DocumentType } from '@prisma/client';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto, LinkDocumentDto } from './dto/document.dto';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'documents', version: '1' })
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES)
  @ApiOperation({ summary: 'Upload a document' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 26_214_400 } })) // 25 MB hard limit at multer level
  async upload(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    if (!file) throw new Error('No file provided');
    return this.documentsService.upload(tenantId, userId, file, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List documents' })
  @ApiQuery({ name: 'type', required: false, enum: DocumentType })
  @ApiQuery({ name: 'candidateId', required: false })
  @ApiQuery({ name: 'leadId', required: false })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'contactId', required: false })
  @ApiQuery({ name: 'jobId', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('type') type?: DocumentType,
    @Query('candidateId') candidateId?: string,
    @Query('leadId') leadId?: string,
    @Query('companyId') companyId?: string,
    @Query('contactId') contactId?: string,
    @Query('jobId') jobId?: string,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.documentsService.findAll(tenantId, {
      type,
      candidateId,
      leadId,
      companyId,
      contactId,
      jobId,
      search,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document details' })
  findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.documentsService.findOne(tenantId, id);
  }

  @Get(':id/download-url')
  @ApiOperation({ summary: 'Get signed download URL' })
  getDownloadUrl(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.documentsService.getDownloadUrl(tenantId, id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Proxy download file through backend' })
  async proxyDownload(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { body, contentType, originalName, fileSize } = await this.documentsService.proxyDownload(tenantId, id);
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(originalName)}"`,
      'Content-Length': fileSize.toString(),
      'Cache-Control': 'private, no-cache',
    });
    const reader = (body as any).getReader ? (body as any).getReader() : null;
    if (reader) {
      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) res.write(result.value);
      }
    }
    res.end();
  }

  @Patch(':id/link')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES)
  @ApiOperation({ summary: 'Link document to an entity' })
  linkToEntity(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: LinkDocumentDto,
  ) {
    return this.documentsService.linkToEntity(tenantId, id, dto);
  }

  @Post(':id/reparse')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Re-parse document text' })
  reparse(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.documentsService.reparse(tenantId, id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Delete a document' })
  remove(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.documentsService.remove(tenantId, id);
  }
}
