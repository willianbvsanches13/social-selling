import { DomainException } from '../exceptions/domain.exception';

export enum DeletionRequestSource {
  USER_APP = 'user_app',
  META_CALLBACK = 'meta_callback',
  EMAIL = 'email',
}

export enum DeletionRequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface DataDeletionRequestProps {
  id: string;
  userId: string;
  confirmationCode: string;
  source: DeletionRequestSource;
  status: DeletionRequestStatus;
  requestedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class DataDeletionRequest {
  private props: DataDeletionRequestProps;

  private constructor(props: DataDeletionRequestProps) {
    this.props = props;
    this.validate();
  }

  static create(
    props: Omit<
      DataDeletionRequestProps,
      'id' | 'status' | 'requestedAt' | 'createdAt' | 'updatedAt'
    >,
  ): DataDeletionRequest {
    const confirmationCode =
      props.confirmationCode || this.generateConfirmationCode();
    return new DataDeletionRequest({
      ...props,
      confirmationCode,
      id: crypto.randomUUID(),
      status: DeletionRequestStatus.PENDING,
      requestedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: DataDeletionRequestProps): DataDeletionRequest {
    return new DataDeletionRequest(props);
  }

  private static generateConfirmationCode(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = crypto.randomUUID().replace(/-/g, '').substring(0, 8);
    return `${timestamp}-${randomPart}`.toUpperCase();
  }

  private validate(): void {
    if (!this.props.userId) {
      throw new DomainException('User ID is required');
    }
    if (!this.props.confirmationCode) {
      throw new DomainException('Confirmation code is required');
    }
    if (!Object.values(DeletionRequestSource).includes(this.props.source)) {
      throw new DomainException('Invalid deletion request source');
    }
    if (!Object.values(DeletionRequestStatus).includes(this.props.status)) {
      throw new DomainException('Invalid deletion request status');
    }
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get confirmationCode(): string {
    return this.props.confirmationCode;
  }

  get source(): DeletionRequestSource {
    return this.props.source;
  }

  get status(): DeletionRequestStatus {
    return this.props.status;
  }

  get requestedAt(): Date {
    return this.props.requestedAt;
  }

  get completedAt(): Date | undefined {
    return this.props.completedAt;
  }

  get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this.props.metadata;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get isPending(): boolean {
    return this.props.status === DeletionRequestStatus.PENDING;
  }

  get isInProgress(): boolean {
    return this.props.status === DeletionRequestStatus.IN_PROGRESS;
  }

  get isCompleted(): boolean {
    return this.props.status === DeletionRequestStatus.COMPLETED;
  }

  get isFailed(): boolean {
    return this.props.status === DeletionRequestStatus.FAILED;
  }

  start(): void {
    if (this.props.status !== DeletionRequestStatus.PENDING) {
      throw new DomainException(
        'Can only start deletion request with pending status',
      );
    }
    this.props.status = DeletionRequestStatus.IN_PROGRESS;
    this.props.updatedAt = new Date();
  }

  complete(): void {
    if (this.props.status === DeletionRequestStatus.COMPLETED) {
      throw new DomainException('Deletion request is already completed');
    }
    if (this.props.status === DeletionRequestStatus.FAILED) {
      throw new DomainException('Cannot complete a failed deletion request');
    }
    this.props.status = DeletionRequestStatus.COMPLETED;
    this.props.completedAt = new Date();
    this.props.errorMessage = undefined;
    this.props.updatedAt = new Date();
  }

  fail(errorMessage: string): void {
    if (!errorMessage || errorMessage.trim().length === 0) {
      throw new DomainException(
        'Error message is required when failing a deletion request',
      );
    }
    if (this.props.status === DeletionRequestStatus.COMPLETED) {
      throw new DomainException('Cannot fail a completed deletion request');
    }
    this.props.status = DeletionRequestStatus.FAILED;
    this.props.errorMessage = errorMessage;
    this.props.updatedAt = new Date();
  }

  retry(): void {
    if (this.props.status !== DeletionRequestStatus.FAILED) {
      throw new DomainException('Can only retry a failed deletion request');
    }
    this.props.status = DeletionRequestStatus.PENDING;
    this.props.errorMessage = undefined;
    this.props.updatedAt = new Date();
  }

  updateMetadata(metadata: Record<string, unknown>): void {
    this.props.metadata = {
      ...this.props.metadata,
      ...metadata,
    };
    this.props.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.props.id,
      userId: this.props.userId,
      confirmationCode: this.props.confirmationCode,
      source: this.props.source,
      status: this.props.status,
      requestedAt: this.props.requestedAt,
      completedAt: this.props.completedAt,
      errorMessage: this.props.errorMessage,
      metadata: this.props.metadata,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
