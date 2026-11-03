(function () {
  const { C, topic, server, esc, $ } = window.HD;
  const AUTH = 'hd-teacher', LS_STATUS = 'hd-status', LS_CUTOFF = 'hd-cutoff';
  const LONG_WAIT = 5 * 60;          // seconds before a wait time turns red
  const pageLoaded = Date.now();

  $('#room').textContent = C.ROOM_NAME;

  $('#gate-form').addEventListener('submit', e => {
    e.preventDefault();
    if ($('#pin').value === C.TEACHER_PIN) {
      sessionStorage.setItem(AUTH, C.TEACHER_PIN);
      $('#gate').hidden = true; start();
    } else {
      $('#gate-err').textContent = 'That PIN doesn’t match the one in config.js.';
      $('#pin').select();
    }
  });

  // Requests come from messages; "done" is tracked here on the teacher's computer.
  let cutoff = Number(localStorage.getItem(LS_CUTOFF)) || 0;     // unix seconds; "Start new class"
  let status = {}; try { status = JSON.parse(localStorage.getItem(LS_STATUS)) || {}; } catch {}
  let reqs = new Map(), counter = 0, ctx = null, es = null, started = false;
  const seenMsg = new Set();
  const saveStatus = () => localStorage.setItem(LS_STATUS, JSON.stringify(status));

  function start() {
    if (started) return; started = true;
    $('#app').hidden = false;
    const url = location.href.replace(/teacher\.html.*$/, '');
    $('#sub').innerHTML = `Students open <a href="${esc(url)}" target="_blank">${esc(url)}</a>`;
    $('#channel').textContent = topic;
    connect();
    render();
    setInterval(tick, 1000);
  }

  function connect() {
    if (es) es.close();
    // Replays the last 12 hours (ntfy.sh keeps messages that long), then stays open for new ones
    const since = Math.max(cutoff, Math.floor(Date.now() / 1000) - 12 * 3600);
    es = new EventSource(`${server}/${topic}/sse?since=${since}`);
    es.onopen = () => setConn(true);
    es.onerror = () => setConn(false);   // EventSource reconnects by itself
    es.onmessage = e => { try { handle(JSON.parse(e.data)); } catch {} };
  }
  let connTimer = null;
  function setConn(ok) {
    const c = $('#conn');
    clearTimeout(connTimer);
    if (ok) { c.classList.remove('off'); c.textContent = 'Live'; return; }
    // Only warn if the connection stays down for a few seconds
    connTimer = setTimeout(() => {
      c.classList.add('off');
      c.textContent = 'Can’t reach ntfy.sh. Reconnecting…';
    }, 6000);
  }

  function handle(m) {
    if (!m || (m.event && m.event !== 'message') || seenMsg.has(m.id)) return;
    seenMsg.add(m.id);
    if (m.time < cutoff) return;
    let d; try { d = JSON.parse(m.message); } catch { return; }
    if (!d || typeof d.rid !== 'string') return;
    if (d.t === 'help' && !reqs.has(d.rid)) {
      const r = { rid: d.rid, name: String(d.name || 'Student').slice(0, 40), time: m.time, ticket: ++counter, cancelled: false };
      reqs.set(d.rid, r);
      render(r.rid);
      if (m.time * 1000 > pageLoaded - 5000 && !status[r.rid]) notify(r);   // don't chime for old history
    } else if (d.t === 'cancel' && reqs.has(d.rid)) {
      reqs.get(d.rid).cancelled = true;
      render();
    }
  }

  const list = () => [...reqs.values()].filter(r => status[r.rid] !== 'cleared');
  const isActive = r => !r.cancelled && status[r.rid] !== 'done';

  function render(freshId) {
    const all = list();
    const active = all.filter(isActive);
    const finished = all.filter(r => !isActive(r));
    const n = active.length;
    $('#count').textContent = n === 0 ? 'No one waiting' : n === 1 ? '1 waiting' : `${n} waiting`;
    document.title = n ? `(${n}) Help queue` : 'Help queue';

    $('#queue').innerHTML = n
      ? active.map(r => row(r, r.rid === freshId, false)).join('')
      : `<li class="empty">No one needs help right now. New requests appear here with a chime.</li>`;
    $('#finished').innerHTML = finished.slice().reverse().map(r => row(r, false, true)).join('');
    $('#finished-sum').textContent = `Finished (${finished.length})`;
    tick();
  }

  function row(r, fresh, finished) {
    const side = finished
      ? `<span class="meta">${r.cancelled && status[r.rid] !== 'done' ? 'Student said they’re all set' : 'Done'}</span>`
      : `<span class="wait" data-t="${r.time * 1000}"></span>
         <div class="btns"><button class="sm btn-ok" data-act="done" data-id="${esc(r.rid)}">Done</button></div>`;
    return `<li class="req${fresh ? ' fresh' : ''}">
      <div class="ticket stub"><span class="t-num">${r.ticket}</span></div>
      <div class="who"><strong>${esc(r.name)}</strong></div>
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

  $('#queue').addEventListener('click', e => {
    const b = e.target.closest('button[data-act="done"]');
    if (!b) return;
    status[b.dataset.id] = 'done'; saveStatus(); render();
  });
  $('#clear').addEventListener('click', () => {
    list().filter(r => !isActive(r)).forEach(r => { status[r.rid] = 'cleared'; });
    saveStatus(); render();
  });
  $('#reset').addEventListener('click', () => {
    if (!confirm('Start a new class? This clears the list and starts numbers back at 1.')) return;
    cutoff = Math.floor(Date.now() / 1000);
    localStorage.setItem(LS_CUTOFF, String(cutoff));
    status = {}; saveStatus();
    reqs = new Map(); counter = 0;
    render();
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
        const n = new Notification(`${r.name} needs help`, { body: `#${r.ticket} in the help queue`, tag: r.rid });
        n.onclick = () => { window.focus(); n.close(); };
      } catch {}
    }
  }

  if (sessionStorage.getItem(AUTH) === C.TEACHER_PIN) start();
  else { $('#gate').hidden = false; $('#pin').focus(); }
})();
