import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { BusinessIdService } from './business-id.service';
import { UsageService } from './usage.service';
import { UsageGuard } from './usage.guard';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  providers: [BillingService, BusinessIdService, UsageService, UsageGuard],
  controllers: [BillingController],
  exports: [BillingService, BusinessIdService, UsageService, UsageGuard],
})
export class BillingModule {}
