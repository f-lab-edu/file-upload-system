import {Test, TestingModule} from '@nestjs/testing';
import {BadRequestException} from '@nestjs/common';
import {mockDeep, DeepMockProxy} from 'jest-mock-extended';
import {JwtService} from '@nestjs/jwt';
import {AuthService} from './auth.service';
import {PrismaService} from 'src/prisma/prisma.service';
import {MailService} from 'src/mail/mail.service';
import {DriveService} from 'src/drive/drive.service';

describe('AuthService', () => {
    describe('register', () => {
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

        it('비밀번호와 비밀번호 확인이 다르면 BadRequestException을 던진다', async () => {
            await expect(
                service.register({
                    loginId: 'testuserId',
                    email: 'test@example.com',
                    name: '테스트',
                    password: 'Password1!',
                    confirmPassword: 'Password2!',
                    emailVerifyToken: 'a'.repeat(64),
                }),
            ).rejects.toThrow(BadRequestException);

            expect(prisma.emailVerification.findFirst).not.toHaveBeenCalled();
        });
    })
});