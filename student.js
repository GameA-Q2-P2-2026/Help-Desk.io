(function () {
  const { C, send, newId, $ } = window.HD;
  const MINE = 'hd-mine', ME = 'hd-name';
  const MAX_AGE = 3 * 60 * 60 * 1000;   // forget a request after 3 hours

  $('#room').textContent = C.ROOM_NAME;
  document.title = `Request help | ${C.ROOM_NAME}`;
  $('#name').value = localStorage.getItem(ME) || '';

  let mine = null;
  try { mine = JSON.parse(localStorage.getItem(MINE)); } catch {}
  if (mine && Date.now() - mine.at > MAX_AGE) { mine = null; localStorage.removeItem(MINE); }

  function render() {
    $('#v-form').hidden = !!mine;
    $('#v-sent').hidden = !mine;
    if (mine) {
      $('#sent-title').textContent = `${C.TEACHER_NAME} got your request`;
      document.title = 'Help requested';
    } else {
      document.title = `Request help | ${C.ROOM_NAME}`;
    }
  }
  render();

  const err = m => { $('#err').textContent = m; };

  $('#f').addEventListener('submit', async e => {
    e.preventDefault();
    err('');
    const name = $('#name').value.trim().slice(0, 40);
    if (!name) { err('Type your name first.'); return $('#name').focus(); }
    localStorage.setItem(ME, name);
    const btn = $('#send'); btn.disabled = true; btn.textContent = 'Sending…';
    const rid = newId();
    try {
      await send({ t: 'help', rid, name });
      mine = { rid, name, at: Date.now() };
      localStorage.setItem(MINE, JSON.stringify(mine));
      render();
    } catch (x) {
      console.error(x);
      err(x.message === 'busy'
        ? 'The help line is busy right now. Wait a minute and try again, or raise your hand.'
        : 'Your request didn’t send. Check that you’re online, then try again, or raise your hand.');
    } finally {
      btn.disabled = false; btn.textContent = 'Request help';
    }
  });

  $('#done').addEventListener('click', async () => {
    if (!mine) return;
    const rid = mine.rid;
    mine = null; localStorage.removeItem(MINE); render();
    try { await send({ t: 'cancel', rid }); } catch (x) { console.error(x); }
  });
})();
