import { User, CreateUserDto, UpdateUserDto } from '../entities/user.entity';
export interface IUserRepository {
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findAll(limit?: number, offset?: number): Promise<User[]>;
    create(data: CreateUserDto): Promise<User>;
    update(id: string, data: UpdateUserDto): Promise<User>;
    delete(id: string): Promise<void>;
    softDelete(id: string): Promise<void>;
    count(): Promise<number>;
    existsByEmail(email: string): Promise<boolean>;
}
export declare const USER_REPOSITORY: unique symbol;
