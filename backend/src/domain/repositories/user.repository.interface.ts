import { User } from '../entities/user.entity';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(user: User): Promise<User>;
  delete(id: string): Promise<void>;
  updateLastLogin(id: string, ip: string): Promise<void>;
  storeRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findRefreshToken(tokenHash: string): Promise<{ userId: string; expiresAt: Date } | null>;
  revokeRefreshToken(tokenHash: string): Promise<void>;
  revokeAllUserRefreshTokens(userId: string): Promise<void>;
}

export const USER_REPOSITORY = Symbol('IUserRepository');
