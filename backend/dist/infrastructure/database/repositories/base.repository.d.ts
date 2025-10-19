import { IDatabase } from 'pg-promise';
import { Logger } from '@nestjs/common';
export declare abstract class BaseRepository {
    protected readonly db: IDatabase<any>;
    protected readonly logger: Logger;
    constructor(db: IDatabase<any>, loggerContext: string);
    protected mapToCamelCase<T>(row: any): T;
    protected mapArrayToCamelCase<T>(rows: any[]): T[];
    protected mapToSnakeCase(obj: any): any;
    protected buildUpdateQuery(table: string, id: string, data: any): {
        query: string;
        values: any[];
    };
}
