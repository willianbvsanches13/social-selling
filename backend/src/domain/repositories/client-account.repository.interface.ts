import { ClientAccount, Platform } from '../entities/client-account.entity';

export interface IClientAccountRepository {
  findById(id: string): Promise<ClientAccount | null>;
  findByUserId(userId: string): Promise<ClientAccount[]>;
  findByPlatformAccountId(platform: Platform, platformAccountId: string): Promise<ClientAccount | null>;
  create(clientAccount: ClientAccount): Promise<ClientAccount>;
  update(clientAccount: ClientAccount): Promise<ClientAccount>;
  delete(id: string): Promise<void>;
}
