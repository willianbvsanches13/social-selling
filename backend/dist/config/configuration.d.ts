declare const _default: () => {
    port: number;
    nodeEnv: string;
    database: {
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
    };
    redis: {
        host: string;
        port: number;
        password: string;
    };
    minio: {
        host: string;
        port: number;
        accessKey: string;
        secretKey: string;
        bucket: string;
    };
    jwt: {
        secret: string;
        expiresIn: string;
        refreshSecret: string;
        refreshExpiresIn: string;
    };
    instagram: {
        appId: string;
        appSecret: string;
        redirectUri: string;
        webhookVerifyToken: string;
    };
    cors: {
        origin: string;
        credentials: boolean;
    };
    enableDocs: boolean;
};
export default _default;
