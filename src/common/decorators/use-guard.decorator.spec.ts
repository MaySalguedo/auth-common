import { USE_GUARDS_KEY } from '@tokens/use-guards-key.token';
import { UseGuards } from './use-guard.decorator';

function applyToClass(decorator: ClassDecorator): unknown {
  const target = class TestController {};
  decorator(target);
  return Reflect.getMetadata(USE_GUARDS_KEY, target);
}

describe('UseGuards decorator', () => {
  it('should return a function (decorator factory)', () => {
    expect(typeof UseGuards('jwt')).toBe('function');
  });

  it(`should set metadata key "${USE_GUARDS_KEY}" with the provided guard keys`, () => {
    const metadata = applyToClass(UseGuards('jwt'));
    expect(metadata).toEqual(['jwt']);
  });

  it('should accept multiple guard keys', () => {
    const metadata = applyToClass(UseGuards('jwt', 'apiKey', 'custom'));
    expect(metadata).toEqual(['jwt', 'apiKey', 'custom']);
  });

  it('should set an empty array when called with no arguments', () => {
    const metadata = applyToClass(UseGuards());
    expect(metadata).toEqual([]);
  });

  it('should preserve the order of guard keys', () => {
    const keys = ['a', 'b', 'c', 'd'];
    const metadata = applyToClass(UseGuards(...keys));
    expect(metadata).toEqual(keys);
  });

  it('should work when applied to a method', () => {
    class TestController {
      handler() {}
    }
    (UseGuards('jwt') as MethodDecorator)(
      TestController.prototype,
      'handler',
      Object.getOwnPropertyDescriptor(TestController.prototype, 'handler')!,
    );
    const metadata = Reflect.getMetadata(
      USE_GUARDS_KEY,
      TestController.prototype.handler,
    );
    expect(metadata).toEqual(['jwt']);
  });
});
