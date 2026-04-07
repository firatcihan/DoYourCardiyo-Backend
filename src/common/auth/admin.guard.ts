import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

interface ClerkPayload {
  publicMetadata?: { role?: string };
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ clerkPayload?: ClerkPayload }>();

    if (!request.clerkPayload) {
      throw new UnauthorizedException(
        'ClerkAuthGuard must run before AdminGuard.',
      );
    }

    const metadata = request.clerkPayload.publicMetadata;

    if (!metadata || metadata.role !== 'admin') {
      throw new ForbiddenException('Admin yetkisi gereklidir.');
    }

    return true;
  }
}
