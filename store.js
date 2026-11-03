// Shared data layer. Uses Firebase when config.js is filled in,
// otherwise a demo store that syncs between tabs on one computer.
import { firebaseConfig } from './config.js';

const configured = !!(firebaseConfig && firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.startsWith('PASTE') && firebaseConfig.databaseURL);
export const mode = configured ? 'live' : 'demo';

const toList = obj => Object.entries(obj || {})
  .map(([id, v]) => ({ id, ...v }))
  .sort((a, b) => (a.ticket || 0) - (b.ticket || 0));

async function firebaseStore() {
  const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const { initializeApp } = await import(base + 'firebase-app.js');
  const db = await import(base + 'firebase-database.js');
  const d = db.getDatabase(initializeApp(firebaseConfig));
  const R = p => db.ref(d, p);
  return {
    onRequests: cb => db.onValue(R('requests'), s => cb(toList(s.val()))),
    onRequest: (id, cb) => db.onValue(R('requests/' + id), s => cb(s.exists() ? { id, ...s.val() } : null)),
    onSettings: cb => db.onValue(R('settings'), s => cb({ open: true, ...(s.val() || {}) })),
    onConnection: cb => db.onValue(R('.info/connected'), s => cb(!!s.val())),
    async create(data) {
      const t = await db.runTransaction(R('counter'), n => (n || 0) + 1);
      const r = db.push(R('requests'));
      await db.set(r, { ...data, ticket: t.snapshot.val(), status: 'waiting',
        createdAt: db.serverTimestamp(), updatedAt: db.serverTimestamp() });
      return r.key;
    },
    update: (id, patch) => db.update(R('requests/' + id), { ...patch, updatedAt: db.serverTimestamp() }),
    clearFinished(list) {
      const u = {}; list.forEach(x => { u['requests/' + x.id] = null; });
      return db.update(db.ref(d), u);
    },
    resetDay: () => db.update(db.ref(d), { requests: null, counter: 0 }),
    setSettings: p => db.update(R('settings'), p)
  };
}

function localStore() {
  const KEY = 'helpdesk-demo';
  const listeners = new Set();
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const emit = () => { const s = read(); listeners.forEach(f => f(s)); };
  const write = s => { localStorage.setItem(KEY, JSON.stringify(s)); emit(); };
  window.addEventListener('storage', e => { if (e.key === KEY) emit(); });
  const sub = f => { listeners.add(f); f(read()); return () => listeners.delete(f); };
  return {
    onRequests: cb => sub(s => cb(toList(s.requests))),
    onRequest: (id, cb) => sub(s => { const r = s.requests && s.requests[id]; cb(r ? { id, ...r } : null); }),
    onSettings: cb => sub(s => cb({ open: true, ...(s.settings || {}) })),
    onConnection: cb => { cb(true); return () => {}; },
    async create(data) {
      const s = read(); s.counter = (s.counter || 0) + 1;
      const id = 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      s.requests = { ...(s.requests || {}), [id]: { ...data, ticket: s.counter, status: 'waiting',
        createdAt: Date.now(), updatedAt: Date.now() } };
      write(s); return id;
    },
    async update(id, p) {
      const s = read();
      if (s.requests && s.requests[id]) { Object.assign(s.requests[id], p, { updatedAt: Date.now() }); write(s); }
    },
    async clearFinished(list) { const s = read(); list.forEach(x => { if (s.requests) delete s.requests[x.id]; }); write(s); },
    async resetDay() { const s = read(); s.requests = {}; s.counter = 0; write(s); },
    async setSettings(p) { const s = read(); s.settings = { ...(s.settings || {}), ...p }; write(s); }
  };
}

const store = configured ? await firebaseStore() : localStore();
export default store;
