/**
 * calculations.js
 * ────────────────────────────────────────────────────────
 * REGRA DE NEGÓCIO INTERNA
 * Os valores de tarifa por km JAMAIS devem ser exibidos ao
 * cliente na interface. Apenas o resultado final formatado
 * (ex: "R$ 42,00") pode ser mostrado — sem o cálculo.
 * ────────────────────────────────────────────────────────
 */

const Pricing = (() => {

  /* Tarifas internas — não expor ao cliente */
  const PRICE_PER_KM_SEDAN  = 1.5;   // R$/km — Sedan (1–4 pax)
  const PRICE_PER_KM_VAN    = 2.2;   // R$/km — Van 7 lugares (5–6 pax)
  const MAX_SEDAN_PASSENGERS = 4;
  const MIN_FARE = 20;               // Tarifa mínima

  function _tariff(passengers) {
    return passengers > MAX_SEDAN_PASSENGERS
      ? { pricePerKm: PRICE_PER_KM_VAN,   vehicleLabel: 'Carro 7 lugares', vehicleIcon: 'fa-van-shuttle', requiresVan: true  }
      : { pricePerKm: PRICE_PER_KM_SEDAN, vehicleLabel: 'Sedan',           vehicleIcon: 'fa-car',         requiresVan: false };
  }

  /**
   * Calcula o valor estimado (USO INTERNO).
   * Nunca exibir pricePerKm ao cliente.
   */
  function calculate(km, passengers) {
    const pax = Math.max(1, Math.min(6, parseInt(passengers, 10) || 1));
    const distance = Math.max(1, parseInt(km, 10) || 1);
    const t     = _tariff(pax);
    const total = parseFloat(Math.max(distance * t.pricePerKm, MIN_FARE).toFixed(2));
    return { total, ...t };
  }

  /**
   * Retorna apenas informações de veículo — seguro para exibir.
   */
  function getVehicleInfo(passengers) {
    return _tariff(Math.max(1, Math.min(6, parseInt(passengers, 10) || 1)));
  }

  /** Formata valor em BRL (ex: "42,00") — sem prefixo R$ (o HTML coloca o sup) */
  function formatAmount(value) {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /** Formata BRL completo para uso interno (mensagem da equipe) */
  function formatBRL(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  return { calculate, getVehicleInfo, formatAmount, formatBRL, MAX_SEDAN_PASSENGERS };

})();