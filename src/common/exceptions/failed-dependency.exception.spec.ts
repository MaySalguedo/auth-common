import { HttpException, HttpStatus } from '@nestjs/common';
import { FailedDependencyException } from './failed-dependency.exception';

describe('FailedDependencyException', () => {
  describe('instanceof checks', () => {
    it('should be an instance of FailedDependencyException', () => {
      expect(new FailedDependencyException()).toBeInstanceOf(
        FailedDependencyException,
      );
    });

    it('should be an instance of HttpException', () => {
      expect(new FailedDependencyException()).toBeInstanceOf(HttpException);
    });

    it('should be an instance of Error', () => {
      expect(new FailedDependencyException()).toBeInstanceOf(Error);
    });
  });

  describe('HTTP status', () => {
    it('should have status 424 (FAILED_DEPENDENCY)', () => {
      const exception = new FailedDependencyException();
      expect(exception.getStatus()).toBe(HttpStatus.FAILED_DEPENDENCY);
      expect(exception.getStatus()).toBe(424);
    });
  });

  describe('default message', () => {
    it('should use "Failed Dependency" when no message is supplied', () => {
      const exception = new FailedDependencyException();
      expect(exception.message).toBe('Failed Dependency');
    });

    it('getResponse() should contain the default message', () => {
      const exception = new FailedDependencyException();
      expect(exception.getResponse()).toBe('Failed Dependency');
    });
  });

  describe('custom message', () => {
    it('should use the provided message', () => {
      const exception = new FailedDependencyException('Custom error message');
      expect(exception.message).toBe('Custom error message');
    });

    it('getResponse() should return the provided message', () => {
      const exception = new FailedDependencyException('Downstream failure');
      expect(exception.getResponse()).toBe('Downstream failure');
    });

    it('should handle an empty string as a custom message', () => {
      // Empty string is falsy → falls back to the default inside the constructor
      const exception = new FailedDependencyException('');
      expect(exception.message).toBe('Failed Dependency');
    });
  });
});
