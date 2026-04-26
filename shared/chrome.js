/* ============================================================
   Shared chrome: scroll reveal + cross-page transitions
   ============================================================ */

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


