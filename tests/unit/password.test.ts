import { describe, expect, it } from "vitest";
import { createHash } from "crypto";
import {
  hashPassword,
  isLegacyPasswordHash,
  verifyPassword,
} from "../../src/infrastructure/auth/password.js";

describe("password hashing", () => {
  it("hashes and verifies passwords with scrypt", async () => {
    const hash = await hashPassword("correct-password");

    expect(hash).toMatch(/^scrypt:[a-f0-9]+:[a-f0-9]+$/);
    expect(isLegacyPasswordHash(hash)).toBe(false);
    await expect(verifyPassword("correct-password", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("verifies legacy sha256 hashes", async () => {
    const legacyHash = createHash("sha256").update("old-password").digest("hex");

    expect(isLegacyPasswordHash(legacyHash)).toBe(true);
    await expect(verifyPassword("old-password", legacyHash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", legacyHash)).resolves.toBe(false);
  });
});
