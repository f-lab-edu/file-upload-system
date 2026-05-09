import {BadRequestException, ConflictException, Injectable, InternalServerErrorException, Logger} from "@nestjs/common";
import {RegisterDto} from "./dto/register.dto";
import {isPasswordPolicyCompliant, PASSWORD_POLICY_MESSAGE} from "../auth/password-policy";
import {
    PURPOSE_REGISTER_CODE,
    PURPOSE_REGISTER_TOKEN,
    REGISTER_CODE_TTL_MS,
    REGISTER_TOKEN_TTL_MS
} from "../auth/auth.constants";
import * as bcrypt from "bcrypt";
import {PASSWORD_HASH, codeExpiryResponseFields, formatCodeValidityForMail, randomDigitCode} from "../auth/auth.utils";
import {RegisterSendCodeDto} from "./dto/register-send-code.dto";
import {RegisterVerifyCodeDto} from "./dto/register-verify-code.dto";
import {randomBytes} from "node:crypto";
import {PrismaService} from "../prisma/prisma.service";
import {TokenService} from "../token/token.service";
import {MailService} from "../mail/mail.service";


@Injectable()
export class RegisterService {
    private readonly logger = new Logger(RegisterService.name);

    constructor(private readonly prisma: PrismaService, private readonly token: TokenService, private readonly mail: MailService) {
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
        const emailSession = await this.prisma.emailVerification.findFirst({
            where: {
                email,
                purpose: PURPOSE_REGISTER_TOKEN,
                code: token,
                expiresAt: {gt: new Date()},
            },
            orderBy: {createdAt: 'desc'},
        });
        if (!emailSession) {
            throw new BadRequestException('이메일 인증을 완료해 주세요.');
        }
        const existingEmail = await this.prisma.user.findUnique({
            where: {email},
        });
        if (existingEmail) {
            throw new ConflictException('이미 사용 중인 이메일입니다.');
        }
        const existingId = await this.prisma.user.findUnique({
            where: {loginId},
        });
        if (existingId) {
            throw new ConflictException('이미 사용 중인 아이디입니다.');
        }
        const hash = await bcrypt.hash(dto.password, PASSWORD_HASH);
        const user = await this.prisma.user.create({
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
        await this.prisma.emailVerification.deleteMany({
            where: {
                email,
                purpose: {in: [PURPOSE_REGISTER_CODE, PURPOSE_REGISTER_TOKEN]},
            },
        });
        const accessToken = this.token.signToken(user.id, user.email);
        const refreshToken = await this.token.grantRefreshToken(user.id, true);
        return {user, accessToken, refreshToken};
    }

    async registerSendCode(dto: RegisterSendCodeDto) {
        const email = dto.email.trim().toLowerCase();
        const taken = await this.prisma.user.findUnique({where: {email}});
        if (taken) {
            throw new ConflictException('이미 사용 중인 이메일입니다.');
        }
        const code = randomDigitCode(6);
        const expiresAt = new Date(Date.now() + REGISTER_CODE_TTL_MS);
        await this.prisma.emailVerification.deleteMany({
            where: {
                email,
                purpose: {in: [PURPOSE_REGISTER_CODE, PURPOSE_REGISTER_TOKEN]},
            },
        });
        await this.prisma.emailVerification.create({
            data: {email, code, purpose: PURPOSE_REGISTER_CODE, expiresAt},
        });
        const ttlLabel = formatCodeValidityForMail(REGISTER_CODE_TTL_MS);
        const expiry = codeExpiryResponseFields(REGISTER_CODE_TTL_MS);
        if (this.mail.isSmtpConfigured()) {
            try {
                await this.mail.sendVerificationCode(email, code, 'register', ttlLabel);
            } catch (err) {
                this.logger.error(err);
                await this.prisma.emailVerification.deleteMany({
                    where: {email, purpose: PURPOSE_REGISTER_CODE},
                });
                throw new InternalServerErrorException(
                    '이메일 발송에 실패했습니다. SMTP 설정을 확인하거나 잠시 후 다시 시도해 주세요.',
                );
            }
            return {
                sent: true,
                ...expiry,
                message: '인증번호가 발송되었습니다. 이메일을 확인해 주세요.',
            };
        }
        this.logger.warn(
            `[회원가입 이메일] SMTP 미설정 — ${email} 인증번호: ${code} (유효 ${ttlLabel}, 터미널 확인)`,
        );
        return {
            sent: true,
            ...expiry,
            message:
                '인증번호가 발송되었습니다. 이메일을 확인해 주세요. (SMTP 미설정: 서버 터미널에 인증번호가 출력됩니다.)',
        };
    }

    async registerVerifyCode(dto: RegisterVerifyCodeDto) {
        const email = dto.email.trim().toLowerCase();
        const code = dto.code.trim();
        const rec = await this.prisma.emailVerification.findFirst({
            where: {
                email,
                purpose: PURPOSE_REGISTER_CODE,
                code,
                expiresAt: {gt: new Date()},
            },
            orderBy: {createdAt: 'desc'},
        });
        if (!rec) {
            throw new BadRequestException(
                '인증번호가 올바르지 않거나 만료되었습니다.',
            );
        }
        const taken = await this.prisma.user.findUnique({where: {email}});
        if (taken) {
            throw new ConflictException('이미 사용 중인 이메일입니다.');
        }
        await this.prisma.emailVerification.delete({where: {id: rec.id}});
        const sessionToken = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + REGISTER_TOKEN_TTL_MS);
        await this.prisma.emailVerification.deleteMany({
            where: {email, purpose: PURPOSE_REGISTER_TOKEN},
        });
        await this.prisma.emailVerification.create({
            data: {
                email,
                code: sessionToken,
                purpose: PURPOSE_REGISTER_TOKEN,
                expiresAt,
            },
        });
        return {emailVerifyToken: sessionToken};
    }
}