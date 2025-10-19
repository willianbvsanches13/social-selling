export declare enum AnalyticsEventType {
    ACCOUNT_METRIC = "account_metric",
    POST_METRIC = "post_metric",
    STORY_METRIC = "story_metric",
    REEL_METRIC = "reel_metric"
}
export interface AnalyticsEventProps {
    id: string;
    clientAccountId: string;
    eventType: AnalyticsEventType;
    platformMediaId?: string;
    metrics: Record<string, number>;
    timestamp: Date;
    createdAt: Date;
}
export declare class AnalyticsEvent {
    private props;
    private constructor();
    static create(props: Omit<AnalyticsEventProps, 'id' | 'createdAt'>): AnalyticsEvent;
    static reconstitute(props: AnalyticsEventProps): AnalyticsEvent;
    get id(): string;
    get clientAccountId(): string;
    get eventType(): AnalyticsEventType;
    get metrics(): Record<string, number>;
    get timestamp(): Date;
    getMetric(name: string): number | undefined;
    toJSON(): {
        id: string;
        clientAccountId: string;
        eventType: AnalyticsEventType;
        platformMediaId: string | undefined;
        metrics: Record<string, number>;
        timestamp: Date;
        createdAt: Date;
    };
}
