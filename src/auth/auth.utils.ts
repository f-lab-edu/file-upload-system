import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { IMailService, MailVerificationKind } from '../mail/mail.interface';
import { PrismaService } from '../prisma/prisma.service';
import {
  purposeUpdateEmailCode,
  purposeUpdateEmailToken,
} from './auth.constants';
import { UpdateMeDto } from './dto/update-me.dto';
import {
  isPasswordPolicyCompliant,
  PASSWORD_POLICY_MESSAGE,
} from './password-policy';

export const PASSWORD_HASH = 10;
export const PER_SECOND = 1000;
export const PER_MINUTE = 60_000;

export function randomDigitCode(digits: number): string {
  return String(randomInt(10 ** (digits - 1), 10 ** digits));
}

export async function consumeVerificationCode(
  prisma: PrismaService,
  email: string,
  code: string,
  purpose: string,
): Promise<void> {
  const rec = await prisma.emailVerification.findFirst({
    where: {
      email,
      purpose,
      code,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!rec) {
    throw new BadRequestException(
      '인증번호가 올바르지 않거나 만료되었습니다.',
    );
  }
  await prisma.emailVerification.delete({ where: { id: rec.id } });
}

export function codeExpiryResponseFields(ms: number): {
  expiresInSeconds: number;
  expiresInMinutes: number;
} {
  return {
    expiresInSeconds: Math.ceil(ms / PER_SECOND),
    expiresInMinutes: Math.floor(ms / PER_MINUTE),
  };
}

export function formatCodeValidityForMail(ms: number): string {
  const sec = Math.ceil(ms / PER_SECOND);
  if (ms < PER_MINUTE) {
    return `${sec}초`;
  }
  return `${Math.floor(ms / PER_MINUTE)}분`;
}

export async function issueAndSendVerificationCode(
  prisma: PrismaService,
  mail: IMailService,
  logger: Logger,
  params: {
    email: string;
    code: string;
    purpose: string;
    purgePurposes: string[];
    ttlMs: number;
    mailType: MailVerificationKind;
    logPrefix: string;
    throwOnMailError: boolean;
  },
) {
  const {
    email,
    code,
    purpose,
    purgePurposes,
    ttlMs,
    mailType,
    logPrefix,
    throwOnMailError,
  } = params;
  const expiresAt = new Date(Date.now() + ttlMs);
  await prisma.emailVerification.deleteMany({
    where: { email, purpose: { in: purgePurposes } },
  });
  await prisma.emailVerification.create({
    data: { email, code, purpose, expiresAt },
  });
  const ttlLabel = formatCodeValidityForMail(ttlMs);
  const expiry = codeExpiryResponseFields(ttlMs);
  if (mail.isSmtpConfigured()) {
    try {
      await mail.sendVerificationCode(email, code, mailType, ttlLabel);
    } catch (err) {
      logger.error(err);
      await prisma.emailVerification.deleteMany({
        where: { email, purpose },
      });
      const errorMessage =
        '이메일 발송에 실패했습니다. SMTP 설정을 확인하거나 잠시 후 다시 시도해 주세요.';
      if (throwOnMailError) {
        throw new InternalServerErrorException(errorMessage);
      }
      return { sent: false, message: errorMessage };
    }
    return {
      sent: true,
      ...expiry,
      message: '인증번호가 발송되었습니다. 이메일을 확인해 주세요.',
    };
  }
  logger.warn(
    `[${logPrefix}] SMTP 미설정 — ${email} 인증번호: ${code} (유효 ${ttlLabel}, 터미널 확인)`,
  );
  return {
    sent: true,
    ...expiry,
    message:
      '인증번호가 발송되었습니다. 이메일을 확인해 주세요. (SMTP 미설정: 서버 터미널에 인증번호가 출력됩니다.)',
  };
}

export async function emailUpdateValidate(
  prisma: PrismaService,
  userId: string,
  dto: UpdateMeDto,
  patch: {
    email?: string;
  },
): Promise<void> {
  if (dto.email !== undefined) {
    const email = dto.email.trim().toLowerCase();
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!me) {
      throw new BadRequestException('사용자를 찾을 수 없습니다.');
    }
    if (email !== me.email) {
      const token = dto.emailVerifyToken?.trim().toLowerCase();
      if (!token || !/^[a-f0-9]{64}$/u.test(token)) {
        throw new BadRequestException('이메일 변경은 인증을 완료해 주세요.');
      }
      const tokPurp = purposeUpdateEmailToken(userId);
      const emailSession = await prisma.emailVerification.findFirst({
        where: {
          email,
          purpose: tokPurp,
          code: token,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (!emailSession) {
        throw new BadRequestException('이메일 인증을 완료해 주세요.');
      }
      const taken = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (taken) {
        throw new ConflictException('이미 사용 중인 이메일입니다.');
      }
      patch.email = email;
      await prisma.emailVerification.deleteMany({
        where: {
          OR: [
            { purpose: purposeUpdateEmailCode(userId) },
            { purpose: tokPurp },
          ],
        },
      });
    }
  }
}

export async function passwordUpdateValidate(
  prisma: PrismaService,
  userId: string,
  dto: UpdateMeDto,
  patch: {
    password?: string;
  },
): Promise<void> {
  if (dto.newPassword !== undefined || dto.confirmNewPassword !== undefined) {
    if (!dto.newPassword || !dto.confirmNewPassword) {
      throw new BadRequestException(
        '새 비밀번호와 새 비밀번호 확인을 모두 입력해 주세요.',
      );
    }
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('새 비밀번호가 일치하지 않습니다.');
    }
    if (!isPasswordPolicyCompliant(dto.newPassword)) {
      throw new BadRequestException(PASSWORD_POLICY_MESSAGE);
    }
    patch.password = await bcrypt.hash(dto.newPassword, PASSWORD_HASH);
  }
}
