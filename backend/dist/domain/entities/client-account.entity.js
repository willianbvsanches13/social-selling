"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientAccount = exports.AccountStatus = exports.Platform = void 0;
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
})(AccountStatus || (exports.AccountStatus = AccountStatus = {}));
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
    get isActive() {
        return this.props.status === AccountStatus.ACTIVE;
    }
    markAsTokenExpired() {
        this.props.status = AccountStatus.TOKEN_EXPIRED;
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
    updateMetadata(followerCount, profilePictureUrl) {
        this.props.followerCount = followerCount;
        this.props.profilePictureUrl = profilePictureUrl;
        this.props.updatedAt = new Date();
    }
    toJSON() {
        return {
            id: this.props.id,
            userId: this.props.userId,
            platform: this.props.platform,
            platformAccountId: this.props.platformAccountId,
            username: this.props.username,
            profilePictureUrl: this.props.profilePictureUrl,
            followerCount: this.props.followerCount,
            status: this.props.status,
            metadata: this.props.metadata,
            createdAt: this.props.createdAt,
            updatedAt: this.props.updatedAt,
        };
    }
}
exports.ClientAccount = ClientAccount;
//# sourceMappingURL=client-account.entity.js.map