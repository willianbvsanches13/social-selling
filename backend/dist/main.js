"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
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
    const port = configService.get('port', 4000);
    await app.listen(port);
    console.log(`🚀 Backend running on port ${port}`);
    console.log(`📡 API available at http://localhost:${port}/api`);
    console.log(`💚 Health check at http://localhost:${port}/health`);
}
void bootstrap();
//# sourceMappingURL=main.js.map