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

/* ─── Dynamic site stats ─────────────────────── */

(async function () {
  try {
    const res = await fetch('./site-stats.json');
    if (!res.ok) return;
    const stats = await res.json();
    const commitsEl = document.querySelector('[data-stat="commits"]');
    const locEl = document.querySelector('[data-stat="loc"]');
    if (commitsEl) commitsEl.dataset.target = stats.commits;
    if (locEl) { locEl.dataset.target = stats.lines_of_code_k; locEl.dataset.suffix = 'K+'; }
  } catch (e) { /* fallback to hardcoded values */ }
})();

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

const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.stat-number').forEach((el, i) => {
        setTimeout(() => countUp(el), i * 120);
      });
      statObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

const statsSection = document.getElementById('stats');
if (statsSection) statObserver.observe(statsSection);

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

    const max = Math.max(...data.map(d => d.tokens), 1);

    chartEl.innerHTML = '';
    labelsEl.innerHTML = '';

    data.forEach((day, i) => {
      const bar = document.createElement('div');
      bar.className = 'chart-bar';
      const pct = day.tokens / max;
      bar.style.height = Math.max(pct * 100, day.tokens > 0 ? 3 : 1) + '%';
      const millions = (day.tokens / 1_000_000).toFixed(1);
      bar.addEventListener('click', e => { e.stopPropagation(); showTip(bar, `${millions}M tokens`); });
      chartEl.appendChild(bar);
    });

    // Labels — show every 2 weeks
    data.forEach((day, i) => {
      const span = document.createElement('span');
      if (i % 14 === 0) {
        const d = new Date(day.date + 'T00:00:00');
        span.textContent = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      labelsEl.appendChild(span);
    });

    // Animate on scroll
    const tokenObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          chartEl.querySelectorAll('.chart-bar').forEach((bar, i) => {
            setTimeout(() => { bar.style.transform = 'scaleY(1)'; }, i * 18);
          });
          tokenObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    tokenObserver.observe(chartEl);

  } catch (e) {
    chartEl.innerHTML = '<p style="color:#333;font-size:12px;letter-spacing:.04em;align-self:center;">Activity unavailable</p>';
  }
}

loadTokenUsage();
