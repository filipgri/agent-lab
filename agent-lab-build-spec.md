# Agent Lab — Build Spec

An iPad web app where children design a spy "agent" avatar, step by step. It is built for a school design club research session and installed on iPads as a home-screen web app (PWA), hosted free on GitHub Pages.

---

## 0. How to use this file (for Filip)

1. Make an empty folder, e.g. `agent-lab`, and put this file in it.
2. Open that folder in the Claude desktop app.
3. Say: **"Read agent-lab-build-spec.md and build Milestone 0 only. Then stop and explain what you did."**
4. Test on an iPad (see §11). Then ask for the next milestone.

---

## 1. Instructions for Claude (the builder)

- **The user is a beginner programmer.** After each milestone:
  - explain in plain language what you built, how the files fit together and the logic behind it;
  - explain any new syntax briefly (e.g. what `addEventListener` or `async/await` does);
  - comment the code generously.
- **Build one milestone at a time** (§10), then stop for testing. Don't jump ahead.
- **Plain HTML, CSS and JavaScript only.** No frameworks, no build step, no npm, no external libraries, CDNs, Google Fonts or analytics. Everything is bundled locally.
- **Never make network requests** except loading the app's own files.
- Ask before changing the data model (§8) or adding anything not in this spec.
- Test logic mentally against iPad Safari quirks (§9) before declaring something done.

---

## 2. Context (why this exists)

- About 8–10 children with speech, language and communication needs (SLCN). One iPad per child. Each station rotation lasts about 12–15 minutes.
- **It is a research tool, not a learning game.** We want to learn about children's identity, emotions, communication, agency, what they'd make public, and their rules and boundaries.
- Design principles:
  - **Authorship over menus.** Children make their own thing first; ready-made options come second.
  - **Low language load.** Icons, pictures and audio prompts; almost no reading or typing.
  - **No failure, no scores, no timers, no leaderboards, no points.**
  - **Every step can be skipped** (Pass).
  - **Playful and slightly mysterious** spy theme.

---

## 3. Privacy & safety rules (non-negotiable)

- All data stays on the iPad in **IndexedDB**. There are no accounts, server, cloud or analytics.
- **No camera access**, ever. The microphone is used only in the Voice mission.
- **Codenames only**; never ask for real names.
- Add a Content-Security-Policy meta tag:
  `default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'`
- The adult export file contains research data. Show a reminder on the export screen: "Store securely, delete after the study."
- Call `navigator.storage.persist()` on start to reduce the risk of iOS clearing data.

---

## 4. Tech & files

```
agent-lab/
  index.html        – all screens as <section> elements, only one visible at a time
  style.css         – look & feel, animations
  app.js            – navigation, missions, state (clearly sectioned with comments)
  storage.js        – small IndexedDB helper (save/load/list/delete agents)
  audio.js          – recording, filters, sound effects, spoken prompts
  effects.js        – animations, particles, voice-driven bounce (§5a)
  assets/img/       – optional graphics (§13); the app must work without them
  .gitignore        – keeps exported data out of the repo (§14)
  manifest.json     – PWA settings (name "Agent Lab", display: standalone)
  sw.js             – service worker: cache app files for offline use
  icons/            – icon-180.png (apple-touch-icon), icon-192.png, icon-512.png
```

- Load scripts with plain `<script src>` tags, in order: storage, audio, effects, app.
- Add the iOS home-screen meta tags: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, and `<link rel="apple-touch-icon">`.
- Viewport: `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`.
- Generate the simple icons yourself (e.g. a small script drawing a spy-hat emoji or symbol on a dark background).

---

## 5. Look & feel

- Spy theme: dark navy background, one bright accent (e.g. yellow), white text, rounded chunky buttons.
- **Minimum touch target 64×64px**, with generous spacing.
- Use the system font stack only.
- Every button shows **an icon plus at most one or two words**.
- The layout is landscape-first (iPads on tables) but must still work in portrait. Use `100dvh`, not `100vh`.
- **Animations in CSS:**
  - Stamp: scale 3 → 1 with a slight rotation and a "thud".
  - Slide between missions.
  - Small wiggles on tap.
- Respect `prefers-reduced-motion`.
- **Sound effects are generated with the Web Audio API** (no audio files): stamp thud, pop, click.
- Mute toggle in the corner.
- Use `touch-action: none` on drawing and dragging areas so the page doesn't scroll or zoom.

---

## 5a. Animation & juice

**Goal:** spectacular moments, calm in-between.
- Animate only `transform` and `opacity`.
- Use CSS keyframes and the Web Animations API (`element.animate`).
- Draw particles on one small canvas, in `effects.js`. No libraries.

**Golden rule:** the agent never moves while the child is editing it. Idle motion is only for the preview thumbnail, the Reveal, and the place cards.

1. **The agent comes alive.**
   - Idle bob: translateY ±4px and scale 1–1.02, as a 3s ease-in-out loop.
   - Tap reaction: a jump or spin lasting 400ms, picked at random from three variants.
   - Sticker landing: scale 0 → 1.15 → 1 with `cubic-bezier(.34,1.56,.64,1)` over 350ms, plus a pop sound.
2. **The voice drives the body.**
   - During playback, an `AnalyserNode` measures loudness (RMS) every animation frame. The agent scales to 1 + rms × 0.5 (capped at 1.25), with a small upward bounce.
   - Smooth the movement with lerp 0.3 so it doesn't jitter.
   - Used in Mission 4, the Reveal and the ID card.
3. **Boost power-up** (about 2.5s; plays once when entering Mission 2, with a ✨ replay button), in this order:
   1. a small shake (300ms);
   2. one soft white glow pulse (a single flash only);
   3. a 360° spin while scaling to 1.3;
   4. a particle burst of about 60 sparkles in accent colours, with gravity and fade, lasting 1.2s;
   5. the Boost agent appears with a slowly pulsing aura (drop-shadow, 2s loop).
4. **Movement as a feeling code** (Mission 3). CSS classes for the child to choose from, previewed live on the agent:
   - `.move-bounce`: a slow hop.
   - `.move-shake`: gentle, ≤3px, never violent.
   - `.move-sway`: rotate ±6° over 2s.
   - `.move-spin`: 360° over 4s.
   - `.move-still`: no movement.
5. **Spy transitions.**
   - A scanner line sweeps down the screen between missions (600ms).
   - The mission title "decrypts": scrambled letters resolve over 500ms.
   - Locked progress icons get a slow red laser-grid shimmer.
   - The Mission 1 door cards tilt slightly when pressed.
6. **Reveal finale**, in this order:
   1. The dossier slides up and its cover opens (3D `rotateY`, 600ms).
   2. The CLASSIFIED stamp slams down (scale 3 → 1, rotate −8°) with a small screen shake (≤6px, 200ms) and a thud.
   3. The agent walks in from the side, bobbing.
   4. The voice password plays once automatically with the bounce (allowed because it follows a tap), plus a confetti burst.
   
   Tapping anywhere skips straight to the finished card.

**Guardrails:**
- No more than one big moment per mission.
- **No flashing more than 3 times per second** (WCAG 2.3.1). No strobe effects and no full-screen colour flicker.
- Animations never block input, and every big sequence can be skipped with a tap.
- **Motion level setting in the adult panel:**
  - **Full:** everything on.
  - **Calm:** no shake, no particles, no idle bob; transitions become simple fades.
  - **Off:** no animation.
  
  Default to Full, or to Calm if the iPad's Reduce Motion setting is on (`prefers-reduced-motion`).
- Stop animation loops when the screen is hidden. Cap particles at 80. Aim for smooth 60fps on older iPads.

---

## 6. Global UI (on every mission screen)

- **Progress strip (top):** 6 mission icons plus the Reveal icon.
  - Stamped: done.
  - Grey stamp: passed.
  - Glowing: current.
  - Padlock with a question mark: locked (the mystery).
  - Tapping a done or passed icon goes back to that mission.
- **Agent preview:** a small live thumbnail of their agent, always visible.
- **🔊 button:** speaks the mission instruction. Use a pre-recorded file `audio/m1.m4a` (etc.) if present; otherwise use `speechSynthesis` with a short, simple sentence. A facilitator can record these later.
- **Stamp it ✓** (big, bottom right): finishes the mission. Plays the stamp animation and sound, then slides to the next mission.
- **Pass** (smaller, next to it): skips the mission. Gives it a grey stamp and logs it.
- **🧩 Something's missing** (top right, always visible): opens a popup with a small drawing canvas and a record button ("Draw or say what's missing"). It saves to `agent.missing[]` along with which screen it came from.
- **Undo** inside every editor.
- **Auto-save** after every change, debounced to about 500ms. There is no Save button.

---

## 7. Screens

### Start
- Big **🕵️ New agent** button, plus **Continue** (resumes the last unfinished agent only).
- Children can't see other children's agents. The full list is in the adult panel only.
- **Codename:** tap 🎲 to roll an adjective + animal name with its emoji (e.g. "Silent Falcon 🦅"). Re-roll freely.
  - Optional: tap 🎤 to record saying their own codename.
  - Optional: ⌨️ to type a codename instead.
- **Hidden adult panel:** long-press the logo for 3 seconds, then enter a 4-digit PIN set in `app.js` (just a speed bump). See §7.9.

### Mission 1 — Make your agent (three doors)
The first screen shows three big door cards: **Pixel**, **Build**, **Draw**. The child picks one, and can come back and switch.

- **Pixel:**
  - 16×16 grid with cells of at least 40px.
  - Tap or drag to paint.
  - Palette of 16 colours, including a wide range of skin tones and fantasy colours.
  - Eraser, fill bucket, undo, clear.
- **Build:**
  - A tray of big shapes (circle, oval, square, rounded square, triangle, star, blob) to drag onto the stage.
  - Tap a shape to select it, then use buttons to resize (➕ ➖), rotate (↻), move to front or back, change colour, or delete.
  - Use buttons, not pinch gestures, because they're easier to code and easier for the children.
- **Draw:**
  - Canvas with a thick brush in 3 sizes.
  - Line smoothing using quadratic curves between points.
  - **🪞 Mirror toggle:** strokes are copied on the left/right axis.
  - Palette, undo, clear.
- **Sticker layer** (the same on all doors, shown after or alongside):
  - A tray of emoji stickers in category tabs. The child drags a sticker onto the agent, taps to select, and can resize with ➕ ➖, rotate, or delete.
  - Head: 🎩 🧢 👑 ⛑️ 🎀 🪖
  - Face: 👓 🕶️ 🥸 😷
  - Ears: 🎧 🦻
  - Moving: 🦽 🦼 🦯 🛴 🛹
  - Pets: 🐱 🐶 🐉 🦊 🐸 🦜
  - Things: ⚽ 🎮 🎨 📚 🎵 🧸

### Mission 2 — Boost
- The app copies the Mission 1 agent to make the "Boost" version. The original ("Cover") stays visible beside it as a smaller thumbnail.
- The same editor as Mission 1, plus:
  - a **Powers** sticker tab: ⚡ 🔥 ❄️ 🌈 ⭐ 🪽 💥 🛡️ 🧲 🌀;
  - **Aura:** a glow colour around the agent (CSS drop-shadow);
  - **Background:** 5–6 options (space, city, jungle, sea, plain), drawn as gradients or emoji patterns.

### Mission 3 — Secret feeling code
- **The blank tile comes first.** "Make a secret sign for a feeling." The child draws on a small canvas, or uses an 8×8 pixel grid, then optionally records a name for it (🎤). No typing.
- A **"Need ideas?"** button reveals 6 face options afterwards: 😀 😢 😠 😨 😌 🤪. They are never shown first.
- Up to 3 codes.
- For each code, ask: "How does your agent move when it feels this?" The child picks bounce, shake, sway, spin or still, previewed live on the agent (§5a). The child always chooses; never assign a movement to an emotion.
- Finally: "Which one is your agent wearing today?" The child picks one, or none, to show on the agent.

### Mission 4 — Voice password
- A big red 🎤 record button. It records up to 10 seconds, shown as a filling ring, and auto-stops.
- **Play the raw recording first.**
- Then a row of filter buttons, all applied at playback only (the original is never changed):
  - **Normal**
  - **Squeaky:** `playbackRate = 1.5`
  - **Deep:** `playbackRate = 0.7`
  - **Robot:** ring modulation. The source goes through a GainNode whose `gain` is driven by a 50Hz OscillatorNode.
  - **Spy radio:** highpass 300Hz → lowpass 3000Hz → light WaveShaper distortion.
  - **Echo:** a DelayNode of 0.25s with a feedback gain of 0.4, mixed with the dry signal.
- "Which voice does your agent use?" Tap to choose. The choice is saved as a filter name; there is no second audio file.
- Re-record is allowed. The last recording is kept, and the log notes that it was re-recorded.
- **Optional bonus "Yes ×3":** three small record slots for saying "yes" three different ways.

### Mission 5 — Where does my agent go?
- Big place cards:
  - 🔒 **Just me**
  - 🏷️ **My badge**
  - 🏫 **My class**
  - 🖼️ **School wall**
  - 🏠 **Home**
- Tapping a card flips it to show big on/off toggles for which parts travel there: **Cover**, **Boost**, **Feeling code**, **Voice**, **Codename**.
- **Everything is off by default.**
- The front of each card then shows small icons of what's going there.

### Mission 6 — Agent rules
- Three rule cards:
  - **✋ Don't…**
  - **👍 You can…**
  - **💛 When I'm upset I need…**
- For each card, the child picks icon(s) from: 🤫 🎧 🚶 🤗 🙅 💬 ✋ 🧃 ⏳ 👥 🧑‍🏫 🛋️ 🎮 ✏️
- Or they draw their own (small canvas), or record (🎤).

### Reveal — Agent ID card
- A folder-opening animation with a big CLASSIFIED stamp.
- **The card shows:**
  - codename;
  - the Cover and Boost agents;
  - the chosen feeling code;
  - a ▶️ button that plays the voice password with the chosen filter;
  - the rule icons.
- **Buttons:**
  - **Save card:** render the card to a PNG (canvas) and share it via `navigator.share({files})`, falling back to a download link.
  - **Finish:** return to Start.

### 7.9 Adult panel (hidden)
- List of all agents (thumbnail, codename, date, missions done).
- Open any agent; delete one agent; delete all (with a double confirmation).
- **Export all:** one JSON file with drawings as PNG data URLs, audio as base64, and every event log. Share it via `navigator.share({files})`, with a download link as fallback. Show the secure-storage reminder.
- Mute toggle; motion level (Full / Calm / Off, see §5a); PIN change; a "Reset to Start" button.

---

## 8. Data model

```json
{
  "id": "uuid",
  "codename": "Silent Falcon",
  "codenameEmoji": "🦅",
  "codenameAudioId": null,
  "createdAt": "ISO date",
  "door": "pixel | build | draw",
  "cover": { "pixels": [], "shapes": [], "drawingPng": null, "stickers": [] },
  "boost": { "pixels": [], "shapes": [], "drawingPng": null, "stickers": [], "aura": "#hex", "background": "space" },
  "feelingCodes": [ { "png": "data:...", "audioId": null, "face": null, "move": "bounce | shake | sway | spin | still" } ],
  "feelingWorn": 0,
  "voice": { "audioId": "id", "filter": "robot", "yesClips": [] },
  "places": { "justMe": {"cover":false,"boost":false,"feeling":false,"voice":false,"codename":false}, "badge": {}, "class": {}, "wall": {}, "home": {} },
  "rules": { "dont": [], "can": [], "upset": [] },
  "missing": [ { "screen": "m1", "png": null, "audioId": null, "t": "ISO" } ],
  "missions": { "m1": "done | passed | todo" },
  "events": []
}
```

- Store audio Blobs in a separate IndexedDB store, keyed by `audioId`.
- A sticker looks like this: `{ "emoji": "🎩", "x": 0.5, "y": 0.2, "scale": 1, "rotation": 0 }`. Positions are relative (0–1) so they scale with screen size.

### Event log (for research)
Each event looks like: `{ "t": "ISO", "mission": "m1", "action": "sticker_add", "detail": {"emoji":"🎩"} }`.

Log the following actions:
- `mission_enter`, `mission_leave`, `stamp`, `pass`, `back_to`
- `door_choose`, `door_switch`
- painting: one event per finger lift, not per cell
- `sticker_add`, `sticker_remove`, `undo`, `clear`
- `codename_roll`, `missing_open`, `missing_save`
- `record_start`, `record_stop`, `rerecord`, `filter_play`, `filter_choose`
- `feeling_code_add`, `need_ideas_open`, `feeling_move_choose`, `boost_replay`, `reveal_skip`
- `place_toggle`, `rule_set`

Time spent on each mission is calculated from the enter and leave events.

---

## 9. iPad Safari gotchas (handle these)

- **The audio engine only starts after a tap.** Create or resume the `AudioContext` inside a tap handler.
- **Recording format:** check `MediaRecorder.isTypeSupported('audio/mp4')`, which is what Safari uses, and fall back to `audio/webm`. Decode recordings for filtering with `blob.arrayBuffer()` → `decodeAudioData`.
- **Release the microphone** after recording (`track.stop()`) so the red mic indicator disappears.
- **Use Pointer Events** (`pointerdown/move/up`) for drawing and dragging.
- **The home-screen app and Safari have separate storage.** Show a small note on the adult panel: "Always open from the home-screen icon."
- **Updates:** bump a `CACHE_VERSION` constant in `sw.js` on each release. Add a small "New version — tap to update" banner when a new service worker is waiting.
- **Downloads:** `<a download>` is unreliable in standalone mode, so prefer `navigator.share({files})`.

---

## 10. Milestones (build in this order, stop after each)

0. **Skeleton:**
   - all screens with placeholder content;
   - navigation with Stamp it, Pass, the progress strip and going back;
   - Start screen with the codename roller;
   - IndexedDB auto-save; adult panel with list and export;
   - deploy instructions for GitHub Pages.
1. **Pixel door + sticker layer** (Mission 1).
2. **Boost** (Mission 2).
3. **Voice password:** recording and filters (Mission 4).
4. **Secret feeling code** (Mission 3).
5. **Where does my agent go? + Agent rules** (Missions 5 & 6).
6. **Reveal ID card** with save-as-PNG.
7. **Build and Draw doors.**
8. **Polish & juice:** the 🧩 Something's missing popup everywhere, 🔊 spoken prompts, sound effects, and everything in §5a (Animation & juice), including the motion level setting.
9. **Offline PWA:** manifest, service worker, icons, the update banner, and a final iPad test.

---

## 11. Testing & deploying (explain these steps to Filip at Milestone 0)

**Deploy to GitHub Pages:**
1. Create a public GitHub repo and upload the folder. (Free GitHub Pages needs a public repo; see §14 for private options.)
2. Go to Settings → Pages → Deploy from branch `main`, `/root`.
3. Wait about 1 minute; the app is then live at `https://<username>.github.io/agent-lab/`.

**On each iPad:**
1. Open the address in Safari.
2. Tap Share → **Add to Home Screen**.
3. Open the app from the icon.
4. Allow the microphone once.
5. Turn on **Guided Access** (Settings → Accessibility) to lock the iPad into the app.

**Test checklist for each milestone:**
- Works by touch, without zooming or scrolling.
- Survives closing and reopening the app (auto-save works).
- Stamp and Pass both advance; going back works.
- Export produces a file.
- No requests leave the app: in Safari, open the Web Inspector from a Mac, or simply turn on Airplane Mode and check everything still works after installation.

---

## 12. Do NOT add

Points, scores, leaderboards, timers (apart from the 10-second recording limit), camera access, accounts, cloud sync, analytics, AI or online voice services (e.g. ElevenLabs), external fonts or libraries, or text-heavy instructions.

---

## 13. Optional graphics

The app must work fully with emoji and graphics drawn in code. The stamp, dossier, scanner line, laser grid, sparkles and door cards are all CSS or SVG.

Filip may add the files below to `assets/img/`. If a file is missing, the code falls back to CSS gradients.

| File | Size | Notes |
|---|---|---|
| `app-icon.png` | 1024×1024, no transparency | A bold, simple symbol (spy hat or magnifier), navy and yellow, no text. Claude resizes it to 180, 192 and 512. |
| `bg-space.webp`, `bg-city.webp`, `bg-jungle.webp`, `bg-sea.webp`, `bg-base.webp` | 1600×1200, ≤300 KB each | Backgrounds for the Boost mission. |

**Style rules** for anything made or generated:
- flat illustration;
- consistent palette (navy and yellow plus a few brights);
- no text;
- **no people, faces or bodies.** Characters come from the children only, so the app never shows a "default" person.

---

## 14. Hosting & repo hygiene

- **Free GitHub Pages requires a public repo.** The repo holds only code, and children's data never leaves the iPads, so public code reveals nothing about them.
- **The adult PIN is visible in public code.** It's a speed bump, not security.
- **A private repo on GitHub Pages (paid GitHub Pro) would still give you a public website.** It only hides the code.
- **Free options if you want the code private:**
  - Netlify or Cloudflare Pages connected to a private GitHub repo;
  - Netlify Drop: drag the folder onto app.netlify.com/drop, with no repo at all.
  
  All of these give an https address and work as a home-screen app.
- **Never commit** exported data, recordings, screenshots of children's work, or real names. Add a `.gitignore` containing:
  ```
  exports/
  agent-lab-export-*.json
  ```
  Name export files `agent-lab-export-YYYY-MM-DD.json`.
