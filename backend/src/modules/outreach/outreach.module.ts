import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OutreachService } from './outreach.service';
import { OutreachController } from './outreach.controller';
import { AiModule } from '../ai/ai.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [AiModule, BillingModule, ConfigModule],
  providers: [OutreachService],
  controllers: [OutreachController],
  exports: [OutreachService],
})
export class OutreachModule {}
