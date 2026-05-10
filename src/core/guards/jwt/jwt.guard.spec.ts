import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtGuard } from './jwt.guard';

const parentProto = () => Object.getPrototypeOf(JwtGuard.prototype);

const makeMockContext = (): ExecutionContext =>
  ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
  }) as unknown as ExecutionContext;

describe('JwtGuard', () => {
  let guard: JwtGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtGuard],
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
});
