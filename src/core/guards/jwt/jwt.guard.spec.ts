import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtGuard } from './jwt.guard';

const parentProto = () => Object.getPrototypeOf(JwtGuard.prototype);

const makeMockContext = (
  overrides: Partial<{
    user: Record<string, unknown>;
    handler: unknown;
    klass: unknown;
  }> = {},
): ExecutionContext =>
  ({
    getHandler: jest.fn().mockReturnValue(overrides.handler ?? (() => {})),
    getClass: jest.fn().mockReturnValue(overrides.klass ?? class {}),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({ user: overrides.user }),
    }),
  }) as unknown as ExecutionContext;

const makeReflector = (metadata?: unknown): Partial<Reflector> => ({
  getAllAndOverride: jest.fn().mockReturnValue(metadata),
});

async function buildGuard(
  reflectorValue: unknown,
  user?: Record<string, unknown>,
): Promise<{
  guard: JwtGuard;
  ctx: ExecutionContext;
  reflector: Partial<Reflector>;
}> {
  const reflector = makeReflector(reflectorValue);
  const module: TestingModule = await Test.createTestingModule({
    providers: [JwtGuard, { provide: Reflector, useValue: reflector }],
  }).compile();
  const guard = module.get<JwtGuard>(JwtGuard);
  const ctx = makeMockContext({ user });
  return { guard, ctx, reflector };
}

describe('JwtGuard', () => {
  let guard: JwtGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtGuard,
        { provide: Reflector, useValue: makeReflector(undefined) },
      ],
    }).compile();
    guard = module.get<JwtGuard>(JwtGuard);
  });

  // ── Instanciación ──────────────────────────────────────────────────

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should delegate canActivate to AuthGuard (super) and return true', async () => {
    const spy = jest.spyOn(parentProto(), 'canActivate').mockReturnValue(true);

    const result = await guard.canActivate(makeMockContext());

    expect(spy).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
    spy.mockRestore();
  });

  it('should propagate false returned by the parent guard', async () => {
    const spy = jest.spyOn(parentProto(), 'canActivate').mockReturnValue(false);

    const result = await guard.canActivate(makeMockContext());

    expect(result).toBe(false);
    spy.mockRestore();
  });

  it('should propagate a Promise returned by the parent guard', async () => {
    const spy = jest
      .spyOn(parentProto(), 'canActivate')
      .mockReturnValue(Promise.resolve(true));

    const result = await guard.canActivate(makeMockContext());

    expect(result).toBe(true);
    spy.mockRestore();
  });

  it('should forward the ExecutionContext to the parent guard', async () => {
    const ctx = makeMockContext();
    const spy = jest.spyOn(parentProto(), 'canActivate').mockReturnValue(true);

    await guard.canActivate(ctx);

    expect(spy).toHaveBeenCalledWith(ctx);
    spy.mockRestore();
  });

  it('should propagate exceptions thrown by the parent guard', async () => {
    const spy = jest
      .spyOn(parentProto(), 'canActivate')
      .mockRejectedValue(new Error('Unauthorized'));

    await expect(guard.canActivate(makeMockContext())).rejects.toThrow(
      'Unauthorized',
    );
    spy.mockRestore();
  });

  describe('RequireAttribute validation', () => {
    it('should return true when no rules are set (undefined)', async () => {
      const { guard, ctx } = await buildGuard(undefined, { role: 'admin' });
      const spy = jest
        .spyOn(parentProto(), 'canActivate')
        .mockReturnValue(true);
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      spy.mockRestore();
    });

    it('should return true when rules is empty array', async () => {
      const { guard, ctx } = await buildGuard([], { role: 'admin' });
      const spy = jest
        .spyOn(parentProto(), 'canActivate')
        .mockReturnValue(true);
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      spy.mockRestore();
    });

    it('should pass scalar top-level attribute', async () => {
      const { guard, ctx } = await buildGuard(
        [{ path: 'role', value: 'admin' }],
        {
          role: 'admin',
        },
      );
      const spy = jest
        .spyOn(parentProto(), 'canActivate')
        .mockReturnValue(true);
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      spy.mockRestore();
    });

    it('should throw Forbidden when scalar top-level attribute mismatches (actual non-empty)', async () => {
      const { guard, ctx } = await buildGuard(
        [{ path: 'role', value: 'admin' }],
        {
          role: 'user',
        },
      );
      const spy = jest
        .spyOn(parentProto(), 'canActivate')
        .mockReturnValue(true);
      await expect(guard.canActivate(ctx)).rejects.toThrow(
        /Attribute 'role' expected/,
      );
      spy.mockRestore();
    });

    it('should throw Forbidden when scalar attribute missing (actual empty => undefined)', async () => {
      const { guard, ctx } = await buildGuard(
        [{ path: 'role', value: 'admin' }],
        {},
      );
      const spy = jest
        .spyOn(parentProto(), 'canActivate')
        .mockReturnValue(true);
      await expect(guard.canActivate(ctx)).rejects.toThrow(
        /Attribute 'role' expected/,
      );
      // ensure formatting uses undefined for empty actual
      try {
        await guard.canActivate(ctx);
      } catch (e: unknown) {
        expect((e as Error).message).toContain('but got undefined');
      }
      spy.mockRestore();
    });

    it('should pass nested dot-path attribute', async () => {
      const { guard, ctx } = await buildGuard(
        [{ path: 'organization.plan', value: 'pro' }],
        { organization: { plan: 'pro' } },
      );
      const spy = jest
        .spyOn(parentProto(), 'canActivate')
        .mockReturnValue(true);
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      spy.mockRestore();
    });

    it('should throw for nested path with missing intermediate (graceful)', async () => {
      const { guard, ctx } = await buildGuard(
        [{ path: 'organization.plan', value: 'pro' }],
        {},
      );
      const spy = jest
        .spyOn(parentProto(), 'canActivate')
        .mockReturnValue(true);
      await expect(guard.canActivate(ctx)).rejects.toThrow(
        /organization\.plan/,
      );
      spy.mockRestore();
    });

    it('should handle array leaf flattening scalar expected (includes)', async () => {
      const { guard, ctx } = await buildGuard(
        [{ path: 'roles', value: 'admin' }],
        {
          roles: ['admin', 'editor'],
        },
      );
      const spy = jest
        .spyOn(parentProto(), 'canActivate')
        .mockReturnValue(true);
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      spy.mockRestore();
    });

    it('should throw when array leaf does not include scalar', async () => {
      const { guard, ctx } = await buildGuard(
        [{ path: 'roles', value: 'admin' }],
        {
          roles: ['viewer'],
        },
      );
      const spy = jest
        .spyOn(parentProto(), 'canActivate')
        .mockReturnValue(true);
      await expect(guard.canActivate(ctx)).rejects.toThrow(/Attribute 'roles'/);
      spy.mockRestore();
    });

    it('should handle array expected EVERY semantics pass', async () => {
      const { guard, ctx } = await buildGuard(
        [{ path: 'permissions', value: ['read', 'write'] }],
        { permissions: ['read', 'write', 'delete'] },
      );
      const spy = jest
        .spyOn(parentProto(), 'canActivate')
        .mockReturnValue(true);
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      spy.mockRestore();
    });

    it('should throw when array expected not every present', async () => {
      const { guard, ctx } = await buildGuard(
        [{ path: 'permissions', value: ['read', 'write'] }],
        { permissions: ['read'] },
      );
      const spy = jest
        .spyOn(parentProto(), 'canActivate')
        .mockReturnValue(true);
      await expect(guard.canActivate(ctx)).rejects.toThrow(
        /Attribute 'permissions'/,
      );
      spy.mockRestore();
    });

    it('should handle nested array traversal orgs.role ANY', async () => {
      const { guard, ctx } = await buildGuard(
        [{ path: 'orgs.role', value: 'admin' }],
        {
          orgs: [{ role: 'viewer' }, { role: 'admin' }],
        },
      );
      const spy = jest
        .spyOn(parentProto(), 'canActivate')
        .mockReturnValue(true);
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      spy.mockRestore();
    });

    it('should throw when nested array traversal fails', async () => {
      const { guard, ctx } = await buildGuard(
        [{ path: 'orgs.role', value: 'admin' }],
        {
          orgs: [{ role: 'viewer' }],
        },
      );
      const spy = jest
        .spyOn(parentProto(), 'canActivate')
        .mockReturnValue(true);
      await expect(guard.canActivate(ctx)).rejects.toThrow(/orgs\.role/);
      spy.mockRestore();
    });

    it('should pass when multiple rules satisfy AND', async () => {
      const { guard, ctx } = await buildGuard(
        [
          { path: 'role', value: 'admin' },
          { path: 'tenant', value: 'acme' },
        ],
        { role: 'admin', tenant: 'acme' },
      );
      const spy = jest
        .spyOn(parentProto(), 'canActivate')
        .mockReturnValue(true);
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      spy.mockRestore();
    });

    it('should throw when one of multiple rules fails', async () => {
      const { guard, ctx } = await buildGuard(
        [
          { path: 'role', value: 'admin' },
          { path: 'tenant', value: 'acme' },
        ],
        { role: 'admin', tenant: 'other' },
      );
      const spy = jest
        .spyOn(parentProto(), 'canActivate')
        .mockReturnValue(true);
      await expect(guard.canActivate(ctx)).rejects.toThrow(/tenant/);
      spy.mockRestore();
    });

    it('should handle undefined user (no user on request)', async () => {
      const { guard, ctx } = await buildGuard(
        [{ path: 'role', value: 'admin' }],
        undefined,
      );
      // override ctx to return request without user
      (ctx.switchToHttp as unknown as jest.Mock).mockReturnValue({
        getRequest: jest.fn().mockReturnValue({}),
      });
      const spy = jest
        .spyOn(parentProto(), 'canActivate')
        .mockReturnValue(true);
      await expect(guard.canActivate(ctx)).rejects.toThrow(/Attribute 'role'/);
      spy.mockRestore();
    });

    it('should throw with formatted values for array actual non-empty', async () => {
      const { guard, ctx } = await buildGuard(
        [{ path: 'roles', value: 'admin' }],
        {
          roles: ['viewer'],
        },
      );
      const spy = jest
        .spyOn(parentProto(), 'canActivate')
        .mockReturnValue(true);
      try {
        await guard.canActivate(ctx);
        fail('should have thrown');
      } catch (e: unknown) {
        expect((e as Error).message).toContain('["viewer"]');
      }
      spy.mockRestore();
    });

    it('should pass with Promise from parent guard', async () => {
      const { guard, ctx } = await buildGuard(
        [{ path: 'role', value: 'admin' }],
        {
          role: 'admin',
        },
      );
      const spy = jest
        .spyOn(parentProto(), 'canActivate')
        .mockReturnValue(Promise.resolve(true));
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      spy.mockRestore();
    });
  });
});
