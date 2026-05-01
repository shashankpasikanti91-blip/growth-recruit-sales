import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MyHubService } from './my-hub.service';
import { MyHubController } from './my-hub.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MyHubController],
  providers: [MyHubService],
})
export class MyHubModule {}
