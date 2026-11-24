(() => {
  'use strict';
  const settings = window.ADVENT_SETTINGS;
  const content = window.ADVENT_CONTENT;
  const $ = id => document.getElementById(id);
  const TOTAL_DAYS = 25;
  let readDays = readProgress();
  let refreshTimer = null;

  function readProgress() {
    try {
      const value = JSON.parse(localStorage.getItem(settings.storageKey) || '[]');
      return Array.isArray(value) ? [...new Set(value.filter(n => Number.isInteger(n) && n >= 1 && n <= TOTAL_DAYS))] : [];
    } catch { return []; }
  }
  function saveProgress() {
    try { localStorage.setItem(settings.storageKey, JSON.stringify(readDays)); }
    catch { toast('Il browser non consente di salvare i progressi su questo dispositivo.'); }
  }
  // La data italiana è la stessa per tutti, indipendentemente dal fuso del dispositivo.
  function localDate() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(now);
    const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return { year: Number(value.year), month: Number(value.month) - 1, day: Number(value.day), now };
  }
  function availableDay(date = localDate()) {
    return window.AdventDate.availableDay(date);
  }
  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 2600);
  }
  function formatToday(date) {
    return new Intl.DateTimeFormat('it-IT', {timeZone:'Europe/Rome', weekday:'long', day:'numeric', month:'long', year:'numeric'}).format(date.now);
  }
  function render() {
    const grid = $('door-grid');
    const date = localDate();
    const unlocked = availableDay(date);
    const mobile = window.matchMedia('(max-width: 760px)').matches;

    // Stili essenziali applicati direttamente: le porticine non dipendono
    // dal caricamento dei fogli CSS per essere visibili.
    grid.replaceChildren();
    grid.style.cssText = `display:grid; visibility:visible; opacity:1; grid-template-columns:repeat(${mobile ? 3 : 5},minmax(0,1fr)); gap:${mobile ? '10px' : '13px'}; width:100%; position:relative;`;

    content.slice(0, TOTAL_DAYS).forEach((item, index) => {
      const day = index + 1;
      const isAvailable = day <= unlocked;
      const isRead = readDays.includes(day);
      const isToday = day === unlocked && unlocked > 0 && date.year === settings.year && date.month === settings.month;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'door' + (isRead ? ' opened' : '') + (!isAvailable ? ' locked' : '') + (isToday ? ' today' : '') + (day === 25 ? ' christmas' : '');
      button.setAttribute('aria-disabled', String(!isAvailable));
      button.setAttribute('aria-label', `Porticina ${day}${!isAvailable ? ', bloccata fino al ' + day + ' dicembre' : isRead ? ', contenuto già letto, riapri' : isToday ? ', disponibile oggi, apri' : ', disponibile, apri'}`);
      button.style.cssText = `display:block; position:relative; box-sizing:border-box; width:100%; min-width:0; height:${mobile ? 'clamp(96px,28vw,122px)' : '112px'}; padding:0; overflow:hidden; border:2px solid #dfc58a; border-radius:2px; background:linear-gradient(145deg,#a33a42 0%,#76202e 55%,#4e1522 100%); box-shadow:inset 0 0 0 4px #ffffff18,0 4px 9px #210e0d55; color:#fff0c9; opacity:1; filter:none; cursor:${isAvailable ? 'pointer' : 'default'}; -webkit-appearance:none; appearance:none; touch-action:manipulation;`;

      const number = document.createElement('span');
      number.className = 'door-number';
      number.textContent = String(day).padStart(2, '0');
      number.style.cssText = `position:absolute; z-index:3; inset:0; display:grid; place-items:center; color:#fff0c9; font:600 ${mobile ? 'clamp(34px,9vw,43px)' : '37px'} 'Cormorant Garamond',Georgia,serif; text-shadow:0 2px 4px #27190e; pointer-events:none;`;

      const label = document.createElement('span');
      label.className = 'door-label';
      label.textContent = !isAvailable ? 'IN ATTESA' : isRead ? 'LETTO' : isToday ? 'APRI OGGI' : 'DISPONIBILE';
      label.style.cssText = `position:absolute; z-index:4; left:0; right:0; bottom:8px; display:block; text-align:center; color:#f7e7c6; font:600 ${mobile ? '7px' : '8px'} Arial,sans-serif; letter-spacing:.08em; pointer-events:none;`;

      const leaf = document.createElement('span');
      leaf.className = 'door-leaf';
      leaf.setAttribute('aria-hidden','true');
      leaf.style.cssText = 'position:absolute; z-index:2; inset:5px; display:block; border:1px solid #dfc58a88; pointer-events:none; background:repeating-linear-gradient(45deg,#9b2937 0 12px,#862331 12px 24px);';

      button.append(number, label, leaf);
      button.addEventListener('click', () => {
        if (!isAvailable) { toast(`Questa porticina si aprirà il ${day} dicembre.`); return; }
        openDay(day);
      });
      grid.appendChild(button);
    });

    if (mobile && grid.children.length === 25) grid.children[24].style.gridColumn = '2';
    $('today-date').textContent = formatToday(date);
    updateProgress(unlocked);
    scheduleMidnightRefresh();
  }
  function openDay(day) {
    const unlocked = availableDay();
    if (day > unlocked || day < 1 || day > TOTAL_DAYS) {
      toast(`Questa porticina si aprirà il ${day} dicembre.`);
      return;
    }
    if (!readDays.includes(day)) { readDays.push(day); readDays.sort((a,b) => a-b); saveProgress(); }
    const door = $('door-grid').children[day - 1];
    if (door) {
      door.classList.add('opened');
      const label = door.querySelector('.door-label');
      if (label) label.textContent = 'LETTO';
    }
    window.AdventModal.show(day, content[day - 1]);
  }
  function updateProgress(unlocked) {
    $('progress-count').textContent = `${unlocked} / ${TOTAL_DAYS}`;
    $('progress-bar').style.width = `${unlocked / TOTAL_DAYS * 100}%`;
    $('progress-track').setAttribute('aria-valuenow', String(unlocked));
    $('progress-message').textContent = unlocked === 0
      ? 'Il cammino comincerà il 1° dicembre.'
      : unlocked === TOTAL_DAYS
        ? 'Tutte le porticine sono disponibili. Buon Natale!'
        : `${unlocked} ${unlocked === 1 ? 'porticina è' : 'porticine sono'} disponibili: torna ogni giorno per continuare il cammino.`;
  }
  function scheduleMidnightRefresh() {
    clearTimeout(refreshTimer);
    // Ricontrolla periodicamente: il cambio di giorno segue Europe/Rome anche se
    // il telefono o il computer è impostato su un altro fuso orario.
    refreshTimer = setTimeout(render, 30 * 1000);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  window.addEventListener('focus', render);
  window.addEventListener('storage', event => { if (event.key === settings.storageKey) { readDays = readProgress(); render(); } });
  window.AdventCalendar = { availableDay, refresh: render };
  if (content.length !== TOTAL_DAYS) console.error(`Il calendario richiede ${TOTAL_DAYS} contenuti: trovati ${content.length}.`);
  render();
})()