import {
  Injectable,
  Inject,
  Optional,
  ExecutionContext,
  CanActivate,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '@tokens/is-public-key.token';
import { USE_GUARDS_KEY } from '@tokens/use-guards-key.token';
import { GUARD_REGISTRY } from '@tokens/guard-registry.token';
import { DEFAULT_GUARD } from '@tokens/default-guard.token';

@Injectable()
export class OrchestratorGuard implements CanActivate {
  public constructor(
    private reflector: Reflector,
    @Inject(GUARD_REGISTRY) private guardRegistry: Record<string, CanActivate>,
    @Optional() @Inject(DEFAULT_GUARD) private defaultGuardKey: string,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const guardKeys = this.reflector.getAllAndOverride<string[]>(
      USE_GUARDS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const keysToExecute = guardKeys?.length
      ? guardKeys
      : this.defaultGuardKey
        ? [this.defaultGuardKey]
        : [];

    for (const key of keysToExecute) {
      const guard = this.guardRegistry[key];

      if (!guard) {
        throw new NotFoundException(`Guard '${key}' not registered`);
      }

      const canActivate = await guard.canActivate(context);
      if (!canActivate) return false;
    }

    return true;
  }
}
