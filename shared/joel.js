/* ============================================================
   joeldoesdata.com — page-specific behavior
   ============================================================ */

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

  let active = 0;
  const setActive = (idx) => {
    active = idx;
    stages.forEach((s, i) => s.classList.toggle('is-active', i === idx));
    quotes.forEach((q, i) => q.hidden = i !== idx);
  };

  stages.forEach((s, i) => {
    s.addEventListener('mouseenter', () => setActive(i));
    s.addEventListener('click', () => setActive(i));
  });

  let timer = setInterval(() => setActive((active + 1) % stages.length), 4800);
  stages.forEach(s => {
    s.addEventListener('mouseenter', () => clearInterval(timer));
  });
})();

/* ---------- Data-driven charts ---------- */
(async function () {
  const [commitData, tokenData, cookData, bubbleData] = await Promise.all([
    fetch('./commit-data.json').then(r => r.json()).catch(() => null),
    fetch('./token-usage.json').then(r => r.json()).catch(() => null),
    fetch('./recipe-cook-dist.json').then(r => r.json()).catch(() => null),
    fetch('./recipe-scatter.json').then(r => r.json()).catch(() => null),
  ]);

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
      html += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="var(--accent)" opacity="${op}" rx="1">
        <animate attributeName="height" from="0" to="${h}" dur="800ms" begin="${i * 40}ms" fill="freeze"/>
        <animate attributeName="y" from="${H}" to="${y}" dur="800ms" begin="${i * 40}ms" fill="freeze"/>
      </rect>`;
    }
    html += `<line x1="0" y1="${H - 2}" x2="${W}" y2="${H - 2}" stroke="var(--hairline)" stroke-width="1"/>`;
    svg.innerHTML = html;

    const axis = document.getElementById('commitsAxis');
    if (axis) {
      const labels = commitData.map((w, i) => {
        if (i % 3 !== 0) return '';
        const d = new Date(w.week * 1000);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });
      axis.innerHTML = labels.map(l => `<span>${l}</span>`).join('');
    }
  })();

  /* --- Heatmap --- */
  (function () {
    const el = document.getElementById('heatmap');
    if (!el || !commitData) return;

    const maxDay = Math.max(...commitData.flatMap(w => w.days), 1);
    const cells = commitData.flatMap(w => w.days.map(count => {
      if (count === 0) return 0;
      const ratio = count / maxDay;
      if (ratio > 0.75) return 4;
      if (ratio > 0.45) return 3;
      if (ratio > 0.2) return 2;
      return 1;
    }));

    el.innerHTML = cells.map((lvl, i) =>
      `<div class="cell" data-lvl="${lvl}" style="--i:${i}"></div>`
    ).join('');
  })();

  /* --- Tokens histogram --- */
  (function () {
    const svg = document.querySelector('svg.tokens');
    if (!svg || !tokenData) return;

    const data = tokenData.map(d => d.output_tokens + d.input_tokens);
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

    const peakIdx = data.indexOf(Math.max(...data));
    const peakDate = new Date(tokenData[peakIdx].date);
    const peakLabel = peakDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const peakVal = Math.round(max / 1000);
    const legendEl = svg.closest('.chart')?.querySelector('.chart__legend b');
    if (legendEl) legendEl.textContent = `peak: ${peakLabel} · ${peakVal}K`;

    const axis = document.getElementById('tokensAxis');
    if (axis) {
      const step = Math.floor(days / 6);
      const labels = tokenData.map((d, i) => {
        if (i % step !== 0) return '';
        return new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });
      axis.innerHTML = labels.map(l => `<span>${l}</span>`).join('');
    }
  })();

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

    const peakEl = svg.closest('.demo')?.querySelector('.peak');
    if (peakEl && cookData.peak_label) peakEl.textContent = `peak: ${cookData.peak_label} min`;
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
      html += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.color}" opacity="0.85"/>`;
      html += `<text x="${x}" y="${y - r - 6}" text-anchor="middle" fill="var(--ink-1)" font-family="Inter Tight" font-size="12" font-weight="500">${c.category}</text>`;
      html += `<text x="${x}" y="${y + 4}" text-anchor="middle" fill="#fff" font-family="Inter Tight" font-size="${Math.min(16, 10 + r / 4)}" font-weight="600">${c.count}</text>`;
    });
    svg.innerHTML = html;
  })();
})();
