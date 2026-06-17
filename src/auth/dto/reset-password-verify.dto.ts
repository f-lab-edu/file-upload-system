import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ResetPasswordVerifyDto {
  @IsString()
  @MinLength(4, { message: '아이디를 입력해 주세요.' })
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: '아이디 형식이 올바르지 않습니다.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  loginId: string;

  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6, { message: '인증번호 6자리를 입력해 주세요.' })
  @Matches(/^\d{6}$/, { message: '인증번호는 숫자 6자리입니다.' })
  code: string;
}
