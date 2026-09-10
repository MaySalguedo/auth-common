import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export function extractHeaders(
  ctx: ExecutionContext,
): Record<string, string> | undefined {
  const request = ctx
    .switchToHttp()
    .getRequest<{ headers?: Record<string, string> }>();
  return request?.headers;
}

function normalizeHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
}

export function headersFactory(
  data: string | undefined,
  ctx: ExecutionContext,
): string | Record<string, string> | undefined {
  const headers = extractHeaders(ctx);
  if (!headers) return undefined;

  const normalizedHeaders = normalizeHeaders(headers);

  if (!data) return headers;

  return normalizedHeaders[data.toLowerCase()];
}

export const Headers = createParamDecorator(headersFactory);
