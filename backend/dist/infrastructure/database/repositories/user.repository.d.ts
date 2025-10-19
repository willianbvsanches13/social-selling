import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { User, CreateUserDto, UpdateUserDto } from '../../../domain/entities/user.entity';
import { Database } from '../database';
import { BaseRepository } from './base.repository';
export declare class UserRepository extends BaseRepository implements IUserRepository {
    constructor(database: Database);
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
