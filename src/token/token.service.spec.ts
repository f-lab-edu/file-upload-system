import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaService } from 'src/prisma/prisma.service';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let service: TokenService;
  let prisma: DeepMockProxy<PrismaService>;
  let jwt: DeepMockProxy<JwtService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    jwt = mockDeep<JwtService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });
  describe('signToken', () => {
    it('JwtService.sign을 호출하고 토큰을 반환한다', () => {
      jwt.sign.mockReturnValue('mocked.jwt.token');

      const result = service.signToken('testuserId', 'test@example.com');

      expect(jwt.sign).toHaveBeenCalledTimes(1);
      expect(result).toBe('mocked.jwt.token');
    });
  });
  describe('grantRefreshToken', () => {
    it('revokeExisting이 true이면 기존 토큰을 삭제하고 새 토큰을 발급한다', async () => {
      prisma.userRefreshToken.deleteMany.mockResolvedValue({ count: 1 });
      prisma.userRefreshToken.create.mockResolvedValue({} as any);

      const result = await service.grantRefreshToken('user_01', true);

      expect(prisma.userRefreshToken.deleteMany).toHaveBeenCalledTimes(1);
      expect(prisma.userRefreshToken.create).toHaveBeenCalledTimes(1);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('refreshSession', () => {
    it('refreshSession이 빈값이면 BadRequestException으로 응답한다.', async () => {
      await expect(service.refreshSession('   ')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
