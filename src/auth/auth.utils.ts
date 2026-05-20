import {BadRequestException, ConflictException} from "@nestjs/common";
import {purposeUpdateEmailCode, purposeUpdateEmailToken} from "./auth.constants";
import {PrismaService} from "src/prisma/prisma.service";
import {UpdateMeDto} from "./dto/update-me.dto";
import {isPasswordPolicyCompliant, PASSWORD_POLICY_MESSAGE} from "./password-policy";
import * as bcrypt from 'bcrypt';

import {randomInt} from 'node:crypto';

export const PASSWORD_HASH = 10;
export const PER_SECOND = 1000;
export const PER_MINUTE = 60_000;

export function randomDigitCode(digits: number): string {
    return String(randomInt(10 ** (digits - 1), 10 ** digits));
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

export async function emailUpdateValidate(prisma: PrismaService, userId: string, dto: UpdateMeDto, patch: {
    email?: string
},): Promise<void> {
    if (dto.email !== undefined) {
        const email = dto.email.trim().toLowerCase();
        const me = await this.prisma.user.findUnique({
            where: {id: userId},
            select: {email: true},
        });
        if (!me) {
            throw new BadRequestException('사용자를 찾을 수 없습니다.');
        }
        if (email !== me.email) {
            const token = dto.emailVerifyToken?.trim().toLowerCase();
            if (
                !token ||
                !/^[a-f0-9]{64}$/u.test(token)
            ) {
                throw new BadRequestException('이메일 변경은 인증을 완료해 주세요.');
            }
            const tokPurp = purposeUpdateEmailToken(userId);
            const emailSession = await this.prisma.emailVerification.findFirst({
                where: {
                    email,
                    purpose: tokPurp,
                    code: token,
                    expiresAt: {gt: new Date()},
                },
                orderBy: {createdAt: 'desc'},
            });
            if (!emailSession) {
                throw new BadRequestException('이메일 인증을 완료해 주세요.');
            }
            const taken = await this.prisma.user.findUnique({
                where: {email},
                select: {id: true},
            });
            if (taken) {
                throw new ConflictException('이미 사용 중인 이메일입니다.');
            }
            patch.email = email;
            await this.prisma.emailVerification.deleteMany({
                where: {
                    OR: [
                        {purpose: purposeUpdateEmailCode(userId)},
                        {purpose: tokPurp},
                    ],
                },
            });
        }
    }
}

export async function passwordUpdateValidate(prisma: PrismaService, userId: string, dto: UpdateMeDto, patch: {
    password?: string
},): Promise<void> {
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


  