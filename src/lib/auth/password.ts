import "server-only";
import { hash, verify } from "@node-rs/argon2";

// OWASP Recommended settings for argon2id: m=19 MiB (19456 KiB), t=2, p=1
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

// Pre-computed dummy hash to ensure constant-time response for nonexistent accounts
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$Q2hhbmdlTWUtRGVtbw$9wE3p50P0q8rZq3z5L5j5g2g0p8rZq3z5L5j5g2g0p8";

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(
  plain: string,
  storedHash: string | null | undefined
): Promise<boolean> {
  if (!storedHash) {
    // Perform dummy verify to mitigate timing enumeration attacks
    try {
      await verify(DUMMY_HASH, plain);
    } catch {
      // ignore
    }
    return false;
  }

  try {
    return await verify(storedHash, plain);
  } catch (err) {
    return false;
  }
}
