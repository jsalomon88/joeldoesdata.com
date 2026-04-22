/* ============================================================
   caliper — rink + line chart
   ============================================================ */

/* ---------- Rink ---------- */
(function () {
  const svg = document.querySelector('.rink-svg');
  if (!svg) return;

  const W = 420, H = 360;
  let html = '';

  // Rink background (half rink, offensive zone)
  html += `<rect x="10" y="10" width="${W-20}" height="${H-20}" fill="#0d1116" stroke="var(--hairline-strong)" stroke-width="1" rx="28"/>`;
  // Blue line
  html += `<line x1="10" y1="90" x2="${W-10}" y2="90" stroke="#4a7bb8" stroke-width="3" opacity="0.5"/>`;
  // Goal line
  html += `<line x1="10" y1="${H-40}" x2="${W-10}" y2="${H-40}" stroke="#C15050" stroke-width="1.5" opacity="0.6"/>`;
  // Faceoff circles
  [[130, 180], [290, 180]].forEach(([cx, cy]) => {
    html += `<circle cx="${cx}" cy="${cy}" r="38" fill="none" stroke="#4a7bb8" stroke-width="1" opacity="0.35"/>`;
    html += `<circle cx="${cx}" cy="${cy}" r="2" fill="#C15050" opacity="0.6"/>`;
  });
  // Crease
  html += `<path d="M ${W/2 - 30} ${H-40} A 30 30 0 0 1 ${W/2 + 30} ${H-40} Z" fill="#4a7bb8" opacity="0.15" stroke="#4a7bb8" stroke-width="1" opacity=".45"/>`;
  // Goal
  html += `<rect x="${W/2 - 14}" y="${H-42}" width="28" height="6" fill="none" stroke="var(--accent)" stroke-width="1.5"/>`;

  // Shot plots
  const shots = [];
  // Slot (hot zone)
  for (let i = 0; i < 22; i++) {
    const x = W/2 + (Math.random() - 0.5) * 50;
    const y = H - 80 + (Math.random() - 0.5) * 60;
    const goal = Math.random() < 0.45;
    shots.push({x, y, goal, missed: false});
  }
  // Circles
  for (let i = 0; i < 20; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = W/2 + side * (90 + Math.random() * 30);
    const y = H - 150 + (Math.random() - 0.5) * 60;
    const goal = Math.random() < 0.12;
    shots.push({x, y, goal, missed: Math.random() < 0.2});
  }
  // Point
  for (let i = 0; i < 8; i++) {
    const x = 80 + Math.random() * (W - 160);
    const y = 100 + Math.random() * 40;
    shots.push({x, y, goal: Math.random() < 0.05, missed: Math.random() < 0.3});
  }

  shots.forEach(s => {
    if (s.goal) {
      html += `<circle cx="${s.x}" cy="${s.y}" r="5" fill="var(--accent)" opacity="0.95"/>`;
      html += `<circle cx="${s.x}" cy="${s.y}" r="9" fill="none" stroke="var(--accent)" stroke-width="1" opacity="0.45"/>`;
    } else if (s.missed) {
      html += `<circle cx="${s.x}" cy="${s.y}" r="2.5" fill="var(--ink-4)" opacity="0.55"/>`;
    } else {
      html += `<circle cx="${s.x}" cy="${s.y}" r="3.5" fill="var(--accent)" opacity="0.4"/>`;
    }
  });

  svg.innerHTML = html;
})();

/* ---------- Line chart: rolling pts/60 ---------- */
(function () {
  const svg = document.querySelector('svg.cal-line');
  if (!svg) return;
  const W = 800, H = 220, mx = 40, my = 24;
  const games = 78;
  const data = [];
  let v = 2.4;
  for (let i = 0; i < games; i++) {
    v += (Math.random() - 0.5) * 0.4;
    v = Math.max(1.2, Math.min(4.2, v + (i / games) * 0.04));
    data.push(v);
  }
  const max = 4.2, min = 1.2;
  const sx = i => mx + (i / (games - 1)) * (W - mx - 20);
  const sy = val => my + (1 - (val - min) / (max - min)) * (H - my * 2);

  let html = '';
  // Grid
  [1.5, 2.5, 3.5].forEach(yv => {
    const y = sy(yv);
    html += `<line x1="${mx}" y1="${y}" x2="${W-20}" y2="${y}" stroke="var(--hairline)" stroke-dasharray="2 4"/>`;
    html += `<text x="${mx-6}" y="${y+3}" text-anchor="end" fill="var(--ink-4)" font-family="JetBrains Mono" font-size="10">${yv.toFixed(1)}</text>`;
  });

  // League avg line
  const avgY = sy(2.1);
  html += `<line x1="${mx}" y1="${avgY}" x2="${W-20}" y2="${avgY}" stroke="var(--ink-4)" stroke-dasharray="4 4" opacity="0.6"/>`;
  html += `<text x="${W-24}" y="${avgY-4}" text-anchor="end" fill="var(--ink-3)" font-family="JetBrains Mono" font-size="10">league avg</text>`;

  // Area
  let areaPts = data.map((d, i) => `${sx(i)},${sy(d)}`).join(' L ');
  html += `<path d="M ${sx(0)},${sy(min)} L ${areaPts} L ${sx(games-1)},${sy(min)} Z" fill="var(--accent)" opacity="0.12"/>`;
  // Line
  html += `<path d="M ${areaPts}" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round"/>`;
  // End marker
  const lx = sx(games-1), ly = sy(data[games-1]);
  html += `<circle cx="${lx}" cy="${ly}" r="4" fill="var(--accent)"/>`;
  html += `<circle cx="${lx}" cy="${ly}" r="9" fill="none" stroke="var(--accent)" opacity="0.4"/>`;

  svg.innerHTML = html;
})();
