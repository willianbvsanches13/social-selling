export enum AnalyticsEventType {
  ACCOUNT_METRIC = 'account_metric',
  POST_METRIC = 'post_metric',
  STORY_METRIC = 'story_metric',
  REEL_METRIC = 'reel_metric',
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

export class AnalyticsEvent {
  private props: AnalyticsEventProps;

  private constructor(props: AnalyticsEventProps) {
    this.props = props;
  }

  static create(
    props: Omit<AnalyticsEventProps, 'id' | 'createdAt'>,
  ): AnalyticsEvent {
    return new AnalyticsEvent({
      ...props,
      id: crypto.randomUUID(),
      metrics: props.metrics || {},
      createdAt: new Date(),
    });
  }

  static reconstitute(props: AnalyticsEventProps): AnalyticsEvent {
    return new AnalyticsEvent(props);
  }

  get id(): string {
    return this.props.id;
  }

  get clientAccountId(): string {
    return this.props.clientAccountId;
  }

  get eventType(): AnalyticsEventType {
    return this.props.eventType;
  }

  get metrics(): Record<string, number> {
    return { ...this.props.metrics };
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  getMetric(name: string): number | undefined {
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
