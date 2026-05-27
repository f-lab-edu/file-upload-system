import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { from, Observable, switchMap } from 'rxjs';
import { DriveService } from '../drive.service';

type AuthedRequest = { user?: { id: string } };

@Injectable()
export class PurgeExpiredTrashInterceptor implements NestInterceptor {
  constructor(private readonly drive: DriveService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const userId = req.user?.id;
    if (!userId) {
      return next.handle();
    }
    return from(this.drive.purgeExpiredTrash(userId)).pipe(
      switchMap(() => next.handle()),
    );
  }
}
