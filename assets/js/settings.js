(() => {
  'use strict';

  const C = window.CONFIG;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  /* ---------- тема ---------- */
  const themeRadios = $$('input[name="theme"]');
  if (themeRadios.length && typeof window.setTheme === 'function') {
    let stored = 'auto';
    try {
      stored = localStorage.getItem('theme') || 'auto';
    } catch (e) {
      /* приватный режим */
    }
    themeRadios.forEach((radio) => {
      radio.checked = radio.value === stored;
      radio.addEventListener('change', () => {
        if (radio.checked) window.setTheme(radio.value);
      });
    });
  }

  /* ---------- админка ---------- */
  const adminForm = $('#adminForm');
  if (!adminForm || !C) return;

  const ADMIN_KEY = 'adminUnlocked';
  const tabTheme = $('#tab-theme');
  const tabReq = $('#tab-requests');
  const panelTheme = $('#panel-theme');
  const panelReq = $('#panel-requests');
  const gate = $('#adminGate');
  const note = $('#adminNote');
  const err = $('#adminErr');
  const pass = $('#adminPass');
  const reqCount = $('#reqCount');
  const reqList = $('#requestsList');
  const reqEmpty = $('#requestsEmpty');

  const read = () => {
    try {
      return JSON.parse(localStorage.getItem('requests') || '[]');
    } catch (e) {
      return [];
    }
  };
  const write = (list) => {
    try {
      localStorage.setItem('requests', JSON.stringify(list.slice(0, 100)));
    } catch (e) {
      /* хранилище недоступно */
    }
  };

  const ruDate = (iso) => {
    const parts = String(iso).split('-');
    return parts.length === 3 ? parts[2] + '.' + parts[1] + '.' + parts[0] : String(iso);
  };

  const statusLabel = (status) =>
    status === 'accepted' ? 'Принята' : status === 'rejected' ? 'Отклонена' : 'Новая';

  const makeBadge = (status) => {
    const span = document.createElement('span');
    span.className = 'status status--' + status;
    span.textContent = statusLabel(status);
    return span;
  };

  const makeButton = (label, act, id, primary) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (primary ? 'btn--primary' : 'btn--ghost');
    b.dataset.act = act;
    b.dataset.id = String(id);
    b.textContent = label;
    return b;
  };

  const render = () => {
    const list = read();
    const fresh = list.filter((r) => (r.status || 'new') === 'new').length;
    reqCount.textContent = fresh ? String(fresh) : '';

    reqList.textContent = '';
    reqEmpty.hidden = list.length > 0;

    list.forEach((r) => {
      const status = r.status || 'new';
      const card = document.createElement('article');
      card.className = 'req req--' + status;

      const head = document.createElement('div');
      head.className = 'req__head';
      const when = document.createElement('span');
      when.textContent = new Date(r.createdAt).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      head.append(when, makeBadge(status));

      const title = document.createElement('p');
      title.className = 'req__title';
      title.textContent = r.house + ' · ' + (r.nights || 1) + ' ноч.';

      const meta = document.createElement('p');
      meta.className = 'req__meta';
      meta.textContent = ruDate(r.in) + ' — ' + ruDate(r.out) + ' · гостей: ' + r.guests;

      const contact = document.createElement('p');
      contact.className = 'req__meta';
      contact.textContent = r.name + ' · ' + r.phone;

      card.append(head, title, meta, contact);

      if (r.comment) {
        const comment = document.createElement('p');
        comment.className = 'req__comment';
        comment.textContent = r.comment;
        card.append(comment);
      }

      const actions = document.createElement('div');
      actions.className = 'req__btns';
      if (status !== 'accepted') actions.append(makeButton('Принять', 'accepted', r.id, true));
      if (status !== 'rejected') actions.append(makeButton('Отклонить', 'rejected', r.id, false));
      card.append(actions);

      reqList.append(card);
    });
  };

  const showTab = (which) => {
    const isReq = which === 'requests';
    tabTheme.classList.toggle('is-active', !isReq);
    tabTheme.setAttribute('aria-selected', String(!isReq));
    tabReq.classList.toggle('is-active', isReq);
    tabReq.setAttribute('aria-selected', String(isReq));
    panelTheme.hidden = isReq;
    panelReq.hidden = !isReq;
  };

  const unlock = () => {
    sessionStorage.setItem(ADMIN_KEY, '1');
    gate.hidden = true;
    note.hidden = false;
    tabReq.hidden = false;
    err.hidden = true;
    render();
    showTab('requests');
  };

  const lock = () => {
    sessionStorage.removeItem(ADMIN_KEY);
    gate.hidden = false;
    note.hidden = true;
    tabReq.hidden = true;
    pass.value = '';
    showTab('theme');
  };

  tabTheme.addEventListener('click', () => showTab('theme'));
  tabReq.addEventListener('click', () => showTab('requests'));

  adminForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (pass.value.trim() === String(C.adminPassword)) {
      unlock();
    } else {
      err.textContent = 'Неверный пароль';
      err.hidden = false;
      pass.focus();
    }
  });

  $('#adminExit').addEventListener('click', (e) => {
    e.preventDefault();
    lock();
  });

  reqList.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const list = read();
    const item = list.find((x) => String(x.id) === btn.dataset.id);
    if (!item) return;
    item.status = btn.dataset.act;
    write(list);
    render();
  });

  render();
  showTab('theme');

  if (sessionStorage.getItem(ADMIN_KEY) === '1') {
    gate.hidden = true;
    note.hidden = false;
    tabReq.hidden = false;
  }
})();
