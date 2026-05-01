import { Module } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [PrismaModule, BillingModule],
  providers: [SubmissionsService],
  controllers: [SubmissionsController],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
