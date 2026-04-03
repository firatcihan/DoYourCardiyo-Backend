import { SetMetadata } from '@nestjs/common';

export const THROTTLE_PROFILES_KEY = 'throttle-profiles';

export const ThrottleProfiles = (...profiles: string[]) =>
  SetMetadata(THROTTLE_PROFILES_KEY, profiles);

export const ThrottleAI = () => ThrottleProfiles('ai', 'ai-burst');

export const ThrottleAuth = () => ThrottleProfiles('auth');
