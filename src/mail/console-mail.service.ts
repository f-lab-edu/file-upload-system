import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  MailVerificationKind,
  VERIFICATION_MAIL_SUBJECT_BY_KIND,
} from './mail.service';

@Injectable()
export class ConsoleMailService implements OnModuleInit {
  private readonly logger = new Logger(ConsoleMailService.name);

  onModuleInit(): void {
    this.logger.log('콘솔 메일 모드 — 인증번호는 터미널에 출력됩니다.');
  }

  isSmtpConfigured(): boolean {
    return true;
  }

  sendVerificationCode(
    to: string,
    code: string,
    kind: MailVerificationKind,
    validityLabel: string,
  ): Promise<void> {
    const subject = VERIFICATION_MAIL_SUBJECT_BY_KIND[kind];
    this.logger.log(
      `[CONSOLE MAIL] to=${to} | subject="${subject}" | 인증번호=${code} | 유효=${validityLabel}`,
    );
    return Promise.resolve();
  }
}
