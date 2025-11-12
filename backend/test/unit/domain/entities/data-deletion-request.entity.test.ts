import {
  DataDeletionRequest,
  DataDeletionRequestProps,
  DeletionRequestSource,
  DeletionRequestStatus,
} from '../../../../src/domain/entities/data-deletion-request.entity';
import { DomainException } from '../../../../src/domain/exceptions/domain.exception';

describe('DataDeletionRequest Entity', () => {
  const validProps = {
    userId: 'user-123',
    confirmationCode: 'TEST-CODE-123',
    source: DeletionRequestSource.USER_APP,
  };

  describe('factory method - create()', () => {
    it('should create a new deletion request with valid properties', () => {
      // Arrange & Act
      const request = DataDeletionRequest.create(validProps);

      // Assert
      expect(request.id).toBeDefined();
      expect(request.userId).toBe('user-123');
      expect(request.confirmationCode).toBe('TEST-CODE-123');
      expect(request.source).toBe(DeletionRequestSource.USER_APP);
      expect(request.status).toBe(DeletionRequestStatus.PENDING);
      expect(request.requestedAt).toBeInstanceOf(Date);
      expect(request.createdAt).toBeInstanceOf(Date);
      expect(request.updatedAt).toBeInstanceOf(Date);
      expect(request.completedAt).toBeUndefined();
      expect(request.errorMessage).toBeUndefined();
    });

    it('should generate confirmation code if empty string provided', () => {
      // Arrange
      const propsWithEmptyCode = {
        userId: 'user-123',
        confirmationCode: '',
        source: DeletionRequestSource.META_CALLBACK,
      };

      // Act
      const request = DataDeletionRequest.create(propsWithEmptyCode);

      // Assert
      expect(request.confirmationCode).toBeDefined();
      expect(request.confirmationCode).not.toBe('');
      expect(request.confirmationCode).toMatch(/^[A-Z0-9]+-[A-Z0-9]+$/);
    });

    it('should create request with metadata', () => {
      // Arrange
      const metadata = { ip: '192.168.1.1', userAgent: 'Mozilla/5.0' };
      const propsWithMetadata = { ...validProps, metadata };

      // Act
      const request = DataDeletionRequest.create(propsWithMetadata);

      // Assert
      expect(request.metadata).toEqual(metadata);
    });

    it('should set initial status to PENDING', () => {
      // Arrange & Act
      const request = DataDeletionRequest.create(validProps);

      // Assert
      expect(request.status).toBe(DeletionRequestStatus.PENDING);
      expect(request.isPending).toBe(true);
      expect(request.isInProgress).toBe(false);
      expect(request.isCompleted).toBe(false);
      expect(request.isFailed).toBe(false);
    });

    it('should create request with META_CALLBACK source', () => {
      // Arrange
      const metaProps = {
        ...validProps,
        source: DeletionRequestSource.META_CALLBACK,
      };

      // Act
      const request = DataDeletionRequest.create(metaProps);

      // Assert
      expect(request.source).toBe(DeletionRequestSource.META_CALLBACK);
    });

    it('should create request with EMAIL source', () => {
      // Arrange
      const emailProps = {
        ...validProps,
        source: DeletionRequestSource.EMAIL,
      };

      // Act
      const request = DataDeletionRequest.create(emailProps);

      // Assert
      expect(request.source).toBe(DeletionRequestSource.EMAIL);
    });
  });

  describe('factory method - reconstitute()', () => {
    it('should reconstitute deletion request from database data', () => {
      // Arrange
      const existingProps: DataDeletionRequestProps = {
        id: 'existing-id-123',
        userId: 'user-456',
        confirmationCode: 'EXISTING-CODE',
        source: DeletionRequestSource.USER_APP,
        status: DeletionRequestStatus.COMPLETED,
        requestedAt: new Date('2025-01-01T10:00:00Z'),
        completedAt: new Date('2025-01-01T12:00:00Z'),
        createdAt: new Date('2025-01-01T10:00:00Z'),
        updatedAt: new Date('2025-01-01T12:00:00Z'),
      };

      // Act
      const request = DataDeletionRequest.reconstitute(existingProps);

      // Assert
      expect(request.id).toBe('existing-id-123');
      expect(request.userId).toBe('user-456');
      expect(request.confirmationCode).toBe('EXISTING-CODE');
      expect(request.status).toBe(DeletionRequestStatus.COMPLETED);
      expect(request.isCompleted).toBe(true);
    });

    it('should reconstitute with metadata', () => {
      // Arrange
      const metadata = { reason: 'GDPR request', originalRequestId: '123' };
      const existingProps: DataDeletionRequestProps = {
        id: 'id-1',
        userId: 'user-1',
        confirmationCode: 'CODE-1',
        source: DeletionRequestSource.EMAIL,
        status: DeletionRequestStatus.PENDING,
        requestedAt: new Date(),
        metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const request = DataDeletionRequest.reconstitute(existingProps);

      // Assert
      expect(request.metadata).toEqual(metadata);
    });

    it('should reconstitute failed request with error message', () => {
      // Arrange
      const existingProps: DataDeletionRequestProps = {
        id: 'id-2',
        userId: 'user-2',
        confirmationCode: 'CODE-2',
        source: DeletionRequestSource.USER_APP,
        status: DeletionRequestStatus.FAILED,
        requestedAt: new Date(),
        errorMessage: 'Database connection failed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const request = DataDeletionRequest.reconstitute(existingProps);

      // Assert
      expect(request.status).toBe(DeletionRequestStatus.FAILED);
      expect(request.isFailed).toBe(true);
      expect(request.errorMessage).toBe('Database connection failed');
    });
  });

  describe('validation', () => {
    it('should throw error when userId is missing', () => {
      // Arrange
      const invalidProps = {
        userId: '',
        confirmationCode: 'CODE-123',
        source: DeletionRequestSource.USER_APP,
      };

      // Act & Assert
      expect(() => DataDeletionRequest.create(invalidProps)).toThrow(
        DomainException,
      );
      expect(() => DataDeletionRequest.create(invalidProps)).toThrow(
        'User ID is required',
      );
    });

    it('should throw error when confirmationCode is missing during validation', () => {
      // Arrange - Using reconstitute to bypass factory logic
      const invalidProps: any = {
        id: 'id-1',
        userId: 'user-123',
        confirmationCode: '',
        source: DeletionRequestSource.USER_APP,
        status: DeletionRequestStatus.PENDING,
        requestedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(() => DataDeletionRequest.reconstitute(invalidProps)).toThrow(
        DomainException,
      );
      expect(() => DataDeletionRequest.reconstitute(invalidProps)).toThrow(
        'Confirmation code is required',
      );
    });

    it('should throw error when source is invalid', () => {
      // Arrange
      const invalidProps: any = {
        id: 'id-1',
        userId: 'user-123',
        confirmationCode: 'CODE-123',
        source: 'invalid_source',
        status: DeletionRequestStatus.PENDING,
        requestedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(() => DataDeletionRequest.reconstitute(invalidProps)).toThrow(
        DomainException,
      );
      expect(() => DataDeletionRequest.reconstitute(invalidProps)).toThrow(
        'Invalid deletion request source',
      );
    });

    it('should throw error when status is invalid', () => {
      // Arrange
      const invalidProps: any = {
        id: 'id-1',
        userId: 'user-123',
        confirmationCode: 'CODE-123',
        source: DeletionRequestSource.USER_APP,
        status: 'invalid_status',
        requestedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(() => DataDeletionRequest.reconstitute(invalidProps)).toThrow(
        DomainException,
      );
      expect(() => DataDeletionRequest.reconstitute(invalidProps)).toThrow(
        'Invalid deletion request status',
      );
    });
  });

  describe('status transition - start()', () => {
    it('should transition from PENDING to IN_PROGRESS', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);
      const originalUpdatedAt = request.updatedAt;

      // Wait to ensure timestamp difference
      jest.useFakeTimers();
      jest.advanceTimersByTime(100);

      // Act
      request.start();

      // Assert
      expect(request.status).toBe(DeletionRequestStatus.IN_PROGRESS);
      expect(request.isInProgress).toBe(true);
      expect(request.isPending).toBe(false);
      expect(request.updatedAt).not.toEqual(originalUpdatedAt);

      jest.useRealTimers();
    });

    it('should throw error when starting non-pending request', () => {
      // Arrange
      const inProgressRequest = DataDeletionRequest.reconstitute({
        id: 'id-1',
        userId: 'user-123',
        confirmationCode: 'CODE-123',
        source: DeletionRequestSource.USER_APP,
        status: DeletionRequestStatus.IN_PROGRESS,
        requestedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act & Assert
      expect(() => inProgressRequest.start()).toThrow(DomainException);
      expect(() => inProgressRequest.start()).toThrow(
        'Can only start deletion request with pending status',
      );
    });

    it('should throw error when starting completed request', () => {
      // Arrange
      const completedRequest = DataDeletionRequest.reconstitute({
        id: 'id-1',
        userId: 'user-123',
        confirmationCode: 'CODE-123',
        source: DeletionRequestSource.USER_APP,
        status: DeletionRequestStatus.COMPLETED,
        requestedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act & Assert
      expect(() => completedRequest.start()).toThrow(DomainException);
    });

    it('should throw error when starting failed request', () => {
      // Arrange
      const failedRequest = DataDeletionRequest.reconstitute({
        id: 'id-1',
        userId: 'user-123',
        confirmationCode: 'CODE-123',
        source: DeletionRequestSource.USER_APP,
        status: DeletionRequestStatus.FAILED,
        requestedAt: new Date(),
        errorMessage: 'Some error',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act & Assert
      expect(() => failedRequest.start()).toThrow(DomainException);
    });
  });

  describe('status transition - complete()', () => {
    it('should transition from PENDING to COMPLETED', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);

      // Act
      request.complete();

      // Assert
      expect(request.status).toBe(DeletionRequestStatus.COMPLETED);
      expect(request.isCompleted).toBe(true);
      expect(request.completedAt).toBeInstanceOf(Date);
    });

    it('should transition from IN_PROGRESS to COMPLETED', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);
      request.start();

      // Act
      request.complete();

      // Assert
      expect(request.status).toBe(DeletionRequestStatus.COMPLETED);
      expect(request.isCompleted).toBe(true);
      expect(request.completedAt).toBeInstanceOf(Date);
    });

    it('should set completedAt timestamp when completing', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);
      expect(request.completedAt).toBeUndefined();

      // Act
      request.complete();

      // Assert
      expect(request.completedAt).toBeDefined();
      expect(request.completedAt).toBeInstanceOf(Date);
    });

    it('should clear error message when completing', () => {
      // Arrange
      const request = DataDeletionRequest.reconstitute({
        id: 'id-1',
        userId: 'user-123',
        confirmationCode: 'CODE-123',
        source: DeletionRequestSource.USER_APP,
        status: DeletionRequestStatus.PENDING,
        requestedAt: new Date(),
        errorMessage: 'Previous error',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      request.complete();

      // Assert
      expect(request.errorMessage).toBeUndefined();
    });

    it('should throw error when completing already completed request', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);
      request.complete();

      // Act & Assert
      expect(() => request.complete()).toThrow(DomainException);
      expect(() => request.complete()).toThrow(
        'Deletion request is already completed',
      );
    });

    it('should throw error when completing failed request', () => {
      // Arrange
      const failedRequest = DataDeletionRequest.reconstitute({
        id: 'id-1',
        userId: 'user-123',
        confirmationCode: 'CODE-123',
        source: DeletionRequestSource.USER_APP,
        status: DeletionRequestStatus.FAILED,
        requestedAt: new Date(),
        errorMessage: 'Some error',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act & Assert
      expect(() => failedRequest.complete()).toThrow(DomainException);
      expect(() => failedRequest.complete()).toThrow(
        'Cannot complete a failed deletion request',
      );
    });

    it('should update updatedAt timestamp when completing', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);
      const originalUpdatedAt = request.updatedAt;

      jest.useFakeTimers();
      jest.advanceTimersByTime(100);

      // Act
      request.complete();

      // Assert
      expect(request.updatedAt).not.toEqual(originalUpdatedAt);

      jest.useRealTimers();
    });
  });

  describe('status transition - fail()', () => {
    it('should transition from PENDING to FAILED with error message', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);

      // Act
      request.fail('Database connection error');

      // Assert
      expect(request.status).toBe(DeletionRequestStatus.FAILED);
      expect(request.isFailed).toBe(true);
      expect(request.errorMessage).toBe('Database connection error');
    });

    it('should transition from IN_PROGRESS to FAILED', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);
      request.start();

      // Act
      request.fail('Processing error');

      // Assert
      expect(request.status).toBe(DeletionRequestStatus.FAILED);
      expect(request.errorMessage).toBe('Processing error');
    });

    it('should throw error when error message is empty', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);

      // Act & Assert
      expect(() => request.fail('')).toThrow(DomainException);
      expect(() => request.fail('')).toThrow(
        'Error message is required when failing a deletion request',
      );
    });

    it('should throw error when error message is only whitespace', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);

      // Act & Assert
      expect(() => request.fail('   ')).toThrow(DomainException);
      expect(() => request.fail('   ')).toThrow(
        'Error message is required when failing a deletion request',
      );
    });

    it('should throw error when failing completed request', () => {
      // Arrange
      const completedRequest = DataDeletionRequest.reconstitute({
        id: 'id-1',
        userId: 'user-123',
        confirmationCode: 'CODE-123',
        source: DeletionRequestSource.USER_APP,
        status: DeletionRequestStatus.COMPLETED,
        requestedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act & Assert
      expect(() => completedRequest.fail('Error')).toThrow(DomainException);
      expect(() => completedRequest.fail('Error')).toThrow(
        'Cannot fail a completed deletion request',
      );
    });

    it('should update updatedAt timestamp when failing', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);
      const originalUpdatedAt = request.updatedAt;

      jest.useFakeTimers();
      jest.advanceTimersByTime(100);

      // Act
      request.fail('Some error');

      // Assert
      expect(request.updatedAt).not.toEqual(originalUpdatedAt);

      jest.useRealTimers();
    });
  });

  describe('status transition - retry()', () => {
    it('should transition from FAILED to PENDING', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);
      request.fail('Initial error');

      // Act
      request.retry();

      // Assert
      expect(request.status).toBe(DeletionRequestStatus.PENDING);
      expect(request.isPending).toBe(true);
      expect(request.isFailed).toBe(false);
    });

    it('should clear error message when retrying', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);
      request.fail('Some error');
      expect(request.errorMessage).toBe('Some error');

      // Act
      request.retry();

      // Assert
      expect(request.errorMessage).toBeUndefined();
    });

    it('should throw error when retrying non-failed request', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);

      // Act & Assert
      expect(() => request.retry()).toThrow(DomainException);
      expect(() => request.retry()).toThrow(
        'Can only retry a failed deletion request',
      );
    });

    it('should throw error when retrying in-progress request', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);
      request.start();

      // Act & Assert
      expect(() => request.retry()).toThrow(DomainException);
    });

    it('should throw error when retrying completed request', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);
      request.complete();

      // Act & Assert
      expect(() => request.retry()).toThrow(DomainException);
    });

    it('should update updatedAt timestamp when retrying', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);
      request.fail('Error');
      const originalUpdatedAt = request.updatedAt;

      jest.useFakeTimers();
      jest.advanceTimersByTime(100);

      // Act
      request.retry();

      // Assert
      expect(request.updatedAt).not.toEqual(originalUpdatedAt);

      jest.useRealTimers();
    });
  });

  describe('metadata management - updateMetadata()', () => {
    it('should add metadata to request without existing metadata', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);
      const metadata = { ip: '192.168.1.1', browser: 'Chrome' };

      // Act
      request.updateMetadata(metadata);

      // Assert
      expect(request.metadata).toEqual(metadata);
    });

    it('should merge metadata with existing metadata', () => {
      // Arrange
      const initialMetadata = { ip: '192.168.1.1' };
      const request = DataDeletionRequest.create({
        ...validProps,
        metadata: initialMetadata,
      });

      // Act
      request.updateMetadata({ browser: 'Chrome' });

      // Assert
      expect(request.metadata).toEqual({
        ip: '192.168.1.1',
        browser: 'Chrome',
      });
    });

    it('should override existing metadata keys', () => {
      // Arrange
      const request = DataDeletionRequest.create({
        ...validProps,
        metadata: { ip: '192.168.1.1', browser: 'Firefox' },
      });

      // Act
      request.updateMetadata({ browser: 'Chrome' });

      // Assert
      expect(request.metadata).toEqual({
        ip: '192.168.1.1',
        browser: 'Chrome',
      });
    });

    it('should update updatedAt timestamp when updating metadata', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);
      const originalUpdatedAt = request.updatedAt;

      jest.useFakeTimers();
      jest.advanceTimersByTime(100);

      // Act
      request.updateMetadata({ key: 'value' });

      // Assert
      expect(request.updatedAt).not.toEqual(originalUpdatedAt);

      jest.useRealTimers();
    });
  });

  describe('computed getters', () => {
    it('should return true for isPending when status is PENDING', () => {
      // Arrange & Act
      const request = DataDeletionRequest.create(validProps);

      // Assert
      expect(request.isPending).toBe(true);
      expect(request.isInProgress).toBe(false);
      expect(request.isCompleted).toBe(false);
      expect(request.isFailed).toBe(false);
    });

    it('should return true for isInProgress when status is IN_PROGRESS', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);
      request.start();

      // Assert
      expect(request.isPending).toBe(false);
      expect(request.isInProgress).toBe(true);
      expect(request.isCompleted).toBe(false);
      expect(request.isFailed).toBe(false);
    });

    it('should return true for isCompleted when status is COMPLETED', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);
      request.complete();

      // Assert
      expect(request.isPending).toBe(false);
      expect(request.isInProgress).toBe(false);
      expect(request.isCompleted).toBe(true);
      expect(request.isFailed).toBe(false);
    });

    it('should return true for isFailed when status is FAILED', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);
      request.fail('Error message');

      // Assert
      expect(request.isPending).toBe(false);
      expect(request.isInProgress).toBe(false);
      expect(request.isCompleted).toBe(false);
      expect(request.isFailed).toBe(true);
    });
  });

  describe('JSON serialization - toJSON()', () => {
    it('should serialize all properties to JSON', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);

      // Act
      const json = request.toJSON();

      // Assert
      expect(json.id).toBeDefined();
      expect(json.userId).toBe('user-123');
      expect(json.confirmationCode).toBe('TEST-CODE-123');
      expect(json.source).toBe(DeletionRequestSource.USER_APP);
      expect(json.status).toBe(DeletionRequestStatus.PENDING);
      expect(json.requestedAt).toBeInstanceOf(Date);
      expect(json.createdAt).toBeInstanceOf(Date);
      expect(json.updatedAt).toBeInstanceOf(Date);
    });

    it('should include completedAt when request is completed', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);
      request.complete();

      // Act
      const json = request.toJSON();

      // Assert
      expect(json.completedAt).toBeDefined();
      expect(json.completedAt).toBeInstanceOf(Date);
    });

    it('should include errorMessage when request is failed', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);
      request.fail('Test error');

      // Act
      const json = request.toJSON();

      // Assert
      expect(json.errorMessage).toBe('Test error');
    });

    it('should include metadata when present', () => {
      // Arrange
      const metadata = { reason: 'GDPR', country: 'BR' };
      const request = DataDeletionRequest.create({ ...validProps, metadata });

      // Act
      const json = request.toJSON();

      // Assert
      expect(json.metadata).toEqual(metadata);
    });

    it('should not include metadata when not present', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);

      // Act
      const json = request.toJSON();

      // Assert
      expect(json.metadata).toBeUndefined();
    });
  });

  describe('complete workflow', () => {
    it('should handle complete lifecycle: pending -> in_progress -> completed', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);

      // Act & Assert - Initial state
      expect(request.isPending).toBe(true);

      // Act & Assert - Start processing
      request.start();
      expect(request.isInProgress).toBe(true);

      // Act & Assert - Complete
      request.complete();
      expect(request.isCompleted).toBe(true);
      expect(request.completedAt).toBeDefined();
    });

    it('should handle failure and retry workflow', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);

      // Act - Start and fail
      request.start();
      request.fail('Temporary error');
      expect(request.isFailed).toBe(true);
      expect(request.errorMessage).toBe('Temporary error');

      // Act - Retry
      request.retry();
      expect(request.isPending).toBe(true);
      expect(request.errorMessage).toBeUndefined();

      // Act - Process again and complete
      request.start();
      request.complete();
      expect(request.isCompleted).toBe(true);
    });

    it('should handle direct completion from pending', () => {
      // Arrange
      const request = DataDeletionRequest.create(validProps);

      // Act
      request.complete();

      // Assert
      expect(request.isCompleted).toBe(true);
      expect(request.completedAt).toBeDefined();
    });
  });
});
