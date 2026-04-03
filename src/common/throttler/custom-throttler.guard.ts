import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';
import { THROTTLE_PROFILES_KEY } from './throttle-profiles.decorator';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    const ips = req.ips as string[] | undefined;
    return Promise.resolve(ips?.length ? ips[0] : (req.ip as string));
  }

  protected async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    const { context, throttler } = requestProps;

    const profiles = this.reflector.getAllAndOverride<string[]>(
      THROTTLE_PROFILES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Route'ta profil belirtilmişse, sadece o profilleri uygula
    if (profiles && !profiles.includes(throttler.name!)) {
      return true;
    }

    // Route'ta profil belirtilmemişse, sadece 'default' uygula
    if (!profiles && throttler.name !== 'default') {
      return true;
    }

    return super.handleRequest(requestProps);
  }
}
