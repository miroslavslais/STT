/* Pás „Technika kolem nás" na rozcestníku kapitoly.
   Vložení: <script src="../zajimavosti/pas.js" data-kapitola="ID"></script> těsně před </body>.
   Zobrazí položky z data.json, které mají v poli „kapitoly" dané ID. Bez shody se nic nevykreslí. */
(function () {
  var me = document.currentScript;
  if (!me) return;
  var kap = me.getAttribute('data-kapitola');
  var base = new URL('.', me.src);          // …/zajimavosti/
  var root = new URL('..', base);           // kořen webu
  var MAX = 4;

  function mk(tag, css, txt) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (txt != null) e.textContent = txt;
    return e;
  }

  function build(items) {
    var sec = mk('section', 'max-width:1080px;margin:44px auto 0;font-family:\'IBM Plex Sans\',sans-serif');
    sec.setAttribute('aria-label', 'Technika kolem nás');
    var head = mk('div', 'display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:16px');
    head.appendChild(mk('div', 'font-family:\'Quicksand\',sans-serif;font-weight:600;font-size:15px;letter-spacing:0.08em;text-transform:uppercase;color:#b0561f', 'Technika kolem nás'));
    var all = mk('a', 'font-family:\'Quicksand\',sans-serif;font-weight:600;font-size:14px;color:#8a8072;text-decoration:none', 'Všechny zajímavosti →');
    all.href = new URL('zajimavosti/index.html', root).href;
    head.appendChild(all);
    sec.appendChild(head);
    var grid = mk('div', 'display:grid;grid-template-columns:repeat(2,1fr);gap:24px');
    items.forEach(function (i) {
      var a = mk('a', 'display:flex;flex-direction:column;gap:8px;background:#fff;border:1px solid #e5ded2;border-left:6px solid #b0561f;border-radius:20px;padding:22px 26px;box-shadow:0 1px 3px rgba(35,29,22,0.06);color:#231d16;text-decoration:none;transition:box-shadow 0.15s');
      a.href = new URL(i.stranka || ('zajimavosti/index.html#' + i.id), root).href;
      a.onmouseenter = function () { a.style.boxShadow = '0 8px 24px rgba(35,29,22,0.1)'; };
      a.onmouseleave = function () { a.style.boxShadow = '0 1px 3px rgba(35,29,22,0.06)'; };
      a.appendChild(mk('div', 'font-family:\'Quicksand\',sans-serif;font-weight:700;font-size:20px;line-height:1.3', i.titulek));
      a.appendChild(mk('div', 'font-size:15px;line-height:1.6;color:#6b6255', i.perex));
      a.appendChild(mk('div', 'margin-top:auto;font-family:\'Quicksand\',sans-serif;font-weight:600;font-size:14px;color:#b0561f', 'Číst dál →'));
      grid.appendChild(a);
    });
    sec.appendChild(grid);
    return sec;
  }

  // stránka se vykresluje skriptem — počkáme na hlavní kontejner a pás vložíme na jeho konec
  function place(sec, tries) {
    var box = document.querySelector('div[style*="min-height:100vh"]') || document.querySelector('div[style*="min-height: 100vh"]');
    if (box) { box.appendChild(sec); return; }
    if (tries > 50) { sec.style.margin = '0 auto 80px'; sec.style.padding = '0 48px'; document.body.appendChild(sec); return; }
    setTimeout(function () { place(sec, tries + 1); }, 100);
  }

  fetch(new URL('data.json', base).href).then(function (r) { return r.json(); }).then(function (d) {
    var items = (d.polozky || []).filter(function (i) { return (i.kapitoly || []).indexOf(kap) >= 0; });
    if (!items.length) return;
    items.sort(function (a, b) { return (b.pridano || '').localeCompare(a.pridano || ''); });
    place(build(items.slice(0, MAX)), 0);
  }).catch(function () {});
})();
