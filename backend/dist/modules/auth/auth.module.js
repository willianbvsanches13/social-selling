"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const database_module_1 = require("../../infrastructure/database/database.module");
const session_service_1 = require("./services/session.service");
const session_guard_1 = require("../../common/guards/session.guard");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            database_module_1.DatabaseModule,
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => {
                    const expiresIn = configService.get('jwt.expiresIn', '24h');
                    const match = expiresIn.match(/^(\d+)([smhd])$/);
                    let expirationSeconds = 86400;
                    if (match) {
                        const value = parseInt(match[1]);
                        const unit = match[2];
                        const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
                        expirationSeconds = value * (multipliers[unit] || 1);
                    }
                    return {
                        secret: configService.get('jwt.secret'),
                        signOptions: {
                            expiresIn: expirationSeconds,
                        },
                    };
                },
                inject: [config_1.ConfigService],
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 5,
                },
            ]),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService, jwt_strategy_1.JwtStrategy, session_service_1.SessionService, session_guard_1.SessionGuard],
        exports: [auth_service_1.AuthService, jwt_1.JwtModule, passport_1.PassportModule, session_service_1.SessionService, session_guard_1.SessionGuard],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map