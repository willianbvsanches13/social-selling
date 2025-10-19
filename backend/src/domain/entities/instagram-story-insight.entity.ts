export interface InstagramStoryInsightProps {
  id: string;
  clientAccountId: string;
  storyIgId: string;
  mediaType?: string;
  mediaUrl?: string;
  timestamp?: Date;
  expiresAt?: Date;
  reach: number;
  impressions: number;
  replies: number;
  tapsForward: number;
  tapsBack: number;
  exits: number;
  insightsFetchedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class InstagramStoryInsight {
  private props: InstagramStoryInsightProps;

  private constructor(props: InstagramStoryInsightProps) {
    this.props = props;
  }

  static create(
    props: Omit<InstagramStoryInsightProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): InstagramStoryInsight {
    return new InstagramStoryInsight({
      ...props,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: InstagramStoryInsightProps): InstagramStoryInsight {
    return new InstagramStoryInsight(props);
  }

  get id(): string {
    return this.props.id;
  }

  get clientAccountId(): string {
    return this.props.clientAccountId;
  }

  get storyIgId(): string {
    return this.props.storyIgId;
  }

  get reach(): number {
    return this.props.reach;
  }

  get impressions(): number {
    return this.props.impressions;
  }

  update(props: Partial<InstagramStoryInsightProps>): void {
    Object.assign(this.props, props);
    this.props.updatedAt = new Date();
  }

  toJSON() {
    return { ...this.props };
  }
}
