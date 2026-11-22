(() => {
  'use strict';

  const C = window.CONFIG;
  if (!C) return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const fmt = (n) => Number(n).toLocaleString('ru-RU');
  const rub = (n) => fmt(n) + ' ₽';
  const site = (C.site || '').replace(/\/+$/, '');

  const get = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), C);

  /* ---------- значения из конфига в разметку ---------- */
  const values = {
    phone: C.phoneText,
    legalName: C.legalName,
    checkin: C.checkin,
    checkout: C.checkout,
    minNights: String(C.minNights),
    deposit: rub(C.deposit),
    pets: C.pets,
    cancel: C.cancel,
    'address.short': C.address.short,
    'prices.note': C.prices.note,
    'minutes.airport': C.minutes.airport + ' мин',
    'minutes.center': C.minutes.center + ' мин',
    'minutes.station': C.minutes.station + ' мин'
  };

  Object.keys(C.houses).forEach((id) => {
    const h = C.houses[id];
    values[id + '.tagline'] = h.tagline;
    values[id + '.guests'] = 'до ' + h.guests;
    values[id + '.bedrooms'] = String(h.bedrooms);
    values[id + '.area'] = String(h.area);
    values[id + '.checkin'] = h.checkin || C.checkin;
    values[id + '.checkout'] = h.checkout || C.checkout;
    values[id + '.address'] = h.address || C.address.short;
    values[id + '.distance'] = h.distance || '';
    values[id + '.priceFrom'] = h.priceFrom == null
      ? 'цена по запросу'
      : 'от ' + fmt(h.priceFrom) + ' ₽';
  });

  $$('[data-cfg]').forEach((el) => {
    const key = el.dataset.cfg;
    if (values[key] != null) {
      el.textContent = values[key];
    } else {
      const v = get(key);
      if (v != null && typeof v !== 'object') el.textContent = String(v);
    }
  });

  const links = {
    tel: 'tel:' + C.phoneRaw,
    telegram: 'https://t.me/' + C.telegram,
  };
  $$('a[data-cfg-href]').forEach((a) => {
    const href = links[a.dataset.cfgHref];
    if (href) a.href = href;
  });

  const priceNote = (el) => {
    if (!C.prices.ph) return el;
    el.dataset.ph = '';
    el.title = 'Заглушка: цена в assets/js/config.js';
    return el;
  };

  /* ---------- карточки тарифов на странице A-frame ---------- */
  const priceCards = $('#priceCards');
  if (priceCards && C.prices && C.prices.tariffs) {
    C.prices.tariffs.forEach((t) => {
      const card = document.createElement('article');
      card.className = 'price-card';

      const head = document.createElement('header');
      head.className = 'price-card__head';
      const name = document.createElement('h3');
      name.textContent = t.name;
      const cap = document.createElement('span');
      cap.textContent = t.cap;
      head.append(name, cap);
      card.append(head);

      [['Дом', t.house, false], ['Дом + баня', t.bath, true]].forEach(([label, opt, hot]) => {
        const box = document.createElement('div');
        box.className = 'price-opt' + (hot ? ' price-opt--hot' : '');

        const title = document.createElement('p');
        title.className = 'price-opt__name';
        title.append(document.createTextNode(label));
        if (hot) {
          const badge = document.createElement('em');
          badge.textContent = '5 часов';
          title.append(badge);
        }
        box.append(title);

        const days = document.createElement('dl');
        days.className = 'price-days';
        [['Вс–Чт', opt.sunThu], ['Пятница', opt.fri], ['Суббота', opt.sat]].forEach(([day, value]) => {
          const row = document.createElement('div');
          const dt = document.createElement('dt');
          dt.textContent = day;
          const dd = document.createElement('dd');
          if (value == null) {
            dd.className = 'is-request';
            dd.textContent = 'по запросу';
          } else {
            dd.textContent = rub(value);
            priceNote(dd);
          }
          row.append(dt, dd);
          days.append(row);
        });
        box.append(days);
        card.append(box);
      });

      const book = document.createElement('a');
      book.className = 'btn btn--primary';
      book.href = '#booking';
      book.textContent = 'Забронировать';
      card.append(book);

      priceCards.append(card);
    });
  }

  /* ---------- таблица цен на главной и в Barnhouse ---------- */
  const priceRows = $('#priceRows');
  if (priceRows && C.prices) {
    const cell = (value, label) => {
      const td = document.createElement('td');
      td.dataset.label = label;
      if (value == null) {
        td.className = 'is-request';
        td.textContent = 'по запросу';
      } else {
        const b = document.createElement('b');
        b.textContent = rub(value);
        priceNote(b);
        td.append(b);
      }
      return td;
    };

    const putRow = (title, sub, data) => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = title;
      if (sub) {
        const small = document.createElement('small');
        small.textContent = sub;
        th.append(small);
      }
      tr.append(th);
      tr.append(
        cell(data.sunThu, 'Вс–чт'),
        cell(data.fri, 'Пятница'),
        cell(data.sat, 'Суббота'),
        cell(null, 'Праздники')
      );
      priceRows.append(tr);
    };

    const only = priceRows.dataset.house;

    if (only !== 'Barnhouse') {
      C.prices.tariffs.forEach((t) => {
        putRow('A-frame · Дом', t.name + ' · ' + t.cap, t.house);
        putRow('A-frame · Дом + баня', t.name + ' · ' + t.cap, t.bath);
      });
    }
    if (!only || only === 'Barnhouse') {
      putRow('Barnhouse · Дом целиком', 'до ' + C.houses.barnhouse.guests + ' гостей', {
        sunThu: null, fri: null, sat: null
      });
    }
  }

  /* ---------- доп. услуги: список и таблица ---------- */
  const extrasList = $('#extrasList');
  if (extrasList) {
    const house = extrasList.dataset.house;
    const list = house ? ((C.houses[house] || {}).extras || []) : C.extras;
    list.forEach((x) => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = x.name;
      const price = document.createElement('b');
      price.textContent = x.price || '—';
      li.append(name, price);
      if (x.note) {
        const note = document.createElement('small');
        note.textContent = x.note;
        li.append(note);
      }
      extrasList.append(li);
    });
  }

  const extraRows = $('#extraRows');
  if (extraRows && Array.isArray(C.extras)) {
    C.extras.forEach((x) => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = x.name;
      const price = document.createElement('td');
      price.dataset.label = 'Цена';
      price.textContent = x.price || '—';
      const note = document.createElement('td');
      note.dataset.label = 'Примечание';
      note.textContent = x.note || '—';
      tr.append(th, price, note);
      extraRows.append(tr);
    });
  }

  /* ---------- микроразметка LocalBusiness + Accommodation ---------- */
  if (site && !$('#ld-json')) {
    const amenities = ['Wi-Fi', 'Кухня', 'Парковка', 'Баня', 'Мангал'].map((name) => ({
      '@type': 'LocationFeatureSpecification',
      name,
      value: true
    }));
    const nums = [];
    (C.prices && C.prices.tariffs ? C.prices.tariffs : []).forEach((t) => {
      [t.house, t.bath].forEach((opt) => {
        if (!opt) return;
        [opt.sunThu, opt.fri, opt.sat].forEach((n) => {
          if (typeof n === 'number') nums.push(n);
        });
      });
    });
    const minPrice = nums.length ? Math.min.apply(null, nums) : null;

    const business = {
      '@type': 'LodgingBusiness',
      '@id': site + '/#business',
      name: 'Два дома в Сургуте',
      description: 'Посуточная аренда двух домов в Сургуте: A-frame со стеклянной стеной и барнхаус с панорамными окнами.',
      url: site + '/',
      image: [site + '/images/aframe-banner.jpg', site + '/images/aframe-facade.jpg', site + '/images/barnhouse-facade.jpg'],
      telephone: C.phoneRaw,
        checkinTime: C.checkin,
      checkoutTime: C.checkout,
      currenciesAccepted: 'RUB',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Сургут',
        addressRegion: 'Ханты-Мансийский автономный округ — Югра',
        addressCountry: 'RU',
        ...(C.address.street ? { streetAddress: C.address.street } : {})
      },
      amenityFeature: amenities,
      containsPlace: ['aframe', 'barnhouse'].map((id) => {
        const h = C.houses[id];
        return {
          '@type': 'Accommodation',
          '@id': site + '/' + id + '.html',
          name: h.name + ' в Сургуте',
          description: h.tagline,
          url: site + '/' + id + '.html',
          image: site + '/images/' + id + '-facade.jpg',
          occupancy: { '@type': 'QuantitativeValue', maxValue: h.guests },
          numberOfBedrooms: h.bedrooms,
          floorSize: { '@type': 'QuantitativeValue', value: h.area, unitCode: 'MTK' },
          amenityFeature: amenities
        };
      })
    };

    if (minPrice != null) business.priceRange = 'от ' + fmt(minPrice) + ' ₽ за сутки';

    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.id = 'ld-json';
    ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': [business] });
    document.head.append(ld);
  }

  /* ---------- прозрачная шапка над первым экраном ---------- */
  const heroEl = $('.hero');
  if (heroEl) {
    const syncHeader = () => document.body.classList.toggle('hero-under', window.scrollY < 40);
    syncHeader();
    window.addEventListener('scroll', syncHeader, { passive: true });
  }

  /* ---------- просмотр фото ---------- */
  const lb = $('#lightbox');
  const lbImg = $('#lbImg');
  const lbWebp = $('#lbWebp');
  const lbCap = $('#lbCap');
  const stage = lb ? $('.lb__stage', lb) : null;
  let shots = [];
  let current = 0;
  let lastFocus = null;
  let press = null;

  const shotData = (btn) => {
    const img = $('img', btn);
    const src = $('source', btn);
    return {
      webp: src ? src.getAttribute('srcset') : '',
      jpg: img.getAttribute('src'),
      alt: img.getAttribute('alt') || '',
      label: btn.dataset.label || img.getAttribute('alt') || ''
    };
  };

  const showShot = (i) => {
    current = (i + shots.length) % shots.length;
    const s = shots[current];
    if (s.webp) lbWebp.setAttribute('srcset', s.webp);
    else lbWebp.removeAttribute('srcset');
    lbImg.src = s.jpg;
    lbImg.alt = s.alt;
    lbCap.textContent = s.label + ' · ' + (current + 1) + ' из ' + shots.length;

    [shots[(current + 1) % shots.length], shots[(current - 1 + shots.length) % shots.length]].forEach((p) => {
      if (!p) return;
      new Image().src = p.jpg;
      if (p.webp) new Image().src = p.webp;
    });
  };

  const openLb = (gallery, index) => {
    shots = $$('.shot__btn', gallery).map(shotData);
    lastFocus = document.activeElement;
    showShot(index);
    lb.hidden = false;
    document.body.classList.add('lb-open');
    $('.lb__close', lb).focus();
  };

  const closeLb = () => {
    lb.hidden = true;
    document.body.classList.remove('lb-open');
    lbImg.removeAttribute('src');
    if (lastFocus) lastFocus.focus();
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.shot__btn');
    if (!btn || !lb) return;
    const gallery = btn.closest('.gal');
    if (!gallery) return;
    const buttons = $$('.shot__btn', gallery);
    openLb(gallery, buttons.indexOf(btn));
  });

  if (lb) {
    $('.lb__close', lb).addEventListener('click', closeLb);
    $('.lb__nav--prev', lb).addEventListener('click', () => showShot(current - 1));
    $('.lb__nav--next', lb).addEventListener('click', () => showShot(current + 1));

    lb.addEventListener('click', (e) => {
      if (e.target === lb) closeLb();
    });

    document.addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') showShot(current - 1);
      if (e.key === 'ArrowRight') showShot(current + 1);
      if (e.key === 'Tab') {
        const focusables = $$('button', lb);
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    stage.addEventListener('pointerdown', (e) => {
      press = { x: e.clientX, y: e.clientY };
    });
    stage.addEventListener('pointerup', (e) => {
      if (!press) return;
      const dx = e.clientX - press.x;
      const dy = e.clientY - press.y;
      press = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) showShot(current + (dx < 0 ? 1 : -1));
    });
  }

  /* ---------- выбор дома из карточки ---------- */
  const houseSelect = $('#f-house');
  $$('[data-book]').forEach((a) => {
    a.addEventListener('click', () => {
      if (houseSelect) houseSelect.value = a.dataset.book;
    });
  });

  /* ---------- форма заявки ---------- */
  const form = $('#bookingForm');
  if (!form) return;

  const f = {
    name: $('#f-name'),
    phone: $('#f-phone'),
    house: $('#f-house'),
    guests: $('#f-guests'),
    in: $('#f-in'),
    out: $('#f-out'),
    comment: $('#f-comment'),
    consent: $('#f-consent')
  };
  const errs = {
    name: $('#e-name'),
    phone: $('#e-phone'),
    house: $('#e-house'),
    guests: $('#e-guests'),
    in: $('#e-in'),
    out: $('#e-out'),
    consent: $('#e-consent')
  };
  const done = $('#done');

  const caps = {
    'A-frame': C.houses.aframe.guests,
    'Barnhouse': C.houses.barnhouse.guests
  };
  const maxAll = Math.max.apply(null, Object.keys(caps).map((k) => caps[k]));

  const isoLocal = (d) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const addDays = (iso, days) => {
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return isoLocal(d);
  };
  const today = isoLocal(new Date());
  f.in.min = today;
  f.out.min = addDays(today, 1);

  f.in.addEventListener('change', () => {
    if (!f.in.value) return;
    const minOut = addDays(f.in.value, 1);
    f.out.min = minOut;
    if (f.out.value && f.out.value < minOut) f.out.value = minOut;
  });

  const setCap = () => {
    const cap = caps[f.house.value] || maxAll;
    f.guests.max = cap;
    if (Number(f.guests.value) > cap) f.guests.value = cap;
  };
  f.house.addEventListener('change', setCap);
  setCap();

  const phoneDigits = (v) => v.replace(/\D/g, '');
  const isPhone = (v) => {
    const d = phoneDigits(v);
    if (d.length === 11) return /^[78]/.test(d);
    return d.length === 10;
  };

  const setErr = (key, msg) => {
    const box = errs[key];
    const input = f[key];
    if (!box) return;
    box.textContent = msg;
    box.hidden = !msg;
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };

  const clearErrors = () => Object.keys(errs).forEach((k) => setErr(k, ''));

  const ruDate = (iso) => {
    const [y, m, d] = iso.split('-');
    return d + '.' + m + '.' + y;
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    const problems = [];
    const name = f.name.value.trim();
    const phone = f.phone.value.trim();
    const guestsNum = Number(f.guests.value);
    const maxGuests = Number(f.guests.max) || maxAll;

    if (name.length < 2) {
      setErr('name', 'Напишите имя — хотя бы 2 буквы');
      problems.push(f.name);
    }
    if (!isPhone(phone)) {
      setErr('phone', 'Телефон в формате +7 900 000-00-00');
      problems.push(f.phone);
    }
    if (!f.house.value) {
      setErr('house', 'Выберите дом или «Ещё не выбрал»');
      problems.push(f.house);
    }
    if (!Number.isInteger(guestsNum) || guestsNum < 1 || guestsNum > maxGuests) {
      setErr('guests', 'Гостей — от 1 до ' + maxGuests);
      problems.push(f.guests);
    }
    if (!f.in.value || f.in.value < today) {
      setErr('in', 'Выберите дату заезда');
      problems.push(f.in);
    }
    if (!f.out.value || !f.in.value || f.out.value <= f.in.value) {
      setErr('out', 'Выезд должен быть позже заезда');
      problems.push(f.out);
    }
    if (!f.consent.checked) {
      setErr('consent', 'Без согласия на обработку данных отправить нельзя');
      problems.push(f.consent);
    }

    if (problems.length) {
      problems[0].focus();
      return;
    }

    const nights = Math.round(
      (new Date(f.out.value + 'T12:00:00') - new Date(f.in.value + 'T12:00:00')) / 86400000
    );
    const lines = [
      C.requestTitle,
      'Дом: ' + f.house.value,
      'Заезд: ' + ruDate(f.in.value) + ', выезд: ' + ruDate(f.out.value) + ' (' + nights + ' ноч.)',
      'Гостей: ' + guestsNum,
      'Имя: ' + name,
      'Телефон: ' + phone
    ];
    const comment = f.comment.value.trim();
    if (comment) lines.push('Комментарий: ' + comment);
    lines.push('Согласие на обработку персональных данных: да');

    const text = lines.join('\n');

    saveRequest({
      id: Date.now(),
      createdAt: new Date().toISOString(),
      house: f.house.value,
      in: f.in.value,
      out: f.out.value,
      nights,
      guests: guestsNum,
      name,
      phone,
      comment,
      status: 'new'
    });

    copyText(text);

    $('#doneTg').href = links.telegram;
    $('#doneText').textContent = text;
    done.hidden = false;
    done.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  $('#doneCopy').addEventListener('click', () => {
    copyText($('#doneText').textContent);
    $('#doneHint').textContent = 'Текст заявки скопирован — вставьте его в чат.';
  });

  $('#doneTg').addEventListener('click', () => {
    copyText($('#doneText').textContent);
    $('#doneHint').textContent = 'Текст скопирован — вставьте его в открывшийся чат Telegram.';
  });

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function saveRequest(item) {
    try {
      const list = JSON.parse(localStorage.getItem('requests') || '[]');
      list.unshift(item);
      localStorage.setItem('requests', JSON.stringify(list.slice(0, 100)));
    } catch (err) {
      /* хранилище недоступно — текст заявки всё равно скопирован */
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      /* буфер недоступен — текст показан в блоке подтверждения */
    }
    ta.remove();
  }

  /* ---------- нижняя кнопка не мешает форме ---------- */
  const bar = $('#stickyBar');
  const booking = $('#booking');
  if (bar && booking && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      ([entry]) => bar.classList.toggle('is-hidden', entry.isIntersecting),
      { threshold: 0.2 }
    ).observe(booking);
  }
})();
