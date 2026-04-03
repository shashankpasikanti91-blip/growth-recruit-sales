import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ImportsService } from './imports.service';
import { ImportsController } from './imports.controller';
import { ImportProcessor } from './import.processor';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'import-processing' }), BillingModule],
  providers: [ImportsService, ImportProcessor],
  controllers: [ImportsController],
  exports: [ImportsService],
})
export class ImportsModule {}
