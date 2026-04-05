import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessIdService } from '../billing/business-id.service';
import { ImportSource } from '@prisma/client';
import * as XLSX from 'xlsx';
import { parse as csvParse } from 'csv-parse/sync';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessIdService: BusinessIdService,
    @InjectQueue('import-processing') private readonly importQueue: Queue,
  ) {}

  async createImport(tenantId: string, data: {
    name: string;
    source: ImportSource;
    importType: 'candidate' | 'lead';
    mappingTemplateId?: string;
    importedById?: string;
  }) {
    const businessId = await this.businessIdService.generate('sourceImport');
    return this.prisma.sourceImport.create({
      data: { tenantId, businessId, ...data },
    });
  }

  async uploadAndProcess(
    tenantId: string,
    importId: string,
    file: Express.Multer.File,
  ) {
    const importRecord = await this.prisma.sourceImport.findFirst({ where: { id: importId, tenantId } });
    if (!importRecord) throw new NotFoundException('Import not found');

    // Parse file to rows
    let rows: Record<string, any>[] = [];

    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      rows = csvParse(file.buffer, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, any>[];
    } else if (file.originalname.match(/\.(xlsx|xls)$/)) {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];
    } else if (file.originalname.endsWith('.pdf') || file.mimetype === 'application/pdf') {
      // Extract text from PDF and treat each page section as one candidate/lead row
      const pdfData = await pdfParse(file.buffer);
      const text = pdfData.text.trim();
      if (!text) throw new BadRequestException('PDF contains no extractable text');
      // Store as a single raw text row — the AI processor will parse fields
      rows = [{ raw_text: text, file_name: file.originalname, source_type: 'pdf' }];
    } else if (file.originalname.match(/\.(docx|doc)$/) || file.mimetype.includes('word')) {
      // Extract text from Word document
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      const text = result.value.trim();
      if (!text) throw new BadRequestException('Word document contains no extractable text');
      rows = [{ raw_text: text, file_name: file.originalname, source_type: 'word' }];
    } else {
      throw new BadRequestException('Unsupported file type. Supported: CSV, Excel (.xlsx), PDF, Word (.docx)');
    }

    if (rows.length === 0) throw new BadRequestException('File contains no data rows');
    if (rows.length > 5000) throw new BadRequestException('Max 5000 rows per import');

    // Store raw rows
    await this.prisma.importRow.createMany({
      data: rows.map((row, index) => ({
        importId,
        rowIndex: index,
        rawData: row,
        status: 'pending',
      })),
    });

    // Update import record
    await this.prisma.sourceImport.update({
      where: { id: importId },
      data: { totalRows: rows.length, status: 'PROCESSING', rawFileUrl: file.originalname },
    });

    // Queue processing
    await this.importQueue.add('process-import', { importId, tenantId }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
    });

    return { importId, totalRows: rows.length, status: 'PROCESSING' };
  }

  async processWebhookImport(tenantId: string, importType: 'candidate' | 'lead', payload: Record<string, any>[]) {
    const businessId = await this.businessIdService.generate('sourceImport');
    const importRecord = await this.prisma.sourceImport.create({
      data: { tenantId, businessId, name: `Webhook Import ${new Date().toISOString()}`, source: 'WEBHOOK', importType, totalRows: payload.length, status: 'PROCESSING' },
    });

    await this.prisma.importRow.createMany({
      data: payload.map((row, index) => ({ importId: importRecord.id, rowIndex: index, rawData: row, status: 'pending' })),
    });

    await this.importQueue.add('process-import', { importId: importRecord.id, tenantId });
    return { importId: importRecord.id, totalRows: payload.length };
  }

  async getImport(tenantId: string, importId: string) {
    const record = await this.prisma.sourceImport.findFirst({
      where: { id: importId, tenantId },
      include: { _count: { select: { rows: true } } },
    });
    if (!record) throw new NotFoundException('Import not found');
    return record;
  }

  async listImports(tenantId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.sourceImport.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.sourceImport.count({ where: { tenantId } }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async getImportRows(tenantId: string, importId: string, status?: string) {
    const importRecord = await this.prisma.sourceImport.findFirst({ where: { id: importId, tenantId } });
    if (!importRecord) throw new NotFoundException('Import not found');

    return this.prisma.importRow.findMany({
      where: { importId, ...(status ? { status } : {}) },
      orderBy: { rowIndex: 'asc' },
    });
  }

  async retryFailedRows(tenantId: string, importId: string) {
    const importRecord = await this.prisma.sourceImport.findFirst({ where: { id: importId, tenantId } });
    if (!importRecord) throw new NotFoundException('Import not found');

    await this.prisma.importRow.updateMany({
      where: { importId, status: 'failed' },
      data: { status: 'pending', errorMessage: null },
    });

    await this.importQueue.add('process-import', { importId, tenantId, retryFailed: true });
    return { message: 'Retry queued for failed rows' };
  }

  /**
   * Bulk resume upload — creates a single import record, stores each file as a raw_text row,
   * then queues processing. Supports up to 20 PDF/DOCX files at once.
   */
  async bulkResumeUpload(tenantId: string, userId: string, files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('No files provided');
    if (files.length > 20) throw new BadRequestException('Max 20 files per bulk upload');

    const importRecord = await this.prisma.sourceImport.create({
      data: {
        tenantId,
        name: `Bulk Resume Upload — ${files.length} file${files.length !== 1 ? 's' : ''} — ${new Date().toLocaleDateString()}`,
        source: 'MANUAL',
        importType: 'candidate',
        importedById: userId,
        status: 'PROCESSING',
        totalRows: files.length,
      },
    });

    const rows: { importId: string; rowIndex: number; rawData: any; status: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let rawText = '';

      try {
        if (file.originalname.endsWith('.pdf') || file.mimetype === 'application/pdf') {
          const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;
          const parsed = await pdfParse(file.buffer);
          rawText = parsed.text.trim();
        } else {
          const mammoth = require('mammoth') as { extractRawText: (opts: any) => Promise<{ value: string }> };
          const result = await mammoth.extractRawText({ buffer: file.buffer });
          rawText = result.value.trim();
        }
      } catch {
        rawText = '';
      }

      rows.push({
        importId: importRecord.id,
        rowIndex: i,
        rawData: { raw_text: rawText, file_name: file.originalname, source_type: file.originalname.endsWith('.pdf') ? 'pdf' : 'word' },
        status: rawText ? 'pending' : 'failed',
      });
    }

    await this.prisma.importRow.createMany({ data: rows });

    await this.importQueue.add('process-import', { importId: importRecord.id, tenantId }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
    });

    return { importId: importRecord.id, totalFiles: files.length, status: 'PROCESSING' };
  }
}
