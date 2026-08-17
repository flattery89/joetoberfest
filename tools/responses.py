#!/usr/bin/env python3
"""Dump the Joetoberfest RSVP responses so they can be reviewed.

Reads the linked Google Sheet through its xlsx export, which works because
the file is link-shared. There is no Sheets API access here, so this is
read-only by design — approvals are written to assets/dishes.json instead
of back into the sheet.

    python3 tools/responses.py            # dishes not yet on the site
    python3 tools/responses.py --all      # every response
    python3 tools/responses.py --counts   # headcount summary

Only prints the dish answer and who said it. The "Anything else?" free-text
column is deliberately never printed — it isn't needed to judge a dish.
"""

import argparse
import json
import os
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from io import BytesIO

SHEET_ID = "1xCyRaxzAA58tcbc6NkKQSDW1oKEj3JpYEQbfVC5IcL4"
RESPONSES_TAB = "Form Responses 1"
GUESTS_TAB = "Sheet1"
DISHES_JSON = os.path.join(os.path.dirname(__file__), "..", "assets", "dishes.json")

NS = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def load_workbook():
    url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=xlsx"
    with urllib.request.urlopen(url, timeout=30) as resp:
        return zipfile.ZipFile(BytesIO(resp.read()))


def rows(z, tab):
    """Yield each row of `tab` as {column_letter: value}."""
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = {
        r.get("Id"): r.get("Target")
        for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    }

    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")):
            shared.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))

    for sheet in wb.find("m:sheets", NS):
        if sheet.get("name") != tab:
            continue
        target = rels[sheet.get("{%s}id" % NS["r"])].lstrip("/")
        path = "xl/" + target.replace("xl/", "")
        for row in ET.fromstring(z.read(path)).find("m:sheetData", NS):
            out = {}
            for c in row:
                col = "".join(ch for ch in c.get("r") if ch.isalpha())
                v = c.find("m:v", NS)
                if v is not None:
                    out[col] = shared[int(v.text)] if c.get("t") == "s" else v.text
            if out:
                yield out
        return

    sys.exit(f"Tab {tab!r} not found — was it renamed?")


def normalise(text):
    """Loose key for dedupe: 'German Potato Salad' == 'german potato salad!'."""
    return re.sub(r"[^a-z0-9]+", " ", (text or "").lower()).strip()


def published():
    try:
        with open(DISHES_JSON) as fh:
            return {normalise(d["dish"]) for d in json.load(fh)["dishes"]}
    except (OSError, ValueError, KeyError):
        return set()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true", help="include already-published dishes")
    ap.add_argument("--counts", action="store_true", help="headcount summary only")
    args = ap.parse_args()

    z = load_workbook()
    # Skip the header, and skip rows that only exist because the checkbox
    # column was pre-filled down the sheet — a real response has a timestamp.
    responses = [r for r in list(rows(z, RESPONSES_TAB))[1:] if (r.get("A") or "").strip()]

    if args.counts:
        coming = [r for r in responses if (r.get("C") or "").strip().lower() == "yes"]
        adults = sum(float(r.get("D") or 0) for r in coming)
        kids = sum(float(r.get("E") or 0) for r in coming)
        print(f"responses: {len(responses)}")
        print(f"coming:    {len(coming)} households")
        print(f"headcount: {adults:.0f} adults + {kids:.0f} kids = {adults + kids:.0f}")
        return

    seen = set() if args.all else published()
    pending = []
    for r in responses:
        dish = (r.get("F") or "").strip()
        if dish and normalise(dish) not in seen:
            pending.append((dish, (r.get("B") or "").strip()))

    if not pending:
        print("No new dish answers to review.")
        return

    print(f"{len(pending)} dish answer(s) to review:\n")
    for dish, who in pending:
        print(f"  dish: {dish}")
        print(f"  from: {who}\n")


if __name__ == "__main__":
    main()
