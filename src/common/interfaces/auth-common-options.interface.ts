import { CanActivate, Type } from '@nestjs/common';
import { TokenIssues } from '@interfaces/token-issues.interface';

export interface AuthCommonOptions<T = any> {

	jwtSecret: string,
	defaultGuard?: string,
	guards?: Record<string, Type<CanActivate> | CanActivate>,
	validate?: (payload: T & TokenIssues) => (T & TokenIssues) | Promise<T & TokenIssues>;

}