import { Module, Global } from '@nestjs/common';
import { OwnerNotificationService } from './owner-notification.service';
import { OwnerController } from './owner.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [OwnerController],
  providers: [OwnerNotificationService],
  exports: [OwnerNotificationService],
})
export class NotificationsModule {}
