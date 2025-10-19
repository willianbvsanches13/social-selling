"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const database_1 = require("./database");
const health_check_1 = require("./health-check");
const user_repository_1 = require("./repositories/user.repository");
const user_repository_interface_1 = require("../../domain/repositories/user.repository.interface");
let DatabaseModule = class DatabaseModule {
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [
            database_1.Database,
            health_check_1.DatabaseHealthIndicator,
            {
                provide: user_repository_interface_1.USER_REPOSITORY,
                useClass: user_repository_1.UserRepository,
            },
        ],
        exports: [database_1.Database, health_check_1.DatabaseHealthIndicator, user_repository_interface_1.USER_REPOSITORY],
    })
], DatabaseModule);
//# sourceMappingURL=database.module.js.map