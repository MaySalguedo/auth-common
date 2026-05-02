import { DynamicModule, Module, Provider, Type, CanActivate } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '@strategies/jwt/jwt.strategy';
import { JwtGuard } from '@guards/jwt/jwt.guard';
import { OrchestratorGuard } from '@guards/orchestrator/orchestrator.guard';
import { GUARD_REGISTRY } from '@tokens/guard-registry.token';
import { DEFAULT_GUARD } from '@tokens/default-guard.token';
import { JWT_SECRET } from '@tokens/jwt-secret.token';
import { JWT_VALIDATE_PAYLOAD } from '@tokens/jwt-validate-payload.token';
import { AuthCommonOptions } from '@interfaces/auth-common-options.interface';
import { TokenIssues } from '@interfaces/token-issues.interface';

@Module({})
export class CoreModule {
	public static forRoot<T>(options: AuthCommonOptions<T>): DynamicModule {

		const { jwtSecret, defaultGuard = 'jwt', guards = {}, validate } = options;

		const guardKeys = Object.keys(guards);
		const guardProviders: Provider[] = guardKeys.map(key => {
			const guard = guards[key];
			const token = `GUARD_${key}`;

			if (typeof guard === 'object' && guard !== null && 'canActivate' in guard) {

				return {

					provide: token, useValue: guard

				};

			}

			return {

				provide: token, useClass: guard as Type<CanActivate>

			};

		});

		const registryProvider: Provider = {

			provide: GUARD_REGISTRY,
			useFactory: (jwtGuard: JwtGuard, ...guardInstances: CanActivate[]) => {

				const registry: Record<string, CanActivate> = { jwt: jwtGuard };
				for (let i = 0; i < guardKeys.length; i++) {

					registry[guardKeys[i]] = guardInstances[i];

				}

				return registry;

			}, inject: [JwtGuard, ...guardKeys.map(key => `GUARD_${key}`)]

		};

		const validatePayloadProvider: Provider = {

			provide: JWT_VALIDATE_PAYLOAD,
			useValue: validate || ((payload: T & TokenIssues) => payload)

		};

		return {

			module: CoreModule,
			imports: [ PassportModule ],
			providers: [
				{

					provide: JWT_SECRET, useValue: jwtSecret

				}, {

					provide: DEFAULT_GUARD,
					useValue: defaultGuard

				},
				validatePayloadProvider,
				...guardProviders,
				registryProvider,
				JwtStrategy,
				JwtGuard,
				OrchestratorGuard

			], exports: [

				JWT_SECRET,
				DEFAULT_GUARD,
				GUARD_REGISTRY,
				JwtStrategy,
				JwtGuard,
				OrchestratorGuard

			],

		};
	}
}