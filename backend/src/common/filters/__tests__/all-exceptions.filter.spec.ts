import { Test } from '@nestjs/testing';
import { AllExceptionsFilter } from '../all-exceptions.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(async () => {
    filter = new AllExceptionsFilter();

    mockRequest = {
      url: '/api/test',
      method: 'GET',
      headers: {},
      ip: '127.0.0.1',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockArgumentsHost = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as ArgumentsHost;
  });

  it('should handle HttpException', () => {
    const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Test error',
        error: 'Bad Request',
      }),
    );
  });

  it('should handle generic Error', () => {
    const exception = new Error('Unexpected error');

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Unexpected error',
        error: 'Internal Server Error',
      }),
    );
  });

  it('should include stack trace in development', () => {
    process.env.NODE_ENV = 'development';
    const exception = new Error('Test error');

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        stack: expect.any(String),
      }),
    );
  });

  it('should include request ID', () => {
    mockRequest.headers = { 'x-request-id': 'test-request-id' };
    const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'test-request-id',
      }),
    );
  });
});
