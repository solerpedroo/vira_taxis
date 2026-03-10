/**
 * whatsapp.js
 * Monta a mensagem e redireciona ao WhatsApp.
 * Valor interno (pricing) vai para a equipe — nunca exibido ao cliente.
 *
 * SEGURANÇA:
 * - Todos os inputs do usuário são sanitizados antes de compor a mensagem
 * - A URL gerada é validada antes de qualquer redirect
 * - pricePerKm NUNCA é exposto ao cliente
 */

const WhatsApp = (() => {

  const WHATSAPP_NUMBER = '5519991865431'; // Campinas DDD 19

  /** Valida que o número é somente dígitos (proteção contra injeção) */
  function _safeNumber(num) {
    return String(num).replace(/\D/g, '');
  }

  function _fmtDate(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return 'Não informada';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  /** Sanitiza texto para uso em mensagem WhatsApp (texto puro, não HTML) */
  function _s(value) {
    return Validations.sanitizeText(String(value ?? ''));
  }

  function buildMessage(data) {
    // Sanitiza todos os campos antes de usar
    const name        = _s(data.name);
    const phone       = _s(data.phone);
    const origin      = _s(data.origin);
    const destination = _s(data.destination);
    const date        = _fmtDate(data.date);
    const time        = _s(data.time) || 'Não informado';
    const passengers  = Math.max(1, Math.min(6, parseInt(data.passengers, 10) || 1));
    const luggage     = Math.max(0, Math.min(20, parseInt(data.luggage, 10) || 0));

    const vehicle  = data.requiresVan ? '🚗 Carro 7 lugares' : '🚗 Sedan';
    const vanFlag  = data.requiresVan ? '\n   ⚠️ _Carro 7 lugares necessário para o grupo_' : '';
    const kmLine   = (data.estimatedKm && Number.isFinite(data.estimatedKm))
      ? `\n📏 *Distância:* ~${Math.ceil(data.estimatedKm)} km`
      : '';

    // Referência interna — somente para a equipe
    // pricePerKm é omitido intencionalmente para não expor ao cliente
    const internal = (data.total && Number.isFinite(data.total))
      ? `\n\n━━━━━━━━━━━━━━━━━━━━\n`
        + `📋 *EQUIPE — referência interna*\n`
        + `   Estimativa: ${Pricing.formatBRL(data.total)}\n`
        + `   _(confirme antes de responder ao cliente)_`
      : '';

    return (
      `Olá, ViraTáxis! 👋\n\n`
    + `Gostaria de agendar uma viagem em Campinas:\n\n`
    + `━━━━━━━━━━━━━━━━━━━━\n`
    + `👤 *Nome:* ${name}\n`
    + `📱 *Telefone:* ${phone}\n`
    + `━━━━━━━━━━━━━━━━━━━━\n`
    + `📍 *Origem:* ${origin}\n`
    + `🏁 *Destino:* ${destination}\n`
    + kmLine + `\n`
    + `━━━━━━━━━━━━━━━━━━━━\n`
    + `📅 *Data:* ${date}\n`
    + `🕐 *Horário:* ${time}\n`
    + `━━━━━━━━━━━━━━━━━━━━\n`
    + `👥 *Passageiros:* ${passengers}\n`
    + `🧳 *Bagagens:* ${luggage}\n`
    + `${vehicle}${vanFlag}\n`
    + `━━━━━━━━━━━━━━━━━━━━\n\n`
    + `Aguardo confirmação. Obrigado! 🙏`
    + internal
    );
  }

  function getUrl(data) {
    const safeNumber = _safeNumber(WHATSAPP_NUMBER);
    // Valida que o número tem formato esperado de telefone BR
    if (!/^\d{12,13}$/.test(safeNumber)) {
      console.error('WhatsApp: número inválido');
      return '#';
    }
    const message = buildMessage(data);
    return `https://wa.me/${safeNumber}?text=${encodeURIComponent(message)}`;
  }

  function redirect(data) {
    const url = getUrl(data);
    if (url === '#') return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return { redirect, buildMessage, getUrl };

})();