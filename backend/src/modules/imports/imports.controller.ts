import { Controller, Post, Get, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile, UploadedFiles, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ImportSource, UserRole } from '@prisma/client';
import { ImportsService } from './imports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '../../common/types/user-payload.type';

class CreateImportDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ImportSource })
  @IsEnum(ImportSource)
  source: ImportSource;

  @ApiProperty({ enum: ['candidate', 'lead'] })
  @IsEnum(['candidate', 'lead'])
  importType: 'candidate' | 'lead';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mappingTemplateId?: string;
}

@ApiTags('imports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'imports', version: '1' })
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new import record' })
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateImportDto) {
    return this.importsService.createImport(user.tenantId, { ...dto, importedById: user.id });
  }

  @Post(':id/upload')
  @Roles(UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Upload CSV/Excel/PDF/Word file and start processing' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowedMimes = [
        'text/csv',
        'application/csv',
        'text/plain',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      const allowedExts = /\.(csv|xlsx|xls|pdf|doc|docx|txt)$/i;
      if (allowedMimes.includes(file.mimetype) || allowedExts.test(file.originalname)) {
        cb(null, true);
      } else {
        cb(new Error(`File type not allowed. Accepted: CSV, Excel, PDF, Word`), false);
      }
    },
  }))
  upload(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') importId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.importsService.uploadAndProcess(tenantId, importId, file);
  }

  @Get()
  @ApiOperation({ summary: 'List all imports' })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.importsService.listImports(tenantId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get import details' })
  findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.importsService.getImport(tenantId, id);
  }

  @Get(':id/rows')
  @ApiOperation({ summary: 'Get import rows (optionally filter by status)' })
  getRows(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Query('status') status?: string,
  ) {
    return this.importsService.getImportRows(tenantId, id, status);
  }

  @Post(':id/retry')
  @Roles(UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Retry failed rows in an import' })
  retry(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.importsService.retryFailedRows(tenantId, id);
  }

  @Post('bulk-resume')
  @Roles(UserRole.TENANT_ADMIN, UserRole.RECRUITER, UserRole.SALES, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Upload up to 20 resume files (PDF/DOCX) as a single bulk import' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 20, {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = /\.(pdf|doc|docx)$/i;
      if (allowed.test(file.originalname)) cb(null, true);
      else cb(new Error('Only PDF and Word files are allowed for bulk resume import'), false);
    },
  }))
  bulkResume(
    @CurrentUser() user: UserPayload,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.importsService.bulkResumeUpload(user.tenantId, user.id, files);
  }
}
