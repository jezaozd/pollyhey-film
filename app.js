(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var calm = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  /* requestAnimationFrame с запасным таймером: вкладка в фоне кадров не выдаёт */
  function raf(fn) {
    var done = false, run = function () { if (!done) { done = true; fn(); } };
    requestAnimationFrame(run); setTimeout(run, 90);
  }

  /* появление блоков и «раскрытие» фотографий */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('.rv,.un').forEach(function (el, i) {
    if (el.classList.contains('rv')) {
      /* соседние элементы появляются по очереди */
      var prev = el.previousElementSibling, d = 0;
      while (prev && prev.classList.contains('rv') && d < 0.48) { d += 0.12; prev = prev.previousElementSibling; }
      if (d) el.style.transitionDelay = d + 's';
    }
    io.observe(el);
  });

  /* шапка + лёгкий параллакс */
  var hd = $('#hd'), hero = $('.hero'), pars = $$('[data-par]'), tick = false;
  function frame() {
    tick = false;
    var y = window.scrollY, vh = window.innerHeight;
    hd.classList.toggle('solid', y > hero.offsetHeight - 70);
    if (calm) return;
    pars.forEach(function (p) {
      var r = p.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var c = (r.top + r.height / 2 - vh / 2) * parseFloat(p.dataset.par);
      p.firstElementChild.style.transform = 'translate3d(0,' + (-c).toFixed(1) + 'px,0) scale(1.06)';
    });
  }
  window.addEventListener('scroll', function () { if (!tick) { tick = true; raf(frame); } }, { passive: true });
  window.addEventListener('resize', frame);
  frame();

  /* анфилада: перетаскивание, стрелки, счётчик */
  var salon = $('#salon'), plates = $$('.plate', salon), cur = $('#cur'), bar = $('#bar');
  var R = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  var down = false, sx = 0, sl = 0, moved = 0;
  salon.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse') return;
    down = true; moved = 0; sx = e.clientX; sl = salon.scrollLeft;
  });
  window.addEventListener('pointermove', function (e) {
    if (!down) return;
    var dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx));
    if (moved > 6) { salon.classList.add('drag'); salon.scrollLeft = sl - dx; }
  });
  window.addEventListener('pointerup', function () { down = false; salon.classList.remove('drag'); });
  function step() { return plates[0].getBoundingClientRect().width + parseFloat(getComputedStyle(salon).columnGap || 40); }
  $('#next').addEventListener('click', function () { salon.scrollBy({ left: step(), behavior: 'smooth' }); });
  $('#prev').addEventListener('click', function () { salon.scrollBy({ left: -step(), behavior: 'smooth' }); });
  salon.addEventListener('scroll', function () {
    var max = salon.scrollWidth - salon.clientWidth, p = max > 0 ? salon.scrollLeft / max : 0;
    var i = Math.min(R.length - 1, Math.round(p * (R.length - 1)));
    cur.textContent = R[i]; bar.style.width = (12 + p * 88) + '%';
  }, { passive: true });

  /* карточка работы */
  var dlg = $('#dlg'), dlgin = $('#dlgin'), last = null;
  plates.forEach(function (pl) {
    var d = $('.pd', pl);
    if (!d) return;
    pl.addEventListener('click', function () {
      if (moved > 6) { moved = 0; return; }           /* это было перетаскивание, а не нажатие */
      last = pl; dlgin.innerHTML = d.innerHTML;
      $$('img[data-src]', dlgin).forEach(function (im) { im.src = im.dataset.src; });
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
      dlg.scrollTop = 0;
    });
  });
  function closeDlg() { if (dlg.open) dlg.close(); }
  dlg.addEventListener('close', function () { if (last) { last.focus({ preventScroll: true }); last = null; } });
  $('#dlgx').addEventListener('click', closeDlg);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeDlg(); });

  /* видео на первом экране: играет только пока его видно */
  var hv = $('#hv');
  if (hv) {
    if (calm) { hv.removeAttribute('autoplay'); hv.pause(); }
    else new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { var p = hv.play(); if (p && p.catch) p.catch(function () {}); } else hv.pause();
      });
    }, { threshold: 0.05 }).observe(hv);
  }

  /* боковые видео триптиха: только на широком экране и только после загрузки страницы */
  var wide = window.matchMedia('(min-width:1000px)');
  function sides() {
    if (calm || !wide.matches) return;
    $$('.sv').forEach(function (v, i) {
      if (v.dataset.on || !v.dataset.src) return;
      v.dataset.on = 1;
      setTimeout(function () {
        v.src = v.dataset.src; v.load();
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      }, 400 + i * 500);
    });
  }
  if (document.readyState === 'complete') sides(); else window.addEventListener('load', sides);
  if (wide.addEventListener) wide.addEventListener('change', sides);

  /* финал: кадры её ухода листаются прокруткой */
  var fin = $('.fin'), fc = $('#fc'), fbar = $('#fbar');
  if (fin && fc) {
    var N = 61, frames = new Array(N), started = false, shown = -1, ctx = fc.getContext('2d');
    function src(i) { return 'img/fin/' + ('00' + i).slice(-3) + '.webp'; }
    function ok(im) { return im && im.complete && im.naturalWidth; }
    function draw(i) {
      var im = frames[i];
      for (var k = 1; !ok(im) && k < N; k++) im = ok(frames[i - k]) ? frames[i - k] : frames[i + k];   /* ближайший готовый кадр */
      if (ok(im)) { ctx.drawImage(im, 0, 0, fc.width, fc.height); shown = i; }
    }
    function scrub() {
      var r = fin.getBoundingClientRect(), span = r.height - window.innerHeight;
      var p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      var i = Math.round(p * (N - 1));
      if (i !== shown) draw(i);
      fin.dataset.phase = p < 0.34 ? 0 : p < 0.7 ? 1 : 2;
      if (fbar) fbar.style.width = (p * 100).toFixed(1) + '%';
    }
    function load() {
      if (started) return; started = true;
      for (var i = 0; i < N; i++) (function (i) {
        var im = new Image(); im.decoding = 'async';
        im.onload = function () { if (shown < 0 || i === Math.round(shown)) { shown = -1; scrub(); } };
        im.src = src(i); frames[i] = im;
      })(i);
    }
    if (calm) { fin.classList.add('static'); frames[0] = new Image(); frames[0].onload = function () { draw(0); }; frames[0].src = src(0); }
    else {
      new IntersectionObserver(function (es) { if (es[0].isIntersecting) load(); }, { rootMargin: '150% 0px' }).observe(fin);
      var ft = false;
      window.addEventListener('scroll', function () {
        if (ft) return; ft = true;
        raf(function () { ft = false; if (started) scrub(); });
      }, { passive: true });
      window.addEventListener('resize', function () { if (started) scrub(); });
    }
  }
})();
