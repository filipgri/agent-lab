# Agent Lab

An iPad web app where children design a spy "agent" avatar, step by step.
Built for a school design club research session (TACT, WP1, Dawn House Design Club).

The full brief lives in [`agent-lab-build-spec.md`](agent-lab-build-spec.md).

- Plain HTML, CSS and JavaScript. No frameworks, no npm, no build step, no CDNs.
- **All data stays on the iPad** in IndexedDB. No accounts, no server, no analytics.
- No camera, ever. Microphone only in the Voice mission (from Milestone 3).
- Codenames only — never real names.

## Current state: Milestone 3 (Voice password)

Working now:

- All screens exist; one is visible at a time.
- Start screen with the 🎲 codename roller (adjective + animal + emoji), ⌨️ typing.
- Navigation: **Stamp it ✓**, **Pass**, the progress strip (stamped / grey stamp /
  glowing / padlock), and tapping a finished mission to go back.
- Auto-save to IndexedDB after every change, debounced to 500ms. No Save button.
- Research event log on every agent.
- Hidden adult panel: hold the logo for 3 seconds, then enter the PIN.
  Lists agents, opens or deletes one, deletes all (double confirmation),
  exports everything as JSON, and holds the sound and motion settings.

### Mission 1 works

- Three door cards. **Pixel** is built; Build and Draw are marked Milestone 7.
  Each door keeps its own work, so switching between them loses nothing.
- **Pixel editor:** a 16×16 grid, tap or drag to paint, 16 colours (six skin
  tones first), eraser, flood fill, undo and clear. Fast strokes draw a
  continuous line rather than a dotted trail.
- **Sticker layer:** six category tabs. Drag a sticker out of the tray onto the
  agent, or just tap one and it lands in the middle. Tap to select, then make it
  bigger, smaller, turn it, or remove it. Stickers are stored as relative
  positions, so they stay put at any screen size or orientation.
- The preview thumbnail now shows the real agent, live, on every mission.

### Mission 2 works

- Entering Mission 2 copies the Mission 1 agent across to make the **Boost**.
  The copy happens once and only into an empty Boost, so coming back to
  Mission 2 never overwrites boost work. The two are fully independent —
  painting the Boost cannot change the Cover.
- The **Cover** stays beside the stage as a small thumbnail, for comparison.
- The editor is literally the same one Mission 1 uses: there is one editor in
  `index.html` and the app moves it between the two missions.
- On top of Mission 1's tools, the Boost adds:
  - a **Powers** sticker tab (⚡ 🔥 ❄️ 🌈 ⭐ 🪽 💥 🛡️ 🧲 🌀), hidden on Mission 1;
  - **✨ Aura** — a glow colour around the agent, or none;
  - **🌌 Place** — six backgrounds (plain, space, city, jungle, sea, sunset),
    all CSS gradients, so nothing is downloaded.
- The preview thumbnail mirrors whichever version is being edited, and shows
  the Boost everywhere else.

### Mission 4 works

- A big red 🎤 button with a ring that fills as it records. It stops itself at
  **10 seconds** (spec §7), or the child taps again to stop sooner.
- **The raw recording plays first**, automatically, the moment recording stops.
  Only then do the six voices appear — so a child always hears their real voice
  before any filter is offered.
- Six voices, all applied **at playback only**. The recording itself is never
  altered, so trying Robot and hating it costs nothing:
  - **Normal**, **Squeaky** (faster and higher), **Deep** (slower and lower)
  - **Robot** — ring modulation: a 50Hz oscillator drives a gain node's volume
    knob far too fast to hear as volume
  - **Spy radio** — keeps only 300Hz–3000Hz, then roughs it up slightly
  - **Echo** — a quarter-second delay fed back into itself at 40%
- Tapping a voice plays it **and** chooses it. The choice is saved as a name;
  there is no second audio file.
- **Again** re-records. Only the last recording is kept, and the old one is
  deleted from the iPad rather than left behind.
- Optional **Yes ×3** bonus: three small slots for saying "yes" three ways.
- If the microphone is refused or missing, a calm amber message explains it and
  **Pass** still works — nobody gets stuck.

Missions 3, 5 and 6 are still **placeholders**, built in Milestones 4–8.
The PWA parts (`manifest.json`, `sw.js`, icons, offline) arrive in Milestone 9,
so for now the app needs to be open online once, and is not yet installable.

## Files

| File | What it does |
|---|---|
| `index.html` | Every screen as a `<section>`; only one is visible at a time |
| `style.css` | Look and feel, layout, the motion settings |
| `app.js` | Navigation, missions, state, event log, adult panel |
| `storage.js` | A small, friendly wrapper around IndexedDB |
| `audio.js` | The microphone, the 10-second recorder, the six playback filters |
| `agent-lab-build-spec.md` | The brief this is built from |

Scripts load in order: `storage.js`, `audio.js`, then `app.js`. `effects.js`
joins that list at Milestone 8.

## Run it on this Mac

The app must be served over `http://`, not opened as a file — IndexedDB and the
Content-Security-Policy behave differently on `file://`.

```bash
cd ~/Documents/TACT/agent-lab && python3 -m http.server 8000
```

Then open <http://localhost:8000/> and press `Ctrl-C` in the terminal to stop.
Use **Safari** rather than Chrome — it is the same engine as the iPad, so iPad
quirks show up on the Mac too.

## Test on a real iPad without deploying

The quickest way to get it onto an iPad. With the Mac and the iPad on the same
Wi-Fi, start the server as above, then find the Mac's address:

```bash
ipconfig getifaddr en0
```

Open `http://<that address>:8000/` in Safari on the iPad. No GitHub, no deploy.

Two limits of this route:

- The Mac must stay awake with the server running, and its address can change
  when it rejoins the network.
- It is `http://`, not `https://`. That is fine for now, but **the microphone
  will not work this way** (Milestone 3 onwards) and a service worker will not
  install (Milestone 9). Both need a secure address, so use the GitHub Pages
  URL once those milestones land.

## Deploy to GitHub Pages

The repo is <https://github.com/filipgri/agent-lab>. Every path in the app is
relative, so it works at any address — renaming the repo breaks nothing.

**First time:**

```bash
cd ~/Documents/TACT/agent-lab
git init
git add .
git commit -m "Milestone 0: skeleton"
git branch -M main
git remote add origin https://github.com/filipgri/agent-lab.git
git push -u origin main
```

Then on GitHub: **Settings → Pages → Source: Deploy from a branch →
`main` / `(root)` → Save.** Wait about a minute. The app is then live at
<https://filipgri.github.io/agent-lab/>.

**Every time after that:**

```bash
cd ~/Documents/TACT/agent-lab && git add -A && git commit -m "describe the change" && git push
```

Pages redeploys on its own, usually within a minute.

Free GitHub Pages needs a **public** repo. That is fine: the repo holds only
code, and children's data never leaves the iPads. Note that the adult PIN is
visible in public code — it is a speed bump, not security. If you ever want the
code private, see §14 of the spec for the free Netlify and Cloudflare options.

## Set it up on each iPad

1. Open the address in **Safari**.
2. Tap Share → **Add to Home Screen**.
3. Open the app **from the home-screen icon**, not from Safari.
   The two keep separate storage, so agents saved in one are invisible in the other.
4. Allow the microphone once (from Milestone 3 onwards).
5. Turn on **Guided Access** (Settings → Accessibility) to lock the iPad into the app.

## Known deviation from the spec

Spec §7 asks for a 16×16 grid with cells of **at least 40px**, which needs a
640×640 stage. After the progress strip, agent preview, mission title and the
Stamp it bar that §6 requires, an iPad leaves about 526px of height. So cells
come out at roughly **33px**, in both orientations.

**Decided (2 October 2026): keep 16×16 at ~33px.** Painting is a drag rather
than a series of precise taps, so it is more forgiving than the 40px rule
suggests, and 16×16 leaves room for a face.

If iPad testing with the children says otherwise, it is a one-line change to
`GRID` in `app.js` — 14×14 gives ~37px, 12×12 gives ~44px and meets the rule.
**Changing `GRID` clears any pixel art already saved**, because a saved agent's
pixel array no longer matches the new grid size, so decide before a session
rather than during one.

## Test checklist for Milestone 3

The microphone is the thing to test on a **real iPad**, over the https address
— Safari will not grant microphone access over plain http from another device.

- [ ] Tap 🎤. Does Safari ask permission the first time, and does the ring fill?
- [ ] Say nothing and wait. Does it stop itself at 10 seconds?
- [ ] Does your own voice play back straight away, unfiltered, before any of the
      six voices appear?
- [ ] Try all six. Is Robot recognisably robotic, and Spy radio recognisably a
      walkie-talkie? (This is an ear test — no amount of code review settles it.)
- [ ] **Check the red recording dot disappears** in the iPad status bar after
      recording stops. If it stays lit, the microphone was not released.
- [ ] Tap **Again** and re-record. Is the new one kept and the old one gone?
- [ ] Record, go to another mission, come back. Is it still there?
- [ ] Close the app completely, reopen, **Continue**. Still there?
- [ ] Start a playback, then tap a different mission. Does the sound stop?
- [ ] Say no to the microphone on purpose. Is the message calm, and does Pass
      still work?
- [ ] Are the children happy hearing their own voice? Watch for embarrassment —
      the Pass button matters here more than anywhere else.

## Test checklist for Milestone 2

- [ ] Make an agent in Mission 1, then Stamp it. Does the Boost arrive as a
      copy of it, with the Cover beside it?
- [ ] Paint over the Boost, then go back to Mission 1. Is the Cover untouched?
- [ ] Give it an aura and a background. Do they survive closing the app and
      tapping **Continue**?
- [ ] Is the Powers tab there on Mission 2 and gone on Mission 1?
- [ ] Are the backgrounds clear enough to tell apart at a glance, and does the
      agent still read against each one?
- [ ] Does the glow look like a power, or just like a blur? (Ask a child.)
- [ ] Tap a sticker to select it. It should not jump under your finger.

## Test checklist for Milestone 1

- [ ] Paint with a finger. Does a fast scribble leave a solid line?
- [ ] Are the squares big enough for the children you have in mind? (See the
      deviation note above — this is the open question.)
- [ ] Fill a background, then undo it. Undo should step back one action at a time.
- [ ] Drag a sticker out of the tray onto the agent. Then just tap one instead.
      Which do the children reach for?
- [ ] Put a sticker on the agent's head, then rotate the iPad. It should stay
      on its head.
- [ ] Make something, go to Mission 4, come back to Mission 1. Still there?
- [ ] Close the app completely, reopen, **Continue**. Still there?
- [ ] Six skin tones sit first in the palette. Is the range right?

## Test checklist for Milestone 0

- [ ] Roll a codename a few times; the emoji changes with the animal.
- [ ] **New agent** → lands on Mission 1 with the strip showing one glowing pip
      and the rest as padlocks with question marks.
- [ ] **Stamp it** advances and leaves a stamp; **Pass** advances and leaves a
      grey stamp. Both unlock the next pip.
- [ ] Tapping an earlier pip goes back to that mission.
- [ ] After Mission 6, the Reveal unlocks. **Finish** returns to Start.
- [ ] Close the app completely and reopen it: **Continue** appears and resumes.
- [ ] Hold the logo 3 seconds → PIN `2468` → the agent is listed with its
      event count.
- [ ] **Export all** produces `agent-lab-export-YYYY-MM-DD.json`.
- [ ] Nothing scrolls or zooms by accident; every button is comfortably tappable.
- [ ] Turn on Airplane Mode: everything still works (there are no network calls).

## Do not add

Points, scores, leaderboards, timers (apart from the 10-second recording limit),
camera access, accounts, cloud sync, analytics, AI or online voice services,
external fonts or libraries, or text-heavy instructions. See spec §12.
