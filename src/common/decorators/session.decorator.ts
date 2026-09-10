import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export function extractSession(
  ctx: ExecutionContext,
): Record<string, unknown> | undefined {
  const request = ctx
    .switchToHttp()
    .getRequest<{ session?: Record<string, unknown> }>();
  return request?.session;
}

export function sessionFactory(
  data: string | undefined,
  ctx: ExecutionContext,
): Record<string, unknown> | undefined {
  const session = extractSession(ctx);
  if (!session) return undefined;

  return data
    ? ((session[data] as Record<string, unknown> | undefined) ?? undefined)
    : session;
}

export const Session = createParamDecorator(sessionFactory);
