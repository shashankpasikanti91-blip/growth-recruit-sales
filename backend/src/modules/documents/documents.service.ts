import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessIdService } from '../billing/business-id.service';
import { StorageService } from './storage.service';
import { UploadDocumentDto, LinkDocumentDto } from './dto/document.dto';
import { DocumentType, UploadStatus } from '@prisma/client';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly maxSizeBytes: number;
  private readonly allowedMimeTypes: string[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly businessId: BusinessIdService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {
    this.maxSizeBytes =
      (this.config.get<number>('storage.maxDocumentSizeMb') || 25) * 1024 * 1024;
    this.allowedMimeTypes = this.config.get<string[]>('storage.allowedMimeTypes') || [];
  }

  /**
   * Upload a document: validate → hash → dedup check → store in S3 → persist metadata.
   */
  async upload(
    tenantId: string,
    userId: string,
    file: Express.Multer.File,
    dto: UploadDocumentDto,
  ) {
    // 1. Validate file size
    if (file.size > this.maxSizeBytes) {
      throw new BadRequestException(
        `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max allowed: ${this.maxSizeBytes / 1024 / 1024} MB.`,
      );
    }

    // 2. Validate MIME type
    if (this.allowedMimeTypes.length && !this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type "${file.mimetype}" not allowed. Accepted: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    // 3. Compute SHA-256 checksum
    const checksum = createHash('sha256').update(file.buffer).digest('hex');

    // 4. Duplicate detection within tenant
    const existing = await this.prisma.document.findFirst({
      where: { tenantId, checksum, status: UploadStatus.COMPLETED },
    });
    if (existing) {
      throw new ConflictException({
        message: 'Duplicate file detected — this exact file has already been uploaded.',
        existingDocumentId: existing.id,
        existingBusinessId: existing.businessId,
      });
    }

    // 5. Generate business ID and storage key
    const docBusinessId = await this.businessId.generate('document');
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `${tenantId}/${docBusinessId}/${safeOriginalName}`;

    // 6. Create DB record in PENDING state
    const doc = await this.prisma.document.create({
      data: {
        businessId: docBusinessId,
        tenantId,
        type: dto.type,
        status: UploadStatus.UPLOADING,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        storageKey,
        storageBucket: this.storage.getBucket(),
        checksum,
        candidateId: dto.candidateId,
        leadId: dto.leadId,
        companyId: dto.companyId,
        contactId: dto.contactId,
        jobId: dto.jobId,
        uploadedByUserId: userId,
      },
    });

    // 7. Upload to S3
    try {
      await this.storage.upload(storageKey, file.buffer, file.mimetype);
      await this.prisma.document.update({
        where: { id: doc.id },
        data: { status: UploadStatus.COMPLETED },
      });
    } catch (err) {
      this.logger.error(`S3 upload failed for ${docBusinessId}: ${(err as Error).message}`);
      await this.prisma.document.update({
        where: { id: doc.id },
        data: { status: UploadStatus.FAILED },
      });
      throw new BadRequestException('File upload to storage failed. Please retry.');
    }

    return this.prisma.document.findUnique({ where: { id: doc.id } });
  }

  /**
   * List documents for a tenant with optional filters.
   */
  async findAll(
    tenantId: string,
    filters: {
      type?: DocumentType;
      candidateId?: string;
      leadId?: string;
      companyId?: string;
      contactId?: string;
      jobId?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (filters.type) where.type = filters.type;
    if (filters.candidateId) where.candidateId = filters.candidateId;
    if (filters.leadId) where.leadId = filters.leadId;
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.contactId) where.contactId = filters.contactId;
    if (filters.jobId) where.jobId = filters.jobId;
    if (filters.search) {
      where.OR = [
        { originalName: { contains: filters.search, mode: 'insensitive' } },
        { businessId: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { uploadedBy: { select: { id: true, fullName: true, email: true } } },
      }),
      this.prisma.document.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  /**
   * Get a single document by ID — tenant-scoped.
   */
  async findOne(tenantId: string, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId },
      include: {
        uploadedBy: { select: { id: true, fullName: true, email: true } },
        candidate: { select: { id: true, businessId: true, firstName: true, lastName: true } },
        lead: { select: { id: true, businessId: true, firstName: true, lastName: true } },
        company: { select: { id: true, businessId: true, name: true } },
        contact: { select: { id: true, businessId: true, firstName: true, lastName: true } },
        job: { select: { id: true, businessId: true, title: true } },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  /**
   * Get a time-limited signed download URL.
   */
  async getDownloadUrl(tenantId: string, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId, status: UploadStatus.COMPLETED },
    });
    if (!doc) throw new NotFoundException('Document not found');
    const url = await this.storage.getSignedDownloadUrl(doc.storageKey);
    return { url, expiresInSeconds: this.config.get<number>('storage.signedUrlExpiry', 900) };
  }

  /**
   * Proxy download: stream file through backend (no signed URL exposed).
   */
  async proxyDownload(tenantId: string, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId, status: UploadStatus.COMPLETED },
    });
    if (!doc) throw new NotFoundException('Document not found');
    const { body, contentType } = await this.storage.download(doc.storageKey);
    return { body, contentType, originalName: doc.originalName, fileSize: doc.fileSize };
  }

  /**
   * Link / re-link a document to entities.
   */
  async linkToEntity(tenantId: string, id: string, dto: LinkDocumentDto) {
    const doc = await this.prisma.document.findFirst({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('Document not found');

    return this.prisma.document.update({
      where: { id },
      data: {
        candidateId: dto.candidateId ?? doc.candidateId,
        leadId: dto.leadId ?? doc.leadId,
        companyId: dto.companyId ?? doc.companyId,
        contactId: dto.contactId ?? doc.contactId,
        jobId: dto.jobId ?? doc.jobId,
      },
    });
  }

  /**
   * Re-parse a document (extract text again for updated AI pipelines).
   */
  async reparse(tenantId: string, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId, status: UploadStatus.COMPLETED },
    });
    if (!doc) throw new NotFoundException('Document not found or not yet uploaded');

    // Only parse PDF and DOCX
    const parseable = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (!parseable.includes(doc.mimeType)) {
      throw new BadRequestException(`Cannot parse files of type ${doc.mimeType}`);
    }

    const { body } = await this.storage.download(doc.storageKey);
    const chunks: Uint8Array[] = [];
    const reader = (body as any).getReader ? (body as any).getReader() : null;
    if (reader) {
      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) chunks.push(result.value);
      }
    }
    const buffer = Buffer.concat(chunks);

    let rawText = '';
    try {
      if (doc.mimeType === 'application/pdf') {
        const pdfParse = require('pdf-parse');
        const result = await pdfParse(buffer);
        rawText = result.text;
      } else {
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        rawText = result.value;
      }
    } catch (err) {
      this.logger.warn(`Parse failed for ${doc.businessId}: ${(err as Error).message}`);
    }

    return this.prisma.document.update({
      where: { id },
      data: { rawText: rawText || null },
    });
  }

  /**
   * Soft-delete: remove from S3 and mark as failed.
   */
  async remove(tenantId: string, id: string) {
    const doc = await this.prisma.document.findFirst({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('Document not found');

    try {
      await this.storage.delete(doc.storageKey);
    } catch (err) {
      this.logger.warn(`S3 delete failed: ${(err as Error).message}`);
    }

    await this.prisma.document.delete({ where: { id } });
    return { deleted: true };
  }
}
