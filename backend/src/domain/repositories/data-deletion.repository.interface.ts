import {
  DataDeletionRequest,
  DeletionRequestStatus,
} from '../entities/data-deletion-request.entity';

export interface IDataDeletionRepository {
  findById(id: string): Promise<DataDeletionRequest | null>;
  findByConfirmationCode(
    confirmationCode: string,
  ): Promise<DataDeletionRequest | null>;
  findByUserId(userId: string): Promise<DataDeletionRequest[]>;
  findPendingRequests(): Promise<DataDeletionRequest[]>;
  create(request: DataDeletionRequest): Promise<DataDeletionRequest>;
  updateStatus(
    id: string,
    status: DeletionRequestStatus,
    errorMessage?: string,
  ): Promise<DataDeletionRequest>;
}

export const DATA_DELETION_REPOSITORY = Symbol('IDataDeletionRepository');
