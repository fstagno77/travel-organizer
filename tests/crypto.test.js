/**
 * Tests for crypto.js Netlify Function
 * AES-256-GCM encrypt/decrypt round-trip and handler
 */

const crypto = require('crypto');

// Generate a dummy 32-byte key (64 hex chars) for testing
const TEST_KEY = crypto.randomBytes(32).toString('hex');

// Mock auth
const mockAuthenticateRequest = jest.fn();

jest.mock('../netlify/functions/utils/auth', () => ({
  authenticateRequest: (...args) => mockAuthenticateRequest(...args),
  unauthorizedResponse: () => ({
    statusCode: 401,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: false, error: 'Unauthorized' })
  }),
  getCorsHeaders: () => ({
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }),
  handleOptions: () => ({ statusCode: 200, headers: {}, body: '' })
}));

// Set env before requiring the handler
const originalEnv = process.env.ENCRYPTION_KEY;

beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY;
});

afterAll(() => {
  if (originalEnv !== undefined) {
    process.env.ENCRYPTION_KEY = originalEnv;
  } else {
    delete process.env.ENCRYPTION_KEY;
  }
});

const { handler } = require('../netlify/functions/crypto');

function makeEvent(body, method = 'POST', authorized = true) {
  if (authorized) {
    mockAuthenticateRequest.mockResolvedValue({ user: { id: 'user-1' }, supabase: {} });
  } else {
    mockAuthenticateRequest.mockResolvedValue(null);
  }

  return {
    httpMethod: method,
    headers: { authorization: 'Bearer test-token' },
    body: JSON.stringify(body)
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ============ TESTS ============

describe('crypto handler', () => {

  describe('HTTP method handling', () => {
    test('returns 200 for OPTIONS', async () => {
      const event = { httpMethod: 'OPTIONS', headers: {} };
      const res = await handler(event);
      expect(res.statusCode).toBe(200);
    });

    test('returns 405 for GET', async () => {
      const event = makeEvent({}, 'GET');
      const res = await handler(event);
      expect(res.statusCode).toBe(405);
    });

    test('returns 401 for unauthenticated request', async () => {
      const event = makeEvent({ action: 'encrypt', data: 'test' }, 'POST', false);
      const res = await handler(event);
      expect(res.statusCode).toBe(401);
    });
  });

  describe('input validation', () => {
    test('returns 400 when action is missing', async () => {
      const event = makeEvent({ data: 'test' });
      const res = await handler(event);
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe('action and data are required');
    });

    test('returns 400 when data is missing', async () => {
      const event = makeEvent({ action: 'encrypt' });
      const res = await handler(event);
      expect(res.statusCode).toBe(400);
    });

    test('returns 400 for invalid action', async () => {
      const event = makeEvent({ action: 'hash', data: 'test' });
      const res = await handler(event);
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain('Invalid action');
    });
  });

  describe('encrypt/decrypt round-trip', () => {
    test('encrypts and decrypts simple text', async () => {
      const plaintext = 'AB1234567';

      // Encrypt
      const encryptEvent = makeEvent({ action: 'encrypt', data: plaintext });
      const encryptRes = await handler(encryptEvent);
      expect(encryptRes.statusCode).toBe(200);
      const encrypted = JSON.parse(encryptRes.body).result;
      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(plaintext);

      // Decrypt
      const decryptEvent = makeEvent({ action: 'decrypt', data: encrypted });
      const decryptRes = await handler(decryptEvent);
      expect(decryptRes.statusCode).toBe(200);
      expect(JSON.parse(decryptRes.body).result).toBe(plaintext);
    });

    test('encrypted format is iv:authTag:ciphertext (hex)', async () => {
      const event = makeEvent({ action: 'encrypt', data: 'passport-number' });
      const res = await handler(event);
      const encrypted = JSON.parse(res.body).result;

      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);

      // IV should be 12 bytes = 24 hex chars
      expect(parts[0]).toHaveLength(24);
      // Auth tag should be 16 bytes = 32 hex chars
      expect(parts[1]).toHaveLength(32);
      // Ciphertext should be non-empty hex
      expect(parts[2].length).toBeGreaterThan(0);
      expect(/^[0-9a-f]+$/.test(parts[0])).toBe(true);
      expect(/^[0-9a-f]+$/.test(parts[1])).toBe(true);
      expect(/^[0-9a-f]+$/.test(parts[2])).toBe(true);
    });

    test('same plaintext produces different ciphertexts (random IV)', async () => {
      const event1 = makeEvent({ action: 'encrypt', data: 'same-data' });
      const event2 = makeEvent({ action: 'encrypt', data: 'same-data' });

      const res1 = await handler(event1);
      const res2 = await handler(event2);

      const enc1 = JSON.parse(res1.body).result;
      const enc2 = JSON.parse(res2.body).result;

      expect(enc1).not.toBe(enc2);

      // But both should decrypt to the same value
      const dec1 = await handler(makeEvent({ action: 'decrypt', data: enc1 }));
      const dec2 = await handler(makeEvent({ action: 'decrypt', data: enc2 }));
      expect(JSON.parse(dec1.body).result).toBe('same-data');
      expect(JSON.parse(dec2.body).result).toBe('same-data');
    });

    test('handles unicode text', async () => {
      const plaintext = 'Passaporto di Brignone Agata — N° 12345';

      const encRes = await handler(makeEvent({ action: 'encrypt', data: plaintext }));
      const encrypted = JSON.parse(encRes.body).result;

      const decRes = await handler(makeEvent({ action: 'decrypt', data: encrypted }));
      expect(JSON.parse(decRes.body).result).toBe(plaintext);
    });

    test('handles empty string', async () => {
      // Empty string is falsy so handler returns 400
      const event = makeEvent({ action: 'encrypt', data: '' });
      const res = await handler(event);
      expect(res.statusCode).toBe(400);
    });
  });

  describe('decrypt error handling', () => {
    test('returns 500 for invalid encrypted format (wrong parts)', async () => {
      const event = makeEvent({ action: 'decrypt', data: 'not-valid-format' });
      const res = await handler(event);
      expect(res.statusCode).toBe(500);
    });

    test('returns 500 for tampered ciphertext', async () => {
      // Encrypt a value first
      const encRes = await handler(makeEvent({ action: 'encrypt', data: 'secret' }));
      const encrypted = JSON.parse(encRes.body).result;
      const parts = encrypted.split(':');

      // Tamper with the ciphertext
      const tampered = `${parts[0]}:${parts[1]}:${'ff'.repeat(parts[2].length / 2)}`;
      const decRes = await handler(makeEvent({ action: 'decrypt', data: tampered }));
      expect(decRes.statusCode).toBe(500);
    });

    test('returns 500 for tampered auth tag', async () => {
      const encRes = await handler(makeEvent({ action: 'encrypt', data: 'secret' }));
      const encrypted = JSON.parse(encRes.body).result;
      const parts = encrypted.split(':');

      const tampered = `${parts[0]}:${'00'.repeat(16)}:${parts[2]}`;
      const decRes = await handler(makeEvent({ action: 'decrypt', data: tampered }));
      expect(decRes.statusCode).toBe(500);
    });
  });

  describe('ENCRYPTION_KEY validation', () => {
    test('fails when key is wrong length', async () => {
      const savedKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'tooshort';

      const event = makeEvent({ action: 'encrypt', data: 'test' });
      const res = await handler(event);
      expect(res.statusCode).toBe(500);

      process.env.ENCRYPTION_KEY = savedKey;
    });

    test('fails when key is missing', async () => {
      const savedKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      const event = makeEvent({ action: 'encrypt', data: 'test' });
      const res = await handler(event);
      expect(res.statusCode).toBe(500);

      process.env.ENCRYPTION_KEY = savedKey;
    });
  });
});

describe('Plaintext passthrough pattern', () => {
  test('values without colon are considered plaintext (frontend logic)', () => {
    // This tests the pattern used in auth.js decryptData:
    // if the value doesn't contain ':', skip decryption
    const plainValue = 'AB1234567';
    const encryptedValue = 'aabb00112233:00112233aabbccdd00112233aabbccdd:ff00';

    expect(plainValue.includes(':')).toBe(false);
    expect(encryptedValue.includes(':')).toBe(true);
    expect(encryptedValue.split(':')).toHaveLength(3);
  });
});
