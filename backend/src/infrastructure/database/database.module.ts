import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Database } from './database';
import { DatabaseHealthIndicator } from './health-check';
import { UserRepository } from './repositories/user.repository';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    Database,
    DatabaseHealthIndicator,
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
  ],
  exports: [Database, DatabaseHealthIndicator, USER_REPOSITORY],
})
export class DatabaseModule {}
