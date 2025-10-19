"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionGuard = void 0;
const common_1 = require("@nestjs/common");
const session_service_1 = require("../../modules/auth/services/session.service");
let SessionGuard = class SessionGuard {
    constructor(sessionService) {
        this.sessionService = sessionService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const sessionId = request.cookies?.ssell_session ||
            request.headers['x-session-id'];
        if (!sessionId) {
            throw new common_1.UnauthorizedException('No session found');
        }
        try {
            const session = await this.sessionService.validateSession(sessionId);
            request.session = session;
            request.user = {
                id: session.userId,
                email: session.email,
            };
            return true;
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid or expired session');
        }
    }
};
exports.SessionGuard = SessionGuard;
exports.SessionGuard = SessionGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [session_service_1.SessionService])
], SessionGuard);
//# sourceMappingURL=session.guard.js.map