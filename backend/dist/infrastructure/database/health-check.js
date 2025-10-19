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
exports.DatabaseHealthIndicator = void 0;
const common_1 = require("@nestjs/common");
const terminus_1 = require("@nestjs/terminus");
const database_1 = require("./database");
let DatabaseHealthIndicator = class DatabaseHealthIndicator extends terminus_1.HealthIndicator {
    constructor(database) {
        super();
        this.database = database;
    }
    async isHealthy(key) {
        const isHealthy = await this.database.isHealthy();
        const result = this.getStatus(key, isHealthy, {
            connection: this.database.getConnectionStatus() ? 'active' : 'inactive',
        });
        if (isHealthy) {
            return result;
        }
        throw new terminus_1.HealthCheckError('Database health check failed', result);
    }
    async pingCheck(key) {
        return this.isHealthy(key);
    }
};
exports.DatabaseHealthIndicator = DatabaseHealthIndicator;
exports.DatabaseHealthIndicator = DatabaseHealthIndicator = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_1.Database])
], DatabaseHealthIndicator);
//# sourceMappingURL=health-check.js.map