export enum MediaAssetType {
  IMAGE = 'image',
  VIDEO = 'video',
}

export interface InstagramMediaAssetProps {
  id: string;
  userId: string;
  clientAccountId?: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  mediaType: MediaAssetType;
  s3Bucket: string;
  s3Key: string;
  s3Url: string;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailUrl?: string;
  usedInPosts: number;
  lastUsedAt?: Date;
  tags: string[];
  createdAt: Date;
}

export class InstagramMediaAsset {
  private props: InstagramMediaAssetProps;

  private constructor(props: InstagramMediaAssetProps) {
    this.props = props;
  }

  static create(
    props: Omit<
      InstagramMediaAssetProps,
      'id' | 'createdAt' | 'usedInPosts' | 'tags'
    >,
  ): InstagramMediaAsset {
    return new InstagramMediaAsset({
      ...props,
      id: crypto.randomUUID(),
      usedInPosts: 0,
      tags: [],
      createdAt: new Date(),
    });
  }

  static reconstitute(props: InstagramMediaAssetProps): InstagramMediaAsset {
    return new InstagramMediaAsset(props);
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

  get filename(): string {
    return this.props.filename;
  }

  get originalFilename(): string {
    return this.props.originalFilename;
  }

  get mimeType(): string {
    return this.props.mimeType;
  }

  get fileSize(): number {
    return this.props.fileSize;
  }

  get mediaType(): MediaAssetType {
    return this.props.mediaType;
  }

  get s3Url(): string {
    return this.props.s3Url;
  }

  get width(): number | undefined {
    return this.props.width;
  }

  get height(): number | undefined {
    return this.props.height;
  }

  get duration(): number | undefined {
    return this.props.duration;
  }

  get thumbnailUrl(): string | undefined {
    return this.props.thumbnailUrl;
  }

  get usedInPosts(): number {
    return this.props.usedInPosts;
  }

  get tags(): string[] {
    return this.props.tags;
  }

  get s3Bucket(): string {
    return this.props.s3Bucket;
  }

  get s3Key(): string {
    return this.props.s3Key;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  // Mutators
  recordUsage(): void {
    this.props.usedInPosts++;
    this.props.lastUsedAt = new Date();
  }

  addTag(tag: string): void {
    if (!this.props.tags.includes(tag)) {
      this.props.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    this.props.tags = this.props.tags.filter((t) => t !== tag);
  }

  setTags(tags: string[]): void {
    this.props.tags = tags;
  }

  updateDimensions(width: number, height: number): void {
    this.props.width = width;
    this.props.height = height;
  }

  updateDuration(duration: number): void {
    this.props.duration = duration;
  }

  setThumbnailUrl(url: string): void {
    this.props.thumbnailUrl = url;
  }

  isImage(): boolean {
    return this.props.mediaType === MediaAssetType.IMAGE;
  }

  isVideo(): boolean {
    return this.props.mediaType === MediaAssetType.VIDEO;
  }

  toJSON(): InstagramMediaAssetProps {
    return {
      ...this.props,
    };
  }
}
