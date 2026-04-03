import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsageService, UsageMetric } from './usage.service';

export const USAGE_LIMIT_KEY = 'usage_limit';

/**
 * Decorator to mark an endpoint with a usage limit check.
 * Usage: @UsageLimit('candidate') or @UsageLimit('lead') or @UsageLimit('ai')
 */
export function UsageLimit(metric: UsageMetric) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(USAGE_LIMIT_KEY, metric, descriptor.value);
    return descriptor;
  };
}

@Injectable()
export class UsageGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usageService: UsageService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metric = this.reflector.get<UsageMetric>(USAGE_LIMIT_KEY, context.getHandler());
    if (!metric) return true; // no usage limit for this endpoint

    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;
    if (!tenantId) throw new ForbiddenException('No tenant context');

    await this.usageService.enforce(tenantId, metric);
    return true;
  }
}
