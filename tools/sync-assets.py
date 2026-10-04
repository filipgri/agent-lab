#!/usr/bin/env python3
"""
sync-assets.py - builds assets/manifest.json from asset-guide.md
================================================================
v2 spec §5.0: "Build the manifest from the tables in asset-guide.md. When Filip
says 'sync the asset list', rebuild it from the guide. The guide is the source,
so never edit both by hand."

This is that rebuild. It reads the markdown tables in asset-guide.md and writes
assets/manifest.json. Run it with:

    python3 tools/sync-assets.py

Standard library only, like every tool here. It runs on Filip's computer; the
app never loads anything from tools/.
"""

import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GUIDE = os.path.join(ROOT, "asset-guide.md")
OUT = os.path.join(ROOT, "assets", "manifest.json")


def rows_under(heading_fragment, text):
    """Return the rows of the first markdown table after a heading."""
    at = text.find(heading_fragment)
    if at == -1:
        return []
    chunk = text[at:]
    out = []
    started = False
    for line in chunk.splitlines():
        line = line.strip()
        if line.startswith("|"):
            cells = [c.strip() for c in line.strip("|").split("|")]
            # Skip the header row and the |---|---| separator.
            if set("".join(cells)) <= set("-: "):
                started = True
                continue
            if not started:
                continue
            out.append(cells)
        elif started and out:
            break           # the table has ended
    return out


def main():
    text = open(GUIDE, encoding="utf-8").read()
    manifest = {"version": 1, "hq": [], "situations": [],
                "stickers": [], "narrator": [], "sfx": []}

    # --- HQ places: id | label | kind | fallback | scene ---
    for r in rows_under("### 3.1 HQ places", text):
        manifest["hq"].append({
            "id": r[0], "file": "img/hq/%s.jpg" % r[0],
            "label": r[1], "kind": r[2], "fallback": r[3], "prompt": r[4],
        })

    # --- Situation cards: id | label | fallback | scene ---
    for r in rows_under("### 3.2 Situation cards", text):
        manifest["situations"].append({
            "id": r[0], "file": "img/situations/%s.jpg" % r[0],
            "label": r[1], "fallback": r[2], "prompt": r[3],
        })

    # --- Special stickers: id | label | tab | fallback | keywords | new | object ---
    for r in rows_under("### 3.3 Special stickers", text):
        manifest["stickers"].append({
            "id": r[0], "file": "img/stickers/%s.png" % r[0],
            "label": r[1], "tab": r[2], "fallback": r[3],
            "keywords": [k.strip() for k in r[4].split(",") if k.strip()],
            "isNew": bool(r[5].strip()), "prompt": r[6],
        })

    # --- Narrator lines. Three tables use "id | plays when | text" and three
    #     use "id | text", so the number of columns tells us which. ---
    seen = set()
    for heading in ("**Session 2: instructions", "**Session 2: card labels",
                    "**Session 3: force field", "**Session 4: rules"):
        for r in rows_under(heading, text):
            nid = r[0]
            line = r[2] if len(r) >= 3 else r[1]
            if nid in seen:
                continue
            seen.add(nid)
            manifest["narrator"].append({
                "id": nid, "file": "audio/narrator/%s.mp3" % nid, "text": line,
            })

    # --- Sound effects: id | plays when | prompt | seconds | stand-in | tier ---
    for r in rows_under("### 4.6 Sound effects", text):
        manifest["sfx"].append({
            "id": r[0], "file": "audio/sfx/%s.mp3" % r[0],
            "fallback": r[4], "prompt": r[2], "seconds": r[3], "tier": r[5],
        })

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print("wrote assets/manifest.json")
    for key in ("hq", "situations", "stickers", "narrator", "sfx"):
        print("  %-11s %d" % (key, len(manifest[key])))


if __name__ == "__main__":
    main()
