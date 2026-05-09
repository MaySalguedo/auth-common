export * from './core/guards/jwt/jwt.guard';
export * from './core/guards/orchestrator/orchestrator.guard';
export * from './core/strategies/jwt/jwt.strategy';
export { CoreModule as AuthCommonModule } from './core/core.module';

export * from './common/tokens/guard-registry.token';
export * from './common/tokens/default-guard.token';
export * from './common/tokens/jwt-secret.token';
export * from './common/tokens/is-public-key.token';
export * from './common/tokens/use-guards-key.token';

export * from './common/decorators/public-guard.decorator';
export * from './common/decorators/use-guard.decorator';

export * from './common/exceptions/failed-dependency.exception';

export type { AuthCommonOptions } from './common/interfaces/auth-common-options.interface';
export type { TokenIssues } from '@interfaces/token-issues.interface';
