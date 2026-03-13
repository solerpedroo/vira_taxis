/**
 * inject-env.js — Injetar variáveis de ambiente no HTML no build (Vercel / local).
 * Uso: node scripts/inject-env.js
 * Requer GOOGLE_MAPS_KEY em process.env (Vercel) ou no .env (local com dotenv).
 *
 * Na Vercel: em Settings → Environment Variables, crie GOOGLE_MAPS_KEY.
 * Build Command: npm run build | Output Directory: (deixe em branco ou .)
 *
 * Atenção: o script altera index.html no lugar. Se rodar build localmente,
 * não commite em seguida (a chave ficaria no repo). Para reverter: git checkout index.html
 */

const fs = require('fs');
const path = require('path');

// Carrega .env em desenvolvimento local (opcional)
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch {
  // dotenv não instalado — usa só process.env (ex.: Vercel)
}

const key = process.env.GOOGLE_MAPS_KEY;
if (!key || typeof key !== 'string' || !key.trim()) {
  console.error('inject-env: GOOGLE_MAPS_KEY não definida. Defina na Vercel (Settings → Environment Variables) ou no .env.');
  process.exit(1);
}

const htmlPath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

if (!html.includes('__GOOGLE_MAPS_KEY__')) {
  console.error('inject-env: Placeholder __GOOGLE_MAPS_KEY__ não encontrado em index.html.');
  process.exit(1);
}

html = html.replace(/__GOOGLE_MAPS_KEY__/g, key.trim());
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('inject-env: GOOGLE_MAPS_KEY injetada em index.html.');
