import {
  IsEmail,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_POLICY_REGEX,
} from '../password-policy';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsString()
  @MinLength(4, { message: '아이디는 4자 이상이어야 합니다.' })
  @MaxLength(20, { message: '아이디는 20자 이하이어야 합니다.' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: '아이디는 영문, 숫자, 밑줄(_)만 4~20자까지 사용할 수 있습니다.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  loginId: string;

  @IsEmail()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  /** 이메일 인증 완료 후 발급된 토큰(64자리 16진수) */
  @IsString()
  @Length(64, 64, { message: '이메일 인증을 완료해 주세요.' })
  @Matches(/^[a-f0-9]{64}$/u, { message: '이메일 인증을 완료해 주세요.' })
  emailVerifyToken: string;

  @IsString()
  @Matches(PASSWORD_POLICY_REGEX, {
    message: PASSWORD_POLICY_MESSAGE,
  })
  password: string;

  @IsString()
  @Matches(PASSWORD_POLICY_REGEX, {
    message: PASSWORD_POLICY_MESSAGE,
  })
  confirmPassword: string;

  @IsString()
  @MinLength(1, { message: '이름을 입력해 주세요.' })
  name: string;
}
