# Agent Lab

An iPad web app where children design a spy "agent" avatar, step by step.
Built for a school design club research session (TACT, WP1, Dawn House Design Club).

The full brief lives in [`agent-lab-build-spec.md`](agent-lab-build-spec.md).

- Plain HTML, CSS and JavaScript. No frameworks, no npm, no build step, no CDNs.
- **All data stays on the iPad** in IndexedDB. No accounts, no server, no analytics.
- No camera, ever. Microphone only in the Voice mission (from Milestone 3).
- Codenames only — never real names.

## Current state: v3, for session 3 (`agent-lab-v3-spec.md`)

Session 2 ran on the version tagged **`session-2`** on GitHub (commit
`b0ba4c1`). v3 is being built one milestone at a time on the `v3` branch:

- **P0 — done.** The v2 screens are retired (their data is kept), the strip is
  🎨 🗣️ 📍 ⚡ 🍾, the gallery shows each agent as itself, import takes several
  files and skips agents it already has. `DATA.md` lists every saved field
  and event.
- **Spy words** replace the animals on the Start screen.
- **P1 — built, waiting for a real iPad test.** The relay, a bare display, and
  the adult panel's Display link. See "The display and the relay" below.
- **P2 — built.** A new agent starts from one of eight ready agents (or
  blank), and every agent is asked "Is your agent like you?" once. Review the
  eight in `tools/parts-sheet.html` → **Ready agents**.
- **P3 — built, redesigned after your first try.** 🗣️ How my agent talks:
  one card at a time, acted out by the agent, sorted 👍 🤷 👎; then the best
  one; then the same for school; then a secret word in a spy voice.
- **P4 — built.** 📍 Safe place: where the agent feels safe to talk, and where
  its power stops working. **Off in the session-3 preset**: switch it on in
  the adult panel under Missions this rotation.
- **P5 — built.** ⚡ Powers: make one up first (draw it or say it), or ask for
  ideas behind six doors; then the sentence — when, who, how it switches on,
  so that — and ⚡ Power on!, where the agent does it, big, and the sentence
  reads itself back. Up to three powers.
- **P6 — built.** 🍾 The bottle: up to four things in it, who it is for, signed
  or a mystery, then the cork and a swipe (or hold 🚀). A bottle that cannot
  reach the display waits and goes later — adult panel → Display link shows
  how many are waiting.
- **P7 — built.** The display: the shore, the board and the post shelf. Press
  **?** on the display for the keys. **D** plays a demo bottle even with no
  network — if the room's Wi-Fi fails, you become the relay: press D as each
  child sends.
- **P9 — built.** After a session, at home:

  ```bash
  python3 tools/analyse.py ~/Desktop/exports/*.json
  ```

  It writes `agents.csv`, `powers.csv`, `bottles.csv` and `events.csv`, the
  drawings and recordings, and a card per agent (open `cards/index.html`)
  into `agent-lab-analysis`, next to the agent-lab folder — outside the repo.
  It is research data: move it to KCL storage. Every column is in `DATA.md`.

The rest of this section describes session 2.

## Session 2 (v2 V5)

Everything a child does in **session 2** is built and has been through a real
iPad: codename, Make your agent (Parts or Draw), Power-up, HQ, Voice password,
and the card with its badge and wall checks and the seal.

Sessions 3 and 4 are locked, as §3 intends. Still to build: **V6** exports and
moving agents between iPads, **V7** force field and mood codes, **V8** rules,
badge & poster and the dossier, **V9** polish and the final test.

Not yet tried on real hardware: **the microphone**, and the animations — the
browser used for development reports itself as hidden, so it paints none of
them.


Working now:

- All screens exist; one is visible at a time.
- Start screen with the 🎲 codename roller (a describing word + a spy word, whose
  symbol is a badge on an empty agent; animals until session 2), ⌨️ typing.
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

### Mission 3 works

- **The blank tile comes first.** Three empty slots, no faces anywhere on
  screen. The child draws their own sign on a small canvas with a thick,
  smoothed brush, six light colours, undo and clear.
- **"Need ideas?"** reveals the six faces — 😀 😢 😠 😨 😌 🤪 — and only then.
  The button disappears once used. The event log records the order, so you can
  check afterwards how many children drew before they asked.
- Up to **three codes**. Each can also have a name recorded (🎤, 5 seconds, no
  typing anywhere).
- For each: **"How does your agent move when it feels this?"** — bounce, shake,
  sway, spin or still, previewed live on the agent thumbnail. **The child always
  chooses.** Nothing in the app decides that sad means droop.
- Finally **"Which one is your agent wearing today?"**, with **None** as an
  equal choice, styled the same as the rest.
- Codes can be reopened, edited, or removed.

### Mission 5 works

- Five place cards: 🔒 Just me, 🏷️ My badge, 🏫 My class, 🖼️ School wall,
  🏠 Home. Tapping one **flips it over** to five big on/off switches: Cover,
  Boost, Feeling code, Voice, Codename.
- **Everything is off by default**, and there is deliberately no "share
  everything" button. A child who taps nothing has shared nothing, and that is
  a complete, valid answer.
- The front of each card then shows small icons of what is going there, so you
  can see every decision at a glance without opening anything.

### Mission 6 works

- Three rule cards: ✋ Don't…, 👍 You can…, 💛 When I'm upset I need…
- Three ways to answer, and **no typing anywhere**: tap any of the fourteen
  icons, draw your own on a small sheet, or record it (🎤, 8 seconds).
- Everything chosen appears as a chip with a ✕ to take it off again. Tapping a
  recorded chip plays it back.

### The Reveal works

- The dossier card shows everything the child made: codename, the Cover and
  Boost agents side by side, the feeling code they are wearing, a ▶️ that
  plays their voice password **in the voice they chose**, and their rules.
- **Save card** renders it to a PNG and offers the iPad share sheet
  (`navigator.share`), so it can go to Photos, Files, AirDrop or Messages.
  Browsers without file sharing get an ordinary download instead.

### The Build and Draw doors work

- **Parts** (called Build in v1): a tray of seven shapes — circle, oval, square, rounded square,
  triangle, star, blob. Drag one on, or tap it to drop it in the middle. Tap a
  shape to select it, then use **buttons** to make it bigger or smaller, turn
  it, send it to the front or back, recolour it, or remove it. Buttons rather
  than pinch gestures, which are much harder for small hands.
- **Draw:** a big canvas with a smoothed brush in three thicknesses, the full
  sixteen-colour palette, undo and clear — plus a **🪞 Mirror** that copies
  every stroke left-to-right, which makes drawing a face far easier.
- Each door keeps its own work. Switching between them loses nothing, and
  **Clear** only clears the door you are actually in.
- The saved ID card draws whichever door was used.

### Polish and juice work

- **🧩 Something's missing** is on every screen and is now real: the child
  draws or says what the app would not let them do, and it is saved against
  the screen they were on. **That is research data about our own design gaps**
  — it comes out in the adult panel's export with everything else.
- **🔊 speaks the prompt**, so nothing depends on being able to read. If you
  record `audio/m1.m4a`, `audio/m2.m4a` and so on and put them next to the
  app, those play instead of the synthetic voice.
- **Sounds** — stamp, pop, whoosh, power-up — are generated in the app rather
  than loaded, so there are still no files to download and nothing to go
  missing offline. The 🔊 mute button silences all of it.
- **Animation** per spec §5a: the agent bobs and reacts to a tap, grows with
  its own voice while the password plays, a 2.5-second power-up when the Boost
  opens (with a ✨ to see it again), a scanner sweep and decrypting title
  between missions, and the dossier finale at the Reveal. **Tap anywhere to
  skip** any long sequence.
- **Motion level** in the adult panel: **Full**, **Calm** (no shake, no
  particles, no idle motion) or **Off**. It defaults to Calm automatically if
  the iPad has Reduce Motion switched on.

### v2 so far

**V0 — foundations.** The stranded sticker ghost is fixed, the glow now covers
Build and Draw agents, and the asset system is in: 171 pictures, voice lines
and sounds, each with a stand-in, so **the app works fully with an empty
`assets/` folder**. Adult panel → Asset check is your to-do list. Agents are
migrated to the v2 data model on load, keeping everything in `legacy`.
Sessions decide which missions are open, and practice mode keeps try-outs out
of the research data.

**V2 — the parts kit.** The Build door is now **Parts**: 85 pieces drawn in
code that a child taps to build a face. Tapping snaps a part onto the head, so
a face takes about seven taps rather than ten careful drags. Every piece
recolours — ten skin tones plus fantasy colours, thirteen hair colours — and
all sixteen hairstyles and seven head coverings the brief asks for are there,
alongside hearing aids, a cochlear implant and ear defenders as ordinary
options rather than special ones. The sticker tray is now the full library
with fourteen tabs and a 🔍 search. Open `tools/parts-sheet.html` to review
every part before a session.

**V1 — codename and gallery.** Two reels you can lock separately, a big
tappable emoji that says the name, and typing your own spy name — which offers
matching symbols as you type and sends anything it hasn't got to HQ as a
request. Every agent on the iPad appears in a gallery on the Start screen, so
children can carry an agent across weeks.

### Offline works

- Agent Lab installs to the home screen and **opens with the Wi-Fi off** once
  it has been loaded through once. A school's patchy wireless cannot stop a
  session any more.
- A new version **never takes over mid-mission**. It waits, and a small
  "✨ New version ready — tap to update" banner appears so an adult can pick
  the moment.
- The adult panel tells you plainly whether offline is actually working on
  that iPad — check it before a session rather than hoping.

**Releasing a new version:** bump `CACHE_VERSION` in `sw.js` *and* the `?v=`
number on the five links in `index.html` (they must match the ones listed in
`sw.js`). Miss this and the iPads keep running the old app.
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
| `DATA.md` | Every saved field and every logged event |
| `display/relay.py` | **v3.** Runs on the laptop: takes bottles from the iPads, feeds the display |
| `display/index.html` | **v3.** The big-screen display (with `display.js` and `display.css`) |

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

**Do this before any agents are made.** A home-screen app keeps its own
storage, separate from Safari's, so anything already made in a Safari tab will
not be in it.

1. Open the address in **Safari**.
2. Tap Share → **Add to Home Screen**.
3. Open the app **from the home-screen icon**, not from Safari.
   The two keep separate storage, so agents saved in one are invisible in the
   other. The home-screen app also runs full screen, with no address bar,
   which gives the app back about 90px of height and keeps children in it.
4. Allow the microphone once, when the Voice mission first asks.
5. **Turn Wi-Fi off and open the app again.** It should work. If it does not,
   it has not finished caching — put Wi-Fi back on, open it, wait ten seconds,
   and try again.
6. Turn on **Guided Access** (Settings → Accessibility) to lock the iPad into
   the app.

### Android tablets

The same app works as an installed web app in Chrome: ⋮ → **Install app**.
Two differences worth knowing:

- Storage is **not** separate from the browser there, so clearing Chrome's
  data clears the app's agents too. The separation is an iOS behaviour.
- Emoji are Google's rather than Apple's, so they look different. The
  photographs and the parts kit are the project's own files and are identical.


## The display and the relay (v3)

From session 3 a child can send a **bottle** to the big screen. That bottle,
and nothing else, goes from the iPad to your laptop over the room's own Wi-Fi.
Everything else still stays on the iPad.

Three pieces:

- **`display/relay.py`** runs on your laptop. The iPads send bottles to it.
  It keeps them in memory only. Nothing is written to disk, and Ctrl-C
  forgets them all. It prints one line per bottle (time, who it is for,
  signed or mystery, the kinds of thing inside, size), never what is in it.
- **The display** is a web page the relay serves. Open it full screen on the
  laptop and show it on the TV or projector. For now (P1) it shows each
  arrival's codename with a chime; P7 makes it the shore and the board.
- **Adult panel → Display link** on each iPad: the relay's address, 📡 Test,
  an on/off switch (off until you turn it on) and 🍾 Send test bottle.

### Setting up the room (once)

**1. A pocket Wi-Fi router** (no internet needed), or a phone hotspot. The
laptop and every iPad join it. School Wi-Fi often stops devices talking to
each other, which is why the room brings its own.

**2. Give the laptop a name the iPads can find.** The app looks for
`tact-display.local`. Either:

- **rename the laptop:** System Settings → General → Sharing → Local hostname
  → `tact-display`. (On a KCL-managed laptop this may need IT.) Or
- **keep its own name.** This Mac is currently `KCLYM40H56Y9W`, so it is
  `kclym40h56y9w.local`. Use that wherever these steps say
  `tact-display.local`, start the relay with
  `python3 display/relay.py --host kclym40h56y9w.local`, and type
  `kclym40h56y9w.local:8443` into each iPad's Display link address. Any name
  ending in `.local` works; port 8443 is the only one allowed.

If macOS asks whether Python may accept incoming connections, say **Allow**.

**3. Make a certificate,** so the iPads can talk to the laptop over https
(the app is not allowed to use anything else). In Terminal, in the agent-lab
folder:

```bash
brew install mkcert
```
```bash
mkcert -install
```
```bash
mkcert -cert-file display/certs/cert.pem -key-file display/certs/key.pem tact-display.local localhost 127.0.0.1
```
```bash
mkcert -CAROOT
```

The last command prints a folder. `rootCA.pem` in that folder is what each
iPad needs. `display/certs/` is git-ignored: **never commit a certificate or
key.**

**4. On each iPad, once:**

1. AirDrop `rootCA.pem` to the iPad.
2. Settings → Profile Downloaded → Install.
3. Settings → General → About → Certificate Trust Settings → switch it on.

**5. Before the session,** open the app once on each iPad *with* internet, so
the latest version is cached and works offline on the router.

### Running it in a session

```bash
python3 display/relay.py
```

It prints the display's address. Open `https://localhost:8443/` on the laptop,
click **Click to start the display** once (browsers only allow sound after a
click), and press **F** for full screen. A small dot in the corner is green
while the display is connected to the relay.

**The display's keys** (press **?** to see them on screen):

| Key | Does |
|---|---|
| Space | release the next bottle |
| A | switch between automatic (3 seconds) and held release — the corner shows ▶️ or ✋ |
| P | pause or resume |
| **H** | **hide the bottle on screen (safeguarding)** — it also leaves the relay, so a reload cannot bring it back. With nothing playing, H takes down the last thing pinned |
| C | clear the board |
| M | mute |
| F | full screen |
| **D** | a demo bottle — works with no network at all |
| number keys | a demo of one door's powers, in the iPad's door order |
| S | settings: motion (Full / Calm / Off), and "real for a minute" |

**Real for a minute** (S): every power is off until you switch it on, and
the settings are forgotten when the display is reloaded. Only switch on
powers agreed with staff beforehand. When one arrives, a ring empties over a
minute, with a soft bell at the start and the end.

On each iPad: adult panel → **Display link** → **📡 Test** (✅ expected) →
switch it **On** → **🍾 Send test bottle**, which should appear on the display
within a second.

**To try the display on the laptop without a certificate:**
`python3 display/relay.py --no-tls`, then open `http://localhost:8443/`. The
iPads cannot reach it in this mode, because the app only talks https.

**If an iPad cannot find the laptop** (📡 Test keeps saying ⚠️ while the relay
is running and the laptop's own display works), check the iPad and the
laptop are on the same router, and that the certificate is trusted on the
iPad (step 4). If it still fails, stop there: the fix (a fixed address in the
certificate and in the app's security settings) changes how the link works,
and needs a decision first. The display can still run its demo bottles alone.

## Before and after every session

The app keeps everything on the iPad. From v3 the one exception is a bottle a
child chooses to send to the display. That is the point, and it is also the
risk: **agents live in the browser's website data,
so "Clear History and Website Data" deletes them.** No setting prevents this.
Exporting is the only copy that survives it.

### Before a session, on each iPad

| | Check |
|---|---|
| ☐ | Opened from the **home-screen icon**, not Safari |
| ☐ | Open the adult panel (hold the logo 3s, PIN `0502`) |
| ☐ | **Offline** says `ready — works offline ✅` |
| ☐ | **Asset check** lists everything as ✅ |
| ☐ | **Session** is set to the right week, and the right missions are unlocked |
| ☐ | **Practice mode is OFF** — practice agents are left out of exports |
| ☐ | **Display link**: 📡 Test shows ✅, and the link is **On** (v3) |
| ☐ | Battery over 50%, Guided Access on |

If you want to try the app yourself first, turn **Practice mode on**, do what
you like, then turn it off. Practice agents are labelled and excluded from the
research data.

### After a session, on each iPad

| | Check |
|---|---|
| ☐ | Adult panel → the backup line reads **✅**, not ⚠️ |
| ☐ | **Export all** → save the JSON file somewhere off the iPad |
| ☐ | Note which iPad it came from — the filename does not say |
| ☐ | Write each child's **codename** on the paper register |

The backup line states the position plainly, for example:

```
⚠️ 19 agents on this iPad · last export 6 min ago · 1 added since
```

Amber means something would be lost if the iPad were wiped. Green means the
export covers everything on it.

### Putting an export back (after a wipe, or onto another iPad)

Adult panel → **⬇️ Import from a file** → pick the exported `.json`.

It restores the agents, their drawings, their chosen places and powers, every
recording, and the full event log. Verified by exporting, deleting everything
on the device, and importing: the recordings come back byte for byte.

It **adds**; it never replaces. Importing a file whose agents are already here
keeps both copies with new ids, rather than silently overwriting a child's
later work — so re-importing by mistake costs you a tidy-up, not a session.

This is also how a child carries on next week on a **different iPad**: export
from the old one, import on the new one.

### Three things that lose a child's work

1. **Clear History and Website Data** in Safari settings — deletes every agent
   in the Safari tab. (It does not touch the home-screen app.)
2. **Deleting the home-screen icon** — deletes that app's agents with it.
3. **A different iPad next week.** Agents live on the iPad they were made on.
   Until V6 adds "move an agent", a child needs the same one — so label the
   iPads and hand them out the same way each week.

### Keeping track of whose is whose

The app never asks for or stores a real name, so it cannot tell you. The
register is the only link, and it lives on paper with the school:

| Child | Codename | iPad |
|---|---|---|
| | | |

Codenames are **not unique** — 24 describing words × 24 spy words is 576
combinations, so in a group of 20 two children share one about a quarter of
the time. The gallery shows every agent as itself (v3), so a child can still
pick theirs out. Write
the codename down at the end of the session, when a duplicate is easy to spot
and easy to fix by re-rolling one.

### If an iPad shows an old version

Add a number you have not used before to the address:

```
https://filipgri.github.io/agent-lab/?fresh=7
```

Any unused query misses every cache. To see what it is really running, use
`?diag=1` — the first line gives the version.

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

## Test checklist for Milestone 9

- [ ] Open the https address in Safari on the iPad, then **Share → Add to
      Home Screen**. Is the spy hat icon there, with the name "Agent Lab"?
- [ ] Open it from the icon. Does it fill the screen with no Safari chrome?
- [ ] In the adult panel, does it say **"Offline: ready — works offline ✅"**?
      If not, do not rely on it in a session.
- [ ] Now **turn Wi-Fi off** and open it from the icon again. Does it work?
- [ ] Make an agent with the Wi-Fi still off. Does everything save?
- [ ] Push an update, then reopen. Does the banner appear rather than the app
      changing underneath you?

## Test checklist for Milestone 8

- [ ] Is any of it too much? **Calm is one tap away in the adult panel** —
      use it if a child is overwhelmed, and note that you did.
- [ ] Tap 🔊 on each mission. Is the synthetic voice clear enough, or should
      you record the prompts yourself?
- [ ] Tap 🧩 on a few screens, draw something, send it. Does it come out in
      the adult panel's export, tagged with the right screen?
- [ ] Does the Boost power-up land, and do children ask to see it again?
- [ ] At the Reveal, does tapping skip the finale?
- [ ] **Watch for anyone startled by the sounds.** Mute is in the top bar.
- [ ] Turn on Reduce Motion in iPad Settings and reopen. Does the app come up
      in Calm by itself?

## Test checklist for Milestone 7

- [ ] Try all three doors with the same agent. Does each keep its own work?
- [ ] In Build, is dragging a shape out of the tray easy, or do children tap
      instead? Both work — worth noting which they reach for.
- [ ] Are the shape buttons (bigger / turn / front / back) understood without
      explanation?
- [ ] In Draw, try the 🪞 mirror. Do children use it for faces?
- [ ] Is the thin brush too thin on a real iPad?
- [ ] Press Clear in one door. Does it leave the other doors alone?
- [ ] Make an agent in Build or Draw, go to the Reveal, and **save the card**.
      Does the agent appear on it?

## Test checklist for Milestone 6

- [ ] Does the card show everything the child actually made?
- [ ] Tap ▶️. Does the password play in the voice they chose, not plain?
- [ ] **Tap Save card on the real iPad.** Does the share sheet appear, and can
      you save to Photos? This is the one I could not test — the browser I
      build in has no share sheet, so only the fallback path was exercised.
- [ ] Open the saved PNG. Does it match the card on screen?
- [ ] Try it from the **home-screen icon** as well as Safari: plain downloads
      are unreliable there, which is why sharing is the main route.
- [ ] Try a nearly empty agent (pass everything). Does the card still make
      sense, with "none" where things are missing?

## Test checklist for Milestone 5

- [ ] Does the card flip read as a card turning over, or just as a flicker?
- [ ] **Check every card starts with everything off.** This is the one that
      matters most — if any switch is on before a child touches it, stop.
- [ ] Are the switches obviously on/off at a glance, from a standing adult's
      distance as well as the child's?
- [ ] Set something, go to another mission, come back. Still set?
- [ ] In Mission 6, try all three ways in: tap an icon, draw one, record one.
      Which do the children reach for? That is worth noting.
- [ ] Tap a recorded rule chip. Does it play back?
- [ ] Remove a chip with the ✕. Is it small enough to not get hit by accident,
      but big enough to hit on purpose?
- [ ] Rotate the iPad in both missions.
- [ ] Close the app completely, reopen, **Continue**. Everything still there?

## Test checklist for Milestone 4

- [ ] Does a child face a genuinely blank square, with no faces visible?
- [ ] Watch how many draw something before pressing **Need ideas?** — that is
      the measurement this mission exists for.
- [ ] Is the brush thick enough, and does a fast scribble come out smooth?
- [ ] Try all five movements. Is **shake** gentle rather than alarming?
- [ ] Does the movement preview stop when you leave the mission?
- [ ] Make three codes, remove the middle one. Does the right one stay worn?
- [ ] Press **Keep it** without drawing. Does it ask you to draw first?
- [ ] Rotate the iPad while the maker is open — portrait and landscape.
- [ ] Close the app completely, reopen, **Continue**. Are the signs still there?

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

- [ ] Roll a codename a few times; the badge on the empty agent changes with the spy word.
- [ ] **New agent** → lands on Mission 1 with the strip showing one glowing pip
      and the rest as padlocks with question marks.
- [ ] **Stamp it** advances and leaves a stamp; **Pass** advances and leaves a
      grey stamp. Both unlock the next pip.
- [ ] Tapping an earlier pip goes back to that mission.
- [ ] After Mission 6, the Reveal unlocks. **Finish** returns to Start.
- [ ] Close the app completely and reopen it: **Continue** appears and resumes.
- [ ] Hold the logo 3 seconds → PIN `0502` → the agent is listed with its
      event count.
- [ ] **Export all** produces `agent-lab-export-YYYY-MM-DD.json`.
- [ ] Nothing scrolls or zooms by accident; every button is comfortably tappable.
- [ ] Turn on Airplane Mode: everything still works (there are no network calls).

## Do not add

Points, scores, leaderboards, timers (apart from the 10-second recording limit),
camera access, accounts, cloud sync, analytics, AI or online voice services,
external fonts or libraries, or text-heavy instructions. See spec §12.
