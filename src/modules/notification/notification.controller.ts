import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { NotificationService } from './notification.service';
import { ListNotificationsDto, UpdateNotificationSettingsDto } from './dto/notification.dto';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  listNotifications(@Req() req: Request, @Query() query: ListNotificationsDto) {
    const { userId } = req.user as { userId: string };
    return this.notificationService.listNotifications(userId, query);
  }

  @Get('count')
  countUnread(@Req() req: Request) {
    const { userId } = req.user as { userId: string };
    return this.notificationService.countUnread(userId);
  }

  @Get('settings')
  getSettings(@Req() req: Request) {
    const { userId } = req.user as { userId: string };
    return this.notificationService.getSettings(userId);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAllAsRead(@Req() req: Request) {
    const { userId } = req.user as { userId: string };
    return this.notificationService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  markAsRead(@Req() req: Request, @Param('id') notificationId: string) {
    const { userId } = req.user as { userId: string };
    return this.notificationService.markAsRead(userId, notificationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteNotification(@Req() req: Request, @Param('id') notificationId: string) {
    const { userId } = req.user as { userId: string };
    return this.notificationService.deleteNotification(userId, notificationId);
  }

  @Patch('settings')
  updateSettings(@Req() req: Request, @Body() dto: UpdateNotificationSettingsDto) {
    const { userId } = req.user as { userId: string };
    return this.notificationService.updateSettings(userId, dto);
  }
}
