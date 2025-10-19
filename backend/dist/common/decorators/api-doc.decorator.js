"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiDoc = ApiDoc;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
function ApiDoc(options) {
    const decorators = [
        (0, swagger_1.ApiOperation)({
            summary: options.summary,
            description: options.description,
        }),
    ];
    const extraModels = [];
    if (options.responses) {
        options.responses.forEach((response) => {
            const apiResponseOptions = {
                status: response.status,
                description: response.description,
            };
            if (response.type) {
                extraModels.push(response.type);
                if (response.isArray) {
                    apiResponseOptions.schema = {
                        type: 'array',
                        items: { $ref: (0, swagger_1.getSchemaPath)(response.type) },
                    };
                }
                else {
                    apiResponseOptions.type = response.type;
                }
            }
            decorators.push((0, swagger_1.ApiResponse)(apiResponseOptions));
        });
    }
    if (options.body) {
        extraModels.push(options.body);
        decorators.push((0, swagger_1.ApiBody)({ type: options.body }));
    }
    if (options.queryParams) {
        options.queryParams.forEach((param) => {
            decorators.push((0, swagger_1.ApiQuery)({
                name: param.name,
                required: param.required ?? false,
                description: param.description,
                type: param.type,
                isArray: param.isArray,
            }));
        });
    }
    if (options.pathParams) {
        options.pathParams.forEach((param) => {
            decorators.push((0, swagger_1.ApiParam)({
                name: param.name,
                description: param.description,
                type: param.type,
            }));
        });
    }
    if (extraModels.length > 0) {
        decorators.push((0, swagger_1.ApiExtraModels)(...extraModels));
    }
    return (0, common_1.applyDecorators)(...decorators);
}
//# sourceMappingURL=api-doc.decorator.js.map