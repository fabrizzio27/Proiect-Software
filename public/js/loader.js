(function () {
  var MIN_MS = 2000;
  var loaderEl = document.getElementById('goleador-loader');
  var t0 = typeof window.__GOLEADOR_T0 === 'number' ? window.__GOLEADOR_T0 : performance.now();

  function hide() {
    if (!loaderEl || loaderEl.classList.contains('is-done')) return;
    loaderEl.classList.add('is-done');
    loaderEl.setAttribute('aria-busy', 'false');
    document.body.classList.remove('loader-active');
  }

  function schedule() {
    var elapsed = performance.now() - t0;
    var wait = Math.max(0, MIN_MS - elapsed);
    window.setTimeout(hide, wait);
  }

  if (document.readyState === 'complete') {
    schedule();
  } else {
    window.addEventListener('load', schedule);
  }

  window.setTimeout(function () {
    if (loaderEl && !loaderEl.classList.contains('is-done')) hide();
  }, 25000);
})();
