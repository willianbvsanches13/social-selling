import { ClientAccount, Platform, AccountStatus } from '../entities/client-account.entity';
export interface IClientAccountRepository {
    findById(id: string): Promise<ClientAccount | null>;
    findByUserId(userId: string): Promise<ClientAccount[]>;
    findByPlatformAccountId(platform: Platform, platformAccountId: string): Promise<ClientAccount | null>;
    findExpiringSoon(hours: number): Promise<ClientAccount[]>;
    countByUserId(userId: string): Promise<number>;
    create(clientAccount: ClientAccount): Promise<ClientAccount>;
    update(clientAccount: ClientAccount): Promise<ClientAccount>;
    updateStatus(id: string, status: AccountStatus): Promise<void>;
    delete(id: string): Promise<void>;
}
