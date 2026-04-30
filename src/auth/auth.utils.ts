import { randomInt } from 'node:crypto';

export const PASSWORD_HASH = 10;

export function random6DigitCode(): string {
  return String(randomInt(100000, 1000000));
}

  export function codeExpiryResponseFields(ms: number): {
    expiresInSeconds: number;
    expiresInMinutes: number;
  } {
    return {
      expiresInSeconds: Math.ceil(ms / 1000),
      expiresInMinutes: Math.floor(ms / 60_000),
    };
  }
  export function formatCodeValidityForMail(ms: number): string {
    const sec = Math.ceil(ms / 1000);
    if (ms < 60_000) {
      return `${sec}초`;
    }
    return `${Math.floor(ms / 60_000)}분`;
  }

  