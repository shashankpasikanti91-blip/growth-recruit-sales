import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('import-processing')
export class ImportProcessor {
  private readonly logger = new Logger(ImportProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process('process-import')
  async handleImport(job: Job<{ importId: string; tenantId: string; retryFailed?: boolean }>) {
    const { importId, tenantId, retryFailed } = job.data;
    this.logger.log(`Processing import ${importId}`);

    const importRecord = await this.prisma.sourceImport.findUnique({ where: { id: importId } });
    if (!importRecord) return;

    const query: any = { importId, status: retryFailed ? 'failed' : 'pending' };
    const rows = await this.prisma.importRow.findMany({ where: query, orderBy: { rowIndex: 'asc' } });

    let successCount = 0;
    let failedCount = 0;
    let duplicateCount = 0;

    for (const row of rows) {
      try {
        const rawData = row.rawData as Record<string, any>;

        if (importRecord.importType === 'candidate') {
          const result = await this.processCandidateRow(tenantId, importId, rawData);
          if (result === 'duplicate') {
            duplicateCount++;
            await this.prisma.importRow.update({ where: { id: row.id }, data: { status: 'duplicate' } });
          } else {
            successCount++;
            await this.prisma.importRow.update({ where: { id: row.id }, data: { status: 'success', entityId: result } });
          }
        } else if (importRecord.importType === 'lead') {
          const result = await this.processLeadRow(tenantId, importId, rawData);
          if (result === 'duplicate') {
            duplicateCount++;
            await this.prisma.importRow.update({ where: { id: row.id }, data: { status: 'duplicate' } });
          } else {
            successCount++;
            await this.prisma.importRow.update({ where: { id: row.id }, data: { status: 'success', entityId: result } });
          }
        }
      } catch (err) {
        failedCount++;
        await this.prisma.importRow.update({
          where: { id: row.id },
          data: { status: 'failed', errorMessage: err.message },
        });
      }
    }

    // Update import summary
    await this.prisma.sourceImport.update({
      where: { id: importId },
      data: {
        status: failedCount === rows.length ? 'FAILED' : failedCount > 0 ? 'PARTIAL' : 'COMPLETED',
        successRows: { increment: successCount },
        failedRows: { increment: failedCount },
        duplicateRows: { increment: duplicateCount },
      },
    });

    this.logger.log(`Import ${importId} done: ${successCount} success, ${failedCount} failed, ${duplicateCount} duplicates`);
  }

  private async processCandidateRow(tenantId: string, importId: string, row: Record<string, any>): Promise<string> {
    const email = row.email || row.Email || row['E-mail'];
    const phone = row.phone || row.Phone || row.mobile || row.Mobile;

    // Duplicate check
    if (email) {
      const existing = await this.prisma.candidate.findFirst({ where: { tenantId, email } });
      if (existing) return 'duplicate';
    }

    const candidate = await this.prisma.candidate.create({
      data: {
        tenantId,
        sourceImportId: importId,
        firstName: row.firstName || row.first_name || row['First Name'] || '',
        lastName: row.lastName || row.last_name || row['Last Name'] || '',
        email: email || null,
        phone: phone || null,
        currentTitle: row.title || row.Title || row.currentTitle || null,
        currentCompany: row.company || row.Company || row.currentCompany || null,
        location: row.location || row.Location || null,
        countryCode: row.countryCode || row.country || null,
        skills: this.parseArrayField(row.skills || row.Skills),
        sourceName: row.source || row.Source || 'CSV Import',
        rawData: row,
      },
    });

    return candidate.id;
  }

  private async processLeadRow(tenantId: string, importId: string, row: Record<string, any>): Promise<string> {
    const email = row.email || row.Email;

    // Duplicate check
    if (email) {
      const existing = await this.prisma.lead.findFirst({ where: { tenantId, email } });
      if (existing) return 'duplicate';
    }

    const lead = await this.prisma.lead.create({
      data: {
        tenantId,
        sourceImportId: importId,
        firstName: row.firstName || row.first_name || row['First Name'] || null,
        lastName: row.lastName || row.last_name || row['Last Name'] || null,
        email: email || null,
        phone: row.phone || row.Phone || null,
        title: row.title || row.Title || null,
        sourceName: row.source || row.Source || 'CSV Import',
        rawData: row,
      },
    });

    return lead.id;
  }

  private parseArrayField(value: any): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
    return [];
  }
}
