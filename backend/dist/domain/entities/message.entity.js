"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = exports.SenderType = exports.MessageType = void 0;
const domain_exception_1 = require("../exceptions/domain.exception");
var MessageType;
(function (MessageType) {
    MessageType["TEXT"] = "text";
    MessageType["IMAGE"] = "image";
    MessageType["VIDEO"] = "video";
    MessageType["AUDIO"] = "audio";
    MessageType["STORY_MENTION"] = "story_mention";
    MessageType["STORY_REPLY"] = "story_reply";
})(MessageType || (exports.MessageType = MessageType = {}));
var SenderType;
(function (SenderType) {
    SenderType["USER"] = "user";
    SenderType["CUSTOMER"] = "customer";
})(SenderType || (exports.SenderType = SenderType = {}));
class Message {
    constructor(props) {
        this.props = props;
        this.validate();
    }
    static create(props) {
        return new Message({
            ...props,
            id: crypto.randomUUID(),
            isRead: false,
            metadata: props.metadata || {},
            createdAt: new Date(),
        });
    }
    static reconstitute(props) {
        return new Message(props);
    }
    validate() {
        if (this.props.messageType === MessageType.TEXT && !this.props.content) {
            throw new domain_exception_1.DomainException('Text messages must have content');
        }
        if ([MessageType.IMAGE, MessageType.VIDEO, MessageType.AUDIO].includes(this.props.messageType) &&
            !this.props.mediaUrl) {
            throw new domain_exception_1.DomainException(`${this.props.messageType} messages must have media URL`);
        }
    }
    get id() {
        return this.props.id;
    }
    get conversationId() {
        return this.props.conversationId;
    }
    get senderType() {
        return this.props.senderType;
    }
    get isFromCustomer() {
        return this.props.senderType === SenderType.CUSTOMER;
    }
    get isRead() {
        return this.props.isRead;
    }
    get sentAt() {
        return this.props.sentAt;
    }
    get content() {
        return this.props.content;
    }
    markAsRead() {
        if (this.props.isRead) {
            return;
        }
        this.props.isRead = true;
        this.props.readAt = new Date();
    }
    markAsDelivered() {
        if (this.props.deliveredAt) {
            return;
        }
        this.props.deliveredAt = new Date();
    }
    isWithinResponseWindow(windowHours = 24) {
        const now = new Date();
        const windowMs = windowHours * 60 * 60 * 1000;
        return now.getTime() - this.props.sentAt.getTime() <= windowMs;
    }
    containsProductMention(productName) {
        if (!this.props.content) {
            return false;
        }
        const normalizedContent = this.props.content.toLowerCase();
        const normalizedProduct = productName.toLowerCase();
        return normalizedContent.includes(normalizedProduct);
    }
    toJSON() {
        return {
            id: this.props.id,
            conversationId: this.props.conversationId,
            platformMessageId: this.props.platformMessageId,
            senderType: this.props.senderType,
            senderPlatformId: this.props.senderPlatformId,
            messageType: this.props.messageType,
            content: this.props.content,
            mediaUrl: this.props.mediaUrl,
            mediaType: this.props.mediaType,
            isRead: this.props.isRead,
            sentAt: this.props.sentAt,
            deliveredAt: this.props.deliveredAt,
            readAt: this.props.readAt,
            metadata: this.props.metadata,
            createdAt: this.props.createdAt,
        };
    }
}
exports.Message = Message;
//# sourceMappingURL=message.entity.js.map