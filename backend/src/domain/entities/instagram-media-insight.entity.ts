export interface InstagramMediaInsightProps {
  id: string;
  clientAccountId: string;
  mediaIgId: string;
  mediaType?: string;
  mediaUrl?: string;
  permalink?: string;
  caption?: string;
  timestamp?: Date;
  likeCount: number;
  commentCount: number;
  saved: number;
  shares: number;
  reach: number;
  impressions: number;
  videoViews?: number;
  engagementRate?: number;
  fromHome?: number;
  fromHashtags?: number;
  fromExplore?: number;
  fromOther?: number;
  insightsFetchedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class InstagramMediaInsight {
  private props: InstagramMediaInsightProps;

  private constructor(props: InstagramMediaInsightProps) {
    this.props = props;
  }

  static create(
    props: Omit<InstagramMediaInsightProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): InstagramMediaInsight {
    return new InstagramMediaInsight({
      ...props,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: InstagramMediaInsightProps): InstagramMediaInsight {
    return new InstagramMediaInsight(props);
  }

  get id(): string {
    return this.props.id;
  }

  get clientAccountId(): string {
    return this.props.clientAccountId;
  }

  get mediaIgId(): string {
    return this.props.mediaIgId;
  }

  get engagementRate(): number | undefined {
    return this.props.engagementRate;
  }

  get reach(): number {
    return this.props.reach;
  }

  get impressions(): number {
    return this.props.impressions;
  }

  calculateEngagementRate(): number {
    if (this.props.reach <= 0) {
      return 0;
    }
    const engagement = (this.props.likeCount || 0) + (this.props.commentCount || 0);
    return (engagement / this.props.reach) * 100;
  }

  update(props: Partial<InstagramMediaInsightProps>): void {
    Object.assign(this.props, props);
    this.props.updatedAt = new Date();
  }

  toJSON() {
    return { ...this.props };
  }
}
