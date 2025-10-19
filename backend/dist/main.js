"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const path = require("path");
const app_module_1 = require("./app.module");
const swagger_config_1 = require("./config/swagger.config");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
const validation_exception_filter_1 = require("./common/filters/validation-exception.filter");
const sentry_config_1 = require("./common/monitoring/sentry.config");
const logger_service_1 = require("./common/logging/logger.service");
async function bootstrap() {
    (0, sentry_config_1.initializeSentry)();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: new logger_service_1.LoggerService('Bootstrap'),
    });
    app.use(cookieParser());
    app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter(), new validation_exception_filter_1.ValidationExceptionFilter());
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const configService = app.get(config_1.ConfigService);
    app.enableCors({
        origin: configService.get('cors.origin'),
        credentials: configService.get('cors.credentials'),
    });
    app.setGlobalPrefix('api', {
        exclude: ['health'],
    });
    const nodeEnv = configService.get('nodeEnv', 'development');
    const enableDocs = configService.get('enableDocs', true);
    if (nodeEnv !== 'production' || enableDocs) {
        const config = new swagger_1.DocumentBuilder()
            .setTitle(swagger_config_1.SWAGGER_CONFIG.title)
            .setDescription(swagger_config_1.SWAGGER_CONFIG.description)
            .setVersion(swagger_config_1.SWAGGER_CONFIG.version)
            .addBearerAuth({
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'Authorization',
            description: 'Enter JWT access token',
            in: 'header',
        }, 'bearerAuth')
            .addCookieAuth('ssell_session', {
            type: 'apiKey',
            in: 'cookie',
            name: 'ssell_session',
            description: 'Session cookie for authenticated requests',
        }, 'cookieAuth');
        swagger_config_1.SWAGGER_CONFIG.servers.forEach((server) => {
            config.addServer(server.url, server.description);
        });
        swagger_config_1.SWAGGER_CONFIG.tags.forEach((tag) => {
            config.addTag(tag.name, tag.description, tag.externalDocs);
        });
        const document = swagger_1.SwaggerModule.createDocument(app, config.build());
        swagger_1.SwaggerModule.setup('api/docs', app, document, {
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
        const outputPath = path.join(process.cwd(), 'openapi-spec.json');
        fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
        console.log(`📚 API Documentation: http://localhost:${configService.get('port', 4000)}/api/docs`);
        console.log(`📄 OpenAPI spec exported to: ${outputPath}`);
    }
    const port = configService.get('port', 4000);
    await app.listen(port);
    console.log(`🚀 Backend running on port ${port}`);
    console.log(`📡 API available at http://localhost:${port}/api`);
    console.log(`💚 Health check at http://localhost:${port}/health`);
}
void bootstrap();
//# sourceMappingURL=main.js.map