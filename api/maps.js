/**
 * api/maps.js — Vercel Serverless Function
 *
 * Serve o script do Google Maps sem expor a API Key no HTML.
 * A key vive em variável de ambiente (GOOGLE_MAPS_KEY) no painel da Vercel.
 *
 * Acesso: GET /api/maps
 */

export default async function handler(req, res) {
  const key = process.env.GOOGLE_MAPS_KEY;

  if (!key) {
    res.status(500).send('// Maps key not configured');
    return;
  }

  // Busca o script do Google diretamente no servidor — a key nunca vai ao browser
  const googleUrl =
    `https://maps.googleapis.com/maps/api/js` +
    `?key=${encodeURIComponent(key)}` +
    `&libraries=places` +
    `&callback=initGoogleMaps` +
    `&loading=async`;

  try {
    const upstream = await fetch(googleUrl);

    if (!upstream.ok) {
      res.status(502).send('// Maps upstream error');
      return;
    }

    const body = await upstream.text();

    // Cache por 1 hora (o script do Google raramente muda)
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    // Impede que o browser envie Referer com a URL completa
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.status(200).send(body);
  } catch (err) {
    res.status(500).send(`// Fetch error: ${err.message}`);
  }
}