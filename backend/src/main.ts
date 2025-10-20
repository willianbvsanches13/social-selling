import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './app.module';
import { SWAGGER_CONFIG } from './config/swagger.config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';
import { initializeSentry } from './common/monitoring/sentry.config';
import { LoggerService } from './common/logging/logger.service';

async function bootstrap() {
  try {
    // Initialize Sentry before creating the app
    initializeSentry();

    console.log('*********************** Creating App **************************');
    const app = await NestFactory.create(AppModule, {
      logger: new LoggerService('Bootstrap'),
    });
    console.log('*********************** App created **************************');

  // Cookie parser middleware
  app.use(cookieParser());

  // Global exception filters
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new ValidationExceptionFilter(),
  );

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

  // Swagger/OpenAPI Configuration
  const nodeEnv = configService.get<string>('nodeEnv', 'development');
  const enableDocs = configService.get<boolean>('enableDocs', true);

  console.log(`*********************** Environment: ${nodeEnv} **************************`);
  console.log(`*********************** Enable Docs: ${enableDocs} **************************`);

  if (nodeEnv !== 'production' || enableDocs) {
    const config = new DocumentBuilder()
      .setTitle(SWAGGER_CONFIG.title)
      .setDescription(SWAGGER_CONFIG.description)
      .setVersion(SWAGGER_CONFIG.version)
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT access token',
          in: 'header',
        },
        'bearerAuth',
      )
      .addCookieAuth(
        'ssell_session',
        {
          type: 'apiKey',
          in: 'cookie',
          name: 'ssell_session',
          description: 'Session cookie for authenticated requests',
        },
        'cookieAuth',
      );

    // Add servers
    SWAGGER_CONFIG.servers.forEach((server) => {
      config.addServer(server.url, server.description);
    });

    // Add tags
    SWAGGER_CONFIG.tags.forEach((tag) => {
      config.addTag(tag.name, tag.description, tag.externalDocs);
    });

    const document = SwaggerModule.createDocument(app, config.build());

    // Swagger UI setup
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
        syntaxHighlight: {
          activate: true,
          theme: 'monokai',
        },
      },
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #3b82f6 }
      `,
      customSiteTitle: 'Social Selling API Documentation',
      customfavIcon: '/favicon.ico',
    });

    // Export OpenAPI spec as JSON (only if writable)
    try {
      // Use /tmp/app in production, cwd in development
      const baseDir = nodeEnv === 'production' ? '/tmp/app' : process.cwd();
      const outputPath = path.join(baseDir, 'openapi-spec.json');
      console.log(`*********************** Attempting to write OpenAPI spec to: ${outputPath} **************************`);
      fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
      console.log(`✅ OpenAPI spec exported to: ${outputPath}`);
    } catch (error) {
      console.warn('⚠️  Could not export OpenAPI spec to file (permission denied or read-only filesystem)');
      if (error instanceof Error) {
        console.warn(`Error details: ${error.message}`);
      }
    }

    console.log(
      `📚 API Documentation: http://localhost:${configService.get<number>('port', 4000)}/api/docs`,
    );
  }

    const port = configService.get<number>('port', 4000);
    await app.listen(port);

    console.log(`🚀 Backend running on port ${port}`);
    console.log(`📡 API available at http://localhost:${port}/api`);
    console.log(`💚 Health check at http://localhost:${port}/health`);
  } catch (error) {
    console.error('❌ FATAL ERROR during bootstrap:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause,
      });
    } else {
      console.error('Unknown error type:', error);
    }

    // Exit with error code
    process.exit(1);
  }
}

void bootstrap();
