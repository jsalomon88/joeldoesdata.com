/* =============================================
   joeldoesdata.com — scroll interactions
   ============================================= */

/* ─── Reveal on scroll ───────────────────────── */

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ─── Staggered children ─────────────────────── */

const childObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const children = entry.target.querySelectorAll('.reveal-child');
      children.forEach((child, i) => {
        setTimeout(() => child.classList.add('visible'), i * 80);
      });
      childObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.skill-grid, .stats-row, .project-cards, .timeline').forEach(el => {
  childObserver.observe(el);
});

/* ─── Skill bars ─────────────────────────────── */

const barObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.skill-bar-fill').forEach((bar, i) => {
        const pct = bar.dataset.pct;
        setTimeout(() => { bar.style.width = pct + '%'; }, i * 60 + 200);
      });
      barObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll('.skill-group').forEach(g => barObserver.observe(g));

/* ─── Count-up animation ─────────────────────── */

function countUp(el) {
  const target = parseInt(el.dataset.target, 10);
  const suffix = el.dataset.suffix || '';
  const duration = 1400;
  const start = performance.now();

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target + suffix;
  }
  requestAnimationFrame(step);
}

/* ─── Dynamic site stats ─────────────────────── */
// Fetch live stats first, then start the count-up observer.
// This prevents a race condition where countUp fires before the fetch
// resolves, causing stale hardcoded values to animate instead.

let statsReady = false;
const statsSection = document.getElementById('stats');

function triggerCountUp() {
  if (!statsSection) return;
  statsSection.querySelectorAll('.stat-number').forEach((el, i) => {
    setTimeout(() => countUp(el), i * 120);
  });
}

(async function () {
  try {
    const res = await fetch('./site-stats.json');
    if (!res.ok) return;
    const stats = await res.json();
    const commitsEl = document.querySelector('[data-stat="commits"]');
    const locEl = document.querySelector('[data-stat="loc"]');
    const recipesEl = document.querySelector('[data-stat="recipes"]');
    if (commitsEl) commitsEl.dataset.target = stats.commits;
    if (locEl) { locEl.dataset.target = stats.lines_of_code_k; locEl.dataset.suffix = 'K+'; }
    if (recipesEl && stats.recipe_count) recipesEl.textContent = stats.recipe_count;
  } catch (e) { /* fallback to hardcoded values */ }

  // Data is ready — start observer now. If section already in view, fire immediately.
  statsReady = true;
  if (statsSection) {
    const rect = statsSection.getBoundingClientRect();
    const inView = rect.top < window.innerHeight && rect.bottom > 0;
    if (inView) {
      triggerCountUp();
    } else {
      statObserver.observe(statsSection);
    }
  }
})();

const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      triggerCountUp();
      statObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

/* ─── GitHub activity chart ──────────────────── */

async function loadActivity() {
  const chartEl = document.getElementById('activity-chart');
  const labelsEl = document.getElementById('chart-labels');
  if (!chartEl) return;

  try {
    const res = await fetch('./commit-data.json');
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('Empty');

    const weeks = data.slice(-12);
    const max = Math.max(...weeks.map(w => w.total), 1);

    chartEl.innerHTML = '';
    labelsEl.innerHTML = '';

    weeks.forEach((week, i) => {
      const bar = document.createElement('div');
      bar.className = 'chart-bar';
      const pct = week.total / max;
      bar.style.height = Math.max(pct * 100, week.total > 0 ? 3 : 1) + '%';
      bar.addEventListener('click', e => { e.stopPropagation(); showTip(bar, `${week.total} commit${week.total !== 1 ? 's' : ''}`); });
      chartEl.appendChild(bar);
    });

    // Labels — show every 3 weeks
    weeks.forEach((week, i) => {
      const span = document.createElement('span');
      if (i % 3 === 0) {
        const d = new Date(week.week * 1000);
        span.textContent = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      labelsEl.appendChild(span);
    });

    // Animate bars on scroll
    const chartObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          chartEl.querySelectorAll('.chart-bar').forEach((bar, i) => {
            setTimeout(() => { bar.style.transform = 'scaleY(1)'; }, i * 28);
          });
          chartObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    chartObserver.observe(chartEl);

    // Build heatmap from last 16 weeks of daily data
    buildHeatmap(data.slice(-12));

  } catch (e) {
    chartEl.innerHTML = '<p style="color:#333;font-size:12px;letter-spacing:.04em;align-self:center;">Activity unavailable</p>';
    buildHeatmap(null);
  }
}

/* ─── Contribution heatmap ───────────────────── */

function buildHeatmap(weeks) {
  const el = document.getElementById('heatmap');
  if (!el) return;

  el.innerHTML = '';

  if (!weeks) {
    el.style.display = 'none';
    return;
  }

  const allCounts = weeks.flatMap(w => w.days);
  const max = Math.max(...allCounts, 1);

  weeks.forEach(week => {
    week.days.forEach(count => {
      const cell = document.createElement('div');
      cell.className = 'heat-cell';
      if (count > 0) {
        const level = count >= max * 0.75 ? 4
                    : count >= max * 0.4  ? 3
                    : count >= max * 0.15 ? 2
                    : 1;
        cell.dataset.level = level;
      }
      cell.addEventListener('click', e => { e.stopPropagation(); showTip(cell, `${count} commit${count !== 1 ? 's' : ''}`); });
      el.appendChild(cell);
    });
  });
}

/* ─── Pipeline interaction ───────────────────── */

(function () {
  const nodes = document.querySelectorAll('.pipeline-node');
  const descs = document.querySelectorAll('.pipeline-desc');
  const connectors = document.querySelectorAll('.pipeline-connector');
  if (!nodes.length) return;

  // Inject 3 animated dots into each connector
  connectors.forEach((c, i) => {
    for (let d = 0; d < 3; d++) {
      const dot = document.createElement('span');
      dot.className = 'pipeline-dot';
      // Stagger delays per connector so they don't all pulse together
      dot.style.animationDelay = `${d * 0.6 + i * 0.15}s`;
      c.appendChild(dot);
    }
  });

  function activate(index) {
    nodes.forEach(n => n.classList.toggle('is-active', +n.dataset.index === index));
    descs.forEach(d => d.classList.toggle('is-active', +d.dataset.index === index));
    // Flow dots on the connector leaving this node (last node uses the connector entering it)
    const flowIdx = Math.min(index, connectors.length - 1);
    connectors.forEach((c, i) => c.classList.toggle('is-flowing', i === flowIdx));
  }

  nodes.forEach(node => {
    node.addEventListener('mouseenter', () => activate(+node.dataset.index));
    node.addEventListener('click', () => activate(+node.dataset.index));
  });

  // Initialise with first node active
  activate(0);
})();

/* ─── Dynamic role duration ──────────────────── */

document.querySelectorAll('.timeline-duration[data-start]').forEach(el => {
  const [y, m] = el.dataset.start.split('-').map(Number);
  const now = new Date();
  const months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  const yrs = Math.floor(months / 12);
  const mos = months % 12;
  el.textContent = yrs > 0
    ? (mos > 0 ? `${yrs} yr ${mos} mo` : `${yrs} yr`)
    : `${months} mos`;
});

loadActivity();
loadRecipeCookDist();
loadRecipeScatter();

/* ─── Recipe category bubble chart ──────────── */

async function loadRecipeScatter() {
  const el = document.getElementById('recipe-scatter-chart');
  if (!el) return;

  try {
    const res = await fetch('./recipe-scatter.json');
    if (!res.ok) throw new Error('no data');
    const data = await res.json();
    const bubbles = data.bubbles;
    if (!bubbles || !bubbles.length) throw new Error('empty');

    const scatterCountEl = document.getElementById('scatter-count');
    if (scatterCountEl) scatterCountEl.textContent = bubbles.reduce((s, b) => s + b.count, 0);

    const H = 240;
    const PAD = { top: 20, right: 20, bottom: 44, left: 48 };
    const VW = 600;
    const plotW = VW - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    const maxPrep = Math.max(...bubbles.map(b => b.avg_prep), 1);
    const maxCook = Math.max(...bubbles.map(b => b.avg_cook), 1);
    const maxCount = Math.max(...bubbles.map(b => b.count), 1);

    const xScale = v => PAD.left + (v / (maxPrep * 1.15)) * plotW;
    const yScale = v => PAD.top + plotH - (v / (maxCook * 1.2)) * plotH;
    const rScale = v => 6 + (v / maxCount) * 22;

    let svg = `<svg viewBox="0 0 ${VW} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">`;

    // Gridlines
    [0.25, 0.5, 0.75, 1].forEach(frac => {
      const gy = PAD.top + plotH - frac * plotH;
      const gx = PAD.left + frac * plotW;
      const yVal = Math.round(frac * maxCook * 1.2);
      const xVal = Math.round(frac * maxPrep * 1.15);
      svg += `<line x1="${PAD.left}" y1="${gy}" x2="${PAD.left + plotW}" y2="${gy}" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>`;
      svg += `<line x1="${gx}" y1="${PAD.top}" x2="${gx}" y2="${PAD.top + plotH}" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>`;
      svg += `<text x="${PAD.left - 5}" y="${gy + 4}" text-anchor="end" fill="rgba(255,255,255,0.2)" font-size="8" font-family="JetBrains Mono,monospace">${yVal}m</text>`;
      svg += `<text x="${gx}" y="${PAD.top + plotH + 14}" text-anchor="middle" fill="rgba(255,255,255,0.2)" font-size="8" font-family="JetBrains Mono,monospace">${xVal}m</text>`;
    });

    // Axes
    svg += `<line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top + plotH}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`;
    svg += `<line x1="${PAD.left}" y1="${PAD.top + plotH}" x2="${PAD.left + plotW}" y2="${PAD.top + plotH}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`;

    // Axis labels
    svg += `<text x="${PAD.left + plotW / 2}" y="${H - 2}" text-anchor="middle" fill="rgba(255,255,255,0.25)" font-size="9" font-family="JetBrains Mono,monospace">avg prep time</text>`;
    svg += `<text x="10" y="${PAD.top + plotH / 2}" text-anchor="middle" fill="rgba(255,255,255,0.25)" font-size="9" font-family="JetBrains Mono,monospace" transform="rotate(-90,10,${PAD.top + plotH / 2})">avg cook time</text>`;

    // Bubbles (draw smaller ones on top by sorting by count desc)
    const sorted = [...bubbles].sort((a, b) => b.count - a.count);
    sorted.forEach(b => {
      const cx = xScale(b.avg_prep);
      const cy = yScale(b.avg_cook);
      const r = rScale(b.count);
      svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${b.color}" opacity="0.75"/>`;
      svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${b.color}" stroke-width="1" opacity="0.9"/>`;

      // Count centered inside bubble
      svg += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="rgba(255,255,255,0.85)" font-size="${Math.max(7, r * 0.55)}" font-family="JetBrains Mono,monospace" font-weight="600">${b.count}</text>`;
      // Category label above bubble
      const labelY = cy - r - 5;
      const fallbackY = cy + r + 12;
      svg += `<text x="${cx}" y="${labelY < PAD.top + 8 ? fallbackY : labelY}" text-anchor="middle" dominant-baseline="auto" fill="rgba(255,255,255,0.7)" font-size="9" font-family="Syne,sans-serif" font-weight="600">${b.category}</text>`;
    });

    svg += '</svg>';
    el.innerHTML = svg;
    animateSvgCircles(el.querySelector('svg'));

  } catch (e) {
    el.innerHTML = '<p style="color:#333;font-size:12px;letter-spacing:.04em;">Chart unavailable</p>';
  }
}

/* ─── SVG chart scroll animations ───────────── */

function animateSvgBars(container, baseY) {
  // baseY = bottom of plot area (y where bars touch the baseline)
  const rects = container.querySelectorAll('rect');
  rects.forEach(rect => {
    const targetH = parseFloat(rect.getAttribute('height'));
    const targetY = parseFloat(rect.getAttribute('y'));
    rect.setAttribute('height', 0);
    rect.setAttribute('y', baseY);
    rect._targetH = targetH;
    rect._targetY = targetY;
  });

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const allRects = entry.target.querySelectorAll('rect');
      allRects.forEach((rect, i) => {
        setTimeout(() => {
          rect.style.transition = 'height 500ms cubic-bezier(0.22,1,0.36,1), y 500ms cubic-bezier(0.22,1,0.36,1)';
          rect.setAttribute('height', rect._targetH);
          rect.setAttribute('y', rect._targetY);
        }, i * 50);
      });
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.2 });

  obs.observe(container);
}

function animateSvgCircles(container) {
  const circles = container.querySelectorAll('circle');
  circles.forEach(circle => {
    const targetR = parseFloat(circle.getAttribute('r'));
    circle.setAttribute('r', 0);
    circle._targetR = targetR;
  });

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const allCircles = entry.target.querySelectorAll('circle');
      allCircles.forEach((circle, i) => {
        setTimeout(() => {
          circle.style.transition = 'r 500ms cubic-bezier(0.34,1.56,0.64,1)';
          circle.setAttribute('r', circle._targetR);
        }, i * 80);
      });
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.2 });

  obs.observe(container);
}

/* ─── Recipe cook time distribution ─────────── */

async function loadRecipeCookDist() {
  const el = document.getElementById('recipe-cook-dist-chart');
  if (!el) return;

  try {
    const res = await fetch('./recipe-cook-dist.json');
    if (!res.ok) throw new Error('no data');
    const data = await res.json();

    const bins = data.bins;         // [{label, count}, ...]
    const smoothed = data.smoothed; // [float, ...]

    const peakLabel = document.getElementById('cook-dist-peak-label');
    if (peakLabel) peakLabel.textContent = `peak: ${data.peak_label} min`;
    const countEl = document.getElementById('cook-dist-count');
    if (countEl) countEl.textContent = data.total;

    const maxVal = Math.max(...bins.map(b => b.count), 1);
    const scaleMax = Math.max(maxVal, ...smoothed);

    const H = 180;
    const PAD = { top: 16, right: 12, bottom: 34, left: 36 };
    const VW = 600;
    const plotW = VW - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;
    const n = bins.length;
    const barW = plotW / n;

    const xMid = i => PAD.left + i * barW + barW / 2;
    const yPos = v => PAD.top + plotH - (v / scaleMax) * plotH;

    let svg = `<svg viewBox="0 0 ${VW} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">`;

    // Gridlines
    [0.5, 1].forEach(frac => {
      const y = PAD.top + plotH - frac * plotH;
      const val = Math.round(frac * scaleMax);
      svg += `<line x1="${PAD.left}" y1="${y}" x2="${PAD.left + plotW}" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`;
      svg += `<text x="${PAD.left - 5}" y="${y + 4}" text-anchor="end" fill="rgba(255,255,255,0.22)" font-size="9" font-family="JetBrains Mono,monospace">${val}</text>`;
    });

    // Peak bin index
    const peakIdx = bins.indexOf(bins.reduce((a, b) => a.count >= b.count ? a : b));

    // Bars
    bins.forEach(({ count }, i) => {
      const bh = (count / scaleMax) * plotH;
      const fill = i === peakIdx ? 'rgba(200,169,110,0.9)' : 'rgba(200,169,110,0.5)';
      svg += `<rect x="${PAD.left + i * barW + 2}" y="${yPos(count)}" width="${barW - 4}" height="${bh}" fill="${fill}" rx="2"/>`;
    });

    // Smoothed trend
    const pts = smoothed.map((v, i) => `${xMid(i)},${yPos(v)}`).join(' ');
    svg += `<polyline points="${pts}" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>`;

    // Peak dashed line
    const px = xMid(peakIdx);
    svg += `<line x1="${px}" y1="${PAD.top}" x2="${px}" y2="${PAD.top + plotH}" stroke="rgba(200,169,110,0.35)" stroke-width="1" stroke-dasharray="4,3"/>`;

    // X-axis labels
    bins.forEach(({ label }, i) => {
      svg += `<text x="${xMid(i)}" y="${H - 8}" text-anchor="middle" fill="rgba(255,255,255,0.28)" font-size="9" font-family="JetBrains Mono,monospace">${label}</text>`;
    });

    // Baseline
    svg += `<line x1="${PAD.left}" y1="${PAD.top + plotH}" x2="${PAD.left + plotW}" y2="${PAD.top + plotH}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`;

    svg += '</svg>';
    el.innerHTML = svg;
    animateSvgBars(el.querySelector('svg'), PAD.top + plotH);

  } catch (e) {
    el.innerHTML = '<p style="color:#333;font-size:12px;letter-spacing:.04em;">Distribution unavailable</p>';
  }
}

/* ─── Click tooltip ──────────────────────────── */

const _tip = document.createElement('div');
_tip.className = 'chart-tooltip';
_tip.style.display = 'none';
document.body.appendChild(_tip);

function showTip(el, text) {
  if (_tip._anchor === el && _tip.style.display !== 'none') { hideTip(); return; }
  _tip._anchor = el;
  _tip.textContent = text;
  _tip.style.display = 'block';
  const r = el.getBoundingClientRect();
  const tr = _tip.getBoundingClientRect();
  let left = r.left + r.width / 2 - tr.width / 2;
  let top  = r.top  - tr.height - 8;
  left = Math.max(8, Math.min(left, window.innerWidth - tr.width - 8));
  if (top < 8) top = r.bottom + 8;
  _tip.style.left = left + 'px';
  _tip.style.top  = top  + 'px';
}

function hideTip() { _tip.style.display = 'none'; _tip._anchor = null; }

document.addEventListener('click', e => {
  if (!e.target.closest('.chart-bar') && !e.target.closest('.heat-cell')) hideTip();
});
window.addEventListener('scroll', hideTip, { passive: true });

/* ─── Token usage chart ──────────────────────── */

async function loadTokenUsage() {
  const chartEl = document.getElementById('token-chart');
  const labelsEl = document.getElementById('token-labels');
  if (!chartEl) return;

  try {
    const res = await fetch('./token-usage.json');
    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('empty');

    const H = 120;
    const VW = 840; // viewBox width — scales responsively via preserveAspectRatio:none
    const PAD = { top: 8, right: 4, bottom: 4, left: 4 };
    const n = data.length;

    const maxOut = Math.max(...data.map(d => d.output_tokens || 0), 1);
    const maxInp = Math.max(...data.map(d => d.input_tokens || 0), 1);

    const xOf  = i => PAD.left + (i / (n - 1)) * (VW - PAD.left - PAD.right);
    const yOut = v => PAD.top + (1 - v / maxOut) * (H - PAD.top - PAD.bottom);
    const yInp = v => PAD.top + (1 - v / maxInp) * (H - PAD.top - PAD.bottom);

    const mkD = pts => 'M ' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L ');

    const outPts = data.map((d, i) => [xOf(i), yOut(d.output_tokens || 0)]);
    const inpPts = data.map((d, i) => [xOf(i), yInp(d.input_tokens || 0)]);

    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${VW} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.cssText = `width:100%;height:${H}px;display:block;overflow:visible;`;

    const mkPath = (d, stroke, opacity) => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', stroke);
      p.setAttribute('stroke-opacity', opacity);
      p.setAttribute('stroke-width', '1.5');
      p.setAttribute('stroke-linejoin', 'round');
      p.setAttribute('stroke-linecap', 'round');
      return p;
    };

    // Hover crosshair
    const vLine = document.createElementNS(NS, 'line');
    vLine.setAttribute('y1', PAD.top); vLine.setAttribute('y2', H - PAD.bottom);
    vLine.setAttribute('stroke', '#555'); vLine.setAttribute('stroke-width', '1');
    vLine.style.display = 'none';

    svg.appendChild(mkPath(mkD(outPts), '#4ade80', '0.7'));
    svg.appendChild(mkPath(mkD(inpPts), '#3a3a3a', '1'));
    svg.appendChild(vLine);

    // Full-area hover overlay
    const overlay = document.createElementNS(NS, 'rect');
    overlay.setAttribute('x', 0); overlay.setAttribute('y', 0);
    overlay.setAttribute('width', VW); overlay.setAttribute('height', H);
    overlay.setAttribute('fill', 'transparent');
    svg.appendChild(overlay);

    overlay.addEventListener('mousemove', e => {
      const rect = svg.getBoundingClientRect();
      const vx = ((e.clientX - rect.left) / rect.width) * VW;
      const step = (VW - PAD.left - PAD.right) / (n - 1);
      const idx = Math.max(0, Math.min(n - 1, Math.round((vx - PAD.left) / step)));
      const day = data[idx];
      const out = day.output_tokens || 0;
      const inp = day.input_tokens || 0;
      const ratio = inp > 0 ? (out / inp).toFixed(1) : '\u221e';
      const date = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      vLine.setAttribute('x1', xOf(idx)); vLine.setAttribute('x2', xOf(idx));
      vLine.style.display = '';

      _tip.textContent = `${date} \u00b7 ${(out / 1000).toFixed(1)}K out \u00b7 ${(inp / 1000).toFixed(1)}K in \u00b7 ${ratio}\u00d7 ratio`;
      _tip.style.display = 'block';
      const tr = _tip.getBoundingClientRect();
      let left = e.clientX - tr.width / 2;
      let top  = e.clientY - tr.height - 10;
      left = Math.max(8, Math.min(left, window.innerWidth - tr.width - 8));
      if (top < 8) top = e.clientY + 12;
      _tip.style.left = left + 'px';
      _tip.style.top  = top  + 'px';
      _tip._anchor = overlay;
    });

    overlay.addEventListener('mouseleave', () => { vLine.style.display = 'none'; hideTip(); });

    chartEl.innerHTML = '';
    chartEl.style.display = 'block';
    chartEl.style.height = H + 'px';
    chartEl.appendChild(svg);

    // Labels — every 2 weeks
    labelsEl.innerHTML = '';
    data.forEach((day, i) => {
      const span = document.createElement('span');
      if (i % 14 === 0) {
        const d = new Date(day.date + 'T00:00:00');
        span.textContent = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      labelsEl.appendChild(span);
    });

    // ── Total tokens bar chart ──────────────────
    const barEl = document.getElementById('token-total-chart');
    const barLabelsEl = document.getElementById('token-total-labels');
    if (barEl) {
      const maxTotal = Math.max(...data.map(d => (d.input_tokens || 0) + (d.output_tokens || 0) + (d.cache_tokens || 0)), 1);
      barEl.innerHTML = '';
      barLabelsEl.innerHTML = '';

      data.forEach((day) => {
        const total = (day.input_tokens || 0) + (day.output_tokens || 0) + (day.cache_tokens || 0);
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = Math.max((total / maxTotal) * 100, total > 0 ? 3 : 1) + '%';
        if (total > 0) {
          const date = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const tip = total > 1e6
            ? `${date} · ${(total / 1e6).toFixed(1)}M tokens`
            : `${date} · ${(total / 1000).toFixed(1)}K tokens`;
          bar.addEventListener('click', e => { e.stopPropagation(); showTip(bar, tip); });
        }
        barEl.appendChild(bar);
      });

      data.forEach((day, i) => {
        const span = document.createElement('span');
        if (i % 14 === 0) {
          const d = new Date(day.date + 'T00:00:00');
          span.textContent = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        barLabelsEl.appendChild(span);
      });

      const barObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            barEl.querySelectorAll('.chart-bar').forEach((b, i) => {
              setTimeout(() => { b.style.transform = 'scaleY(1)'; }, i * 18);
            });
            barObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.2 });
      barObserver.observe(barEl);
    }

  } catch (e) {
    chartEl.innerHTML = '<p style="color:#333;font-size:12px;letter-spacing:.04em;">Activity unavailable</p>';
  }
}

loadTokenUsage();
