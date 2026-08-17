# Joetoberfest

The party site. One page, no build step, hosted on GitHub Pages.

**Live:** https://flattery89.github.io/joetoberfest/

## Where things live

| What | File |
|---|---|
| All the words | `index.html` |
| The look | `assets/styles.css` |
| Countdown, map, RSVP wiring | `assets/main.js` |

Every party fact that appears in more than one place — the street address, the
RSVP form link — is set once at the top of `assets/main.js` in the `PARTY`
object. The countdown target date is the `data-target` attribute on the
countdown element in `index.html`.

## Still to fill in

- Real date and time (currently placeholder: Sat Oct 3, 2026, 4:00 PM)
- Street address — unlocks the embedded map and the "Open in Maps" button
- Google Form RSVP URL — until it's set, the RSVP button opens a pre-filled email

## Running it locally

```
python3 -m http.server 8765
```

Then open http://localhost:8765
