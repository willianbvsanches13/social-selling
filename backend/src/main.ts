import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Get config service
  const configService = app.get(ConfigService);

  // CORS
  app.enableCors({
    origin: configService.get<string>('cors.origin'),
    credentials: configService.get<boolean>('cors.credentials'),
  });

  // API prefix (exclude health check)
  app.setGlobalPrefix('api', {
    exclude: ['health'],
  });

  const port = configService.get<number>('port', 4000);
  await app.listen(port);

  console.log(`🚀 Backend running on port ${port}`);
  console.log(`📡 API available at http://localhost:${port}/api`);
  console.log(`💚 Health check at http://localhost:${port}/health`);
}

void bootstrap();
