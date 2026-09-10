
(function () {
  var WD = window.__WD_DATA;
  var BASE = WD.base;

  var header = document.getElementById('header');
  var burger = document.getElementById('burger');
  var navMenu = document.getElementById('navMenu');
  burger.addEventListener('click', function () {
    var isActive = navMenu.classList.toggle('active');
    burger.classList.toggle('active', isActive);
    burger.setAttribute('aria-expanded', isActive);
  });
  navMenu.querySelectorAll('.nav__link').forEach(function (l) {
    l.addEventListener('click', function () { navMenu.classList.remove('active'); burger.classList.remove('active'); burger.setAttribute('aria-expanded', false); });
  });
  window.addEventListener('scroll', function () {
    header.classList.toggle('scrolled', window.scrollY > 30);
  });

  var works = [].slice.call(document.querySelectorAll('.work'));
  var ov = document.getElementById('ov'), ovbox = document.getElementById('ovbox');
  var lastFocus = null;

  function openOverlay(id, push, alreadyRendered) {
    if (!alreadyRendered) {
      var html = WD.overlays[id];
      if (!html) return;
      ovbox.innerHTML = html;
    }
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
    if (!pop) history.pushState({}, '', BASE + '/');
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

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .12 });
    document.querySelectorAll('.rv').forEach(function (t) { io.observe(t); });
  } else {
    document.querySelectorAll('.rv').forEach(function (t) { t.classList.add('in'); });
  }

  if (window.__WD_OPEN_ID) openOverlay(window.__WD_OPEN_ID, false, true);
})();
