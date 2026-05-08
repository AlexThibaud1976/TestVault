import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

export interface EncryptedApiKey {
	version: 1;
	algorithm: "AES-256-GCM";
	ciphertext: string;
	iv: string;
	authTag: string;
	maskedSuffix: string;
	encryptedAt: string;
	encryptedBy: string;
}

function deriveOrgKey(masterKey: Buffer, orgId: string): Buffer {
	const salt = Buffer.from(orgId, "utf-8");
	const info = Buffer.from("argos-llm-byok-v1", "utf-8");
	return Buffer.from(hkdfSync("sha256", masterKey, salt, info, 32));
}

export function encryptApiKey(
	plaintext: string,
	orgId: string,
	masterKey: Buffer,
	encryptedBy: string
): EncryptedApiKey {
	const orgKey = deriveOrgKey(masterKey, orgId);
	const iv = randomBytes(12);
	try {
		const cipher = createCipheriv("aes-256-gcm", orgKey, iv);
		const ciphertext = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
		const authTag = cipher.getAuthTag();
		return {
			version: 1,
			algorithm: "AES-256-GCM",
			ciphertext: ciphertext.toString("base64"),
			iv: iv.toString("base64"),
			authTag: authTag.toString("base64"),
			maskedSuffix: plaintext.slice(-4),
			encryptedAt: new Date().toISOString(),
			encryptedBy,
		};
	} finally {
		orgKey.fill(0);
	}
}

export function decryptApiKey(
	encrypted: EncryptedApiKey,
	orgId: string,
	masterKey: Buffer
): Buffer {
	const orgKey = deriveOrgKey(masterKey, orgId);
	try {
		const decipher = createDecipheriv("aes-256-gcm", orgKey, Buffer.from(encrypted.iv, "base64"));
		decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));
		return Buffer.concat([
			decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
			decipher.final(),
		]);
	} finally {
		orgKey.fill(0);
	}
}
