#!/usr/bin/env python3
"""
analyse.py - the iPads' exports, as tables and agent cards (v3 P9)
==================================================================
Run it at home after a session, on the JSON files exported from every iPad
(adult panel -> Export all):

    python3 tools/analyse.py ~/Desktop/exports/*.json
    python3 tools/analyse.py a.json b.json --out ~/Desktop/session-3

It writes, to a folder OUTSIDE the repo (../agent-lab-analysis unless you
give --out):

    agents.csv      one row per agent
    powers.csv      one row per power, with every slot of its sentence
    bottles.csv     one row per bottle
    events.csv      one row per logged event - the full research log
    drawings/       every drawing, as a PNG named by its agent_ref
    audio/          every recording, named the same way
    cards/          one page per agent - its picture, its powers as sentence
                    strips, its bottles - for preparing next session's
                    questions. Open cards/index.html in a browser.

Every column is described in DATA.md, section 8.

THE DATA STAYS PRIVATE. Rows never contain a child's name: an agent is its
`agent_ref` (the first 8 characters of its id) and its codename, which the
paper codename register connects to a child. The output folder is research
data: keep it in secure KCL storage, never in the repo (it is git-ignored),
and never in ChatGPT, ElevenLabs or any online service.

MERGING. The same agent can be in several exports (exported twice, or
imported onto another iPad). Agents are matched by id, and the copy with the
most events is kept, because a child can only add events, never remove them.

RUNNING IT TWICE on the same files gives the same output: everything is
sorted, and nothing about the run itself (like today's date) is written.

Python standard library only, like the other tools - nothing to install.
"""

import argparse
import base64
import csv
import html
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DEFAULT_OUT = os.path.join(os.path.dirname(ROOT), "agent-lab-analysis")

# The six doors and their powers, in the app's order (v3 §7.2 and
# POWER_DOORS in app.js). The family is a lens for the analysis; children
# only ever saw the plain door labels.
DOORS = [
    ("fam-time", ["pow-slow-everybody", "pow-pause", "pow-hold-turn", "pow-warn-me", "pow-say-again"]),
    ("fam-senses", ["pow-turn-down", "pow-dim-lights", "pow-quiet-bubble"]),
    ("fam-language", ["pow-translator", "pow-my-way", "pow-get-me"]),
    ("fam-floor", ["pow-control-teachers", "pow-question-swap", "pow-pass", "pow-invisible"]),
    ("fam-screens", ["pow-control-displays", "pow-control-devices", "pow-see-points", "pow-change-rule"]),
    ("fam-together", ["pow-speak-for-friends", "pow-call-ally", "pow-team-up"]),
]
FAMILY = {power: fam for fam, powers in DOORS for power in powers}

MISSIONS_V3 = ["make", "suit", "safe", "powers", "bottle"]
MISSIONS_V2 = ["powerup", "hq", "voice"]
SLOTS = [("when", "whenOwn"), ("who", "whoOwn"), ("how", "howOwn")]


# ---------------------------------------------------------------------------
# Reading
# ---------------------------------------------------------------------------
def load_exports(paths):
    """Every agent from every file, one per id (the copy with the most
    events), and every recording."""
    agents, audio = {}, {}
    for path in paths:
        with open(path, encoding="utf-8") as f:
            payload = json.load(f)
        for agent in payload.get("agents", []):
            aid = agent.get("id")
            if not aid:
                continue
            kept = agents.get(aid)
            if kept is None or len(agent.get("events", [])) > len(kept.get("events", [])):
                agents[aid] = agent
        audio.update(payload.get("audio", {}))
    return [agents[k] for k in sorted(agents, key=lambda i: i[:8] + i)], audio


def load_labels():
    """Card id -> (label, emoji), from the asset manifest - the same words
    the children saw and heard."""
    out = {}
    try:
        with open(os.path.join(ROOT, "assets", "manifest.json"), encoding="utf-8") as f:
            manifest = json.load(f)
    except (OSError, ValueError):
        return out
    for group in ("hq", "situations", "powers", "doors", "cards"):
        for item in manifest.get(group, []):
            out[item["id"]] = (item.get("label", item["id"]), item.get("fallback", ""))
    return out


def ref(agent_id):
    return (agent_id or "")[:8]


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------
def joined(values):
    return " ".join(v for v in values if v)


def own_summary(cards):
    """A list of ✏️ own cards, as e.g. 'drawn+said drawn'."""
    out = []
    for c in cards or []:
        parts = [p for p, key in (("drawn", "png"), ("said", "audioId")) if c and c.get(key)]
        out.append("+".join(parts) or "empty")
    return " ".join(out)


def save_png(data_url, path):
    """A PNG data URL, written as a file. Returns the file name, or ''."""
    if not data_url or not data_url.startswith("data:image"):
        return ""
    try:
        raw = base64.b64decode(data_url.split(",", 1)[1])
    except (IndexError, ValueError):
        return ""
    with open(path, "wb") as f:
        f.write(raw)
    return os.path.basename(path)


AUDIO_EXT = {"audio/mp4": "m4a", "audio/aac": "m4a", "audio/webm": "webm",
             "audio/ogg": "ogg", "audio/wav": "wav", "audio/mpeg": "mp3"}


def save_audio(audio, audio_id, folder, name):
    """A recording from the export's audio map, as a file. Returns its name."""
    data_url = audio.get(audio_id or "")
    if not data_url:
        return ""
    head = data_url.split(",", 1)[0]
    mime = head[5:].split(";")[0]
    ext = AUDIO_EXT.get(mime, "audio")
    file_name = "%s.%s" % (name, ext)
    try:
        raw = base64.b64decode(data_url.split(",", 1)[1])
    except (IndexError, ValueError):
        return ""
    with open(os.path.join(folder, file_name), "wb") as f:
        f.write(raw)
    return file_name


def write_csv(path, header, rows):
    # utf-8-sig: Excel then shows emoji and accents correctly.
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)


# ---------------------------------------------------------------------------
# The four tables
# ---------------------------------------------------------------------------
AGENT_COLUMNS = [
    "agent_ref", "codename", "codename_source", "created_at", "sessions", "practice",
    "imported", "sealed", "door", "base", "like_me", "event_count",
] + ["status_" + m for m in MISSIONS_V3 + MISSIONS_V2] + [
    "suit_likes", "suit_likes_unsure", "suit_likes_not", "suit_likes_own",
    "suit_school", "suit_school_unsure", "suit_school_not", "suit_school_own",
    "suit_best", "secret_word", "secret_word_voice", "handshake_taps",
    "safe_talk", "safe_stops", "hq_v2", "v2_power_effect", "v2_power_when",
    "power_count", "bottle_count",
]


def place_text(answer):
    """A place answer: its id, 'own:drawn' / 'own:said' / 'own:drawn+said'
    for one the child made, or '' if there is none."""
    if not answer:
        return ""
    if answer.get("id"):
        return answer["id"]
    if answer.get("png") or answer.get("audioId"):
        return "own:" + own_summary([answer])
    return ""


def agent_row(agent):
    suit = agent.get("suit") or {}
    missions = agent.get("missions") or {}
    secret = agent.get("secretWord") or {}
    v2 = (agent.get("powerup") or {})
    v2_power = v2.get("power") or {}
    hs = agent.get("handshake") or {}
    return [
        ref(agent.get("id")), agent.get("codename", ""), agent.get("codenameSource", ""),
        agent.get("createdAt", ""), joined(str(s) for s in agent.get("sessions", [])),
        int(bool(agent.get("practice"))), int(bool(agent.get("imported"))),
        int(bool(agent.get("seal"))), agent.get("door") or "", agent.get("base") or "",
        agent.get("likeMe") or "", len(agent.get("events", [])),
    ] + [missions.get(m, "") for m in MISSIONS_V3 + MISSIONS_V2] + [
        joined(suit.get("likes", [])), joined(suit.get("likesUnsure", [])),
        joined(suit.get("likesNot", [])), own_summary(suit.get("likesOwn")),
        joined(suit.get("school", [])), joined(suit.get("schoolUnsure", [])),
        joined(suit.get("schoolNot", [])), own_summary(suit.get("schoolOwn")),
        suit.get("best") or "",
        int(bool(secret.get("audioId"))), secret.get("filter", "") if secret else "",
        joined(str(t) for t in hs.get("taps", [])),
        place_text((agent.get("safe") or {}).get("talk")),
        place_text((agent.get("safe") or {}).get("stops")),
        place_text(agent.get("hq")),
        v2_power.get("effect") or "", joined(v2.get("when", [])),
        len([p for p in agent.get("powers", []) if p.get("power")]),
        len(agent.get("bottles", [])),
    ]


POWER_COLUMNS = [
    "agent_ref", "codename", "power_index", "power_ref", "power", "family", "invented_first",
    "own_drawn", "own_said", "when", "when_own", "who", "who_own", "how", "how_own",
    "so_that", "skipped", "order", "times_fired",
]


def power_rows(agent):
    rows = []
    fired = {}
    for e in agent.get("events", []):
        if e.get("action") == "powers_fire":
            i = (e.get("detail") or {}).get("index")
            fired[i] = fired.get(i, 0) + 1
    for i, p in enumerate(agent.get("powers", [])):
        if not p.get("power"):
            continue
        own = p.get("own") or {}
        rows.append([
            ref(agent.get("id")), agent.get("codename", ""), i, p.get("id", ""), p["power"],
            FAMILY.get(p["power"], ""), "" if p.get("inventedFirst") is None else int(bool(p["inventedFirst"])),
            int(bool(own.get("png"))), int(bool(own.get("audioId"))),
            joined(p.get("when", [])), own_summary(p.get("whenOwn")),
            joined(p.get("who", [])), own_summary(p.get("whoOwn")),
            joined(p.get("how", [])), own_summary(p.get("howOwn")),
            own_summary([p["soThat"]]) if p.get("soThat") else "",
            joined(p.get("skipped", [])), joined(p.get("order", [])), fired.get(i, 0),
        ])
    return rows


BOTTLE_COLUMNS = [
    "agent_ref", "codename", "bottle_index", "bottle_ref", "created_at", "state", "to",
    "to_agent_ref", "signed", "items", "powers_given", "voice_filter", "sent_at", "delivered_at",
]


def bottle_rows(agent):
    rows = []
    powers = agent.get("powers", [])
    for i, b in enumerate(agent.get("bottles", [])):
        given = []
        voice = ""
        for item in b.get("items", []):
            if item.get("type") == "item-power":
                p = next((x for x in powers if x.get("id") == item.get("powerId")), None)
                if p is None and isinstance(item.get("power"), int) and item["power"] < len(powers):
                    p = powers[item["power"]]
                given.append(p["power"] if p else ("v2" if item.get("power") == "v2" else "removed"))
            if item.get("type") == "item-voice":
                voice = item.get("filter", "")
        signed = b.get("signed")
        rows.append([
            ref(agent.get("id")), agent.get("codename", ""), i, ref(b.get("id")),
            b.get("createdAt", ""), b.get("state", ""), b.get("to") or "",
            ref(b.get("toAgentId")), "" if signed is None else int(bool(signed)),
            joined(item.get("type", "") for item in b.get("items", [])),
            joined(given), voice, b.get("sentAt") or "", b.get("deliveredAt") or "",
        ])
    return rows


EVENT_COLUMNS = ["agent_ref", "codename", "seq", "t", "session", "practice", "mission", "action", "detail"]


def event_rows(agent):
    return [[
        ref(agent.get("id")), agent.get("codename", ""), n, e.get("t", ""), e.get("session", ""),
        int(bool(e.get("practice"))), e.get("mission", ""), e.get("action", ""),
        json.dumps(e.get("detail") or {}, ensure_ascii=False, sort_keys=True),
    ] for n, e in enumerate(agent.get("events", []))]


# ---------------------------------------------------------------------------
# Drawings and recordings
# ---------------------------------------------------------------------------
def save_media(agent, audio, drawings, sounds):
    """Every drawing and recording an agent holds, as files. Returns a map
    from a short description to the file name, for the agent's card."""
    r = ref(agent.get("id"))
    files = {}

    def png(data_url, what):
        name = save_png(data_url, os.path.join(drawings, "%s_%s.png" % (r, what)))
        if name:
            files["png:" + what] = name

    def clip(audio_id, what):
        name = save_audio(audio, audio_id, sounds, "%s_%s" % (r, what))
        if name:
            files["audio:" + what] = name

    png((agent.get("cover") or {}).get("drawingPng"), "cover")
    png((agent.get("hq") or {}).get("png"), "hq")
    v2 = (agent.get("powerup") or {}).get("power") or {}
    png(v2.get("png"), "v2power")
    clip(v2.get("audioId"), "v2power")
    for step in ("talk", "stops"):
        answer = (agent.get("safe") or {}).get(step) or {}
        png(answer.get("png"), "safe-" + step)
        clip(answer.get("audioId"), "safe-" + step)
    suit = agent.get("suit") or {}
    for key in ("likesOwn", "schoolOwn"):
        for i, c in enumerate(suit.get(key, [])):
            png(c.get("png"), "suit-%s-%d" % (key, i))
            clip(c.get("audioId"), "suit-%s-%d" % (key, i))
    secret = agent.get("secretWord") or {}
    clip(secret.get("audioId"), "secret-word")
    for i, p in enumerate(agent.get("powers", [])):
        own = p.get("own") or {}
        png(own.get("png"), "power%d" % i)
        clip(own.get("audioId"), "power%d" % i)
        if p.get("soThat"):
            png(p["soThat"].get("png"), "power%d-sothat" % i)
            clip(p["soThat"].get("audioId"), "power%d-sothat" % i)
        for slot, own_key in SLOTS:
            for j, c in enumerate(p.get(own_key, [])):
                png(c.get("png"), "power%d-%s%d" % (i, slot, j))
                clip(c.get("audioId"), "power%d-%s%d" % (i, slot, j))
    for i, b in enumerate(agent.get("bottles", [])):
        for j, item in enumerate(b.get("items", [])):
            png(item.get("png"), "bottle%d-%s" % (i, item.get("type", "item")))
            clip(item.get("audioId"), "bottle%d-%s" % (i, item.get("type", "item")))
    return files


# ---------------------------------------------------------------------------
# The agent cards
# ---------------------------------------------------------------------------
CARD_CSS = """
body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; background: #0b1b33; color: #fff;
       margin: 0; padding: 24px; line-height: 1.4; }
a { color: #ffd23f; }
h1 { margin: 0 0 4px; } .ref { color: #9fb3d1; font-family: ui-monospace, Menlo, monospace; }
section { background: #12294a; border-radius: 16px; padding: 16px 20px; margin: 16px 0; }
h2 { margin: 0 0 10px; font-size: 20px; }
.agent { width: 260px; height: 260px; border-radius: 18px; background: #1d3a63; position: relative; overflow: hidden; }
.agent svg, .agent img, .agent canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.sticker { position: absolute; transform: translate(-50%, -50%); font-size: 34px; }
.part-group { stroke: #1b1b2f; stroke-width: 2.5; stroke-linejoin: round; stroke-linecap: round;
              vector-effect: non-scaling-stroke; }
.part-group .tint { fill: var(--tint, #4cc9f0); }
.part-group .tint-stroke { stroke: var(--tint, #4cc9f0); }
.part-group .tint.tint-stroke { fill: var(--tint, #4cc9f0); stroke: var(--tint, #4cc9f0); }
.strip { display: flex; flex-wrap: wrap; gap: 8px; align-items: stretch; margin: 6px 0 14px; }
.slot { background: #1d3a63; border-radius: 12px; padding: 8px 10px; min-width: 110px; }
.slot b { display: block; font-size: 13px; color: #9fb3d1; font-weight: 600; }
.slot.skipped { opacity: .45; }
.chip { display: inline-block; background: #fff; color: #10233f; border-radius: 8px; padding: 2px 8px; margin: 2px; }
.thumb { max-width: 120px; max-height: 120px; background: #fff; border-radius: 8px; vertical-align: middle; }
table { border-collapse: collapse; } td { padding: 3px 14px 3px 0; vertical-align: top; }
.muted { color: #9fb3d1; }
"""

# Draws the agent from its saved cover with the app's own parts.js, which is
# copied into each card, so the picture is exactly what the child made.
CARD_DRAW = """
(function () {
  var cover = AGENT_COVER, door = AGENT_DOOR, box = document.getElementById('agent');
  var NS = 'http://www.w3.org/2000/svg';
  if (door === 'draw' && cover.drawingPng) {
    var img = document.createElement('img'); img.src = cover.drawingPng; box.appendChild(img);
  } else if (door === 'pixel' && cover.pixels && cover.pixels.some(Boolean)) {
    var c = document.createElement('canvas'); c.width = c.height = 16;
    var g = c.getContext('2d');
    cover.pixels.forEach(function (col, i) { if (col) { g.fillStyle = col; g.fillRect(i % 16, Math.floor(i / 16), 1, 1); } });
    c.style.imageRendering = 'pixelated'; box.appendChild(c);
  } else if (cover.shapes && cover.shapes.length) {
    var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 100 100');
    Parts.drawOrder(cover.shapes).forEach(function (item) {
      var part = Parts.get(item.shape.type); if (!part) return;
      var gEl = document.createElementNS(NS, 'g');
      gEl.setAttribute('class', 'part-group');
      gEl.setAttribute('transform', Parts.transform(item.shape));
      gEl.innerHTML = part.svg; gEl.style.setProperty('--tint', item.shape.colour);
      svg.appendChild(gEl);
    });
    box.appendChild(svg);
  }
  (cover.stickers || []).forEach(function (s) {
    if (!s.emoji) return;
    var el = document.createElement('span'); el.className = 'sticker'; el.textContent = s.emoji;
    el.style.left = (s.x * 100) + '%'; el.style.top = (s.y * 100) + '%';
    el.style.transform = 'translate(-50%,-50%) rotate(' + (s.rotation || 0) + 'deg) scale(' + (s.scale || 1) + ')';
    box.appendChild(el);
  });
})();
"""


def esc(text):
    return html.escape(str(text if text is not None else ""))


def chip(card_id, labels):
    label, emoji = labels.get(card_id, (card_id, ""))
    return '<span class="chip">%s %s</span>' % (esc(emoji), esc(label))


def media(files, what, folder_up="../"):
    out = ""
    if "png:" + what in files:
        out += '<img class="thumb" alt="" src="%sdrawings/%s">' % (folder_up, esc(files["png:" + what]))
    if "audio:" + what in files:
        out += ' <audio controls src="%saudio/%s"></audio>' % (folder_up, esc(files["audio:" + what]))
    return out


def card_html(agent, files, labels, parts_js):
    r = ref(agent.get("id"))
    out = ['<!doctype html><html lang="en-GB"><head><meta charset="utf-8">',
           '<title>%s</title><style>%s</style></head><body>' % (esc(agent.get("codename") or r), CARD_CSS),
           '<p><a href="index.html">← all agents</a></p>',
           '<h1>%s</h1><div class="ref">agent_ref %s%s</div>' % (
               esc(agent.get("codename") or "Agent"), esc(r), " · practice" if agent.get("practice") else ""),
           '<section><div id="agent" class="agent"></div>']
    like = agent.get("likeMe")
    if like:
        out.append('<p>Is your agent like you? %s</p>' % chip(like, labels))
    out.append('</section>')

    # 🗣️ how my agent talks
    suit = agent.get("suit") or {}
    if any(suit.get(k) for k in ("likes", "likesUnsure", "likesNot", "school", "schoolUnsure", "schoolNot")):
        out.append('<section><h2>🗣️ How my agent talks</h2><table>')
        for title, keys in (("My agent likes…", ("likes", "likesUnsure", "likesNot")),
                            ("School wants…", ("school", "schoolUnsure", "schoolNot"))):
            for mark, key in zip(("👍", "🤷", "👎"), keys):
                out.append('<tr><td class="muted">%s %s</td><td>%s</td></tr>' % (
                    esc(title), mark, " ".join(chip(c, labels) for c in suit.get(key, []))))
        if suit.get("best"):
            out.append('<tr><td class="muted">⭐ Best</td><td>%s</td></tr>' % chip(suit["best"], labels))
        out.append('</table>')
        if files.get("audio:secret-word"):
            out.append('<p>🤫 Secret word (spy voice: %s) %s</p>' % (
                esc((agent.get("secretWord") or {}).get("filter", "")), media(files, "secret-word")))
        out.append('</section>')

    # 📍 safe place
    safe = agent.get("safe") or {}
    if safe.get("talk") or safe.get("stops"):
        out.append('<section><h2>📍 Safe place</h2><table>')
        for step, title in (("talk", "Safe to talk"), ("stops", "Power stops")):
            a = safe.get(step) or {}
            out.append('<tr><td class="muted">%s</td><td>%s %s</td></tr>' % (
                title, chip(a["id"], labels) if a.get("id") else "", media(files, "safe-" + step)))
        out.append('</table></section>')

    # ⚡ powers, as sentence strips
    powers = [p for p in agent.get("powers", []) if p.get("power")]
    if powers:
        out.append('<section><h2>⚡ Powers</h2>')
        for i, p in enumerate(agent.get("powers", [])):
            if not p.get("power"):
                continue
            power = p["power"]
            name = {"own": "✨ Their own power", "v2": "⏪ From last time"}.get(power) or chip(power, labels)
            out.append('<div class="strip"><div class="slot"><b>Power%s</b>%s %s</div>' % (
                " · invented first" if p.get("inventedFirst") else "", name, media(files, "power%d" % i)))
            for slot, own_key in SLOTS:
                skipped = slot in (p.get("skipped") or [])
                cells = " ".join(chip(c, labels) for c in p.get(slot, []))
                cells += " ".join(media(files, "power%d-%s%d" % (i, slot, j)) for j in range(len(p.get(own_key, []))))
                out.append('<div class="slot%s"><b>%s</b>%s</div>' % (
                    " skipped" if skipped else "", {"when": "🕐 When", "who": "👥 Who", "how": "🔌 Switch on"}[slot],
                    cells or "—"))
            out.append('<div class="slot%s"><b>🎯 So that</b>%s</div></div>' % (
                " skipped" if not p.get("soThat") else "", media(files, "power%d-sothat" % i) or "—"))
        out.append('</section>')

    # 🍾 bottles
    bottles = agent.get("bottles", [])
    if bottles:
        out.append('<section><h2>🍾 Bottles</h2><table>')
        for i, b in enumerate(bottles):
            items = " ".join(chip(it.get("type", ""), labels) + media(files, "bottle%d-%s" % (i, it.get("type", "")))
                             for it in b.get("items", []))
            signed = {True: "✍️ signed", False: "🎭 mystery", None: ""}.get(b.get("signed"), "")
            out.append('<tr><td>%s</td><td>%s %s</td><td class="muted">%s</td></tr>' % (
                chip(b["to"], labels) if b.get("to") else "", items, signed, esc(b.get("state", ""))))
        out.append('</table></section>')

    out.append('<script>%s</script>' % parts_js)
    out.append('<script>var AGENT_COVER = %s; var AGENT_DOOR = %s;%s</script>' % (
        json.dumps(agent.get("cover") or {}, sort_keys=True).replace("</", "<\\/"),
        json.dumps(agent.get("door") or "parts"), CARD_DRAW))
    out.append('</body></html>')
    return "\n".join(out)


def index_html(agents):
    rows = "".join('<tr><td><a href="%s.html">%s</a></td><td class="ref">%s</td><td class="muted">%s</td></tr>' % (
        esc(ref(a.get("id"))), esc(a.get("codename") or "Agent"), esc(ref(a.get("id"))),
        "practice" if a.get("practice") else "") for a in agents)
    return ('<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Agents</title>'
            '<style>%s</style></head><body><h1>Agents</h1><table>%s</table></body></html>' % (CARD_CSS, rows))


# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Agent Lab exports -> tables and agent cards (v3 P9).")
    parser.add_argument("exports", nargs="+", help="the JSON files exported from the iPads")
    parser.add_argument("--out", default=DEFAULT_OUT, help="where to write (default: %(default)s)")
    args = parser.parse_args()

    out = os.path.abspath(args.out)
    if out == ROOT or out.startswith(ROOT + os.sep):
        print("⚠️  That folder is inside the repo. The output is research data and must")
        print("   never be committed. Writing there anyway - it is git-ignored - but")
        print("   please move it to secure KCL storage.")

    agents, audio = load_exports(args.exports)
    labels = load_labels()
    with open(os.path.join(ROOT, "parts.js"), encoding="utf-8") as f:
        parts_js = f.read().replace("</script", "<\\/script")

    drawings = os.path.join(out, "drawings")
    sounds = os.path.join(out, "audio")
    cards = os.path.join(out, "cards")
    for folder in (out, drawings, sounds, cards):
        os.makedirs(folder, exist_ok=True)

    agent_table, power_table, bottle_table, event_table = [], [], [], []
    for agent in agents:
        agent_table.append(agent_row(agent))
        power_table.extend(power_rows(agent))
        bottle_table.extend(bottle_rows(agent))
        event_table.extend(event_rows(agent))
        files = save_media(agent, audio, drawings, sounds)
        with open(os.path.join(cards, ref(agent.get("id")) + ".html"), "w", encoding="utf-8") as f:
            f.write(card_html(agent, files, labels, parts_js))
    with open(os.path.join(cards, "index.html"), "w", encoding="utf-8") as f:
        f.write(index_html(agents))

    write_csv(os.path.join(out, "agents.csv"), AGENT_COLUMNS, agent_table)
    write_csv(os.path.join(out, "powers.csv"), POWER_COLUMNS, power_table)
    write_csv(os.path.join(out, "bottles.csv"), BOTTLE_COLUMNS, bottle_table)
    write_csv(os.path.join(out, "events.csv"), EVENT_COLUMNS, event_table)

    print("Read %d file(s): %d agents, %d powers, %d bottles, %d events." % (
        len(args.exports), len(agent_table), len(power_table), len(bottle_table), len(event_table)))
    print("Written to %s" % out)
    print("Open %s in a browser for the agent cards." % os.path.join(cards, "index.html"))


if __name__ == "__main__":
    main()
