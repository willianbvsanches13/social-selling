export interface InstagramAnalyticsReportProps {
  id: string;
  clientAccountId: string;
  userId: string;
  reportType: 'overview' | 'content' | 'audience' | 'engagement';
  period: string;
  startDate: string;
  endDate: string;
  summary: Record<string, any>;
  chartsData: Record<string, any>;
  topPosts: any[];
  insights: Record<string, any>;
  generatedAt: Date;
  createdAt: Date;
}

export class InstagramAnalyticsReport {
  private props: InstagramAnalyticsReportProps;

  private constructor(props: InstagramAnalyticsReportProps) {
    this.props = props;
  }

  static create(
    props: Omit<InstagramAnalyticsReportProps, 'id' | 'createdAt'>,
  ): InstagramAnalyticsReport {
    return new InstagramAnalyticsReport({
      ...props,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    });
  }

  static reconstitute(props: InstagramAnalyticsReportProps): InstagramAnalyticsReport {
    return new InstagramAnalyticsReport(props);
  }

  get id(): string {
    return this.props.id;
  }

  get clientAccountId(): string {
    return this.props.clientAccountId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get reportType(): string {
    return this.props.reportType;
  }

  get summary(): Record<string, any> {
    return this.props.summary;
  }

  toJSON() {
    return { ...this.props };
  }
}
