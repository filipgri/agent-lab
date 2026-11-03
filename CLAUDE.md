# Agent Lab — working notes for Claude

An iPad web app where children design a spy "agent" avatar, step by step.
Built for a school design club research session (TACT, WP1, Dawn House Design Club).

## Read this first

Four files are the brief, and they stack. `DATA.md` is the record of what
the app actually saves:

| File | What it is | Wins when they disagree |
|---|---|---|
| `agent-lab-v3-spec.md` | v3: powers and the bottle (session 3 on) | **beats both specs** |
| `agent-lab-v2-spec.md` | the v2 changes | beats the build spec |
| `agent-lab-build-spec.md` | the original v1 brief | lowest |
| `asset-guide.md` | every image, voice line and sound | **beats all three, for assets** |
| `DATA.md` | every saved field and logged event | must always match the code |

Read all of them before changing anything. Section numbers (§3, §7, §8…) are
referenced throughout the code comments; a bare § means the v1 build spec,
"v2 §" the v2 spec and "v3 §" the v3 spec.

## How to work on this project

- **The user is a beginner programmer.** After each milestone: explain in plain
  language what was built, how the files fit together, and the logic behind it;
  explain any new syntax briefly; comment the code generously.
- **Build one milestone at a time** (spec §10), then stop for testing. Do not
  jump ahead to the next milestone unless asked.
- **Plain HTML, CSS and JavaScript only.** No frameworks, no build step, no npm,
  no external libraries, CDNs, Google Fonts or analytics. Everything is local.
- **Never make network requests** except loading the app's own files **and its
  own `assets/`** (v2 §1), and — from v3 P1 — sending a bottle the child chose
  to send to the relay (v3 §9). The app never calls an AI, image or voice
  service.
- **Local asset files are allowed now** (v2 §1), which amends §4, §13 and the
  old "sounds are generated, never loaded" rule. A file is used if it exists;
  otherwise the app uses the stand-in. **The app must work fully with an empty
  `assets/` folder** — test it both ways before calling a milestone done.
- **The data model changes in v2 §6 and v3 §10 are approved.** Anything
  beyond them still needs asking.
- **`DATA.md` is updated in the same commit as any field or event it
  describes** (v3 §1). It is part of the research record.
- **The app never interprets a child** (v2 §12). No scores, no inferred
  feelings or labels, no suggestions based on what a child chose. It records
  what the child did, in order, and that record is the research data.
- Test logic against iPad Safari quirks (§9) before declaring something done.
- Actually run it and drive it before saying it works. See "Testing" below.

## Non-negotiables (spec §3)

- All data stays on the iPad in IndexedDB, with one exception (v3 §9). When a
  child sends a bottle, that bottle and nothing else goes to the relay on
  Filip's laptop over the room's private network. Never the event log, the
  agent record, its id, or other agents. The relay and the display keep
  nothing on disk. No accounts, no cloud, no analytics.
- **No camera access, ever.** The microphone records only when a child taps 🎤.
- **Codenames only.** Never ask for or store a real name.
- The Content-Security-Policy meta tag in `index.html` must stay. Note it
  forbids inline `<script>` and `onclick=""` — wire everything up with
  `addEventListener`. `connect-src` may list `https://*.local:8443` and
  `https://localhost:8443` (the relay) and nothing else.
- Never commit exported data, recordings, or screenshots of children's work.

## Do not add (spec §12)

Points, scores, leaderboards, timers (apart from the 10-second recording limit),
camera access, accounts, cloud sync, analytics, AI or online voice services,
external fonts or libraries, or text-heavy instructions.

And from v3 §17: feeling screens or feeling words (the dunes app owns
feelings); counts, totals, rankings or "most popular" anywhere, including the
display; any network destination except the relay, and nothing sent except a
bottle the child chose to send; reactions to what a child drew, said or
chose; any promise of total secrecy.

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
| `DATA.md` | **v3.** Every saved field and every logged event. Must match the code |
| `boot-guard.js` | Loads first: catches errors, heals a stale cache (see Conventions) |
| `version.json` | The release number `boot-guard.js` checks against |
| `display/index.html` | **v3.** The big-screen display, with `display.js` and `display.css`. Bare at P1; P7 builds the shore |
| `display/relay.py` | **v3 P1.** The laptop relay. Python standard library only |
| `display/certs/` | **v3 P1.** The relay's https certificate. **Gitignored** |
| `tools/analyse.py` | **v3 P9.** Exports → CSVs, drawings, recordings and agent cards. Run at home after a session |

v2 §1 also allows `parts.js` (V2) and `stickers.js` (V2) when those milestones
arrive. **Authoring tools live in `tools/`**: they run on Filip's computer, may
call online services, and the app never loads anything from them. v3 adds the
`display/` folder, which runs on Filip's laptop during a session.

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
  (hold logo 3s, PIN `0502`) with agent list, export and settings.
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
- **v2 V6–V9 were never built: v3 replaced them.** Session 2 ran on commit
  `b0ba4c1` (to be tagged `session-2`).

### v3 (agent-lab-v3-spec.md)

Session 3 onwards. Five missions: 🎨 `make` · 🗣️ `suit` · 📍 `safe` (off in
the session-3 preset) · ⚡ `powers` · 🍾 `bottle`, then a short finish and back
to the start. No card screen.

- **P0 — done (3 November 2026), on branch `v3`.** Clearing the ground.
  - The `session-2` tag (commit `b0ba4c1`) was missing when P0 started, so P0
    was built on a local branch. Tagged and pushed the same day, at Filip's
    go-ahead.
  - **Retired the v2 screens** (Power-up, HQ as a mission, Voice, Force field,
    Mood codes, Rules, Badge, the Reveal card, the 🧩 popup, badge and wall
    checks) from `MISSIONS`, `index.html` and `app.js`. **Their data stays** in
    every record and every export. Kept: `renderAgentView`,
    `drawAgentToCanvas`, `shapesToSvgUrl`, all three doors, the brush, the
    ✏️ sheet (`openOwnCard`), the seal, and the HQ screen (section 27 of
    `app.js` and its panel in `index.html`), which P4 turns into Safe place.
  - **`MISSIONS` is the five v3 missions.** `defaultOn: false` keeps Safe
    place off unless an adult switches it on. `DEFAULT_SESSION` is 3. Each
    new mission is a "coming soon" placeholder with Stamp it and Pass. The
    flow ends with `finishSession()`.
  - **Data model v3** (§10): `fillDefaults()` adds `likeMe`, `base`, `suit`,
    `handshake`, `safe`, `powers`, `bottles` and the four new mission keys,
    and sets `schemaVersion: 3`. v2 mission keys and fields are untouched.
    Exports say `schemaVersion: 3`.
  - **The gallery shows every agent as itself** (§4), not its emblem. A sealed
    agent keeps the emblem and 🔒; one with nothing drawn keeps the emblem. A
    🔊 by "Find your agent" says `nar-v3-gallery`.
  - **Import takes several files**, skips an agent already here unchanged
    (same `createdAt`, event count and last event time — including a copy an
    earlier import made under a new id), copies in a changed one, and reports
    added / skipped / copied.
  - **Asset guide** (§11): retired v2 lines moved to a new §9 "Retired", so
    `make_audio.py` never makes them; 91 v3 narrator lines and 9 sounds
    added; four new picture groups — `powers`, `doors`, `display`, `cards` —
    in the manifest, the Asset check, the service worker (not `display`; the
    iPad never shows those) and `bring-in-assets.py`, which learnt `board`
    (PNG, 1024) and `wide` (JPEG, 16:9 crop, 1920).
  - **`draw_stroke` now names its canvas** (`STROKE_WHERE`). It used to say
    `"rule"` for everything but the feeling code, so session-2 strokes on the
    ✏️ sheet say `"rule"` — DATA.md explains.
  - **`DATA.md`** written: every field and event, including the ones only in
    session-2 and older data.
  - **The seal can be opened but not set** until a v3 screen offers it again.
- **P1 — built (3 November 2026), on branch `v3`; waiting for the real
  iPad test** §14 asks for (home-screen app from GitHub Pages, pocket
  router). That needs v3 deployed to `main`, which is Filip's call.
  - **`display/relay.py`**, standard library only. Routes `/status`,
    `/bottle` (2 MB), `/events` (Server-Sent Events) and the `display/`
    folder; it also serves the app's own `assets/` under `/assets/` (never
    `incoming/` or `reference/`), so the display uses the same pictures and
    sounds without copies. CORS only for `https://filipgri.github.io` and
    `http://localhost:8000`, with the Private Network Access header Chrome
    wants. Listens on IPv6 and IPv4 at once, because an iPad may resolve
    `.local` to either. `--host` is the name the iPads use, not what it
    binds to — binding to the LAN address would break `localhost` for the
    display. `--no-tls` serves plain http for trying the display on the
    laptop.
  - **Event ids carry a random run id** (`3fa9c2d1-5`). Numbers restart at 1
    when the relay restarts, and a display reconnecting with "seen up to 5"
    would otherwise skip the new run's first five bottles.
  - **The bare display** (`display/index.html`, `display.js`,
    `display.css`): one click to allow sound, then each arrival's emblem and
    codename (or a dashed `?` for a mystery) with a chime, one at a time.
    Replayed bottles (a reloaded display catching up) get no chime. F and M
    only; P7 adds the rest.
  - **iPad side: section 29 of `app.js`**, the adult panel's Display link
    card, and the CSP's `connect-src` gaining `https://*.local:8443
    https://localhost:8443`. `relayOrigin()` refuses any address that is not
    `*.local` or `localhost` on 8443 — the same rule as the CSP, so the
    adult sees why rather than a silent block. Every request gives up after
    4 s. **`sendToRelay(payload)` is P6's way in:** it answers true/false
    and never throws.
  - Tested in the browser: every route with curl (CORS, 403 for strangers,
    413 over 2 MB, 404 for `..`, the certs and `relay.py`), the display
    showing bottles in order and catching up after a relay restart, and the
    adult panel's ⚠️ paths. **The ✅ path needs a certificate the device
    trusts,** which only `mkcert -install` gives; that is Filip's README
    step and was not done on this Mac.
  - This Mac's local hostname is `KCLYM40H56Y9W`, not `tact-display`. The
    README gives both routes: rename it, or use `kclym40h56y9w.local`.
- **P2 — built (3 November 2026), on branch `v3`.** Quick agent (§4).
  - **`Parts.BASES` in `parts.js`: eight ready agents** as `cover.shapes`
    lists. They were placed by the app's own `placementFor()` (generated in
    the browser, then pasted in as data), so a part a child adds lands where
    a tap would put it. Skin tones from `#ffe0c4` to `#331e11`; afro puffs,
    straight, curls, locs, box braids, crop; hijab, turban, cap; round and
    square glasses, hearing aids, a cochlear processor. No names, no labels.
  - **Lessons from drawing them:** on the darkest skins, line-drawn eyes and
    a dark mouth vanish — those bases use eyes with whites and a mouth with
    teeth. `body-1/2/3` take the SKIN palette and in a skin colour read as a
    bare torso — every base wears a clothing colour. `ears-big` on a brown
    face drifts towards an old caricature — not used.
  - **`Parts.transform()` and `Parts.drawOrder()`** now hold the part
    transform and the layer order, so `tools/parts-sheet.html` (new **Ready
    agents** button) draws exactly what the app draws. `shapeTransform()`
    and `layerOrder()` in `app.js` call them.
  - **Section 30 of `app.js`.** Make offers the ready agents when the agent
    has `base === null` and nothing on its cover (`shouldOfferBases()`), in
    a 3×3 sheet, **shuffled each time**, Start blank always last. A pick is
    a deep copy, undoable, and opens on Hair (Hats if the head is covered)
    with its colours showing.
  - **"Is your agent like you?"** after Make is stamped, or on opening an
    agent whose Make is not `todo`. **Asked once:** the `like_me_ask` event
    is the record. ➡️ always carries on; no answer logs `like_me_skip`.
- **P3 — built, then redesigned (3 November 2026), on branch `v3`.**
  🗣️ How my agent talks (§5). Section 31 of `app.js`. Filip tried the first
  version (two grids of cards and a handshake pad) and found the questions
  too long for a loud room, the act-out lost on the thumbnail, Hands and
  Pictures unclear, and the handshake pointless there. Now:
  - **One card at a time, Talking-Mats style:** the agent stands BIG in the
    middle and acts the card out (it moves in Full motion; the card's emoji
    sits by its head always, because it carries the meaning), and the child
    sorts it 👍 🤷 👎. Four parts, short icon headings: 🗣️ My agent likes…
    · ⭐ Which is best? (exactly one, from the 👍 pile) · 🏫 School wants…
    · 🤫 a secret word (🎤 + one of the six spy voices).
  - **Data (approved by Filip):** `suit.likesUnsure/likesNot`,
    `suit.schoolUnsure/schoolNot`, `suit.best`, top-level `secretWord`.
  - Hands → **Signing** 🤟, Pictures → **Picture cards** 🎴, with sharper
    ChatGPT prompts. `nar-mode-hands` and `nar-mode-pictures` must be
    remade (`--force`); `nar-suit-best`, `nar-word-make` and
    `nar-word-voice` are new.
  - **The handshake moved to a sheet** (`#handshake-overlay`,
    `openHandshakeSheet(onDone)`), which Powers opens when a child picks 🤝
    as a power's switch — there the handshake has a purpose.
  - **Shared helpers:** `modeCard()`, `ownCardButton()`, `ownCardTile()`.
    They live at the top of the section's helpers — a rewrite of the
    section once deleted them and broke three screens, which the
    undefined-call check would have caught: run it after every rewrite.
- **P4 — built (3 November 2026), on branch `v3`.** 📍 Safe place (§6).
  - **Section 27 is now Safe place**, built on the v2 HQ screen and panel
    (the panel's `data-mission` is `safe`; the element ids stay `hq-…`).
    Two questions, one at a time, switched by ➡️ or the 💬 ⛔ buttons:
    `safe.talk` and `safe.stops`. Nowhere is a card the same size as the
    places. ✏️ Draw my own uses the shared sheet; a place that is only SAID
    keeps its `audioId` (a small addition to §10's `{ id, png }`).
  - **It never writes to `hq`.** The v2 `chooseHq`, `clearHq`, `openHqDraw`
    and their tiles are gone; `hq_choose` and `hq_draw` are v2-only events.
  - **`agentPlace(agent)`** decides where an agent stands: `safe.talk` if it
    is a real place, otherwise `hq`. `renderAgentView`, `setHqBackdrop`,
    `preloadCardAssets` and `drawAgentToCanvas` all go through it, so the
    gallery, the thumbnail and (P6) the bottle picture agree.
  - The stage is `data-scene="moment"` and `showPlaceOn()` draws the place
    for the question on screen, with a token so a slow photograph from an
    earlier tap cannot land after a newer choice.
  - `modeCard()` and the like-me cards now use `Assets.card()`, which already
    built a picture card with its emoji stand-in.
- **P5 — built (3 November 2026), on branch `v3`.** ⚡ Powers (§7), section
  32 of `app.js`, in the same frame as How my agent talks: the agent big in
  the middle doing the power, short icon headings.
  - ✨ a canvas (`#powers-canvas`, `STROKE_WHERE` "power") and 🎤; **the six
    doors are not even built** until the child has drawn, recorded or tapped
    💡. 🚪 doors → cards + ✏️. 📝 four slots (🕐 When ≤3 · 👥 Who · 🔌 Switch
    on · 🎯 So that). ⚡ Power on! plays the power, then reads the sentence
    back with `Assets.sayAndWait()` (new in `assets.js`: resolves when a
    line ENDS), lighting each slot as it is read. ⚡ My powers: fire, 📝
    change, 🗑️ two-tap remove, ➕ (three at most). ⏪ From last time offers
    a session-2 power — including one that was only an effect.
  - **The five ★ powers have their own scenes** (slow everybody down,
    control teachers, control all displays, control devices, speak for your
    friends); pause, quiet bubble, my way and invisible borrow v2's fx-*
    classes; the rest pop their icon. Props sit on `#powers-fx` and stay
    put in Calm/Off — they carry the meaning — while movement is Full only.
  - 🤝 in 🔌 opens the handshake sheet (section 31); 🗣️ plays the agent's
    secret word.
  - **Timers:** `powersTimers` holds the read-back's pauses; the scene has
    its own `powerFxTimer`. When `playPower()` cleared every timer, it
    cancelled the "Power on!" pause started at the same moment, and the
    read-back hung for ever. Never clear timers you did not start.
  - Every label and emoji is also written in the code (`POWER_CARDS`,
    `POWER_DOORS`, `SITUATION_CARDS`, `WHO_CARDS`, `HOW_CARDS`), because
    with an empty `assets/` there is no manifest to read them from.
- **P6 — built (3 November 2026), on branch `v3`.** 🍾 The bottle (§8),
  section 33 of `app.js`. The bottle is drawn as SVG (`bottleSvg()`), big
  on the left, with a band per item in the item type's colour.
  - 🍾 tokens (one of each kind, 4 at most; 📍 only once Safe place has a
    real place; ⚡ chooses which power) · 👥 me / friend (may tap a friend's
    agent) / teacher / everyone · ✍️ with my agent or 🎭 mystery (not for
    "me"; a mystery voice MUST take a spy voice — Normal is not offered) ·
    🚀 cork, then swipe up or HOLD 🚀 (900 ms) · 🗂️ shelf, 3 bottles.
  - **What leaves:** `buildBottlePayload()` — never the agent id or log;
    envelope only for a friend or teacher. **Voices are disguised on the
    iPad:** the filters' `build(src, c)` now take the AudioContext to build
    in, and `Voice.render()` runs one through an OfflineAudioContext into a
    WAV (16 kHz mono). So the display plays what the child heard, and a
    mystery voice never leaves undisguised.
  - **The same flight whatever happens.** `sendBottle()` animates first and
    delivers quietly after; a failure leaves it `waiting`.
    `sendWaitingBottles()` tries every agent's waiting bottles — on entering
    the bottle screen, when the link is switched on, every 30 s, and from
    the adult panel's 📨 button (which also shows how many are waiting).
    Bottles of an agent that is not open are updated with
    `logEventOnAgent()`.
  - Item-power refers to its power by index (§10) AND by `powerId`;
    `removePower()` shifts the indices.
  - **Not built:** dragging a token into the bottle (tapping does it — §8
    asks for tap OR drag).
  - **The short finish (§3)** after the last mission: `showFinish()` — the
    agent big in its place, its powers' icons, the ✅ stamp (outside the
    agent's frame, which clips) and `nar-card-finish`; 🏠 then
    `finishSession()` as before.
- **P7 — built (3 November 2026), on branch `v3`.** The display (§9.5),
  `display/index.html`, `display.css`, `display.js`.
  - The scene: shore, board, post shelf, queue along the top. Filip's
    `disp-shore`, `disp-board`, `disp-bottle` and `disp-teacher` replace
    the drawn stand-ins when they exist (served from `/assets/`).
  - An everyone-bottle: chime on arrival → queue → (3 s auto, or Space when
    held) lands, cork → agent walks on (or a dashed ?) with its handshake
    pulsing → items one at a time → waves and leaves. Drawings and
    "Hold my turn" tokens stay pinned. Friend/teacher bottles float to the
    post shelf, marked with the recipient's emblem, never opened.
  - **The arrival is one async story, and `sleep()` is pausable (P) and
    cancellable (H)**: it waits in 100 ms steps and checks a token.
  - ★ scenes: slow everybody (`--slow` ×2.5 on every CSS duration and
    sleeps doubled, a tortoise for 10 s) · control teachers (the bean
    teacher with the child's "so that" in a bubble) · control all displays
    (emblem wash, 10 s) · control devices (blinking 💡🔊📋, under 3 a
    second) · speak for your friends (two rising bubbles). Also pause,
    dim, turn down (mutes 15 s), warn me (three lights go out — a
    countdown with no digits), say it again (re-queues the previous),
    hold my turn, see my points (⭐👁️, never a number). The rest pop.
  - Keys: Space A P H C M F D, the number keys (one door each, iPad
    order), S (motion; "real for a minute" — a ring that empties over a
    minute, no digits, `sfx-timer-ring` at both ends), ?.
  - **H also tells the relay to forget the bottle** (`POST /hide`, display
    only), or a reload would bring it straight back. The relay's numbering
    is a counter now, not the list's length, so forgetting cannot reuse a
    number.
  - Tested in the browser with the relay in `--no-tls`: ten bottles in a
    row, one at a time; every key; D with the relay stopped; a reload
    rebuilding the post shelf without the hidden bottle; no digit anywhere
    in the scene.
- **P9 — built (3 November 2026), ahead of P8.** `tools/analyse.py`,
  standard library only: four CSVs (utf-8 with BOM, so Excel shows emoji),
  `drawings/`, `audio/` and an agent card per agent. Merges exports by id,
  keeping the copy with the most events; output is sorted and carries no
  run date, so two runs are byte-identical (tested with `diff -r`). Writes
  to `../agent-lab-analysis` by default and warns if pointed inside the
  repo. The cards inline `parts.js` so agents are drawn by the app's own
  code. Every column is in DATA.md §8.
- **Assets, v3 batch (3 November 2026).** 51 pictures brought in, plus three
  the guide marks as copies (`mode-handshake` ← `how-handshake`,
  `mode-device` ← `stk-aac-talker`, `who-teacher` ← `disp-teacher`). The
  file named `disp-bottle` was the noticeboard, so it was filed as
  `disp-board` — at 512px, because the tool had already converted it as a
  sticker. Still to make: `disp-shore`, `disp-bottle`, `who-everyone`.
  Seeing them in place showed four layout faults, all fixed:
  - **The display board** used to stretch the picture into a wide box.
    `fitBoard()` now measures the picture and the board keeps its own shape;
    see the convention below.
  - **Pins** spilled off the cork after about 18. `fitPins()` shrinks them
    instead, and two observers call it.
  - **Cut-outs** were cropped in 4:3 cards (`.is-cutout` → `contain`).
  - **Power on! and ➡️** sat below the fold on a landscape iPad. Only the
    cards scroll now.
- **Next: P8** — Rehearsal: a full run on two iPads and the display, then
  bump every version number. Needs v3 deployed and the room set up — it is
  Filip's, with the iPads.


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
   `hasAlpha: yes` is not proof: read the corner pixels in the browser.
3. **Look at every picture beside its label.** The tool trusts filenames, and
   a file saved under the wrong name in ChatGPT gets filed under that name.
   On 3 November the noticeboard arrived as `disp-bottle`. The tool also
   deletes the original, so a misfiled picture has already been converted
   at the wrong size by the time anyone sees it.
4. **Bump `CACHE_VERSION` in `sw.js` and every `?v=` in `index.html`,** or the
   iPads will not pick the new files up.

**"Sync the asset list"** means `python3 tools/sync-assets.py`, which rebuilds
`assets/manifest.json` from `asset-guide.md`. The guide is the source: never
hand-edit the manifest, and never edit both.

## Settled decisions

- **"How my agent talks" is a Talking Mat, not a form (3 November 2026).**
  Filip's first try: a loud room means nothing may depend on hearing or
  reading, and the agent must be big and do the thing. One card at a time,
  sorted 👍 🤷 👎, then one favourite. This departs from v3 §5 (any number
  of cards, and a handshake on this screen).
- **Spy words, not animals (3 November 2026).** A big dolphin on the Start
  screen promised children they would be working with a dolphin, and nothing
  in the app ever mentioned it again. The second reel is now a spy word that
  is not a creature or a character (`SPY_WORDS`), and the hero is an empty
  dashed agent with the word's symbol as a badge on its chest — the agent
  the child is about to make. The empty agent thumbnail uses the same
  outline. This departs from v3 §4 ("the existing reels, unchanged").
  **The data still calls the reel `animal`** (`codenameParts.animal`,
  `codename_spin`, `codename_lock`) so session-2 and session-3 logs line up;
  DATA.md says what it holds. Agents named in session 2 keep their animals.
  Leave out emoji that are little dark pictures (🌌 🌠): at badge size they
  are a black square.

- **Agents do NOT survive clearing Safari's website data (7 October 2026).**
  They live in IndexedDB, which *is* website data — "Clear History and
  Website Data" deletes every one of them, and it already happened once in
  testing. There is no setting that prevents this. What protects the work:
  **Export all** in the adult panel (the only copy that leaves the iPad), and
  **Add to Home Screen**, which gives the app its own storage that clearing
  Safari does not touch. The panel now states how many agents are on the iPad
  and when they were last exported, so a facilitator can see at a glance
  whether anything would be lost.

- **One way in, not three (8 October 2026, from the iPad test).** Pixel went
  first, then Draw: a blank canvas gave children less than the parts kit and
  nobody reached for it. With a single door there is nothing to choose, so
  **Make opens straight into the parts editor** and the door screen is gone.
  This departs from v2 §5.3, which lists Parts · Pixel · Draw.
  **Agents already made with Pixel or Draw keep their `door` value**, so
  `renderAgentView()` and `drawAgentToCanvas()` still draw their work on
  every screen and on the saved card — verified. Only the way IN was removed,
  never anyone's work.
- **"Say it 3 ways" is gone (7 October 2026).** It departs from v2 §5.6.
  `voice.threeWays` stays in the data model and any clips already recorded
  are untouched, but nothing shows or plays them.

- **Grid size (2 October 2026): 16×16 stays, at ~33px cells.** Spec §7 wants at
  least 40px, but the chrome §6 requires leaves only ~526px on an iPad. The
  user chose to keep the spec's 16×16. Changing `GRID` later is a one-line
  change but **wipes pixel art already saved**, so it must not happen
  mid-session.

## Conventions in this codebase

Many of these name screens v3 retired. They stay, because the lesson still
applies (v3 §13).

### v3 conventions (from the v3 pictures)

- **A cut-out is shown whole; a photograph fills its card.** `Assets.card()`
  marks a PNG `.is-cutout` (`object-fit: contain`); a JPEG keeps `cover`.
  `bring-in-assets.py` makes scenes JPEG and stickers PNG, so the file type
  is a reliable signal. With `cover`, a square picture in a 4:3 card lost
  its top and bottom, including the speech bubble on Speak for your friends.
- **The display measures its board picture rather than assuming a shape.**
  ChatGPT draws squares, so a "wide noticeboard" arrives as a square
  picture with clear space round it. `measureBoard()` finds the board's
  pixels and walks out from the middle to find the cork. The board keeps
  its own shape and the pins go on the cork, so a remade picture fits too.
- **Use `getBoundingClientRect()` to measure anything that must fit.**
  `clientWidth` rounds to whole pixels. Half a pixel was enough to wrap the
  last pin onto a row of its own.
- **A row of buttons beneath a list of cards sits outside the list's
  scroller.** This is the Mission 3 rule again, for Powers: ➡️ and Power on!
  were inside the scrolling column and fell below a landscape iPad's edge
  as soon as the cards made two rows.

### v2 conventions (from V3)

- **The colours sit ABOVE the parts tray**, so where they appear never
  depends on how many parts a category has. Underneath it, the palette began
  at 494px down a 518px rail for an 8-part category — just visible — but at
  530px for eyes, mouths and hair, which have 10, 10 and 16. Those three were
  off the bottom edge, and having to scroll for them was reported as the
  colours being slow to appear. The rail is 290px in landscape and the
  palette packs into six columns so both it and the tray fit.

- **The Power-up MIRRORS the Cover until the child changes it.** It used to
  copy once, into an empty Power-up, and never again — so a child who went
  back and recoloured their hair saw the new colour on the Cover and the old
  one on the Power-up, with no way to reconcile them. It re-copies on every
  entry until `powerup.lookEdited` is set, which happens the moment the
  editor changes anything while open on the Power-up look. After that it is
  the child's own thing and is never overwritten. The flag is a small
  addition to §6's model.

- **A face part cannot reliably be tapped on the stage, so the category tab
  selects it.** Eyes, mouth, brows and hair all pile onto the same small
  head, and hair is a hollow crescent whose middle is empty — measured on
  7 October, tapping the head selected the eyes, tapping the hair selected
  the eyes, and tapping the eyes selected the hair. Not one part was selected
  by tapping its own centre, so the palette showed somebody else's colours
  and it read as "hair has no colour option". `selectPlacedPart()` runs when
  a category tab is tapped, which is unambiguous and is what a child means.

- **Never write a whole `class` attribute on a part group.** `setAttribute(
  'class', 'is-selected')` and `removeAttribute('class')` wiped `part-group`,
  which is what carries the child's colour — so tapping ONE part turned ALL
  of them black and looked like lost work. `classList.toggle()` only.
- **🏠 replaces 🧩 on the top bar.** A child who opened the wrong agent had no
  way out but reaching the card and tapping Finish, which stamped someone
  else's agent as done. `goHome()` saves the agent as it stands, stamps
  nothing, and returns to the start. This drops §7's "Something's missing"
  button from the top bar.
- **The controls a child reaches for most live beside the agent**, not in the
  tool rail: Bigger, Smaller, Remove, Undo, Clear in `#main-controls`. The
  rail keeps Turn, Flip, Front and Back.

- **A selected outline on a full-width button must be drawn inwards.** The
  house style is `outline: 3px solid var(--accent); outline-offset: 3px`,
  which sits 6px outside the element. Mirror is `width: 100%` of a 224px
  rail, so its ring spilled past the rail and over the row beneath. Anything
  full-width in a narrow column uses `outline-offset: -3px`.

- **A card shows what exists, not placeholders for what does not.** The
  Reveal had an empty FEELING CODE box and three rules rows saying "none"
  through the whole of session 2, because those are session-3 and session-4
  missions. Both hide until there is something in them, and the voice panel
  moves across to fill the space. A card with gaps reads as broken, not as
  unfinished.
- **The POWER panel is the agent in the MOMENT its power is used**, not a
  second copy of the Cover in the same HQ. `showPowerMoment()` puts the
  chosen situation behind it, and marks the element `data-scene="moment"` so
  `setHqBackdrop()` leaves it alone — the HQ photograph loads a moment later
  and would otherwise win that race every time.

- **A grid item's automatic minimum is its content, so `1fr` will not shrink
  past it.** Four 64px category buttons overflowed the 224px tool rail by
  50px — and because the rail scrolls vertically, CSS let it slide sideways
  too, so a child could push a whole category off the edge. Every grid inside
  `.editor-rail` now gives its items `min-width: 0`. Use `minmax(0, 1fr)` or
  that guard for any new grid in a narrow column.
- **The mission question sits under the agent, in the left column.** A
  full-width 34px heading cost the drawing stage and the rail the height they
  needed on a landscape iPad. It is 21px there, and 26px in portrait where
  there is room.

- **A drag must reuse the renderer's own transform.** `startShapeDrag()`
  rebuilt the SVG transform by hand and left off the trailing
  `translate(-50,-50)` every parts-kit piece needs, plus the flip — so a part
  jumped half its own size the instant a finger touched it and never tracked
  properly. It calls `shapeTransform()` now. Two places computing one
  transform is the same trap as drawing the ID card twice.
- **The emblem is `emblem.emoji`, not `codenameEmoji`.** v2 §5.1 moved it and
  five places still read the v1 name, so every v2 agent showed the generic
  🕵️ instead of its own animal — on the mission thumbnail and on the ID card.
  Everything goes through `agentEmblem()` now, which falls back to the v1
  field for older agents.

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

- **A drag out of a tray must not claim the gesture on `pointerdown`.** The
  sticker tray called `preventDefault()`, captured the pointer and built the
  ghost the instant a finger landed, and its CSS said `touch-action: none` —
  so the browser could never scroll the tray and a finger laid on a sticker
  stuck fast. The parts tray never did this, which is why it always felt
  right. Wait for 8px of movement before committing, set `touch-action:
  pan-y`, and treat `pointercancel` as "the browser took it as a scroll".

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
- **⚠️ On every release also set `version.json` to the same number.** It is
  how a stuck device finds out it is stuck: `healIfStale()` in
  `boot-guard.js` asks the server for the current version, compares it with
  the one the page actually loaded, and if the server is ahead it unregisters
  the service worker, deletes every cache and reloads — once per launch,
  guarded by `sessionStorage`. A browser tab can be forced past a stale cache
  with a junk query; **a home-screen app cannot**, because it always launches
  its own `start_url` and never sees what you type. Two iPads sat several
  releases behind for most of a day before this existed. The service worker
  never caches `version.json`.
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
