// Seletor de cor com transparência integrada. Substitui o par
// <input type="color"> + <input type="range"> (que exigia dois controles
// separados e mostrava o valor de transparência isolado do código da cor)
// por um único elemento: o "swatch" já mostra a cor com a transparência
// aplicada (fundo xadrez por trás) e o código exibido/editável é sempre o
// hex de 8 dígitos (#RRGGBBAA), com a transparência embutida no próprio
// código.
//
// Os inputs originais (type=color / type=range) continuam no DOM, ocultos
// (hidden), como contrato de dados: o resto do app (leitura ao salvar,
// preenchimento ao trocar de cidade) continua lendo/escrevendo o
// .value deles normalmente. Este módulo só cuida da parte visual e
// mantém os dois lados sincronizados.

(function () {
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const hsvToRgb = (h, s, v) => {
    h = ((h % 360) + 360) % 360;
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255)
    ];
  };

  const rgbToHsv = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    const s = max === 0 ? 0 : d / max;
    return [h, s, max];
  };

  const hex2 = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');

  const rgbToHex6 = (r, g, b) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;

  const alphaPercentToHex2 = (percent) => hex2((clamp(percent, 0, 100) / 100) * 255);

  const hex2ToAlphaPercent = (h) => Math.round((parseInt(h, 16) / 255) * 100);

  // Aceita #rgb, #rrggbb ou #rrggbbaa. Retorna {r,g,b,a} (a em 0-100) ou null.
  const parseHex = (raw) => {
    if (!raw) return null;
    let hex = raw.trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (/^[0-9a-fA-F]{6}$/.test(hex)) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: null
      };
    }
    if (/^[0-9a-fA-F]{8}$/.test(hex)) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: hex2ToAlphaPercent(hex.slice(6, 8))
      };
    }
    return null;
  };

  const checkerBg = 'conic-gradient(#d9dee5 90deg, transparent 90deg 180deg, #d9dee5 180deg 270deg, transparent 270deg)';
  const checkerSize = '10px 10px';

  let openPopover = null;
  const closeOpenPopover = () => {
    if (openPopover) {
      openPopover.remove();
      openPopover = null;
    }
  };
  document.addEventListener('click', (e) => {
    if (openPopover && !openPopover.contains(e.target) && !openPopover.__trigger.contains(e.target)) {
      closeOpenPopover();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeOpenPopover();
  });
  window.addEventListener('scroll', () => closeOpenPopover(), true);
  window.addEventListener('resize', () => closeOpenPopover());

  const buildPopover = (state, onChange) => {
    const pop = document.createElement('div');
    pop.className = 'color-alpha-popover';

    const svBox = document.createElement('div');
    svBox.className = 'color-alpha-svbox';
    const svHandle = document.createElement('div');
    svHandle.className = 'color-alpha-svbox-handle';
    svBox.appendChild(svHandle);

    const hueRow = document.createElement('input');
    hueRow.type = 'range';
    hueRow.className = 'color-alpha-hue';
    hueRow.min = '0';
    hueRow.max = '360';
    hueRow.step = '1';

    const alphaRow = document.createElement('input');
    alphaRow.type = 'range';
    alphaRow.className = 'color-alpha-alpha';
    alphaRow.min = '0';
    alphaRow.max = '100';
    alphaRow.step = '1';

    const hexRow = document.createElement('input');
    hexRow.type = 'text';
    hexRow.className = 'color-alpha-hexinput';
    hexRow.maxLength = 9;
    hexRow.spellcheck = false;
    hexRow.autocomplete = 'off';

    const hueLabel = document.createElement('label');
    hueLabel.className = 'color-alpha-poplabel';
    hueLabel.textContent = 'Matiz';
    hueLabel.appendChild(hueRow);

    const alphaLabel = document.createElement('label');
    alphaLabel.className = 'color-alpha-poplabel';
    alphaLabel.textContent = 'Transparência';
    alphaLabel.appendChild(alphaRow);

    const hexLabel = document.createElement('label');
    hexLabel.className = 'color-alpha-poplabel';
    hexLabel.textContent = 'Código (com transparência)';
    hexLabel.appendChild(hexRow);

    pop.appendChild(svBox);
    pop.appendChild(hueLabel);
    pop.appendChild(alphaLabel);
    pop.appendChild(hexLabel);

    const render = () => {
      const [r, g, b] = hsvToRgb(state.h, state.s, state.v);
      svBox.style.setProperty('--hue', state.h);
      svHandle.style.left = `${state.s * 100}%`;
      svHandle.style.top = `${(1 - state.v) * 100}%`;
      hueRow.value = String(Math.round(state.h));
      alphaRow.value = String(Math.round(state.a));
      alphaRow.style.background = `linear-gradient(to right, rgba(${r},${g},${b},0), rgba(${r},${g},${b},1)), ${checkerBg}`;
      alphaRow.style.backgroundSize = `100% 100%, ${checkerSize}`;
      const hex6 = rgbToHex6(r, g, b);
      hexRow.value = `${hex6}${alphaPercentToHex2(state.a)}`.toUpperCase();
    };
    render();

    const dragSv = (evt) => {
      const rect = svBox.getBoundingClientRect();
      const x = clamp(evt.clientX - rect.left, 0, rect.width);
      const y = clamp(evt.clientY - rect.top, 0, rect.height);
      state.s = rect.width ? x / rect.width : 0;
      state.v = rect.height ? 1 - y / rect.height : 0;
      render();
      onChange(state);
    };
    svBox.addEventListener('pointerdown', (evt) => {
      svBox.setPointerCapture(evt.pointerId);
      dragSv(evt);
      const move = (e2) => dragSv(e2);
      const up = () => {
        svBox.removeEventListener('pointermove', move);
        svBox.removeEventListener('pointerup', up);
      };
      svBox.addEventListener('pointermove', move);
      svBox.addEventListener('pointerup', up);
    });

    hueRow.addEventListener('input', () => {
      state.h = Number(hueRow.value);
      render();
      onChange(state);
    });
    alphaRow.addEventListener('input', () => {
      state.a = Number(alphaRow.value);
      render();
      onChange(state);
    });
    hexRow.addEventListener('change', () => {
      const parsed = parseHex(hexRow.value);
      if (!parsed) { render(); return; }
      const [h, s, v] = rgbToHsv(parsed.r, parsed.g, parsed.b);
      state.h = h; state.s = s; state.v = v;
      if (parsed.a !== null) state.a = parsed.a;
      render();
      onChange(state);
    });

    pop.__render = render;
    return pop;
  };

  const init = (root) => {
    const colorId = root.dataset.targetColor;
    const alphaId = root.dataset.targetAlpha;
    const colorInput = document.getElementById(colorId);
    const alphaInput = document.getElementById(alphaId);
    if (!colorInput || !alphaInput) return null;

    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'color-alpha-swatch';
    swatch.style.backgroundImage = checkerBg;
    swatch.style.backgroundSize = checkerSize;
    const swatchFill = document.createElement('span');
    swatchFill.className = 'color-alpha-swatch-fill';
    const swatchLabel = document.createElement('span');
    swatchLabel.className = 'color-alpha-swatch-label';
    swatch.appendChild(swatchFill);
    swatch.appendChild(swatchLabel);
    root.appendChild(swatch);

    const state = { h: 0, s: 0, v: 1, a: 100 };

    const syncFromInputs = () => {
      const parsed = parseHex(colorInput.value) || { r: 255, g: 255, b: 255 };
      const [h, s, v] = rgbToHsv(parsed.r, parsed.g, parsed.b);
      state.h = h; state.s = s; state.v = v;
      const alphaVal = Number(alphaInput.value);
      state.a = Number.isFinite(alphaVal) ? alphaVal : 100;
    };
    syncFromInputs();

    const renderSwatch = () => {
      const [r, g, b] = hsvToRgb(state.h, state.s, state.v);
      const a = clamp(state.a, 0, 100) / 100;
      swatchFill.style.background = `rgba(${r},${g},${b},${a})`;
      const hex8 = `${rgbToHex6(r, g, b)}${alphaPercentToHex2(state.a)}`.toUpperCase();
      swatchLabel.textContent = hex8;
      // Contraste automático do texto sobre a prévia (luminância aproximada).
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      swatchLabel.style.color = (luminance > 0.6 && a > 0.4) ? '#1f2937' : '#fff';
      swatchLabel.style.textShadow = (luminance > 0.6 && a > 0.4) ? 'none' : '0 1px 2px rgba(0,0,0,0.6)';
    };
    renderSwatch();

    const pushToHiddenInputs = () => {
      const [r, g, b] = hsvToRgb(state.h, state.s, state.v);
      colorInput.value = rgbToHex6(r, g, b);
      alphaInput.value = String(Math.round(clamp(state.a, 0, 100)));
      colorInput.dispatchEvent(new Event('input', { bubbles: true }));
      alphaInput.dispatchEvent(new Event('change', { bubbles: true }));
    };

    swatch.addEventListener('click', (e) => {
      e.stopPropagation();
      if (openPopover && openPopover.__trigger === swatch) { closeOpenPopover(); return; }
      closeOpenPopover();
      const pop = buildPopover(state, () => {
        renderSwatch();
        pushToHiddenInputs();
      });
      pop.__trigger = swatch;
      document.body.appendChild(pop);
      const rect = swatch.getBoundingClientRect();
      const popRect = pop.getBoundingClientRect();
      let left = rect.left;
      if (left + popRect.width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - popRect.width - 8);
      }
      let top = rect.bottom + 6;
      if (top + popRect.height > window.innerHeight - 8) {
        top = Math.max(8, rect.top - popRect.height - 6);
      }
      pop.style.left = `${left}px`;
      pop.style.top = `${top}px`;
      openPopover = pop;
    });

    return {
      refresh() {
        syncFromInputs();
        renderSwatch();
        if (openPopover && openPopover.__trigger === swatch) {
          openPopover.__render();
        }
      }
    };
  };

  window.__colorAlphaPickers = window.__colorAlphaPickers || {};

  const initAll = () => {
    document.querySelectorAll('.color-alpha-picker').forEach((root) => {
      if (root.__initialized) return;
      const api = init(root);
      if (api) {
        root.__initialized = true;
        window.__colorAlphaPickers[root.dataset.targetColor] = api;
      }
    });
  };

  window.refreshColorAlphaPicker = (colorId) => {
    const api = window.__colorAlphaPickers[colorId];
    if (api) api.refresh();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
