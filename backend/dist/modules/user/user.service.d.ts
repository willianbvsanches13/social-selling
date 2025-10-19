import { ConfigService } from '@nestjs/config';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { User } from '../../domain/entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { EmailService } from '../notification/email.service';
export declare class UserService {
    private readonly userRepository;
    private readonly emailService;
    private readonly configService;
    constructor(userRepository: IUserRepository, emailService: EmailService, configService: ConfigService);
    getProfile(userId: string): Promise<User>;
    updateProfile(userId: string, updateDto: UpdateProfileDto): Promise<User>;
    changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void>;
    sendVerificationEmail(userId: string): Promise<void>;
    verifyEmail(token: string): Promise<void>;
    deleteAccount(userId: string): Promise<void>;
    getUserStats(userId: string): Promise<any>;
}
