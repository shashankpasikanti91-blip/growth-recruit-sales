import { Module, Global } from '@nestjs/common';
import { OwnerNotificationService } from './owner-notification.service';
import { OwnerController } from './owner.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationListenerService } from './notification-listener.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [OwnerController, NotificationsController],
  providers: [OwnerNotificationService, NotificationsService, NotificationListenerService],
  exports: [OwnerNotificationService, NotificationsService],
})
export class NotificationsModule {}
