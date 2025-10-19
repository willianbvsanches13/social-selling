"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
const common_1 = require("@nestjs/common");
class BaseRepository {
    constructor(db, loggerContext) {
        this.db = db;
        this.logger = new common_1.Logger(loggerContext);
    }
    mapToCamelCase(row) {
        if (!row)
            return row;
        const camelCaseRow = {};
        for (const key in row) {
            if (row.hasOwnProperty(key)) {
                const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                camelCaseRow[camelKey] = row[key];
            }
        }
        return camelCaseRow;
    }
    mapArrayToCamelCase(rows) {
        return rows.map((row) => this.mapToCamelCase(row));
    }
    mapToSnakeCase(obj) {
        if (!obj)
            return obj;
        const snakeCaseObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key) && obj[key] !== undefined) {
                const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
                snakeCaseObj[snakeKey] = obj[key];
            }
        }
        return snakeCaseObj;
    }
    buildUpdateQuery(table, id, data) {
        const snakeData = this.mapToSnakeCase(data);
        const keys = Object.keys(snakeData);
        if (keys.length === 0) {
            throw new Error('No fields to update');
        }
        const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
        const values = [id, ...keys.map((key) => snakeData[key])];
        const query = `
      UPDATE ${table}
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;
        return { query, values };
    }
}
exports.BaseRepository = BaseRepository;
//# sourceMappingURL=base.repository.js.map