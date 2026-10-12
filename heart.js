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

  // Play one phrase, or a list of phrases one after another.
  function play(phrases, btn) {
    if (typeof phrases === 'string') phrases = [phrases];
    if (current) { current.onpause = null; current.pause(); current = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    document.querySelectorAll('.heart-btn.is-playing').forEach(function (b) { b.classList.remove('is-playing'); });
    var i = 0;
    function done() { if (btn) btn.classList.remove('is-playing'); }
    function next() {
      if (i >= phrases.length) { current = null; done(); return; }
      var text = phrases[i++];
      var a = new Audio(BASE + 'voice/' + slug(text) + '.mp3');
      current = a;
      a.onended = next;
      a.onpause = done;
      a.onerror = function () { speakFallback(text); next(); };
      a.play().catch(function () { speakFallback(text); next(); });
    }
    if (btn) btn.classList.add('is-playing');
    next();
  }

  function addButton(el) {
    if (el.querySelector('.heart-btn')) return;
    var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    // data-heart-list="a | b | c" reads those phrases after the element's own words.
    var list = el.getAttribute('data-heart-list');
    var phrases = list ? [text].concat(list.split(' | ')) : text;
    var words = text.replace(/[^\w\s.,!?'’()\-:·]/g, '').replace(/\s+/g, ' ').trim();
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'heart-btn';
    b.setAttribute('aria-label', 'Hear Heart read: ' + words);
    b.title = 'Hear Heart read this';
    b.textContent = '🔊';
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      play(phrases, b);
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
    document.querySelectorAll('main h1, nav a, doc-page h1, doc-page h2, doc-page h3, [data-heart]').forEach(addButton);
  }

  // Pages can make Heart speak a phrase or a list of phrases, e.g. Heart.say('Water added').
  window.Heart = { say: function (phrases) { play(phrases, null); } };

  /* Dictation: a floating 🎤 button appears beside any text box the student is typing in.
   * Tap it, speak, and the words are added to the box. Uses the browser's own speech
   * recognition (Chrome, Edge, Safari); on browsers without it the button never shows. */
  var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  var mic = null, micFor = null, rec = null;

  function setNative(el, value) {
    var proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function placeMic() {
    if (!mic || !micFor) return;
    var r = micFor.getBoundingClientRect();
    mic.style.left = (r.right - 48) + 'px';
    mic.style.top = (r.bottom - 48) + 'px';
  }

  function stopListening() {
    if (rec) { try { rec.stop(); } catch (e) {} rec = null; }
    if (mic) { mic.classList.remove('is-listening'); mic.textContent = '🎤'; }
  }

  function listen() {
    if (rec) { stopListening(); return; }
    var el = micFor;
    if (!el) return;
    rec = new Recognition();
    rec.lang = 'en-SG';
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = function (ev) {
      var said = '';
      for (var i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) said += ev.results[i][0].transcript;
      said = said.trim();
      if (!said) return;
      var v = el.value, sep = v && !/\s$/.test(v) ? ' ' : '';
      setNative(el, v + sep + said);
    };
    rec.onend = stopListening;
    rec.onerror = stopListening;
    mic.classList.add('is-listening'); mic.textContent = '⏹';
    try { rec.start(); } catch (e) { stopListening(); }
  }

  function micStyle() {
    var s = document.createElement('style');
    s.textContent =
      '.heart-mic{position:fixed;z-index:9999;width:40px;height:40px;border-radius:999px;border:1px solid rgba(255,255,255,.3);' +
      'background:#2b3340;color:#fff;font-size:20px;line-height:1;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.4);display:none}' +
      '.heart-mic.is-shown{display:block}' +
      '.heart-mic.is-listening{background:#e8493f;animation:heartPulse 1s ease-in-out infinite}' +
      '@keyframes heartPulse{50%{box-shadow:0 0 0 8px rgba(232,73,63,.35)}}' +
      '@media print{.heart-mic{display:none !important}}';
    document.head.appendChild(s);
  }

  function setupMic() {
    if (!Recognition) return;
    micStyle();
    mic = document.createElement('button');
    mic.type = 'button';
    mic.className = 'heart-mic';
    mic.textContent = '🎤';
    mic.title = 'Speak instead of typing';
    mic.setAttribute('aria-label', 'Speak instead of typing');
    mic.addEventListener('mousedown', function (e) { e.preventDefault(); }); // keep the text box focused
    mic.addEventListener('click', listen);
    document.body.appendChild(mic);
    document.addEventListener('focusin', function (e) {
      var t = e.target;
      if (t && t.tagName === 'TEXTAREA') {
        if (micFor !== t) stopListening();
        micFor = t; mic.classList.add('is-shown'); placeMic();
      }
    });
    document.addEventListener('focusout', function (e) {
      if (e.relatedTarget === mic) return;
      setTimeout(function () { if (document.activeElement !== micFor && document.activeElement !== mic) { stopListening(); mic.classList.remove('is-shown'); micFor = null; } }, 150);
    });
    window.addEventListener('scroll', placeMic, true);
    window.addEventListener('resize', placeMic);
  }

  function start() {
    setupMic();
    scan();
    // The lesson plan and journals render after their runtime boots, so keep watching.
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
