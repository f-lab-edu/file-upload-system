import {TokenService} from "../token/token.service";
import {PrismaService} from "../prisma/prisma.service";
import {mockDeep, DeepMockProxy} from 'jest-mock-extended';
import {RegisterService} from "./register.service";
import {MailService} from "../mail/mail.service";
import {TestingModule, Test} from "@nestjs/testing";
import {BadRequestException, ConflictException} from "@nestjs/common";

const VALID_DTO = {
    loginId: 'testuser',
    email: 'test@example.com',
    name: '테스트',
    password: 'Password1!',
    confirmPassword: 'Password1!',
    emailVerifyToken: 'a'.repeat(64),
};
describe('RegisterService', () => {
    let service: RegisterService;
    let prisma: DeepMockProxy<PrismaService>;
    let token: DeepMockProxy<TokenService>;
    let mail: DeepMockProxy<MailService>;

    beforeEach(async () => {
        prisma = mockDeep<PrismaService>();
        token = mockDeep<TokenService>();
        mail = mockDeep<MailService>();

        const module: TestingModule = await Test.createTestingModule(
            {
                providers: [
                    RegisterService,
                    {provide: PrismaService, useValue: prisma},
                    {provide: TokenService, useValue: token},
                    {provide: MailService, useValue: mail}
                ]
            }
        ).compile();
        service = module.get<RegisterService>(RegisterService)
    })
    describe('register', () => {
        it('아이디와 비밀번호가 다르면 BadRequestException으로 응답한다.', async () => {
            await expect(
                service.register({...VALID_DTO, confirmPassword: "password01!"}),
            ).rejects.toThrow(BadRequestException);

            expect(prisma.emailVerification.findFirst).not.toHaveBeenCalled();
        })
    })

    describe('registerSendCode', () => {
        it('사용중인 이메일일 경우 ConflictException으로 응답한다.', async () => {
            prisma.user.findUnique.mockResolvedValue({id: 'user-1'} as any);

            await expect(
                service.registerSendCode({email: 'test@example.com'}),
            ).rejects.toThrow(ConflictException);
        })

    })

    describe('registerVerifyCode', () => {
        it('인증번호가 올바르지 않거나 만료되었을 경우 BadRequestException으로 응답한다.', async () => {
            prisma.emailVerification.findFirst.mockResolvedValue(null);

            await expect(
                service.registerVerifyCode({email: "testjest@test.com", code: "abc"}),
            ).rejects.toThrow(BadRequestException);
        })

    })

})