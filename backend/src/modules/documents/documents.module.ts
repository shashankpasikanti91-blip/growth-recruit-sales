import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { StorageService } from './storage.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    BillingModule,
    MulterModule.register({ storage: memoryStorage() }),
  ],
  providers: [DocumentsService, StorageService],
  controllers: [DocumentsController],
  exports: [DocumentsService, StorageService],
})
export class DocumentsModule {}
