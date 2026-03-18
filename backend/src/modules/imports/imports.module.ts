import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ImportsService } from './imports.service';
import { ImportsController } from './imports.controller';
import { ImportProcessor } from './import.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'import-processing' })],
  providers: [ImportsService, ImportProcessor],
  controllers: [ImportsController],
  exports: [ImportsService],
})
export class ImportsModule {}
