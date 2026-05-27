import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConsoleMailService } from './console-mail.service';
import { MailService } from './mail.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: MailService,
      useClass:
        process.env.NODE_ENV === 'production' ? MailService : ConsoleMailService,
    },
  ],
  exports: [MailService],
})
export class MailModule {}
