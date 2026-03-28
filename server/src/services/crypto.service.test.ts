import { encrypt, decrypt } from './crypto.service';

const TEST_KEY = 'a'.repeat(64); // valid 64-char hex key

beforeEach(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY;
});

afterEach(() => {
  delete process.env.ENCRYPTION_KEY;
});

describe('CryptoService', () => {
  describe('encrypt', () => {
    it('returns a string in iv:authTag:ciphertext hex format', () => {
      const result = encrypt('hello');
      const parts = result.split(':');
      expect(parts).toHaveLength(3);
      // IV = 12 bytes = 24 hex chars
      expect(parts[0]).toHaveLength(24);
      // Auth tag = 16 bytes = 32 hex chars
      expect(parts[1]).toHaveLength(32);
      // Ciphertext is non-empty hex
      expect(parts[2].length).toBeGreaterThan(0);
      // All parts are valid hex
      parts.forEach((p) => expect(p).toMatch(/^[0-9a-f]+$/));
    });

    it('produces different ciphertexts for the same plaintext (random IV)', () => {
      const a = encrypt('same');
      const b = encrypt('same');
      expect(a).not.toBe(b);
    });
  });

  describe('decrypt', () => {
    it('round-trips a simple string', () => {
      expect(decrypt(encrypt('hello world'))).toBe('hello world');
    });

    it('round-trips an empty string', () => {
      expect(decrypt(encrypt(''))).toBe('');
    });

    it('round-trips a string with emoji', () => {
      const text = 'ciao 🎮🐉';
      expect(decrypt(encrypt(text))).toBe(text);
    });

    it('round-trips a long string', () => {
      const text = 'x'.repeat(10_000);
      expect(decrypt(encrypt(text))).toBe(text);
    });

    it('throws on invalid format (missing parts)', () => {
      expect(() => decrypt('bad')).toThrow('Invalid ciphertext format');
    });

    it('throws on tampered auth tag', () => {
      const enc = encrypt('secret');
      const parts = enc.split(':');
      // flip a hex char in the auth tag
      parts[1] = parts[1][0] === 'a' ? 'b' + parts[1].slice(1) : 'a' + parts[1].slice(1);
      expect(() => decrypt(parts.join(':'))).toThrow();
    });
  });

  describe('key validation', () => {
    it('throws when ENCRYPTION_KEY is missing', () => {
      delete process.env.ENCRYPTION_KEY;
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY must be a 64-character hex string');
    });

    it('throws when ENCRYPTION_KEY is too short', () => {
      process.env.ENCRYPTION_KEY = 'abcd';
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY must be a 64-character hex string');
    });
  });
});
