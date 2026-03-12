/**
 * maps.js — Google Maps Integration Layer
 *
 * Funciona em dois modos:
 *  - Sem Google Maps: campos são texto livre (modo stub)
 *  - Com Google Maps: Places Autocomplete + Distance Matrix
 *
 * Correções:
 *  - Nunca despacha 'input' após place_changed (causava corrupção do campo)
 *  - initGoogleMaps registrado globalmente antes do script carregar
 */

const MapsService = (() => {
  let _active = false;
  let _origin = null;
  let _dest   = null;
  let _km     = null;

  function _initAC(id, onSelect) {
    const el = document.getElementById(id);
    if (!el || el.dataset.acInit) return;
    el.dataset.acInit = '1';

    const ac = new google.maps.places.Autocomplete(el, {
      componentRestrictions: { country: 'br' },
      fields: ['geometry', 'formatted_address', 'name'],
    });

    // Impede Enter de submeter formulário ao navegar nas sugestões
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const pac = document.querySelector('.pac-container');
        if (pac && getComputedStyle(pac).display !== 'none') {
          e.preventDefault();
        }
      }
    });

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();

      // Sem geometry = usuário não selecionou sugestão, ignora
      if (!place || !place.geometry) return;

      const addr = (place.formatted_address || place.name || '').slice(0, 300);
      el.value = addr;

      // Usa 'change' (não 'input') para não reacionar validações de digitação
      el.dispatchEvent(new Event('change', { bubbles: true }));

      onSelect(place);
    });
  }

  function _tryDist() {
    if (!_origin?.geometry || !_dest?.geometry) return;

    new google.maps.DistanceMatrixService().getDistanceMatrix(
      {
        origins:      [_origin.geometry.location],
        destinations: [_dest.geometry.location],
        travelMode:   google.maps.TravelMode.DRIVING,
        unitSystem:   google.maps.UnitSystem.METRIC,
      },
      (res, status) => {
        if (status !== 'OK') return;
        const el = res?.rows?.[0]?.elements?.[0];
        if (!el || el.status !== 'OK') return;

        const meters = el.distance?.value;
        if (!meters || !Number.isFinite(meters) || meters <= 0 || meters > 2000000) return;

        _km = Math.ceil(meters / 1000);
        document.dispatchEvent(new CustomEvent('maps:distance', { detail: { km: _km } }));
      }
    );
  }

  // Inicialização central da API do Google Maps (pode ser chamada de vários jeitos)
  function _onGoogleReady() {
    if (_active) return;
    if (typeof google === 'undefined' || !google.maps?.places) return;

    _active = true;

    const run = () => {
      _initAC('origin',      p => { _origin = p; _tryDist(); });
      _initAC('destination', p => { _dest   = p; _tryDist(); });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run, { once: true });
    } else {
      run();
    }
  }

  // Callback global chamado pelo script do Google Maps após carregar (&callback=initGoogleMaps)
  window.initGoogleMaps = function () {
    _onGoogleReady();
  };

  // Fallback: se o script do Google Maps já tiver carregado ANTES de maps.js, inicializa imediatamente.
  if (typeof window !== 'undefined' &&
      typeof window.google !== 'undefined' &&
      window.google.maps?.places) {
    _onGoogleReady();
  }

  function isActive()      { return _active; }
  function getDistanceKm() { return _km; }
  function reset()         { _origin = null; _dest = null; _km = null; }

  return { isActive, getDistanceKm, reset };
})();