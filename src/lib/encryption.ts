import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ENCRYPTION_KEY environment variable is required in production. " +
        "Set it to a 64-character hex string (32 bytes)."
      );
    }
    // Dev-only fallback — never use in production
    return crypto.scryptSync("nexabook-default-dev-key", "salt", 32);
  }
  return Buffer.from(key, "hex");
}

export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext (all hex)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decryptToken(encryptedPayload: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encrypted] = encryptedPayload.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

export function isEncrypted(value: string): boolean {
  // Encrypted values have format: hex:hex:hex (iv:authTag:ciphertext)
  const parts = value.split(":");
  return parts.length === 3 && parts.every((p) => /^[0-9a-f]+$/i.test(p));
}
