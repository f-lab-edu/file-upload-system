import {BadRequestException, Injectable, UnauthorizedException} from "@nestjs/common";
import {JwtPayload} from "../auth/jwt.strategy";
import {PrismaService} from "../prisma/prisma.service";
import {JwtService} from "@nestjs/jwt";
import {createHash, randomBytes} from "node:crypto";
import {
    REFRESH_TOKEN_RANDOM_BYTES,
    REFRESH_TOKEN_TTL_MS,
} from './token.constants';

@Injectable()
export class TokenService {

    constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {
    }

    signToken(userId: string, email: string) {
        const payload: JwtPayload = {sub: userId, email};
        return this.jwt.sign(payload);
    }

    private hashRefreshToken(plain: string): string {
        return createHash('sha256').update(plain, 'utf8').digest('hex');
    }

    /** @param revokeExisting true면 동일 사용자의 기존 리프레시 토큰을 모두 폐기(로그인·회원가입·비번 변경 등) */
    async grantRefreshToken(
        userId: string,
        revokeExisting: boolean,
    ): Promise<string> {
        if (revokeExisting) {
            await this.prisma.userRefreshToken.deleteMany({where: {userId}});
        }
        const plain = randomBytes(REFRESH_TOKEN_RANDOM_BYTES).toString('hex');
        const tokenHash = this.hashRefreshToken(plain);
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
        await this.prisma.userRefreshToken.create({
            data: {userId, tokenHash, expiresAt},
        });
        return plain;
    }

    async refreshSession(refreshTokenPlain: string) {
        const trimmed = refreshTokenPlain.trim();
        if (!trimmed) {
            throw new BadRequestException('리프레시 토큰이 필요합니다.');
        }
        const tokenHash = this.hashRefreshToken(trimmed);
        const row = await this.prisma.userRefreshToken.findUnique({
            where: {tokenHash},
            include: {
                user: {
                    select: {
                        id: true,
                        loginId: true,
                        email: true,
                        name: true,
                        createdAt: true,
                    },
                },
            },
        });
        if (!row || row.expiresAt <= new Date()) {
            if (row) {
                await this.prisma.userRefreshToken
                    .delete({where: {id: row.id}})
                    .catch(() => undefined);
            }
            throw new UnauthorizedException(
                '세션이 만료되었습니다. 다시 로그인해 주세요.',
            );
        }
        await this.prisma.userRefreshToken.delete({where: {id: row.id}});
        const refreshToken = await this.grantRefreshToken(row.userId, false);
        const accessToken = this.signToken(row.user.id, row.user.email);
        return {
            accessToken,
            refreshToken,
            user: row.user,
        };
    }
}