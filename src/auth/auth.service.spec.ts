import {Test, TestingModule} from '@nestjs/testing';
import {BadRequestException} from '@nestjs/common';
import {mockDeep, DeepMockProxy} from 'jest-mock-extended';
import {JwtService} from '@nestjs/jwt';
import {AuthService} from './auth.service';
import {PrismaService} from 'src/prisma/prisma.service';
import {MailService} from 'src/mail/mail.service';
import {DriveService} from 'src/drive/drive.service';
import {RegisterDto} from './dto/register.dto';

function createRegisterDto(overrides: Partial<RegisterDto> = {}): RegisterDto {
    return {
        loginId: 'testuser',
        email: 'test@example.com',
        name: '테스트',
        password: 'Password1!',
        confirmPassword: 'Password1!',
        emailVerifyToken: 'a'.repeat(64),
        ...overrides,
    };
}

describe('AuthService', () => {
    let service: AuthService;
    let prisma: DeepMockProxy<PrismaService>;

    beforeEach(async () => {
        prisma = mockDeep<PrismaService>();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {provide: PrismaService, useValue: prisma},
                {provide: JwtService, useValue: mockDeep<JwtService>()},
                {provide: MailService, useValue: mockDeep<MailService>()},
                {provide: DriveService, useValue: mockDeep<DriveService>()},
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });
    describe('register', () => {
        it('password와 confirmPassword가 다르면 BadRequestException을 던진다', async () => {
            await expect(
                service.register(createRegisterDto({ password: 'Password1!', confirmPassword: 'Password2!' })),
            ).rejects.toThrow(BadRequestException);

            expect(prisma.emailVerification.findFirst).not.toHaveBeenCalled();
        });
    })
    describe('checkRegisterLoginIdAvailability', () => {
        it('아이디가 비어 있으면 BadRequestException을 던지고 DB를 조회하지 않는다', async () => {
            await expect(
                service.checkRegisterLoginIdAvailability(''),
            ).rejects.toThrow(BadRequestException);
            await expect(
                service.checkRegisterLoginIdAvailability(''),
            ).rejects.toThrow('아이디를 입력해 주세요.');
            expect(prisma.user.findUnique).not.toHaveBeenCalled();
        });
    });
});
