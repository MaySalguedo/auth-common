import { IS_PUBLIC_KEY } from '@tokens/is-public-key.token';
import { USE_GUARDS_KEY } from '@tokens/use-guards-key.token';
import { REQUIRE_ATTRIBUTE_KEY } from '@tokens/require-attribute-key.token';
import { PublicGuard } from './public-guard.decorator';
import { UseGuards } from './use-guard.decorator';
import { RequireAttribute } from './require-attribute.decorator';

function applyToClass(decorator: ClassDecorator): unknown {
  const target = class TestController {};
  decorator(target);
  return Reflect.getMetadata(USE_GUARDS_KEY, target);
}

function applyAndReadMetadata(
  decorator: ClassDecorator | MethodDecorator,
): unknown {
  const target = class TestController {};
  (decorator as ClassDecorator)(target);
  return Reflect.getMetadata(IS_PUBLIC_KEY, target);
}

describe('PublicGuard decorator', () => {
  it('should return a function (decorator factory)', () => {
    expect(typeof PublicGuard()).toBe('function');
  });

  it(`should set metadata key "${IS_PUBLIC_KEY}" to true on the target`, () => {
    const metadata = applyAndReadMetadata(PublicGuard());
    expect(metadata).toBe(true);
  });

  it('should produce independent decorators on each invocation', () => {
    const dec1 = PublicGuard();
    const dec2 = PublicGuard();
    expect(dec1).not.toBe(dec2);
  });

  it('should work when applied to a method', () => {
    class TestController {
      handler() {}
    }
    (PublicGuard() as MethodDecorator)(
      TestController.prototype,
      'handler',
      Object.getOwnPropertyDescriptor(TestController.prototype, 'handler')!,
    );
    const metadata = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      TestController.prototype.handler,
    );
    expect(metadata).toBe(true);
  });
});

describe('UseGuards decorator', () => {
  it('should return a function (decorator factory)', () => {
    expect(typeof UseGuards('jwt')).toBe('function');
  });

  it(`should set metadata key "${USE_GUARDS_KEY}" with the provided guard keys`, () => {
    const metadata = applyToClass(UseGuards('jwt'));
    expect(metadata).toEqual(['jwt']);
  });

  it('should accept multiple guard keys', () => {
    const metadata = applyToClass(UseGuards('jwt', 'apiKey', 'custom'));
    expect(metadata).toEqual(['jwt', 'apiKey', 'custom']);
  });

  it('should set an empty array when called with no arguments', () => {
    const metadata = applyToClass(UseGuards());
    expect(metadata).toEqual([]);
  });

  it('should preserve the order of guard keys', () => {
    const keys = ['a', 'b', 'c', 'd'];
    const metadata = applyToClass(UseGuards(...keys));
    expect(metadata).toEqual(keys);
  });

  it('should work when applied to a method', () => {
    class TestController {
      handler() {}
    }
    (UseGuards('jwt') as MethodDecorator)(
      TestController.prototype,
      'handler',
      Object.getOwnPropertyDescriptor(TestController.prototype, 'handler')!,
    );
    const metadata = Reflect.getMetadata(
      USE_GUARDS_KEY,
      TestController.prototype.handler,
    );
    expect(metadata).toEqual(['jwt']);
  });
});

describe('RequireAttribute decorator', () => {
  it('should return a function (decorator factory)', () => {
    expect(typeof RequireAttribute('roles', 'admin')).toBe('function');
  });

  it(`should set metadata key "${REQUIRE_ATTRIBUTE_KEY}" with a single rule on a class`, () => {
    const target = class TestController {};
    RequireAttribute('roles', 'admin')(target);
    const metadata = Reflect.getMetadata(REQUIRE_ATTRIBUTE_KEY, target);
    expect(metadata).toEqual([{ path: 'roles', value: 'admin' }]);
  });

  it('should stack multiple rules on the same class (AND semantics)', () => {
    const target = class TestController {};
    RequireAttribute('roles', 'admin')(target);
    RequireAttribute('tenant', 'acme')(target);
    const metadata = Reflect.getMetadata(REQUIRE_ATTRIBUTE_KEY, target);
    expect(metadata).toEqual([
      { path: 'roles', value: 'admin' },
      { path: 'tenant', value: 'acme' },
    ]);
  });

  it('should set metadata on a method', () => {
    class TestController {
      handler() {}
    }
    (RequireAttribute('organization.plan', 'pro') as MethodDecorator)(
      TestController.prototype,
      'handler',
      Object.getOwnPropertyDescriptor(TestController.prototype, 'handler')!,
    );
    const metadata = Reflect.getMetadata(
      REQUIRE_ATTRIBUTE_KEY,
      TestController.prototype.handler,
    );
    expect(metadata).toEqual([{ path: 'organization.plan', value: 'pro' }]);
  });

  it('should stack multiple rules on the same method', () => {
    class TestController {
      handler() {}
    }
    const descriptor = Object.getOwnPropertyDescriptor(
      TestController.prototype,
      'handler',
    )!;
    (RequireAttribute('roles', 'admin') as MethodDecorator)(
      TestController.prototype,
      'handler',
      descriptor,
    );
    (RequireAttribute('permissions', ['read', 'write']) as MethodDecorator)(
      TestController.prototype,
      'handler',
      descriptor,
    );
    const metadata = Reflect.getMetadata(
      REQUIRE_ATTRIBUTE_KEY,
      TestController.prototype.handler,
    );
    expect(metadata).toEqual([
      { path: 'roles', value: 'admin' },
      { path: 'permissions', value: ['read', 'write'] },
    ]);
  });

  it('should handle nested dot-path strings', () => {
    const target = class TestController {};
    RequireAttribute('a.b.c', 42)(target);
    const metadata = Reflect.getMetadata(REQUIRE_ATTRIBUTE_KEY, target);
    expect(metadata).toEqual([{ path: 'a.b.c', value: 42 }]);
  });

  it('should handle array values for expected value', () => {
    const target = class TestController {};
    RequireAttribute('permissions', ['read', 'write'])(target);
    const metadata = Reflect.getMetadata(REQUIRE_ATTRIBUTE_KEY, target);
    expect(metadata).toEqual([
      { path: 'permissions', value: ['read', 'write'] },
    ]);
  });

  it('should handle falsy and null values', () => {
    const target = class TestController {};
    RequireAttribute('flag', null)(target);
    RequireAttribute('count', 0)(target);
    const metadata = Reflect.getMetadata(REQUIRE_ATTRIBUTE_KEY, target);
    expect(metadata).toEqual([
      { path: 'flag', value: null },
      { path: 'count', value: 0 },
    ]);
  });

  it('should produce independent decorators on each invocation', () => {
    const dec1 = RequireAttribute('a', 1);
    const dec2 = RequireAttribute('a', 1);
    expect(dec1).not.toBe(dec2);
  });

  it('should keep class and method metadata independent', () => {
    const target = class TestController {
      handler() {}
    };
    RequireAttribute('classAttr', 'x')(target);
    const descriptor = Object.getOwnPropertyDescriptor(
      target.prototype,
      'handler',
    )!;
    (RequireAttribute('methodAttr', 'y') as MethodDecorator)(
      target.prototype,
      'handler',
      descriptor,
    );
    expect(Reflect.getMetadata(REQUIRE_ATTRIBUTE_KEY, target)).toEqual([
      { path: 'classAttr', value: 'x' },
    ]);
    expect(
      Reflect.getMetadata(REQUIRE_ATTRIBUTE_KEY, target.prototype.handler),
    ).toEqual([{ path: 'methodAttr', value: 'y' }]);
  });
});
