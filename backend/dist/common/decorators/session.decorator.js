"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetUserId = exports.GetSession = void 0;
const common_1 = require("@nestjs/common");
exports.GetSession = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const session = request.session;
    if (!session) {
        return null;
    }
    return data ? session[data] : session;
});
exports.GetUserId = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const session = request.session;
    return session?.userId;
});
//# sourceMappingURL=session.decorator.js.map