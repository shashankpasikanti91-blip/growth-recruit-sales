import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/**
 * Global HTTP exception filter.
 * - Maps Prisma errors to clean HTTP responses (no raw DB error leakage)
 * - Logs all 5xx errors for visibility
 * - Returns structured { error: { code, message, details } } format
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as any;
        message = resObj.message ?? message;
        details = resObj.errors ?? resObj.details ?? undefined;
        if (Array.isArray(message)) {
          details = message;
          message = 'Validation failed';
        }
      }
      code = this.statusToCode(status);
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const { code: prismaCode, meta } = exception;

      switch (prismaCode) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          code = 'DUPLICATE_ENTRY';
          message = `A record with this ${(meta?.target as string[] | undefined)?.join(', ') ?? 'value'} already exists`;
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          code = 'NOT_FOUND';
          message = 'Record not found';
          break;
        case 'P2003':
          status = HttpStatus.UNPROCESSABLE_ENTITY;
          code = 'FOREIGN_KEY_VIOLATION';
          message = 'Referenced record does not exist';
          break;
        case 'P2014':
          status = HttpStatus.UNPROCESSABLE_ENTITY;
          code = 'REQUIRED_RELATION';
          message = 'Cannot perform this operation due to a required relation';
          break;
        default:
          status = HttpStatus.UNPROCESSABLE_ENTITY;
          code = `DB_ERROR_${prismaCode}`;
          message = 'Database operation failed';
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      code = 'VALIDATION_ERROR';
      message = 'Invalid data provided';
    } else if (exception instanceof Error) {
      // Log unexpected non-HTTP, non-Prisma errors fully
      this.logger.error(`Unhandled error on ${request.method} ${request.url}`, exception.stack);
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status} [${code}]: ${message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };
    return map[status] ?? `HTTP_${status}`;
  }
}
