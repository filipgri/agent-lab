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
| `stickers.js` | The sticker library and its forgiving keyword search (v2 §5.3.2) |
| `parts.js` | The 85-part kit: heads, faces, hair, bodies (v2 §5.3.1) |
| `tools/parts-sheet.html` | Every part in every palette, for review before a session |
| `sw.js` | Service worker: caches the app so it runs offline |
| `manifest.json` | PWA settings (name, standalone, icons) |
| `assets/manifest.json` | **Generated** from `asset-guide.md`; never hand-edit |
| `icons/make-icons.py` | Draws the three app icons; re-run if you change them |
| `tools/sync-assets.py` | Rebuilds `assets/manifest.json` from the asset guide |
| `tools/bring-in-assets.py` | Files `assets/incoming/` into place, resized |
| `tools/make_audio.py` | **Supplied by Filip.** Makes the narration and sounds with ElevenLabs. Do not write another — keep this one working |
| `README.md` | Deploy steps, iPad setup, test checklists |

v2 §1 also allows `parts.js` (V2) and `stickers.js` (V2) when those milestones
arrive. **Authoring tools live in `tools/`**: they run on Filip's computer, may
call online services, and the app never loads anything from them.

`app.js` is numbered into sections with comment banners (1. CONFIG, 2. STATE …
14. MISSION 1). Keep adding numbered sections rather than new files — the spec's
file list (§4) only allows `audio.js` and `effects.js` to join, in later
milestones.

Script load order: `storage.js`, `audio.js`, `effects.js`, `assets.js`,
`stickers.js`, `parts.js`, then `app.js`.
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
- **v2 V1 — done (4 October 2026).** Codename and gallery.
  - **Two reels with locks (v2 §5.1).** Word and animal spin separately, one
    stopping after the other; a 🔒 under each keeps that reel, so a child who
    likes "Bear" re-rolls only the word. The emoji is the hero at 160px and
    speaks the name when tapped. Words are 46px, bold, 0.06em letter-spacing,
    sentence case — §5.1's dyslexia rules, which is why this screen has
    nothing else on it.
  - **Type your own (v2 §5.1).** A 20-character field, placeholder "Make up a
    spy name", never a real name. Matching emblems appear as big tiles *while*
    the child types; a word with no sticker becomes a `request` and shows
    "📡 Request sent to HQ". With no pick, the emblem is 🕵️.
  - **New file `stickers.js`** — 98 emoji with keywords, plus the 13 picture
    stickers merged from the asset manifest. Search is forgiving: exact,
    prefix, plural, and one wrong letter in words of four or more.
  - **The gallery (v2 §5.2).** Every agent on this iPad as its emblem and
    codename only. Tapping one reopens it where it left off and logs
    `agent_open`. Practice agents are labelled.
  - **★ Me** is the first sticker tab and holds the child's emblem, so they
    can put their symbol on the agent like a logo.
- **v2 V2 — done (5 October 2026).** The parts kit and the sticker library.
  - **New file `parts.js`: 85 SVG parts** across ten categories, meeting every
    minimum in v2 §5.3.1 — including all sixteen hairstyles (afro, afro puffs,
    cornrows, box braids, locs, twists…) and all seven head coverings (hijab,
    turban, headscarf, beanie, cap, hood, headband), plus hearing aids,
    a cochlear implant processor and ear defenders as ordinary ear options.
  - **Tapping snaps to the head.** A face part lands where it belongs on the
    most recently added head, scaled to it — which is what makes "a face in
    under a minute" true. Seven taps builds a face.
  - Parts live in the same `shapes` array as the v1 shapes, so undo, the
    Power-up copy and the card renderer all got them for free.
  - **The Build door is now Parts**; the seven v1 shapes live in its Shapes
    category and still work. (Renamed in the data too, after V3 — see below.)
  - **The sticker tray is the full library** from `stickers.js`: fourteen
    tabs, ★ Me first, 🔍 Search with requests, and picture stickers that
    appear when their files arrive.
  - **New review page `tools/parts-sheet.html`** shows all 85 in any palette.
- **Assets, first batch (5 October 2026).** All 35 pictures are in: 12 HQ
  places, 10 situation cards, 13 stickers. The app icon is now Filip's own
  artwork — `icons/make-icons.py` resizes `assets/img/ui/ui-app-icon.png` when
  it is there, and only draws its own icon when it is not.
  - **The agent now stands in its HQ** (v2 §5.5): the chosen place is the
    background on the stage, the preview and the card. The Power-up screen's
    Place tab offers all twelve photographs. V4 still owns the full HQ mission
    — "where is your agent strongest?", draw-your-own, the landing — but the
    choice is already saved as `hq.id`, so V4 inherits it.
  - The 10 situation cards are still unseen until **V3** builds Power-up
    step 3, which is the first screen that uses them.
- **v2 V3 — done (5 October 2026).** The Power-up, replacing the v1 Boost.
  Three steps on one screen, each with its own 🔊 line and a ➡️ to skip.
  1. **Make up a power** — a blank canvas first, with an optional 🎤. The ten
     idea tiles are *not rendered at all* until the child taps **Need ideas?**,
     and `ideas_open` carries `drawnFirst`, so the log answers the research
     question on its own: did the child invent before being offered a list?
  2. **What does it look like?** — ten effects, each played on the agent the
     moment it is tapped, with its sound. An idea brings its default effect
     (`idea-fly` → `fx-float`); changing it logs `power_effect_choose`.
  3. **When does your agent use it?** — the ten situation photographs, any
     number, each speaking its label when tapped, plus ✏️ **My own**.
  The ten effects are CSS animations in `style.css`, all gated on
  `fullMotion()`; `fx-stomp` shakes by ≤3px, as §5.4 requires.
- **v2 V4 — done (5 October 2026).** The HQ: "where is your agent
  strongest?" The agent stands on the left in whatever place it has; the
  twelve photographs are two rows on the right — six real, six make-believe,
  in §5.5's order — and tapping one drops the agent in with a small landing
  (`hq-land`, 620ms, gated on `fullMotion()`).
  - **✏️ Draw my own** reuses V3's shared ✏️ sheet through `openOwnCard`'s
    `onKeep` hook, rather than adding a second sheet. The drawing is saved as
    `hq.png` — a field the model had carried since V0 that nothing used.
  - **A drawn place is an HQ like any other**: `setHqBackdrop()` and
    `preloadCardAssets()` now fall back to it, so it shows behind the agent on
    every screen and on the saved card, exactly as a photograph does.
  - Choosing a photograph clears a drawing and the other way round — including
    from the Power-up's Place tab, which is a shortcut to the same choice.
  - **Nowhere is an equal option**, not a way of undoing a mistake.
- **v2 V5 — done (5 October 2026).** Voice, the session-2 card and the seal.
  - **§5.6 "Say it 3 ways".** The v1 "Yes ×3" bonus is now three slots with
    hint icons — 📢 big, 🤫 small, ❓ asking. The slot is logged by its *way*,
    not its number (`three_ways_record {slot: 'big'}`), because "yes2" answers
    no research question.
  - **§5.11 Badge check.** The badge face renders at 320×240 and is shown at
    the size it will really be — 49 × 37 mm, from `state.badgePpi` (an adult
    setting, default 132). It is meant to look tiny; that is the answer. 🔍
    blows the same pixels up with no smoothing. Works before the badge
    mission exists, using the default layout §5.11 describes.
  - **§5.11 Wall check.** 800×480, dithered with Floyd–Steinberg to the
    e-paper palette — Spectra 6 by default, 7 colours optional, an adult
    setting. Verified to produce exactly 6 (or 7) distinct colours.
  - **§5.2 The seal.** Three symbols in order from nine. A sealed tile in the
    gallery shows 🔒 and asks before opening. A wrong try shakes and clears —
    **no counter, no lock-out** — and "Ask a grown-up" opens any file with the
    panel PIN, so a child who forgets can never lose their own work.
- **Next: v2 V6 — Exports for the build team** (v2 §5.12) and moving agents
  between iPads (§5.2).

**→ Session 2 is now buildable end to end.** §10 asks for a full run on a real
iPad in about 13 minutes before the session.


## Audio: `tools/make_audio.py` (v2 §10, T1)

**Filip supplies this script. Never write another one.** It reads the tables
in `asset-guide.md` §4.5 and §4.6 *directly* — not the manifest — and writes
straight to `assets/audio/narrator/<id>.mp3` and `assets/audio/sfx/<id>.mp3`
under the exact manifest names. **So audio normally bypasses "bring in"
entirely**; only hand-made audio goes through that tool.

If the shape of those two tables ever changes, update the script's
`read_guide()` to match, and check it still agrees with the manifest:

```bash
python3 tools/sync-assets.py        # rebuild the manifest from the guide
```

Its default model is `eleven_v4`, which understands `[whispers]` and has no
speed setting — which is why the app slows narration itself (§7).

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

### v2 conventions (from V3)

- **Reachable is not the same as discoverable.** On a landscape iPad
  (1180×734) the start screen's gallery began at y=789 — entirely below the
  fold, with nothing on screen to hint it existed. V1 had made it scrollable
  and called that fixed; a whole iPad test session was lost to it, because a
  half-empty start screen looks like a broken app, not a scrollable one. On a
  wide, short screen the gallery now sits **beside** the roller via grid
  areas, so a child sees their own agent the moment they arrive. Check new
  layouts at **1180×734**, not just at portrait and at desktop sizes.
- **`boot-guard.js` loads first and is the app's black box.** It catches
  errors, builds its own banner rather than trusting index.html, and — the
  part that matters — watches for SUCCESS: `app.js` sets `__agentLabReady`
  at the end of boot, and if that has not arrived in six seconds the guard
  reports anyway. `?diag=1` shows the same report on a healthy app, which is
  how to tell which version an iPad is really running. A reporter that lives
  inside `app.js` cannot report `app.js` failing to load or parse.
  **It is silent otherwise** — faults are recorded and written to the console,
  never shown. A red block of stack trace across a child's screen is its own
  failure: §12 rules out text-heavy UI, and there is nothing a nine-year-old
  can do with it except feel they broke something.

- **`renderAgentView()` takes an `owner`.** `data` is only half an agent (a
  cover or a look); the HQ and the door live on the whole agent, and the
  function used to reach for `state.agent` — which was right everywhere until
  the gallery started drawing *other people's* agents. Pass the owner when
  drawing an agent that is not the open one, or it borrows the open agent's
  place and door.
- **Codenames are not unique, and the gallery must cope.** 24 adjectives ×
  24 animals = 576, so in a group of 20 two children share a codename about
  a quarter of the time — more once anyone types their own. Clashing tiles
  show the agent itself instead of the emblem, because a child knows their
  own drawing on sight. Tiles with a name of their own are unchanged (§5.2),
  and a clash between agents with no art yet keeps the emblems rather than
  showing two empty boxes.

- **An event about an agent that is not `state.agent` needs
  `logEventOnAgent()`.** `logEvent()` writes to the agent in memory and leaves
  the debounced save to catch up — but opening a sealed file replaces
  `state.agent` with a fresh copy from storage, which threw the event away
  before the save ran. The log recorded every failed unseal and never a
  successful one. Anything logged against another agent must be written onto
  that record and saved there and then.
- **The card's bottom bar wraps.** It carries five buttons from V5 and an
  iPad mini is 744 CSS px, where one line does not fit. Nothing in that bar
  may become unreachable — Finish least of all.

- **An animation's clean-up is a timer, not `animationend`.** The HQ landing
  runs on four layers and only the visible ones fire the event at all — and
  none of them fire while the tab is in the background, which would leave
  `is-landing` stuck on the stage for the rest of the session. `HQ_LAND_MS`
  is kept beside the rule it mirrors in `style.css`.
- **The ✏️ sheet is shared, and takes an `onKeep`.** `openOwnCard({title,
  say, onKeep})` is how HQ draws its own place and how the Power-up keeps its
  own situation card. Anything else that needs "draw it or say it" uses the
  same sheet rather than adding another.

- **The doors are `parts`, `pixel` and `draw`** (v2 §5.3), in that order on
  screen. The stored value, the `door_choose` event and the rail id all say
  `parts`; nothing says `build` any more except the one line in
  `migrateAgent()` that renames it. That line sits **before** the
  `schemaVersion === 2` early return, because agents made during V0–V3 are
  already v2 and may still say `build` — and `renderAgentView()` only draws
  shapes for `parts`, so one that missed it would quietly lose its face.
- **A card's id is also its voice line.** v2 §7 gives every picture card a
  `nar-` plus its id, so an id that drifts from the asset guide silently
  loses its narration: `nar-door-parts.mp3` had been sitting unplayed because
  the door was called `build`. When naming anything a child can tap, check
  `asset-guide.md` first.

- **A renamed field has to be chased into every screen that read it.**
  `migrateAgent()` moves v1 fields into `legacy`, and three missions in a row
  have now crashed because they still reached for the old path —
  `feelingCodes`, `yesClips`, and `places` (which V8 replaces with Badge &
  poster, so the v1 screen now reads `legacy.places` through `placesStore()`).
  After renaming anything in §6, grep for the old name across `app.js`.
- **`min-height: 0` matters as much as `min-width: 0` in a flex column.**
  A flex item defaults to `min-height: auto` and refuses to shrink below its
  content, so the Power-up's three steps pushed past the screen instead of
  letting `.power-steps` scroll, and `body { overflow: hidden }` clipped the
  rest. `.mission-body` had `min-width: 0` but not `min-height: 0`. Portrait
  broke; landscape looked fine — **always check both.**
- **A child's own work never disappears on one tap.** A kept ✏️ My own card
  asks first: one tap arms it (it turns red and says "Remove?"), a second
  within three seconds removes it, and it disarms itself otherwise. No dialog
  — §12 rules out text-heavy UI — and the whole 136px card stays the target.

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
- **Narration speed is one setting in two places** (v2 §7). `Assets.setSpeed()`
  applies it as `playbackRate` with `preservesPitch` (plus the `webkit-` and
  `moz-` spellings) so the voice does not turn into a chipmunk, AND as
  `utterance.rate` on the `speechSynthesis` stand-in — a line without a
  recording must be read at the same pace as one with. Default 0.9×.
- **Narration goes through `Assets.say('nar-…')`**, which uses the recording
  if it exists and `speechSynthesis` if not. `[whispers]` is a tag for the
  voice service and is stripped before speaking.
- **Sticker search ranks, it does not just filter.** An exact word beats a
  prefix beats a typo, and a sticker whose LABEL is the word beats one that
  merely lists it as a keyword — otherwise typing "ninja" offered a karate
  belt first. Children do not scroll past wrong answers.
- **A part is SVG in a 100×100 box centred on 50,50** (v2 §5.3.1). `class="tint"`
  takes the child's colour; everything else keeps its own fill, which is how
  eye whites stay white. The outline is set once in CSS on `.part-group`, with
  `vector-effect: non-scaling-stroke` so a big head does not get a crayon
  border. Add a part to `parts.js` and it appears — nothing else to touch.
- **Voluminous hair is a ring, not a disc.** An afro drawn solid covered the
  whole face. Big hair uses `fill-rule="evenodd"` with the face cut out.
- **The saved card RASTERISES the same SVG the screen draws.** v1 redrew each
  shape with canvas calls; at 85 parts that would mean describing every one
  twice and watching the two drift apart. `shapesToSvgUrl()` serialises the
  layer, and `preloadCardAssets()` loads it before Save can be pressed.
- **Any screen that can grow must scroll.** The Start screen is centred while
  it fits and scrolls once the gallery is there; with a full iPad the gallery
  was pushed off a screen that could not scroll, so a child could reach
  neither their agent nor any way to find it. Check this for every new list.


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
- **`index.html` is fetched network-first; everything else is cache-first.**
  Every other file carries a `?v=` so a release is a new URL and a stale one
  cannot be served — but `index.html` *carries* those numbers and has none of
  its own, so it was the one file a browser could keep forever. A cached copy
  means old `?v=` links, which means the whole app stays on an old version
  however often it is reloaded. An iPad sat on v=38 through two releases
  because of this, and it looked like three different bugs. Offline still
  works: a page request falls back to the cached copy.
  **To force a stuck iPad past it, add any unique query to the address**
  (`…/agent-lab/?fresh=1`) — that misses every cache and fetches fresh.
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
