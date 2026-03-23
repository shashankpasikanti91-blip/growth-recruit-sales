import { Controller, Get, Injectable } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('dedupe') private readonly dedupeQueue: Queue,
  ) {}

  async getHealth() {
    const checks: Record<string, { status: 'ok' | 'error'; latencyMs?: number; message?: string }> = {};

    // DB check
    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
    } catch (err: any) {
      checks.database = { status: 'error', latencyMs: Date.now() - dbStart, message: err?.message };
    }

    // Redis/BullMQ check via queue ping
    const redisStart = Date.now();
    try {
      await this.dedupeQueue.client.ping();
      checks.redis = { status: 'ok', latencyMs: Date.now() - redisStart };
    } catch (err: any) {
      checks.redis = { status: 'error', latencyMs: Date.now() - redisStart, message: err?.message };
    }

    const allOk = Object.values(checks).every((c) => c.status === 'ok');

    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Detailed system health check (DB + Redis)' })
  check() {
    return this.healthService.getHealth();
  }
}
