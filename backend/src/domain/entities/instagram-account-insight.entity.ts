export interface InstagramAccountInsightProps {
  id: string;
  clientAccountId: string;
  date: string;
  period: 'day' | 'week' | 'days_28';
  followerCount?: number;
  followingCount?: number;
  followerChange?: number;
  reach?: number;
  impressions?: number;
  profileViews?: number;
  websiteClicks?: number;
  emailContacts?: number;
  phoneCallClicks?: number;
  textMessageClicks?: number;
  getDirectionsClicks?: number;
  postsCount?: number;
  storiesCount?: number;
  audienceCity?: Record<string, number>;
  audienceCountry?: Record<string, number>;
  audienceGenderAge?: Record<string, number>;
  audienceLocale?: Record<string, number>;
  onlineFollowers?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class InstagramAccountInsight {
  private props: InstagramAccountInsightProps;

  private constructor(props: InstagramAccountInsightProps) {
    this.props = props;
  }

  static create(
    props: Omit<InstagramAccountInsightProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): InstagramAccountInsight {
    return new InstagramAccountInsight({
      ...props,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(
    props: InstagramAccountInsightProps,
  ): InstagramAccountInsight {
    return new InstagramAccountInsight(props);
  }

  get id(): string {
    return this.props.id;
  }

  get clientAccountId(): string {
    return this.props.clientAccountId;
  }

  get date(): string {
    return this.props.date;
  }

  get period(): string {
    return this.props.period;
  }

  get followerCount(): number | undefined {
    return this.props.followerCount;
  }

  get reach(): number | undefined {
    return this.props.reach;
  }

  get impressions(): number | undefined {
    return this.props.impressions;
  }

  update(props: Partial<InstagramAccountInsightProps>): void {
    Object.assign(this.props, props);
    this.props.updatedAt = new Date();
  }

  toJSON() {
    return { ...this.props };
  }
}
