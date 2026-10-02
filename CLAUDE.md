# Agent Lab — working notes for Claude

An iPad web app where children design a spy "agent" avatar, step by step.
Built for a school design club research session (TACT, WP1, Dawn House Design Club).

## Read this first

**`agent-lab-build-spec.md` in this folder is the brief. It is the source of
truth.** Read it before changing anything. Section numbers (§3, §7, §8…) are
referenced throughout the code comments and in this file.

## How to work on this project

- **The user is a beginner programmer.** After each milestone: explain in plain
  language what was built, how the files fit together, and the logic behind it;
  explain any new syntax briefly; comment the code generously.
- **Build one milestone at a time** (spec §10), then stop for testing. Do not
  jump ahead to the next milestone unless asked.
- **Plain HTML, CSS and JavaScript only.** No frameworks, no build step, no npm,
  no external libraries, CDNs, Google Fonts or analytics. Everything is local.
- **Never make network requests** except loading the app's own files.
- **Ask before changing the data model (§8)** or adding anything not in the spec.
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
| `audio.js` | Microphone, 10s recorder, the six playback filters |
| `README.md` | Deploy steps, iPad setup, test checklists |

`app.js` is numbered into sections with comment banners (1. CONFIG, 2. STATE …
14. MISSION 1). Keep adding numbered sections rather than new files — the spec's
file list (§4) only allows `audio.js` and `effects.js` to join, in later
milestones.

Script load order: `storage.js`, `audio.js`, then `app.js`. Add `effects.js`
before `app.js` when it arrives (Milestone 8).

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
  event log proves the order (`feeling_draw` before `need_ideas_open`). Up to
  three codes, each a PNG data URL from a small drawing canvas, with an
  optional recorded name, an optional face, and a movement the child picks.
  Then "which one is your agent wearing today?", with None as an equal choice.
  Brought in the five `.move-*` classes from §5a, previewed on the thumbnail
  only — the rest of §5a still waits for Milestone 8.
- **Next: Milestone 5 — Where does my agent go? + Agent rules**
  (spec §7, Missions 5 & 6).

Remaining order (spec §10): 5 Places & rules → 6 Reveal ID card → 7 Build and
Draw doors → 8 Polish & juice (§5a) → 9 Offline PWA.

## Settled decisions

- **Grid size (2 October 2026): 16×16 stays, at ~33px cells.** Spec §7 wants at
  least 40px, but the chrome §6 requires leaves only ~526px on an iPad. The
  user chose to keep the spec's 16×16. Changing `GRID` later is a one-line
  change but **wipes pixel art already saved**, so it must not happen
  mid-session.

## Conventions in this codebase

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
