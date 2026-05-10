import { IS_PUBLIC_KEY } from '@tokens/is-public-key.token';
import { PublicGuard } from './public-guard.decorator';

function applyAndReadMetadata(
  decorator: ClassDecorator | MethodDecorator,
): unknown {
  const target = class TestController {};
  (decorator as ClassDecorator)(target);
  return Reflect.getMetadata(IS_PUBLIC_KEY, target);
}

describe('PublicGuard decorator', () => {
  it('should return a function (decorator factory)', () => {
    expect(typeof PublicGuard()).toBe('function');
  });

  it(`should set metadata key "${IS_PUBLIC_KEY}" to true on the target`, () => {
    const metadata = applyAndReadMetadata(PublicGuard());
    expect(metadata).toBe(true);
  });

  it('should produce independent decorators on each invocation', () => {
    const dec1 = PublicGuard();
    const dec2 = PublicGuard();
    expect(dec1).not.toBe(dec2);
  });

  it('should work when applied to a method', () => {
    class TestController {
      handler() {}
    }
    (PublicGuard() as MethodDecorator)(
      TestController.prototype,
      'handler',
      Object.getOwnPropertyDescriptor(TestController.prototype, 'handler')!,
    );
    const metadata = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      TestController.prototype.handler,
    );
    expect(metadata).toBe(true);
  });
});
