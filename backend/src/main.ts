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

// Set unlimited listeners to prevent warnings
// Multiple modules (Sentry, NestJS, Database, Queue, MinIO, Winston, etc.) add listeners
// Winston already handles uncaughtException and unhandledRejection through exceptionHandlers
process.setMaxListeners(0);

async function bootstrap() {
  try {
    // Initialize Sentry before creating the app
    initializeSentry();

    console.log(
      '*********************** Creating App **************************',
    );
    const app = await NestFactory.create(AppModule, {
      logger: new LoggerService('Bootstrap'),
      abortOnError: false, // Don't exit on module init errors
    });
    console.log(
      '*********************** App created **************************',
    );

    // Configure body parser limits for file uploads
    // This allows larger file uploads (up to 100MB)
    const express = require('express');
    app.use(express.json({ limit: '100mb' }));
    app.use(express.urlencoded({ limit: '100mb', extended: true }));

    // Cookie parser middleware
    app.use(cookieParser());

    // Raw body middleware for webhook signature verification
    // Must be added BEFORE any body parser
    app.use('/api/instagram/webhooks', (req: any, res: any, next: any) => {
      if (req.method === 'POST') {
        let data = '';
        req.setEncoding('utf8');
        req.on('data', (chunk: string) => {
          data += chunk;
        });
        req.on('end', () => {
          req.rawBody = Buffer.from(data, 'utf8');
          next();
        });
      } else {
        next();
      }
    });

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

    // CORS - Allow multiple origins and subdomain patterns
    const corsOrigins = configService.get<string | string[]>('cors.origin');
    const allowedOrigins = Array.isArray(corsOrigins)
      ? corsOrigins
      : [corsOrigins];

    console.log(
      '*********************** CORS Origins configured:',
      allowedOrigins,
      '**************************',
    );

    app.enableCors({
      origin: (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => {
        console.log(
          '*********************** CORS Check - Origin:',
          origin,
          '**************************',
        );

        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
          console.log(
            '*********************** CORS - No origin, allowing **************************',
          );
          return callback(null, true);
        }

        // Check if origin matches allowed origins or subdomain patterns
        const isAllowed = allowedOrigins.some(
          (allowedOrigin: string | undefined) => {
            if (!allowedOrigin) return false;

            // Exact match
            if (allowedOrigin === origin) {
              console.log(
                '*********************** CORS - Exact match:',
                allowedOrigin,
                '**************************',
              );
              return true;
            }

            // Wildcard subdomain pattern (e.g., https://*.willianbvsanches.com)
            if (allowedOrigin.includes('*')) {
              const pattern = allowedOrigin
                .replace(/\./g, '\\.') // Escape dots
                .replace(/\*/g, '[a-zA-Z0-9-]+'); // Replace * with subdomain pattern
              const regex = new RegExp(`^${pattern}$`);
              const matches = regex.test(origin);
              console.log(
                '*********************** CORS - Wildcard check:',
                allowedOrigin,
                'matches:',
                matches,
                '**************************',
              );
              return matches;
            }

            return false;
          },
        );

        if (isAllowed) {
          console.log(
            '*********************** CORS - Origin allowed **************************',
          );
          callback(null, true);
        } else {
          console.log(
            '*********************** CORS - Origin DENIED **************************',
          );
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: configService.get<boolean>('cors.credentials'),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
      ],
    });

    // API prefix (exclude health check)
    app.setGlobalPrefix('api', {
      exclude: ['health'],
    });

    // Swagger/OpenAPI Configuration
    const nodeEnv = configService.get<string>('nodeEnv', 'development');
    const enableDocs = configService.get<boolean>('enableDocs', true);

    console.log(
      `*********************** Environment: ${nodeEnv} **************************`,
    );
    console.log(
      `*********************** Enable Docs: ${enableDocs} **************************`,
    );

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
        console.log(
          `*********************** Attempting to write OpenAPI spec to: ${outputPath} **************************`,
        );
        fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
        console.log(`✅ OpenAPI spec exported to: ${outputPath}`);
      } catch (error) {
        console.warn(
          '⚠️  Could not export OpenAPI spec to file (permission denied or read-only filesystem)',
        );
        if (error instanceof Error) {
          console.warn(`Error details: ${error.message}`);
        }
      }

      console.log(
        `📚 API Documentation: http://localhost:${configService.get<number>('port', 4000)}/api/docs`,
      );
      console.log(
        `*********************** Swagger setup completed **************************`,
      );
    }

    const port = configService.get<number>('port', 4000);
    console.log(
      `*********************** Port configured: ${port} **************************`,
    );
    console.log(`🚀 Backend starting on port ${port}`);

    try {
      console.log(
        `*********************** Calling app.listen(${port}, '0.0.0.0') **************************`,
      );
      const server = await app.listen(port, '0.0.0.0');
      console.log(
        `*********************** app.listen() returned **************************`,
      );
      console.log(`✅ Backend successfully listening on port ${port}`);
      console.log(`📡 API available at http://localhost:${port}/api`);
      console.log(`💚 Health check at http://localhost:${port}/health`);

      // Log server info
      console.log(`Server info:`, {
        address: server.address(),
        listening: server.listening,
      });
    } catch (error) {
      console.error('❌ Failed to start server on port', port);
      if (error instanceof Error) {
        console.error('Listen error:', {
          message: error.message,
          code: (error as any).code,
          stack: error.stack,
        });
      }
      throw error;
    }
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
