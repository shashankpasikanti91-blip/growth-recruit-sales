import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { BillingModule } from '../billing/billing.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [BillingModule, SearchModule],
  providers: [CompaniesService],
  controllers: [CompaniesController],
  exports: [CompaniesService],
})
export class CompaniesModule {}
