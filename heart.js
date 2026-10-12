/* Heart reads the titles. Adds a small speaker button beside every page title and
 * heading; tapping it plays Heart's voice from voice/<slug>.mp3. The clips are made
 * once with Kokoro TTS (voice af_heart), so nothing is sent anywhere at runtime.
 * If a clip is missing, the browser's own voice reads the words instead.
 * Buttons never print. */
(function () {
  var BASE = (function () {
    var s = document.currentScript && document.currentScript.src;
    return s ? s.slice(0, s.lastIndexOf('/') + 1) : './';
  })();
  var current = null;

  function slug(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function speakFallback(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text.replace(/[^\w\s.,!?'’()\-:]/g, ''));
    u.lang = 'en-US'; u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }

  function play(text, btn) {
    if (current) { current.pause(); current = null; }
    document.querySelectorAll('.heart-btn.is-playing').forEach(function (b) { b.classList.remove('is-playing'); });
    var a = new Audio(BASE + 'voice/' + slug(text) + '.mp3');
    current = a;
    btn.classList.add('is-playing');
    a.onended = a.onpause = function () { btn.classList.remove('is-playing'); };
    a.onerror = function () { btn.classList.remove('is-playing'); speakFallback(text); };
    a.play().catch(function () { btn.classList.remove('is-playing'); speakFallback(text); });
  }

  function addButton(el) {
    if (el.querySelector('.heart-btn')) return;
    var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    var words = text.replace(/[^\w\s.,!?'’()\-:·]/g, '').replace(/\s+/g, ' ').trim();
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'heart-btn';
    b.setAttribute('aria-label', 'Hear Heart read: ' + words);
    b.title = 'Hear Heart read this';
    b.textContent = '🔊';
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      play(text, b);
    });
    el.appendChild(b);
  }

  function style() {
    if (document.getElementById('heart-style')) return;
    var s = document.createElement('style');
    s.id = 'heart-style';
    s.textContent =
      '.heart-btn{display:inline-flex;align-items:center;justify-content:center;width:1.6em;height:1.6em;' +
      'margin-left:.4em;padding:0;border:1px solid currentColor;border-radius:999px;background:transparent;' +
      'color:inherit;font:inherit;font-size:.6em;line-height:1;cursor:pointer;vertical-align:middle;opacity:.75}' +
      '.heart-btn:hover,.heart-btn:focus-visible{opacity:1}' +
      '.heart-btn.is-playing{opacity:1;box-shadow:0 0 0 3px rgba(255,182,39,.45)}' +
      'nav a .heart-btn{margin-left:auto;font-size:.8em}' +
      '@media print{.heart-btn{display:none !important}}';
    document.head.appendChild(s);
  }

  function scan() {
    style();
    document.querySelectorAll('main h1, nav a, doc-page h1, doc-page h2, doc-page h3').forEach(addButton);
  }

  function start() {
    scan();
    // The lesson plan and journals render after their runtime boots, so keep watching.
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
