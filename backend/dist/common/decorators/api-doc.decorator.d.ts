import { Type } from '@nestjs/common';
export interface ApiDocOptions {
    summary: string;
    description?: string;
    responses?: {
        status: number;
        description: string;
        type?: Type<any>;
        isArray?: boolean;
    }[];
    body?: Type<any>;
    queryParams?: {
        name: string;
        required?: boolean;
        description?: string;
        type?: Type<any>;
        isArray?: boolean;
    }[];
    pathParams?: {
        name: string;
        description?: string;
        type?: Type<any>;
    }[];
}
export declare function ApiDoc(options: ApiDocOptions): <TFunction extends Function, Y>(target: TFunction | object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void;
