import { Notification, NotificationType } from '../entities/notification.entity';

export interface INotificationRepository {
  findById(id: string): Promise<Notification | null>;
  findByUserId(userId: string, isRead?: boolean, limit?: number): Promise<Notification[]>;
  create(notification: Notification): Promise<Notification>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  deleteOldNotifications(userId: string, daysToKeep: number): Promise<void>;
}
