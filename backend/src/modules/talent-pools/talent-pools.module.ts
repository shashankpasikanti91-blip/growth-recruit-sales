import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TalentPoolsService } from './talent-pools.service';
import { TalentPoolsController, SavedSearchesController } from './talent-pools.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TalentPoolsController, SavedSearchesController],
  providers: [TalentPoolsService],
  exports: [TalentPoolsService],
})
export class TalentPoolsModule {}
