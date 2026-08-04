import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  private readonly logger = new Logger('CorrelationId');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const correlationId = (request.headers['x-request-id'] as string) || randomUUID();

    request['correlationId'] = correlationId;
    response.setHeader('x-request-id', correlationId);

    const now = Date.now();
    const method = request.method;
    const url = request.url;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - now;
        this.logger.log(
          `[${correlationId}] ${method} ${url} - ${duration}ms`,
        );
      }),
    );
  }
}
