"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientAccount = exports.InstagramAccountType = exports.AccountStatus = exports.Platform = void 0;
const domain_exception_1 = require("../exceptions/domain.exception");
var Platform;
(function (Platform) {
    Platform["INSTAGRAM"] = "instagram";
    Platform["WHATSAPP"] = "whatsapp";
})(Platform || (exports.Platform = Platform = {}));
var AccountStatus;
(function (AccountStatus) {
    AccountStatus["ACTIVE"] = "active";
    AccountStatus["TOKEN_EXPIRED"] = "token_expired";
    AccountStatus["DISCONNECTED"] = "disconnected";
    AccountStatus["RATE_LIMITED"] = "rate_limited";
    AccountStatus["ERROR"] = "error";
})(AccountStatus || (exports.AccountStatus = AccountStatus = {}));
var InstagramAccountType;
(function (InstagramAccountType) {
    InstagramAccountType["PERSONAL"] = "personal";
    InstagramAccountType["BUSINESS"] = "business";
    InstagramAccountType["CREATOR"] = "creator";
})(InstagramAccountType || (exports.InstagramAccountType = InstagramAccountType = {}));
class ClientAccount {
    constructor(props) {
        this.props = props;
        this.validate();
    }
    static create(props) {
        return new ClientAccount({
            ...props,
            id: crypto.randomUUID(),
            metadata: props.metadata || {},
            permissions: props.permissions || [],
            accountType: props.accountType || InstagramAccountType.PERSONAL,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
    static reconstitute(props) {
        return new ClientAccount(props);
    }
    validate() {
        if (!this.props.platformAccountId) {
            throw new domain_exception_1.DomainException('Platform account ID is required');
        }
        if (!this.props.username) {
            throw new domain_exception_1.DomainException('Username is required');
        }
    }
    get id() {
        return this.props.id;
    }
    get userId() {
        return this.props.userId;
    }
    get platform() {
        return this.props.platform;
    }
    get username() {
        return this.props.username;
    }
    get status() {
        return this.props.status;
    }
    get platformAccountId() {
        return this.props.platformAccountId;
    }
    get displayName() {
        return this.props.displayName;
    }
    get profilePictureUrl() {
        return this.props.profilePictureUrl;
    }
    get followerCount() {
        return this.props.followerCount;
    }
    get followingCount() {
        return this.props.followingCount;
    }
    get mediaCount() {
        return this.props.mediaCount;
    }
    get biography() {
        return this.props.biography;
    }
    get website() {
        return this.props.website;
    }
    get accountType() {
        return this.props.accountType;
    }
    get metadata() {
        return this.props.metadata;
    }
    get permissions() {
        return this.props.permissions;
    }
    get lastSyncAt() {
        return this.props.lastSyncAt;
    }
    get tokenExpiresAt() {
        return this.props.tokenExpiresAt;
    }
    get isActive() {
        return this.props.status === AccountStatus.ACTIVE;
    }
    get isTokenExpired() {
        if (!this.props.tokenExpiresAt)
            return false;
        return new Date() > this.props.tokenExpiresAt;
    }
    markAsTokenExpired() {
        this.props.status = AccountStatus.TOKEN_EXPIRED;
        this.props.updatedAt = new Date();
    }
    markAsRateLimited() {
        this.props.status = AccountStatus.RATE_LIMITED;
        this.props.updatedAt = new Date();
    }
    markAsError(error) {
        this.props.status = AccountStatus.ERROR;
        this.props.metadata = {
            ...this.props.metadata,
            errorDetails: {
                code: error.code,
                message: error.message,
                timestamp: new Date(),
            },
        };
        this.props.updatedAt = new Date();
    }
    reactivate() {
        this.props.status = AccountStatus.ACTIVE;
        this.props.updatedAt = new Date();
    }
    disconnect() {
        this.props.status = AccountStatus.DISCONNECTED;
        this.props.updatedAt = new Date();
    }
    updateMetadata(data) {
        if (data.displayName !== undefined)
            this.props.displayName = data.displayName;
        if (data.profilePictureUrl !== undefined)
            this.props.profilePictureUrl = data.profilePictureUrl;
        if (data.followerCount !== undefined)
            this.props.followerCount = data.followerCount;
        if (data.followingCount !== undefined)
            this.props.followingCount = data.followingCount;
        if (data.mediaCount !== undefined)
            this.props.mediaCount = data.mediaCount;
        if (data.biography !== undefined)
            this.props.biography = data.biography;
        if (data.website !== undefined)
            this.props.website = data.website;
        if (data.metadata) {
            this.props.metadata = {
                ...this.props.metadata,
                ...data.metadata,
                lastMetadataUpdate: new Date(),
            };
        }
        this.props.lastSyncAt = new Date();
        this.props.updatedAt = new Date();
    }
    updateTokenExpiration(expiresAt) {
        this.props.tokenExpiresAt = expiresAt;
        this.props.updatedAt = new Date();
    }
    toJSON() {
        return {
            id: this.props.id,
            userId: this.props.userId,
            platform: this.props.platform,
            platformAccountId: this.props.platformAccountId,
            username: this.props.username,
            displayName: this.props.displayName,
            profilePictureUrl: this.props.profilePictureUrl,
            followerCount: this.props.followerCount,
            followingCount: this.props.followingCount,
            mediaCount: this.props.mediaCount,
            biography: this.props.biography,
            website: this.props.website,
            status: this.props.status,
            accountType: this.props.accountType,
            metadata: this.props.metadata,
            permissions: this.props.permissions,
            createdAt: this.props.createdAt,
            updatedAt: this.props.updatedAt,
            lastSyncAt: this.props.lastSyncAt,
            tokenExpiresAt: this.props.tokenExpiresAt,
        };
    }
}
exports.ClientAccount = ClientAccount;
//# sourceMappingURL=client-account.entity.js.map