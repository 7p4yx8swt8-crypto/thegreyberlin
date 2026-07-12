
(function () {
  var WD = window.__WD_DATA;
  var BASE = WD.base;
  var header = document.querySelector('.wd-header');
  var wdBurger = document.getElementById('wdBurger');
  var wdNavMenu = document.getElementById('wdNavMenu');
  wdBurger.addEventListener('click', function () {
    var isActive = wdNavMenu.classList.toggle('active');
    wdBurger.classList.toggle('active', isActive);
    wdBurger.setAttribute('aria-expanded', isActive);
  });
  wdNavMenu.querySelectorAll('.wd-nav__link').forEach(function (l) {
    l.addEventListener('click', function () { wdNavMenu.classList.remove('active'); wdBurger.classList.remove('active'); wdBurger.setAttribute('aria-expanded', false); });
  });

  function setHero(chapter) {
    document.querySelectorAll('.hero-content').forEach(function (el) {
      el.hidden = el.dataset.chapterContent !== chapter;
    });
    document.querySelectorAll('.chapters a').forEach(function (a) {
      a.classList.toggle('on', a.dataset.chapter === chapter);
    });
  }

  var params = new URLSearchParams(window.location.search);
  var state = {
    q: params.get('q') || '',
    mood: params.get('stimmung') || null,
    color: params.get('farbe') || null,
    typ: params.get('typ') || null,
    format: params.get('format') || null,
    special: params.get('special') || null,
    serie: params.get('serie') || null,
    kollektion: params.get('kollektion') || window.__WD_DEFAULT_CHAPTER || 'campo',
    pair: null,
  };
  if (state.kollektion === 'alles' && !params.has('kollektion') === false) { /* explicit alles ok */ }

  var works = [].slice.call(document.querySelectorAll('.work'));
  var bands = [].slice.call(document.querySelectorAll('.band'));
  var trios = [].slice.call(document.querySelectorAll('.trio'));
  var countEl = document.getElementById('count');
  var qInput = document.getElementById('q');
  if (state.q) qInput.value = state.q;

  function syncUrl() {
    var p = new URLSearchParams();
    if (state.kollektion && state.kollektion !== 'campo') p.set('kollektion', state.kollektion);
    if (state.q) p.set('q', state.q);
    if (state.mood) p.set('stimmung', state.mood);
    if (state.color) p.set('farbe', state.color);
    if (state.typ) p.set('typ', state.typ);
    if (state.format) p.set('format', state.format);
    if (state.special) p.set('special', state.special);
    if (state.serie) p.set('serie', state.serie);
    var qs = p.toString();
    var path = window.location.pathname;
    history.replaceState(null, '', path + (qs ? '?' + qs : ''));
  }

  function apply(opts) {
    opts = opts || {};
    var n = 0;
    var anyFilter = state.q || state.mood || state.color || state.typ || state.format || state.special || state.serie || state.pair;
    works.forEach(function (c) {
      var ok = true;
      if (state.kollektion !== 'alles' && c.dataset.kollektion !== state.kollektion) ok = false;
      if (ok && state.pair) { ok = state.pair.indexOf(c.dataset.id) !== -1; }
      else if (ok) {
        if (state.q && c.dataset.search.indexOf(state.q) === -1) ok = false;
        if (state.mood && c.dataset.mood.split(' ').indexOf(state.mood) === -1) ok = false;
        if (state.color && c.dataset.color.split(' ').indexOf(state.color) === -1) ok = false;
        if (state.typ && c.dataset.typ !== state.typ) ok = false;
        if (state.format && c.dataset.format !== state.format) ok = false;
        if (state.special && c.dataset.special !== state.special) ok = false;
        if (state.serie && c.dataset.serie !== state.serie) ok = false;
      }
      c.classList.toggle('hide', !ok);
      if (ok) n++;
    });
    bands.forEach(function (b) {
      var kOk = state.kollektion === 'alles' || b.dataset.kollektion === state.kollektion;
      b.classList.toggle('hide', !kOk || !!anyFilter);
    });
    trios.forEach(function (t) {
      var allHidden = [].slice.call(t.children).every(function (c) { return c.classList.contains('hide'); });
      t.style.display = allHidden ? 'none' : '';
    });
    countEl.textContent = anyFilter ? (n + ' Entwürfe') : '';
    if (!opts.skipUrl) syncUrl();
  }

  document.querySelectorAll('.fline a.flink').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      ev.preventDefault();
      var g = a.dataset.g, on = a.classList.contains('on');
      document.querySelectorAll('.fline a.flink[data-g="' + g + '"]').forEach(function (x) { x.classList.remove('on'); });
      state.pair = null;
      state[g] = on ? null : a.dataset.v;
      if (!on) a.classList.add('on');
      apply();
    });
  });
  qInput.addEventListener('input', function (e) { state.q = e.target.value.toLowerCase().trim(); state.pair = null; apply(); });
  document.getElementById('reset').addEventListener('click', function () {
    ['q', 'mood', 'color', 'typ', 'format', 'special', 'serie', 'pair'].forEach(function (k) { state[k] = k === 'q' ? '' : null; });
    qInput.value = '';
    document.querySelectorAll('.fline a.flink.on').forEach(function (a) { a.classList.remove('on'); });
    apply();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.querySelectorAll('.slink').forEach(function (b) {
    b.addEventListener('click', function () {
      state.serie = b.dataset.serie; state.pair = null;
      if (b.dataset.kollektion) { state.kollektion = b.dataset.kollektion; setHero(state.kollektion); }
      apply();
      document.querySelector('.fline').scrollIntoView({ behavior: 'smooth' });
    });
  });
  document.querySelectorAll('.plink').forEach(function (b) {
    b.addEventListener('click', function () {
      state.pair = b.dataset.pair.split(',');
      apply();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
  document.querySelectorAll('.chapters a').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      ev.preventDefault();
      state.kollektion = a.dataset.chapter;
      state.serie = null; state.pair = null;
      setHero(state.kollektion);
      apply();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  /* Overlay */
  var ov = document.getElementById('ov'), ovbox = document.getElementById('ovbox');
  var lastFocus = null;

  function planToggleInit(scope) {
    var btn = scope.querySelector('[data-toggle-plan]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var real = scope.querySelector('.ov-picture-real');
      var plan = scope.querySelector('.ov-picture-plan');
      var showingPlan = !plan.hidden;
      plan.hidden = showingPlan;
      real.hidden = !showingPlan;
      btn.textContent = showingPlan ? 'Plan-Ansicht' : 'Real-Ansicht';
    });
  }

  function openOverlay(id, push, alreadyRendered) {
    if (!alreadyRendered) {
      var html = WD.overlays[id];
      if (!html) return;
      ovbox.innerHTML = html;
    }
    planToggleInit(ovbox);
    ov.classList.add('open');
    document.body.style.overflow = 'hidden';
    lastFocus = document.activeElement;
    document.getElementById('ovclose').focus();
    if (push !== false) history.pushState({ wd: id }, '', BASE + '/' + id + '/');
  }
  function closeOverlay(pop) {
    ov.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
    if (!pop) history.pushState({}, '', BASE + '/' + window.location.search);
  }

  works.forEach(function (c) {
    c.addEventListener('click', function (ev) {
      ev.preventDefault();
      openOverlay(c.dataset.id, true);
    });
  });
  document.getElementById('ovclose').addEventListener('click', function () { closeOverlay(false); });
  ov.addEventListener('click', function (e) { if (e.target === ov) closeOverlay(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ov.classList.contains('open')) closeOverlay(false);
    if (e.key === 'Tab' && ov.classList.contains('open')) {
      var focusables = ovbox.querySelectorAll('a[href], button');
      var list = [document.getElementById('ovclose')].concat([].slice.call(focusables));
      var first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener('popstate', function () {
    var m = window.location.pathname.match(/wanna-do-collection\/([a-z0-9-]+)\/?$/);
    if (m && WD.overlays[m[1]]) openOverlay(m[1], false);
    else closeOverlay(true);
  });

  /* Scroll reveal */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .12 });
    document.querySelectorAll('.rv').forEach(function (t) { io.observe(t); });
  } else {
    document.querySelectorAll('.rv').forEach(function (t) { t.classList.add('in'); });
  }

  window.addEventListener('scroll', function () {
    header.classList.toggle('scrolled', window.scrollY > 20);
  });

  setHero(state.kollektion);
  apply({ skipUrl: true });

  if (window.__WD_OPEN_ID) openOverlay(window.__WD_OPEN_ID, false, true);
})();
