import crypto from "crypto";

export function computeSecureHash(salt: string, params: Record<string, string>): string {
  const orderedKeys = Object.keys(params).sort();
  const concatenated = orderedKeys.map((k) => params[k]).join("&");
  const hashInput = salt + "&" + concatenated;
  return crypto.createHash("sha256").update(hashInput).digest("hex");
}
