import { ExecutionContext, PipeTransform } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '@tokens/is-public-key.token';
import { USE_GUARDS_KEY } from '@tokens/use-guards-key.token';
import { REQUIRE_ATTRIBUTE_KEY } from '@tokens/require-attribute-key.token';
import { TokenIssues } from '@interfaces/token-issues.interface';
import { PublicGuard } from './public-guard.decorator';
import { UseGuards } from './use-guard.decorator';
import { RequireAttribute } from './require-attribute.decorator';
import {
  AuthUser,
  authUserFactory,
  extractAuthUser,
} from './auth-user.decorator';
import {
  HasAttribute,
  extractHasAttribute,
  hasAttributeFactory,
} from './has-attribute.decorator';
import { Headers, extractHeaders, headersFactory } from './headers.decorator';
import { Session, extractSession, sessionFactory } from './session.decorator';

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

describe('extractAuthUser', () => {
  function mockContext(user?: unknown): ExecutionContext {
    const request: { user?: unknown } = user === undefined ? {} : { user };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('should return the object payload with TokenIssues as-is', () => {
    const user = { sub: '123', role: 'admin', iat: 1, exp: 2 };
    expect(extractAuthUser<typeof user & TokenIssues>(mockContext(user))).toBe(
      user,
    );
  });

  it('should return a raw JWT string as-is', () => {
    const token = 'eyJhbGciOiJIUzI1NiJ9.payload.signature';
    expect(extractAuthUser<string>(mockContext(token))).toBe(token);
  });

  it('should return undefined when no user is present and not throw', () => {
    expect(() =>
      extractAuthUser<Record<string, unknown> & TokenIssues>(mockContext()),
    ).not.toThrow();
    expect(
      extractAuthUser<Record<string, unknown> & TokenIssues>(mockContext()),
    ).toBeUndefined();
  });

  it('should not mutate the request object', () => {
    const user = { sub: '123', role: 'admin', iat: 1, exp: 2 };
    const ctx = mockContext(user);
    extractAuthUser<typeof user & TokenIssues>(ctx);
    expect(ctx.switchToHttp().getRequest()).toEqual({ user });
  });

  it('should return undefined when the request itself is missing', () => {
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => undefined,
      }),
    } as unknown as ExecutionContext;
    expect(
      extractAuthUser<Record<string, unknown> & TokenIssues>(ctx),
    ).toBeUndefined();
  });
});

describe('AuthUser decorator', () => {
  function mockContext(user?: unknown): ExecutionContext {
    const request: { user?: unknown } = user === undefined ? {} : { user };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('should return a function (decorator factory)', () => {
    expect(typeof AuthUser<Record<string, unknown> & TokenIssues>()).toBe(
      'function',
    );
  });

  it('should support the string generic', () => {
    expect(typeof AuthUser<string>()).toBe('function');
  });

  it('should support the default generic', () => {
    expect(typeof AuthUser()).toBe('function');
  });

  it('should produce independent decorators on each invocation', () => {
    expect(AuthUser<Record<string, unknown>>()).not.toBe(
      AuthUser<Record<string, unknown>>(),
    );
  });

  it('should resolve the object payload through the factory', () => {
    const user = { sub: '123', role: 'admin', iat: 1, exp: 2 };
    expect(
      authUserFactory<typeof user & TokenIssues>(undefined, mockContext(user)),
    ).toBe(user);
  });

  it('should resolve a string payload through the factory', () => {
    const token = 'eyJhbGciOiJIUzI1NiJ9.payload.signature';
    expect(authUserFactory<string>(undefined, mockContext(token))).toBe(token);
  });

  it('should resolve undefined through the factory when no user is present', () => {
    expect(
      authUserFactory<Record<string, unknown> & TokenIssues>(
        undefined,
        mockContext(),
      ),
    ).toBeUndefined();
  });
});

describe('extractHasAttribute', () => {
  it('should return true for matching scalar top-level attribute (AC1)', () => {
    expect(
      extractHasAttribute({ role: 'admin', iat: 1, exp: 2 }, 'role', 'admin'),
    ).toBe(true);
  });

  it('should return false for non-matching scalar and never throw (AC2)', () => {
    expect(() =>
      extractHasAttribute({ role: 'user' }, 'role', 'admin'),
    ).not.toThrow();
    expect(extractHasAttribute({ role: 'user' }, 'role', 'admin')).toBe(false);
  });

  it('should resolve nested dot-path and handle missing intermediates (AC3)', () => {
    expect(
      extractHasAttribute(
        { organization: { plan: 'pro' } },
        'organization.plan',
        'pro',
      ),
    ).toBe(true);
    expect(extractHasAttribute({}, 'organization.plan', 'pro')).toBe(false);
    expect(
      extractHasAttribute({ organization: null }, 'organization.plan', 'pro'),
    ).toBe(false);
  });

  it('should use includes semantics for array payload + scalar expected (AC4)', () => {
    expect(
      extractHasAttribute({ roles: ['admin', 'editor'] }, 'roles', 'admin'),
    ).toBe(true);
    expect(extractHasAttribute({ roles: ['editor'] }, 'roles', 'admin')).toBe(
      false,
    );
  });

  it('should use EVERY semantics for array expected (AC5)', () => {
    expect(
      extractHasAttribute(
        { permissions: ['read', 'write', 'delete'] },
        'permissions',
        ['read', 'write'],
      ),
    ).toBe(true);
    expect(
      extractHasAttribute({ permissions: ['read'] }, 'permissions', [
        'read',
        'write',
      ]),
    ).toBe(false);
    expect(extractHasAttribute({ permissions: ['a'] }, 'permissions', [])).toBe(
      false,
    );
  });

  it('should flatten nested arrays (AC6)', () => {
    const user = { orgs: [{ role: 'viewer' }, { role: 'admin' }] };
    expect(extractHasAttribute(user, 'orgs.role', 'admin')).toBe(true);
    expect(
      extractHasAttribute({ orgs: [{ role: 'viewer' }] }, 'orgs.role', 'admin'),
    ).toBe(false);
  });

  it('should return false for null/undefined payload without throwing', () => {
    expect(extractHasAttribute(null, 'role', 'admin')).toBe(false);
    expect(extractHasAttribute(undefined, 'role', 'admin')).toBe(false);
  });
});

describe('hasAttributeFactory', () => {
  function mockHasAttributeContext(user?: unknown): ExecutionContext {
    const request: { user?: unknown } = user === undefined ? {} : { user };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('should return true when req.user matches', () => {
    const ctx = mockHasAttributeContext({ role: 'admin' });
    expect(hasAttributeFactory({ path: 'role', value: 'admin' }, ctx)).toBe(
      true,
    );
  });

  it('should return false when req.user does not match', () => {
    const ctx = mockHasAttributeContext({ role: 'user' });
    expect(hasAttributeFactory({ path: 'role', value: 'admin' }, ctx)).toBe(
      false,
    );
  });

  it('should return false on public routes with no user and not throw (AC7)', () => {
    const ctx = mockHasAttributeContext();
    expect(() =>
      hasAttributeFactory({ path: 'roles', value: 'admin' }, ctx),
    ).not.toThrow();
    expect(hasAttributeFactory({ path: 'roles', value: 'admin' }, ctx)).toBe(
      false,
    );
  });

  it('should return false when the request itself is missing', () => {
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => undefined,
      }),
    } as unknown as ExecutionContext;
    expect(hasAttributeFactory({ path: 'role', value: 'admin' }, ctx)).toBe(
      false,
    );
  });
});

describe('HasAttribute decorator', () => {
  it('should return a function (decorator factory)', () => {
    expect(typeof HasAttribute('roles', 'admin')).toBe('function');
  });

  it('should produce independent decorators on each invocation', () => {
    expect(HasAttribute('roles', 'admin')).not.toBe(
      HasAttribute('roles', 'admin'),
    );
  });
});

describe('Headers decorator', () => {
  function mockContext(headers?: Record<string, string>): ExecutionContext {
    const request: { headers?: Record<string, string> } =
      headers === undefined ? {} : { headers };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('should return a function (decorator factory)', () => {
    expect(typeof Headers()).toBe('function');
    expect(typeof Headers('x-request-id')).toBe('function');
  });

  it('should produce independent decorators on each invocation', () => {
    expect(Headers()).not.toBe(Headers());
    expect(Headers('x-request-id')).not.toBe(Headers('x-request-id'));
  });

  describe('extractHeaders', () => {
    it('should return headers object when present', () => {
      const headers = { 'x-request-id': 'abc123', 'x-tenant-id': 'tenant1' };
      const ctx = mockContext(headers);
      expect(extractHeaders(ctx)).toEqual(headers);
    });

    it('should return undefined when request is missing', () => {
      const ctx = {
        switchToHttp: () => ({
          getRequest: () => undefined,
        }),
      } as unknown as ExecutionContext;
      expect(extractHeaders(ctx)).toBeUndefined();
    });

    it('should return undefined when headers property is missing', () => {
      const ctx = mockContext();
      expect(extractHeaders(ctx)).toBeUndefined();
    });
  });

  describe('headersFactory', () => {
    it('should extract specific header value when present (AC1)', () => {
      const ctx = mockContext({ 'x-request-id': 'abc123' });
      expect(headersFactory('x-request-id', ctx)).toBe('abc123');
    });

    it('should return undefined when header is missing (AC2)', () => {
      const ctx = mockContext({ 'other-header': 'value' });
      expect(headersFactory('x-request-id', ctx)).toBeUndefined();
    });

    it('should return all headers when no data provided', () => {
      const headers = { 'x-request-id': 'abc123', 'x-tenant-id': 'tenant1' };
      const ctx = mockContext(headers);
      expect(headersFactory(undefined, ctx)).toEqual(headers);
    });

    it('should return empty object when no headers present', () => {
      const ctx = mockContext({});
      expect(headersFactory(undefined, ctx)).toEqual({});
    });

    it('should return undefined when request is missing', () => {
      const ctx = {
        switchToHttp: () => ({
          getRequest: () => undefined,
        }),
      } as unknown as ExecutionContext;
      expect(headersFactory('x-request-id', ctx)).toBeUndefined();
    });

    it('should match headers case-insensitively (Express behavior)', () => {
      const ctx = mockContext({ 'X-Request-ID': 'abc123' });
      expect(headersFactory('x-request-id', ctx)).toBe('abc123');
    });

    it('should handle headers with hyphens', () => {
      const ctx = mockContext({ 'x-tenant-id': 'tenant123' });
      expect(headersFactory('x-tenant-id', ctx)).toBe('tenant123');
    });

    it('should handle headers with underscores', () => {
      const ctx = mockContext({ x_custom_header: 'value' });
      expect(headersFactory('x_custom_header', ctx)).toBe('value');
    });
  });

  describe('pipe integration', () => {
    it('should accept pipes as additional arguments', () => {
      const factory = Headers('x-tenant-id', 'ParseUUIDPipe');
      expect(typeof factory).toBe('function');
    });

    it('should accept multiple pipes', () => {
      const factory = Headers('x-debug', 'ParseBoolPipe', 'ParseIntPipe');
      expect(typeof factory).toBe('function');
    });

    it('should work with pipe instances', () => {
      class TestPipe implements PipeTransform<string, string> {
        transform(value: string) {
          return value.toUpperCase();
        }
      }
      const factory = Headers('x-custom', new TestPipe());
      expect(typeof factory).toBe('function');
    });
  });
});

describe('Session decorator', () => {
  function mockContext(session?: Record<string, unknown>): ExecutionContext {
    const request: { session?: Record<string, unknown> } =
      session === undefined ? {} : { session };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('should return a function (decorator factory)', () => {
    expect(typeof Session()).toBe('function');
    expect(typeof Session('userId')).toBe('function');
  });

  it('should produce independent decorators on each invocation', () => {
    expect(Session()).not.toBe(Session());
    expect(Session('userId')).not.toBe(Session('userId'));
  });

  describe('extractSession', () => {
    it('should return session object when present', () => {
      const session = { userId: '123', role: 'admin' };
      const ctx = mockContext(session);
      expect(extractSession(ctx)).toEqual(session);
    });

    it('should return undefined when request is missing', () => {
      const ctx = {
        switchToHttp: () => ({
          getRequest: () => undefined,
        }),
      } as unknown as ExecutionContext;
      expect(extractSession(ctx)).toBeUndefined();
    });

    it('should return undefined when session property is missing', () => {
      const ctx = mockContext();
      expect(extractSession(ctx)).toBeUndefined();
    });
  });

  describe('sessionFactory', () => {
    it('should extract specific session value when present (AC3)', () => {
      const ctx = mockContext({ userId: '123', role: 'admin' });
      expect(sessionFactory('userId', ctx)).toBe('123');
    });

    it('should return undefined when session key is missing', () => {
      const ctx = mockContext({ role: 'admin' });
      expect(sessionFactory('userId', ctx)).toBeUndefined();
    });

    it('should return whole session when no data provided (AC4)', () => {
      const session = { userId: '123', role: 'admin' };
      const ctx = mockContext(session);
      expect(sessionFactory(undefined, ctx)).toEqual(session);
    });

    it('should return undefined when session is missing (AC5)', () => {
      const ctx = mockContext();
      expect(sessionFactory('userId', ctx)).toBeUndefined();
    });

    it('should return undefined when request is missing', () => {
      const ctx = {
        switchToHttp: () => ({
          getRequest: () => undefined,
        }),
      } as unknown as ExecutionContext;
      expect(sessionFactory('userId', ctx)).toBeUndefined();
    });

    it('should handle nested object values', () => {
      const ctx = mockContext({ user: { id: '123', name: 'John' } });
      expect(sessionFactory('user', ctx)).toEqual({ id: '123', name: 'John' });
    });

    it('should handle array values', () => {
      const ctx = mockContext({ permissions: ['read', 'write'] });
      expect(sessionFactory('permissions', ctx)).toEqual(['read', 'write']);
    });
  });

  describe('pipe integration', () => {
    it('should accept pipes as additional arguments', () => {
      const factory = Session('userId', 'ParseIntPipe');
      expect(typeof factory).toBe('function');
    });

    it('should accept multiple pipes', () => {
      const factory = Session('userId', 'ParseIntPipe', 'CustomPipe');
      expect(typeof factory).toBe('function');
    });

    it('should work with pipe instances', () => {
      class TestPipe implements PipeTransform<string, string> {
        transform(value: string) {
          return value.toUpperCase();
        }
      }
      const factory = Session('role', new TestPipe());
      expect(typeof factory).toBe('function');
    });
  });
});
