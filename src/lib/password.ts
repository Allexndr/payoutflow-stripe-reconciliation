/**
 * Argon2id for new passwords; legacy bcrypt hashes still verify.
 * No top-level native imports — avoids Edge/middleware bundling issues (Turbopack).
 */
export async function hashPassword(plain: string): Promise<string> {
  const argon2 = (await import("argon2")).default;
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(
  hash: string,
  plain: string,
): Promise<boolean> {
  if (hash.startsWith("$argon2")) {
    try {
      const argon2 = (await import("argon2")).default;
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
  const { compare } = await import("bcryptjs");
  return compare(plain, hash);
}
