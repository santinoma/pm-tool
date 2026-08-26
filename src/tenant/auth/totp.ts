import { createHmac, randomBytes } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function buildOtpAuthUri(secret: string, accountLabel: string, issuer: string): string {
  const encodedLabel = encodeURIComponent(`${issuer}:${accountLabel}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: String(TOTP_DIGITS), period: String(TOTP_STEP_SECONDS) });
  return `otpauth://totp/${encodedLabel}?${params.toString()}`;
}

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function computeCodeForCounter(secret: string, counter: number): string {
  const secretBytes = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  counterBuffer.writeUInt32BE(counter >>> 0, 4);

  const digest = createHmac("sha1", secretBytes).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0xf;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const code = binary % 10 ** TOTP_DIGITS;
  return code.toString().padStart(TOTP_DIGITS, "0");
}

export function computeTotpCode(secret: string, timestamp: number = Date.now()): string {
  const counter = Math.floor(timestamp / 1000 / TOTP_STEP_SECONDS);
  return computeCodeForCounter(secret, counter);
}

/** Erlaubt ±1 Zeitfenster (30s) Toleranz für Uhrenversatz zwischen Client und Server. */
export function verifyTotpCode(secret: string, code: string, timestamp: number = Date.now()): boolean {
  const counter = Math.floor(timestamp / 1000 / TOTP_STEP_SECONDS);
  for (const offset of [-1, 0, 1]) {
    if (computeCodeForCounter(secret, counter + offset) === code) {
      return true;
    }
  }
  return false;
}
