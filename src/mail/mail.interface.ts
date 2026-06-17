export const MAIL_INTERFACE = 'MAIL_INTERFACE';

export type MailVerificationKind =
  | 'register'
  | 'find-id'
  | 'update-email'
  | 'reset-password';

export interface IMailService {
  isSmtpConfigured(): boolean;
  sendVerificationCode(
    to: string,
    code: string,
    kind: MailVerificationKind,
    validityLabel: string,
  ): Promise<void>;
}