import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { MailVerificationKind } from './mail.service';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

const createTransportMock = nodemailer.createTransport as jest.MockedFunction<
  typeof nodemailer.createTransport
>;

const sendMailMock = jest.fn().mockResolvedValue({ messageId: 'test-id' });

function createVerificationMailParams(
  overrides: Partial<{
    to: string;
    code: string;
    kind: MailVerificationKind;
    validityLabel: string;
  }> = {},
): {
  to: string;
  code: string;
  kind: MailVerificationKind;
  validityLabel: string;
} {
  return {
    to: 'user@example.com',
    code: '123456',
    kind: 'register' as MailVerificationKind,
    validityLabel: '10분',
    ...overrides,
  } as {
    to: string;
    code: string;
    kind: MailVerificationKind;
    validityLabel: string;
  };
}

type GivenMailOptions = {
  smtp?: boolean;
};

function smtpConfigGet(key: string): string | undefined {
  const map: Record<string, string> = {
    SMTP_PROVIDER: 'gmail',
    SMTP_USER: 'test@gmail.com',
    SMTP_PASS: 'app-password',
    MAIL_FROM: 'My-drive',
  };
  return map[key];
}

function givenMailService(overrides: GivenMailOptions = {}): MailService {
  const smtp = overrides.smtp ?? true;

  const config = {
    get: jest.fn((key: string) => (smtp ? smtpConfigGet(key) : undefined)),
  };

  return new MailService(config as unknown as ConfigService);
}

describe('MailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createTransportMock.mockReturnValue({ sendMail: sendMailMock } as any);
  });

  describe('isSmtpConfigured', () => {
    it('SMTP 설정이 있으면 true 이다', () => {
      const service = givenMailService();

      expect(service.isSmtpConfigured()).toBe(true);
    });

    it('SMTP 설정이 없으면 false 이다', () => {
      const service = givenMailService({ smtp: false });

      expect(service.isSmtpConfigured()).toBe(false);
      expect(createTransportMock).not.toHaveBeenCalled();
    });
  });

  describe('sendVerificationCode', () => {
    it('SMTP가 없으면 예외를 던진다', async () => {
      const service = givenMailService({ smtp: false });
      const mail = createVerificationMailParams();

      await expect(
        service.sendVerificationCode(
          mail.to,
          mail.code,
          mail.kind,
          mail.validityLabel,
        ),
      ).rejects.toThrow('SMTP is not configured');
    });

    it('SMTP가 있으면 sendMail을 호출한다', async () => {
      const service = givenMailService();
      const mail = createVerificationMailParams();

      await service.sendVerificationCode(
        mail.to,
        mail.code,
        mail.kind,
        mail.validityLabel,
      );

      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mail.to,
          subject: '[My-drive] 회원가입 이메일 인증번호',
          text: expect.stringContaining(mail.code),
          html: expect.stringContaining(mail.code),
        }),
      );
    });
  });
});
