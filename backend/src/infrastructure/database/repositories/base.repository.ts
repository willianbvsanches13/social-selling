import { IDatabase } from 'pg-promise';
import { Logger } from '@nestjs/common';

export abstract class BaseRepository {
  protected readonly logger: Logger;

  constructor(
    protected readonly db: IDatabase<any>,
    loggerContext: string,
  ) {
    this.logger = new Logger(loggerContext);
  }

  protected mapToCamelCase<T>(row: any): T {
    if (!row) return row;

    const camelCaseRow: any = {};
    for (const key in row) {
      // eslint-disable-next-line no-prototype-builtins
      if (row.hasOwnProperty(key)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
          letter.toUpperCase(),
        );
        camelCaseRow[camelKey] = row[key];
      }
    }
    return camelCaseRow as T;
  }

  protected mapArrayToCamelCase<T>(rows: any[]): T[] {
    return rows.map((row) => this.mapToCamelCase<T>(row));
  }

  protected mapToSnakeCase(obj: any): any {
    if (!obj) return obj;

    const snakeCaseObj: any = {};
    for (const key in obj) {
      // eslint-disable-next-line no-prototype-builtins
      if (obj.hasOwnProperty(key) && obj[key] !== undefined) {
        const snakeKey = key.replace(
          /[A-Z]/g,
          (letter) => `_${letter.toLowerCase()}`,
        );
        snakeCaseObj[snakeKey] = obj[key];
      }
    }
    return snakeCaseObj;
  }

  protected buildUpdateQuery(
    table: string,
    id: string,
    data: any,
  ): { query: string; values: any[] } {
    const snakeData = this.mapToSnakeCase(data);
    const keys = Object.keys(snakeData);

    if (keys.length === 0) {
      throw new Error('No fields to update');
    }

    const setClause = keys
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
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
