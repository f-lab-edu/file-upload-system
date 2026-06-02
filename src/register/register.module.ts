import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenModule } from '../token/token.module';
import { RegisterService } from './register.service';

@Module({
  imports: [PrismaModule, TokenModule, MailModule],
  providers: [RegisterService],
  exports: [RegisterService],
})
export class RegisterModule {}
