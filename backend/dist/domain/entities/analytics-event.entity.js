"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsEvent = exports.AnalyticsEventType = void 0;
var AnalyticsEventType;
(function (AnalyticsEventType) {
    AnalyticsEventType["ACCOUNT_METRIC"] = "account_metric";
    AnalyticsEventType["POST_METRIC"] = "post_metric";
    AnalyticsEventType["STORY_METRIC"] = "story_metric";
    AnalyticsEventType["REEL_METRIC"] = "reel_metric";
})(AnalyticsEventType || (exports.AnalyticsEventType = AnalyticsEventType = {}));
class AnalyticsEvent {
    constructor(props) {
        this.props = props;
    }
    static create(props) {
        return new AnalyticsEvent({
            ...props,
            id: crypto.randomUUID(),
            metrics: props.metrics || {},
            createdAt: new Date(),
        });
    }
    static reconstitute(props) {
        return new AnalyticsEvent(props);
    }
    get id() {
        return this.props.id;
    }
    get clientAccountId() {
        return this.props.clientAccountId;
    }
    get eventType() {
        return this.props.eventType;
    }
    get metrics() {
        return { ...this.props.metrics };
    }
    get timestamp() {
        return this.props.timestamp;
    }
    getMetric(name) {
        return this.props.metrics[name];
    }
    toJSON() {
        return {
            id: this.props.id,
            clientAccountId: this.props.clientAccountId,
            eventType: this.props.eventType,
            platformMediaId: this.props.platformMediaId,
            metrics: this.props.metrics,
            timestamp: this.props.timestamp,
            createdAt: this.props.createdAt,
        };
    }
}
exports.AnalyticsEvent = AnalyticsEvent;
//# sourceMappingURL=analytics-event.entity.js.map