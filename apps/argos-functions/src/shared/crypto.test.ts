import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptApiKey, encryptApiKey } from "./crypto.js";

const MASTER_KEY = randomBytes(32);

describe("encryptApiKey / decryptApiKey", () => {
	it("round-trips plaintext correctly", () => {
		const enc = encryptApiKey("sk-super-secret-key", "org-abc", MASTER_KEY, "user-1");
		const dec = decryptApiKey(enc, "org-abc", MASTER_KEY);
		expect(dec.toString("utf-8")).toBe("sk-super-secret-key");
		dec.fill(0);
	});

	it("version is 1 and algorithm is AES-256-GCM", () => {
		const enc = encryptApiKey("test-key", "org-1", MASTER_KEY, "user-1");
		expect(enc.version).toBe(1);
		expect(enc.algorithm).toBe("AES-256-GCM");
	});

	it("maskedSuffix contains last 4 characters of plaintext", () => {
		const enc = encryptApiKey("sk-abcdefghijklmnop-WXYZ", "org-1", MASTER_KEY, "user-1");
		expect(enc.maskedSuffix).toBe("WXYZ");
	});

	it("maskedSuffix is the full key when key is shorter than 4 chars", () => {
		const enc = encryptApiKey("abc", "org-1", MASTER_KEY, "user-1");
		expect(enc.maskedSuffix).toBe("abc");
	});

	it("encryptedBy is set from parameter", () => {
		const enc = encryptApiKey("test-key", "org-1", MASTER_KEY, "admin-user-42");
		expect(enc.encryptedBy).toBe("admin-user-42");
	});

	it("encryptedAt is a valid ISO UTC timestamp", () => {
		const before = new Date().toISOString();
		const enc = encryptApiKey("test-key", "org-1", MASTER_KEY, "user-1");
		const after = new Date().toISOString();
		expect(enc.encryptedAt >= before).toBe(true);
		expect(enc.encryptedAt <= after).toBe(true);
	});

	it("each encryption produces a different IV", () => {
		const enc1 = encryptApiKey("same-key", "org-1", MASTER_KEY, "user-1");
		const enc2 = encryptApiKey("same-key", "org-1", MASTER_KEY, "user-1");
		expect(enc1.iv).not.toBe(enc2.iv);
	});

	it("each encryption produces different ciphertext due to random IV", () => {
		const enc1 = encryptApiKey("same-key", "org-1", MASTER_KEY, "user-1");
		const enc2 = encryptApiKey("same-key", "org-1", MASTER_KEY, "user-1");
		expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
	});

	it("different orgId produces different ciphertext (HKDF salt isolation)", () => {
		const enc1 = encryptApiKey("same-key", "org-alpha", MASTER_KEY, "user-1");
		const enc2 = encryptApiKey("same-key", "org-beta", MASTER_KEY, "user-1");
		expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
	});

	it("decryption fails when ciphertext is tampered", () => {
		const enc = encryptApiKey("test-key", "org-1", MASTER_KEY, "user-1");
		const tampered = { ...enc, ciphertext: Buffer.from("AAAAAAAAAAAAAAAA").toString("base64") };
		expect(() => decryptApiKey(tampered, "org-1", MASTER_KEY)).toThrow();
	});

	it("decryption fails when authTag is tampered", () => {
		const enc = encryptApiKey("test-key", "org-1", MASTER_KEY, "user-1");
		const tampered = { ...enc, authTag: Buffer.from("AAAAAAAAAAAAAAAA").toString("base64") };
		expect(() => decryptApiKey(tampered, "org-1", MASTER_KEY)).toThrow();
	});

	it("decryption fails when IV is tampered", () => {
		const enc = encryptApiKey("test-key", "org-1", MASTER_KEY, "user-1");
		const tampered = { ...enc, iv: randomBytes(12).toString("base64") };
		expect(() => decryptApiKey(tampered, "org-1", MASTER_KEY)).toThrow();
	});

	it("decryption fails when wrong orgId is used", () => {
		const enc = encryptApiKey("test-key", "org-correct", MASTER_KEY, "user-1");
		expect(() => decryptApiKey(enc, "org-wrong", MASTER_KEY)).toThrow();
	});

	it("decryption fails when wrong masterKey is used", () => {
		const enc = encryptApiKey("test-key", "org-1", MASTER_KEY, "user-1");
		const wrongKey = randomBytes(32);
		expect(() => decryptApiKey(enc, "org-1", wrongKey)).toThrow();
	});

	it("ciphertext, iv, authTag are valid base64 strings", () => {
		const enc = encryptApiKey("test-key-value", "org-1", MASTER_KEY, "user-1");
		expect(() => Buffer.from(enc.ciphertext, "base64")).not.toThrow();
		expect(() => Buffer.from(enc.iv, "base64")).not.toThrow();
		expect(() => Buffer.from(enc.authTag, "base64")).not.toThrow();
	});

	it("IV is 12 bytes (96-bit, standard for AES-GCM)", () => {
		const enc = encryptApiKey("test-key", "org-1", MASTER_KEY, "user-1");
		expect(Buffer.from(enc.iv, "base64")).toHaveLength(12);
	});

	it("authTag is 16 bytes (128-bit, maximum GCM tag length)", () => {
		const enc = encryptApiKey("test-key", "org-1", MASTER_KEY, "user-1");
		expect(Buffer.from(enc.authTag, "base64")).toHaveLength(16);
	});

	it("encrypts empty string without error", () => {
		const enc = encryptApiKey("", "org-1", MASTER_KEY, "user-1");
		const dec = decryptApiKey(enc, "org-1", MASTER_KEY);
		expect(dec.toString("utf-8")).toBe("");
		dec.fill(0);
	});

	it("encrypts long key (512 chars) without error", () => {
		const longKey = "x".repeat(512);
		const enc = encryptApiKey(longKey, "org-1", MASTER_KEY, "user-1");
		const dec = decryptApiKey(enc, "org-1", MASTER_KEY);
		expect(dec.toString("utf-8")).toBe(longKey);
		dec.fill(0);
	});
});
