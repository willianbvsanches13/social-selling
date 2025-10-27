export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.POSTGRES_HOST || 'postgres',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'social_selling',
    user: process.env.POSTGRES_USER || 'social_selling_user',
    password: process.env.POSTGRES_PASSWORD || 'changeme',
  },
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || 'changeme',
  },
  minio: {
    host: process.env.MINIO_HOST || 'minio',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    accessKey:
      process.env.MINIO_ACCESS_KEY ||
      process.env.MINIO_ROOT_USER ||
      'minioadmin',
    secretKey:
      process.env.MINIO_SECRET_KEY ||
      process.env.MINIO_ROOT_PASSWORD ||
      'changeme',
    bucket: process.env.MINIO_BUCKET_NAME || 'social-selling-media',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  instagram: {
    appId: process.env.INSTAGRAM_APP_ID || '',
    appSecret: process.env.INSTAGRAM_APP_SECRET || '',
    redirectUri:
      process.env.INSTAGRAM_REDIRECT_URI ||
      'http://localhost:4000/api/instagram/oauth/callback',
    webhookVerifyToken: process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || '',
  },
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
      : process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: process.env.CORS_CREDENTIALS === 'true' || true,
  },
  enableDocs: process.env.ENABLE_DOCS !== 'false', // Enabled by default, set to 'false' to disable
});
