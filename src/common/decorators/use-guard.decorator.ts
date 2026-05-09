import { SetMetadata } from '@nestjs/common';
import { USE_GUARDS_KEY } from '@tokens/use-guards-key.token';

export const UseGuards = (...guards: Array<string>) =>
  SetMetadata(USE_GUARDS_KEY, guards);
