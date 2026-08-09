/* ============================================================
   ПОВЕДЕНИЕ СТРАНИЦЫ
   Данные берутся из window.SITE (content.js). Здесь нет ни одного
   значения, специфичного для конкретного бизнеса.
   ============================================================ */
(function () {
  'use strict';

  var S = window.SITE || {};
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function get(path) {
    var p = path.split('.'), v = S, i;
    for (i = 0; i < p.length; i++) {
      if (v == null || typeof v !== 'object') return '';
      v = v[p[i]];
    }
    return (v == null) ? '' : v;
  }
  function arr(key) { var v = S[key]; return Array.isArray(v) ? v : []; }
  var nf = new Intl.NumberFormat('ru-RU');
  function money(n) { return nf.format(Math.round(Number(n) || 0)) + ' ₽'; }
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ---------- ссылки ---------- */
  function chan(base, val) {
    var v = String(val || '').trim();
    if (!v) return '';
    return /^https?:\/\//i.test(v) ? v : base + v.replace(/^@/, '');
  }
  var digits = function (s) { return String(s || '').replace(/\D/g, ''); };

  var L = {
    tel: get('business.phone') ? 'tel:' + String(get('business.phone')).replace(/[^\d+]/g, '') : '',
    max: chan('https://max.ru/', get('business.max')),
    tg:  chan('https://t.me/', get('business.telegram')),
    wa:  digits(get('business.whatsapp')) ? 'https://wa.me/' + digits(get('business.whatsapp')) : '',
    map: get('business.mapQuery') ? 'https://yandex.ru/maps/?text=' + encodeURIComponent(get('business.mapQuery')) : '',
    policy: get('legal.policyUrl') || '#',
    offer:  get('legal.offerUrl') || '#'
  };

  /* ============================================================
     1. Идентичность
     ============================================================ */
  function identity() {
    var name = get('business.name'), city = get('business.city');
    document.title = name + ' — ремонт телефонов и гаджетов' + (city ? ', ' + city : '');
    var md = $('meta[name="description"]');
    if (md) md.setAttribute('content', get('hero.sub'));

    var accent = get('brand.accent');
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(accent)) {
      var h = accent.replace('#', '');
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var n = parseInt(h, 16);
      document.documentElement.style.setProperty('--blue', accent);
      document.documentElement.style.setProperty('--blue-soft',
        'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',.10)');
    }

    $$('[data-f]').forEach(function (el) { el.textContent = get(el.getAttribute('data-f')); });

    [['hdrTel', L.tel], ['heroCall', L.tel], ['doneCall', L.tel], ['failCall', L.tel], ['sCall', L.tel],
     ['sMap', L.map], ['map', L.map], ['sChat', L.max || L.tg || L.wa || L.tel],
     ['policyLink', L.policy], ['ckPolicy', L.policy]
    ].forEach(function (p) {
      var el = document.getElementById(p[0]);
      if (el && p[1]) el.setAttribute('href', p[1]);
    });

    /* заголовок построчно — каждая строка выезжает из-под маски */
    var lines = get('hero.title');
    if (!Array.isArray(lines)) lines = [String(lines || '')];
    $('#heroTitle').innerHTML = lines.map(function (t, i) {
      return '<span><i style="transition-delay:' + (0.08 + i * 0.09).toFixed(2) + 's">' + esc(t) + '</i></span>';
    }).join('');
  }

  /* ============================================================
     2. Разбор устройства
     Слои строятся из content.teardown: снизу корпус, сверху стекло.
     ============================================================ */
  var LAYER_CLASS = ['lyr--frame', 'lyr--batt', 'lyr--board', 'lyr--disp', 'lyr--glass'];

  function buildDevice() {
    var parts = arr('teardown');
    if (!parts.length) return;
    var dev = $('#device');

    dev.innerHTML = parts.map(function (p, i) {
      var cls = LAYER_CLASS[i] || 'lyr--frame';
      var traces = (cls === 'lyr--board')
        ? '<svg class="lyr__trace" viewBox="0 0 100 200" preserveAspectRatio="none" aria-hidden="true">'
          + '<g fill="none" stroke="#6FA8D8" stroke-width="1">'
          + '<path d="M14 22h30v26h26"/><path d="M20 60v40h34"/><path d="M70 78v52H30v34"/>'
          + '<path d="M50 20v34h32"/><path d="M16 120h26v40"/><path d="M60 150h24v26"/>'
          + '</g>'
          + '<g fill="#8FC4EC">'
          + '<rect x="40" y="86" width="26" height="30" rx="2"/>'
          + '<rect x="22" y="140" width="16" height="14" rx="1.5"/>'
          + '<circle cx="76" cy="44" r="3"/><circle cx="26" cy="176" r="3"/>'
          + '</g></svg>'
        : '';
      return '<div class="lyr ' + cls + '" style="--i:' + i + '">'
           + '<div class="lyr__face">' + traces + '</div>'
           + '<i class="anchor"></i>'
           + '</div>';
    }).join('');

    /* Подписи живут вне 3D-сцены, поверх неё — иначе верхние слои
       их перекрывают. Позиции считаются каждый кадр по якорям. */
    var caps = document.createElement('div');
    caps.className = 'caps';
    caps.setAttribute('aria-hidden', 'true');
    caps.innerHTML = parts.map(function (p) {
      return '<div class="cap">'
           + '<span class="cap__line"></span>'
           + '<span class="cap__t">'
           +   '<span class="cap__n">' + esc(p.name) + '</span>'
           +   '<span class="cap__d">' + esc(p.note || '') + '</span>'
           + '</span></div>';
    }).join('');
    $('.stage').appendChild(caps);

    /* Легенда слоёв: видна там, где выноскам не хватает места (мобильные). */
    var legend = document.createElement('p');
    legend.className = 'legend';
    legend.setAttribute('aria-hidden', 'true');
    legend.innerHTML = parts.map(function (p) {
      return '<span>' + esc(p.name) + '</span>';
    }).join('');
    $('.stage').appendChild(legend);

    /* луч сканера поверх сцены */
    if (!REDUCED) {
      var scan = document.createElement('div');
      scan.className = 'scan';
      $('.stage').appendChild(scan);
    }
  }

  /* Прогресс разбора привязан к прокрутке внутри высокой секции hero */
  function initTeardown() {
    var hero = $('.hero'), dev = $('#device');
    if (!hero || !dev) return;
    var layers = $$('.lyr', dev);
    if (!layers.length) return;

    var bar = $('#meterBar'), pct = $('#meterPct'), hint = $('#hint');
    var maxSep = 0, target = 0, cur = 0, tilt = { x: 0, y: 0 }, raf = null;

    var stageEl = dev.parentElement;
    var capEls  = $$('.cap', stageEl);
    var anchors = $$('.anchor', dev);
    var capsOn  = true;   /* на узких экранах подписи скрыты — не считаем их */
    var capTextW = 0;

    function measure() {
      /* Шаг разлёта считаем от свободной высоты сцены, а не от размера
         устройства: иначе на низких экранах верхний слой уезжает под
         шапку и за край. 0.55 — во столько сжимается высота после
         наклона по X, 0.85 — доля шага, которая видна по вертикали. */
      var stage = dev.parentElement;
      var gaps = Math.max(layers.length - 1, 1);
      var projected = dev.offsetHeight * 0.55;
      var room = stage.clientHeight * 0.84 - projected;
      maxSep = clamp(room / (gaps * 0.85), 24, 92);

      capsOn = capEls.length > 0 && getComputedStyle(capEls[0]).display !== 'none';

      /* ширина самой длинной подписи — нужна, чтобы колонка не уехала
         за край окна; меряем один раз на ресайз, а не каждый кадр */
      capTextW = 0;
      for (var c = 0; c < capEls.length; c++) {
        var tEl = capEls[c].querySelector('.cap__t');
        if (tEl) capTextW = Math.max(capTextW, tEl.offsetWidth);
      }
    }

    function readScroll() {
      var r = hero.getBoundingClientRect();
      var run = hero.offsetHeight - window.innerHeight;
      target = run > 0 ? clamp(-r.top / run, 0, 1) : 0;
    }

    /* Подписи стоят колонкой справа от всей стопки, а линии тянутся
       назад к своим слоям. Колонка считается по самому правому слою,
       поэтому текст никогда не ложится на устройство. */
    var CAP_GAP = 30;   /* зазор между стопкой и колонкой подписей */
    var CAP_EDGE = 16;  /* минимальный отступ подписи от края окна */
    var DX_MAX = 90;    /* дальше двигать устройство нельзя — упрётся в текст */
    var dx = 0;

    function placeCaps(eased) {
      if (!capsOn || !capEls.length) return;

      /* Все замеры сначала, все записи потом — иначе layout дёргается.
         Позиции приводим к dx=0, чтобы сдвиг не накапливался от кадра
         к кадру. */
      var s = stageEl.getBoundingClientRect();
      var maxRight0 = 0, i, pts = [];
      for (i = 0; i < layers.length; i++) {
        maxRight0 = Math.max(maxRight0, layers[i].getBoundingClientRect().right);
      }
      maxRight0 -= dx;
      for (i = 0; i < anchors.length; i++) {
        var a = anchors[i].getBoundingClientRect();
        pts.push({ x: a.left - s.left - dx, y: a.top - s.top });
      }

      /* Нужна ширина под линию и саму подпись. Если справа не хватает —
         двигаем устройство влево, а не обрезаем текст. */
      var need = (maxRight0 + CAP_GAP + capTextW + CAP_EDGE) - window.innerWidth;
      dx = need > 0 ? -Math.min(need, DX_MAX) : 0;

      var colX = (maxRight0 + dx + CAP_GAP) - s.left;

      dev.style.setProperty('--dx', dx.toFixed(1) + 'px');
      for (i = 0; i < capEls.length; i++) {
        var x = pts[i].x + dx;
        capEls[i].style.transform =
          'translate(' + x.toFixed(1) + 'px,' + pts[i].y.toFixed(1) + 'px) translateY(-50%)';
        capEls[i].firstElementChild.style.width =
          Math.max(colX - x, 16).toFixed(1) + 'px';
        capEls[i].classList.toggle('show', eased > 0.12 + i * 0.11);
      }
    }

    function draw() {
      /* сглаживание: слои догоняют скролл, движение получается «весомым» */
      cur += (target - cur) * (REDUCED ? 1 : 0.12);
      if (Math.abs(target - cur) < 0.0005) cur = target;

      /* Разлёт растянут почти на всю секцию, кривая smoothstep —
         движение мягко стартует и мягко останавливается, а середина
         идёт почти линейно за пальцем. Резкий ease-out тут не годится:
         разбор заканчивался в первой трети прокрутки. */
      var x = clamp(cur / 0.9, 0, 1);
      var eased = x * x * (3 - 2 * x);

      var sepNow = eased * maxSep;
      dev.style.setProperty('--sep', sepNow.toFixed(2) + 'px');
      /* компенсируем рост стопки вверх — держим её по центру сцены */
      var gaps = Math.max(layers.length - 1, 1);
      dev.style.setProperty('--dy', (sepNow * gaps * 0.85 / 2).toFixed(2) + 'px');

      var rx = 58 - eased * 8 + tilt.y;
      var rz = -32 + eased * 10 + tilt.x;
      dev.style.setProperty('--rx', rx.toFixed(2) + 'deg');
      dev.style.setProperty('--rz', rz.toFixed(2) + 'deg');

      layers.forEach(function (el, i) {
        var appear = 0.12 + i * 0.11;
        el.classList.toggle('show', eased > appear);
      });

      placeCaps(eased);

      if (bar) bar.style.transform = 'scaleX(' + eased.toFixed(3) + ')';
      if (pct) pct.textContent = Math.round(eased * 100) + '%';
      if (hint) hint.style.opacity = String(clamp(1 - cur * 5, 0, 1));

      raf = (Math.abs(target - cur) > 0.0005) ? requestAnimationFrame(draw) : null;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(draw); }

    measure();
    readScroll();
    cur = target;
    draw();

    window.addEventListener('scroll', function () { readScroll(); kick(); }, { passive: true });
    window.addEventListener('resize', function () { measure(); readScroll(); kick(); });

    /* лёгкий наклон за курсором — ощущение предмета в руке */
    if (!REDUCED && window.matchMedia('(hover:hover)').matches) {
      $('.hero__stick').addEventListener('mousemove', function (e) {
        var w = window.innerWidth, h = window.innerHeight;
        tilt.x = (e.clientX / w - 0.5) * 10;
        tilt.y = (e.clientY / h - 0.5) * -8;
        kick();
      });
    }

    requestAnimationFrame(function () { hero.classList.add('ready'); });
  }

  /* ============================================================
     3. Бегущая строка симптомов
     ============================================================ */
  function ticker() {
    var items = arr('symptoms');
    if (!items.length) return;

    [['#tick1', 1], ['#tick2', -1]].forEach(function (cfg) {
      var row = $(cfg[0]);
      if (!row) return;
      var src = cfg[1] === 1 ? items : items.slice().reverse();
      /* дублируем набор, чтобы лента шла без стыка */
      var html = src.map(function (t) { return '<span class="tick__i">' + esc(t) + '</span>'; }).join('');
      row.innerHTML = html + html;

      if (REDUCED) return;
      var half = row.scrollWidth / 2;
      var pos = cfg[1] === 1 ? 0 : -half;
      var speed = 0.42 * cfg[1];

      (function loop() {
        pos -= speed;
        if (cfg[1] === 1 && pos <= -half) pos += half;
        if (cfg[1] === -1 && pos >= 0) pos -= half;
        row.style.transform = 'translate3d(' + pos.toFixed(2) + 'px,0,0)';
        requestAnimationFrame(loop);
      })();
    });
  }

  /* ============================================================
     4. Категории техники
     Иконки — контурные, рисуются штрихом при появлении в кадре.
     ============================================================ */
  var ICON = {
    phone:  '<svg viewBox="0 0 48 48"><rect x="14" y="4" width="20" height="40" rx="4"/><line x1="21" y1="9" x2="27" y2="9"/><circle cx="24" cy="38" r="2"/></svg>',
    tablet: '<svg viewBox="0 0 48 48"><rect x="8" y="6" width="32" height="36" rx="3"/><circle cx="24" cy="37" r="1.8"/></svg>',
    laptop: '<svg viewBox="0 0 48 48"><rect x="9" y="10" width="30" height="20" rx="2"/><path d="M4 36h40l-3-6H7l-3 6Z"/></svg>',
    watch:  '<svg viewBox="0 0 48 48"><rect x="15" y="14" width="18" height="20" rx="4"/><path d="M19 14V7h10v7M19 34v7h10v-7"/></svg>',
    buds:   '<svg viewBox="0 0 48 48"><path d="M17 10c-5 0-8 4-8 9v11a4 4 0 0 0 8 0V19"/><path d="M31 10c5 0 8 4 8 9v11a4 4 0 0 1-8 0V19"/></svg>',
    console:'<svg viewBox="0 0 48 48"><rect x="5" y="16" width="38" height="18" rx="9"/><line x1="14" y1="21" x2="14" y2="29"/><line x1="10" y1="25" x2="18" y2="25"/><circle cx="33" cy="23" r="2"/><circle cx="37" cy="28" r="2"/></svg>',
    monitor:'<svg viewBox="0 0 48 48"><rect x="5" y="9" width="38" height="25" rx="2"/><path d="M19 42h10M24 34v8"/></svg>',
    parts:  '<svg viewBox="0 0 48 48"><rect x="17" y="6" width="14" height="9" rx="2"/><path d="M21 6V3M27 6V3M24 15v9a8 8 0 0 1-8 8 8 8 0 0 0-8 8v5"/></svg>',
    mining: '<svg viewBox="0 0 48 48"><rect x="6" y="12" width="36" height="8" rx="1.5"/><rect x="6" y="24" width="36" height="8" rx="1.5"/><circle cx="13" cy="16" r="1.8"/><circle cx="13" cy="28" r="1.8"/><path d="M12 32v8M36 32v8"/></svg>',
    data:   '<svg viewBox="0 0 48 48"><ellipse cx="24" cy="12" rx="15" ry="5"/><path d="M9 12v12c0 2.8 6.7 5 15 5s15-2.2 15-5V12M9 24v12c0 2.8 6.7 5 15 5s15-2.2 15-5V24"/></svg>'
  };

  function categories() {
    var items = arr('categories');
    var box = $('#cats');
    if (!box || !items.length) return;

    box.innerHTML = items.map(function (c, i) {
      var ico = ICON[c.id] || ICON.phone;
      return '<article class="cat">'
           + '<span class="cat__num">' + String(i + 1).padStart(2, '0') + '</span>'
           + '<span class="cat__i" aria-hidden="true">' + ico + '</span>'
           + '<span class="cat__b">'
           +   '<h3 class="cat__n">' + esc(c.name) + '</h3>'
           +   '<p class="cat__d">' + esc(c.note || '') + '</p>'
           + '</span></article>';
    }).join('');

    /* длина контура нужна, чтобы штрих прорисовывался ровно */
    $$('.cat__i svg *', box).forEach(function (p) {
      var len = 300;
      try { if (p.getTotalLength) len = Math.ceil(p.getTotalLength()) || 300; } catch (e) {}
      p.style.setProperty('--len', len);
    });
  }

  /* ============================================================
     5. Процесс
     ============================================================ */
  function process() {
    var items = arr('process'), box = $('#proc');
    if (!box || !items.length) return;
    var rail = $('#procRail');
    box.insertAdjacentHTML('beforeend', items.map(function (p, i) {
      return '<article class="proc__i">'
           + '<span class="proc__n">' + String(i + 1).padStart(2, '0') + '</span>'
           + '<h3 class="proc__t">' + esc(p.title) + '</h3>'
           + '<p class="proc__d">' + esc(p.text) + '</p>'
           + '</article>';
    }).join(''));

    if (!rail) return;
    window.addEventListener('scroll', function () {
      var r = box.getBoundingClientRect();
      var h = window.innerHeight;
      var prog = clamp((h * 0.75 - r.top) / (r.height * 0.85), 0, 1);
      rail.style.transform = 'scaleY(' + prog.toFixed(3) + ')';
    }, { passive: true });
  }

  /* ============================================================
     6. Опциональные секции — рисуются, только если есть данные
     ============================================================ */
  function optional() {
    /* --- удобства --- */
    var ft = arr('features');
    if (ft.length) {
      $('#featList').innerHTML = ft.map(function (t) {
        return '<li>' + esc(t) + '</li>';
      }).join('');
      show('features');
    }

    /* --- прайс --- */
    var pr = arr('prices');
    if (pr.length) {
      var cats = [], grp = {};
      pr.forEach(function (it) {
        var c = it.category || 'Прочее';
        if (!grp[c]) { grp[c] = []; cats.push(c); }
        grp[c].push(it);
      });
      /* Если запчасти не указаны ни в одной позиции, колонки
         «оригинал / аналог» не рисуем: пустая таблица из прочерков
         выглядит как недоделка, а не как прозрачность. */
      var anyPart = pr.some(function (it) {
        return Number(it.partOriginal) || Number(it.partAnalog);
      });

      $('#prList').innerHTML = cats.map(function (c) {
        return '<div class="pr__cat">' + esc(c) + '</div>' + grp[c].map(function (it) {
          var hasPart = Number(it.partOriginal) || Number(it.partAnalog);
          return '<div class="pr__i"' + (anyPart ? '' : ' data-work-only="true"') + '>'
               + '<div class="pr__n">' + esc(it.service)
               +   (it.device ? ' · ' + esc(it.device) : '')
               +   (it.duration ? '<div class="pr__sub">' + esc(it.duration) + '</div>' : '')
               + '</div>'
               + '<div class="pr__v"><i>работа</i>' + money(it.work) + '</div>'
               + (anyPart
                   ? '<div class="pr__v"><i>оригинал</i>' + (hasPart ? money(it.partOriginal) : '—') + '</div>'
                     + '<div class="pr__v"><i>аналог</i>' + (hasPart ? money(it.partAnalog) : '—') + '</div>'
                   : '')
               + '</div>';
        }).join('');
      }).join('');

      /* заголовок секции честно объясняет, что именно в цене */
      var note = $('#prNote');
      if (note) {
        note.textContent = anyPart
          ? 'Работа и запчасть указаны отдельно — так видно, за что именно вы платите. Точную сумму называем после диагностики.'
          : 'Цены указаны за работу, без стоимости запчастей. Итоговую сумму называем после диагностики, до начала ремонта.';
      }
      show('prices');
    }

    /* --- мастера --- */
    var ms = arr('masters');
    if (ms.length) {
      $('#msList').innerHTML = ms.map(function (m, i) {
        var ph = (m.photoUrl || '').trim();
        return '<article class="ms__i">'
             + '<div class="ms__ph">'
             +   (ph ? '<img src="' + esc(ph) + '" alt="' + esc(m.name) + '" loading="lazy" onerror="this.remove()">' : board(i))
             + '</div>'
             + '<div class="ms__b"><h3 class="ms__n">' + esc(m.name) + '</h3>'
             + '<p class="ms__r">' + esc(m.role || '') + '</p></div>'
             + '</article>';
      }).join('');
      show('team');
    }

    /* --- отзывы --- */
    var rv = arr('reviews');
    if (rv.length) {
      $('#rvList').innerHTML = rv.map(function (r) {
        return '<article class="rv__i"><p class="rv__q">' + esc(r.text) + '</p>'
             + '<div><div class="rv__n">' + esc(r.name) + '</div>'
             + (r.device ? '<div class="rv__d">' + esc(r.device) + '</div>' : '') + '</div></article>';
      }).join('');
      show('reviews');
    }

    /* --- FAQ --- */
    var fq = arr('faq');
    if (fq.length) {
      $('#faqList').innerHTML = fq.map(function (f, i) {
        return '<div class="qa" data-open="false">'
             + '<h3 style="margin:0"><button class="qa__b" type="button" id="qb' + i + '" aria-expanded="false" aria-controls="qp' + i + '">'
             +   '<span>' + esc(f.q) + '</span><span class="qa__x" aria-hidden="true"></span></button></h3>'
             + '<div class="qa__w"><div class="qa__c" id="qp' + i + '" role="region" aria-labelledby="qb' + i + '">'
             +   '<p>' + esc(f.a) + '</p></div></div></div>';
      }).join('');
      $('#faqList').addEventListener('click', function (e) {
        var b = e.target.closest('.qa__b');
        if (!b) return;
        var qa = b.closest('.qa');
        var open = qa.getAttribute('data-open') === 'true';
        qa.setAttribute('data-open', String(!open));
        b.setAttribute('aria-expanded', String(!open));
      });
      show('faq');
    }
  }
  function show(id) {
    var s = document.getElementById(id);
    if (s) s.hidden = false;
    var n = $('[data-nav="' + id + '"]');
    if (n) n.hidden = false;
  }
  /* заглушка вместо фото: абстрактная плата, а не силуэт человека */
  function board(seed) {
    var s = '', i, x, y;
    for (i = 0; i < 8; i++) {
      x = 10 + ((seed * 41 + i * 47) % 80);
      y = 12 + ((seed * 67 + i * 31) % 76);
      s += '<circle cx="' + x + '" cy="' + y + '" r="' + (2 + (i % 3)) + '" fill="none" stroke="currentColor" stroke-width="1.3"/>'
         + '<path d="M' + x + ' ' + y + ' h' + ((i % 2) ? 13 : -13) + '" stroke="currentColor" stroke-width="1" fill="none"/>';
    }
    return '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Схема платы">'
         + s + '<rect x="32" y="36" width="36" height="28" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
  }

  /* ============================================================
     7. Контакты и футер
     ============================================================ */
  function contacts() {
    /* Пустые поля не выводим: строка «Часы» без графика выглядит
       недоделкой, а график известен не про каждый бизнес. */
    var rows = [];
    if (get('business.address')) rows.push(['Адрес', esc(get('business.address'))]);
    if (get('business.hours'))   rows.push(['Часы',  esc(get('business.hours'))]);
    if (get('business.phoneDisplay')) {
      rows.push(['Телефон', L.tel
        ? '<a href="' + L.tel + '">' + esc(get('business.phoneDisplay')) + '</a>'
        : esc(get('business.phoneDisplay'))]);
    }
    var ch = [];
    if (L.max) ch.push('<a href="' + L.max + '" target="_blank" rel="noopener" data-primary>MAX</a>');
    if (L.tg)  ch.push('<a href="' + L.tg  + '" target="_blank" rel="noopener">Telegram</a>');
    if (L.wa)  ch.push('<a href="' + L.wa  + '" target="_blank" rel="noopener">WhatsApp</a>');
    if (ch.length) rows.push(['Написать', '<span class="chan">' + ch.join('') + '</span>']);

    $('#info').innerHTML = rows.map(function (r) {
      return '<div class="inf"><span class="inf__k">' + r[0] + '</span><span class="inf__v">' + r[1] + '</span></div>';
    }).join('');

    var bits = [];
    if (get('legal.inn'))  bits.push('ИНН ' + esc(get('legal.inn')));
    if (get('legal.ogrn')) bits.push('ОГРНИП ' + esc(get('legal.ogrn')));
    bits.push(esc(get('business.address')));
    $('#ftrLegal').innerHTML = bits.map(function (b) { return '<span>' + b + '</span>'; }).join('');

    $('#ftrLinks').innerHTML =
        '<a href="' + L.policy + '" target="_blank" rel="noopener">Политика обработки персональных данных</a>'
      + '<a href="' + L.offer + '" target="_blank" rel="noopener">Договор-оферта</a>'
      + (L.tel ? '<a href="' + L.tel + '">' + esc(get('business.phoneDisplay')) + '</a>' : '');

    $('#ftrCp').textContent = '© ' + new Date().getFullYear() + ' ' + get('business.name')
      + '. Информация на сайте не является публичной офертой.';
  }

  /* ============================================================
     8. Форма заявки — form-relay
     Правила отправки и honeypot описаны в form-relay.md.
     Менять здесь можно вёрстку и поля; нельзя — метод, формат тела,
     honeypot и блокировку кнопки.
     ============================================================ */
  var RELAY = 'https://hooks.neirolanding.ru/api/submit/';

  function form() {
    var f = $('#form');
    if (!f) return;

    /* Нет site_id — формы на сайте нет. Контакты остаются.
       Форма, которая молча теряет заявки, хуже отсутствия формы. */
    var siteId = String(get('business.formSiteId') || '').trim();
    if (!siteId) {
      f.remove();
      var ct = $('.ct');
      if (ct) ct.setAttribute('data-noform', 'true');
      return;
    }

    function sync(el) {
      if (!el.checkValidity()) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
    }
    f.addEventListener('blur', function (e) {
      if (e.target.matches('.inp, .ta')) sync(e.target);
    }, true);

    f.addEventListener('submit', function (e) {
      e.preventDefault();

      $$('.inp, .ta', f).forEach(sync);
      var pd = $('#fPd');
      $('#ePd').style.display = pd.checked ? 'none' : 'flex';
      if (!f.checkValidity()) {
        var bad = $(':invalid', f);
        if (bad) { bad.focus(); bad.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        return;
      }

      var btn = f.querySelector('button[type="submit"]');
      var fail = $('#formFail');
      var data = Object.fromEntries(new FormData(f).entries());

      /* блокировка от двойного клика — иначе придут две заявки */
      btn.disabled = true;
      if (fail) fail.hidden = true;

      fetch(RELAY + encodeURIComponent(siteId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('bad_status');
          f.setAttribute('data-sent', 'true');
          f.scrollIntoView({ behavior: 'smooth', block: 'center' });
        })
        .catch(function () {
          /* коды ошибок не разбираем — человеку нужен телефон, а не код */
          if (fail) {
            fail.hidden = false;
            fail.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        })
        .finally(function () { btn.disabled = false; });
    });
  }

  /* ============================================================
     9. Появление блоков в кадре + шапка + cookie
     ============================================================ */
  function inview() {
    var els = $$('.reveal, .rise, .cat, .proc__i');
    if (!('IntersectionObserver' in window) || REDUCED) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    els.forEach(function (el) { io.observe(el); });
  }

  function header() {
    var h = $('#hdr');
    var on = function () { h.setAttribute('data-solid', String(window.scrollY > 40)); };
    window.addEventListener('scroll', on, { passive: true });
    on();
  }

  function cookie() {
    var KEY = 'cookie-consent-v1', box = $('#ck'), ok = false;
    try { ok = localStorage.getItem(KEY) === '1'; } catch (e) {}
    if (!ok) box.setAttribute('data-show', 'true');
    $('#ckOk').addEventListener('click', function () {
      box.removeAttribute('data-show');
      try { localStorage.setItem(KEY, '1'); } catch (e) {}
    });
  }

  /* ============================================================
     СТАРТ
     ============================================================ */
  function boot() {
    identity();
    buildDevice();
    initTeardown();
    ticker();
    categories();
    process();
    optional();
    contacts();
    form();
    inview();
    header();
    cookie();
  }

  /* Не полагаемся только на DOMContentLoaded: если скрипт подключат
     с defer или вставят позже, событие уже пройдёт и страница
     останется пустой. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
