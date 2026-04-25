/* ============================================================
   Tweaks panel — cross-site
   Exposes: accent color, density, cursor on/off, grain on/off
   ============================================================ */

(function () {
  // Wrap defaults in EDITMODE markers for host persistence
  const TWEAKS = /*EDITMODE-BEGIN*/{
    "accent": "site",
    "density": "cozy",
    "cursor": true,
    "grain": true
  }/*EDITMODE-END*/;

  const ACCENTS = {
    site:    null, // use per-site default
    green:   { c: '#00E28A', dim: 'rgba(0, 226, 138, 0.14)', ink: 'rgba(0, 226, 138, 0.85)', glow: 'rgba(0, 226, 138, 0.30)' },
    amber:   { c: '#E8A857', dim: 'rgba(232, 168, 87, 0.14)', ink: 'rgba(232, 168, 87, 0.88)', glow: 'rgba(232, 168, 87, 0.30)' },
    blue:    { c: '#6BA4FF', dim: 'rgba(107, 164, 255, 0.14)', ink: 'rgba(107, 164, 255, 0.90)', glow: 'rgba(107, 164, 255, 0.32)' },
    violet:  { c: '#B38CFF', dim: 'rgba(179, 140, 255, 0.14)', ink: 'rgba(179, 140, 255, 0.88)', glow: 'rgba(179, 140, 255, 0.30)' },
  };

  const applyAccent = (k) => {
    if (k === 'site' || !ACCENTS[k]) {
      // Clear overrides
      ['--accent', '--accent-dim', '--accent-ink', '--accent-glow'].forEach(v => document.documentElement.style.removeProperty(v));
      return;
    }
    const a = ACCENTS[k];
    document.documentElement.style.setProperty('--accent', a.c);
    document.documentElement.style.setProperty('--accent-dim', a.dim);
    document.documentElement.style.setProperty('--accent-ink', a.ink);
    document.documentElement.style.setProperty('--accent-glow', a.glow);
  };

  const applyDensity = (k) => {
    const root = document.documentElement;
    if (k === 'tight') {
      root.style.setProperty('--section-y', 'clamp(64px, 9vh, 120px)');
    } else if (k === 'roomy') {
      root.style.setProperty('--section-y', 'clamp(128px, 18vh, 240px)');
    } else {
      root.style.removeProperty('--section-y');
    }
  };

  const applyCursor = (on) => {
    document.body.style.cursor = on ? 'none' : 'auto';
    document.querySelectorAll('.cursor, .cursor-ring').forEach(el => el.style.display = on ? '' : 'none');
  };

  const applyGrain = (on) => {
    const g = document.querySelector('.grain');
    if (g) g.style.display = on ? '' : 'none';
  };

  const applyAll = () => {
    applyAccent(TWEAKS.accent);
    applyDensity(TWEAKS.density);
    applyCursor(TWEAKS.cursor);
    applyGrain(TWEAKS.grain);
  };

  // Build panel UI
  const panel = document.getElementById('tweaks-panel');
  if (!panel) return;
  const body = panel.querySelector('.tweaks__body');
  body.innerHTML = `
    <div class="tweak-row">
      <label>Accent</label>
      <div class="tweak-swatches">
        <div class="tweak-sw" data-accent="site"   style="background:#00E28A; outline: 1px dashed var(--ink-3); outline-offset: -4px"  title="Per-site default"></div>
        <div class="tweak-sw" data-accent="green"  style="background:#00E28A" title="Green"></div>
        <div class="tweak-sw" data-accent="amber"  style="background:#E8A857" title="Amber"></div>
        <div class="tweak-sw" data-accent="blue"   style="background:#6BA4FF" title="Blue"></div>
        <div class="tweak-sw" data-accent="violet" style="background:#B38CFF" title="Violet"></div>
      </div>
    </div>
    <div class="tweak-row">
      <label>Density</label>
      <div class="tweak-swatches" style="grid-template-columns: repeat(3, 1fr);">
        <div class="tweak-sw" data-density="tight" style="background:transparent; border-color: var(--ink-4); font-size: 9px; display: grid; place-items: center; color: var(--ink-2); font-family: var(--font-mono); letter-spacing: .1em; text-transform: uppercase;">Tight</div>
        <div class="tweak-sw" data-density="cozy" style="background:transparent; border-color: var(--ink-4); font-size: 9px; display: grid; place-items: center; color: var(--ink-2); font-family: var(--font-mono); letter-spacing: .1em; text-transform: uppercase;">Cozy</div>
        <div class="tweak-sw" data-density="roomy" style="background:transparent; border-color: var(--ink-4); font-size: 9px; display: grid; place-items: center; color: var(--ink-2); font-family: var(--font-mono); letter-spacing: .1em; text-transform: uppercase;">Roomy</div>
      </div>
    </div>
    <div class="tweak-toggle">
      Custom cursor
      <div class="tweak-switch ${TWEAKS.cursor ? 'is-on' : ''}" data-toggle="cursor"></div>
    </div>
    <div class="tweak-toggle">
      Grain texture
      <div class="tweak-switch ${TWEAKS.grain ? 'is-on' : ''}" data-toggle="grain"></div>
    </div>
  `;

  // Highlight active swatches
  const syncHighlights = () => {
    panel.querySelectorAll('[data-accent]').forEach(el => el.classList.toggle('is-active', el.dataset.accent === TWEAKS.accent));
    panel.querySelectorAll('[data-density]').forEach(el => el.classList.toggle('is-active', el.dataset.density === TWEAKS.density));
    panel.querySelector('[data-toggle="cursor"]').classList.toggle('is-on', !!TWEAKS.cursor);
    panel.querySelector('[data-toggle="grain"]').classList.toggle('is-on', !!TWEAKS.grain);
  };

  const persist = (edits) => {
    try {
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*');
    } catch {}
  };

  panel.addEventListener('click', (e) => {
    const acc = e.target.closest('[data-accent]');
    if (acc) {
      TWEAKS.accent = acc.dataset.accent;
      applyAccent(TWEAKS.accent);
      syncHighlights();
      persist({ accent: TWEAKS.accent });
      return;
    }
    const den = e.target.closest('[data-density]');
    if (den) {
      TWEAKS.density = den.dataset.density;
      applyDensity(TWEAKS.density);
      syncHighlights();
      persist({ density: TWEAKS.density });
      return;
    }
    const tog = e.target.closest('[data-toggle]');
    if (tog) {
      const k = tog.dataset.toggle;
      TWEAKS[k] = !TWEAKS[k];
      tog.classList.toggle('is-on', !!TWEAKS[k]);
      if (k === 'cursor') applyCursor(TWEAKS.cursor);
      if (k === 'grain') applyGrain(TWEAKS.grain);
      persist({ [k]: TWEAKS[k] });
      return;
    }
    if (e.target.closest('.tweaks__close')) {
      panel.hidden = true;
      try { window.parent.postMessage({ type: '__edit_mode_deactivated' }, '*'); } catch {}
    }
  });

  // Host protocol
  window.addEventListener('message', (e) => {
    const t = e.data && e.data.type;
    if (t === '__activate_edit_mode')   { panel.hidden = false; syncHighlights(); }
    if (t === '__deactivate_edit_mode') { panel.hidden = true; }
  });
  try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch {}

  // Apply initial state
  applyAll();
  syncHighlights();
})();
