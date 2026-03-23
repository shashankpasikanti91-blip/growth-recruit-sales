import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { HealthController, HealthService } from './health.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'dedupe' }),
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
