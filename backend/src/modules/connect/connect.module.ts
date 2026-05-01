import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConnectService } from './connect.service';
import { ConnectController } from './connect.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [ConnectService],
  controllers: [ConnectController],
  exports: [ConnectService],
})
export class ConnectModule {}
