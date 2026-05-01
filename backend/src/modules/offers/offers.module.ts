import { Module } from '@nestjs/common';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [PrismaModule, BillingModule],
  controllers: [OffersController],
  providers: [OffersService],
  exports: [OffersService],
})
export class OffersModule {}
