// ============================================
//  joeldoesdata.com — scripts
// ============================================

// Commit activity — last 10 days (pulled from git log 2026-03-30 → 2026-04-08)
const commitData = [
  { date: 'Mar 30', commits: 20 },
  { date: 'Mar 31', commits: 74 },
  { date: 'Apr 1',  commits: 31 },
  { date: 'Apr 2',  commits: 8  },
  { date: 'Apr 3',  commits: 7  },
  { date: 'Apr 4',  commits: 12 },
  { date: 'Apr 5',  commits: 4  },
  { date: 'Apr 6',  commits: 11 },
  { date: 'Apr 7',  commits: 23 },
  { date: 'Apr 8',  commits: 3  },
];

function drawCommitChart() {
  const svg = document.getElementById('commit-chart');
  if (!svg) return;

  const labelsEl = document.getElementById('chart-labels');
  const w = svg.parentElement.clientWidth || 600;
  const h = 120;
  const barPad = 6;
  const n = commitData.length;
  const barW = (w - barPad * (n - 1)) / n;
  const maxCommits = Math.max(...commitData.map(d => d.commits));

  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', w);
  svg.innerHTML = '';

  commitData.forEach((d, i) => {
    const barH = Math.max(4, (d.commits / maxCommits) * (h - 16));
    const x = i * (barW + barPad);
    const y = h - barH;

    // Bar
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', barW);
    rect.setAttribute('height', barH);
    rect.setAttribute('fill', d.commits === maxCommits ? '#d4d4d4' : '#2a2a2a');
    rect.setAttribute('rx', 3);
    rect.style.transition = 'fill 200ms ease';

    rect.addEventListener('mouseenter', () => {
      if (d.commits !== maxCommits) rect.setAttribute('fill', '#444');
      tooltip.style.opacity = '1';
      tooltip.textContent = `${d.date}: ${d.commits} commits`;
    });
    rect.addEventListener('mouseleave', () => {
      if (d.commits !== maxCommits) rect.setAttribute('fill', '#2a2a2a');
      tooltip.style.opacity = '0';
    });

    svg.appendChild(rect);
  });

  // Tooltip
  const tooltip = document.createElement('div');
  tooltip.style.cssText = `
    position: absolute; top: -28px; left: 0;
    font-size: 11px; color: #888; pointer-events: none;
    opacity: 0; transition: opacity 150ms ease;
    font-family: var(--font-sans, Inter, sans-serif);
  `;
  svg.parentElement.style.position = 'relative';
  svg.parentElement.appendChild(tooltip);

  // Labels
  if (labelsEl) {
    labelsEl.innerHTML = '';
    // Show first, middle, last
    [0, 4, 9].forEach(i => {
      const span = document.createElement('span');
      span.textContent = commitData[i].date;
      labelsEl.appendChild(span);
    });
  }
}

// Staggered fade-in animation
function animateCards() {
  const cards = document.querySelectorAll('[data-animate]');
  cards.forEach((card, i) => {
    setTimeout(() => {
      card.classList.add('visible');
    }, i * 60);
  });
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  animateCards();
  drawCommitChart();
});

// Redraw chart on resize
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(drawCommitChart, 150);
});
