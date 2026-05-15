import { createHash, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;
const SCRYPT_PREFIX = "scrypt";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;

  return `${SCRYPT_PREFIX}:${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  if (storedHash.startsWith(`${SCRYPT_PREFIX}:`)) {
    const [, salt, storedKeyHex] = storedHash.split(":");
    if (!salt || !storedKeyHex) {
      return false;
    }

    const storedKey = Buffer.from(storedKeyHex, "hex");
    const suppliedKey = (await scryptAsync(password, salt, storedKey.length)) as Buffer;

    return (
      storedKey.length === suppliedKey.length &&
      timingSafeEqual(storedKey, suppliedKey)
    );
  }

  const legacyHash = createHash("sha256").update(password).digest("hex");
  const storedKey = Buffer.from(storedHash, "hex");
  const suppliedKey = Buffer.from(legacyHash, "hex");

  return (
    storedKey.length === suppliedKey.length &&
    timingSafeEqual(storedKey, suppliedKey)
  );
}

export function isLegacyPasswordHash(storedHash: string): boolean {
  return !storedHash.startsWith(`${SCRYPT_PREFIX}:`);
}
