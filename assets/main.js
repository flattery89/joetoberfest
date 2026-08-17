/* ═══════════════════════════════════════════════════════════
   Joetoberfest — site behaviour
   All party facts live in PARTY. Change them here, nowhere else.
   ═══════════════════════════════════════════════════════════ */

const PARTY = {
  // Full street address. Leave empty until it's confirmed — the map
  // section falls back to a placeholder rather than pointing somewhere wrong.
  address: '415 Oak Hill Dr, Altamonte Springs, FL 32701',

  // Google Form RSVP link. Empty = the RSVP button falls back to email.
  // The form is also embedded directly in index.html — keep the two in sync.
  rsvpUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSdgdkmn9USxeSJN1dR_hwGkldRiHSYmPDX9Wj2nb2SxHSHEvg/viewform',

  // Where RSVPs go when there's no form yet.
  fallbackEmail: 'flattery89@gmail.com',

  // "Publish to web" CSV link for the APPROVED dish tab — not the raw form
  // responses, which contain guests' names and free-text notes.
  //
  // Must be a File > Share > Publish to web link. The ordinary share link
  // (/export?format=csv) redirects through a host that sends no CORS header,
  // so the browser refuses to read it.
  //
  // Expected columns: A = dish, B = who (optional). Empty here means the
  // page keeps the hand-written fallback list in index.html.
  dishBoardCsv: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQc2fDKK1oDVUGrJ5WVH6MxhS1irTFToS784LmUqRxP_XW6jgC4HdINgD-u5Gwumwi_4TOJY5IjOHWR/pub?gid=1787531315&single=true&output=csv',

  // Reviewed dishes committed to the repo. Merged with the sheet above, so
  // Joe's checkbox and the scheduled review both feed the same list.
  dishBoardJson: 'assets/dishes.json',

  // Longest dish text we'll render, so one joker can't blow up the layout.
  maxDishLength: 90,
};

/* ─────────── Countdown ─────────── */

function initCountdown() {
  const el = document.getElementById('countdown');
  const done = document.getElementById('countdownDone');
  if (!el) return;

  const target = new Date(el.dataset.target);
  if (Number.isNaN(target.getTime())) return;

  const fields = {
    days:  el.querySelector('[data-cd="days"]'),
    hours: el.querySelector('[data-cd="hours"]'),
    mins:  el.querySelector('[data-cd="mins"]'),
    secs:  el.querySelector('[data-cd="secs"]'),
  };

  const pad = (n) => String(n).padStart(2, '0');

  function tick() {
    const remaining = target.getTime() - Date.now();

    if (remaining <= 0) {
      el.hidden = true;
      if (done) done.hidden = false;
      clearInterval(timer);
      return;
    }

    const secs = Math.floor(remaining / 1000);
    fields.days.textContent  = Math.floor(secs / 86400);
    fields.hours.textContent = pad(Math.floor(secs / 3600) % 24);
    fields.mins.textContent  = pad(Math.floor(secs / 60) % 60);
    fields.secs.textContent  = pad(secs % 60);
  }

  tick();
  const timer = setInterval(tick, 1000);
}

/* ─────────── RSVP button ─────────── */

function initRsvp() {
  const btn = document.getElementById('rsvpBtn');
  if (!btn) return;

  if (PARTY.rsvpUrl) {
    btn.href = PARTY.rsvpUrl;
    return;
  }

  const subject = encodeURIComponent("Joetoberfest — count me in");
  const body = encodeURIComponent(
    "We're coming!\n\n" +
    "Name(s):\n" +
    "How many adults:\n" +
    "How many kids:\n" +
    "Bringing a side or dessert (optional):\n"
  );
  btn.href = `mailto:${PARTY.fallbackEmail}?subject=${subject}&body=${body}`;
  btn.removeAttribute('target');
}

/* ─────────── Map ─────────── */

function initMap() {
  if (!PARTY.address) return;

  const holder = document.getElementById('mapHolder');
  const link = document.getElementById('mapsLink');
  const q = encodeURIComponent(PARTY.address);

  if (holder) {
    holder.innerHTML = '';
    const frame = document.createElement('iframe');
    frame.src = `https://www.google.com/maps?q=${q}&output=embed`;
    frame.title = 'Map to Joetoberfest';
    frame.loading = 'lazy';
    frame.referrerPolicy = 'no-referrer-when-downgrade';
    frame.allowFullscreen = true;
    holder.appendChild(frame);
  }

  if (link) {
    link.href = `https://www.google.com/maps/search/?api=1&query=${q}`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.hidden = false;
  }
}

/* ─────────── Live dish board ───────────
   Reads the approved-dish sheet and lists what people are bringing.
   Every failure path leaves the fallback list in index.html untouched —
   a stale list beats an empty one.                                      */

// Minimal RFC-4180 parser: handles quoted fields containing commas,
// newlines, and escaped ("") quotes, which a naive split(',') mangles.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
      continue;
    }

    if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += c;
  }

  row.push(field);
  if (row.some((f) => f !== '')) rows.push(row);
  return rows;
}

// Loose key so "German Potato Salad" and "german potato salad!" collapse
// into one entry when the two sources overlap.
function dishKey(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

// Google caches published sheets for a few minutes anyway; a per-minute
// token stops the browser stacking its own cache on top of that.
function fetchSheetDishes() {
  if (!PARTY.dishBoardCsv) return Promise.resolve([]);

  const sep = PARTY.dishBoardCsv.includes('?') ? '&' : '?';
  const url = `${PARTY.dishBoardCsv}${sep}cb=${Math.floor(Date.now() / 60000)}`;

  return withTimeout(fetch(url, { cache: 'no-store' }), 8000)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then((text) => parseCsv(text)
      .map((r) => ({ dish: (r[0] || '').trim(), who: (r[1] || '').trim() }))
      // Drop blanks and the header row.
      .filter((it) => it.dish && !/^(dish|what|item)$/i.test(it.dish)))
    .catch(() => []);
}

function fetchReviewedDishes() {
  if (!PARTY.dishBoardJson) return Promise.resolve([]);

  return withTimeout(fetch(PARTY.dishBoardJson, { cache: 'no-store' }), 8000)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => (data.dishes || [])
      .map((d) => ({ dish: (d.dish || '').trim(), who: (d.who || '').trim() }))
      .filter((it) => it.dish))
    .catch(() => []);
}

function initDishBoard() {
  const list = document.getElementById('dishList');
  const lede = document.getElementById('dishLede');
  if (!list) return;

  // Both sources, independently. Either failing just contributes nothing.
  Promise.all([fetchReviewedDishes(), fetchSheetDishes()])
    .then(([reviewed, fromSheet]) => {
      const seen = new Set();
      const items = [];

      reviewed.concat(fromSheet).forEach((it) => {
        const key = dishKey(it.dish);
        if (!key || seen.has(key)) return;
        seen.add(key);
        items.push(it);
      });

      if (!items.length) return;   // nothing approved yet — keep the fallback

      list.textContent = '';
      items.forEach((it) => {
        const li = document.createElement('li');
        const dish = it.dish.length > PARTY.maxDishLength
          ? it.dish.slice(0, PARTY.maxDishLength) + '…'
          : it.dish;

        // textContent, never innerHTML — this is guest-submitted text.
        li.textContent = it.who ? `${dish} — ${it.who}` : dish;
        list.appendChild(li);
      });

      if (lede) lede.textContent = `Already claimed (${items.length}):`;
    })
    .catch(() => { /* keep whatever is already on the page */ });
}

/* ─────────── Go ─────────── */

document.addEventListener('DOMContentLoaded', () => {
  initCountdown();
  initRsvp();
  initMap();
  initDishBoard();
});
