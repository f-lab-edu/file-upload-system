import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  PURPOSE_REGISTER_CODE,
  PURPOSE_REGISTER_TOKEN,
  REGISTER_CODE_TTL_MS,
  REGISTER_TOKEN_TTL_MS,
} from '../auth/auth.constants';
import {
  consumeVerificationCode,
  issueAndSendVerificationCode,
  PASSWORD_HASH,
  randomDigitCode,
} from '../auth/auth.utils';
import {
  isPasswordPolicyCompliant,
  PASSWORD_POLICY_MESSAGE,
} from '../auth/password-policy';
import { MAIL_INTERFACE } from '../mail/mail.interface';
import type { IMailService } from '../mail/mail.interface';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from '../token/token.service';
import { CheckLoginIdDto } from './dto/check-login-id.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterSendCodeDto } from './dto/register-send-code.dto';
import { RegisterVerifyCodeDto } from './dto/register-verify-code.dto';

@Injectable()
export class RegisterService {
  private readonly logger = new Logger(RegisterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly token: TokenService,
    @Inject(MAIL_INTERFACE) private readonly mail: IMailService,
  ) {}

  /** 회원가입 전 아이디 사용 가능 여부 (공개) */
  async checkRegisterLoginIdAvailability(
    dto: CheckLoginIdDto,
  ): Promise<{ available: boolean }> {
    const existing = await this.prisma.user.findUnique({
      where: { loginId: dto.loginId },
      select: { id: true },
    });
    return { available: existing === null };
  }

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('비밀번호가 일치하지 않습니다.');
    }
    if (!isPasswordPolicyCompliant(dto.password)) {
      throw new BadRequestException(PASSWORD_POLICY_MESSAGE);
    }
    const email = dto.email.trim().toLowerCase();
    const loginId = dto.loginId.trim().toLowerCase();
    const token = dto.emailVerifyToken.trim().toLowerCase();

    const [emailSession, existingEmail, existingId, hash] = await Promise.all([
      this.prisma.emailVerification.findFirst({
        where: {
          email,
          purpose: PURPOSE_REGISTER_TOKEN,
          code: token,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      }),
      this.prisma.user.findUnique({
        where: { loginId },
        select: { id: true },
      }),
      bcrypt.hash(dto.password, PASSWORD_HASH),
    ]);

    if (!emailSession) {
      throw new BadRequestException('이메일 인증을 완료해 주세요.');
    }
    if (existingEmail) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }
    if (existingId) {
      throw new ConflictException('이미 사용 중인 아이디입니다.');
    }

    let user;
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            loginId,
            email,
            password: hash,
            name: dto.name.trim(),
          },
          select: {
            id: true,
            loginId: true,
            email: true,
            name: true,
            createdAt: true,
          },
        });
        await tx.emailVerification.deleteMany({
          where: {
            email,
            purpose: { in: [PURPOSE_REGISTER_CODE, PURPOSE_REGISTER_TOKEN] },
          },
        });
        return created;
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const target = err.meta?.target as string[] | undefined;
        if (target?.includes('email')) {
          throw new ConflictException('이미 사용 중인 이메일입니다.');
        }
        if (target?.includes('loginId')) {
          throw new ConflictException('이미 사용 중인 아이디입니다.');
        }
      }
      throw err;
    }

    const accessToken = this.token.signToken(user.id, user.email);
    const refreshToken = await this.token.grantRefreshToken(user.id, true);
    return { user, accessToken, refreshToken };
  }

  async registerSendCode(dto: RegisterSendCodeDto) {
    const email = dto.email.trim().toLowerCase();
    const taken = await this.prisma.user.findUnique({ where: { email } });
    if (taken) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }
    return issueAndSendVerificationCode(this.prisma, this.mail, this.logger, {
      email,
      code: randomDigitCode(6),
      purpose: PURPOSE_REGISTER_CODE,
      purgePurposes: [PURPOSE_REGISTER_CODE, PURPOSE_REGISTER_TOKEN],
      ttlMs: REGISTER_CODE_TTL_MS,
      mailType: 'register',
      logPrefix: '회원가입 이메일',
      throwOnMailError: true,
    });
  }

  async registerVerifyCode(dto: RegisterVerifyCodeDto) {
    const email = dto.email.trim().toLowerCase();
    const code = dto.code.trim();
    const taken = await this.prisma.user.findUnique({ where: { email } });
    if (taken) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }
    await consumeVerificationCode(
      this.prisma,
      email,
      code,
      PURPOSE_REGISTER_CODE,
    );
    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + REGISTER_TOKEN_TTL_MS);
    await this.prisma.emailVerification.deleteMany({
      where: { email, purpose: PURPOSE_REGISTER_TOKEN },
    });
    await this.prisma.emailVerification.create({
      data: {
        email,
        code: sessionToken,
        purpose: PURPOSE_REGISTER_TOKEN,
        expiresAt,
      },
    });
    return { emailVerifyToken: sessionToken };
  }
}
