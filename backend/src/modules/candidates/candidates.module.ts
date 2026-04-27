import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CandidatesService } from './candidates.service';
import { CandidatesController } from './candidates.controller';
import { BillingModule } from '../billing/billing.module';
import { SearchModule } from '../search/search.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [
    BillingModule,
    SearchModule,
    DocumentsModule,
    MulterModule.register({ storage: memoryStorage() }),
  ],
  providers: [CandidatesService],
  controllers: [CandidatesController],
  exports: [CandidatesService],
})
export class CandidatesModule {}
