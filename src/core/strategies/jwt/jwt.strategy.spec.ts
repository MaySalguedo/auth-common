import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { JWT_SECRET } from '@tokens/jwt-secret.token';
import { JWT_VALIDATE_PAYLOAD } from '@tokens/jwt-validate-payload.token';

const samplePayload = {
  sub: 'user-123',
  email: 'test@example.com',
  iat: 1_000_000,
  exp: 9_999_999,
};

describe('JwtStrategy', () => {
  describe('without a custom validator', () => {
    let strategy: JwtStrategy<typeof samplePayload>;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtStrategy,
          { provide: JWT_SECRET, useValue: 'test-secret' },
        ],
      }).compile();

      strategy = module.get<JwtStrategy<typeof samplePayload>>(JwtStrategy);
    });

    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });

    it('should return the payload unchanged', async () => {
      const result = await strategy.validate(samplePayload);
      expect(result).toEqual(samplePayload);
    });

    it('should return the exact same object reference', async () => {
      const result = await strategy.validate(samplePayload);
      expect(result).toBe(samplePayload);
    });
  });

  describe('with a custom validator', () => {
    let strategy: JwtStrategy<typeof samplePayload>;
    const mockValidator = jest.fn();

    beforeEach(async () => {
      mockValidator.mockReset();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtStrategy,
          { provide: JWT_SECRET, useValue: 'test-secret' },
          { provide: JWT_VALIDATE_PAYLOAD, useValue: mockValidator },
        ],
      }).compile();

      strategy = module.get<JwtStrategy<typeof samplePayload>>(JwtStrategy);
    });

    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });

    it('should call the custom validator with the raw payload', async () => {
      mockValidator.mockResolvedValue(samplePayload);
      await strategy.validate(samplePayload);
      expect(mockValidator).toHaveBeenCalledTimes(1);
      expect(mockValidator).toHaveBeenCalledWith(samplePayload);
    });

    it('should return the value produced by the custom validator', async () => {
      const enriched = { ...samplePayload, role: 'admin' };
      mockValidator.mockResolvedValue(enriched);
      const result = await strategy.validate(samplePayload);
      expect(result).toEqual(enriched);
    });

    it('should support a synchronous custom validator', async () => {
      const syncValidator = jest
        .fn()
        .mockReturnValue({ ...samplePayload, synced: true });
      const mod = await Test.createTestingModule({
        providers: [
          JwtStrategy,
          { provide: JWT_SECRET, useValue: 'secret' },
          { provide: JWT_VALIDATE_PAYLOAD, useValue: syncValidator },
        ],
      }).compile();

      const s = mod.get<JwtStrategy<any>>(JwtStrategy);
      const result = await s.validate(samplePayload);
      expect(result).toMatchObject({ synced: true });
    });

    it('should propagate errors thrown by the custom validator', async () => {
      mockValidator.mockRejectedValue(new Error('Invalid payload'));
      await expect(strategy.validate(samplePayload)).rejects.toThrow(
        'Invalid payload',
      );
    });
  });

  // ── Distintos secretos ─────────────────────────────────────────────

  describe('JWT secret handling', () => {
    it('should instantiate successfully with any non-empty secret', async () => {
      for (const secret of [
        'short',
        'a-very-long-secret-key-for-testing-purposes',
        '12345',
      ]) {
        const mod = await Test.createTestingModule({
          providers: [JwtStrategy, { provide: JWT_SECRET, useValue: secret }],
        }).compile();
        expect(mod.get<JwtStrategy<any>>(JwtStrategy)).toBeDefined();
      }
    });
  });
});
