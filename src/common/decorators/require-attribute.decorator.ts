import 'reflect-metadata';
import { SetMetadata } from '@nestjs/common';
import { RequireAttributeRule } from '@interfaces/require-attribute-rule.interface';
import { REQUIRE_ATTRIBUTE_KEY } from '@tokens/require-attribute-key.token';

export const RequireAttribute = (
  path: string,
  value: unknown,
): MethodDecorator & ClassDecorator => {
  return (
    target: object,
    key?: string | symbol,
    descriptor?: TypedPropertyDescriptor<unknown>,
  ) => {
    if (descriptor) {
      const existing: RequireAttributeRule[] =
        (Reflect.getMetadata(
          REQUIRE_ATTRIBUTE_KEY,
          descriptor.value as object,
        ) as RequireAttributeRule[] | undefined) ?? [];
      SetMetadata(REQUIRE_ATTRIBUTE_KEY, [...existing, { path, value }])(
        target,
        key as string | symbol,
        descriptor,
      );
    } else {
      const existing: RequireAttributeRule[] =
        (Reflect.getMetadata(REQUIRE_ATTRIBUTE_KEY, target) as
          | RequireAttributeRule[]
          | undefined) ?? [];
      (
        SetMetadata(REQUIRE_ATTRIBUTE_KEY, [
          ...existing,
          { path, value },
        ]) as unknown as ClassDecorator
      )(target as unknown as abstract new (...args: unknown[]) => unknown);
    }
  };
};
