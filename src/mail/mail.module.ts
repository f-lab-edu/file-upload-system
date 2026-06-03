import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConsoleMailService } from './console-mail.service';
import { MailService } from './mail.service';
import { MAIL_INTERFACE } from './mail.interface';

@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: MAIL_INTERFACE,
            useClass:
                process.env.NODE_ENV === 'production' ? MailService : ConsoleMailService,
        },
    ],
    exports: [MAIL_INTERFACE],
})
export class MailModule {
}
