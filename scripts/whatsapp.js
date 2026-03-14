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

  const WHATSAPP_NUMBER = '5519988244480'; // Campinas DDD 19

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

    const vehicle = data.requiresVan ? '🚗 Carro 7 lugares' : '🚗 Sedan';

    const kmBlock = (data.estimatedKm && Number.isFinite(data.estimatedKm))
      ? `📏 Distância: ~${Math.ceil(data.estimatedKm)} km\n\n`
      : '';

    const estimateBlock = (data.total && Number.isFinite(data.total))
      ? `💰 *Estimativa:* ${Pricing.formatBRL(data.total)}\n\n`
      : '';

    return (
      `Olá, ViraTáxis! 👋\n\n`
    + `Gostaria de agendar uma viagem em Campinas:\n\n`
    + `👤 *Nome:* ${name}\n`
    + `📱 *Telefone:* ${phone}\n\n`
    + `📍 *Origem:* ${origin}\n`
    + `🏁 *Destino:* ${destination}\n\n`
    + kmBlock
    + `📅 *Data:* ${date}\n`
    + `🕐 *Horário:* ${time}\n\n`
    + `👥 *Passageiros:* ${passengers}\n`
    + `🧳 *Bagagens:* ${luggage}\n`
    + `${vehicle}\n\n`
    + estimateBlock
    + `Aguardo confirmação. Obrigado!`
    );
  }

  /**
   * Mensagem para cotação com rota fora do padrão (sem destinos pré-definidos).
   * Inclui aviso para a equipe avaliar e não inclui estimativa de distância/preço.
   */
  function buildMessageCustomRoute(data) {
    const name        = _s(data.name);
    const phone       = _s(data.phone);
    const origin      = _s(data.origin);
    const destination = _s(data.destination);
    const date        = _fmtDate(data.date);
    const time        = _s(data.time) || 'Não informado';
    const passengers  = Math.max(1, Math.min(6, parseInt(data.passengers, 10) || 1));
    const luggage     = Math.max(0, Math.min(20, parseInt(data.luggage, 10) || 0));
    const vehicle     = data.requiresVan ? '🚗 Carro 7 lugares' : '🚗 Sedan';

    return (
      `Olá, ViraTáxis! 👋\n\n`
    + `Gostaria de solicitar uma *cotação para uma rota que não está entre os endereços pré-definidos*:\n\n`
    + `⚠️ *Minha viagem não se enquadra em nenhum dos destinos listados.* Solicito que a equipe avalie a rota e retorne com uma cotação.\n\n`
    + `👤 *Nome:* ${name}\n`
    + `📱 *Telefone:* ${phone}\n\n`
    + `📍 *Origem:* ${origin}\n`
    + `🏁 *Destino:* ${destination}\n\n`
    + `📅 *Data:* ${date}\n`
    + `🕐 *Horário:* ${time}\n\n`
    + `👥 *Passageiros:* ${passengers}\n`
    + `🧳 *Bagagens:* ${luggage}\n`
    + `${vehicle}\n\n`
    + `Aguardo retorno. Obrigado!`
    );
  }

  function getUrl(data) {
    const safeNumber = _safeNumber(WHATSAPP_NUMBER);
    if (!/^\d{12,13}$/.test(safeNumber)) {
      console.error('WhatsApp: número inválido');
      return '#';
    }
    const message = buildMessage(data);
    return `https://wa.me/${safeNumber}?text=${encodeURIComponent(message)}`;
  }

  function getUrlCustomRoute(data) {
    const safeNumber = _safeNumber(WHATSAPP_NUMBER);
    if (!/^\d{12,13}$/.test(safeNumber)) {
      console.error('WhatsApp: número inválido');
      return '#';
    }
    const message = buildMessageCustomRoute(data);
    return `https://wa.me/${safeNumber}?text=${encodeURIComponent(message)}`;
  }

  function redirect(data) {
    const url = getUrl(data);
    if (url === '#') return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function redirectCustomRoute(data) {
    const url = getUrlCustomRoute(data);
    if (url === '#') return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return { redirect, redirectCustomRoute, buildMessage, buildMessageCustomRoute, getUrl, getUrlCustomRoute };

})();