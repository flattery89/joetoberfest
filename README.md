# Joetoberfest

The party site. One page, no build step, hosted on GitHub Pages.

**Live:** https://flattery89.github.io/joetoberfest/

## Where things live

| What | File |
|---|---|
| All the words | `index.html` |
| The look | `assets/styles.css` |
| Countdown, map, RSVP wiring | `assets/main.js` |
| Artwork | `assets/img/` |

Artwork is compressed WebP (the whole set is under 1 MB). Sources live in
`~/Downloads` and `~/Desktop/invite.png`; regenerate with `magick … | cwebp`.
`og.jpg` is the social-share preview — kept as JPEG because some link
scrapers still don't read WebP.

Every party fact that appears in more than one place — the street address, the
RSVP form link — is set once at the top of `assets/main.js` in the `PARTY`
object. The countdown target date is the `data-target` attribute on the
countdown element in `index.html`.

## Still to fill in

- **Google Form RSVP URL** — set `rsvpUrl` in `assets/main.js`. Until it's
  set, the RSVP button opens a pre-filled email to Joe instead.

## Running it locally

```
python3 -m http.server 8765
```

Then open http://localhost:8765
