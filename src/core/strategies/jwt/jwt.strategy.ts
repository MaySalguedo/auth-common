import { Injectable, Inject, Optional } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JWT_SECRET } from '@tokens/jwt-secret.token';
import { JWT_VALIDATE_PAYLOAD } from '@tokens/jwt-validate-payload.token';
import { AuthCommonOptions } from '@interfaces/auth-common-options.interface';
import { TokenIssues } from '@interfaces/token-issues.interface';

@Injectable() export class JwtStrategy<T> extends PassportStrategy(Strategy, 'jwt') {

	public constructor(

		@Inject(JWT_SECRET) private jwt_secret: string,
		@Optional() @Inject(JWT_VALIDATE_PAYLOAD) private validate_pyload: AuthCommonOptions['validate']

	) {

		super({

			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: jwt_secret,

		});

	}

	public async validate(payload: T & TokenIssues): Promise<T & TokenIssues> {

		if (this.validate_pyload) return await this.validate_pyload(payload);

		return payload;

	}

}