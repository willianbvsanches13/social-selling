"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Conversation = exports.ConversationStatus = void 0;
const domain_exception_1 = require("../exceptions/domain.exception");
var ConversationStatus;
(function (ConversationStatus) {
    ConversationStatus["OPEN"] = "open";
    ConversationStatus["CLOSED"] = "closed";
    ConversationStatus["ARCHIVED"] = "archived";
})(ConversationStatus || (exports.ConversationStatus = ConversationStatus = {}));
class Conversation {
    constructor(props) {
        this.props = props;
    }
    static create(props) {
        return new Conversation({
            ...props,
            id: crypto.randomUUID(),
            unreadCount: 0,
            status: ConversationStatus.OPEN,
            metadata: props.metadata || {},
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
    static reconstitute(props) {
        return new Conversation(props);
    }
    get id() {
        return this.props.id;
    }
    get clientAccountId() {
        return this.props.clientAccountId;
    }
    get unreadCount() {
        return this.props.unreadCount;
    }
    get status() {
        return this.props.status;
    }
    get isOpen() {
        return this.props.status === ConversationStatus.OPEN;
    }
    get lastMessageAt() {
        return this.props.lastMessageAt;
    }
    incrementUnreadCount() {
        this.props.unreadCount++;
        this.props.updatedAt = new Date();
    }
    markAllAsRead() {
        this.props.unreadCount = 0;
        this.props.updatedAt = new Date();
    }
    updateLastMessage(timestamp) {
        this.props.lastMessageAt = timestamp;
        this.props.updatedAt = new Date();
    }
    close() {
        this.props.status = ConversationStatus.CLOSED;
        this.props.updatedAt = new Date();
    }
    reopen() {
        if (this.props.status === ConversationStatus.ARCHIVED) {
            throw new domain_exception_1.DomainException('Cannot reopen archived conversation');
        }
        this.props.status = ConversationStatus.OPEN;
        this.props.updatedAt = new Date();
    }
    archive() {
        this.props.status = ConversationStatus.ARCHIVED;
        this.props.updatedAt = new Date();
    }
    isStale(daysSinceLastMessage = 7) {
        if (!this.props.lastMessageAt) {
            return false;
        }
        const now = new Date();
        const daysSince = (now.getTime() - this.props.lastMessageAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince >= daysSinceLastMessage;
    }
    toJSON() {
        return {
            id: this.props.id,
            clientAccountId: this.props.clientAccountId,
            platformConversationId: this.props.platformConversationId,
            participantPlatformId: this.props.participantPlatformId,
            participantUsername: this.props.participantUsername,
            participantProfilePic: this.props.participantProfilePic,
            lastMessageAt: this.props.lastMessageAt,
            unreadCount: this.props.unreadCount,
            status: this.props.status,
            metadata: this.props.metadata,
            createdAt: this.props.createdAt,
            updatedAt: this.props.updatedAt,
        };
    }
}
exports.Conversation = Conversation;
//# sourceMappingURL=conversation.entity.js.map