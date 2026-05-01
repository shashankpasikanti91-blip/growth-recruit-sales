import { Module } from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { InterviewsController } from './interviews.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [PrismaModule, BillingModule],
  controllers: [InterviewsController],
  providers: [InterviewsService],
  exports: [InterviewsService],
})
export class InterviewsModule {}
