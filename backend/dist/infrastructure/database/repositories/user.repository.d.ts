import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { User } from '../../../domain/entities/user.entity';
import { Database } from '../database';
import { BaseRepository } from './base.repository';
export declare class UserRepository extends BaseRepository implements IUserRepository {
    constructor(database: Database);
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    create(user: User): Promise<User>;
    update(user: User): Promise<User>;
    delete(id: string): Promise<void>;
    updateLastLogin(id: string, ip: string): Promise<void>;
    storeRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
    findRefreshToken(tokenHash: string): Promise<{
        userId: string;
        expiresAt: Date;
    } | null>;
    revokeRefreshToken(tokenHash: string): Promise<void>;
    revokeAllUserRefreshTokens(userId: string): Promise<void>;
}
