/* =============================================
   joeldoesdata.com — scroll interactions
   ============================================= */

/* ─── Remove retired portfolio sections ───────── */
document.getElementById('how')?.remove();
document.getElementById('demos')?.remove();

/* Center the shorter Experience column against Stack on desktop only. */
window.addEventListener('load', () => {
  const experience = document.getElementById('experience');
  const stack = document.getElementById('stack');
  if (!experience || !stack) return;
  function centerColumns() {
    const desktop = window.matchMedia('(min-width: 821px)').matches;
    experience.style.transform = '';
    experience.style.setProperty('--stack-content-height', desktop ? `${stack.querySelector('.stack')?.offsetHeight || 0}px` : '0px');
  }
  window.addEventListener('load', centerColumns);
  window.addEventListener('resize', centerColumns);
  requestAnimationFrame(centerColumns);
});

/* ─── Cabin light switch ──────────────────────── */
(function () {
  const toggle = document.getElementById('theme-switch');
  const state = document.getElementById('theme-state');
  if (!toggle || !state) return;

  const saved = localStorage.getItem('jdd-theme');
  toggle.checked = saved === 'light';

  function render() {
    const lightMode = toggle.checked;
    document.documentElement.classList.toggle('theme-dark', !lightMode);
    toggle.setAttribute('aria-label', lightMode ? 'Turn light mode off' : 'Turn light mode on');
    state.textContent = lightMode ? 'ON' : 'OFF';
  }

  toggle.addEventListener('change', () => {
    localStorage.setItem('jdd-theme', toggle.checked ? 'light' : 'dark');
    render();
  });

  render();
})();

/* ─── Experience-to-skill highlighting ───────── */
(function () {
  const companies = document.querySelectorAll('[data-company]');
  const skills = document.querySelectorAll('.skill');
  const allSkills = ['sql', 'dbt', 'snowflake', 'bigquery', 'data modelling', 'looker', 'sigma', 'power bi', 'metabase', 'data storytelling', 'product & gtm analytics', 'stakeholder comms', 'a/b testing', 'python', 'git', 'html / css', 'llm engineering', 'automation', 'agent deployment', 'claude skill authoring', 'statistical analysis'];
  const map = {
    agencyanalytics: allSkills.filter((skill) => skill !== 'power bi'),
    boldcommerce: allSkills.filter((skill) => !['sigma', 'power bi', 'metabase', 'claude skill authoring', 'agent deployment'].includes(skill)),
    freshbooks: ['sql', 'dbt', 'bigquery', 'data modelling', 'looker', 'data storytelling', 'product & gtm analytics', 'stakeholder comms', 'a/b testing', 'statistical analysis', 'automation', 'git', 'python'],
    ctc: ['sql', 'data modelling', 'power bi', 'stakeholder comms', 'data storytelling', 'automation']
  };
  function skillName(skill) {
    return skill.querySelector('.skill__name')?.textContent.toLowerCase().replace(/\s+/g, ' ').trim() || '';
  }
  function highlightCompany(company) {
    const related = map[company] || [];
    skills.forEach((skill) => {
      const isRelated = related.some((item) => skillName(skill).includes(item));
      skill.classList.toggle('is-related', isRelated);
      skill.classList.toggle('is-muted', Boolean(company) && !isRelated);
    });
    companies.forEach((item) => item.classList.remove('is-related', 'is-muted'));
  }
  function highlightSkill(skill) {
    const name = skillName(skill);
    skills.forEach((item) => item.classList.toggle('is-related', item === skill));
    skills.forEach((item) => item.classList.toggle('is-muted', item !== skill));
    companies.forEach((company) => {
      const isRelated = (map[company.dataset.company] || []).some((item) => name.includes(item));
      company.classList.toggle('is-related', isRelated);
      company.classList.toggle('is-muted', !isRelated);
    });
  }
  function clearHighlights() {
    skills.forEach((skill) => skill.classList.remove('is-related', 'is-muted'));
    companies.forEach((company) => company.classList.remove('is-related', 'is-muted'));
  }
  companies.forEach((company) => {
    company.addEventListener('mouseenter', () => highlightCompany(company.dataset.company));
    company.addEventListener('focus', () => highlightCompany(company.dataset.company));
    company.addEventListener('mouseleave', clearHighlights);
    company.addEventListener('blur', clearHighlights);
  });
  skills.forEach((skill) => {
    skill.addEventListener('mouseover', () => highlightSkill(skill));
    skill.addEventListener('focus', () => highlightSkill(skill));
    skill.addEventListener('mouseout', (event) => {
      if (!skill.contains(event.relatedTarget)) clearHighlights();
    });
    skill.addEventListener('blur', clearHighlights);
    skill.setAttribute('tabindex', '0');
  });
})();

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

/* ─── Dynamic role duration ───────────────────── */

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
