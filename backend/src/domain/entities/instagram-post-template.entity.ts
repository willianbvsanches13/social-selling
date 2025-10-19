import { PostMediaType } from './instagram-scheduled-post.entity';

export enum TemplateCategory {
  PRODUCT_LAUNCH = 'product_launch',
  PROMOTION = 'promotion',
  TIP = 'tip',
  TESTIMONIAL = 'testimonial',
  BEHIND_SCENES = 'behind_scenes',
  ANNOUNCEMENT = 'announcement',
}

export interface InstagramPostTemplateProps {
  id: string;
  userId: string;
  clientAccountId?: string;
  name: string;
  category?: TemplateCategory;
  captionTemplate: string;
  variables: string[];
  defaultMediaType: PostMediaType;
  suggestedHashtags: string[];
  suggestedMentions: string[];
  isActive: boolean;
  usageCount: number;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class InstagramPostTemplate {
  private props: InstagramPostTemplateProps;

  private constructor(props: InstagramPostTemplateProps) {
    this.props = props;
  }

  static create(
    props: Omit<InstagramPostTemplateProps, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'variables'>,
  ): InstagramPostTemplate {
    // Extract variables from caption template
    const variableRegex = /\{\{\s*(\w+)\s*\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(props.captionTemplate)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return new InstagramPostTemplate({
      ...props,
      id: crypto.randomUUID(),
      variables,
      usageCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: InstagramPostTemplateProps): InstagramPostTemplate {
    return new InstagramPostTemplate(props);
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get clientAccountId(): string | undefined {
    return this.props.clientAccountId;
  }

  get name(): string {
    return this.props.name;
  }

  get captionTemplate(): string {
    return this.props.captionTemplate;
  }

  get variables(): string[] {
    return this.props.variables;
  }

  get usageCount(): number {
    return this.props.usageCount;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get suggestedHashtags(): string[] {
    return this.props.suggestedHashtags;
  }

  get suggestedMentions(): string[] {
    return this.props.suggestedMentions;
  }

  // Mutators
  updateName(newName: string): void {
    this.props.name = newName;
    this.props.updatedAt = new Date();
  }

  updateCaptionTemplate(newTemplate: string): void {
    this.props.captionTemplate = newTemplate;

    // Re-extract variables
    const variableRegex = /\{\{\s*(\w+)\s*\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(newTemplate)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    this.props.variables = variables;
    this.props.updatedAt = new Date();
  }

  updateSuggestedHashtags(hashtags: string[]): void {
    this.props.suggestedHashtags = hashtags;
    this.props.updatedAt = new Date();
  }

  updateSuggestedMentions(mentions: string[]): void {
    this.props.suggestedMentions = mentions;
    this.props.updatedAt = new Date();
  }

  setActive(isActive: boolean): void {
    this.props.isActive = isActive;
    this.props.updatedAt = new Date();
  }

  recordUsage(): void {
    this.props.usageCount++;
    this.props.lastUsedAt = new Date();
    this.props.updatedAt = new Date();
  }

  processCaption(captionVariables: Record<string, string>): string {
    let processed = this.props.captionTemplate;

    for (const [key, value] of Object.entries(captionVariables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processed = processed.replace(regex, value);
    }

    return processed;
  }

  toJSON(): InstagramPostTemplateProps {
    return {
      ...this.props,
    };
  }
}
