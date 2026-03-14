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

  /* ── 0. PAÍSES / DDI PARA TELEFONE ───────────────────────── */
  const PHONE_COUNTRIES = [
    { code: 'BR', dial: '+55',  name: 'Brasil' },
    { code: 'US', dial: '+1',   name: 'Estados Unidos' },
    { code: 'CA', dial: '+1',   name: 'Canadá' },
    { code: 'AR', dial: '+54',  name: 'Argentina' },
    { code: 'CL', dial: '+56',  name: 'Chile' },
    { code: 'UY', dial: '+598', name: 'Uruguai' },
    { code: 'PY', dial: '+595', name: 'Paraguai' },
    { code: 'BO', dial: '+591', name: 'Bolívia' },
    { code: 'PE', dial: '+51',  name: 'Peru' },
    { code: 'CO', dial: '+57',  name: 'Colômbia' },
    { code: 'MX', dial: '+52',  name: 'México' },
    { code: 'PT', dial: '+351', name: 'Portugal' },
    { code: 'ES', dial: '+34',  name: 'Espanha' },
    { code: 'FR', dial: '+33',  name: 'França' },
    { code: 'DE', dial: '+49',  name: 'Alemanha' },
    { code: 'IT', dial: '+39',  name: 'Itália' },
    { code: 'GB', dial: '+44',  name: 'Reino Unido' },
    { code: 'IE', dial: '+353', name: 'Irlanda' },
    { code: 'NL', dial: '+31',  name: 'Holanda' },
    { code: 'BE', dial: '+32',  name: 'Bélgica' },
    { code: 'CH', dial: '+41',  name: 'Suíça' },
    { code: 'SE', dial: '+46',  name: 'Suécia' },
    { code: 'NO', dial: '+47',  name: 'Noruega' },
    { code: 'DK', dial: '+45',  name: 'Dinamarca' },
    { code: 'FI', dial: '+358', name: 'Finlândia' },
    { code: 'CN', dial: '+86',  name: 'China' },
    { code: 'JP', dial: '+81',  name: 'Japão' },
    { code: 'KR', dial: '+82',  name: 'Coreia do Sul' },
    { code: 'AU', dial: '+61',  name: 'Austrália' },
    { code: 'NZ', dial: '+64',  name: 'Nova Zelândia' },
    { code: 'ZA', dial: '+27',  name: 'África do Sul' },
    { code: 'AE', dial: '+971', name: 'Emirados Árabes Unidos' },
    { code: 'IL', dial: '+972', name: 'Israel' },
    { code: 'TR', dial: '+90',  name: 'Turquia' },
    { code: 'RU', dial: '+7',   name: 'Rússia' },
    { code: 'IN', dial: '+91',  name: 'Índia' }
  ];

  /* ── Endereços pré-definidos (origem/destino) — coordenadas para API Distance Matrix ── */
  const PREDEFINED_ADDRESSES = [
    { label: 'Aeroporto de Viracopos VCP',           lat: -23.0045,  lng: -47.1340 },
    { label: 'Aeroporto Campos dos Amarais SDAM',    lat: -22.9553,  lng: -47.1386 },
    { label: 'Aeroporto de Guarulhos GRU',           lat: -23.4356,  lng: -46.4731 },
    { label: 'Aeroporto de Congonhas CGN',           lat: -23.6261,  lng: -46.6553 },
    { label: 'Royal Palm Plaza Resort Campinas',     lat: -22.9092,  lng: -47.0622 },
    { label: 'Royal Palm Tower Anhanguera',          lat: -22.9080,  lng: -47.0580 },
    { label: 'Hotel Contemporâneo Campinas',                  lat: -22.9036,  lng: -47.0602 },
    { label: 'Hotel Vitória Concept Campinas',       lat: -22.9070,  lng: -47.0630 },
    { label: 'Hotel Tauá Resort Atibaia',             lat: -23.1174,  lng: -46.5562 },
    { label: 'Hotel Bourbon Resort Atibaia',         lat: -23.1150,  lng: -46.5580 },
    { label: 'Rio Hotel By Bourbon Campinas',        lat: -22.9040,  lng: -47.0610 },
    { label: 'Hotel Meliá Campinas',                 lat: -22.9020,  lng: -47.0590 },
  ];

  function codeToFlag(code) {
    if (!code || code.length !== 2) return '';
    const base = 0x1F1E6;
    const A = 'A'.charCodeAt(0);
    const chars = code.toUpperCase().split('').map(c => String.fromCodePoint(base + c.charCodeAt(0) - A));
    return chars.join('');
  }

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

  /* ── 7. MÁSCARA TELEFONE + PAÍS ─────────────────────────── */
  const phoneInput   = $('#phone');
  const phoneCountry = $('#phoneCountry');
  const phoneCountryTrigger = $('#phoneCountryTrigger');

  /**
   * Normaliza valor de telefone pré-preenchido no formato internacional (ex: +55 (19) 99999-9999).
   * Retorna { country, nationalFormatted } ou null. Ordena países por tamanho do DDI (desc) para acertar +351 antes de +35.
   */
  function parseInternationalPhone(rawValue) {
    if (!rawValue || typeof rawValue !== 'string') return null;
    const fullDigits = rawValue.replace(/\D/g, '');
    if (fullDigits.length < 10) return null;
    const byDialLength = [...PHONE_COUNTRIES].sort((a, b) => (b.dial.length - a.dial.length));
    for (const country of byDialLength) {
      const code = country.dial.replace(/\D/g, '');
      if (!code || fullDigits.length < code.length) continue;
      if (fullDigits.indexOf(code) !== 0) continue;
      const nationalDigits = fullDigits.slice(code.length);
      if (country.code === 'BR') {
        if (nationalDigits.length < 10 || nationalDigits.length > 11) continue;
        return { country, nationalFormatted: Validations.maskPhone(nationalDigits), nationalDigits };
      }
      return { country, nationalFormatted: nationalDigits.slice(0, 20), nationalDigits };
    }
    return null;
  }

  function applyParsedPhone(parsed) {
    if (!parsed || !phoneCountry || !phoneInput) return;
    phoneCountry.value = parsed.country.code;
    phoneInput.value = parsed.nationalFormatted;
    const triggerText = phoneCountryTrigger?.querySelector('.phone-country-trigger__text');
    const flag = codeToFlag(parsed.country.code);
    if (triggerText) triggerText.textContent = `${flag ? flag + ' ' : ''}${parsed.country.dial} — ${parsed.country.name}`;
    if (phoneCountryTrigger) phoneCountryTrigger.classList.add('has-value');
    const selected = PHONE_COUNTRIES.find(c => c.code === parsed.country.code) || PHONE_COUNTRIES[0];
    if (selected.code === 'BR') phoneInput.placeholder = '(19) 99999-9999';
    else phoneInput.placeholder = `${selected.dial} número do WhatsApp`;
  }

  // Popula select oculto com a lista de países (para submit e valor atual)
  if (phoneCountry && PHONE_COUNTRIES.length) {
    phoneCountry.innerHTML = '';
    PHONE_COUNTRIES.forEach(country => {
      const opt = document.createElement('option');
      opt.value = country.code;
      const flag = codeToFlag(country.code);
      opt.textContent = `${flag ? flag + ' ' : ''}${country.dial} — ${country.name}`;
      opt.dataset.code = country.dial;
      if (country.code === 'BR') opt.selected = true;
      phoneCountry.appendChild(opt);
    });
  }

  function _applyPhoneMask() {
    if (!phoneInput) return;
    const country = phoneCountry?.value || 'BR';
    if (country === 'BR') {
      phoneInput.value = Validations.maskPhone(phoneInput.value);
    } else {
      const raw = phoneInput.value.replace(/[^+\d]/g, '');
      phoneInput.value = raw.slice(0, 20);
    }
  }

  function _applyPlaceholderForCountry(selected) {
    if (!phoneInput) return;
    if (selected.code === 'BR') {
      phoneInput.placeholder = '(19) 99999-9999';
    } else {
      phoneInput.placeholder = `${selected.dial} número do WhatsApp`;
    }
    phoneInput.value = '';
  }

  function valueLooksInternational(v) {
    if (!v) return false;
    if (String(v).trim().indexOf('+') === 0) return true;
    const d = String(v).replace(/\D/g, '');
    return d.length > 11;
  }
  let autofillNormalized = false;
  function maybeNormalizeAutofill() {
    if (autofillNormalized || !phoneInput?.value) return;
    if (!valueLooksInternational(phoneInput.value)) return;
    const parsed = parseInternationalPhone(phoneInput.value);
    if (parsed) { applyParsedPhone(parsed); autofillNormalized = true; }
  }

  phoneInput?.addEventListener('input', () => {
    maybeNormalizeAutofill();
    _applyPhoneMask();
  });

  /* Country picker (DDI) — mesmo padrão do seletor de endereço */
  const countryPickerOverlay = $('#countryPickerOverlay');
  const countryPickerSearch = $('#countryPickerSearch');
  const countryPickerList = $('#countryPickerList');
  const countryPickerEmpty = $('#countryPickerEmpty');
  const countryPickerCancelBtn = $('#countryPickerCancelBtn');

  function filterCountries(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return PHONE_COUNTRIES.slice();
    return PHONE_COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.dial.includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  }

  function renderCountryList(items) {
    if (!countryPickerList) return;
    countryPickerList.innerHTML = '';
    countryPickerList.setAttribute('aria-label', 'Lista de países');
    items.forEach(country => {
      const flag = codeToFlag(country.code);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'address-picker-item';
      btn.role = 'option';
      btn.textContent = `${flag ? flag + ' ' : ''}${country.dial} — ${country.name}`;
      btn.dataset.code = country.code;
      btn.addEventListener('click', () => {
        if (phoneCountry) phoneCountry.value = country.code;
        const triggerText = phoneCountryTrigger?.querySelector('.phone-country-trigger__text');
        if (triggerText) triggerText.textContent = `${flag ? flag + ' ' : ''}${country.dial} — ${country.name}`;
        if (phoneCountryTrigger) phoneCountryTrigger.classList.add('has-value');
        _applyPlaceholderForCountry(country);
        phoneCountry?.dispatchEvent(new Event('change', { bubbles: true }));
        closeCountryPicker();
      });
      countryPickerList.appendChild(btn);
    });
    const isEmpty = items.length === 0;
    if (countryPickerEmpty) countryPickerEmpty.style.display = isEmpty ? 'block' : 'none';
  }

  function openCountryPicker() {
    if (countryPickerSearch) { countryPickerSearch.value = ''; countryPickerSearch.focus(); }
    renderCountryList(PHONE_COUNTRIES);
    if (countryPickerOverlay) {
      countryPickerOverlay.classList.add('is-open');
      countryPickerOverlay.setAttribute('aria-hidden', 'false');
    }
  }

  function closeCountryPicker() {
    if (countryPickerOverlay) {
      countryPickerOverlay.classList.remove('is-open');
      countryPickerOverlay.setAttribute('aria-hidden', 'true');
    }
    if (countryPickerSearch) countryPickerSearch.value = '';
  }

  if (phoneCountryTrigger && phoneCountry?.value) phoneCountryTrigger.classList.add('has-value');
  phoneCountryTrigger?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openCountryPicker(); });
  countryPickerSearch?.addEventListener('input', () => { renderCountryList(filterCountries(countryPickerSearch.value)); });
  countryPickerSearch?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCountryPicker();
    if (e.key === 'Enter') e.preventDefault();
  });
  countryPickerCancelBtn?.addEventListener('click', closeCountryPicker);
  countryPickerOverlay?.addEventListener('click', (e) => { if (e.target === countryPickerOverlay) closeCountryPicker(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && countryPickerOverlay?.classList.contains('is-open')) closeCountryPicker();
  });

  // Ao mudar país (por exemplo por outro código que seta phoneCountry.value), atualizar placeholder
  phoneCountry?.addEventListener('change', () => {
    const selected = PHONE_COUNTRIES.find(c => c.code === phoneCountry.value) || PHONE_COUNTRIES[0];
    _applyPlaceholderForCountry(selected);
  });

  // Normaliza telefone pré-preenchido no formato internacional (ex: +55 (19) 99999-9999)
  if (phoneInput?.value) {
    const parsed = parseInternationalPhone(phoneInput.value);
    if (parsed) applyParsedPhone(parsed);
  }
  setTimeout(() => { maybeNormalizeAutofill(); }, 500);
  phoneInput?.addEventListener('paste', (e) => {
    const pasted = (e.clipboardData || window.clipboardData)?.getData('text') || '';
    const parsed = parseInternationalPhone(pasted);
    if (parsed) {
      e.preventDefault();
      applyParsedPhone(parsed);
    }
  });

  /* ── 7.1 MODAL COTAÇÃO ROTA FORA DO PADRÃO ───────────────── */
  const customQuoteOverlay   = $('#customQuoteOverlay');
  const openCustomQuoteModal = $('#openCustomQuoteModal');
  const closeCustomQuoteModal = $('#closeCustomQuoteModal');
  const customQuoteCancelBtn = $('#customQuoteCancelBtn');
  const customQuoteForm      = $('#customQuoteForm');
  const customQuoteSubmitBtn = $('#customQuoteSubmitBtn');
  const customQuoteName      = $('#customQuoteName');
  const customQuotePhone     = $('#customQuotePhone');
  const customQuotePhoneCountry = $('#customQuotePhoneCountry');
  const customQuoteOrigin   = $('#customQuoteOrigin');
  const customQuoteDestination = $('#customQuoteDestination');
  const customQuoteDate     = $('#customQuoteDate');
  const customQuoteTime     = $('#customQuoteTime');
  const customQuotePassengers = $('#customQuotePassengers');
  const customQuoteLuggage  = $('#customQuoteLuggage');

  if (customQuotePhoneCountry && PHONE_COUNTRIES.length) {
    customQuotePhoneCountry.innerHTML = '';
    PHONE_COUNTRIES.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.code;
      opt.textContent = `${codeToFlag(c.code) ? codeToFlag(c.code) + ' ' : ''}${c.dial}`;
      if (c.code === 'BR') opt.selected = true;
      customQuotePhoneCountry.appendChild(opt);
    });
  }

  function openCustomQuote() {
    if (customQuoteOverlay) {
      customQuoteOverlay.classList.add('is-open');
      customQuoteOverlay.setAttribute('aria-hidden', 'false');
    }
  }
  function closeCustomQuote() {
    if (customQuoteOverlay) {
      customQuoteOverlay.classList.remove('is-open');
      customQuoteOverlay.setAttribute('aria-hidden', 'true');
    }
  }

  openCustomQuoteModal?.addEventListener('click', (e) => { e.preventDefault(); openCustomQuote(); });
  closeCustomQuoteModal?.addEventListener('click', closeCustomQuote);
  customQuoteCancelBtn?.addEventListener('click', closeCustomQuote);
  customQuoteOverlay?.addEventListener('click', (e) => { if (e.target === customQuoteOverlay) closeCustomQuote(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && customQuoteOverlay?.classList.contains('is-open')) closeCustomQuote();
  });

  customQuoteSubmitBtn?.addEventListener('click', () => {
    const raw = {
      name:        (customQuoteName?.value ?? '').trim(),
      phone:       (customQuotePhone?.value ?? '').trim(),
      origin:      (customQuoteOrigin?.value ?? '').trim(),
      destination: (customQuoteDestination?.value ?? '').trim(),
      date:        customQuoteDate?.value ?? '',
      time:        customQuoteTime?.value ?? '',
      passengers:  String(customQuotePassengers?.value ?? '1'),
      luggage:     String(customQuoteLuggage?.value ?? '0'),
    };
    const { valid, errors } = Validations.validateForm(raw);
    $$('#customQuoteForm .field-msg').forEach(el => { el.textContent = ''; el.classList.remove('show'); });
    $$('#customQuoteForm .form-input').forEach(el => el.classList.remove('field-error'));
    if (!valid) {
      Object.entries(errors).forEach(([field, msg]) => {
        const id = 'customQuote' + field.charAt(0).toUpperCase() + field.slice(1);
        const el = $(`#${id}`);
        const errEl = $(`#err-${id}`);
        if (el) el.classList.add('field-error');
        if (errEl) { errEl.textContent = msg; errEl.classList.add('show'); }
      });
      const firstErr = customQuoteForm?.querySelector('.field-msg.show');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    const paxNum = Math.max(1, Math.min(6, parseInt(raw.passengers, 10) || 1));
    const selected = PHONE_COUNTRIES.find(c => c.code === (customQuotePhoneCountry?.value || 'BR')) || PHONE_COUNTRIES[0];
    const phoneDisplay = selected.dial + ' ' + (customQuotePhone?.value ?? '').trim();
    const data = {
      name: raw.name,
      phone: phoneDisplay,
      origin: raw.origin,
      destination: raw.destination,
      date: raw.date,
      time: raw.time,
      passengers: paxNum,
      luggage: Math.max(0, Math.min(20, parseInt(raw.luggage, 10) || 0)),
      requiresVan: paxNum >= 5,
    };
    WhatsApp.redirectCustomRoute(data);
    closeCustomQuote();
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

  /* ── 9.1 MODO ROTA: Sair de / Ir para + endereços pré-definidos ───────── */
  const originFixedWrap   = $('#originFixedWrap');
  const originFreeWrap    = $('#originFreeWrap');
  const destFixedWrap     = $('#destFixedWrap');
  const destFreeWrap      = $('#destFreeWrap');
  const originPredefined  = $('#originPredefined');
  const destinationPredefined = $('#destinationPredefined');
  const routeModeBtns     = $$('.route-mode-btn');

  function getRouteMode() {
    const active = $('.route-mode-btn.is-active');
    return active?.dataset?.routeMode === 'ir_para' ? 'ir_para' : 'sair_de';
  }

  function fillHiddenSelectOptions(selectEl, placeholder) {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    const opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = placeholder;
    selectEl.appendChild(opt0);
    PREDEFINED_ADDRESSES.forEach((addr, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = addr.label;
      selectEl.appendChild(opt);
    });
  }
  fillHiddenSelectOptions(originPredefined, 'Selecione a origem');
  fillHiddenSelectOptions(destinationPredefined, 'Selecione o destino');

  /* Address picker overlay (seletor personalizado com busca) */
  const addressPickerOverlay = $('#addressPickerOverlay');
  const addressPickerTitle = $('#addressPickerTitle');
  const addressPickerSearch = $('#addressPickerSearch');
  const addressPickerList = $('#addressPickerList');
  const addressPickerEmpty = $('#addressPickerEmpty');
  const addressPickerCancelBtn = $('#addressPickerCancelBtn');
  const originPredefinedTrigger = $('#originPredefinedTrigger');
  const destinationPredefinedTrigger = $('#destinationPredefinedTrigger');
  let _addressPickerContext = null; // 'origin' | 'destination'

  function filterAddresses(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return PREDEFINED_ADDRESSES.slice();
    return PREDEFINED_ADDRESSES.filter(addr => addr.label.toLowerCase().includes(q));
  }

  function renderAddressList(items) {
    if (!addressPickerList) return;
    addressPickerList.innerHTML = '';
    addressPickerList.setAttribute('aria-label', _addressPickerContext === 'origin' ? 'Lista de endereços de origem' : 'Lista de endereços de destino');
    items.forEach((addr, i) => {
      const idx = PREDEFINED_ADDRESSES.indexOf(addr);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'address-picker-item';
      btn.role = 'option';
      btn.textContent = addr.label;
      btn.dataset.index = String(idx);
      btn.addEventListener('click', () => {
        const index = btn.dataset.index;
        const select = _addressPickerContext === 'origin' ? originPredefined : destinationPredefined;
        const trigger = _addressPickerContext === 'origin' ? originPredefinedTrigger : destinationPredefinedTrigger;
        const triggerText = trigger?.querySelector('.address-picker-trigger__text');
        const inputEl = _addressPickerContext === 'origin' ? originInput : destinationInput;
        if (select) select.value = index;
        if (triggerText) triggerText.textContent = addr.label;
        if (trigger) trigger.classList.add('has-value');
        if (inputEl) {
          inputEl.value = addr.label;
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (typeof MapsService !== 'undefined') {
          if (_addressPickerContext === 'origin') MapsService.setOriginFromCoords(addr);
          else MapsService.setDestinationFromCoords(addr);
        }
        _clearFieldError(_addressPickerContext === 'origin' ? 'origin-predefined' : 'destination-predefined');
        if (quoteResult) quoteResult.classList.remove('show');
        closeAddressPicker();
      });
      addressPickerList.appendChild(btn);
    });
    const isEmpty = items.length === 0;
    if (addressPickerEmpty) addressPickerEmpty.style.display = isEmpty ? 'block' : 'none';
  }

  function openAddressPicker(context) {
    _addressPickerContext = context;
    if (addressPickerTitle) addressPickerTitle.textContent = context === 'origin' ? 'Selecione a origem' : 'Selecione o destino';
    if (addressPickerSearch) { addressPickerSearch.value = ''; addressPickerSearch.focus(); }
    renderAddressList(PREDEFINED_ADDRESSES);
    if (addressPickerOverlay) {
      addressPickerOverlay.classList.add('is-open');
      addressPickerOverlay.setAttribute('aria-hidden', 'false');
    }
  }

  function closeAddressPicker() {
    _addressPickerContext = null;
    if (addressPickerOverlay) {
      addressPickerOverlay.classList.remove('is-open');
      addressPickerOverlay.setAttribute('aria-hidden', 'true');
    }
    if (addressPickerSearch) addressPickerSearch.value = '';
  }

  originPredefinedTrigger?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openAddressPicker('origin'); });
  destinationPredefinedTrigger?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openAddressPicker('destination'); });
  addressPickerSearch?.addEventListener('input', () => { renderAddressList(filterAddresses(addressPickerSearch.value)); });
  addressPickerSearch?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAddressPicker();
    if (e.key === 'Enter') e.preventDefault();
  });
  addressPickerCancelBtn?.addEventListener('click', closeAddressPicker);
  addressPickerOverlay?.addEventListener('click', (e) => { if (e.target === addressPickerOverlay) closeAddressPicker(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && addressPickerOverlay?.classList.contains('is-open')) closeAddressPicker(); });

  function applyRouteMode(mode) {
    const isSairDe = mode === 'sair_de';
    if (originFixedWrap) { originFixedWrap.style.display = isSairDe ? '' : 'none'; originFixedWrap.setAttribute('aria-hidden', !isSairDe); }
    if (originFreeWrap)  { originFreeWrap.style.display = isSairDe ? 'none' : ''; originFreeWrap.setAttribute('aria-hidden', isSairDe); }
    if (destFreeWrap)    { destFreeWrap.style.display = isSairDe ? '' : 'none'; destFreeWrap.setAttribute('aria-hidden', !isSairDe); }
    if (destFixedWrap)   { destFixedWrap.style.display = isSairDe ? 'none' : ''; destFixedWrap.setAttribute('aria-hidden', isSairDe); }
    routeModeBtns.forEach(btn => {
      const pressed = btn.dataset.routeMode === mode;
      btn.classList.toggle('is-active', pressed);
      btn.setAttribute('aria-pressed', pressed);
    });
    if (originPredefined) originPredefined.value = '';
    if (destinationPredefined) destinationPredefined.value = '';
    if (originPredefinedTrigger) {
      originPredefinedTrigger.classList.remove('has-value');
      const t = originPredefinedTrigger.querySelector('.address-picker-trigger__text');
      if (t) t.textContent = 'Selecione a origem';
    }
    if (destinationPredefinedTrigger) {
      destinationPredefinedTrigger.classList.remove('has-value');
      const t = destinationPredefinedTrigger.querySelector('.address-picker-trigger__text');
      if (t) t.textContent = 'Selecione o destino';
    }
    if (originInput) originInput.value = '';
    if (destinationInput) destinationInput.value = '';
    if (typeof MapsService !== 'undefined') MapsService.reset();
    _clearFieldError('origin');
    _clearFieldError('destination');
    _clearFieldError('origin-predefined');
    _clearFieldError('destination-predefined');
    if (quoteResult) quoteResult.classList.remove('show');
  }

  routeModeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.routeMode;
      if (mode) applyRouteMode(mode);
    });
  });

  /* Valores de origem/destino pré-definidos são definidos pelo address picker; os selects ocultos mantêm o value para validação e submit */

  /* ── 11. VALIDAÇÃO INLINE ──────────────────────────────── */
  function setFieldError(id, msg) {
    const knownFields = ['name','phone','origin','destination','date','time','passengers','luggage','origin-predefined','destination-predefined'];
    if (!knownFields.includes(id)) return;

    let input = $('#' + id) || $(`[id="${id}"]`);
    if (id === 'origin-predefined') input = $('#originPredefinedTrigger');
    if (id === 'destination-predefined') input = $('#destinationPredefinedTrigger');
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
    const knownFields = ['name','phone','origin','destination','date','time','passengers','luggage','origin-predefined','destination-predefined'];
    if (!knownFields.includes(id)) return;
    let input = $('#' + id);
    if (id === 'origin-predefined') input = $('#originPredefinedTrigger');
    if (id === 'destination-predefined') input = $('#destinationPredefinedTrigger');
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

      const mode = getRouteMode();
      const isSairDe = mode === 'sair_de';
      let originVal = ($('#origin')?.value ?? '').trim();
      let destVal   = ($('#destination')?.value ?? '').trim();
      if (isSairDe && originPredefined?.value !== '') {
        const idx = parseInt(originPredefined.value, 10);
        if (Number.isFinite(idx) && PREDEFINED_ADDRESSES[idx]) originVal = PREDEFINED_ADDRESSES[idx].label;
      }
      if (!isSairDe && destinationPredefined?.value !== '') {
        const idx = parseInt(destinationPredefined.value, 10);
        if (Number.isFinite(idx) && PREDEFINED_ADDRESSES[idx]) destVal = PREDEFINED_ADDRESSES[idx].label;
      }

      if (isSairDe && !originPredefined?.value) {
        setFieldError('origin-predefined', 'Selecione o endereço de origem.');
        quoteResult?.classList.remove('show');
        $('#originPredefinedTrigger')?.focus();
        return;
      }
      if (!isSairDe && !destinationPredefined?.value) {
        setFieldError('destination-predefined', 'Selecione o endereço de destino.');
        quoteResult?.classList.remove('show');
        $('#destinationPredefinedTrigger')?.focus();
        return;
      }

      const raw = {
        name:        ($('#name')?.value ?? '').trim(),
        phone:       $('#phone')?.value ?? '',
        origin:      originVal,
        destination: destVal,
        date:        $('#date')?.value ?? '',
        time:        $('#time')?.value ?? '',
        passengers:  String(passengers),
        luggage:     String(luggage),
      };

      const { valid, errors } = Validations.validateForm(raw);
      const placeErrors = {};
      if (MapsService.isActive()) {
        const originFromPredefined = isSairDe && originPredefined?.value !== '';
        const destFromPredefined = !isSairDe && destinationPredefined?.value !== '';
        if (raw.origin.length >= 5 && !MapsService.getOriginPlace() && !originFromPredefined) {
          placeErrors.origin = 'Selecione o endereço de origem na lista de sugestões ao digitar.';
        }
        if (raw.destination.length >= 5 && !MapsService.getDestinationPlace() && !destFromPredefined) {
          placeErrors.destination = 'Selecione o endereço de destino na lista de sugestões ao digitar.';
        }
      }
      const allErrors = { ...errors, ...placeErrors };
      if (!valid || Object.keys(placeErrors).length > 0) {
        Object.entries(allErrors).forEach(([f, m]) => setFieldError(f, m));
        const firstErrorMsg = form?.querySelector('.field-msg.show');
        if (firstErrorMsg) firstErrorMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const firstInvalid = Object.keys(allErrors)[0];
        const focusIds = { name: 'name', phone: 'phone', origin: 'origin', destination: 'destination', 'origin-predefined': 'originPredefinedTrigger', 'destination-predefined': 'destinationPredefinedTrigger', date: 'dateTrigger', time: 'timeTrigger', passengers: 'btnMinus', luggage: 'btnLuggageMinus' };
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