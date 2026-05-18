import { Module } from '@nestjs/common';
import { FollowUpsService } from './follow-ups.service';
import { FollowUpsController } from './follow-ups.controller';
import { BillingModule } from '../billing/billing.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, BillingModule],
  providers: [FollowUpsService],
  controllers: [FollowUpsController],
  exports: [FollowUpsService],
})
export class FollowUpsModule {}
