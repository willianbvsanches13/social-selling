"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramMedia = exports.PublishStatus = exports.InstagramMediaType = void 0;
var InstagramMediaType;
(function (InstagramMediaType) {
    InstagramMediaType["IMAGE"] = "image";
    InstagramMediaType["VIDEO"] = "video";
    InstagramMediaType["CAROUSEL_ALBUM"] = "carousel_album";
    InstagramMediaType["STORY"] = "story";
    InstagramMediaType["REEL"] = "reel";
})(InstagramMediaType || (exports.InstagramMediaType = InstagramMediaType = {}));
var PublishStatus;
(function (PublishStatus) {
    PublishStatus["SCHEDULED"] = "scheduled";
    PublishStatus["PUBLISHING"] = "publishing";
    PublishStatus["PUBLISHED"] = "published";
    PublishStatus["FAILED"] = "failed";
})(PublishStatus || (exports.PublishStatus = PublishStatus = {}));
class InstagramMedia {
    constructor(props) {
        this.props = props;
    }
    static create(props) {
        return new InstagramMedia({
            ...props,
            id: crypto.randomUUID(),
            metadata: props.metadata || {},
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
    static reconstitute(props) {
        return new InstagramMedia(props);
    }
    get id() {
        return this.props.id;
    }
    get clientAccountId() {
        return this.props.clientAccountId;
    }
    get status() {
        return this.props.status;
    }
    get isScheduled() {
        return this.props.status === PublishStatus.SCHEDULED;
    }
    get isPublished() {
        return this.props.status === PublishStatus.PUBLISHED;
    }
    markAsPublishing() {
        this.props.status = PublishStatus.PUBLISHING;
        this.props.updatedAt = new Date();
    }
    markAsPublished(platformMediaId) {
        this.props.status = PublishStatus.PUBLISHED;
        this.props.platformMediaId = platformMediaId;
        this.props.publishedAt = new Date();
        this.props.updatedAt = new Date();
    }
    markAsFailed(errorMessage) {
        this.props.status = PublishStatus.FAILED;
        this.props.errorMessage = errorMessage;
        this.props.retryCount++;
        this.props.updatedAt = new Date();
    }
    canRetry(maxRetries = 3) {
        return this.props.retryCount < maxRetries;
    }
    toJSON() {
        return {
            id: this.props.id,
            clientAccountId: this.props.clientAccountId,
            platformMediaId: this.props.platformMediaId,
            mediaType: this.props.mediaType,
            caption: this.props.caption,
            mediaUrls: this.props.mediaUrls,
            scheduledAt: this.props.scheduledAt,
            publishedAt: this.props.publishedAt,
            status: this.props.status,
            errorMessage: this.props.errorMessage,
            retryCount: this.props.retryCount,
            metadata: this.props.metadata,
            createdAt: this.props.createdAt,
            updatedAt: this.props.updatedAt,
        };
    }
}
exports.InstagramMedia = InstagramMedia;
//# sourceMappingURL=instagram-media.entity.js.map