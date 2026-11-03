import store, { mode } from './store.js';
import { TEACHER_PIN, ROOM_NAME } from './config.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const AUTH = 'helpdesk-teacher';
const LONG_WAIT = 5 * 60; // seconds before a wait time turns red

$('#room').textContent = ROOM_NAME;
if (mode === 'demo') $('#demo').hidden = false;

if (sessionStorage.getItem(AUTH) === TEACHER_PIN) start();
else { $('#gate').hidden = false; $('#pin').focus(); }

$('#gate-form').addEventListener('submit', e => {
  e.preventDefault();
  if ($('#pin').value === TEACHER_PIN) {
    sessionStorage.setItem(AUTH, TEACHER_PIN);
    $('#gate').hidden = true; start();
  } else {
    $('#gate-err').textContent = 'That PIN doesn’t match the one in config.js.';
    $('#pin').select();
  }
});

let seen = null, current = [], settings = { open: true }, ctx = null, started = false;

function start() {
  if (started) return; started = true;
  $('#app').hidden = false;
  const url = location.href.replace(/teacher\.html.*$/, '');
  $('#sub').innerHTML = `Students open <a href="${esc(url)}" target="_blank">${esc(url)}</a>`;

  store.onConnection(ok => {
    const c = $('#conn'); c.classList.toggle('off', !ok); c.textContent = ok ? 'Live' : 'Reconnecting…';
  });
  store.onSettings(s => {
    settings = s;
    const b = $('#open');
    b.setAttribute('aria-pressed', String(!!s.open));
    b.textContent = s.open ? 'Accepting requests' : 'Requests paused';
  });
  store.onRequests(list => {
    const fresh = seen ? list.filter(r => !seen.has(r.id) && r.status === 'waiting') : [];
    seen = new Set(list.map(r => r.id));
    current = list;
    render(new Set(fresh.map(r => r.id)));
    fresh.forEach(notify);
  });
  setInterval(tick, 1000);
}

const isActive = r => r.status === 'waiting' || r.status === 'coming';
const isFinished = r => r.status === 'done' || r.status === 'cancelled';

function render(freshIds = new Set()) {
  const active = current.filter(isActive);
  const finished = current.filter(isFinished);
  const waiting = active.filter(r => r.status === 'waiting').length;

  $('#count').textContent = waiting === 0 ? 'No one waiting' : waiting === 1 ? '1 waiting' : `${waiting} waiting`;
  document.title = waiting ? `(${waiting}) Help queue` : 'Help queue';

  $('#queue').innerHTML = active.length
    ? active.map(r => row(r, freshIds.has(r.id), false)).join('')
    : `<li class="empty">No one needs help right now. New requests appear here with a chime.</li>`;
  $('#finished').innerHTML = finished.slice().reverse().map(r => row(r, false, true)).join('');
  $('#finished-sum').textContent = `Finished (${finished.length})`;
  tick();
}

function row(r, fresh, finished) {
  const side = finished
    ? `<span class="meta">${r.status === 'done' ? 'Resolved' : 'Student fixed it'}</span>`
    : `<span class="wait" data-t="${Number(r.createdAt) || Date.now()}"></span>
       <div class="btns">
         ${r.status === 'waiting'
           ? `<button class="sm btn-go" data-act="coming" data-id="${esc(r.id)}">On my way</button>`
           : `<button class="sm secondary" data-act="waiting" data-id="${esc(r.id)}">Undo</button>`}
         <button class="sm btn-ok" data-act="done" data-id="${esc(r.id)}">Done</button>
       </div>`;
  return `<li class="req ${esc(r.status)}${fresh ? ' fresh' : ''}">
    <div class="ticket stub"><span class="t-num">${esc(r.ticket)}</span></div>
    <div class="who">
      <strong>${esc(r.name)}</strong>
    </div>
    <div class="side">${side}</div>
  </li>`;
}

function tick() {
  document.querySelectorAll('.wait[data-t]').forEach(el => {
    const s = Math.max(0, Math.floor((Date.now() - Number(el.dataset.t)) / 1000));
    const m = Math.floor(s / 60), ss = String(s % 60).padStart(2, '0');
    el.innerHTML = `<small>waiting</small>${m}:${ss}`;
    el.classList.toggle('long', s >= LONG_WAIT);
  });
}

// Buttons on each request
['#queue', '#finished'].forEach(sel => $(sel).addEventListener('click', e => {
  const b = e.target.closest('button[data-act]');
  if (b) store.update(b.dataset.id, { status: b.dataset.act }).catch(console.error);
}));

$('#open').addEventListener('click', () => store.setSettings({ open: !settings.open }));
$('#clear').addEventListener('click', () => store.clearFinished(current.filter(isFinished)));
$('#reset').addEventListener('click', () => {
  if (confirm('Start a new class? This clears every request and starts numbers back at 1.')) store.resetDay();
});

// Alerts: browsers only allow sound after a click, so this button unlocks it.
$('#alerts').addEventListener('click', async () => {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    await ctx.resume();
    chime();
  } catch {}
  if ('Notification' in window && Notification.permission === 'default') {
    try { await Notification.requestPermission(); } catch {}
  }
  const b = $('#alerts');
  b.classList.remove('needs');
  b.setAttribute('aria-pressed', 'true');
  b.textContent = 'Notification' in window && Notification.permission === 'granted' ? 'Sound and pop-ups on' : 'Sound on';
});

function chime() {
  if (!ctx) return;
  const t = ctx.currentTime;
  [[880, 0], [1318.5, 0.18]].forEach(([f, d]) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t + d);
    g.gain.exponentialRampToValueAtTime(0.3, t + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.6);
    o.connect(g).connect(ctx.destination);
    o.start(t + d); o.stop(t + d + 0.65);
  });
}

function notify(r) {
  chime();
  if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
    try {
      const n = new Notification(`${r.name} needs help`, { body: `Ticket #${r.ticket}`, tag: r.id });
      n.onclick = () => { window.focus(); n.close(); };
    } catch {}
  }
}
