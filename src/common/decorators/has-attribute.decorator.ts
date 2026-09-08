import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { RequireAttributeRule } from '@interfaces/require-attribute-rule.interface';
import { getFlattenedByPath, matchesAttribute } from '@utils/get-nested-value';
import { extractAuthUser } from './auth-user.decorator';

export function extractHasAttribute(
  payload: unknown,
  path: string,
  value: unknown,
): boolean {
  if (payload === null || payload === undefined) return false;
  return matchesAttribute(getFlattenedByPath(payload, path), value);
}

export function hasAttributeFactory(
  data: RequireAttributeRule,
  ctx: ExecutionContext,
): boolean {
  const user = extractAuthUser<unknown>(ctx);
  return extractHasAttribute(user, data.path, data.value);
}

export function HasAttribute(path: string, value: unknown): ParameterDecorator {
  return createParamDecorator(hasAttributeFactory)({ path, value });
}
