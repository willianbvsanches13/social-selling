import { OAuthToken } from '../entities/oauth-token.entity';
export interface IOAuthTokenRepository {
    findById(id: string): Promise<OAuthToken | null>;
    findByClientAccountId(clientAccountId: string): Promise<OAuthToken | null>;
    create(oauthToken: OAuthToken): Promise<OAuthToken>;
    update(oauthToken: OAuthToken): Promise<OAuthToken>;
    delete(id: string): Promise<void>;
    findExpiring(thresholdDays: number): Promise<OAuthToken[]>;
}
