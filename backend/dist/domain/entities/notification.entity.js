"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = exports.NotificationType = void 0;
var NotificationType;
(function (NotificationType) {
    NotificationType["NEW_MESSAGE"] = "new_message";
    NotificationType["POST_PUBLISHED"] = "post_published";
    NotificationType["POST_FAILED"] = "post_failed";
    NotificationType["TOKEN_EXPIRING"] = "token_expiring";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
class Notification {
    constructor(props) {
        this.props = props;
    }
    static create(props) {
        return new Notification({
            ...props,
            id: crypto.randomUUID(),
            isRead: false,
            metadata: props.metadata || {},
            createdAt: new Date(),
        });
    }
    static reconstitute(props) {
        return new Notification(props);
    }
    get id() {
        return this.props.id;
    }
    get userId() {
        return this.props.userId;
    }
    get type() {
        return this.props.type;
    }
    get isRead() {
        return this.props.isRead;
    }
    markAsRead() {
        this.props.isRead = true;
    }
    toJSON() {
        return {
            id: this.props.id,
            userId: this.props.userId,
            type: this.props.type,
            title: this.props.title,
            message: this.props.message,
            isRead: this.props.isRead,
            metadata: this.props.metadata,
            createdAt: this.props.createdAt,
        };
    }
}
exports.Notification = Notification;
//# sourceMappingURL=notification.entity.js.map