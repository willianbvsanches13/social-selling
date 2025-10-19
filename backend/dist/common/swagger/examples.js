"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SWAGGER_EXAMPLES = void 0;
exports.SWAGGER_EXAMPLES = {
    auth: {
        loginRequest: {
            email: 'demo@socialselling.com',
            password: 'DemoPass123!',
        },
        loginResponse: {
            user: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                email: 'demo@socialselling.com',
                name: 'Demo User',
                emailVerified: true,
            },
            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6ImRlbW9Ac29jaWFsc2VsbGluZy5jb20iLCJpYXQiOjE2MzU0NDMyMDAsImV4cCI6MTYzNTQ0NDA5MH0.abcdef123456',
            refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTYzNTQ0MzIwMCwiZXhwIjoxNjM2MDQ4MDAwfQ.xyz789',
            expiresIn: 900,
        },
        registerRequest: {
            name: 'John Doe',
            email: 'john.doe@example.com',
            password: 'SecurePass123!',
        },
    },
    user: {
        profile: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            email: 'john.doe@example.com',
            name: 'John Doe',
            emailVerified: true,
            createdAt: '2025-01-15T10:30:00Z',
            updatedAt: '2025-01-15T10:30:00Z',
        },
        updateRequest: {
            name: 'John Smith',
        },
    },
    session: {
        list: {
            sessions: [
                {
                    id: 'session-123',
                    deviceInfo: {
                        deviceId: 'device-abc',
                        deviceName: 'Chrome on MacOS',
                        platform: 'web',
                        browser: 'Chrome',
                        os: 'MacOS',
                    },
                    createdAt: '2025-01-15T10:30:00Z',
                    lastActivityAt: '2025-01-15T12:00:00Z',
                    ipAddress: '192.168.1.1',
                },
            ],
            total: 1,
            maxAllowed: 5,
        },
    },
    product: {
        createRequest: {
            title: 'Premium Leather Handbag',
            description: 'Handcrafted genuine leather handbag with gold accents',
            price: 149.99,
            compareAtPrice: 199.99,
            sku: 'BAG-LEATHER-001',
            quantity: 25,
            categories: ['accessories', 'handbags'],
            images: [
                'https://cdn.example.com/products/bag-001-front.jpg',
                'https://cdn.example.com/products/bag-001-side.jpg',
            ],
        },
        productResponse: {
            id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
            title: 'Premium Leather Handbag',
            description: 'Handcrafted genuine leather handbag with gold accents',
            price: 149.99,
            compareAtPrice: 199.99,
            sku: 'BAG-LEATHER-001',
            quantity: 25,
            categories: ['accessories', 'handbags'],
            images: [
                'https://cdn.example.com/products/bag-001-front.jpg',
                'https://cdn.example.com/products/bag-001-side.jpg',
            ],
            createdAt: '2025-01-15T10:30:00Z',
            updatedAt: '2025-01-15T10:30:00Z',
        },
    },
    instagram: {
        accountResponse: {
            id: '8f4b2c3a-9876-4321-abcd-ef1234567890',
            instagramBusinessAccountId: '17841405309211844',
            username: 'myboutique',
            name: 'My Boutique',
            profilePictureUrl: 'https://scontent.cdninstagram.com/v/...',
            followersCount: 12543,
            followsCount: 892,
            mediaCount: 234,
            status: 'active',
            connectedAt: '2025-01-10T15:20:00Z',
        },
    },
    error: {
        badRequest: {
            statusCode: 400,
            message: 'Validation failed',
            errors: ['Email is required', 'Password must be at least 8 characters'],
            timestamp: '2025-01-15T12:00:00Z',
            path: '/api/auth/register',
        },
        unauthorized: {
            statusCode: 401,
            message: 'Invalid credentials',
            timestamp: '2025-01-15T12:00:00Z',
            path: '/api/auth/login',
        },
        forbidden: {
            statusCode: 403,
            message: 'Forbidden resource',
            timestamp: '2025-01-15T12:00:00Z',
            path: '/api/users/123',
        },
        notFound: {
            statusCode: 404,
            message: 'Resource not found',
            timestamp: '2025-01-15T12:00:00Z',
            path: '/api/products/123',
        },
        tooManyRequests: {
            statusCode: 429,
            message: 'Too many requests',
            timestamp: '2025-01-15T12:00:00Z',
            path: '/api/auth/login',
        },
        internalServerError: {
            statusCode: 500,
            message: 'Internal server error',
            timestamp: '2025-01-15T12:00:00Z',
            path: '/api/products',
        },
    },
};
//# sourceMappingURL=examples.js.map