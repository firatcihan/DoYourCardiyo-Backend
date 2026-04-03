import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const throttlerConfig: ThrottlerModuleOptions = {
  throttlers: [
    {
      name: 'default',
      ttl: 60_000,
      limit: 30,
    },
    {
      name: 'ai',
      ttl: 60_000,
      limit: 3,
    },
    {
      name: 'ai-burst',
      ttl: 3_600_000,
      limit: 15,
    },
    {
      name: 'auth',
      ttl: 60_000,
      limit: 5,
    },
  ],
  errorMessage: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.',
};
