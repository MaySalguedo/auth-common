import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { REQUIRE_ATTRIBUTE_KEY } from '@tokens/require-attribute-key.token';
import { RequireAttributeRule } from '@interfaces/require-attribute-rule.interface';
import {
  getFlattenedByPath,
  matchesAttribute,
  formatAttributeValue,
} from '@utils/get-nested-value';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  public constructor(private reflector: Reflector) {
    super();
  }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const can = (await super.canActivate(context)) as boolean;
    if (!can) return false;

    const rules: Array<RequireAttributeRule> = this.reflector.getAllAndOverride<
      Array<RequireAttributeRule>
    >(REQUIRE_ATTRIBUTE_KEY, [context.getHandler(), context.getClass()]);

    if (!rules?.length) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: Record<string, unknown> }>();
    const user = request.user;

    for (const { path, value } of rules) {
      const actual = getFlattenedByPath(user, path);
      if (!matchesAttribute(actual, value)) {
        throw new ForbiddenException(
          `Attribute '${path}' expected ${formatAttributeValue(value)} but got ${formatAttributeValue(actual.length ? actual : undefined)}`,
        );
      }
    }

    return true;
  }
}
