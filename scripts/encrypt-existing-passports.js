/**
 * One-time migration script: encrypt existing plaintext passport numbers
 * Run with: node scripts/encrypt-existing-passports.js
 */

require('dotenv').config();
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function encrypt(text) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function isAlreadyEncrypted(value) {
  if (!value) return false;
  const parts = value.split(':');
  return parts.length === 3 && parts[0].length === 24 && parts[1].length === 32;
}

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Fetch all travelers with a passport_number
  const { data: travelers, error } = await supabase
    .from('travelers')
    .select('id, passport_number')
    .not('passport_number', 'is', null);

  if (error) {
    console.error('Error fetching travelers:', error);
    process.exit(1);
  }

  console.log(`Found ${travelers.length} travelers with passport_number`);

  let encrypted = 0;
  let skipped = 0;

  for (const t of travelers) {
    if (!t.passport_number || t.passport_number.trim() === '') {
      skipped++;
      continue;
    }

    if (isAlreadyEncrypted(t.passport_number)) {
      console.log(`  [skip] ${t.id} - already encrypted`);
      skipped++;
      continue;
    }

    const encryptedValue = encrypt(t.passport_number);
    const { error: updateError } = await supabase
      .from('travelers')
      .update({ passport_number: encryptedValue })
      .eq('id', t.id);

    if (updateError) {
      console.error(`  [error] ${t.id}:`, updateError);
    } else {
      console.log(`  [ok] ${t.id} - encrypted`);
      encrypted++;
    }
  }

  console.log(`\nDone: ${encrypted} encrypted, ${skipped} skipped`);
}

main();
