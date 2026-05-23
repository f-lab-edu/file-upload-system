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
  nodeEnv?: 'development' | 'production';
  clearNodeEnv?: boolean;
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

  if (overrides.clearNodeEnv) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = overrides.nodeEnv ?? 'development';
  }

  const config = {
    get: jest.fn((key: string) => (smtp ? smtpConfigGet(key) : undefined)),
  };

  return new MailService(config as unknown as ConfigService);
}

describe('MailService', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    createTransportMock.mockReturnValue({ sendMail: sendMailMock } as any);
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  describe('isSmtpConfigured', () => {
    it('development 환경이면 SMTP가 있어도 false 이다', () => {
      const service = givenMailService({ nodeEnv: 'development' });

      expect(service.isSmtpConfigured()).toBe(false);
      expect(createTransportMock).toHaveBeenCalled();
    });

    it('production 환경이고 SMTP가 있으면 true 이다', () => {
      const service = givenMailService({ nodeEnv: 'production' });

      expect(service.isSmtpConfigured()).toBe(true);
    });

    it('production 환경이어도 SMTP가 없으면 false 이다', () => {
      const service = givenMailService({ nodeEnv: 'production', smtp: false });

      expect(service.isSmtpConfigured()).toBe(false);
      expect(createTransportMock).not.toHaveBeenCalled();
    });

    it('NODE_ENV가 없으면 development 로 간주해 false 이다', () => {
      const service = givenMailService({ clearNodeEnv: true });

      expect(service.isSmtpConfigured()).toBe(false);
    });
  });

  describe('sendVerificationCode', () => {
    it('SMTP가 없으면 예외를 던진다', async () => {
      const service = givenMailService({ nodeEnv: 'production', smtp: false });
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

    it('production 환경이고 SMTP가 있으면 sendMail을 호출한다', async () => {
      const service = givenMailService({ nodeEnv: 'production' });
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
