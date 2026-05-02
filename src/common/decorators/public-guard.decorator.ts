import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '@tokens/is-public-key.token';

export const PublicGuard = () => SetMetadata(IS_PUBLIC_KEY, true);