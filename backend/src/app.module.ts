import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { MetricsModule } from './infrastructure/metrics/metrics.module';
import { AuthModule } from './modules/auth/auth.module';
import { NotificationModule } from './modules/notification/notification.module';
import { UserModule } from './modules/user/user.module';
import { InstagramModule } from './modules/instagram/instagram.module';
import { PostsModule } from './modules/posts/posts.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { HttpLoggerMiddleware } from './common/middleware/http-logger.middleware';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { BackfillParticipantProfilesProcessor } from './workers/processors/backfill-participant-profiles.processor';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
    // Configure BullMQ with Redis connection
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get('redis');
        return {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            db: redisConfig.db || 0,
            maxRetriesPerRequest: null, // Required by BullMQ
            enableReadyCheck: true,
            connectTimeout: 10000,
          },
        };
      },
      inject: [ConfigService],
    }),
    // Register BullMQ queues
    BullModule.registerQueue({
      name: 'backfill-participant-profiles',
    }),
    DatabaseModule,
    CacheModule,
    StorageModule,
    MetricsModule,
    AuthModule,
    NotificationModule,
    UserModule,
    InstagramModule,
    PostsModule,
    MessagingModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
    BackfillParticipantProfilesProcessor,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('*');
  }
}
