/**
 * maps.js — Google Maps Integration Layer
 *
 * Corrigido:
 * - Removido dispatch de 'input' após place_changed (causava loop/corrupção)
 * - Removido body.classList.add('pac-hide') que interferia com o campo
 * - Validação de distância mantida
 */

const MapsService = (() => {
  let _active = false, _origin = null, _dest = null, _km = null;
  let _domReady = false;

  function _setup() {
    if (!_domReady) return;
    if (typeof google === 'undefined' || !google.maps?.places) return;
    if (_active) return;

    _active = true;
    _initAC('origin',      p => { _origin = p; _tryDist(); });
    _initAC('destination', p => { _dest   = p; _tryDist(); });
  }

  function _initAC(id, onSelect) {
    const el = document.getElementById(id);
    if (!el || el.dataset.acInit) return;
    el.dataset.acInit = '1';

    const ac = new google.maps.places.Autocomplete(el, {
      componentRestrictions: { country: 'br' },
      fields: ['geometry', 'formatted_address', 'name'],
    });

    // Impede que Enter no campo de autocomplete submeta o formulário
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') e.preventDefault();
    });

    ac.addListener('place_changed', () => {
      const p = ac.getPlace();
      if (!p || !p.geometry) return;

      // Limita tamanho do endereço por segurança
      const safeAddr = (p.formatted_address || p.name || '').slice(0, 300);
      el.value = safeAddr;

      // Dispara 'change' (não 'input') para que o ui.js esconda a cotação
      // sem acionar novamente o autocomplete ou máscaras
      el.dispatchEvent(new Event('change', { bubbles: true }));

      onSelect(p);
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
        const el = res.rows[0]?.elements[0];
        if (el?.status === 'OK' && el.distance?.value) {
          const rawKm = el.distance.value / 1000;
          if (!Number.isFinite(rawKm) || rawKm <= 0 || rawKm > 2000) return;
          _km = Math.ceil(rawKm);
          document.dispatchEvent(
            new CustomEvent('maps:distance', { detail: { km: _km } })
          );
        }
      }
    );
  }

  // Chamado pelo callback do script do Google Maps
  window.initGoogleMaps = function () {
    _domReady = true;
    _setup();
  };

  // Garantia caso o script carregue antes do DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      _domReady = true;
      _setup();
    });
  } else {
    _domReady = true;
  }

  function isActive()      { return _active; }
  function getDistanceKm() { return _km; }
  function reset()         { _origin = null; _dest = null; _km = null; }

  return { isActive, getDistanceKm, reset };
})();