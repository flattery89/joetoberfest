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

- **Approved-dish sheet URL** — set `dishBoardCsv` in `assets/main.js` to the
  *Publish to web* CSV link for the curated dish tab. Until it's set, the
  page shows the hand-written fallback list in `index.html`.

## The dish board

The "already claimed" list reads a Google Sheet at page load.

It deliberately does **not** read the raw form responses — that tab holds
guests' names and free-text notes, and publishing it would put all of it on a
public page. It reads a separate tab containing only approved entries:
column A the dish, column B who (optional).

Two constraints worth knowing before changing this:

1. It must be a **Publish to web** link. The ordinary `/export?format=csv`
   share link 307-redirects to a host that sends no `Access-Control-Allow-Origin`
   header, so the browser blocks it. Published sheets serve CSV with `*`.
2. Google caches published sheets for a few minutes, so edits take a little
   while to appear. That's Google's cache, not ours.

Every failure — network down, sheet unpublished, nothing approved yet —
leaves the fallback list in place rather than emptying the section. Entries
render via `textContent`, so submitted text can never inject markup.

## Running it locally

```
python3 -m http.server 8765
```

Then open http://localhost:8765
