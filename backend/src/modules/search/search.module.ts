import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SearchService, DuplicateDetectionService],
  controllers: [SearchController],
  exports: [SearchService, DuplicateDetectionService],
})
export class SearchModule {}
