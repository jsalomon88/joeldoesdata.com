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

    const weeks = data.slice(-26);
    const max = Math.max(...weeks.map(w => w.total), 1);

    chartEl.innerHTML = '';
    labelsEl.innerHTML = '';

    weeks.forEach((week, i) => {
      const bar = document.createElement('div');
      bar.className = 'chart-bar';
      const pct = week.total / max;
      bar.style.height = Math.max(pct * 100, week.total > 0 ? 3 : 1) + '%';
      bar.title = `${week.total} commit${week.total !== 1 ? 's' : ''}`;
      chartEl.appendChild(bar);
    });

    // Labels — show every 4 weeks
    weeks.forEach((week, i) => {
      const span = document.createElement('span');
      if (i % 4 === 0) {
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
    buildHeatmap(data.slice(-16));

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
      cell.title = `${count} commit${count !== 1 ? 's' : ''}`;
      el.appendChild(cell);
    });
  });
}

loadActivity();

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
      bar.title = `${millions}M tokens`;
      chartEl.appendChild(bar);
    });

    // Labels — show every 6 days
    data.forEach((day, i) => {
      const span = document.createElement('span');
      if (i % 6 === 0) {
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
