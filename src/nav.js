// Sidebar navigation shared by the chapters: mobile menu, active section and reading progress.
const $ = id => document.getElementById(id);

export function mountNav() {
  const menu = $('menu-toggle'), sidebar = $('sidebar'), mobile = window.matchMedia('(max-width:900px)');
  const syncNav = () => { sidebar.inert = mobile.matches && menu.getAttribute('aria-expanded') !== 'true'; };
  const closeMenu = () => { sidebar.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); syncNav(); };
  menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); sidebar.classList.toggle('open', open); syncNav(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { const was = menu.getAttribute('aria-expanded') === 'true'; closeMenu(); if (was && mobile.matches) menu.focus(); } });
  mobile.addEventListener('change', () => { closeMenu(); syncNav(); }); syncNav();
  document.addEventListener('click', e => { if (!sidebar.contains(e.target) && !menu.contains(e.target)) closeMenu(); });
  for (const link of sidebar.querySelectorAll('a')) link.addEventListener('click', closeMenu);
  const navLinks = [...sidebar.querySelectorAll('nav a')], sections = navLinks.map(a => document.querySelector(a.getAttribute('href')));
  let scrollScheduled = false;
  function updateReading() {
    const max = document.documentElement.scrollHeight - window.innerHeight, pct = Math.min(100, Math.max(0, max > 0 ? Math.round(window.scrollY / max * 100) : 0));
    $('progress-number').textContent = `${pct}%`; $('reading-progress').style.width = `${pct}%`;
    let current = sections[0]; for (const s of sections) if (s.getBoundingClientRect().top < window.innerHeight * .35) current = s;
    for (const l of navLinks) { const on = l.hash === `#${current.id}`; l.classList.toggle('active', on); if (on) l.setAttribute('aria-current', 'location'); else l.removeAttribute('aria-current'); }
    scrollScheduled = false;
  }
  window.addEventListener('scroll', () => { if (!scrollScheduled) { scrollScheduled = true; requestAnimationFrame(updateReading); } }, { passive: true });
  window.addEventListener('resize', updateReading);
  updateReading();
}
