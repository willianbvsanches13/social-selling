"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthToken = void 0;
const domain_exception_1 = require("../exceptions/domain.exception");
class OAuthToken {
    constructor(props) {
        this.props = props;
        this.validate();
    }
    static create(props) {
        return new OAuthToken({
            ...props,
            id: crypto.randomUUID(),
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
    static reconstitute(props) {
        return new OAuthToken(props);
    }
    validate() {
        if (!this.props.encryptedAccessToken) {
            throw new domain_exception_1.DomainException('Encrypted access token is required');
        }
    }
    get id() {
        return this.props.id;
    }
    get clientAccountId() {
        return this.props.clientAccountId;
    }
    get isExpired() {
        return this.props.expiresAt < new Date();
    }
    get expiresAt() {
        return this.props.expiresAt;
    }
    get encryptedAccessToken() {
        return this.props.encryptedAccessToken;
    }
    get encryptedRefreshToken() {
        return this.props.encryptedRefreshToken;
    }
    isExpiringSoon(thresholdDays = 7) {
        const now = new Date();
        const threshold = new Date(now.getTime() + thresholdDays * 24 * 60 * 60 * 1000);
        return this.props.expiresAt <= threshold;
    }
    updateToken(encryptedAccessToken, expiresAt, encryptedRefreshToken) {
        this.props.encryptedAccessToken = encryptedAccessToken;
        this.props.expiresAt = expiresAt;
        if (encryptedRefreshToken) {
            this.props.encryptedRefreshToken = encryptedRefreshToken;
        }
        this.props.updatedAt = new Date();
    }
    toJSON() {
        return {
            id: this.props.id,
            clientAccountId: this.props.clientAccountId,
            tokenType: this.props.tokenType,
            expiresAt: this.props.expiresAt,
            scope: this.props.scope,
            createdAt: this.props.createdAt,
            updatedAt: this.props.updatedAt,
        };
    }
}
exports.OAuthToken = OAuthToken;
//# sourceMappingURL=oauth-token.entity.js.map