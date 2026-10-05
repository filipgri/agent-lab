#!/usr/bin/env python3
"""
bring-in-assets.py - files from assets/incoming/ into their proper places
========================================================================
v2 spec §5.0, "Bring in the new assets". Filip drops downloads into
assets/incoming/ with roughly the right names; this matches them to manifest
ids, converts them, and moves them in.

    python3 tools/bring-in-assets.py            # do it
    python3 tools/bring-in-assets.py --dry-run  # just say what would happen

Conversions (v2 §5.0):
  HQ and situation images -> JPEG, longest side 1024, quality ~80
  stickers                -> PNG, longest side 512, transparency kept

It uses `sips`, which is built into macOS. If sips is missing it says so and
leaves the file alone rather than shipping something the wrong size.

What it will NOT do: guess. A file it cannot match confidently is listed for
Filip to rename, because quietly filing a picture under the wrong id is worse
than leaving it in the inbox.
"""

import json
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ASSETS = os.path.join(ROOT, "assets")
INCOMING = os.path.join(ASSETS, "incoming")
MANIFEST = os.path.join(ASSETS, "manifest.json")

DRY = "--dry-run" in sys.argv


def normalise(name):
    """'Hq Classroom (1).PNG' -> 'hqclassroom'  so near-misses still match."""
    stem = os.path.splitext(os.path.basename(name))[0].lower()
    stem = re.sub(r"\(\d+\)", "", stem)          # a (1) from a second download
    stem = re.sub(r"[^a-z0-9]", "", stem)
    return stem


def have_sips():
    return shutil.which("sips") is not None


def convert(src, dest, kind):
    """Resize and re-encode with sips. Returns True if the file is in place."""
    if DRY:
        return True
    os.makedirs(os.path.dirname(dest), exist_ok=True)

    if not have_sips():
        print("    ⚠️  sips not found. Copying as-is - resize it at squoosh.app")
        shutil.copy2(src, dest)
        return True

    if kind == "sticker":
        cmd = ["sips", "-s", "format", "png", "-Z", "512", src, "--out", dest]
    else:
        cmd = ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "80",
               "-Z", "1024", src, "--out", dest]
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode != 0:
        print("    ⚠️  sips failed:", result.stderr.decode().strip()[:120])
        return False
    return True


def has_transparent_corners(path):
    """v2 §5.0 step 3: a sticker's corners must really be transparent.

    A painted checkerboard or a white box is the usual failure, and it only
    shows up on the iPad, by which time it is too late. sips reports whether
    the file has an alpha channel; no alpha at all is a definite fail.
    """
    if not have_sips():
        return None
    out = subprocess.run(["sips", "-g", "hasAlpha", path],
                         capture_output=True).stdout.decode()
    if "hasAlpha: yes" in out:
        return True
    if "hasAlpha: no" in out:
        return False
    return None


def main():
    if not os.path.isdir(INCOMING):
        print("No assets/incoming/ folder. Nothing to do.")
        return
    manifest = json.load(open(MANIFEST, encoding="utf-8"))

    # id -> (entry, kind)
    index = {}
    for group, kind in (("hq", "scene"), ("situations", "scene"),
                        ("stickers", "sticker"), ("narrator", "audio"),
                        ("sfx", "audio")):
        for entry in manifest.get(group, []):
            index[normalise(entry["id"])] = (entry, kind)

    files = [f for f in sorted(os.listdir(INCOMING))
             if not f.startswith(".") and os.path.isfile(os.path.join(INCOMING, f))]

    # Two kinds of file are named in the asset guide but deliberately kept OUT
    # of the manifest, so they need their own homes:
    #   ref-*  reference sheets (guide §3.4) - for drawing parts against.
    #          Git-ignored and never shipped; the app must not see them.
    #   ui-*   optional interface art (guide §3.5).
    specials = {"ref-": os.path.join(ASSETS, "reference"),
                "ui-":  os.path.join(ASSETS, "img", "ui")}
    if not files:
        print("assets/incoming/ is empty.")
    brought, unmatched = [], []

    for name in files:
        src = os.path.join(INCOMING, name)
        key = normalise(name)

        # --- the two special kinds, before the manifest lookup ---
        prefix = next((p for p in specials if name.lower().startswith(p)), None)
        if prefix and key not in index:
            folder = specials[prefix]
            # A reference sheet is only ever looked at, so it keeps its format;
            # it is just made small enough to open quickly.
            dest = os.path.join(folder, os.path.splitext(name)[0] +
                                (".png" if prefix == "ui-" else ".jpg"))
            print("%s  ->  %s" % (name, os.path.relpath(dest, ASSETS)))
            if convert(src, dest, "sticker" if prefix == "ui-" else "scene"):
                brought.append(os.path.splitext(name)[0])
                if not DRY:
                    os.remove(src)
            continue

        if key not in index:
            unmatched.append(name)
            continue

        entry, kind = index[key]
        dest = os.path.join(ASSETS, entry["file"])
        print("%s  ->  %s" % (name, entry["file"]))

        if kind == "audio":
            # Audio is already small; it only needs its exact filename.
            if not DRY:
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                shutil.copy2(src, dest)
            ok = True
        else:
            ok = convert(src, dest, kind)
            if ok and kind == "sticker" and not DRY:
                alpha = has_transparent_corners(dest)
                if alpha is False:
                    print("    ⚠️  no transparency. Remove the background "
                          "(Finder → Quick Actions → Remove Background) and redo this one.")

        if ok:
            brought.append(entry["id"])
            if not DRY:
                os.remove(src)

    print("\n--- %s ---" % ("would bring in" if DRY else "brought in"))
    print("%d file(s): %s" % (len(brought), ", ".join(brought) or "none"))
    if unmatched:
        print("\nCould not match (rename these to their manifest id):")
        for name in unmatched:
            print("   ", name)

    # What is still missing, so the report is a to-do list.
    missing = []
    for group in ("hq", "situations", "stickers", "narrator", "sfx"):
        for entry in manifest.get(group, []):
            if not os.path.exists(os.path.join(ASSETS, entry["file"])):
                missing.append(entry["id"])
    print("\nStill to make: %d" % len(missing))
    if missing[:12]:
        print("  e.g.", ", ".join(missing[:12]))
    if not DRY and brought:
        print("\nNow bump CACHE_VERSION in sw.js and the ?v= numbers in "
              "index.html so the iPads pick the new files up.")


if __name__ == "__main__":
    main()
