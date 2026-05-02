import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Injectable() export class JwtGuard extends AuthGuard('jwt') {

	public canActivate(context: ExecutionContext): boolean | Promise<boolean> {

		return super.canActivate(context) as boolean | Promise<boolean>;

	}

}