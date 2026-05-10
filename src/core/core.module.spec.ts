import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate } from '@nestjs/common';
import { CoreModule } from './core.module';
import { GUARD_REGISTRY } from '@tokens/guard-registry.token';
import { DEFAULT_GUARD } from '@tokens/default-guard.token';
import { JWT_SECRET } from '@tokens/jwt-secret.token';
import { JWT_VALIDATE_PAYLOAD } from '@tokens/jwt-validate-payload.token';
import { JwtGuard } from '@guards/jwt/jwt.guard';

class MockClassGuard implements CanActivate {
  canActivate() {
    return true;
  }
}

const mockInstanceGuard: CanActivate = {
  canActivate: jest.fn().mockReturnValue(true),
};

describe('CoreModule', () => {
  describe('forRoot() con opciones mínimas', () => {
    let module: TestingModule;

    beforeAll(async () => {
      module = await Test.createTestingModule({
        imports: [
          CoreModule.forRoot({
            jwtSecret: 'super-secret',
          }),
        ],
      }).compile();
    });

    it('debería proveer JWT_SECRET', () => {
      expect(module.get(JWT_SECRET)).toBe('super-secret');
    });

    it('debería usar "jwt" como DEFAULT_GUARD por defecto', () => {
      expect(module.get(DEFAULT_GUARD)).toBe('jwt');
    });

    it('debería registrar el JwtGuard en el GUARD_REGISTRY por defecto', () => {
      const registry = module.get(GUARD_REGISTRY);
      expect(registry).toHaveProperty('jwt');
      expect(registry.jwt).toBeInstanceOf(JwtGuard);
    });

    it('debería proveer una función de validación por defecto que retorna el payload', () => {
      const validateFn = module.get(JWT_VALIDATE_PAYLOAD);
      const samplePayload = { id: 1, roles: ['admin'] };
      expect(validateFn(samplePayload)).toEqual(samplePayload);
    });
  });

  describe('forRoot() con opciones personalizadas completas', () => {
    let module: TestingModule;
    const customValidateFn = jest.fn((payload) => ({
      ...payload,
      custom: true,
    }));

    beforeAll(async () => {
      module = await Test.createTestingModule({
        imports: [
          CoreModule.forRoot({
            jwtSecret: 'another-secret',
            defaultGuard: 'api-key',
            guards: {
              'api-key': MockClassGuard,
              'custom-instance': mockInstanceGuard,
            },
            validate: customValidateFn,
          }),
        ],
      }).compile();
    });

    it('debería configurar el DEFAULT_GUARD personalizado', () => {
      expect(module.get(DEFAULT_GUARD)).toBe('api-key');
    });

    it('debería registrar guards de clase e instancia en el GUARD_REGISTRY', () => {
      const registry = module.get(GUARD_REGISTRY);

      // Siempre debe estar el JWT guard
      expect(registry).toHaveProperty('jwt');
      expect(registry.jwt).toBeInstanceOf(JwtGuard);

      // Guards inyectados
      expect(registry).toHaveProperty('api-key');
      expect(registry['api-key']).toBeInstanceOf(MockClassGuard);

      expect(registry).toHaveProperty('custom-instance');
      expect(registry['custom-instance']).toBe(mockInstanceGuard);
    });

    it('debería utilizar la función validate personalizada', () => {
      const validateFn = module.get(JWT_VALIDATE_PAYLOAD);
      expect(validateFn).toBe(customValidateFn);

      const result = validateFn({ sub: 123 });
      expect(result).toEqual({ sub: 123, custom: true });
    });
  });
});
