import { Module } from '@nestjs/common';
import { MappingsService } from './mappings.service';
import { MappingsController } from './mappings.controller';

@Module({
  providers: [MappingsService],
  controllers: [MappingsController],
  exports: [MappingsService],
})
export class MappingsModule {}
