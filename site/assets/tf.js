/* TerraForge — shared interactions. Loaded (deferred) on every page by
   scripts/build-site.mjs. Everything here is progressive enhancement: the
   pages work with this file missing. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* ---------- Nav: logo mark, current link, scroll progress ---------- */
  var nav = doc.querySelector('nav.topnav');
  var logo = doc.querySelector('.nav-logo');
  if (logo && logo.textContent.trim() === 'TERRAFORGE') {
    logo.setAttribute('aria-label', 'TerraForge home');
    logo.innerHTML = '<img class="tf-mark" src="/images/logo-badge.png" width="44" height="44" alt="">' +
      '<span>TERRA<b>FORGE</b></span>';
  }
  function norm(p) { return (p.replace(/\.html$/, '').replace(/\/+$/, '') || '/'); }
  $$('.nav-links a').forEach(function (a) {
    a.classList.remove('active');
    try {
      if (norm(new URL(a.href).pathname) === norm(location.pathname)) {
        a.classList.add('tf-current');
        a.setAttribute('aria-current', 'page');
      }
    } catch (e) {}
  });
  // The little loader. Drawn facing left; CSS flips it to drive right.
  var RIG = '<svg viewBox="0 0 72 40" aria-hidden="true"><path d="M30 25V7h17l9 11v7z" fill="#E9E2D0"/><path d="M34 11h11l6 8H34z" fill="#13110d"/>' +
    '<g class="arm"><path d="M54 12L22 24" stroke="#E9E2D0" stroke-width="4" stroke-linecap="round"/><path class="bucket" d="M4 20h16l3 12H8z" fill="#F5A500"/></g>' +
    '<rect x="24" y="25" width="40" height="13" rx="6.5" fill="#F5A500"/><g fill="#13110d"><circle cx="31" cy="31.5" r="3"/><circle cx="44" cy="31.5" r="3"/><circle cx="57" cy="31.5" r="3"/></g></svg>';
  if (nav) {
    // Scroll progress: the loader drives along the bottom edge of the nav.
    var bar = doc.createElement('div');
    bar.className = 'tf-progress';
    nav.appendChild(bar);
    var rig = doc.createElement('div');
    rig.className = 'tf-progress-rig';
    rig.innerHTML = RIG;
    nav.appendChild(rig);
  }

  /* ---------- Logo seal: <div data-tf-seal></div>, plus one in the footer ---------- */
  var sealN = 0;
  function seal(host) {
    var id = 'tfSeal' + (++sealN);
    host.classList.add('tf-seal');
    host.setAttribute('role', 'img');
    host.setAttribute('aria-label', 'TerraForge LLC logo');
    host.innerHTML = '<svg class="ring" viewBox="0 0 200 200" aria-hidden="true"><defs><path id="' + id + '" d="M100 100m-83 0a83 83 0 1 1 166 0a83 83 0 1 1-166 0"/></defs>' +
      '<circle cx="100" cy="100" r="99" class="plate"/>' +
      '<text><textPath href="#' + id + '" textLength="515" lengthAdjust="spacing">TERRAFORGE LLC ◆ ALEXANDRIA, VA ◆ TERRAFORGE LLC ◆ ALEXANDRIA, VA ◆ </textPath></text></svg>' +
      '<img src="/images/logo-badge.png" alt="" loading="lazy">';
  }
  var fcol = doc.querySelector('footer .col');
  if (fcol) {
    var fs = doc.createElement('div');
    fs.setAttribute('data-tf-seal', '');
    fcol.insertBefore(fs, fcol.firstChild);
  }
  $$('[data-tf-seal]').forEach(seal);

  /* ---------- Booking: the loader drives a rail as each step is completed ---------- */
  var qc = doc.getElementById('quoteCard'), layout = doc.querySelector('.booking-layout');
  if (qc && layout) {
    var STEPS = ['Dates', 'Gear', 'Zone', 'Details'];
    var prog = doc.createElement('div');
    prog.className = 'tf-bk';
    prog.innerHTML = '<div class="tf-bk-rail"><div class="fill"></div><div class="rig">' + RIG + '</div></div>' +
      '<ol>' + STEPS.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>';
    var h3 = qc.querySelector('h3');
    h3.insertAdjacentElement('afterend', prog);
    var lis = $$('li', prog), rb = doc.getElementById('reserveBtn');
    var checkBk = function () {
      var done = [
        /→/.test((doc.getElementById('calRangeSummary') || {}).textContent || ''),
        !!doc.querySelector('.gear-card[aria-pressed="true"]'),
        !!doc.querySelector('.zone-card[aria-pressed="true"]'),
        false
      ];
      // "Details" is whatever the page's own validation says: the button unlocks.
      done[3] = done[0] && done[1] && done[2] && rb && !rb.disabled;
      var n = 0;
      done.forEach(function (d, i) { lis[i].classList.toggle('on', !!d); if (d) n++; });
      prog.style.setProperty('--p', (n / STEPS.length).toFixed(2));
      prog.classList.toggle('all', n === STEPS.length);
      prog.setAttribute('aria-label', n + ' of ' + STEPS.length + ' booking steps complete');
    };
    prog.setAttribute('role', 'img');
    if ('MutationObserver' in window) {
      new MutationObserver(checkBk).observe(layout, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-pressed', 'disabled'] });
    }
    checkBk();
  }
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY || 0;
      var max = Math.max(1, root.scrollHeight - window.innerHeight);
      root.style.setProperty('--tf-scroll', Math.min(1, y / max).toFixed(4));
      root.style.setProperty('--tf-y', y.toFixed(0));
      if (nav) nav.classList.toggle('tf-scrolled', y > 24);
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Cursor spotlight on cards ---------- */
  doc.addEventListener('pointermove', function (e) {
    var el = e.target.closest ? e.target.closest('.card,.quote-card,.tf-spot') : null;
    if (!el) return;
    var r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  /* ---------- Scroll reveal ---------- */
  var GROUPS = '.grid,.specs,.list,.zones,.faq,.feature-list,.zone-list,.tf-stagger';
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        io.unobserve(el);
        el.classList.add('tf-in');
        var d = parseInt(el.style.getPropertyValue('--tf-d'), 10) || 0;
        setTimeout(function () {
          el.removeAttribute('data-tf-reveal');
          el.classList.remove('tf-in');
          el.style.removeProperty('--tf-d');
        }, 900 + d);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    var tag = function (el, delay) {
      if (el.closest('.booking-layout,[data-tf-noreveal]')) return;
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92) return; // already on screen: leave it alone
      if (delay) el.style.setProperty('--tf-d', delay + 'ms');
      el.setAttribute('data-tf-reveal', '');
      io.observe(el);
    };
    $$('main section:not(.hero) .wrap > *').forEach(function (el) {
      if (el.matches(GROUPS)) return;
      tag(el, 0);
    });
    $$(GROUPS).forEach(function (g) {
      if (g.closest('.hero')) return;
      Array.prototype.forEach.call(g.children, function (c, i) { tag(c, Math.min(i, 8) * 70); });
    });
  }

  /* ---------- Count-up numbers: <span data-tf-count="2300">2,300</span> ---------- */
  var counters = $$('[data-tf-count]');
  if (counters.length && 'IntersectionObserver' in window && !reduce) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        var el = en.target, end = Number(el.getAttribute('data-tf-count')) || 0, t0 = null, dur = 1300;
        (function step(ts) {
          if (t0 === null) t0 = ts;
          var p = Math.min(1, (ts - t0) / dur), eased = 1 - Math.pow(1 - p, 4);
          el.textContent = Math.round(end * eased).toLocaleString('en-US');
          if (p < 1) requestAnimationFrame(step);
        })(performance.now());
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { cio.observe(c); });
  }

  /* ---------- Booking total: bump when the number changes ---------- */
  ['quoteTotalAmt', 'stickyTotalAmt'].forEach(function (id) {
    var el = doc.getElementById(id);
    if (!el || !('MutationObserver' in window)) return;
    var last = el.textContent;
    new MutationObserver(function () {
      if (el.textContent === last) return;
      last = el.textContent;
      el.classList.remove('tf-bump');
      void el.offsetWidth;
      el.classList.add('tf-bump');
    }).observe(el, { childList: true, characterData: true, subtree: true });
  });

  /* ---------- Delivery-zone radar: <div data-tf-radar></div> ----------
     Schematic, not a map: towns sit at their compass bearing from Alexandria
     inside the ring for their (driving-distance) zone. */
  var TOWNS = [
    // name, bearing° (clockwise from north), miles, label side
    ['Arlington', 345, 9, 'l'], ['Fairfax', 288, 15, 'l'], ['Springfield', 258, 6.5, 'l'], ['Mount Vernon', 184, 11, 'l'],
    ['Woodbridge', 211, 24, 'r'], ['Lake Ridge', 229, 27, 'l'], ['Dale City', 219, 32, 'l'], ['Manassas', 264, 29, 'l'],
    ['Leesburg', 318, 45, 'l'], ['Ashburn', 302, 39, 'l'], ['Warrenton', 252, 45, 'l'], ['Stafford', 206, 40, 'l'], ['Fredericksburg', 197, 47.5, 'l']
  ];
  var RIVER = [[-24, 58], [-13, 31], [-4, 13], [2, 6], [4, 0], [6, -10], [8, -24], [10, -40], [14, -58]]; // [east, north] mi
  function pt(b, r) { var a = b * Math.PI / 180; return [r * Math.sin(a), -r * Math.cos(a)]; }
  function f(n) { return n.toFixed(2); }
  function smooth(pts) { // Catmull-Rom -> cubic Bézier
    var d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += 'C' + f(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + f(p1[1] + (p2[1] - p0[1]) / 6) + ' ' +
        f(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + f(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + f(p2[0]) + ' ' + f(p2[1]);
    }
    return d;
  }
  function ring(r) { return 'M' + r + ' 0A' + r + ' ' + r + ' 0 1 0 -' + r + ' 0A' + r + ' ' + r + ' 0 1 0 ' + r + ' 0Z'; }

  var selected = null;
  function setZone(n, on) {
    $$('[data-tf-zone]').forEach(function (el) {
      var mine = el.getAttribute('data-tf-zone') === String(n);
      if (on) el.classList.toggle('tf-on', mine);
      else el.classList.toggle('tf-on', selected !== null && el.getAttribute('data-tf-zone') === String(selected));
    });
  }
  function renderRadar(host) {
    var river = smooth(RIVER.map(function (p) { return [p[0], -p[1]]; }));
    var va = river + 'L14 70L-80 70L-80 -70L-24 -70Z';
    var md = river + 'L14 70L80 70L80 -70L-24 -70Z';
    var s = '<svg viewBox="-66 -58 120 116" role="img" aria-label="Delivery zones: three rings at 20, 35 and 50 miles around Alexandria, Virginia. Virginia side only; DC and Maryland coming soon.">' +
      '<defs><clipPath id="tfVa"><path d="' + va + '"/></clipPath><clipPath id="tfMd"><path d="' + md + '"/></clipPath>' +
      '<clipPath id="tfDisc"><circle r="50"/></clipPath>' +
      '<pattern id="tfHatch" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="2.4" stroke="#48423a" stroke-width=".7"/></pattern>' +
      '<linearGradient id="tfSweep" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F5A500" stop-opacity="0"/><stop offset="1" stop-color="#F5A500" stop-opacity=".3"/></linearGradient></defs>' +
      '<g clip-path="url(#tfMd)"><circle class="soon" r="50"/></g>' +
      '<g clip-path="url(#tfVa)">' +
      '<path class="band" data-tf-zone="3" style="--o:.07" fill-rule="evenodd" d="' + ring(50) + ring(35) + '"/>' +
      '<path class="band" data-tf-zone="2" style="--o:.14" fill-rule="evenodd" d="' + ring(35) + ring(20) + '"/>' +
      '<path class="band" data-tf-zone="1" style="--o:.24" d="' + ring(20) + '"/>' +
      '<g clip-path="url(#tfDisc)"><g class="sweep"><path d="M0 0L' + f(pt(-38, 52)[0]) + ' ' + f(pt(-38, 52)[1]) + 'A52 52 0 0 1 0 -52Z" fill="url(#tfSweep)" style="pointer-events:none"/></g></g>' +
      '</g>' +
      '<circle class="ring" r="20"/><circle class="ring" r="35"/><circle class="ring" r="50"/>' +
      '<path class="river" d="' + river + '" clip-path="url(#tfDisc)"/>';
    [20, 35, 50].forEach(function (r) {
      var p = pt(118, r - 1.5); // inside each ring, on the empty (not-yet-served) side
      s += '<text class="mi" x="' + f(p[0]) + '" y="' + f(p[1]) + '" text-anchor="end">' + r + ' mi</text>';
    });
    TOWNS.forEach(function (t) {
      var p = pt(t[1], t[2]), left = t[3] === 'l';
      s += '<circle class="town" cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r=".75"/>' +
        '<text x="' + f(p[0] + (left ? -1.8 : 1.8)) + '" y="' + f(p[1] + 0.9) + '" text-anchor="' + (left ? 'end' : 'start') + '">' + t[0] + '</text>';
    });
    s += '<text class="soon-t" x="27" y="-22" text-anchor="middle">DC · MD</text><text class="soon-t" x="27" y="-17.5" text-anchor="middle">coming soon</text>' +
      '<circle class="pulse" r="1.6"/><circle r="1.6" fill="#F5A500"/>' +
      '<text class="home" x="3.4" y="-2">Alexandria</text>' +
      '</svg>';
    host.classList.add('tf-radar');
    host.innerHTML = s;
    var cap = doc.createElement('div');
    cap.className = 'tf-radar-cap';
    cap.textContent = 'Schematic · zones are by driving distance';
    host.insertAdjacentElement('afterend', cap);
  }
  $$('[data-tf-radar]').forEach(renderRadar);
  if (doc.querySelector('[data-tf-zone]')) {
    $$('[data-tf-zone]').forEach(function (el) {
      var n = el.getAttribute('data-tf-zone');
      el.addEventListener('pointerenter', function () { setZone(n, true); });
      el.addEventListener('pointerleave', function () { setZone(n, false); });
    });
    window.tfRadar = { select: function (n) { selected = n; setZone(n, false); } };
    // The ZIP calculator on /delivery writes "Zone N · $fee" into #zipResult.
    var zr = doc.getElementById('zipResult');
    if (zr && 'MutationObserver' in window) {
      new MutationObserver(function () {
        var m = zr.classList.contains('hit') && /Zone (\d)/.exec(zr.textContent);
        window.tfRadar.select(m ? m[1] : null);
      }).observe(zr, { childList: true, subtree: true });
    }
  }

  /* ---------- Back to top: the loader lifts its bucket as you scroll ---------- */
  var topBtn = doc.createElement('button');
  topBtn.type = 'button';
  topBtn.className = 'tf-top';
  topBtn.setAttribute('aria-label', 'Back to top');
  topBtn.innerHTML = RIG + '<span aria-hidden="true">Top</span>';
  topBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
  doc.body.appendChild(topBtn);
  window.addEventListener('scroll', function () { topBtn.classList.toggle('show', (window.scrollY || 0) > 700); }, { passive: true });

  /* ---------- Stage rigs (thank-you, 404) ---------- */
  $$('[data-tf-rig]').forEach(function (el) { el.innerHTML = RIG; });

  /* ---------- Page transition: the loader drives across pulling caution
     tape while the page dims; the next page runs the tape off the far side.
     Same-origin page links only; skipped for reduced motion. ---------- */
  var leaving = false;
  function clearCurtain() {
    leaving = false;
    $$('.tf-curtain').forEach(function (c) { c.parentNode.removeChild(c); });
  }
  if (!reduce) {
    doc.addEventListener('click', function (e) {
      if (leaving || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || a.target || a.hasAttribute('download')) return;
      var u;
      try { u = new URL(a.href, location.href); } catch (err) { return; }
      if (u.origin !== location.origin || !/^https?:$/.test(u.protocol)) return;
      if (/^\/(api|images|assets)\//.test(u.pathname) || /\.[a-z0-9]{2,5}$/i.test(u.pathname.replace(/\.html$/, ''))) return;
      if (norm(u.pathname) === norm(location.pathname) && u.search === location.search) return; // same page / #hash
      e.preventDefault();
      leaving = true;
      var c = doc.createElement('div');
      c.className = 'tf-curtain';
      c.setAttribute('aria-hidden', 'true');
      c.innerHTML = '<div class="shade"></div><div class="tf-tape"><div class="rig">' + RIG + '</div></div>';
      doc.body.appendChild(c);
      void c.offsetWidth;
      c.classList.add('on');
      try { sessionStorage.setItem('tfNav', '1'); } catch (err) {}
      setTimeout(function () { location.href = u.href; }, 660);
      setTimeout(clearCurtain, 4000); // navigation never happened: give the page back
    });
    // Back/forward cache restores the page exactly as we left it, curtain and all.
    window.addEventListener('pageshow', function (e) { if (e.persisted) clearCurtain(); });
  }
})();
