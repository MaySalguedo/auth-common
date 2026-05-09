import {
  CanActivate,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';

import { OrchestratorGuard } from './orchestrator.guard';
import { GUARD_REGISTRY } from '@tokens/guard-registry.token';
import { DEFAULT_GUARD } from '@tokens/default-guard.token';
import { IS_PUBLIC_KEY } from '@tokens/is-public-key.token';
import { USE_GUARDS_KEY } from '@tokens/use-guards-key.token';

const makeContext = (): ExecutionContext =>
  ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
  }) as unknown as ExecutionContext;

const makeGuard = (result: boolean | Promise<boolean>): CanActivate => ({
  canActivate: jest.fn().mockReturnValue(result),
});

const makeReflector = (
  overrides: Record<string, unknown> = {},
): Partial<Reflector> => ({
  getAllAndOverride: jest.fn((key: any) => overrides[key] ?? undefined) as any,
});

async function buildModule(opts: {
  reflector: Partial<Reflector>;
  registry: Record<string, CanActivate>;
  defaultGuard?: string;
}): Promise<TestingModule> {
  const providers: any[] = [
    OrchestratorGuard,
    { provide: Reflector, useValue: opts.reflector },
    { provide: GUARD_REGISTRY, useValue: opts.registry },
  ];

  if (opts.defaultGuard !== undefined) {
    providers.push({ provide: DEFAULT_GUARD, useValue: opts.defaultGuard });
  }

  return Test.createTestingModule({ providers }).compile();
}

describe('OrchestratorGuard', () => {
  let ctx: ExecutionContext;

  beforeEach(() => {
    ctx = makeContext();
  });

  it('should be defined', async () => {
    const module = await buildModule({
      reflector: makeReflector(),
      registry: {},
      defaultGuard: 'jwt',
    });
    expect(module.get(OrchestratorGuard)).toBeDefined();
  });

  describe('when route is public', () => {
    it('should return true without calling any guard', async () => {
      const jwtGuard = makeGuard(false); // si lo llaman, retornaría false
      const module = await buildModule({
        reflector: makeReflector({ [IS_PUBLIC_KEY]: true }),
        registry: { jwt: jwtGuard },
        defaultGuard: 'jwt',
      });

      const guard = module.get(OrchestratorGuard);
      expect(await guard.canActivate(ctx)).toBe(true);
      expect(jwtGuard.canActivate).not.toHaveBeenCalled();
    });
  });

  describe('when no @UseGuards keys are set', () => {
    it('should invoke the default guard and return its result (true)', async () => {
      const jwtGuard = makeGuard(true);
      const module = await buildModule({
        reflector: makeReflector({ [IS_PUBLIC_KEY]: false }),
        registry: { jwt: jwtGuard },
        defaultGuard: 'jwt',
      });

      const guard = module.get(OrchestratorGuard);
      expect(await guard.canActivate(ctx)).toBe(true);
      expect(jwtGuard.canActivate).toHaveBeenCalledWith(ctx);
    });

    it('should invoke the default guard and return its result (false)', async () => {
      const jwtGuard = makeGuard(false);
      const module = await buildModule({
        reflector: makeReflector({ [IS_PUBLIC_KEY]: false }),
        registry: { jwt: jwtGuard },
        defaultGuard: 'jwt',
      });

      const guard = module.get(OrchestratorGuard);
      expect(await guard.canActivate(ctx)).toBe(false);
    });
  });

  describe('when there are no keys to execute at all', () => {
    it('should return true (no guards to fail)', async () => {
      const module = await buildModule({
        reflector: makeReflector({ [IS_PUBLIC_KEY]: false }),
        registry: {},
        // sin DEFAULT_GUARD inyectado
      });

      const guard = module.get(OrchestratorGuard);
      expect(await guard.canActivate(ctx)).toBe(true);
    });
  });

  // ── Claves explícitas con @UseGuards ───────────────────────────────

  describe('when @UseGuards sets explicit guard keys', () => {
    it('should invoke each listed guard in order', async () => {
      const callOrder: string[] = [];
      const guardA: CanActivate = {
        canActivate: jest.fn().mockImplementation(() => {
          callOrder.push('a');
          return true;
        }),
      };
      const guardB: CanActivate = {
        canActivate: jest.fn().mockImplementation(() => {
          callOrder.push('b');
          return true;
        }),
      };

      const module = await buildModule({
        reflector: makeReflector({
          [IS_PUBLIC_KEY]: false,
          [USE_GUARDS_KEY]: ['a', 'b'],
        }),
        registry: { a: guardA, b: guardB },
        defaultGuard: 'jwt',
      });

      const guard = module.get(OrchestratorGuard);
      expect(await guard.canActivate(ctx)).toBe(true);
      expect(callOrder).toEqual(['a', 'b']);
    });

    it('should short-circuit and return false as soon as one guard fails', async () => {
      const guardA = makeGuard(false);
      const guardB = makeGuard(true);

      const module = await buildModule({
        reflector: makeReflector({
          [IS_PUBLIC_KEY]: false,
          [USE_GUARDS_KEY]: ['a', 'b'],
        }),
        registry: { a: guardA, b: guardB },
        defaultGuard: 'jwt',
      });

      const guard = module.get(OrchestratorGuard);
      expect(await guard.canActivate(ctx)).toBe(false);
      expect(guardB.canActivate).not.toHaveBeenCalled();
    });

    it('should return true when all explicit guards pass', async () => {
      const guardA = makeGuard(true);
      const guardB = makeGuard(true);

      const module = await buildModule({
        reflector: makeReflector({
          [IS_PUBLIC_KEY]: false,
          [USE_GUARDS_KEY]: ['a', 'b'],
        }),
        registry: { a: guardA, b: guardB },
        defaultGuard: 'jwt',
      });

      const guard = module.get(OrchestratorGuard);
      expect(await guard.canActivate(ctx)).toBe(true);
    });

    it('should use the explicit keys even when defaultGuard is set', async () => {
      const jwtGuard = makeGuard(true);
      const customGuard = makeGuard(true);

      const module = await buildModule({
        reflector: makeReflector({
          [IS_PUBLIC_KEY]: false,
          [USE_GUARDS_KEY]: ['custom'],
        }),
        registry: { jwt: jwtGuard, custom: customGuard },
        defaultGuard: 'jwt',
      });

      const guard = module.get(OrchestratorGuard);
      await guard.canActivate(ctx);

      expect(customGuard.canActivate).toHaveBeenCalledWith(ctx);
      expect(jwtGuard.canActivate).not.toHaveBeenCalled();
    });
  });

  describe('when a key is not found in the registry', () => {
    it('should throw NotFoundException with the guard key in the message', async () => {
      const module = await buildModule({
        reflector: makeReflector({
          [IS_PUBLIC_KEY]: false,
          [USE_GUARDS_KEY]: ['nonexistent'],
        }),
        registry: {},
        defaultGuard: 'jwt',
      });

      const guard = module.get(OrchestratorGuard);
      await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException);
    });

    it('should include the missing key name in the error message', async () => {
      const module = await buildModule({
        reflector: makeReflector({
          [IS_PUBLIC_KEY]: false,
          [USE_GUARDS_KEY]: ['ghost'],
        }),
        registry: {},
        defaultGuard: 'jwt',
      });

      const guard = module.get(OrchestratorGuard);
      await expect(guard.canActivate(ctx)).rejects.toThrow(
        "Guard 'ghost' not registered",
      );
    });

    it('should throw even when the missing guard is in the middle of the chain', async () => {
      const guardA = makeGuard(true);

      const module = await buildModule({
        reflector: makeReflector({
          [IS_PUBLIC_KEY]: false,
          [USE_GUARDS_KEY]: ['a', 'missing', 'b'],
        }),
        registry: { a: guardA },
        defaultGuard: 'jwt',
      });

      const guard = module.get(OrchestratorGuard);
      await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException);
    });
  });

  describe('async guards', () => {
    it('should await a guard that returns a Promise', async () => {
      const asyncGuard = makeGuard(Promise.resolve(true));

      const module = await buildModule({
        reflector: makeReflector({ [IS_PUBLIC_KEY]: false }),
        registry: { jwt: asyncGuard },
        defaultGuard: 'jwt',
      });

      const guard = module.get(OrchestratorGuard);
      expect(await guard.canActivate(ctx)).toBe(true);
    });

    it('should propagate errors thrown by an async guard', async () => {
      const failingGuard: CanActivate = {
        canActivate: jest.fn().mockRejectedValue(new Error('guard exploded')),
      };

      const module = await buildModule({
        reflector: makeReflector({ [IS_PUBLIC_KEY]: false }),
        registry: { jwt: failingGuard },
        defaultGuard: 'jwt',
      });

      const guard = module.get(OrchestratorGuard);
      await expect(guard.canActivate(ctx)).rejects.toThrow('guard exploded');
    });
  });
});
