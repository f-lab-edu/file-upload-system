export const PASSWORD_HASH = 10;
export const PER_SECOND = 1000;
export const PER_MINUTE = 60_000;

export function random6DigitCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  export function codeExpiryResponseFields(ms: number): {
    expiresInSeconds: number;
    expiresInMinutes: number;
  } {
    return {
      expiresInSeconds: Math.ceil(ms / PER_SECOND),
      expiresInMinutes: Math.floor(ms / PER_MINUTE),
    };
  }
  export function formatCodeValidityForMail(ms: number): string {
    const sec = Math.ceil(ms / PER_SECOND);
    if (ms < PER_MINUTE) {
      return `${sec}초`;
    }
    return `${Math.floor(ms / PER_MINUTE)}분`;
  }

  