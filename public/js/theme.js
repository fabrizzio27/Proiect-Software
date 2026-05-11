(function () {
  const STORAGE_KEY = 'site-theme';
  const root = document.documentElement;

  function getStored() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function setStored(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (_) {}
  }

  function apply(theme) {
    root.setAttribute('data-bs-theme', theme);
    document.querySelectorAll('.theme-label').forEach(function (el) {
      el.textContent =
        theme === 'dark' ? window.__themeLightLabel || 'Light' : window.__themeDarkLabel || 'Dark';
    });
  }

  const stored = getStored();
  let initial;
  if (stored === 'light' || stored === 'dark') {
    initial = stored;
  } else {
    initial = root.getAttribute('data-bs-theme') || 'dark';
  }
  apply(initial);

  document.getElementById('themeToggle')?.addEventListener('click', function () {
    const next = root.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
    setStored(next);
    apply(next);
  });
})();
