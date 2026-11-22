(() => {
  'use strict';

  const C = window.CONFIG;
  if (!C) return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const fmt = (n) => Number(n).toLocaleString('ru-RU');
  const rub = (n) => fmt(n) + ' ₽';

  /* ---------- значения из конфига в разметку ---------- */
  const V = {
    phone: C.phoneText,
    email: C.email,
    addressShort: C.addressShort,
    addressFull: C.addressFull,
    legalName: C.legalName,
    inn: C.inn,
    ogrnip: C.ogrnip,
    checkin: C.checkin,
    checkout: C.checkout,
    minNights: String(C.minNights),
    deposit: rub(C.deposit),
    pets: C.pets,
    cancel: C.cancel,
    'minutes.airport': C.minutes.airport + ' мин',
    'minutes.center': C.minutes.center + ' мин',
    'minutes.station': C.minutes.station + ' мин'
  };

  Object.keys(C.houses).forEach((id) => {
    const h = C.houses[id];
    const p = C.prices[id];
    V[id + '.guests'] = 'до ' + h.guests;
    V[id + '.bedrooms'] = String(h.bedrooms);
    V[id + '.area'] = String(h.area);
    V['from.' + id] = 'от ' + fmt(p.weekday) + ' ₽';
    V['price.' + id + '.weekday'] = rub(p.weekday);
    V['price.' + id + '.weekend'] = rub(p.weekend);
    V['price.' + id + '.holiday'] = rub(p.holiday);
  });

  $$('[data-cfg]').forEach((el) => {
    const v = V[el.dataset.cfg];
    if (v != null) el.textContent = v;
  });

  const links = {
    tel: 'tel:' + C.phoneRaw,
    whatsapp: 'https://wa.me/' + C.whatsapp,
    telegram: 'https://t.me/' + C.telegram,
    email: 'mailto:' + C.email
  };
  $$('a[data-cfg-href]').forEach((a) => {
    a.href = links[a.dataset.cfgHref] || '#';
  });

  /* ---------- таблица доп. услуг ---------- */
  const extrasBody = $('#extrasBody');
  if (extrasBody && Array.isArray(C.extras)) {
    extrasBody.textContent = '';
    C.extras.forEach((x) => {
      const tr = document.createElement('tr');
      [['Услуга', x.name], ['Цена', x.price], ['Примечание', x.note]].forEach(([label, val]) => {
        const td = document.createElement('td');
        td.dataset.label = label;
        td.textContent = val || '—';
        tr.appendChild(td);
      });
      extrasBody.appendChild(tr);
    });
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
    if (!btn) return;
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

  f.house.addEventListener('change', () => {
    const caps = { 'A-frame': 4, 'Barnhouse': 6 };
    const cap = caps[f.house.value] || 8;
    f.guests.max = cap;
    if (Number(f.guests.value) > cap) f.guests.value = cap;
  });

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
    const maxGuests = Number(f.guests.max) || 8;

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
      'Заявка с сайта «Два дома в Сургуте»',
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
    const waUrl = 'https://wa.me/' + C.whatsapp + '?text=' + encodeURIComponent(text);

    copyText(text);
    window.open(waUrl, '_blank', 'noopener');

    $('#doneWa').href = waUrl;
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
