import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { LeadImportService } from './lead-import.service';
import { AiModule } from '../ai/ai.module';
import { BillingModule } from '../billing/billing.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [AiModule, BillingModule, SearchModule],
  providers: [LeadsService, LeadImportService],
  controllers: [LeadsController],
  exports: [LeadsService, LeadImportService],
})
export class LeadsModule {}
