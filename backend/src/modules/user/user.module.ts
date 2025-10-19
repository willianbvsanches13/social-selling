import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [DatabaseModule, NotificationModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
