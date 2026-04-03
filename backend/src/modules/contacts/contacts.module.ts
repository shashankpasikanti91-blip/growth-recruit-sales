import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { BillingModule } from '../billing/billing.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [BillingModule, SearchModule],
  providers: [ContactsService],
  controllers: [ContactsController],
  exports: [ContactsService],
})
export class ContactsModule {}
