/* ============================================================
   joeldoesdata.com — page-specific behavior
   ============================================================ */

/* ---------- Scroll indicator fade-out ---------- */
(function () {
  const ind = document.querySelector('.scroll-indicator');
  if (!ind) return;
  window.addEventListener('scroll', () => {
    const opacity = Math.max(0, 1 - window.scrollY / 120);
    ind.style.opacity = opacity;
    ind.style.pointerEvents = opacity < 0.05 ? 'none' : '';
  }, { passive: true });
})();

/* ---------- Skill bar loading animation ----------
   Uses MutationObserver on each stack__col so bars only fire
   after chrome.js's reveal system has made the column visible.
   An IO would trigger on DOM intersection (including while the
   column is still opacity:0), causing the bars to finish before
   the user ever sees them. */
(function () {
  const cols = document.querySelectorAll('.stack__col');
  if (!cols.length) return;

  const trigger = (col) => {
    col.querySelectorAll('.bar i').forEach((bar, i) => {
      setTimeout(() => {
        bar.style.transition = 'transform 700ms cubic-bezier(0.22,1,0.36,1)';
        bar.style.transform = 'scaleX(1)';
      }, i * 70);
    });
  };

  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type !== 'attributes' || m.attributeName !== 'class') continue;
      const el = m.target;
      if (el.classList.contains('is-visible') && !el.dataset.barsTriggered) {
        el.dataset.barsTriggered = '1';
        trigger(el);
      }
    }
  });

  cols.forEach(col => mo.observe(col, { attributes: true }));
})();

/* ---------- Count-up numbers ---------- */
(function () {
  const els = document.querySelectorAll('[data-count]');
  const observe = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      const target = parseFloat(el.dataset.count);
      const dur = 1400;
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        const v = target * eased;
        el.textContent = Number.isInteger(target)
          ? Math.floor(v).toString()
          : v.toFixed(1);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target.toString();
      };
      requestAnimationFrame(step);
      observe.unobserve(el);
    }
  }, { threshold: 0.4 });
  els.forEach(el => observe.observe(el));
})();

/* ---------- Pipeline interaction ---------- */
(function () {
  const stages = document.querySelectorAll('.pipeline__stage');
  const quotes = document.querySelectorAll('[data-quote]');
  if (!stages.length) return;

  const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

  let active = 0;
  const setActive = (idx) => {
    active = idx;
    stages.forEach((s, i) => s.classList.toggle('is-active', i === idx));
    quotes.forEach((q, i) => q.hidden = i !== idx);
  };

  stages.forEach((s, i) => {
    s.addEventListener('mouseenter', () => { if (!isMobile()) setActive(i); });
    s.addEventListener('click', () => {
      if (isMobile()) {
        // Accordion: tap active to collapse, tap another to expand
        setActive(s.classList.contains('is-active') ? -1 : i);
      } else {
        setActive(i);
      }
    });
  });

  let timer = setInterval(() => { if (!isMobile()) setActive((active + 1) % stages.length); }, 4800);
  stages.forEach(s => s.addEventListener('mouseenter', () => { if (!isMobile()) clearInterval(timer); }));
})();

/* ---------- Chart tooltip ---------- */
const tip = (function () {
  const el = document.createElement('div');
  el.className = 'chart-tip';
  document.body.appendChild(el);
  return {
    show(x, y, html) {
      el.innerHTML = html;
      el.classList.add('is-visible');
      requestAnimationFrame(() => {
        const tw = el.offsetWidth;
        const th = el.offsetHeight;
        el.style.left = Math.min(x + 14, window.innerWidth - tw - 10) + 'px';
        el.style.top = Math.max(y - th - 10, 8) + 'px';
      });
    },
    hide() { el.classList.remove('is-visible'); }
  };
})();

/* ---------- Scroll-triggered animation helpers ---------- */

function animateBarsOnScroll(svg, baselineY, stagger = 40) {
  const rects = svg.querySelectorAll('rect');
  rects.forEach(rect => {
    rect.style.transformBox = 'fill-box';
    rect.style.transformOrigin = 'bottom';
    rect.style.transform = 'scaleY(0)';
  });
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.querySelectorAll('rect').forEach((rect, i) => {
        setTimeout(() => {
          rect.style.transition = `transform 650ms cubic-bezier(0.22,1,0.36,1)`;
          rect.style.transform = 'scaleY(1)';
        }, i * stagger);
      });
      io.unobserve(e.target);
    }
  }, { threshold: 0.15 });
  io.observe(svg);
}

function animateLineOnScroll(svg) {
  requestAnimationFrame(() => {
    const paths = svg.querySelectorAll('path');
    paths.forEach((path, i) => {
      const len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      path.style.transition = `stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1) ${i * 150}ms`;
    });
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.querySelectorAll('path').forEach(path => {
          path.style.strokeDashoffset = '0';
        });
        io.unobserve(e.target);
      }
    }, { threshold: 0.2 });
    io.observe(svg);
  });
}

function animateCirclesOnScroll(svg, stagger = 80) {
  const circles = svg.querySelectorAll('circle');
  circles.forEach(circle => {
    circle.dataset.targetR = circle.getAttribute('r');
    circle.setAttribute('r', 0);
  });
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.querySelectorAll('circle').forEach((c, i) => {
        setTimeout(() => {
          c.style.transition = 'r 500ms cubic-bezier(0.34,1.56,0.64,1)';
          c.setAttribute('r', c.dataset.targetR);
        }, i * stagger);
      });
      io.unobserve(e.target);
    }
  }, { threshold: 0.2 });
  io.observe(svg);
}

function animateHeatmapOnScroll(el) {
  const cells = el.querySelectorAll('.cell');
  cells.forEach(cell => {
    cell.style.opacity = '0';
    cell.style.transform = 'scale(0.4)';
    cell.style.transition = 'opacity 280ms var(--e-out), transform 280ms var(--e-out)';
  });
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.querySelectorAll('.cell').forEach((cell, i) => {
        setTimeout(() => {
          cell.style.opacity = '';
          cell.style.transform = '';
        }, i * 6);
      });
      io.unobserve(e.target);
    }
  }, { threshold: 0.15 });
  io.observe(el);
}

/* ---------- SVG tooltip helper ----------
   Maps a mousemove event on an SVG to a data-index and shows a tooltip. */
function addSvgTooltip(svg, viewW, count, labelFn) {
  svg.addEventListener('mousemove', (e) => {
    const rect = svg.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const svgX = (px / rect.width) * viewW;
    const idx = Math.max(0, Math.min(count - 1, Math.floor((svgX / viewW) * count)));
    tip.show(e.clientX, e.clientY, labelFn(idx));
  });
  svg.addEventListener('mouseleave', () => tip.hide());
}

/* ---------- Data-driven charts ---------- */
(async function () {
  const [commitData, tokenData] = await Promise.all([
    fetch('./commit-data.json').then(r => r.json()).catch(() => null),
    fetch('./token-usage.json').then(r => r.json()).catch(() => null),
  ]);

  /* --- Wire commit count card to live data --- */
  if (commitData) {
    const totalCommits = commitData.reduce((s, w) => s + w.total, 0);
    const countEl = document.querySelector('[data-stat="commits"]');
    if (countEl) {
      countEl.dataset.count = totalCommits;
      countEl.textContent = totalCommits.toString();
      const sub = countEl.closest('.num-card')?.querySelector('.num-card__sub');
      if (sub) sub.textContent = 'Last 12 weeks';
    }
  }

  /* --- Commits bar chart --- */
  (function () {
    const svg = document.querySelector('svg.commits');
    if (!svg || !commitData) return;

    const data = commitData.map(w => w.total);
    const W = 1200, H = 240, pad = 6;
    const n = data.length;
    const maxV = Math.max(...data, 1);
    const barW = (W - pad * (n + 1)) / n;

    let html = '';
    for (let i = 0; i < n; i++) {
      const v = data[i];
      const h = v === 0 ? 4 : (v / maxV) * (H - 24);
      const y = H - h;
      const x = pad + i * (barW + pad);
      const op = v === 0 ? 0.22 : (0.35 + 0.65 * v / maxV);
      html += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="var(--accent)" opacity="${op}" rx="1"/>`;
    }
    html += `<line x1="0" y1="${H - 2}" x2="${W}" y2="${H - 2}" stroke="var(--hairline)" stroke-width="1"/>`;
    svg.innerHTML = html;
    animateBarsOnScroll(svg, H - 2, 28);

    const axis = document.getElementById('commitsAxis');
    if (axis) {
      axis.innerHTML = commitData.map((w, i) => {
        if (i % 3 !== 0) return '<span></span>';
        const d = new Date(w.week * 1000);
        return `<span>${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>`;
      }).join('');
    }

    addSvgTooltip(svg, W, n, (i) => {
      const w = commitData[i];
      const d = new Date(w.week * 1000);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `<span style="opacity:.6">Week of ${label}</span> · <b>${w.total}</b> commit${w.total !== 1 ? 's' : ''}`;
    });
  })();

  /* --- Heatmap --- */
  (function () {
    const el = document.getElementById('heatmap');
    if (!el || !commitData) return;

    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const maxDay = Math.max(...commitData.flatMap(w => w.days), 1);

    const allDays = commitData.flatMap(w =>
      w.days.map((count, di) => {
        const ts = w.week * 1000 + di * 86400000;
        const d = new Date(ts);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dayName = DAY_NAMES[di];
        const ratio = count / maxDay;
        const lvl = count === 0 ? 0 : ratio > 0.75 ? 4 : ratio > 0.45 ? 3 : ratio > 0.2 ? 2 : 1;
        return { count, lvl, label, dayName };
      })
    );

    el.innerHTML = allDays.map(({ count, lvl, label, dayName }) =>
      `<div class="cell" data-lvl="${lvl}" data-tip="${dayName} ${label}: ${count} commit${count !== 1 ? 's' : ''}"></div>`
    ).join('');

    el.querySelectorAll('.cell').forEach(cell => {
      cell.addEventListener('mouseenter', (e) => tip.show(e.clientX, e.clientY, cell.dataset.tip));
      cell.addEventListener('mousemove', (e) => tip.show(e.clientX, e.clientY, cell.dataset.tip));
      cell.addEventListener('mouseleave', () => tip.hide());
    });

    animateHeatmapOnScroll(el);

    // Y-axis: day labels
    const daysEl = document.getElementById('heatmapDays');
    if (daysEl) {
      daysEl.innerHTML = DAY_NAMES.map(d => `<span>${d}</span>`).join('');
    }

    // X-axis: month labels at each month boundary
    const weeksEl = document.getElementById('heatmapWeeks');
    if (weeksEl) {
      weeksEl.innerHTML = commitData.map((w, i) => {
        const d = new Date(w.week * 1000);
        const prev = i > 0 ? new Date(commitData[i - 1].week * 1000) : null;
        const label = (!prev || d.getMonth() !== prev.getMonth())
          ? d.toLocaleDateString('en-US', { month: 'short' })
          : '';
        return `<span>${label}</span>`;
      }).join('');
    }

    // Size cells to fill the full container width
    const weeks = commitData.length;
    function sizeHeatmap() {
      const availW = el.clientWidth;
      if (availW > 0 && weeks > 0) {
        const cellW = Math.floor((availW - 3 * (weeks - 1)) / weeks);
        if (cellW > 0) {
          el.style.gridAutoColumns = cellW + 'px';
          el.style.gridTemplateRows = 'repeat(7, 14px)';
          if (weeksEl) weeksEl.style.gridAutoColumns = cellW + 'px';
        }
      }
    }
    requestAnimationFrame(sizeHeatmap);
    window.addEventListener('resize', sizeHeatmap);
  })();

  /* --- Tokens histogram --- */
  (function () {
    const svg = document.querySelector('svg.tokens');
    if (!svg) return;

    const data = tokenData
      ? tokenData.map(d => (d.output_tokens || 0) + (d.input_tokens || 0))
      : Array.from({ length: 84 }, (_, i) => i < 50 ? 0 : Math.random() * 0.7 + 0.3);
    const days = data.length;
    const max = Math.max(...data, 1);
    const W = 1200, H = 200;
    const barW = W / days - 2;

    let html = '';
    for (let i = 0; i < days; i++) {
      const v = data[i] / max;
      const h = Math.max(1, v * (H - 20));
      const y = H - h;
      const x = i * (W / days) + 1;
      html += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="var(--accent)" opacity="${0.3 + 0.7 * v}"/>`;
    }
    html += `<line x1="0" y1="${H - 1}" x2="${W}" y2="${H - 1}" stroke="var(--hairline)"/>`;
    svg.innerHTML = html;
    animateBarsOnScroll(svg, H - 1, 4);

    if (tokenData) {
      const peakIdx = data.indexOf(Math.max(...data));
      const peakDate = new Date(tokenData[peakIdx].date);
      const peakLabel = peakDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const peakVal = Math.round(max / 1000);
      const peakEl = document.getElementById('tokensPeak');
      if (peakEl) peakEl.textContent = `${peakLabel} · ${peakVal}K`;
    }

    const axis = document.getElementById('tokensAxis');
    if (axis && tokenData) {
      const step = Math.floor(days / 6);
      axis.innerHTML = tokenData.map((d, i) => {
        if (i % step !== 0) return '<span></span>';
        return `<span>${new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>`;
      }).join('');
    }

    if (tokenData) {
      addSvgTooltip(svg, W, days, (i) => {
        const d = tokenData[i];
        const total = Math.round(((d.output_tokens || 0) + (d.input_tokens || 0)) / 1000);
        const dateLabel = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `<span style="opacity:.6">${dateLabel}</span> · <b>${total}K</b> tokens`;
      });
    }
  })();

  /* --- Token output vs. input line chart --- */
  (function () {
    const svg = document.querySelector('svg.tokens-line');
    if (!svg || !tokenData) return;

    const n = tokenData.length;
    const W = 1200, H = 180;
    const pad = { t: 8, r: 4, b: 4, l: 4 };
    const maxOut = Math.max(...tokenData.map(d => d.output_tokens || 0), 1);
    const maxInp = Math.max(...tokenData.map(d => d.input_tokens || 0), 1);

    const xOf  = i => pad.l + (i / (n - 1)) * (W - pad.l - pad.r);
    const yOut = v => pad.t + (1 - v / maxOut) * (H - pad.t - pad.b);
    const yInp = v => pad.t + (1 - v / maxInp) * (H - pad.t - pad.b);

    const mkD = pts => 'M ' + pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L ');
    const outPts = tokenData.map((d, i) => [xOf(i), yOut(d.output_tokens || 0)]);
    const inpPts = tokenData.map((d, i) => [xOf(i), yInp(d.input_tokens || 0)]);

    // Invisible hit-area rects for per-day tooltip targeting
    let hitAreas = '';
    const colW = (W - pad.l - pad.r) / n;
    for (let i = 0; i < n; i++) {
      hitAreas += `<rect class="hit" x="${(pad.l + i * colW).toFixed(1)}" y="0" width="${colW.toFixed(1)}" height="${H}" fill="transparent" data-i="${i}"/>`;
    }

    svg.innerHTML = `
      <line x1="0" y1="${H - 1}" x2="${W}" y2="${H - 1}" stroke="var(--hairline)"/>
      <path d="${mkD(outPts)}" fill="none" stroke="var(--accent)" stroke-opacity="0.7" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="${mkD(inpPts)}" fill="none" stroke="var(--ink-3)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${hitAreas}
    `;
    animateLineOnScroll(svg);

    svg.querySelectorAll('rect.hit').forEach(rect => {
      rect.addEventListener('mouseenter', (e) => {
        const i = parseInt(rect.dataset.i);
        const d = tokenData[i];
        const outK = Math.round((d.output_tokens || 0) / 1000);
        const inpK = Math.round((d.input_tokens || 0) / 1000);
        const dateLabel = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        tip.show(e.clientX, e.clientY,
          `<span style="opacity:.6">${dateLabel}</span> · out <b>${outK}K</b> · in <b>${inpK}K</b>`);
      });
      rect.addEventListener('mousemove', (e) => {
        const i = parseInt(rect.dataset.i);
        const d = tokenData[i];
        const outK = Math.round((d.output_tokens || 0) / 1000);
        const inpK = Math.round((d.input_tokens || 0) / 1000);
        const dateLabel = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        tip.show(e.clientX, e.clientY,
          `<span style="opacity:.6">${dateLabel}</span> · out <b>${outK}K</b> · in <b>${inpK}K</b>`);
      });
      rect.addEventListener('mouseleave', () => tip.hide());
    });

    const lineAxis = document.getElementById('tokensLineAxis');
    if (lineAxis) {
      const step = Math.floor(n / 6);
      lineAxis.innerHTML = tokenData.map((d, i) => {
        if (i % step !== 0) return '<span></span>';
        return `<span>${new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>`;
      }).join('');
    }
  })();
})();


/* ---------- Recipe charts (jtmeals live data) ---------- */
(async function () {
  const [cookData, bubbleData] = await Promise.all([
    fetch('./recipe-cook-dist.json').then(r => r.json()).catch(() => null),
    fetch('./recipe-scatter.json').then(r => r.json()).catch(() => null),
  ]);

  /* --- Cook time histogram --- */
  (function () {
    const svg = document.querySelector('svg.cooktime');
    if (!svg || !cookData) return;

    const bins = cookData.bins;
    const smoothed = cookData.smoothed;
    const W = 900, H = 280, marginX = 48, marginY = 30;
    const innerW = W - marginX * 2, innerH = H - marginY * 2;
    const maxCount = Math.max(...bins.map(b => b.count), 1);
    const step = innerW / bins.length;
    const barW = step * 0.72;

    let html = '';
    [Math.ceil(maxCount / 2), maxCount].forEach(v => {
      const y = marginY + (1 - v / maxCount) * innerH;
      html += `<line x1="${marginX}" y1="${y}" x2="${W - marginX}" y2="${y}" stroke="var(--hairline)" stroke-dasharray="2 3"/>`;
      html += `<text x="${marginX - 8}" y="${y + 4}" text-anchor="end" fill="var(--ink-4)" font-family="JetBrains Mono" font-size="10">${v}</text>`;
    });

    if (smoothed && smoothed.length === bins.length) {
      const smoothMax = Math.max(...smoothed, 1);
      const trendPts = smoothed.map((v, i) => [
        marginX + step * i + step / 2,
        marginY + (1 - v / smoothMax) * innerH,
      ]);
      html += `<path d="M ${trendPts.map(p => p.join(',')).join(' L ')}" fill="none" stroke="var(--ink-3)" stroke-width="1.5"/>`;
    }

    bins.forEach((b, i) => {
      const x = marginX + step * i + (step - barW) / 2;
      const h = (b.count / maxCount) * innerH;
      const y = marginY + innerH - h;
      html += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="var(--accent)" opacity="${b.label === cookData.peak_label ? 1 : 0.55}"/>`;
      html += `<text x="${x + barW / 2}" y="${H - 8}" text-anchor="middle" fill="var(--ink-3)" font-family="JetBrains Mono" font-size="11">${b.label}</text>`;
    });
    svg.innerHTML = html;
    animateBarsOnScroll(svg, marginY + innerH, 30);

    const peakEl = svg.closest('.demo')?.querySelector('.peak');
    if (peakEl && cookData.peak_label) peakEl.textContent = `peak: ${cookData.peak_label} min`;

    addSvgTooltip(svg, W, bins.length, (i) => {
      const b = bins[i];
      return `<span style="opacity:.6">${b.label} min</span> · <b>${b.count}</b> recipe${b.count !== 1 ? 's' : ''}`;
    });
  })();

  /* --- Bubble chart --- */
  (function () {
    const svg = document.querySelector('svg.bubbles');
    if (!svg || !bubbleData) return;

    const cats = bubbleData.bubbles;
    const W = 900, H = 360, mx = 58, my = 40;
    const maxPrep = Math.max(...cats.map(c => c.avg_prep), 1) * 1.15;
    const maxCook = Math.max(...cats.map(c => c.avg_cook), 1) * 1.15;

    let html = '';
    html += `<line x1="${mx}" y1="${H - my}" x2="${W - 20}" y2="${H - my}" stroke="var(--hairline)"/>`;
    html += `<line x1="${mx}" y1="${my}" x2="${mx}" y2="${H - my}" stroke="var(--hairline)"/>`;

    for (let i = 1; i <= 4; i++) {
      const v = Math.round(maxCook * i / 4);
      const y = H - my - (v / maxCook) * (H - my * 2);
      html += `<line x1="${mx}" y1="${y}" x2="${W - 20}" y2="${y}" stroke="var(--hairline)" stroke-dasharray="2 4"/>`;
      html += `<text x="${mx - 6}" y="${y + 4}" text-anchor="end" fill="var(--ink-4)" font-family="JetBrains Mono" font-size="10">${v}m</text>`;
    }
    for (let i = 1; i <= 4; i++) {
      const v = Math.round(maxPrep * i / 4);
      const x = mx + (v / maxPrep) * (W - mx - 20);
      html += `<text x="${x}" y="${H - 18}" text-anchor="middle" fill="var(--ink-4)" font-family="JetBrains Mono" font-size="10">${v}m</text>`;
    }
    html += `<text x="${W / 2}" y="${H - 4}" text-anchor="middle" fill="var(--ink-3)" font-family="JetBrains Mono" font-size="10">avg prep time</text>`;
    html += `<text x="16" y="${H / 2}" text-anchor="middle" transform="rotate(-90 16 ${H / 2})" fill="var(--ink-3)" font-family="JetBrains Mono" font-size="10">avg cook time</text>`;

    cats.forEach(c => {
      const x = mx + (c.avg_prep / maxPrep) * (W - mx - 20);
      const y = H - my - (c.avg_cook / maxCook) * (H - my * 2);
      const r = 8 + Math.sqrt(c.count) * 7;
      html += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.color}" opacity="0.85" data-cat="${c.category}" data-count="${c.count}" data-prep="${c.avg_prep}" data-cook="${c.avg_cook}"/>`;
      html += `<text x="${x}" y="${y - r - 6}" text-anchor="middle" fill="var(--ink-1)" font-family="Inter Tight" font-size="12" font-weight="500">${c.category}</text>`;
      html += `<text x="${x}" y="${y + 4}" text-anchor="middle" fill="#fff" font-family="Inter Tight" font-size="${Math.min(16, 10 + r / 4)}" font-weight="600">${c.count}</text>`;
    });
    svg.innerHTML = html;
    animateCirclesOnScroll(svg, 80);

    svg.querySelectorAll('circle').forEach(circle => {
      circle.style.cursor = 'default';
      circle.addEventListener('mouseenter', (e) => {
        const cat = circle.dataset.cat;
        const count = circle.dataset.count;
        const prep = Math.round(circle.dataset.prep);
        const cook = Math.round(circle.dataset.cook);
        tip.show(e.clientX, e.clientY,
          `<b>${cat}</b> · ${count} recipes · prep ${prep}m · cook ${cook}m`);
      });
      circle.addEventListener('mousemove', (e) => {
        const cat = circle.dataset.cat;
        const count = circle.dataset.count;
        const prep = Math.round(circle.dataset.prep);
        const cook = Math.round(circle.dataset.cook);
        tip.show(e.clientX, e.clientY,
          `<b>${cat}</b> · ${count} recipes · prep ${prep}m · cook ${cook}m`);
      });
      circle.addEventListener('mouseleave', () => tip.hide());
    });
  })();
})();
