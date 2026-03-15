/**
 * Salva la sessione Supabase copiata dal browser già loggato.
 *
 * UTILIZZO:
 *   node scripts/save-session.js
 *   (poi segui le istruzioni a schermo)
 */

const { writeFileSync } = require('fs');
const { join } = require('path');
const readline = require('readline');

const AUTH_STATE_FILE = join(__dirname, '.auth-state.json');
const BASE_URL = 'http://localhost:8888';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log('');
console.log('══════════════════════════════════════════════════');
console.log('  ESPORTAZIONE SESSIONE DA CHROME');
console.log('══════════════════════════════════════════════════');
console.log('');
console.log('1. Apri Chrome sul tuo browser normale');
console.log(`2. Vai su: ${BASE_URL}`);
console.log('   (assicurati di essere loggato)');
console.log('');
console.log('3. Apri DevTools → Console  (Cmd+Option+J)');
console.log('');
console.log('4. Incolla questo comando e premi INVIO:');
console.log('');
console.log('─────────────────────────────────────────────────');
console.log(`copy(JSON.stringify({cookies:[],origins:[{origin:location.origin,localStorage:Object.entries(localStorage).map(([name,value])=>({name,value}))}]}))`);
console.log('─────────────────────────────────────────────────');
console.log('');
console.log('5. La sessione è ora negli appunti.');
console.log('   Incollala qui sotto e premi INVIO:');
console.log('');

rl.question('> ', (input) => {
  rl.close();
  const raw = input.trim();
  if (!raw) {
    console.error('❌ Nessun input ricevuto.');
    process.exit(1);
  }
  try {
    const state = JSON.parse(raw);
    // Verifica che contenga almeno un token Supabase
    const lsEntries = state?.origins?.[0]?.localStorage || [];
    const hasToken = lsEntries.some(e => e.name.includes('supabase') || e.name.includes('auth'));
    if (!hasToken) {
      console.warn('⚠ Nessun token Supabase trovato — sei loggato sul browser?');
    }
    writeFileSync(AUTH_STATE_FILE, JSON.stringify(state, null, 2));
    console.log('');
    console.log(`✅ Sessione salvata in scripts/.auth-state.json`);
    console.log('   Ora esegui: npm run screenshots');
  } catch (e) {
    console.error('❌ JSON non valido:', e.message);
    process.exit(1);
  }
});
