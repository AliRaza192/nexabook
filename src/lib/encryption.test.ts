import { describe, it, expect, vi, beforeEach } from "vitest";
import { encryptToken, decryptToken, isEncrypted } from "./encryption";

describe("encryption", () => {
  it("encrypts and decrypts a token", () => {
    const original = "sk_test_1234567890abcdef";
    const encrypted = encryptToken(original);

    expect(encrypted).not.toBe(original);
    expect(isEncrypted(encrypted)).toBe(true);

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(original);
  });

  it("produces different ciphertext for same plaintext (random IV)", () => {
    const original = "same_token";
    const enc1 = encryptToken(original);
    const enc2 = encryptToken(original);

    // Different ciphertexts due to random IV
    expect(enc1).not.toBe(enc2);
    // But both decrypt to same value
    expect(decryptToken(enc1)).toBe(original);
    expect(decryptToken(enc2)).toBe(original);
  });

  it("isEncrypted returns false for non-encrypted strings", () => {
    expect(isEncrypted("sk_test_123")).toBe(false);
    expect(isEncrypted("hello")).toBe(false);
    expect(isEncrypted("")).toBe(false);
    expect(isEncrypted("abc:def")).toBe(false); // only 2 parts
  });

  it("isEncrypted returns true for encrypted format", () => {
    const encrypted = encryptToken("test");
    expect(isEncrypted(encrypted)).toBe(true);
  });
});
