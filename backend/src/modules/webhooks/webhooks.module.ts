import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { ApplicationsModule } from '../applications/applications.module';
import { LeadsModule } from '../leads/leads.module';
import { OutreachModule } from '../outreach/outreach.module';

@Module({
  imports: [ApplicationsModule, LeadsModule, OutreachModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
