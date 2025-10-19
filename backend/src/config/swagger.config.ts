/**
 * Swagger/OpenAPI Configuration
 *
 * Centralized configuration for API documentation
 */

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

export const SWAGGER_CONFIG: SwaggerConfig = {
  title: 'Social Selling API',
  description: `
# Social Selling Platform API

Complete REST API for Instagram-based social selling platform.

## Features
- Instagram OAuth integration
- Product catalog management
- Direct message automation
- Post scheduling and analytics
- Multi-account support

## Authentication
All authenticated endpoints require a Bearer token in the Authorization header.
Obtain tokens via POST /api/auth/login endpoint.

## Rate Limiting
- Authenticated: 1000 requests/hour
- Unauthenticated: 100 requests/hour

## Session Management
Sessions are managed via HTTP-only cookies and can be tracked per device.
  `,
  version: '1.0.0',
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and session management operations',
    },
    {
      name: 'Users',
      description: 'User profile and settings management',
    },
    {
      name: 'Products',
      description: 'Product catalog operations',
    },
    {
      name: 'Instagram',
      description: 'Instagram integration endpoints',
    },
    {
      name: 'Messages',
      description: 'Direct message management',
    },
    {
      name: 'Posts',
      description: 'Post scheduling and publishing',
    },
    {
      name: 'Analytics',
      description: 'Analytics and insights',
    },
    {
      name: 'Health',
      description: 'Application health and readiness checks',
    },
  ],
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Local Development',
    },
    {
      url: 'https://staging-api.socialselling.willianbvsanches.com',
      description: 'Staging Environment',
    },
    {
      url: 'https://api.socialselling.willianbvsanches.com',
      description: 'Production Environment',
    },
  ],
};
