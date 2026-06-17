export const PURPOSE_FIND_LOGIN_ID = 'FIND_LOGIN_ID';

export const PURPOSE_REGISTER_CODE = 'REGISTER_CODE';
export const PURPOSE_REGISTER_TOKEN = 'REGISTER_TOKEN';

export const FIND_ID_CODE_TTL_MS = 30 * 1000;
export const REGISTER_CODE_TTL_MS = 30 * 1000;
export const REGISTER_TOKEN_TTL_MS = 30 * 60 * 1000;
export const RESET_PASSWORD_CODE_TTL_MS = 30 * 1000;
export const RESET_PASSWORD_TOKEN_TTL_MS = 30 * 60 * 1000;

/** 마이페이지 이메일 변경: 사용자별로 purpose에 userId를 붙여 구분 */
export function purposeUpdateEmailCode(userId: string): string {
  return `UPDATE_EMAIL_CODE:${userId}`;
}

export function purposeUpdateEmailToken(userId: string): string {
  return `UPDATE_EMAIL_TOKEN:${userId}`;
}

/** 비밀번호 재설정: 비로그인 흐름이라 loginId를 purpose에 붙여 구분 */
export function purposeResetPasswordCode(loginId: string): string {
  return `RESET_PASSWORD_CODE:${loginId}`;
}

export function purposeResetPasswordToken(loginId: string): string {
  return `RESET_PASSWORD_TOKEN:${loginId}`;
}
