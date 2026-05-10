import { DEFAULT_GUARD } from './default-guard.token';
import { GUARD_REGISTRY } from './guard-registry.token';
import { IS_PUBLIC_KEY } from './is-public-key.token';
import { JWT_SECRET } from './jwt-secret.token';
import { JWT_VALIDATE_PAYLOAD } from './jwt-validate-payload.token';
import { USE_GUARDS_KEY } from './use-guards-key.token';

describe('Injection tokens', () => {
  it('DEFAULT_GUARD should equal "DEFAULT_GUARD"', () => {
    expect(DEFAULT_GUARD).toBe('DEFAULT_GUARD');
  });

  it('GUARD_REGISTRY should equal "GUARD_REGISTRY"', () => {
    expect(GUARD_REGISTRY).toBe('GUARD_REGISTRY');
  });

  it('IS_PUBLIC_KEY should equal "isPublic"', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });

  it('JWT_SECRET should equal "JWT_SECRET"', () => {
    expect(JWT_SECRET).toBe('JWT_SECRET');
  });

  it('JWT_VALIDATE_PAYLOAD should equal "JWT_VALIDATE_PAYLOAD"', () => {
    expect(JWT_VALIDATE_PAYLOAD).toBe('JWT_VALIDATE_PAYLOAD');
  });

  it('USE_GUARDS_KEY should equal "useGuards"', () => {
    expect(USE_GUARDS_KEY).toBe('useGuards');
  });

  it('all tokens should be unique strings', () => {
    const tokens = [
      DEFAULT_GUARD,
      GUARD_REGISTRY,
      IS_PUBLIC_KEY,
      JWT_SECRET,
      JWT_VALIDATE_PAYLOAD,
      USE_GUARDS_KEY,
    ];
    const unique = new Set(tokens);
    expect(unique.size).toBe(tokens.length);
  });
});
