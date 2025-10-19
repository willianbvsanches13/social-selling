"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionInterceptor = void 0;
const common_1 = require("@nestjs/common");
const session_config_1 = require("../../modules/auth/config/session.config");
let SessionInterceptor = class SessionInterceptor {
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        if (request.newSession) {
            response.cookie(session_config_1.SESSION_CONFIG.cookieName, request.newSession.id, {
                httpOnly: session_config_1.SESSION_CONFIG.cookieHttpOnly,
                secure: session_config_1.SESSION_CONFIG.cookieSecure,
                sameSite: session_config_1.SESSION_CONFIG.cookieSameSite,
                maxAge: session_config_1.SESSION_CONFIG.ttl * 1000,
                path: '/',
            });
        }
        return next.handle();
    }
};
exports.SessionInterceptor = SessionInterceptor;
exports.SessionInterceptor = SessionInterceptor = __decorate([
    (0, common_1.Injectable)()
], SessionInterceptor);
//# sourceMappingURL=session.interceptor.js.map