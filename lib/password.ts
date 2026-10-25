import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  pw: string,
  salt: Buffer,
  len: number,
) => Promise<Buffer>;

// format: scrypt$<salt b64>$<hash b64>  (scripts/crear-usuario.mjs writes the same format)
export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("base64")}$${(await scryptAsync(pw, salt, 64)).toString("base64")}`;
}

export async function verificarPassword(pw: string, stored: string) {
  const [alg, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const esperado = Buffer.from(hash, "base64");
  const real = await scryptAsync(
    pw,
    Buffer.from(salt, "base64"),
    esperado.length,
  );
  return timingSafeEqual(real, esperado);
}

// verified when the user does not exist, so "unknown user" and "wrong password" take the same time
export const HASH_FALSO = hashPassword("no-such-user");
