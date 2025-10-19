export interface SwaggerConfig {
    title: string;
    description: string;
    version: string;
    tags: ApiTag[];
    servers: ApiServer[];
}
export interface ApiTag {
    name: string;
    description: string;
    externalDocs?: {
        description: string;
        url: string;
    };
}
export interface ApiServer {
    url: string;
    description: string;
}
export declare const SWAGGER_CONFIG: SwaggerConfig;
