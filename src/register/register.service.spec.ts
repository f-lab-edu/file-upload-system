import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from '../token/token.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterSendCodeDto } from './dto/register-send-code.dto';
import { RegisterVerifyCodeDto } from './dto/register-verify-code.dto';
import { RegisterService } from './register.service';

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

function createRegisterSendCodeDto(
  overrides: Partial<RegisterSendCodeDto> = {},
): RegisterSendCodeDto {
  return {
    email: 'test@example.com',
    ...overrides,
  };
}

function createRegisterVerifyCodeDto(
  overrides: Partial<RegisterVerifyCodeDto> = {},
): RegisterVerifyCodeDto {
  return {
    email: 'test@example.com',
    code: '123456',
    ...overrides,
  };
}
describe('RegisterService', () => {
  let service: RegisterService;
  let prisma: DeepMockProxy<PrismaService>;
  let token: DeepMockProxy<TokenService>;
  let mail: DeepMockProxy<MailService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    token = mockDeep<TokenService>();
    mail = mockDeep<MailService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterService,
        { provide: PrismaService, useValue: prisma },
        { provide: TokenService, useValue: token },
        { provide: MailService, useValue: mail },
      ],
    }).compile();
    service = module.get<RegisterService>(RegisterService);
  });
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

  describe('register', () => {
    it('password와 confirmPassword가 다르면 BadRequestException으로 응답한다.', async () => {
      await expect(
        service.register(
          createRegisterDto({
            password: 'Password1!',
            confirmPassword: 'password01!',
          }),
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.emailVerification.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('registerSendCode', () => {
    it('사용중인 이메일일 경우 ConflictException으로 응답한다.', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' } as any);

      await expect(
        service.registerSendCode(
          createRegisterSendCodeDto({ email: 'test@example.com' }),
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('registerVerifyCode', () => {
    it('인증번호가 올바르지 않거나 만료되었을 경우 BadRequestException으로 응답한다.', async () => {
      prisma.emailVerification.findFirst.mockResolvedValue(null);

      await expect(
        service.registerVerifyCode(
          createRegisterVerifyCodeDto({ code: '000000' }),
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
