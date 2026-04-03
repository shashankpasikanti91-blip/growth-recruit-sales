import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Generates human-friendly unique business IDs for all major entities.
 *
 * Format patterns:
 *   Tenant:       TEN-YYYY-0001
 *   User:         USR-YYYY-0001
 *   Candidate:    CAN-YYYYMM-000001
 *   Resume:       RES-YYYYMM-000001
 *   Job:          JOB-YYYYMM-000001
 *   Application:  APP-YYYYMM-000001
 *   Lead:         LED-YYYYMM-000001
 *   Company:      COM-YYYYMM-000001
 *   Contact:      CNT-YYYYMM-000001
 *   Activity:     ACT-YYYYMM-000001
 *   WorkflowRun:  WFR-YYYYMM-000001
 *   Outreach:     OUT-YYYYMM-000001
 *   Document:     DOC-YYYYMM-000001
 */

type EntityConfig = {
  prefix: string;
  table: string;
  column: string;
  padLength: number;
  dateFormat: 'YYYY' | 'YYYYMM';
};

const ENTITY_MAP: Record<string, EntityConfig> = {
  tenant:          { prefix: 'TEN', table: 'tenants',           column: 'businessId', padLength: 4, dateFormat: 'YYYY' },
  user:            { prefix: 'USR', table: 'users',             column: 'businessId', padLength: 4, dateFormat: 'YYYY' },
  candidate:       { prefix: 'CAN', table: 'candidates',        column: 'businessId', padLength: 6, dateFormat: 'YYYYMM' },
  resume:          { prefix: 'RES', table: 'resumes',           column: 'businessId', padLength: 6, dateFormat: 'YYYYMM' },
  job:             { prefix: 'JOB', table: 'jobs',              column: 'businessId', padLength: 6, dateFormat: 'YYYYMM' },
  application:     { prefix: 'APP', table: 'applications',      column: 'businessId', padLength: 6, dateFormat: 'YYYYMM' },
  lead:            { prefix: 'LED', table: 'leads',             column: 'businessId', padLength: 6, dateFormat: 'YYYYMM' },
  company:         { prefix: 'COM', table: 'companies',         column: 'businessId', padLength: 6, dateFormat: 'YYYYMM' },
  contact:         { prefix: 'CNT', table: 'contacts',          column: 'businessId', padLength: 6, dateFormat: 'YYYYMM' },
  activity:        { prefix: 'ACT', table: 'activities',        column: 'businessId', padLength: 6, dateFormat: 'YYYYMM' },
  workflowRun:     { prefix: 'WFR', table: 'workflow_runs',     column: 'businessId', padLength: 6, dateFormat: 'YYYYMM' },
  outreachMessage: { prefix: 'OUT', table: 'outreach_messages', column: 'businessId', padLength: 6, dateFormat: 'YYYYMM' },
  document:        { prefix: 'DOC', table: 'documents',          column: 'businessId', padLength: 6, dateFormat: 'YYYYMM' },
};

@Injectable()
export class BusinessIdService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(entityType: string): Promise<string> {
    const config = ENTITY_MAP[entityType];
    if (!config) {
      throw new Error(`Unknown entity type for business ID: ${entityType}`);
    }

    const now = new Date();
    const datePart = config.dateFormat === 'YYYY'
      ? now.getFullYear().toString()
      : `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const prefix = `${config.prefix}-${datePart}-`;

    // Use raw query to atomically get the next sequence number
    const result = await this.prisma.$queryRawUnsafe<{ max_seq: string | null }[]>(
      `SELECT MAX("${config.column}") as max_seq FROM "${config.table}" WHERE "${config.column}" LIKE $1`,
      `${prefix}%`,
    );

    let nextSeq = 1;
    if (result[0]?.max_seq) {
      const currentMax = result[0].max_seq;
      const seqPart = currentMax.substring(prefix.length);
      nextSeq = parseInt(seqPart, 10) + 1;
    }

    return `${prefix}${String(nextSeq).padStart(config.padLength, '0')}`;
  }

  async generateBatch(entityType: string, count: number): Promise<string[]> {
    const config = ENTITY_MAP[entityType];
    if (!config) {
      throw new Error(`Unknown entity type for business ID: ${entityType}`);
    }

    const now = new Date();
    const datePart = config.dateFormat === 'YYYY'
      ? now.getFullYear().toString()
      : `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const prefix = `${config.prefix}-${datePart}-`;

    const result = await this.prisma.$queryRawUnsafe<{ max_seq: string | null }[]>(
      `SELECT MAX("${config.column}") as max_seq FROM "${config.table}" WHERE "${config.column}" LIKE $1`,
      `${prefix}%`,
    );

    let nextSeq = 1;
    if (result[0]?.max_seq) {
      const seqPart = result[0].max_seq.substring(prefix.length);
      nextSeq = parseInt(seqPart, 10) + 1;
    }

    return Array.from({ length: count }, (_, i) =>
      `${prefix}${String(nextSeq + i).padStart(config.padLength, '0')}`,
    );
  }
}
