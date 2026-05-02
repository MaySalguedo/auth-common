import { HttpException, HttpStatus } from '@nestjs/common';

export class FailedDependencyException extends HttpException {

	public constructor(message?: string) {

		super(message || 'Failed Dependency', HttpStatus.FAILED_DEPENDENCY);

	}

}