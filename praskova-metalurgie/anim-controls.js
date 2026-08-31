// anim-controls.js — ovládání CSS animací v sekci Prášková metalurgie.
// Každý blok s [data-anim="N"] startuje zastavený; pod blok se vloží lišta
// s tlačítkem Přehrát / Pauza a posuvníkem pro ruční přetáčení.
(function () {
  if (window.__animControls) return;
  window.__animControls = true;

  var ACCENT = '#7ba3cc';

  function css() {
    if (document.getElementById('anim-ctl-css')) return;
    var s = document.createElement('style');
    s.id = 'anim-ctl-css';
    s.textContent =
      '.anim-ctl{display:flex;align-items:center;gap:12px;margin-top:12px;padding:8px 12px;' +
      'background:rgba(120,150,180,0.06);border:1px solid rgba(150,180,210,0.16);border-radius:999px}' +
      '.anim-ctl button{cursor:pointer;user-select:none;display:flex;align-items:center;gap:7px;' +
      'padding:6px 14px;border-radius:999px;font-family:\'IBM Plex Sans\',sans-serif;font-size:13px;' +
      'font-weight:500;background:rgba(123,163,204,0.14);border:1px solid rgba(123,163,204,0.45);color:#eaf2fa}' +
      '.anim-ctl button:hover{background:rgba(123,163,204,0.24)}' +
      '.anim-ctl input[type=range]{flex:1;min-width:80px;height:4px;-webkit-appearance:none;appearance:none;' +
      'background:rgba(150,180,210,0.22);border-radius:2px;accent-color:' + ACCENT + ';cursor:pointer}' +
      '.anim-ctl input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;' +
      'border-radius:50%;background:#eaf2fa;border:2px solid ' + ACCENT + ';cursor:pointer}' +
      '.anim-ctl input[type=range]::-moz-range-thumb{width:12px;height:12px;border-radius:50%;' +
      'background:#eaf2fa;border:2px solid ' + ACCENT + ';cursor:pointer}' +
      '.anim-ctl .anim-ctl-t{font-family:\'IBM Plex Mono\',monospace;font-size:12px;color:#8296a8;' +
      'font-variant-numeric:tabular-nums;min-width:78px;text-align:right}';
    document.head.appendChild(s);
  }

  var ICON_PLAY = '<svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true"><path d="M0 0l10 6-10 6z" fill="currentColor"/></svg>';
  var ICON_PAUSE = '<svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true"><rect x="0" y="0" width="3.5" height="12" fill="currentColor"/><rect x="6.5" y="0" width="3.5" height="12" fill="currentColor"/></svg>';

  function anims(els) {
    var out = [];
    els.forEach(function (el) {
      try {
        el.getAnimations({ subtree: true }).forEach(function (a) { out.push(a); });
      } catch (e) {}
    });
    return out;
  }

  function masterMs(list) {
    var m = 0;
    list.forEach(function (a) {
      var d = 0;
      try { d = a.effect.getComputedTiming().duration || 0; } catch (e) {}
      if (d > m) m = d;
    });
    return m;
  }

  function fmt(ms) {
    return (ms / 1000).toFixed(1).replace('.', ',') + '\u00a0s';
  }

  function setup(group) {
    var els = group.els;
    var list = anims(els);
    if (!list.length) return false;
    var master = masterMs(list);
    if (!master) return false;

    var bar = document.createElement('div');
    bar.className = 'anim-ctl';
    bar.setAttribute('data-anim-ctl', group.key);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = ICON_PLAY + '<span>Přehrát</span>';
    var range = document.createElement('input');
    range.type = 'range';
    range.min = '0';
    range.max = '1000';
    range.step = '1';
    range.value = '0';
    range.setAttribute('aria-label', 'Poloha animace');
    var out = document.createElement('div');
    out.className = 'anim-ctl-t';
    bar.appendChild(btn);
    bar.appendChild(range);
    bar.appendChild(out);

    // lišta patří na konec karty animace, ne do vnitřního gridu popisků
    var card = els[0];
    while (card && !els.every(function (e) { return card.contains(e); })) card = card.parentNode;
    if (card && els.indexOf(card) !== -1) card = card.parentNode;
    if (!card || card === document.body || card === document.documentElement) {
      var last = els[els.length - 1];
      last.parentNode.insertBefore(bar, last.nextSibling);
    } else {
      card.appendChild(bar);
    }

    var playing = false;
    var time = 0;
    var raf = null;

    function seek(ms) {
      time = ms;
      anims(els).forEach(function (a) {
        try { a.currentTime = ms; } catch (e) {}
      });
      paint();
    }

    function paint() {
      out.textContent = fmt(time % master) + ' / ' + fmt(master);
      if (document.activeElement !== range) {
        range.value = String(Math.round(((time % master) / master) * 1000));
      }
    }

    function tick() {
      if (!playing) return;
      var cur = null;
      anims(els).some(function (a) {
        try {
          var d = a.effect.getComputedTiming().duration || 0;
          if (d === master && a.currentTime != null) { cur = a.currentTime; return true; }
        } catch (e) {}
        return false;
      });
      if (cur != null) { time = cur; paint(); }
      raf = requestAnimationFrame(tick);
    }

    function play() {
      playing = true;
      anims(els).forEach(function (a) { try { a.play(); } catch (e) {} });
      btn.innerHTML = ICON_PAUSE + '<span>Pauza</span>';
      raf = requestAnimationFrame(tick);
    }

    function pause() {
      playing = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      anims(els).forEach(function (a) { try { a.pause(); } catch (e) {} });
      btn.innerHTML = ICON_PLAY + '<span>Přehrát</span>';
    }

    btn.addEventListener('click', function () {
      if (playing) pause(); else play();
    });

    range.addEventListener('input', function () {
      if (playing) pause();
      seek((+range.value / 1000) * master);
    });

    pause();
    seek(0);
    return true;
  }

  function scan() {
    css();
    var groups = {};
    document.querySelectorAll('[data-anim]').forEach(function (el) {
      var k = el.getAttribute('data-anim');
      (groups[k] = groups[k] || []).push(el);
    });
    Object.keys(groups).forEach(function (k) {
      if (document.querySelector('[data-anim-ctl="' + k + '"]')) return;
      setup({ key: k, els: groups[k] });
    });
  }

  function boot() {
    var tries = 0;
    var iv = setInterval(function () {
      scan();
      if (++tries > 40) clearInterval(iv);
    }, 250);
    scan();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
