#!/usr/bin/env python3
"""
make-icons.py - draws the app icons (spec §4)
=============================================
Spec §4 says: "Generate the simple icons yourself (e.g. a small script drawing
a spy-hat emoji or symbol on a dark background)." This is that script.

It writes three PNGs next to itself:
    icon-180.png   the iOS home-screen icon (<link rel="apple-touch-icon">)
    icon-192.png   the smaller manifest icon
    icon-512.png   the large manifest icon, also used for the splash screen

Run it with:   python3 icons/make-icons.py
You only need to run it again if you change the design below.

WHY IT WRITES THE PNG BY HAND
There is no image library here on purpose: the project uses nothing but what
is already on the machine. Python's standard library has zlib (compression)
and struct (binary packing), and a PNG is not much more than compressed rows
of pixels wrapped in four labelled chunks. So the file is built directly.
"""

import os
import struct
import zlib

# The app's colours, from style.css.
NAVY = (11, 27, 51)        # --navy-1
NAVY_EDGE = (6, 15, 31)    # --navy-0
GOLD = (255, 210, 63)      # --accent
GOLD_DARK = (201, 162, 25) # --accent-d


def lerp(a, b, t):
    """Blend between two colours. t runs 0 (all a) to 1 (all b)."""
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def draw(size):
    """Return `size` rows of `size` RGB pixels: the icon, drawn by maths.

    The shape is a spy's fedora - a brim and a crown with a band - which reads
    at 180px and still reads as a blob at favicon size.
    """
    rows = []
    cx = size / 2
    r_corner = size * 0.22          # rounded-square corner radius

    # Hat measurements, all as fractions of the icon so every size matches.
    brim_cy = size * 0.63
    brim_rx = size * 0.37
    brim_ry = size * 0.085
    crown_top = size * 0.26
    crown_bottom = brim_cy
    crown_half_top = size * 0.175
    crown_half_bottom = size * 0.225
    band_top = size * 0.50
    band_bottom = size * 0.57

    for y in range(size):
        row = bytearray()
        for x in range(size):
            px, py = x + 0.5, y + 0.5

            # --- the rounded-square background ---
            # Outside the rounded corner, the pixel is transparent-ish black.
            # (A PNG without alpha cannot be transparent, so the corner is
            # simply the darkest navy: iOS masks the icon to its own shape.)
            dx = max(r_corner - px, px - (size - r_corner), 0)
            dy = max(r_corner - py, py - (size - r_corner), 0)
            outside_corner = (dx * dx + dy * dy) ** 0.5 > r_corner

            # A soft diagonal shade so the icon is not a flat slab.
            shade = (px / size) * 0.5 + (py / size) * 0.5
            colour = lerp(NAVY, NAVY_EDGE, shade)
            if outside_corner:
                colour = NAVY_EDGE

            if not outside_corner:
                # --- the brim: an ellipse ---
                ex = (px - cx) / brim_rx
                ey = (py - brim_cy) / brim_ry
                in_brim = (ex * ex + ey * ey) <= 1

                # --- the crown: a trapezoid, narrower at the top ---
                in_crown = False
                if crown_top <= py <= crown_bottom:
                    t = (py - crown_top) / (crown_bottom - crown_top)
                    half = crown_half_top + (crown_half_bottom - crown_half_top) * t
                    in_crown = abs(px - cx) <= half

                if in_brim or in_crown:
                    # The band across the crown is the darker gold.
                    if in_crown and band_top <= py <= band_bottom:
                        colour = GOLD_DARK
                    else:
                        # A gentle top-to-bottom shade on the hat itself.
                        colour = lerp(GOLD, GOLD_DARK, (py / size) * 0.55)

            row += bytes(colour)
        rows.append(bytes(row))
    return rows


def write_png(path, size):
    """Wrap the pixel rows up as a PNG file."""
    rows = draw(size)

    # Each row in a PNG is preceded by a "filter type" byte. 0 means "stored
    # as-is", which is the simplest and good enough for flat colours.
    raw = b"".join(b"\x00" + row for row in rows)

    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    png = b"\x89PNG\r\n\x1a\n"                      # the PNG signature
    png += chunk(b"IHDR", struct.pack(">IIBBBBB",
                                      size, size,
                                      8,    # 8 bits per channel
                                      2,    # colour type 2 = RGB
                                      0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")

    with open(path, "wb") as handle:
        handle.write(png)
    return len(png)


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    for size in (180, 192, 512):
        name = os.path.join(here, "icon-%d.png" % size)
        written = write_png(name, size)
        print("wrote %s (%d bytes)" % (os.path.basename(name), written))
