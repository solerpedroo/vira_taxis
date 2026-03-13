/**
 * ui.js — Controlador de UI do ViraTáxis
 *
 * REGRA DE NEGÓCIO: O resultado de cotação exibe apenas o VALOR
 * ESTIMADO formatado (ex: "R$ 42,00") e o tipo de veículo.
 * Nunca exibe a tarifa por km nem o cálculo.
 *
 * SEGURANÇA:
 * - Nenhum input do usuário é inserido via innerHTML
 * - Rate limiting no botão de cotação (máx 5 cliques por minuto)
 * - Validação do href do botão WhatsApp (apenas URLs wa.me)
 * - Todos os dados exibidos via textContent, nunca innerHTML com user data
 */

document.addEventListener('DOMContentLoaded', () => {

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const footerYear = $('#footerYear');
  if (footerYear) footerYear.textContent = new Date().getFullYear();

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
    const href = a.getAttribute('href');
    // Valida que o href é uma âncora local simples
    if (!/^#[a-zA-Z][\w-]*$/.test(href)) return;
    const target = document.querySelector(href);
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
        // Valida que target é um número seguro
        if (!Number.isFinite(target) || target < 0 || target > 1e7) return;
        const dur = 1400, start = performance.now();
        const tick = now => {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          const val = Math.round(target * eased);
          el.textContent = val >= 1000
            ? (val / 1000).toFixed(0) + 'k' + suffix
            : val + suffix;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    $$('[data-target]').forEach(el => cio.observe(el));
  }

  /* ── 6. DATA MÍNIMA ────────────────────────────────────── */
  const dateHidden = $('#date');
  if (dateHidden) {
    const t = new Date();
    const iso = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
    dateHidden.min = iso;
  }

  /* ── 6b. PICKERS DE DATA E HORÁRIO ──────────────────────── */
  const dateOverlay    = $('#datePickerOverlay');
  const dateTrigger    = $('#dateTrigger');
  const dateDisplay    = $('#dateDisplay');
  const calGrid        = $('#calGrid');
  const calMonthYear   = $('#calMonthYear');
  const datePrevBtn    = $('#datePrevMonth');
  const dateNextBtn    = $('#dateNextMonth');
  const dateCancelBtn  = $('#dateCancelBtn');

  const timeOverlay    = $('#timePickerOverlay');
  const timeTrigger    = $('#timeTrigger');
  const timeDisplay    = $('#timeDisplay');
  const timeHidden     = $('#time');
  const hourDisp       = $('#hourDisplay');
  const minDisp        = $('#minDisplay');
  const timeCancelBtn  = $('#timeCancelBtn');
  const timeConfirmBtn = $('#timeConfirmBtn');

  const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  let calView = new Date();
  calView.setDate(1);
  let selectedDate = null;
  let tHour = 8, tMin = 0;

  function openDatePicker() {
    const now = new Date();
    if (!selectedDate) calView = new Date(now.getFullYear(), now.getMonth(), 1);
    renderCalendar();
    dateOverlay?.classList.add('is-open');
    dateOverlay?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  }
  function closeDatePicker() {
    dateOverlay?.classList.remove('is-open');
    dateOverlay?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  }

  function renderCalendar() {
    const today = new Date(); today.setHours(0,0,0,0);
    const year  = calView.getFullYear();
    const month = calView.getMonth();
    // Usa textContent — sem XSS
    if (calMonthYear) calMonthYear.textContent = `${MONTHS_PT[month]} ${year}`;

    const firstDay    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    if (!calGrid) return;
    calGrid.innerHTML = '';
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('span');
      empty.className = 'cal-day empty';
      calGrid.appendChild(empty);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cal-day';
      btn.textContent = d; // textContent seguro
      const thisDate = new Date(year, month, d);
      thisDate.setHours(0,0,0,0);
      if (thisDate < today) btn.disabled = true;
      if (thisDate.getTime() === today.getTime()) btn.classList.add('today');
      if (selectedDate && thisDate.getTime() === selectedDate.getTime()) btn.classList.add('selected');
      btn.addEventListener('click', () => {
        selectedDate = thisDate;
        const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        if (dateHidden) dateHidden.value = iso;
        if (dateDisplay) dateDisplay.textContent = `${String(d).padStart(2,'0')}/${String(month+1).padStart(2,'0')}/${year}`;
        dateTrigger?.classList.add('has-value');
        closeDatePicker();
        quoteResult?.classList.remove('show');
        _clearFieldError('date');
      });
      calGrid.appendChild(btn);
    }
  }

  dateTrigger?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openDatePicker(); });
  dateCancelBtn?.addEventListener('click', closeDatePicker);
  dateOverlay?.querySelector('.picker-modal')?.addEventListener('click', (e) => e.stopPropagation());
  dateOverlay?.addEventListener('click', (e) => { if (e.target === dateOverlay) closeDatePicker(); });
  datePrevBtn?.addEventListener('click', () => { calView.setMonth(calView.getMonth()-1); renderCalendar(); });
  dateNextBtn?.addEventListener('click', () => { calView.setMonth(calView.getMonth()+1); renderCalendar(); });

  const timePickerErr = $('#timePickerErr');

  function _isToday(isoDate) {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
    const today = new Date();
    const y = today.getFullYear(), m = today.getMonth() + 1, d = today.getDate();
    const [yy, mm, dd] = isoDate.split('-').map(Number);
    return yy === y && mm === m && dd === d;
  }

  function _setTimePickerDefaultForToday() {
    const now = new Date();
    let h = now.getHours();
    let m = now.getMinutes() + 30;
    if (m >= 60) { h += 1; m -= 60; }
    if (h >= 24) { h = 23; m = 59; }
    tHour = h;
    tMin = m;
  }

  function openTimePicker() {
    if (timePickerErr) { timePickerErr.textContent = ''; timePickerErr.classList.remove('show'); }
    const isoDate = dateHidden?.value ?? '';
    if (_isToday(isoDate)) {
      _setTimePickerDefaultForToday();
    } else {
      tHour = 8;
      tMin = 0;
    }
    if (hourDisp) hourDisp.textContent = String(tHour).padStart(2,'0');
    if (minDisp)  minDisp.textContent  = String(tMin).padStart(2,'0');
    timeOverlay?.classList.add('is-open');
    timeOverlay?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  }
  function closeTimePicker() {
    timeOverlay?.classList.remove('is-open');
    timeOverlay?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  }

  timeTrigger?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openTimePicker(); });
  timeCancelBtn?.addEventListener('click', closeTimePicker);
  timeOverlay?.querySelector('.picker-modal')?.addEventListener('click', (e) => e.stopPropagation());
  timeOverlay?.addEventListener('click', (e) => { if (e.target === timeOverlay) closeTimePicker(); });

  let _timeArrCooldown = false;
  const TIME_ARR_COOLDOWN_MS = 320;
  $$('.time-arr').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (_timeArrCooldown) return;
      _timeArrCooldown = true;
      setTimeout(() => { _timeArrCooldown = false; }, TIME_ARR_COOLDOWN_MS);

      const dir  = parseInt(btn.dataset.dir, 10);
      const unit = btn.dataset.unit;
      if (unit === 'h') tHour = (tHour + dir + 24) % 24;
      if (unit === 'm') tMin  = (tMin  + dir + 60) % 60;
      if (hourDisp) hourDisp.textContent = String(tHour).padStart(2,'0');
      if (minDisp)  minDisp.textContent  = String(tMin).padStart(2,'0');
    });
  });

  function _isTimeInPast(hour, min) {
    const now = new Date();
    const nowH = now.getHours(), nowM = now.getMinutes();
    if (hour < nowH) return true;
    if (hour === nowH && min <= nowM) return true;
    return false;
  }

  timeConfirmBtn?.addEventListener('click', () => {
    const isoDate = dateHidden?.value ?? '';
    if (_isToday(isoDate) && _isTimeInPast(tHour, tMin)) {
      if (timePickerErr) {
        timePickerErr.textContent = 'Para hoje, selecione um horário que ainda não passou.';
        timePickerErr.classList.add('show');
      }
      return;
    }
    if (timePickerErr) { timePickerErr.textContent = ''; timePickerErr.classList.remove('show'); }
    const val = `${String(tHour).padStart(2,'0')}:${String(tMin).padStart(2,'0')}`;
    if (timeHidden)  timeHidden.value        = val;
    if (timeDisplay) timeDisplay.textContent = val;
    timeTrigger?.classList.add('has-value');
    closeTimePicker();
    quoteResult?.classList.remove('show');
    _clearFieldError('time');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (dateOverlay?.classList.contains('is-open')) closeDatePicker();
    else if (timeOverlay?.classList.contains('is-open')) closeTimePicker();
  });

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
    if (display)   display.textContent    = passengers;
    if (hiddenPax) hiddenPax.value        = passengers;
    if (btnMinus)  btnMinus.disabled      = passengers <= 1;
    if (btnPlus)   btnPlus.disabled       = passengers >= 6;

    const info = Pricing.getVehicleInfo(passengers);
    if (vehicleTag) {
      // Constrói via DOM — nunca innerHTML com dados do usuário
      vehicleTag.textContent = '';
      const icon = document.createElement('i');
      icon.className = `fa-solid ${info.vehicleIcon}`;
      vehicleTag.appendChild(icon);
      vehicleTag.appendChild(document.createTextNode(` ${info.vehicleLabel}`));
      vehicleTag.classList.toggle('vehicle-tag--sedan', !info.requiresVan);
      vehicleTag.classList.toggle('vehicle-tag--van',    info.requiresVan);
    }
    vanNotice?.classList.toggle('show', info.requiresVan);
  }
  btnMinus?.addEventListener('click', () => updatePassengers(passengers - 1));
  btnPlus?.addEventListener('click',  () => updatePassengers(passengers + 1));
  updatePassengers(1);

  /* ── 8b. STEPPER DE BAGAGENS ────────────────────────────── */
  const luggageDisplay   = $('#luggageDisplay');
  const luggageHidden    = $('#luggage');
  const btnLuggageMinus  = $('#btnLuggageMinus');
  const btnLuggagePlus   = $('#btnLuggagePlus');
  let luggage = 0;

  function updateLuggage(val) {
    luggage = Math.max(0, Math.min(20, val));
    if (luggageDisplay) luggageDisplay.textContent = luggage;
    if (luggageHidden)  luggageHidden.value        = String(luggage);
    if (btnLuggageMinus) btnLuggageMinus.disabled  = luggage <= 0;
    if (btnLuggagePlus)  btnLuggagePlus.disabled   = luggage >= 20;
    if (luggageHidden) luggageHidden.dispatchEvent(new Event('change', { bubbles: true }));
  }
  btnLuggageMinus?.addEventListener('click', () => updateLuggage(luggage - 1));
  btnLuggagePlus?.addEventListener('click',  () => updateLuggage(luggage + 1));
  updateLuggage(0);

  /* ── 9. LIMPAR ORIGEM / DESTINO ─────────────────────────── */
  const originInput        = $('#origin');
  const destinationInput   = $('#destination');
  const clearOriginBtn     = $('#clearOrigin');
  const clearDestinationBtn = $('#clearDestination');

  function _setupClearableInput(input, clearBtn, fieldId) {
    if (!input || !clearBtn) return;
    const toggle = () => {
      const hasText = (input.value || '').trim().length > 0;
      clearBtn.classList.toggle('input-clear--visible', hasText);
    };
    input.addEventListener('input', toggle);
    input.addEventListener('change', toggle);
    clearBtn.addEventListener('click', () => {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      _clearFieldError(fieldId);
      quoteResult?.classList.remove('show');
      input.focus();
    });
    toggle();
  }

  /* ── 10. COTAÇÃO ─────────────────────────────────────────── */
  const quoteResult       = $('#quoteResult');
  const quoteAmount       = $('#quoteAmount');
  const quoteVehicleIcon  = $('#quoteVehicleIcon');
  const quoteVehicleLabel = $('#quoteVehicleLabel');
  const quoteDistNote     = $('#quoteDistNote');

  let _currentKm = null;

  function _guessKm() {
    const origin = $('#origin')?.value ?? '';
    const dest   = $('#destination')?.value ?? '';
    const match  = (origin + dest).match(/(\d+)\s*km/i);
    if (match) {
      const km = parseInt(match[1], 10);
      // Valida range razoável
      if (km > 0 && km <= 1000) return km;
    }
    if (origin.length >= 10 && dest.length >= 10) return 15;
    return null;
  }

  // Atualiza km quando Maps API retorna distância real
  document.addEventListener('maps:distance', e => {
    const km = e.detail?.km;
    if (Number.isFinite(km) && km > 0 && km <= 1000) {
      _currentKm = km;
    }
  });

  // Ao alterar campos, esconde a cotação
  ['name','phone','origin','destination','date','time','luggage'].forEach(id => {
    $('#' + id)?.addEventListener('input',  () => quoteResult?.classList.remove('show'));
    $('#' + id)?.addEventListener('change', () => quoteResult?.classList.remove('show'));
  });
  btnMinus?.addEventListener('click', () => quoteResult?.classList.remove('show'));
  btnPlus?.addEventListener('click',  () => quoteResult?.classList.remove('show'));
  btnLuggageMinus?.addEventListener('click', () => quoteResult?.classList.remove('show'));
  btnLuggagePlus?.addEventListener('click',  () => quoteResult?.classList.remove('show'));

  // Inicializa botões de limpar após ter quoteResult definido
  _setupClearableInput(originInput, clearOriginBtn, 'origin');
  _setupClearableInput(destinationInput, clearDestinationBtn, 'destination');

  /* ── 11. VALIDAÇÃO INLINE ──────────────────────────────── */
  function setFieldError(id, msg) {
    // Valida que o id é um campo conhecido (evita manipulação do DOM arbitrária)
    const knownFields = ['name','phone','origin','destination','date','time','passengers','luggage'];
    if (!knownFields.includes(id)) return;

    const input = $('#' + id) || $(`[id="${id}"]`);
    const errEl = $('#err-' + id);
    if (!input) return;
    if (msg) {
      input.classList.add('field-error');
      if (errEl) {
        errEl.textContent = msg; // textContent — sem XSS
        errEl.classList.add('show');
      }
    } else {
      _clearFieldError(id);
    }
  }

  function _clearFieldError(id) {
    const knownFields = ['name','phone','origin','destination','date','time','passengers','luggage'];
    if (!knownFields.includes(id)) return;
    const input = $('#' + id);
    const errEl = $('#err-' + id);
    input?.classList.remove('field-error');
    if (errEl) { errEl.textContent = ''; errEl.classList.remove('show'); }
  }

  function clearErrors() {
    $$('.form-input').forEach(el => el.classList.remove('field-error'));
    $('#passengers')?.classList.remove('field-error');
    $('#luggage')?.classList.remove('field-error');
    $$('.field-msg').forEach(el => { el.textContent = ''; el.classList.remove('show'); });
  }

  ['name','phone','origin','destination','date','time','luggage'].forEach(id => {
    $('#' + id)?.addEventListener('blur', e => {
      const r = Validations.validateField(id, e.target.value);
      setFieldError(id, r.valid ? '' : r.message);
    });
  });

  /* ── 12. RATE LIMITING DO BOTÃO ────────────────────────── */
  const RATE_LIMIT_MAX      = 5;   // máx de cliques
  const RATE_LIMIT_WINDOW   = 60000; // em 60 segundos
  let _quoteBtnClickTimes   = [];

  function _isRateLimited() {
    const now = Date.now();
    _quoteBtnClickTimes = _quoteBtnClickTimes.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (_quoteBtnClickTimes.length >= RATE_LIMIT_MAX) return true;
    _quoteBtnClickTimes.push(now);
    return false;
  }

  /* ── 12. VALIDAR URL WHATSAPP ──────────────────────────── */
  function _isValidWhatsAppUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' && parsed.hostname === 'wa.me';
    } catch {
      return false;
    }
  }

  /* ── 13. REALIZAR COTAÇÃO + AGENDAR VIA WHATSAPP ──────── */
  const form        = $('#quoteForm');
  const quoteBtn    = $('#quoteBtn');
  const whatsappBtn = $('#whatsappBtn');

  form?.addEventListener('submit', e => {
    e.preventDefault();
    quoteBtn?.click();
  });

  quoteBtn?.addEventListener('click', () => {
    try {
      if (_isRateLimited()) {
        quoteBtn.disabled = true;
        setTimeout(() => { quoteBtn.disabled = false; }, 3000);
        return;
      }

      clearErrors();

      const raw = {
        name:        ($('#name')?.value ?? '').trim(),
        phone:       $('#phone')?.value ?? '',
        origin:      ($('#origin')?.value ?? '').trim(),
        destination: ($('#destination')?.value ?? '').trim(),
        date:        $('#date')?.value ?? '',
        time:        $('#time')?.value ?? '',
        passengers:  String(passengers),
        luggage:     String(luggage),
      };

      const { valid, errors } = Validations.validateForm(raw);
      const placeErrors = {};
      if (MapsService.isActive()) {
        if (raw.origin.length >= 5 && !MapsService.getOriginPlace()) {
          placeErrors.origin = 'Selecione o endereço de origem na lista de sugestões ao digitar.';
        }
        if (raw.destination.length >= 5 && !MapsService.getDestinationPlace()) {
          placeErrors.destination = 'Selecione o endereço de destino na lista de sugestões ao digitar.';
        }
      }
      const allErrors = { ...errors, ...placeErrors };
      if (!valid || Object.keys(placeErrors).length > 0) {
        Object.entries(allErrors).forEach(([f, m]) => setFieldError(f, m));
        const firstErrorMsg = form?.querySelector('.field-msg.show');
        if (firstErrorMsg) firstErrorMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const firstInvalid = Object.keys(allErrors)[0];
        const focusIds = { name: 'name', phone: 'phone', origin: 'origin', destination: 'destination', date: 'dateTrigger', time: 'timeTrigger', passengers: 'btnMinus', luggage: 'btnLuggageMinus' };
        const toFocus = focusIds[firstInvalid] ? $(`#${focusIds[firstInvalid]}`) : null;
        if (toFocus) toFocus.focus({ preventScroll: true });
        return;
      }

      const paxNum     = Math.max(1, Math.min(6, parseInt(raw.passengers, 10) || 1));
      const luggageNum = Math.max(0, Math.min(20, parseInt(raw.luggage, 10) || 0));
      const info       = Pricing.getVehicleInfo(paxNum);
      const km         = MapsService.isActive() ? MapsService.getDistanceKm() : (_currentKm || _guessKm());
      const pricing    = (km && Number.isFinite(km)) ? Pricing.calculate(km, paxNum) : {};

      quoteBtn.classList.add('loading');
      quoteBtn.disabled = true;

      quoteResult?.classList.add('show');

      if (quoteVehicleIcon)  quoteVehicleIcon.className   = `fa-solid ${info.vehicleIcon}`;
      if (quoteVehicleLabel) quoteVehicleLabel.textContent = info.vehicleLabel;
      if (quoteAmount)       quoteAmount.textContent       = (km && pricing.total) ? Pricing.formatAmount(pricing.total) : '--';
      if (quoteDistNote)     quoteDistNote.textContent     = km ? `~${km} km estimados` : 'Preço confirmado via WhatsApp';

      const waUrl = WhatsApp.getUrl({
        name: raw.name, phone: raw.phone,
        origin: raw.origin, destination: raw.destination,
        date: raw.date, time: raw.time,
        passengers: paxNum, luggage: luggageNum,
        vehicleLabel: info.vehicleLabel,
        requiresVan: info.requiresVan,
        estimatedKm: km,
        total: pricing.total ?? null,
        pricePerKm: null,
      });

      if (whatsappBtn) {
        if (_isValidWhatsAppUrl(waUrl)) {
          whatsappBtn.setAttribute('href', waUrl);
        } else {
          whatsappBtn.setAttribute('href', '#');
          console.warn('ViraTáxis: URL WhatsApp inválida bloqueada.');
        }
      }

      quoteResult?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      setTimeout(() => {
        quoteBtn.classList.remove('loading');
        quoteBtn.disabled = false;
      }, 400);
    } catch (err) {
      console.error('ViraTáxis cotação:', err);
      quoteBtn.classList.remove('loading');
      quoteBtn.disabled = false;
      quoteResult?.classList.add('show');
      if (quoteAmount) quoteAmount.textContent = '--';
      if (quoteDistNote) quoteDistNote.textContent = 'Erro ao calcular. Tente novamente.';
    }
  });

  /* ── 14. WHATSAPP FLOAT ────────────────────────────────── */
  const waFloat = $('.wa-float');
  if (waFloat) {
    let shown = false;
    const show = () => { if (shown) return; shown = true; waFloat.classList.add('show'); };
    window.addEventListener('scroll', () => { if (window.scrollY > 320) show(); }, { passive: true });
    setTimeout(show, 5000);
  }

});