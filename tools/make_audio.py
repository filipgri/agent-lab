#!/usr/bin/env python3
"""
make_audio.py: makes Agent Lab's narrator lines and sound effects with ElevenLabs.

WHAT IT DOES
  It reads the tables in asset-guide.md (the source of truth for every asset).
  For each narrator line or sound effect that has no file yet, it asks ElevenLabs
  to make one and saves it under its exact name:
      assets/audio/narrator/<id>.mp3
      assets/audio/sfx/<id>.mp3
  Files that already exist are skipped, so running it again is safe and costs nothing.

HOW TO RUN IT (in Terminal, from inside the agent-lab folder)
  python3 tools/make_audio.py setup           save your API key and narrator voice (once)
  python3 tools/make_audio.py list            what's made, what's missing, how much text
  python3 tools/make_audio.py narrator        make the missing narrator lines
  python3 tools/make_audio.py sfx             make the missing sound effects
  python3 tools/make_audio.py play narrator   listen to them one by one (Mac)
  python3 tools/make_audio.py voices          list the voices in your ElevenLabs account

OPTIONS (for list, narrator, sfx and play)
  --session 3       include everything up to session 3 (the default is 2; 4 means everything)
  --only ID [ID …]  just these, for example: --only nar-hq-intro nar-hq-draw
  --force           remake files that already exist (use it with --only to redo one line)
  --dry-run         show what would be made, without calling ElevenLabs
  --from ID         (play only) start playing from this id

PRIVACY
  The only things this script sends are the narrator text and the sound descriptions
  in asset-guide.md, never a child's name, drawing or voice. Your API key lives in .env,
  which `setup` adds to .gitignore so it never reaches GitHub.

It uses standard-library Python only, so there is nothing to install.
"""

# ---------------------------------------------------------------------------
# "import" loads tools that come with Python. Each one does one job:
#   argparse   reads the command and options you type (narrator, --only, …)
#   getpass    asks for the API key without showing it on screen
#   json       turns Python dictionaries into the text ElevenLabs expects, and back
#   urllib     talks to websites over HTTPS (here: the ElevenLabs API)
#   pathlib    builds file paths that work on any computer
#   subprocess runs another program (afplay, the Mac's audio player)
# ---------------------------------------------------------------------------
import argparse
import getpass
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


# ===========================================================================
# 1. SETTINGS: the only part you might want to change
# ===========================================================================

# Which ElevenLabs model reads the narrator lines. eleven_v4 is the newest
# and understands tags like [whispers]. You can switch without editing this
# file: add a line NARRATOR_MODEL=eleven_multilingual_v2 to .env.
DEFAULT_NARRATOR_MODEL = "eleven_v4"

# The voice settings we would like. Models differ in what they accept, so the
# script only sends the ones the chosen model takes (see SETTINGS_BY_MODEL).
VOICE_SETTINGS = {
    "stability": 0.5,          # the middle: steady, but not flat
    "similarity_boost": 0.75,  # stay close to the chosen voice
    "style": 0.0,              # no exaggerated style
    "use_speaker_boost": True,
    "speed": 0.9,              # only older models take speed; the app slows playback itself
}

# Which of those settings each model family accepts. A model id that starts with
# one of these names uses that list; any other model gets all five settings.
SETTINGS_BY_MODEL = {
    "eleven_v4": ("stability", "similarity_boost"),
    "eleven_v3": ("stability", "use_speaker_boost"),
}

# Models that understand audio tags such as [whispers]. Any other model would
# read the tag out loud, so for those the script removes the tags first.
TAG_MODELS = ("eleven_v4", "eleven_v3")

SFX_MODEL = "eleven_text_to_sound_v2"
SFX_PROMPT_INFLUENCE = 0.4      # 0 to 1: higher means "stick closer to my description"
OUTPUT_FORMAT = "mp3_44100_128"  # MP3, 44.1 kHz, 128 kbps
PAUSE_BETWEEN_CALLS = 0.4        # seconds between requests, to be gentle with the API

# Where ElevenLabs lives. Only a test would ever change this.
API = os.environ.get("ELEVENLABS_BASE_URL", "https://api.elevenlabs.io").rstrip("/")

# This file sits in agent-lab/tools/, so the agent-lab folder is one level up.
# Path(__file__) is this script; .resolve() makes it a full path; .parent goes up.
ROOT = Path(__file__).resolve().parent.parent
GUIDE = ROOT / "asset-guide.md"
ENV_FILE = ROOT / ".env"
GITIGNORE = ROOT / ".gitignore"
OUT_DIRS = {
    "narrator": ROOT / "assets" / "audio" / "narrator",
    "sfx": ROOT / "assets" / "audio" / "sfx",
}


# ===========================================================================
# 2. SMALL HELPERS
# ===========================================================================

def die(message):
    """Print a message and stop the script. Exit code 1 tells Terminal it failed."""
    print(message)
    sys.exit(1)


def strip_tags(text):
    """Remove audio tags like [whispers] for models that would read them aloud."""
    return re.sub(r"\[[^\]]*\]\s*", "", text).strip()


def settings_for(model):
    """Keep only the voice settings the chosen model accepts."""
    for prefix, allowed in SETTINGS_BY_MODEL.items():
        if model.startswith(prefix):
            return {k: v for k, v in VOICE_SETTINGS.items() if k in allowed}
    return dict(VOICE_SETTINGS)


def file_for(item):
    """The exact file an item is saved as, e.g. assets/audio/narrator/nar-hq-intro.mp3"""
    return OUT_DIRS[item["kind"]] / (item["id"] + ".mp3")


def looks_like_mp3(data):
    """MP3 files start with 'ID3' (a tag block) or with a frame sync (0xFF 0xE?)."""
    return data[:3] == b"ID3" or (len(data) > 1 and data[0] == 0xFF and (data[1] & 0xE0) == 0xE0)


def save(path, data):
    """Write to a temporary file first, then rename: a crash never leaves half a file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(".part")
    temp.write_bytes(data)
    temp.replace(path)


def load_env():
    """Read KEY=value lines from .env. Settings in Terminal's environment win."""
    values = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    for key in ("ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID", "NARRATOR_MODEL"):
        if os.environ.get(key):
            values[key] = os.environ[key]
    return values


# ===========================================================================
# 3. READING asset-guide.md
#    The guide's tables are the source of truth, so the script reads them
#    instead of keeping its own copy of 115 lines that could drift apart.
# ===========================================================================

def between(text, start, stops):
    """The part of `text` after `start`, cut at the first of the `stops` found."""
    if start not in text:
        die(f"Couldn't find '{start}' in asset-guide.md. Has the guide changed shape?")
    part = text.split(start, 1)[1]
    cut = min((part.find(s) for s in stops if part.find(s) != -1), default=len(part))
    return part[:cut]


def table_row(line, prefix):
    """Turn '| nar-x | a | b |' into ('nar-x', ['a', 'b']), or None for other lines."""
    match = re.match(r"^\|\s*(" + prefix + r"-[a-z0-9-]+)\s*\|(.*)\|\s*$", line)
    if not match:
        return None
    return match.group(1), [cell.strip() for cell in match.group(2).split("|")]


def read_guide():
    if not GUIDE.exists():
        die(f"Can't find asset-guide.md in {ROOT}.\n"
            "Put it in the agent-lab folder, next to agent-lab-v2-spec.md.")
    text = GUIDE.read_text(encoding="utf-8")
    items = []

    # Narrator lines: section 4.5. Bold headings like "**Session 3: …**" set the session.
    block = between(text, "### 4.5 Narrator lines", ["### 4.6"])
    session = 2
    for line in block.splitlines():
        heading = re.match(r"^\*\*Session (\d)", line)
        if heading:
            session = int(heading.group(1))
            continue
        row = table_row(line, "nar")
        if row:
            item_id, cells = row
            items.append({
                "kind": "narrator", "id": item_id, "session": session,
                "text": cells[-1],                       # the text is always the last column
                "when": cells[0] if len(cells) > 1 else "card label",
            })

    # Sound effects: section 4.6. ⭐ means session 2; ◻️ means later (session 3).
    block = between(text, "### 4.6 Sound effects", ["\n## ", "\n---"])
    style = re.search(r'Style line for every sound:\*\*\s*\*"(.+?)"\*', block)
    style = style.group(1).strip() if style else ""
    for line in block.splitlines():
        row = table_row(line, "sfx")
        if row:
            item_id, cells = row
            if len(cells) < 5:
                die(f"The row for {item_id} in asset-guide.md has too few columns.")
            when, prompt, seconds, _standin, tier = cells[:5]
            items.append({
                "kind": "sfx", "id": item_id, "session": 2 if "⭐" in tier else 3,
                "when": when, "prompt": prompt, "style": style, "seconds": float(seconds),
            })

    if not items:
        die("Found no narrator lines or sounds in asset-guide.md.")
    return items


def choose(items, kind, session, only):
    """Pick the items a command works on: by kind, then by --only or by --session."""
    chosen = [i for i in items if kind == "all" or i["kind"] == kind]
    if only:
        known = {i["id"] for i in items}
        unknown = [x for x in only if x not in known]
        if unknown:
            die("Not in asset-guide.md: " + ", ".join(unknown))
        wrong_kind = [i["id"] for i in items if i["id"] in only and i not in chosen]
        if wrong_kind:
            print("Note: skipping " + ", ".join(wrong_kind) + ". Narrator lines (nar-…) go with "
                  "the narrator command, sounds (sfx-…) with the sfx command.")
        return [i for i in chosen if i["id"] in only]
    return [i for i in chosen if i["session"] <= session]


# ===========================================================================
# 4. TALKING TO ELEVENLABS
# ===========================================================================

class ApiError(Exception):
    """ElevenLabs answered, but with an error code (401, 422, …)."""
    def __init__(self, code, detail):
        super().__init__(f"{code}: {detail}")
        self.code = code
        self.detail = detail


CERT_HELP = (
    "Python couldn't check ElevenLabs' security certificate.\n"
    "If you installed Python from python.org: open Finder → Applications → the Python 3 folder,\n"
    "double-click 'Install Certificates.command', then run this again."
)


def call(method, path, key, body=None, query=None, tries=5):
    """
    Send one request and return (bytes, headers).
    The key travels in the 'xi-api-key' header, which is how ElevenLabs knows it's you.
    Busy or temporary errors (429, 5xx) are retried after 2, 4, 8, 16 seconds.
    """
    url = API + path + ("?" + urllib.parse.urlencode(query) if query else "")
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"xi-api-key": key, "Accept": "*/*"}
    if body is not None:
        headers["Content-Type"] = "application/json"

    for attempt in range(1, tries + 1):
        request = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                return response.read(), response.headers
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", "replace")
            if error.code in (429, 500, 502, 503, 504) and attempt < tries:
                wait = 2 ** attempt
                print(f"(busy, trying again in {wait}s)", end=" ", flush=True)
                time.sleep(wait)
                continue
            raise ApiError(error.code, detail)
        except urllib.error.URLError as error:
            if "CERTIFICATE_VERIFY_FAILED" in str(error.reason):
                die("\n" + CERT_HELP)
            if attempt < tries:
                time.sleep(2 ** attempt)
                continue
            die(f"\nCouldn't reach ElevenLabs ({error.reason}). Check the internet connection.")


def short_detail(detail):
    """Pull the human-readable message out of an ElevenLabs error reply."""
    try:
        data = json.loads(detail)
        inner = data.get("detail", data)
        if isinstance(inner, dict):
            return inner.get("message") or inner.get("status") or json.dumps(inner)
        if isinstance(inner, list) and inner:
            first = inner[0]
            return first.get("msg", str(first)) if isinstance(first, dict) else str(first)
        return str(inner)
    except (ValueError, AttributeError):
        return detail.strip()[:300]


def explain(error):
    """Turn an error code into a sentence that says what to do next."""
    message = short_detail(error.detail)
    lowered = (error.detail or "").lower()
    if "quota" in lowered or "credit" in lowered:
        return f"Out of credits for this key or plan. ({message})"
    if error.code == 401 and "permission" in lowered:
        return ("This key isn't allowed to do that. In ElevenLabs → Developers → API Keys, "
                f"let it use Text to Speech, Sound Effects and Voices. ({message})")
    if error.code == 401:
        return f"ElevenLabs refused the key. Run: python3 tools/make_audio.py setup  ({message})"
    if error.code == 403:
        return ("This key isn't allowed to do that. In ElevenLabs → Developers → API Keys, "
                f"let it use Text to Speech, Sound Effects and Voices. ({message})")
    if error.code == 404:
        return ("Not found. Check the voice: it must be in My Voices. "
                f"Run setup again to pick it. ({message})")
    if error.code == 422:
        return f"ElevenLabs didn't accept the request: {message}"
    return f"ElevenLabs error {error.code}: {message}"


def make_narrator(item, key, voice_id, model):
    text = item["text"] if model.startswith(TAG_MODELS) else strip_tags(item["text"])
    body = {"text": text, "model_id": model, "voice_settings": settings_for(model)}
    audio, headers = call("POST", f"/v1/text-to-speech/{voice_id}", key, body,
                          {"output_format": OUTPUT_FORMAT})
    return audio, headers, len(text)


def make_sfx(item, key):
    prompt = f"{item['prompt']} {item['style']}".strip()
    body = {"text": prompt, "duration_seconds": item["seconds"],
            "prompt_influence": SFX_PROMPT_INFLUENCE, "model_id": SFX_MODEL}
    audio, headers = call("POST", "/v1/sound-generation", key, body,
                          {"output_format": OUTPUT_FORMAT})
    return audio, headers, len(prompt)


# ===========================================================================
# 5. THE COMMANDS
# ===========================================================================

def cmd_setup(_args):
    print("Agent Lab · ElevenLabs setup\n")
    print("1) Paste your ElevenLabs API key and press Return.")
    print("   Nothing shows on screen while you paste. That's on purpose.")
    key = getpass.getpass("   API key: ").strip()
    if not key:
        die("   No key entered. Run setup again when you have it.")

    # Check the key by asking for your plan's usage. A restricted key may not
    # be allowed to read it, which is fine: we only need it to make audio.
    try:
        raw, _ = call("GET", "/v1/user/subscription", key, tries=2)
        plan = json.loads(raw)
        print(f"   ✓ The key works. Credits used this period: "
              f"{plan.get('character_count', '?')} of {plan.get('character_limit', '?')}.")
    except ApiError as error:
        if error.code == 401 and "permission" not in error.detail.lower():
            die("   ✗ ElevenLabs refused that key. Copy it again from "
                "Developers → API Keys, then rerun setup.")
        print("   ✓ Key accepted (it isn't allowed to read your plan, which is fine).")

    voice_id = pick_voice(key)
    write_env(key, voice_id)
    ensure_gitignore()
    print("\nAll set. Next, try three lines:")
    print("   python3 tools/make_audio.py narrator --only nar-start-welcome nar-card-intro nar-power-when")


def pick_voice(key):
    voices = []
    try:
        raw, _ = call("GET", "/v1/voices", key, tries=2)
        voices = json.loads(raw).get("voices", [])
    except ApiError:
        pass   # the key may not be allowed to list voices; we'll ask for the ID instead

    if voices:
        print("\n2) The voices in your account:")
        for number, voice in enumerate(voices, 1):
            labels = voice.get("labels") or {}
            about = ", ".join(str(labels[k]) for k in ("accent", "gender", "age", "use_case")
                              if labels.get(k))
            print(f"   {number:>2}. {voice.get('name', '?'):<24} {about:<40} {voice.get('voice_id')}")
        answer = input("   Type the number of the narrator voice (or paste a voice ID): ").strip()
        if answer.isdigit() and 1 <= int(answer) <= len(voices):
            chosen = voices[int(answer) - 1]
            print(f"   ✓ Narrator: {chosen.get('name')}")
            return chosen["voice_id"]
        if answer:
            return answer
        die("   No voice chosen. Run setup again.")

    print("\n2) Paste the narrator's voice ID.")
    print("   (ElevenLabs → My Voices → the voice's ⋯ menu → Copy voice ID)")
    answer = input("   Voice ID: ").strip()
    if not answer:
        die("   No voice ID entered. Run setup again.")
    return answer


def write_env(key, voice_id):
    keep = ""
    old = load_env() if ENV_FILE.exists() else {}
    if old.get("NARRATOR_MODEL"):
        keep = f"NARRATOR_MODEL={old['NARRATOR_MODEL']}\n"
    ENV_FILE.write_text(
        "# ElevenLabs settings for tools/make_audio.py.\n"
        "# Keep this file secret. It is listed in .gitignore, so it never goes to GitHub.\n"
        f"ELEVENLABS_API_KEY={key}\n"
        f"ELEVENLABS_VOICE_ID={voice_id}\n" + keep,
        encoding="utf-8")
    try:
        os.chmod(ENV_FILE, 0o600)   # readable by you only
    except OSError:
        pass
    print(f"\n3) ✓ Saved the key and voice in {ENV_FILE.name}")


def ensure_gitignore():
    lines = GITIGNORE.read_text(encoding="utf-8").splitlines() if GITIGNORE.exists() else []
    if ".env" not in [line.strip() for line in lines]:
        with GITIGNORE.open("a", encoding="utf-8") as handle:
            handle.write(("\n" if lines and lines[-1].strip() else "") + "# secrets\n.env\n")
        print("   ✓ Added .env to .gitignore, so the key never goes to GitHub.")
    else:
        print("   ✓ .gitignore already keeps .env off GitHub.")
    # If .env was ever committed by accident, .gitignore alone won't remove it.
    if shutil.which("git"):
        tracked = subprocess.run(["git", "ls-files", "--error-unmatch", ".env"], cwd=ROOT,
                                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if tracked.returncode == 0:
            print("   ⚠ .env is already in git! Ask Claude Code: 'Remove .env from git, keep the file.'"
                  "\n     Then make a new key in ElevenLabs and delete the old one.")


def cmd_voices(_args):
    key = load_env().get("ELEVENLABS_API_KEY")
    if not key:
        die("No API key yet. Run: python3 tools/make_audio.py setup")
    try:
        raw, _ = call("GET", "/v1/voices", key, tries=2)
    except ApiError as error:
        die(explain(error))
    for voice in json.loads(raw).get("voices", []):
        labels = voice.get("labels") or {}
        about = ", ".join(str(v) for v in labels.values() if v)
        print(f"{voice.get('name', '?'):<24} {voice.get('voice_id')}   {about}")


def cmd_list(args):
    items = read_guide()
    for kind, title in (("narrator", "Narrator lines"), ("sfx", "Sound effects")):
        chosen = choose(items, kind, args.session, args.only)
        made = [i for i in chosen if file_for(i).exists()]
        missing = [i for i in chosen if not file_for(i).exists()]
        print(f"\n{title} (up to session {args.session}): {len(made)} made, {len(missing)} missing")
        if kind == "narrator" and missing:
            print(f"   text still to send: {sum(len(i['text']) for i in missing)} characters")
        if kind == "sfx" and missing:
            print(f"   sound still to make: {sum(i['seconds'] for i in missing):.1f} seconds")
        for item in missing:
            print(f"   · {item['id']}")


def cmd_make(args):
    kind = args.command                      # "narrator" or "sfx"
    env = load_env()
    key = env.get("ELEVENLABS_API_KEY")
    voice_id = env.get("ELEVENLABS_VOICE_ID")
    model = env.get("NARRATOR_MODEL") or DEFAULT_NARRATOR_MODEL

    items = choose(read_guide(), kind, args.session, args.only)
    todo = [i for i in items if args.force or not file_for(i).exists()]
    print(f"{len(todo)} to make, {len(items) - len(todo)} already made"
          + (f"  ·  model {model}" if kind == "narrator" else ""))

    if args.dry_run:
        for item in todo:
            print(f"   would make {file_for(item).relative_to(ROOT)}")
        return
    if not todo:
        print("Nothing to do.")
        return
    if not key:
        die("No API key yet. Run: python3 tools/make_audio.py setup")
    if kind == "narrator" and not voice_id:
        die("No narrator voice yet. Run: python3 tools/make_audio.py setup")

    made, failed, sent, credits = 0, 0, 0, 0
    try:
        for number, item in enumerate(todo, 1):
            print(f"[{number}/{len(todo)}] {item['id']} …", end=" ", flush=True)
            try:
                if kind == "narrator":
                    audio, headers, length = make_narrator(item, key, voice_id, model)
                else:
                    audio, headers, length = make_sfx(item, key)
            except ApiError as error:
                failed += 1
                print("✗\n   " + explain(error))
                lowered = error.detail.lower()
                if error.code in (401, 403) or "quota" in lowered or "credit" in lowered:
                    print("   Stopping here: the next ones would fail the same way.")
                    break
                continue
            if not looks_like_mp3(audio):
                failed += 1
                print("✗\n   ElevenLabs sent something that isn't audio. Try this one again later.")
                continue
            save(file_for(item), audio)
            made += 1
            sent += length
            cost = headers.get("character-cost") if headers else None
            credits += int(cost) if cost and str(cost).isdigit() else 0
            print("✓")
            time.sleep(PAUSE_BETWEEN_CALLS)
    except KeyboardInterrupt:
        print("\nStopped. Run the same command again to carry on: finished files are kept.")

    print(f"\nMade {made}, failed {failed}. Saved in {OUT_DIRS[kind].relative_to(ROOT)}/")
    print(f"Credits used, as ElevenLabs reported them: {credits}" if credits
          else f"Sent {sent} characters of text.")
    if made:
        print(f"Listen: python3 tools/make_audio.py play {kind}"
              + (f" --session {args.session}" if args.session != 2 else ""))


def cmd_play(args):
    items = choose(read_guide(), args.kind, args.session, args.only)
    if args.start:
        ids = [i["id"] for i in items]
        if args.start not in ids:
            die(f"{args.start} isn't in this list.")
        items = items[ids.index(args.start):]
    player = shutil.which("afplay")   # the Mac's built-in audio player
    try:
        for item in items:
            path = file_for(item)
            words = item.get("text") or item.get("prompt")
            if not path.exists():
                print(f"   {item['id']}: not made yet")
                continue
            print(f"▶ {item['id']}   {words}")
            if player:
                subprocess.run([player, str(path)])
                time.sleep(0.4)
            else:
                print(f"   (open {path} to listen)")
    except KeyboardInterrupt:
        print("\nStopped. Carry on later with --from and the next id.")


# ===========================================================================
# 6. READING WHAT YOU TYPED
#    argparse turns "narrator --only nar-hq-intro --force" into args.command,
#    args.only and args.force, and prints help for --help.
# ===========================================================================

def main():
    # Let "| head" and similar cut the output short without a scary error.
    if hasattr(__import__("signal"), "SIGPIPE"):
        import signal
        signal.signal(signal.SIGPIPE, signal.SIG_DFL)

    parser = argparse.ArgumentParser(
        prog="python3 tools/make_audio.py",
        description="Make Agent Lab's narrator lines and sound effects with ElevenLabs.")
    commands = parser.add_subparsers(dest="command", required=True)

    commands.add_parser("setup", help="save your API key and narrator voice in .env")
    commands.add_parser("voices", help="list the voices in your ElevenLabs account")

    def add_scope(sub):
        sub.add_argument("--session", type=int, default=2, choices=[2, 3, 4],
                         help="include everything up to this session (default 2)")
        sub.add_argument("--only", nargs="+", metavar="ID", help="just these ids")

    add_scope(commands.add_parser("list", help="show what's made and what's missing"))
    for name in ("narrator", "sfx"):
        what = "narrator lines" if name == "narrator" else "sound effects"
        sub = commands.add_parser(name, help=f"make the missing {what}")
        add_scope(sub)
        sub.add_argument("--force", action="store_true", help="remake files that exist")
        sub.add_argument("--dry-run", action="store_true", help="show what would be made")
    play = commands.add_parser("play", help="listen to the files one by one (Mac)")
    play.add_argument("kind", nargs="?", default="all", choices=["narrator", "sfx", "all"])
    add_scope(play)
    play.add_argument("--from", dest="start", metavar="ID", help="start from this id")

    args = parser.parse_args()
    handlers = {"setup": cmd_setup, "voices": cmd_voices, "list": cmd_list,
                "narrator": cmd_make, "sfx": cmd_make, "play": cmd_play}
    handlers[args.command](args)


if __name__ == "__main__":
    main()
