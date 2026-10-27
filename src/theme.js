// Apply the preference before the stylesheet paints, then wire up both controls.
(() => {
  const key = 'es1-color-theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = null;
  try { preference = localStorage.getItem(key); } catch { /* Storage is optional. */ }
  if (!['light', 'dark'].includes(preference)) preference = null;

  function applyTheme() {
    const dark = (preference || (system.matches ? 'dark' : 'light')) === 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#202124' : '#ffffff');
    for (const button of document.querySelectorAll('[data-theme-toggle]')) {
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
      const label = button.querySelector('[data-theme-label]');
      if (label) label.textContent = dark ? 'Light mode' : 'Dark mode';
    }
  }

  applyTheme();
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    for (const button of document.querySelectorAll('[data-theme-toggle]')) {
      button.addEventListener('click', () => {
        preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(key, preference); } catch { /* Keep the in-memory choice. */ }
        applyTheme();
      });
    }
  }, { once: true });
  system.addEventListener('change', () => { if (!preference) applyTheme(); });
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    preference = ['light', 'dark'].includes(event.newValue) ? event.newValue : null;
    applyTheme();
  });
})();
