import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { LeadImportService } from './lead-import.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  providers: [LeadsService, LeadImportService],
  controllers: [LeadsController],
  exports: [LeadsService, LeadImportService],
})
export class LeadsModule {}
