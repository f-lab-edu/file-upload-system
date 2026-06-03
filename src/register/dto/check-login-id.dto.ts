import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CheckLoginIdDto {
  @IsString()
  @MinLength(4, { message: '아이디는 4자 이상이어야 합니다.' })
  @MaxLength(20, { message: '아이디는 20자 이하이어야 합니다.' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: '아이디 형식이 올바르지 않습니다.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  loginId: string;
}
