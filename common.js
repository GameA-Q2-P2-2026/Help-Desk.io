// Shared helpers. Requests travel through ntfy.sh, a free public message relay
// that needs no account. Students only send; the teacher page listens.
(function () {
  const C = window.HELPDESK || {};

  // Stable, hard-to-guess channel name made from this site's address
  function hash(str) {
    let a = 0x811c9dc5, b = 0x9747b28c;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      a = Math.imul(a ^ c, 16777619);
      b = Math.imul(b ^ c, 2246822519) ^ (b >>> 13);
    }
    return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
  }
  const siteBase = (location.origin + location.pathname.replace(/[^/]*$/, '')).toLowerCase();
  const custom = String(C.CHANNEL || '').trim().replace(/[^A-Za-z0-9_-]/g, '');
  const topic = custom || 'helpdesk-' + hash(siteBase);
  const server = 'https://ntfy.sh';

  async function send(obj) {
    const res = await fetch(`${server}/${topic}`, { method: 'POST', body: JSON.stringify(obj) });
    if (res.status === 429) throw new Error('busy');
    if (!res.ok) throw new Error('send failed ' + res.status);
  }

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  window.HD = { C, topic, server, send, esc, newId, $: s => document.querySelector(s) };
})();
