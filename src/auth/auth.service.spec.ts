import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep } from 'jest-mock-extended';
import { DriveService } from 'src/drive/drive.service';
import { IMailService, MAIL_INTERFACE } from 'src/mail/mail.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { TokenService } from '../token/token.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
        { provide: JwtService, useValue: mockDeep<JwtService>() },
        { provide: MAIL_INTERFACE, useValue: mockDeep<IMailService>() },
        { provide: DriveService, useValue: mockDeep<DriveService>() },
        { provide: TokenService, useValue: mockDeep<TokenService>() },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
