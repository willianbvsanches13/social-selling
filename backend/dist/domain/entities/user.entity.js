"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.SubscriptionTier = void 0;
const domain_exception_1 = require("../exceptions/domain.exception");
var SubscriptionTier;
(function (SubscriptionTier) {
    SubscriptionTier["FREE"] = "free";
    SubscriptionTier["BASIC"] = "basic";
    SubscriptionTier["PRO"] = "pro";
    SubscriptionTier["ENTERPRISE"] = "enterprise";
})(SubscriptionTier || (exports.SubscriptionTier = SubscriptionTier = {}));
class User {
    constructor(props) {
        this.props = props;
        this.validate();
    }
    static create(props) {
        return new User({
            ...props,
            id: crypto.randomUUID(),
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
    static reconstitute(props) {
        return new User(props);
    }
    validate() {
        if (!this.props.name || this.props.name.trim().length < 2) {
            throw new domain_exception_1.DomainException('User name must be at least 2 characters');
        }
        if (!this.props.passwordHash) {
            throw new domain_exception_1.DomainException('Password hash is required');
        }
    }
    get id() {
        return this.props.id;
    }
    get email() {
        return this.props.email;
    }
    get name() {
        return this.props.name;
    }
    get subscriptionTier() {
        return this.props.subscriptionTier;
    }
    get emailVerified() {
        return this.props.emailVerified;
    }
    get isDeleted() {
        return !!this.props.deletedAt;
    }
    get passwordHash() {
        return this.props.passwordHash;
    }
    verifyEmail() {
        this.props.emailVerified = true;
        this.props.emailVerificationToken = undefined;
        this.props.updatedAt = new Date();
    }
    updateLastLogin(ip) {
        this.props.lastLoginAt = new Date();
        this.props.lastLoginIp = ip;
        this.props.updatedAt = new Date();
    }
    upgradeTier(tier) {
        const tierHierarchy = {
            [SubscriptionTier.FREE]: 0,
            [SubscriptionTier.BASIC]: 1,
            [SubscriptionTier.PRO]: 2,
            [SubscriptionTier.ENTERPRISE]: 3,
        };
        if (tierHierarchy[tier] <= tierHierarchy[this.props.subscriptionTier]) {
            throw new domain_exception_1.DomainException('Cannot downgrade or upgrade to same tier');
        }
        this.props.subscriptionTier = tier;
        this.props.updatedAt = new Date();
    }
    canConnectInstagramAccount() {
        return true;
    }
    setPasswordResetToken(token, expiresInMinutes = 60) {
        this.props.passwordResetToken = token;
        this.props.passwordResetExpires = new Date(Date.now() + expiresInMinutes * 60000);
        this.props.updatedAt = new Date();
    }
    isPasswordResetTokenValid() {
        if (!this.props.passwordResetToken || !this.props.passwordResetExpires) {
            return false;
        }
        return this.props.passwordResetExpires > new Date();
    }
    softDelete() {
        this.props.deletedAt = new Date();
        this.props.updatedAt = new Date();
    }
    updateProfile(name, timezone, language) {
        if (name !== undefined) {
            if (name.trim().length < 2) {
                throw new domain_exception_1.DomainException('User name must be at least 2 characters');
            }
            this.props.name = name;
        }
        if (timezone !== undefined) {
            this.props.timezone = timezone;
        }
        if (language !== undefined) {
            this.props.language = language;
        }
        this.props.updatedAt = new Date();
    }
    changePassword(newPasswordHash) {
        if (!newPasswordHash) {
            throw new domain_exception_1.DomainException('Password hash is required');
        }
        this.props.passwordHash = newPasswordHash;
        this.props.updatedAt = new Date();
    }
    setEmailVerificationToken(token) {
        this.props.emailVerificationToken = token;
        this.props.updatedAt = new Date();
    }
    get timezone() {
        return this.props.timezone;
    }
    get language() {
        return this.props.language;
    }
    toJSON() {
        return {
            id: this.props.id,
            email: this.props.email.value,
            name: this.props.name,
            timezone: this.props.timezone,
            language: this.props.language,
            subscriptionTier: this.props.subscriptionTier,
            emailVerified: this.props.emailVerified,
            lastLoginAt: this.props.lastLoginAt,
            createdAt: this.props.createdAt,
            updatedAt: this.props.updatedAt,
        };
    }
}
exports.User = User;
//# sourceMappingURL=user.entity.js.map