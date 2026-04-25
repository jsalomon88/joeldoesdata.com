/* ============================================================
   Shared chrome: cursor + scroll reveal + magnetic hovers
   ============================================================ */

(function () {
  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
  if (isTouch) return;

  // --- Cursor ---
  const dot = document.createElement('div');
  dot.className = 'cursor';
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let rx = mx, ry = my;
  window.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px)`;
  });

  (function loop() {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(loop);
  })();

  // Enlarge over interactive elements
  const interactive = 'a, button, .card, [data-cursor]';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(interactive)) document.body.classList.add('cursor-lg');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(interactive)) document.body.classList.remove('cursor-lg');
  });

  window.addEventListener('mouseleave', () => { dot.style.opacity = 0; ring.style.opacity = 0; });
  window.addEventListener('mouseenter', () => { dot.style.opacity = 1; ring.style.opacity = 1; });
})();

/* --- Scroll reveal --- */
(function () {
  // Convert [data-reveal] to .reveal FIRST, then observe
  document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('reveal'));
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });
  els.forEach(el => io.observe(el));
})();

/* --- Cross-page transition overlay ---
   When clicking internal links, fade the page out before navigating. */
(function () {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; background: var(--bg-0);
    z-index: 9998; opacity: 0; pointer-events: none;
    transition: opacity 300ms var(--e-out);
  `;
  document.body.appendChild(overlay);

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('http') || a.target === '_blank') return;
    if (!/\.html?($|\?|#)/.test(href) && !href.endsWith('/')) return;
    e.preventDefault();
    overlay.style.opacity = 1;
    setTimeout(() => { window.location.href = href; }, 280);
  });

  // Fade in on load
  overlay.style.opacity = 1;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.style.opacity = 0;
    });
  });
})();


