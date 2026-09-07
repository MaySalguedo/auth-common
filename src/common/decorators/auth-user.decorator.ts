import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export function extractAuthUser<T>(ctx: ExecutionContext): T | undefined {
  const request = ctx.switchToHttp().getRequest<{ user?: T } | undefined>();
  return request?.user;
}

export function authUserFactory<T>(
  _data: unknown,
  ctx: ExecutionContext,
): T | undefined {
  return extractAuthUser<T>(ctx);
}

export function AuthUser<T = unknown>(): ParameterDecorator {
  return createParamDecorator(authUserFactory<T>)();
}
