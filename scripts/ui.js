/**
 * ui.js — Controlador de UI do Vira Táxis
 *
 * REGRA DE NEGÓCIO: O resultado de cotação exibe apenas o VALOR
 * ESTIMADO formatado (ex: "R$ 42,00") e o tipo de veículo.
 * Nunca exibe a tarifa por km nem o cálculo.
 *
 * A cotação aparece automaticamente quando todos os campos
 * do formulário estão preenchidos corretamente.
 */

document.addEventListener('DOMContentLoaded', () => {

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ── 1. HEADER SCROLL ──────────────────────────────────── */
  const header = $('#header');
  window.addEventListener('scroll', () => {
    header?.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });

  /* ── 2. MENU MOBILE ────────────────────────────────────── */
  const hamburger  = $('#hamburger');
  const mobileMenu = $('#mobileMenu');

  function closeMenu() {
    mobileMenu?.classList.remove('open');
    hamburger?.classList.remove('open');
    hamburger?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');
  }
  hamburger?.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('no-scroll', open);
  });
  $$('.mobile-nav__link').forEach(l => l.addEventListener('click', closeMenu));
  document.addEventListener('click', e => {
    if (!mobileMenu?.contains(e.target) && !hamburger?.contains(e.target)) closeMenu();
  });

  /* ── 3. SCROLL SUAVE ───────────────────────────────────── */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = (header?.offsetHeight ?? 72) + 8;
    window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
  });

  /* ── 4. REVEAL ─────────────────────────────────────────── */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    $$('.reveal').forEach(el => io.observe(el));
  } else {
    $$('.reveal').forEach(el => el.classList.add('visible'));
  }

  /* ── 5. COUNTER ANIMATION ──────────────────────────────── */
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        const el = e.target;
        const target = parseInt(el.dataset.target, 10);
        const suffix = el.dataset.suffix ?? '';
        const dur = 1400, start = performance.now();
        const tick = now => {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1-p, 3);
          const val = Math.round(target * eased);
          el.textContent = val >= 1000
            ? (val/1000).toFixed(0) + 'k' + suffix
            : val + suffix;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    $$('[data-target]').forEach(el => cio.observe(el));
  }

  /* ── 6. DATA MÍNIMA ────────────────────────────────────── */
  const dateInput = $('#date');
  if (dateInput) {
    const t = new Date();
    const iso = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
    dateInput.min = iso;
  }

  /* ── 7. MÁSCARA TELEFONE ───────────────────────────────── */
  const phoneInput = $('#phone');
  phoneInput?.addEventListener('input', () => {
    phoneInput.value = Validations.maskPhone(phoneInput.value);
  });

  /* ── 8. STEPPER DE PASSAGEIROS ─────────────────────────── */
  const display    = $('#passengerDisplay');
  const hiddenPax  = $('#passengers');
  const btnMinus   = $('#btnMinus');
  const btnPlus    = $('#btnPlus');
  const vehicleTag = $('#vehicleTag');
  const vanNotice  = $('#vanNotice');
  let passengers = 1;

  function updatePassengers(val) {
    passengers = Math.max(1, Math.min(6, val));
    if (display)   display.textContent = passengers;
    if (hiddenPax) hiddenPax.value     = passengers;
    btnMinus.disabled = passengers <= 1;
    btnPlus.disabled  = passengers >= 6;

    const info = Pricing.getVehicleInfo(passengers);
    if (vehicleTag) {
      vehicleTag.innerHTML = `<i class="fa-solid ${info.vehicleIcon}"></i> ${info.vehicleLabel}`;
      vehicleTag.classList.toggle('vehicle-tag--sedan', !info.requiresVan);
      vehicleTag.classList.toggle('vehicle-tag--van',    info.requiresVan);
    }
    vanNotice?.classList.toggle('show', info.requiresVan);
  }
  btnMinus?.addEventListener('click', () => updatePassengers(passengers - 1));
  btnPlus?.addEventListener('click',  () => updatePassengers(passengers + 1));
  updatePassengers(1);

  /* ── 9. COTAÇÃO ─────────────────────────────────────────── */
  const quoteResult      = $('#quoteResult');
  const quoteAmount      = $('#quoteAmount');
  const quoteVehicleIcon = $('#quoteVehicleIcon');
  const quoteVehicleLabel = $('#quoteVehicleLabel');
  const quoteDistNote    = $('#quoteDistNote');

  let _currentKm = null;

  function _guessKm() {
    const origin = $('#origin')?.value ?? '';
    const dest   = $('#destination')?.value ?? '';
    const match  = (origin + dest).match(/(\d+)\s*km/i);
    if (match) return parseInt(match[1], 10);
    if (origin.length >= 10 && dest.length >= 10) return 15;
    return null;
  }

  // Atualiza km quando Maps API retorna distância real
  document.addEventListener('maps:distance', e => {
    _currentKm = e.detail.km;
  });

  // Ao alterar campos, esconde a cotação (usuário deve clicar em Realizar cotação novamente)
  ['name','phone','origin','destination','date','time','luggage'].forEach(id => {
    $('#' + id)?.addEventListener('input', () => quoteResult?.classList.remove('show'));
    $('#' + id)?.addEventListener('change', () => quoteResult?.classList.remove('show'));
  });
  btnMinus?.addEventListener('click', () => quoteResult?.classList.remove('show'));
  btnPlus?.addEventListener('click', () => quoteResult?.classList.remove('show'));

  /* ── 10. VALIDAÇÃO INLINE ──────────────────────────────── */
  function setFieldError(id, msg) {
    const input = $('#' + id);
    const errEl = $('#err-' + id);
    if (!input) return;
    if (msg) {
      input.classList.add('field-error');
      if (errEl) { errEl.textContent = msg; errEl.classList.add('show'); }
    } else {
      input.classList.remove('field-error');
      if (errEl) { errEl.textContent = ''; errEl.classList.remove('show'); }
    }
  }
  function clearErrors() {
    $$('.form-input').forEach(el => el.classList.remove('field-error'));
    $$('.field-msg').forEach(el => { el.textContent = ''; el.classList.remove('show'); });
  }
  ['name','phone','origin','destination','date','time','luggage'].forEach(id => {
    $('#' + id)?.addEventListener('blur', e => {
      const r = Validations.validateField(id, e.target.value);
      setFieldError(id, r.valid ? '' : r.message);
    });
  });

  /* ── 11. REALIZAR COTAÇÃO + AGENDAR VIA WHATSAPP ───────── */
  const form       = $('#quoteForm');
  const quoteBtn   = $('#quoteBtn');
  const whatsappBtn = $('#whatsappBtn');

  form?.addEventListener('submit', e => {
    e.preventDefault();
    quoteBtn?.click();
  });

  quoteBtn?.addEventListener('click', () => {
    clearErrors();

    const raw = {
      name:        $('#name')?.value        ?? '',
      phone:       $('#phone')?.value       ?? '',
      origin:      $('#origin')?.value      ?? '',
      destination: $('#destination')?.value ?? '',
      date:        $('#date')?.value        ?? '',
      time:        $('#time')?.value        ?? '',
      passengers:  String(passengers),
      luggage:     $('#luggage')?.value     ?? '0',
    };

    const { valid, errors } = Validations.validateForm(raw);
    if (!valid) {
      Object.entries(errors).forEach(([f,m]) => setFieldError(f, m));
      form?.querySelector('.field-error')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const pax     = parseInt(raw.passengers, 10);
    const luggage = parseInt(raw.luggage, 10);
    const info    = Pricing.getVehicleInfo(pax);
    const km      = MapsService.isActive() ? MapsService.getDistanceKm() : (_currentKm || _guessKm());
    const pricing = km ? Pricing.calculate(km, pax) : {};

    quoteBtn.classList.add('loading');
    quoteBtn.disabled = true;

    quoteResult?.classList.add('show');

    if (quoteVehicleIcon)  quoteVehicleIcon.className  = `fa-solid ${info.vehicleIcon}`;
    if (quoteVehicleLabel) quoteVehicleLabel.textContent = info.vehicleLabel;
    if (quoteAmount) quoteAmount.textContent = km ? Pricing.formatAmount(pricing.total) : '--';
    if (quoteDistNote) quoteDistNote.textContent = km ? `~${km} km estimados` : 'Preço confirmado via WhatsApp';

    whatsappBtn?.setAttribute('href', WhatsApp.getUrl({
      name: raw.name, phone: raw.phone,
      origin: raw.origin, destination: raw.destination,
      date: raw.date, time: raw.time,
      passengers: pax, luggage,
      vehicleLabel: info.vehicleLabel,
      requiresVan: info.requiresVan,
      estimatedKm: km,
      total: pricing.total ?? null,
      pricePerKm: pricing.pricePerKm ?? null,
    }));

    quoteResult?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    setTimeout(() => {
      quoteBtn.classList.remove('loading');
      quoteBtn.disabled = false;
    }, 400);
  });

  /* ── 12. WHATSAPP FLOAT ────────────────────────────────── */
  const waFloat = $('.wa-float');
  if (waFloat) {
    let shown = false;
    const show = () => { if (shown) return; shown = true; waFloat.classList.add('show'); };
    window.addEventListener('scroll', () => { if (window.scrollY > 320) show(); }, { passive: true });
    setTimeout(show, 5000);
  }

});