import { Session } from '../../domain/entities/session.entity';
export declare const GetSession: (...dataOrPipes: (keyof Session | import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>> | undefined)[]) => ParameterDecorator;
export declare const GetUserId: (...dataOrPipes: unknown[]) => ParameterDecorator;
