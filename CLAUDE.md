# Agent Lab — working notes for Claude

An iPad web app where children design a spy "agent" avatar, step by step.
Built for a school design club research session (TACT, WP1, Dawn House Design Club).

## Read this first

Three files are the brief, and they stack:

| File | What it is | Wins when they disagree |
|---|---|---|
| `agent-lab-build-spec.md` | the original v1 brief | lowest |
| `agent-lab-v2-spec.md` | the v2 changes, after the first iPad test | **beats the build spec** |
| `asset-guide.md` | every image, voice line and sound, with filenames | **beats both, for assets** |

Read all three before changing anything. Section numbers (§3, §7, §8…) are
referenced throughout the code comments; a bare § means the v1 build spec, and
"v2 §" means the v2 spec.

## How to work on this project

- **The user is a beginner programmer.** After each milestone: explain in plain
  language what was built, how the files fit together, and the logic behind it;
  explain any new syntax briefly; comment the code generously.
- **Build one milestone at a time** (spec §10), then stop for testing. Do not
  jump ahead to the next milestone unless asked.
- **Plain HTML, CSS and JavaScript only.** No frameworks, no build step, no npm,
  no external libraries, CDNs, Google Fonts or analytics. Everything is local.
- **Never make network requests** except loading the app's own files **and its
  own `assets/`** (v2 §1). The app never calls an AI, image or voice service.
- **Local asset files are allowed now** (v2 §1), which amends §4, §13 and the
  old "sounds are generated, never loaded" rule. A file is used if it exists;
  otherwise the app uses the stand-in. **The app must work fully with an empty
  `assets/` folder** — test it both ways before calling a milestone done.
- **The data model changes in v2 §6 are approved.** Anything beyond them still
  needs asking.
- **The app never interprets a child** (v2 §12). No scores, no inferred
  feelings or labels, no suggestions based on what a child chose. It records
  what the child did, in order, and that record is the research data.
- Test logic against iPad Safari quirks (§9) before declaring something done.
- Actually run it and drive it before saying it works. See "Testing" below.

## Non-negotiables (spec §3)

- All data stays on the iPad in IndexedDB. No accounts, no server, no cloud,
  no analytics.
- **No camera access, ever.** Microphone only in the Voice mission (Mission 4).
- **Codenames only.** Never ask for or store a real name.
- The Content-Security-Policy meta tag in `index.html` must stay. Note it
  forbids inline `<script>` and `onclick=""` — wire everything up with
  `addEventListener`.
- Never commit exported data, recordings, or screenshots of children's work.

## Do not add (spec §12)

Points, scores, leaderboards, timers (apart from the 10-second recording limit),
camera access, accounts, cloud sync, analytics, AI or online voice services,
external fonts or libraries, or text-heavy instructions.

## Files

| File | What it does |
|---|---|
| `index.html` | Every screen as a `<section>`; one visible at a time |
| `style.css` | Look and feel, layout, motion settings |
| `app.js` | Navigation, missions, state, event log, adult panel, Mission 1 editor |
| `storage.js` | IndexedDB wrapper (agents, audio blobs, settings) |
| `audio.js` | Microphone, 10s recorder, playback filters, sound effects |
| `effects.js` | Particles on one canvas, and the screen shake (§5a) |
| `assets.js` | Pictures, narration and sounds, each with a stand-in (v2 §5.0) |
| `sw.js` | Service worker: caches the app so it runs offline |
| `manifest.json` | PWA settings (name, standalone, icons) |
| `assets/manifest.json` | **Generated** from `asset-guide.md`; never hand-edit |
| `icons/make-icons.py` | Draws the three app icons; re-run if you change them |
| `tools/sync-assets.py` | Rebuilds `assets/manifest.json` from the asset guide |
| `tools/bring-in-assets.py` | Files `assets/incoming/` into place, resized |
| `README.md` | Deploy steps, iPad setup, test checklists |

v2 §1 also allows `parts.js` (V2) and `stickers.js` (V2) when those milestones
arrive. **Authoring tools live in `tools/`**: they run on Filip's computer, may
call online services, and the app never loads anything from them.

`app.js` is numbered into sections with comment banners (1. CONFIG, 2. STATE …
14. MISSION 1). Keep adding numbered sections rather than new files — the spec's
file list (§4) only allows `audio.js` and `effects.js` to join, in later
milestones.

Script load order: `storage.js`, `audio.js`, `effects.js`, `assets.js`,
then `app.js`.
All four carry a `?v=` cache-buster in `index.html`; **bump it on every
release** or an iPad will keep running the old JavaScript against new HTML.

## Progress

- **Milestone 0 — done.** Skeleton: all screens, navigation, Stamp it / Pass /
  progress strip / back, codename roller, IndexedDB auto-save, adult panel
  (hold logo 3s, PIN `2468`) with agent list, export and settings.
- **Milestone 1 — done.** Mission 1: three doors (Pixel built; Build and Draw
  are Milestone 7), 16×16 pixel editor with 16 colours, eraser, flood fill,
  undo, clear, line interpolation for fast strokes; sticker layer with six
  category tabs, drag-from-tray and tap-to-centre, select / resize / rotate /
  remove. Preview thumbnail shows the live agent.
- **Milestone 2 — done.** Mission 2: the Boost. Entering copies the Cover once
  (only into an empty Boost); the Cover stays beside it as a thumbnail. The
  editor is a *single* block in `index.html` that `moveEditorTo()` moves
  between the Mission 1 and Mission 2 mounts, so there is only ever one copy to
  keep correct. Adds a Powers sticker tab (Boost only), aura (CSS drop-shadow)
  and six CSS-gradient backgrounds. Also fixed a Milestone 1 bug: tapping a
  sticker to select it used to drag it under the finger — there is now an 8px
  threshold and the grab offset is kept.
- **Milestone 3 — done.** Mission 4: the voice password. New file `audio.js`
  holds everything to do with sound — the microphone, the 10-second recorder,
  and the six playback filters as Web Audio graphs. The raw recording plays
  first, and only then do the six voices appear. Tapping a voice plays it and
  chooses it. Re-record replaces the clip and deletes the old blob. Includes
  the optional Yes ×3 bonus slots. `Storage.deleteAudio()` added.
- **Milestone 4 — done.** Mission 3: the secret feeling code. The blank tile
  comes first; "Need ideas?" reveals the six faces only when asked, and the
  event log proves the order (`draw_stroke` before `need_ideas_open`). Up to
  three codes, each a PNG data URL from a small drawing canvas, with an
  optional recorded name, an optional face, and a movement the child picks.
  Then "which one is your agent wearing today?", with None as an equal choice.
  Brought in the five `.move-*` classes from §5a, previewed on the thumbnail
  only — the rest of §5a still waits for Milestone 8.
- **Milestone 5 — done.** Missions 5 and 6. Mission 5: five place cards that
  flip over (`rotateY` with `backface-visibility`) to five big on/off switches
  — **everything off by default, and there is no "share everything" shortcut**.
  The front of each card then shows what is going there. Mission 6: three rule
  cards, each taking tapped icons, a drawing, or a recording — no typing
  anywhere. The drawing uses a shared sheet (`#draw-overlay`) that borrows
  Mission 3's brush by pointing `coder.canvas` at its own canvas; Milestone 8's
  🧩 Something's missing popup should reuse that sheet rather than add another.
- **Milestone 6 — done.** The Reveal ID card: codename, Cover and Boost, the
  worn feeling code, a ▶️ that plays the voice password in its chosen filter,
  and the rule icons. **Save card** renders the card again by hand onto a
  canvas (`drawCardToCanvas`) and shares it with `navigator.share({files})`,
  falling back to a download link. Pictures are loaded when the Reveal opens,
  not on the tap, because Safari only allows `share()` straight off a gesture.
- **Milestone 7 — done.** The other two Mission 1 doors. **Build**: a tray of
  seven shapes dragged onto the stage, each selectable and changed with
  buttons (bigger, smaller, turn, front, back, colour, remove) rather than
  pinch gestures, drawn as SVG in a 100×100 viewBox. **Draw**: a 640×640
  canvas using the shared brush, with three thicknesses and a 🪞 mirror, saved
  as `drawingPng` after every stroke. Only the chosen door's rail tab is
  offered, and `clearAll()` clears only that door. The ID card draws all three.
- **Milestone 8 — done.** New file `effects.js` (particles on one canvas,
  capped at 80, plus the screen shake). Sound effects are *generated* with
  oscillators in `audio.js` — nothing is loaded, because §4 allows no files.
  🧩 Something's missing is real now and on every screen, saving a drawing
  and/or a recording against the screen it came from. 🔊 speaks the prompt,
  preferring `audio/<mission>.m4a` if a facilitator records one and falling
  back to `speechSynthesis`. §5a: idle bob, tap reactions, voice-driven
  bounce (AnalyserNode RMS, lerp 0.3), the 2.5s Boost power-up with ✨ replay,
  scanner sweep, decrypting titles, shimmering locks, tilting doors, and the
  Reveal finale — all skippable, all honouring Full / Calm / Off.
- **Milestone 9 — done.** `manifest.json`, `sw.js`, and three icons drawn by
  `icons/make-icons.py` (pure stdlib: zlib writes the PNG by hand, because
  there is no image library here either). The service worker caches the app
  shell and serves cache-first; a new version **waits** rather than taking
  over, and a small "New version ready" banner lets an adult choose the
  moment. The adult panel reports whether offline is actually working.

**All nine v1 milestones are built.** v2 then rebuilt the foundations:

- **v2 V0 — done (4 October 2026).** Foundations for the v2 missions.
  - **Bug fixes (v2 §4).** The stranded sticker ghost — the floating dog in
    every test screenshot — is fixed: drags listen on `window`, have one
    clean-up function called from every exit, and `leaveCurrent()` sweeps up
    leftovers. The aura now covers Build shapes and Draw drawings, not just
    pixels and stickers. The codename "Say it" button is gone.
  - **The asset system (v2 §5.0).** `assets/manifest.json` is generated from
    `asset-guide.md` by `tools/sync-assets.py` — 171 items. `assets.js` serves
    pictures, narration and sounds, each with a stand-in, and **everything
    works with an empty `assets/` folder**. The service worker caches assets
    one at a time, ignoring failures. Adult panel → Asset check lists every
    item ✅ or ⚠️.
  - **Data model v2 (v2 §6)** with `migrateAgent()`, which runs on every load,
    is safe to run twice, and never deletes: v1 fields are kept in `legacy`.
  - **Word mission ids (v2 §3):** `make`, `powerup`, `hq`, `voice`, `field`,
    `mood`, `rules`, `badge`. `hq` and `field` are honest "coming soon"
    placeholders until V4 and V7; the rest keep their v1 screens.
  - **Session, unlocks and practice mode (v2 §3),** with `session` and
    `practice` on every event.
- **Next: v2 V1 — Codename and gallery** (v2 §5.1 and §5.2).


## "Bring in the new assets" (v2 §5.0)

When Filip says this, run:

```bash
python3 tools/bring-in-assets.py --dry-run   # check the matches first
python3 tools/bring-in-assets.py             # then do it
```

It matches each file in `assets/incoming/` to a manifest id by its filename
(ignoring case, spaces and `(1)` suffixes), converts it with `sips` — scenes
to JPEG at 1024px/quality 80, stickers to PNG at 512px with transparency —
moves it to its exact manifest filename, and reports what is still missing.

Then, by hand:
1. **Check anything it could not match.** It never guesses; filing a picture
   under the wrong id is worse than leaving it in the inbox.
2. **Check the sticker transparency warnings.** A painted checkerboard or a
   white box only shows up on the iPad, by which time it is too late.
3. **Bump `CACHE_VERSION` in `sw.js` and every `?v=` in `index.html`,** or the
   iPads will not pick the new files up.

**"Sync the asset list"** means `python3 tools/sync-assets.py`, which rebuilds
`assets/manifest.json` from `asset-guide.md`. The guide is the source: never
hand-edit the manifest, and never edit both.

## Settled decisions

- **Grid size (2 October 2026): 16×16 stays, at ~33px cells.** Spec §7 wants at
  least 40px, but the chrome §6 requires leaves only ~526px on an iPad. The
  user chose to keep the spec's 16×16. Changing `GRID` later is a one-line
  change but **wipes pixel art already saved**, so it must not happen
  mid-session.

## Conventions in this codebase

### v2 conventions (from V0)

- **Every drag listens on `window`, not on the element that started it**, has
  ONE clean-up function called from `pointerup`, `pointercancel` AND
  `lostpointercapture`, and anything parked on `<body>` is swept up by
  `clearDragLeftovers()`. This is what the stranded ghost cost us; use the
  same shape for every new drag (v2 §4.1).
- **`migrateAgent()` runs on every load**, including the adult panel's list
  and the export. It only ever fills in what is missing, so it is safe to run
  twice, and it never deletes — old fields go to `legacy`.
- **Nothing in `assets.js` ever throws.** A missing file is a normal state,
  not an error: `Assets.image()` resolves to `null`, `Assets.say()` speaks,
  `Assets.sfx()` plays the generated sound.
- **Asset existence checks ask the server fresh.** The Asset check is pressed
  right after new files are dropped in, so a cached "missing" would tell Filip
  a file is absent when it is sitting there.
- **Mission ids are words**, and `MISSIONS` is the only list of them.
  `blankMissions()` builds the per-agent record from it, so adding a mission
  means touching one array.
- **A mission is open if its session has come AND an adult has not switched it
  off** — `missionIsOpen()`. A mission the child has already worked on stays
  open whatever the setting; nobody is locked out of their own work.
- **Sounds go through `Assets.sfx('sfx-…')`**, which uses Filip's file if it
  exists and `Voice.sfx()`'s generated sound if not.
- **Narration goes through `Assets.say('nar-…')`**, which uses the recording
  if it exists and `speechSynthesis` if not. `[whispers]` is a tag for the
  voice service and is stripped before speaking.


- Data model lives in spec §8 and is created by `makeAgent()` in `app.js`.
  Pixels are a flat 256-entry array (`null` = empty square). Stickers store
  position as fractions 0–1 so they survive rotation and screen size changes.
- Every meaningful action appends to `agent.events` via `logEvent()`. This log
  **is the research data** — when adding a feature, add its events too. Painting
  logs one event per finger lift, never per cell.
- Auto-save is debounced ~500ms via `scheduleSave()`. There is no Save button.
- Use Pointer Events (`pointerdown/move/up`), not mouse or touch events.
  Wrap `setPointerCapture` in try/catch — it throws if the pointer has gone.
- Minimum touch target 64×64px. Every button: an icon plus at most one or two
  words.
- Use `100dvh`, never `100vh`.
- **⚠️ On every release, bump BOTH `CACHE_VERSION` in `sw.js` AND the `?v=`
  on all five links in `index.html`, and keep the `?v=` in `sw.js`'s
  `APP_FILES` identical to the HTML's.** A service worker caches URLs, so
  `app.js` and `app.js?v=9` are different files to it. Get this wrong and
  iPads keep running the old app, or cache a version that never loads.
- **Sounds are generated, never loaded.** `Voice.sfx(name)` builds each one
  from an oscillator or a noise buffer, because §4 allows no files and §3 no
  downloads. Add new sounds to the `SFX` table in `audio.js`.
- **Animation is gated on `fullMotion()`**, which reads `body[data-motion]`.
  Anything showy must check it, or the adult panel's Calm and Off settings
  stop meaning anything.
- **`hidden` is an HTML property, not an SVG one.** `svg.hidden = true` sets a
  JavaScript property and leaves the attribute alone, so the `[hidden]` CSS
  rule goes on hiding it. Use `setAttribute`/`removeAttribute` on SVG.
- **A drag handler must not rebuild the thing it is attached to.** Both the
  sticker drag and the shape drag update the selection highlight in place
  (`paintSelection`, `paintShapeSelection`) rather than re-rendering, or the
  element the listeners live on is destroyed on the first move.
- **`.sticker-layer` is `pointer-events: none`** with `auto` on the stickers
  themselves, because it covers the whole stage and the Build door's shapes
  sit underneath it.
- **The ID card is drawn twice.** Once as DOM for the screen, once onto a
  canvas in `drawCardToCanvas()` for the saved PNG, because no HTML-to-image
  library is allowed (§4). Change one and you must change the other. Pixels go
  through a 16×16 offscreen canvas scaled up in a single `drawImage` — drawing
  256 squares individually gave each one its own aura shadow and left a grid
  of seams across the agent.
- **One brush, many canvases.** `coder.canvas` says which canvas the drawing
  code is painting on; `attachBrush(el)` wires a canvas up. Anything that logs
  a stroke must tag it (`draw_stroke` carries `where`), or the research log
  cannot tell a feeling code apart from a drawn rule.
- **A row that must stay reachable does not belong inside a scrolling column.**
  Mission 3's Keep it / Remove row sits in `.m3-side` *beside* the scrolling
  `.m3-tools`, because `margin-top:auto` inside a scroller pins a row to the
  scroll edge, where the Stamp it bar clips it. Both orientations were only
  right after this change — check portrait AND landscape for any new panel.
- **Sound only starts inside a tap** (spec §9). Every path that makes noise
  calls `Voice.unlock()` from a real click handler first. `leaveCurrent()`
  stops recording and playback, so nothing follows the child to the next
  screen — and stopping the recorder is what releases the microphone.
- **There is one editor, not one per mission.** `#editor` in `index.html` is
  moved between `#m1-editor-mount` and `#m2-editor-mount` by `moveEditorTo()`.
  Moving a DOM node keeps its listeners, so everything stays wired. Which half
  of the agent it edits is `editor.part` (`'cover'` or `'boost'`), and `part()`
  / `ensurePixels()` / `stage()` go through that. Missions 3–6 call
  `hideEditor()`. Build and Draw (Milestone 7) should extend this editor rather
  than add a second one.

## Testing

No test framework. Verify by running it:

```bash
cd ~/Documents/TACT/agent-lab && python3 -m http.server 8000
```

Then drive `http://localhost:8000/` in a browser — click through it, check the
console, and read back from IndexedDB to confirm what was actually saved.
It must be served over http, not opened as a file.

Real-iPad testing over Wi-Fi is in `README.md`; the microphone and service
worker will need the https GitHub Pages URL from Milestone 3 / 9 onwards.

## Hosting

Repo: https://github.com/filipgri/agent-lab (public, as free GitHub Pages
requires). All paths in the app are relative, so it works at any base URL.
The adult PIN is visible in public code on purpose — a speed bump, not security.
