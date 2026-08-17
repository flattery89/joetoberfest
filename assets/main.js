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

/* ─────────── Go ─────────── */

document.addEventListener('DOMContentLoaded', () => {
  initCountdown();
  initRsvp();
  initMap();
});
