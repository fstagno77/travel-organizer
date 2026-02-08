/**
 * Netlify Function: Encrypt/Decrypt sensitive data
 * Uses AES-256-GCM for authenticated encryption
 * Requires ENCRYPTION_KEY env var (64 hex chars = 32 bytes)
 */

const crypto = require('crypto');
const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions } = require('./utils/auth');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended IV length
const AUTH_TAG_LENGTH = 16;

function getKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string');
  }
  return Buffer.from(key, 'hex');
}

function encrypt(text) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  // Format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(encryptedText) {
  const key = getKey();
  const parts = encryptedText.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const ciphertext = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

exports.handler = async (event) => {
  const headers = getCorsHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Require authentication
  const authResult = await authenticateRequest(event);
  if (!authResult) {
    return unauthorizedResponse();
  }

  try {
    const { action, data } = JSON.parse(event.body || '{}');

    if (!action || !data) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'action and data are required' })
      };
    }

    if (action === 'encrypt') {
      const result = encrypt(data);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, result })
      };
    }

    if (action === 'decrypt') {
      const result = decrypt(data);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, result })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid action. Use "encrypt" or "decrypt"' })
    };

  } catch (error) {
    console.error('Crypto error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Encryption operation failed' })
    };
  }
};
