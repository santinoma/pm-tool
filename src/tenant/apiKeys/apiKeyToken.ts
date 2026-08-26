import { createHash, randomBytes } from "node:crypto";

const TOKEN_PREFIX = "pmtool_";
const TOKEN_BYTES = 24;
const DISPLAY_PREFIX_LENGTH = 12;

export interface GeneratedApiKey {
  token: string;
  tokenHash: string;
  tokenPrefix: string;
}

export function generateApiKey(): GeneratedApiKey {
  const token = `${TOKEN_PREFIX}${randomBytes(TOKEN_BYTES).toString("hex")}`;
  return {
    token,
    tokenHash: hashApiKeyToken(token),
    tokenPrefix: token.slice(0, DISPLAY_PREFIX_LENGTH),
  };
}

export function hashApiKeyToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
