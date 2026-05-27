import { Module } from '@nestjs/common';
import { DriveController } from './drive.controller';
import { DriveService } from './drive.service';
import { PurgeExpiredTrashInterceptor } from './interceptors/purge-expired-trash.interceptor';

@Module({
  controllers: [DriveController],
  providers: [DriveService, PurgeExpiredTrashInterceptor],
  exports: [DriveService],
})
export class DriveModule {}
