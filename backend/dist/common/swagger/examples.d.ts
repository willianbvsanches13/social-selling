export declare const SWAGGER_EXAMPLES: {
    auth: {
        loginRequest: {
            email: string;
            password: string;
        };
        loginResponse: {
            user: {
                id: string;
                email: string;
                name: string;
                emailVerified: boolean;
            };
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
        };
        registerRequest: {
            name: string;
            email: string;
            password: string;
        };
    };
    user: {
        profile: {
            id: string;
            email: string;
            name: string;
            emailVerified: boolean;
            createdAt: string;
            updatedAt: string;
        };
        updateRequest: {
            name: string;
        };
    };
    session: {
        list: {
            sessions: {
                id: string;
                deviceInfo: {
                    deviceId: string;
                    deviceName: string;
                    platform: string;
                    browser: string;
                    os: string;
                };
                createdAt: string;
                lastActivityAt: string;
                ipAddress: string;
            }[];
            total: number;
            maxAllowed: number;
        };
    };
    product: {
        createRequest: {
            title: string;
            description: string;
            price: number;
            compareAtPrice: number;
            sku: string;
            quantity: number;
            categories: string[];
            images: string[];
        };
        productResponse: {
            id: string;
            title: string;
            description: string;
            price: number;
            compareAtPrice: number;
            sku: string;
            quantity: number;
            categories: string[];
            images: string[];
            createdAt: string;
            updatedAt: string;
        };
    };
    instagram: {
        accountResponse: {
            id: string;
            instagramBusinessAccountId: string;
            username: string;
            name: string;
            profilePictureUrl: string;
            followersCount: number;
            followsCount: number;
            mediaCount: number;
            status: string;
            connectedAt: string;
        };
    };
    error: {
        badRequest: {
            statusCode: number;
            message: string;
            errors: string[];
            timestamp: string;
            path: string;
        };
        unauthorized: {
            statusCode: number;
            message: string;
            timestamp: string;
            path: string;
        };
        forbidden: {
            statusCode: number;
            message: string;
            timestamp: string;
            path: string;
        };
        notFound: {
            statusCode: number;
            message: string;
            timestamp: string;
            path: string;
        };
        tooManyRequests: {
            statusCode: number;
            message: string;
            timestamp: string;
            path: string;
        };
        internalServerError: {
            statusCode: number;
            message: string;
            timestamp: string;
            path: string;
        };
    };
};
