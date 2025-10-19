import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    getProfile(req: any): Promise<{
        id: string;
        email: string;
        name: string;
        timezone: string;
        language: string;
        subscriptionTier: import("../../domain/entities").SubscriptionTier;
        emailVerified: boolean;
        lastLoginAt: Date | undefined;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfile(req: any, updateDto: UpdateProfileDto): Promise<{
        id: string;
        email: string;
        name: string;
        timezone: string;
        language: string;
        subscriptionTier: import("../../domain/entities").SubscriptionTier;
        emailVerified: boolean;
        lastLoginAt: Date | undefined;
        createdAt: Date;
        updatedAt: Date;
    }>;
    changePassword(req: any, changePasswordDto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    sendVerificationEmail(req: any): Promise<{
        message: string;
        email: any;
    }>;
    verifyEmail(token: string): Promise<{
        message: string;
        emailVerified: boolean;
    }>;
    deleteAccount(req: any): Promise<{
        message: string;
        deletedAt: Date;
    }>;
    getUserStats(req: any): Promise<any>;
}
