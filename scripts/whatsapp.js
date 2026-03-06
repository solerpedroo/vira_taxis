/**
 * whatsapp.js
 * Monta a mensagem e redireciona ao WhatsApp.
 * Valor interno (pricing) vai para a equipe — nunca exibido ao cliente.
 */

const WhatsApp = (() => {

  const WHATSAPP_NUMBER = '5519991865431'; // Campinas DDD 19

  function _fmtDate(iso) {
    if (!iso) return 'Não informada';
    const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}`;
  }

  function buildMessage(data) {
    const vehicle  = data.requiresVan ? '🚗 Carro 7 lugares' : '🚗 Sedan';
    const vanFlag  = data.requiresVan ? '\n   ⚠️ _Van necessária para o grupo_' : '';
    const kmLine   = data.estimatedKm ? `\n📏 *Distância:* ~${data.estimatedKm} km` : '';

    // Referência interna — somente para a equipe (valor do cálculo)
    const internal = (data.total && data.pricePerKm)
      ? `\n\n━━━━━━━━━━━━━━━━━━━━\n`
        + `📋 *EQUIPE — referência interna*\n`
        + `   Tarifa: ${Pricing.formatBRL(data.pricePerKm)}/km\n`
        + `   Estimativa: ${Pricing.formatBRL(data.total)}\n`
        + `   _(confirme antes de responder ao cliente)_`
      : '';

    return (
      `Olá, Vira Táxis! 👋\n\n`
    + `Gostaria de agendar uma viagem em Campinas:\n\n`
    + `━━━━━━━━━━━━━━━━━━━━\n`
    + `👤 *Nome:* ${data.name}\n`
    + `📱 *Telefone:* ${data.phone}\n`
    + `━━━━━━━━━━━━━━━━━━━━\n`
    + `📍 *Origem:* ${data.origin}\n`
    + `🏁 *Destino:* ${data.destination}\n`
    + kmLine + `\n`
    + `━━━━━━━━━━━━━━━━━━━━\n`
    + `📅 *Data:* ${_fmtDate(data.date)}\n`
    + `🕐 *Horário:* ${data.time || 'Não informado'}\n`
    + `━━━━━━━━━━━━━━━━━━━━\n`
    + `👥 *Passageiros:* ${data.passengers}\n`
    + `🧳 *Bagagens:* ${data.luggage}\n`
    + `${vehicle}${vanFlag}\n`
    + `━━━━━━━━━━━━━━━━━━━━\n\n`
    + `Aguardo confirmação. Obrigado! 🙏`
    + internal
    );
  }

  function redirect(data) {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildMessage(data))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return { redirect, buildMessage };

})();