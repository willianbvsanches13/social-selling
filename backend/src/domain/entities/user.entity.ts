export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  timezone: string;
  language: string;
  subscriptionTier: 'free' | 'basic' | 'pro' | 'enterprise';
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CreateUserDto {
  email: string;
  passwordHash: string;
  name: string;
  timezone?: string;
  language?: string;
  subscriptionTier?: 'free' | 'basic' | 'pro' | 'enterprise';
}

export interface UpdateUserDto {
  name?: string;
  timezone?: string;
  language?: string;
  subscriptionTier?: 'free' | 'basic' | 'pro' | 'enterprise';
  emailVerified?: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLoginAt?: Date;
  lastLoginIp?: string;
}
