import store, { mode } from './store.js';
import { TEACHER_NAME, ROOM_NAME } from './config.js';

const $ = s => document.querySelector(s);
const ID = 'helpdesk-my-request', ME = 'helpdesk-me';

$('#room').textContent = ROOM_NAME;
document.title = `Request help | ${ROOM_NAME}`;
if (mode === 'demo') $('#demo').hidden = false;

try { $('#name').value = JSON.parse(localStorage.getItem(ME) || '{}').name || ''; } catch {}

let myId = localStorage.getItem(ID);
let mine = null, all = [], settings = { open: true }, unsub = null;

store.onConnection(ok => {
  const c = $('#conn'); c.classList.toggle('off', !ok); c.textContent = ok ? 'Connected' : 'Connecting…';
});
store.onSettings(s => { settings = s; render(); });
store.onRequests(list => { all = list; render(); });
if (myId) watch(myId);

function watch(id) {
  if (unsub) unsub();
  unsub = store.onRequest(id, r => {
    if (!r || r.status === 'cancelled') forget();
    else mine = r;
    render();
  });
}
function forget() {
  localStorage.removeItem(ID);
  myId = null; mine = null;
  if (unsub) { const u = unsub; unsub = null; u(); }
}

function show(v) { ['form', 'closed', 'ticket'].forEach(k => { $('#v-' + k).hidden = k !== v; }); }

function render() {
  if (myId && !mine) return show(null);         // still loading my request
  if (!mine) return show(settings.open ? 'form' : 'closed');

  show('ticket');
  $('#t-num').textContent = mine.ticket;
  const t = $('#ticket');
  t.classList.toggle('is-coming', mine.status === 'coming');
  t.classList.toggle('is-done', mine.status === 'done');
  const done = mine.status === 'done';
  $('#cancel').hidden = done;
  $('#again').hidden = !done;

  let status, detail;
  if (mine.status === 'coming') {
    status = `${TEACHER_NAME} is on the way`;
    detail = 'Hang tight.';
  } else if (done) {
    status = 'All set';
    detail = 'Your request was marked as resolved. Still stuck? Send a new one.';
  } else {
    const ahead = all.filter(r => r.status === 'waiting' && r.ticket < mine.ticket).length;
    status = ahead === 0 ? 'You’re next' : ahead === 1 ? '1 person ahead of you' : `${ahead} people ahead of you`;
    detail = ahead === 0 ? 'Your teacher will be over soon.' : 'Keep working on anything you can while you wait.';
  }
  $('#t-status').textContent = status;
  $('#t-detail').textContent = detail;
  document.title = `#${mine.ticket} ${status}`;
}

const err = m => { $('#err').textContent = m; };

$('#f').addEventListener('submit', async e => {
  e.preventDefault();
  err('');
  const name = $('#name').value.trim();
  if (!name) { err('Type your name first.'); return $('#name').focus(); }
  localStorage.setItem(ME, JSON.stringify({ name }));
  const btn = $('#send'); btn.disabled = true; btn.textContent = 'Sending…';
  try {
    const id = await store.create({ name });
    myId = id; localStorage.setItem(ID, id);
    watch(id);
  } catch (x) {
    console.error(x);
    err('Your request didn’t send. Check that you’re online, then try again.');
  } finally {
    btn.disabled = false; btn.textContent = 'Request help';
  }
});

$('#cancel').addEventListener('click', async () => {
  if (!mine) return;
  const id = mine.id;
  forget(); render();
  try { await store.update(id, { status: 'cancelled' }); } catch (x) { console.error(x); }
});
$('#again').addEventListener('click', () => { forget(); render(); });
