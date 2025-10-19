/**
 * Custom API Documentation Decorator
 *
 * Provides a simplified interface for documenting API endpoints with Swagger
 */

import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiResponse,
  ApiOperation,
  ApiBody,
  ApiQuery,
  ApiParam,
  getSchemaPath,
  ApiExtraModels,
} from '@nestjs/swagger';

export interface ApiDocOptions {
  summary: string;
  description?: string;
  responses?: {
    status: number;
    description: string;
    type?: Type<any>;
    isArray?: boolean;
  }[];
  body?: Type<any>;
  queryParams?: {
    name: string;
    required?: boolean;
    description?: string;
    type?: Type<any>;
    isArray?: boolean;
  }[];
  pathParams?: { name: string; description?: string; type?: Type<any> }[];
}

/**
 * Simplified API documentation decorator
 *
 * @example
 * @ApiDoc({
 *   summary: 'Create a new product',
 *   description: 'Adds a new product to the catalog',
 *   body: CreateProductDto,
 *   responses: [
 *     { status: 201, description: 'Product created', type: ProductResponseDto },
 *     { status: 400, description: 'Invalid input data' },
 *   ],
 * })
 */
export function ApiDoc(options: ApiDocOptions) {
  const decorators = [
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
  ];

  // Collect all types to register with Swagger
  const extraModels: Type<any>[] = [];

  // Add response decorators
  if (options.responses) {
    options.responses.forEach((response) => {
      const apiResponseOptions: any = {
        status: response.status,
        description: response.description,
      };

      if (response.type) {
        extraModels.push(response.type);
        if (response.isArray) {
          apiResponseOptions.schema = {
            type: 'array',
            items: { $ref: getSchemaPath(response.type) },
          };
        } else {
          apiResponseOptions.type = response.type;
        }
      }

      decorators.push(ApiResponse(apiResponseOptions));
    });
  }

  // Add body decorator
  if (options.body) {
    extraModels.push(options.body);
    decorators.push(ApiBody({ type: options.body }));
  }

  // Add query param decorators
  if (options.queryParams) {
    options.queryParams.forEach((param) => {
      decorators.push(
        ApiQuery({
          name: param.name,
          required: param.required ?? false,
          description: param.description,
          type: param.type,
          isArray: param.isArray,
        }),
      );
    });
  }

  // Add path param decorators
  if (options.pathParams) {
    options.pathParams.forEach((param) => {
      decorators.push(
        ApiParam({
          name: param.name,
          description: param.description,
          type: param.type,
        }),
      );
    });
  }

  // Register extra models
  if (extraModels.length > 0) {
    decorators.push(ApiExtraModels(...extraModels));
  }

  return applyDecorators(...decorators);
}
