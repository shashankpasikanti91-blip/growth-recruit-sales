import { Module } from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { CandidatesController } from './candidates.controller';
import { BillingModule } from '../billing/billing.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [BillingModule, SearchModule],
  providers: [CandidatesService],
  controllers: [CandidatesController],
  exports: [CandidatesService],
})
export class CandidatesModule {}
