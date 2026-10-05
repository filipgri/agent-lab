# Agent Lab v2 — Change Spec

Changes to Agent Lab after the first test of Milestone 9 (commit `eb06655`). Written for Claude Code.

**Read together with** `agent-lab-build-spec.md` (the original brief) and `asset-guide.md` (every image, voice line and sound, with filenames).
**Where this file and the build spec disagree, this file wins. For assets, `asset-guide.md` wins.**

---

## 0. How to use this file (for Filip)

1. Put `agent-lab-v2-spec.md` and `asset-guide.md` in the `agent-lab` folder, next to `agent-lab-build-spec.md`.
2. Open the folder in Claude Code and say: **"Read agent-lab-v2-spec.md and asset-guide.md, then build V0 only. Stop and explain what you did."**
3. Test on an iPad (§11). Then ask for the next milestone.
4. **V0–V5 are needed for session 2.** V6 comes before session 3, V7 is for session 3, and V8 is for session 4.
5. Make the images and sounds at the same time (see `asset-guide.md`). Put downloads in `assets/incoming/` and say **"Bring in the new assets."**

---

## 1. Instructions for Claude Code

Everything in §1 of the build spec still applies:
- Filip is a beginner, so explain each milestone in plain language, explain new syntax, and comment generously.
- Build one milestone at a time, then stop.
- Use plain HTML, CSS and JavaScript, with no frameworks, build step, external libraries, CDNs, web fonts or analytics.

**What changes:**
- **Local asset files are allowed.** Images and audio live in `assets/` and are listed in `assets/manifest.json`. Every asset has a stand-in, and **the app must work fully with an empty `assets/` folder.** This amends build spec §4 and §13, and the CLAUDE.md rule "sounds are generated, never loaded". A sound file is used if it exists; otherwise the app plays the generated sound.
- **The data model changes in §6 are approved.** Anything beyond them still needs asking.
- **New files allowed:** `assets.js` (loads assets), `parts.js` (the parts kit) and `stickers.js` (the sticker library). Mission logic stays in numbered sections of `app.js`.
- **Authoring tools may live in `tools/`**, like `icons/make-icons.py`. They run on Filip's computer to prepare assets and may call online services. The app never does, and never loads anything from `tools/`.
- **The app never interprets a child.** No scores, no inferred feelings or labels, no suggestions based on what a child chose. It records what the child did, in order, and that record is the research data.
- **At V0, update `CLAUDE.md`.** Point it to both new files, list the new files and conventions, and continue the progress log (V0, V1, …).
- **Before calling a milestone done,** drive it in a browser in landscape and portrait, once with assets and once with `assets/` empty.

---

## 2. Why v2

Testing v1 showed three problems.

**1. Choices without links.** Each mission captured *what* a child picked, never what it was for, who it was for or when. A rule with no addressee, a feeling sign with no situation, or a glow with no job can't be interpreted, so it can't become a requirement for the badge. Each v2 mission adds that link:

| Mission | The child… | The link | What it gives the badge and display |
|---|---|---|---|
| Codename | spins, locks or types a spy name; picks an emblem | locks and re-rolls show a deliberate choice | a public pseudonym and an icon |
| Make | builds from parts, pixels or a drawing, plus stickers | searches and "something's missing" | the avatar picture, and the library's gaps |
| Power-up | invents a power, its look, and when it's used | power × situation | moments where children want support |
| HQ | picks or draws where the agent is strongest | place | where agents should appear |
| Voice | records, picks a disguise, says it three ways | raw vs disguised | greeting audio |
| Force field | sets its size and look; reacts to who comes close | reaction × person | a "bubble today" signal |
| Mood codes | moment → reaction → sign → readers | moment × sign × readers | discreet signals with chosen readers |
| Rules | who × please/don't × action × when | addressee and condition | messages for conversation partners |
| Badge & poster | places pieces on the badge, secret pocket and wall; the rest stays in the vault | item × device × audience | content and access rules |

**2. Objects, not parts.** Emoji are whole things, so children could decorate an agent but not build a face or a body. v2 adds a parts kit drawn in code.

**3. Too much for one rotation.** Nine screens didn't fit a 12–15 minute rotation. v2 unlocks missions across sessions (§3).

---

## 3. Missions, sessions and unlocks

Mission ids become words. §6.2 maps v1's `m1`–`m6` onto them.

| Strip | id | Mission | Opens in session | Target time |
|---|---|---|---|---|
| (Start) | `codename` | Codename | 2 | 1 min |
| 🎨 | `make` | Make your agent | 2 | 5 min |
| ⚡ | `powerup` | Power-up | 2 | 3 min |
| 📍 | `hq` | HQ | 2 | 1 min |
| 🎤 | `voice` | Voice password | 2 | 2 min |
| 🛡️ | `field` | Force field | 3 | 3 min |
| 💛 | `mood` | Mood codes | 3 | 6 min |
| 📋 | `rules` | Agent rules | 4 | 5 min |
| 🏷️ | `badge` | Badge & poster | 4 | 5 min |
| 🗂️ | `card` | Agent card → Dossier | 2 (grows) | 1 min |

- **Adult panel → Session:** pick 2, 3, 4, 5 or 6. This applies the preset above. The adult can then switch single missions on or off, for example turning HQ off when time is short.
- **Locked missions** keep the 🔒 + "?" look. They can't be opened, and tapping one plays `nar-locked`. Log `locked_tap`.
- **Until a mission's v2 screen exists,** keep its v1 screen (feeling code → `mood`, places → `badge`, rules → `rules`) or show a "coming soon" placeholder with Stamp it and Pass (`hq`, `field`).
- **Every event carries `session`.** Each agent also keeps a list of the `sessions` it was worked on.
- **Practice mode** is an adult panel switch. Agents made in practice mode get `practice: true` and a PRACTICE label, and are left out of exports unless the adult ticks "include practice". This keeps test data out of the research data.
- **Agents carry over between weeks** through the gallery (§5.2).

---

## 4. Bug fixes (V0, first)

**4.1 The stranded sticker ghost** (the floating dog in every test screenshot). `startTrayDrag` adds its move and up listeners to the tray button. If the tray is rebuilt during a drag, or pointer capture is lost, `up` never fires. The tray is rebuilt whenever `buildStickerTray()` runs on a tab tap. From then on the ghost (`position: fixed; z-index: 70`) floats over every screen. To fix it:
- while dragging, listen for `pointermove`, `pointerup` and `pointercancel` on `window`, and also handle `lostpointercapture`;
- put all the clean-up (removing listeners and the ghost) in one function that every exit path calls;
- as a safety net, have `leaveCurrent()` remove any leftover `.sticker-ghost` and any other drag preview;
- use the same pattern in `startShapeTrayDrag` and in every new drag in v2.

**4.2 The glow skips Build shapes and Draw drawings.** The CSS rule under `.agent-view.has-aura` only filters `.agent-pixels` and `.sticker-layer`. Apply it to `.agent-shapes` and `.agent-drawing` too, or to one wrapper around all the layers. Match the change in `drawCardToCanvas()`.

**4.3 Remove the codename "Say it" button** (`btn-codename-mic`).

**4.4 Look for anything else added to `document.body` during a gesture,** and make sure every path removes it.

---

## 5. Changes, mission by mission

### 5.0 The asset system (V0)

```
assets/
  manifest.json          made by you from the tables in asset-guide.md
  incoming/              Filip's raw downloads (git-ignored, never shipped)
  img/hq/                hq-*.jpg
  img/situations/        sit-*.jpg
  img/stickers/          stk-*.png
  img/ui/                ui-*.png (optional)
  audio/narrator/        nar-*.mp3
  audio/sfx/             sfx-*.mp3
  reference/             ref-*.png  (for you to look at while drawing parts; git-ignored, never shipped)
```

**`assets/manifest.json`** has one list per asset type:

```json
{
  "version": 1,
  "hq":         [{ "id": "hq-classroom", "file": "img/hq/hq-classroom.jpg", "label": "Classroom", "kind": "real", "fallback": "🏫", "prompt": "…" }],
  "situations": [{ "id": "sit-too-loud", "file": "img/situations/sit-too-loud.jpg", "label": "Too loud", "fallback": "🔊", "prompt": "…" }],
  "stickers":   [{ "id": "stk-cape", "file": "img/stickers/stk-cape.png", "label": "Cape", "tab": "clothes", "keywords": ["cape", "hero", "cloak"], "fallback": "🧣", "isNew": false, "prompt": "…" }],
  "narrator":   [{ "id": "nar-make-intro", "file": "audio/narrator/nar-make-intro.mp3", "text": "Make your agent. Pick a door." }],
  "sfx":        [{ "id": "sfx-stamp", "file": "audio/sfx/sfx-stamp.mp3", "fallback": "stamp" }]
}
```

- **Build the manifest from the tables in `asset-guide.md`.** When Filip says **"sync the asset list"**, rebuild it from the guide. The guide is the source, so never edit both by hand. (`prompt` is for the tools only; the app ignores it.)
- **`assets.js`** gives the rest of the app four things. None of them ever throws.
  - `Assets.ready`: a Promise that resolves once the manifest has been read, or found to be missing.
  - `Assets.image(id)`: resolves to a loaded `<img>`, or `null`.
  - `Assets.say(id)`: plays the narrator file, or speaks its `text` with `speechSynthesis`.
  - `Assets.sfx(id)`: plays the sound file, or the generated sound named in `fallback` (`Voice.sfx`).
- **Stand-ins:**
  - A missing picture becomes a card with a soft gradient, the `fallback` emoji large in the middle, and the label underneath.
  - Missing narration becomes speech.
  - A missing sound becomes the generated sound.
- **Volumes:** narrator 1.0 and sound effects 0.5, as named constants. Several children are sound-sensitive.
- **Service worker:** precache the app files with `addAll`, as now. Then add each manifest file **one at a time, ignoring failures**, so one missing asset never breaks the offline install. Bump `CACHE_VERSION` and every `?v=`, as CLAUDE.md requires.
- **Adult panel → Asset check:** list every manifest item, grouped by type and marked ✅ (file loads) or ⚠️ (stand-in), with counts per group and ▶️ for narration and sounds. This is Filip's live to-do list.
- **"Bring in the new assets"** is a procedure for you; write it into CLAUDE.md. For each file in `assets/incoming/`:
  1. Match it to a manifest id by its filename, ignoring case, spaces and suffixes like `(1)`. Ask if unsure.
  2. Convert it:
     - HQ and situation images become JPEG, longest side 1024 px, quality about 80.
     - Stickers become PNG, longest side 512 px, with transparency kept.
     - Audio files (made by hand rather than by `tools/make_audio.py`) are moved as they are.
     - On a Mac use the built-in `sips` command; if it isn't available, ask Filip to use squoosh.app.
  3. Check that a sticker's corners are really transparent, not a painted checkerboard or a white box. If not, tell Filip.
  4. Move it to its folder under its exact manifest filename. Report what came in and what is still missing.
  5. Bump the versions so the iPads update.
- **Add to `.gitignore`:** `assets/incoming/`, `assets/reference/` and `.env`.

### 5.1 Codename (V1)

- **Two big buttons only:** 🎲 Roll and ⌨️ Type.
- **Two reels side by side:** [word] and [animal + emoji].
  - Roll spins both with `sfx-reel-spin`; they stop one after the other, each with `sfx-reel-stop`.
  - Under each reel is a 🔒. A locked reel doesn't spin, so a child can keep "Bear" and re-roll the word.
  - Log `codename_spin` {word, animal, locks} and `codename_lock` {reel, on}.
- **Make it readable for dyslexic children:**
  - the emoji about 160 px;
  - words at least 44 px, bold, letter-spacing about 0.06 em, sentence case, no italics, strong contrast;
  - nothing else competing on the screen.
- **Make the emoji the hero.** Tapping it makes it bounce and speaks the name with `speechSynthesis` (there's no audio file per name).
- **Type** opens a sheet with a big text field (20 characters at most), the placeholder "Make up a spy name", and 🔊 `nar-codename-type`.
  - After typing, search the sticker keywords (§5.3.2) for each word and show matching emblems as big tiles. The child picks one or keeps 🕵️.
  - Unmatched words go to `requests` and show "📡 Request sent to HQ" (`nar-codename-request`).
  - Never ask for a real name.
  - Log `codename_type` {text} and `emblem_choose` {value}.
- **The emblem** is the emoji or image sticker the child chooses, saved as `emblem`.
  - It's the first tile in the sticker tray (★ Me tab), so a child can put it on the agent like a logo, at any size.
  - It's also the badge icon (§5.11).

### 5.2 Gallery, seal and moving agents

**Gallery (V1).**
- The Start screen shows 🕵️ New agent, plus a tile for each agent on this iPad with only its emblem and codename.
- Tapping a tile opens that agent where it left off. Log `agent_open`.
- Practice agents are labelled.
- Children may continue the same agent in later sessions.

**Seal (V5, optional, offered on the card).** It isn't security: it's a spy-themed privacy choice, and who seals is data.
- "Seal your file?" asks the child to pick 3 symbols, in order, from 9 big ones: 🦊 🌙 ⚡ 🍕 🎈 🌵 🐙 🎲 🔑.
- A sealed tile shows 🔒 and asks for the symbols (`nar-seal-open`).
- A wrong try just shakes; there's no lock-out. "Ask a grown-up" opens the file with the adult PIN.
- Log `seal_set`, `seal_open_ok` and `seal_open_fail`.

**Move an agent (V6, adult panel).** Children won't always get the same iPad.
- "Send to another iPad" shares one agent, with its recordings, as a JSON file through `navigator.share`.
- "Import agent" opens a file picker and adds the agent, giving it a new id if the old one clashes.

### 5.3 Make your agent (V2)

The doors become **Parts · Pixel · Draw**, with card ids `door-parts`, `door-pixel` and `door-draw`. Build is renamed Parts and grows into a parts kit. Pixel and Draw stay as they are, apart from fix 4.2.

**5.3.1 The parts kit (`parts.js`).** These are flat SVG parts that you draw, so they can be recoloured, line up on a face, and stay crisp on a 320×240 badge.
- **Format:** each part is an SVG fragment in a 100×100 box centred on 50,50.
  - Elements with class `tint` take the chosen colour; other fills stay fixed (eye whites, for example).
  - Use one outline everywhere: 2.5 units, `#1b1b2f`, round joins and caps.
- **Each part has** an `id`, a `cat`, a `palette` (`skin`, `hair`, `eyes` or `any`), an `anchor` (its default position, in stage fractions) and a `size` (its default width, as a fraction of the stage).
- **Categories and minimum counts.** In every tray, non-human options come first.

| cat | min | must include |
|---|---|---|
| heads | 8 | round, oval, square, long, bean, robot screen, monster, animal |
| eyes | 10 | dots, round with pupils, sleepy, happy arcs, wide, stars, hearts, wink, determined, robot visor |
| brows | 5 | neutral, raised, cross, worried, wiggly |
| mouths | 10 | smile, grin with teeth, laugh, flat, small "o", frown, wobbly, tongue out, zipped, robot grille |
| noses | 5 | dot, button, triangle, snout, beak |
| ears | 8 | round, pointy, animal, big, antenna; hearing aid (behind the ear), cochlear implant processor, ear defenders |
| hair | 16 | short crop, buzz cut, short curls, afro, afro puffs, cornrows, box braids, locs, twists, top bun, ponytail, long straight, bob, wavy, spiky, mohawk |
| headwear | 7 | hijab, turban (dastar), headscarf, beanie, cap, hood, headband |
| bodies | 8 | three human shapes, hoodie, super suit, robot, blob, furry monster |
| extras | 8 | three glasses styles, goggles, freckles, blush, tail, horns |

- **Palettes:**
  - `skin`: 10 tones from very light to very dark, plus 6 fantasy colours;
  - `hair`: black, dark brown, brown, auburn, blonde, ginger, grey and white, plus 4 fantasy colours;
  - `eyes`: 6 natural colours, plus 4 fantasy;
  - `any`: the existing 16.
  
  The part's own palette shows first; everything else is behind "More".
- **Placing:**
  - Tapping a part snaps it to its anchor. If a head exists, face parts and hair go where they belong on the most recently added head, scaled to it.
  - Dragging fine-tunes the position.
  - Layers follow category order: bodies, heads, ears, noses, eyes, brows, mouths, hair, headwear, extras. ⬆️ ⬇️ override the order, and ↔️ flips a part.
- **Data:** parts live in the existing `shapes` array as more `type`s, for example `{ "type": "eyes-stars", "x": 0.5, "y": 0.4, "size": 0.3, "rotation": 0, "colour": "#4cc9f0", "flipX": false }`. That way `renderShapes()`, `shapeElement()` and the card renderer are extended rather than copied. The seven v1 shapes stay, as category `shapes`.
- **No gendered words anywhere:** no boy or girl; bodies are "Body 1", "Body 2", and so on.
- **Review page:** `tools/parts-sheet.html` shows every part in every palette, so Filip can check them before a session. If `assets/reference/ref-*.png` files exist, look at them while drawing, especially for hair.
- **If Filip judges the parts poor after review,** ask before switching to an openly licensed (CC0) parts set.
- **Log** `part_add`, `part_move`, `part_recolour`, `part_flip`, `part_layer` and `part_remove`, each with the part's `type`.

**5.3.2 The sticker library (`stickers.js`).** Replace the 31 emoji with about 180, each with 3–6 lower-case keywords.
- **Tabs** (icon + one word, with ids in brackets): ★ Me (`me`) · 🎩 Heads (`heads`) · 👓 Eyes (`eyes`) · 👂 Ears (`ears`) · 🦽 Moving (`moving`) · 🧰 Gadgets (`gadgets`) · 🪀 Fidgets (`fidgets`) · 🐾 Creatures (`creatures`) · 🧣 Clothes (`clothes`) · ⚽ Hobbies (`hobbies`) · 🍕 Food (`food`) · ⭐ Nature (`nature`) · 💥 Symbols (`symbols`) · 🔍 Search (`search`).
- **Include** assistive objects (🦻 🦽 🦼 🦯 🦾 🦿) and the image stickers from the manifest.
- **Leave out** anything a school would object to: alcohol, tobacco, weapons (🔫 included), rude gestures, 🍆 🍑 and syringes. 💩 stays off unless the adult panel's "Silly stickers" switch is on.
- **Image stickers:**
  - A sticker is now `{ emoji, asset, x, y, scale, rotation }`, with exactly one of `emoji` or `asset` set.
  - Image stickers appear in their manifest `tab`, with ✨ while `isNew` is true.
  - `drawCardToCanvas()` must draw them.
- **🔍 Search:**
  - A big text field; results update while the child types, matching keywords and labels.
  - Be forgiving: allow prefixes, plurals, and one wrong letter in words of four or more letters.
  - No match shows "📡 Request sent to HQ" and adds the word to `requests`.
  - Log `sticker_search` {query, results} and `sticker_request` {word}.
  - No speech-to-text: it can send voices to a server.

### 5.4 Power-up (V3; replaces Boost)

On first entry, copy the cover into `powerup.look` (as v1 does) and play the power-up animation with `sfx-powerup`. There are three steps on one screen, each with its own 🔊 line and a small ➡️ to skip.

**1. Make up a power** (`nar-power-make`).
- Blank first: a small canvas to draw the power, and an optional 🎤 to say it.
- **Need ideas?** (`nar-power-ideas`) reveals 10 idea tiles. They are never shown before the child has drawn something or tapped Need ideas.

| id | Icon | Idea | Default effect |
|---|---|---|---|
| `idea-freeze` | ⏸️ | freeze time | `fx-freeze` |
| `idea-invisible` | 👻 | turn invisible | `fx-fade` |
| `idea-speed` | ⚡ | super speed | `fx-speed` |
| `idea-mind` | 💭 | read minds | `fx-thoughts` |
| `idea-shield` | 🛡️ | shield | `fx-shield` |
| `idea-fly` | 🪽 | fly | `fx-float` |
| `idea-strong` | 💪 | super strong | `fx-stomp` |
| `idea-teleport` | 🌀 | teleport | `fx-teleport` |
| `idea-grow` | 🔍 | grow and shrink | `fx-grow` |
| `idea-animals` | 🐾 | talk to animals | `fx-thoughts` |

- **Don't add communication-themed powers.** If children invent them, that's the finding.
- Log `power_draw`, `power_record`, `ideas_open` and `power_idea_choose`. The order matters.

**2. What does it look like?** (`nar-power-effect`).
- Offer ten effects, each played on the agent straight away with its sound (`sfx-` plus the effect name):
  - `fx-lightning`;
  - `fx-freeze`;
  - `fx-fade`;
  - `fx-speed`;
  - `fx-thoughts`;
  - `fx-shield`;
  - `fx-float`;
  - `fx-stomp` (a shake of 3 px or less);
  - `fx-teleport` (spin, vanish, return);
  - `fx-grow`.
- An idea brings its default effect, which the child can change.
- Log `power_effect_choose` and `power_fire`.

**3. When does your agent use it?** (`nar-power-when`).
- Show the 10 situation cards from the manifest, with stand-ins if any are missing.
- The child can choose any number. Each card speaks its label when tapped.
- Add ✏️ **My own** (draw or say; `nar-own-card`).
- Log `power_when_toggle` {situation, on} and `power_when_own`.

Also:
- **Change my look** (optional; `nar-look-edit`) opens the editor on `powerup.look`. The glow colour lives here.
- If an HQ has been chosen, the agent stands in it.
- The "Someone is unkind" card can bring up real experiences. The app doesn't react to it; it's logged like every other card, and facilitators follow the safeguarding route.

### 5.5 HQ (V4; new)

- **"Where is your agent strongest?"** (`nar-hq-intro`). Show two rows of picture cards from the manifest, plus ✏️ **Draw my own** (`nar-hq-draw`):
  - **real places:** `hq-classroom`, `hq-playground`, `hq-library`, `hq-quiet-room`, `hq-lunch-hall`, `hq-home`;
  - **fantasy places:** `hq-space`, `hq-underwater`, `hq-jungle`, `hq-city-rooftop`, `hq-sky-castle`, `hq-secret-lab`.
- Tapping a card drops the agent into that place with a small landing. The child can change the choice.
- The HQ becomes the agent's background on later screens and on the card.
- Log `hq_choose` {id} and `hq_draw`.

### 5.6 Voice password (V5; small change)

- Keep everything that's there.
- Rename the Yes ×3 bonus to **Say it 3 ways** (`nar-voice-3ways`). It has three slots with hint icons: 📢 big, 🤫 small, ❓ asking. The child says their password, or any word, three ways.
- Store the clips in `voice.threeWays` (was `yesClips`).
- Log `three_ways_record` {slot}.

### 5.7 Force field (V7, session 3; replaces the aura)

**1. Set it up** (`nar-field-intro`). Shown live around the agent:
- **size:** S, M or L;
- **look:** none, soft glow, bubbles, spiky, electric or stars;
- **colour:** 8 to choose from.

**2. Someone is coming** (`nar-field-approach`).
- A friendly bean figure drawn in code walks towards the agent, one at a time:
  - 👫 a friend (`approach-friend`);
  - 🧑‍🏫 a teacher (`approach-teacher`);
  - ❔ someone new (`approach-new`).
- For each one, the child picks **bounce off** (`react-bounce`), **let them in** (`react-letin`) or **wave hello** (`react-wave`), and it plays out (`sfx-field-bounce`, `sfx-field-open`).

Record the settings and the three reactions. Infer nothing from size. Log `field_set` and `field_reaction` {who, reaction}.

### 5.8 Mood codes (V7, session 3; replaces the feeling code)

A child can make up to 4 codes (`nar-mood-intro`), each in four steps.

**1. Pick a moment** (`nar-mood-situation`): one of the situation cards, or ✏️ My own.

**2. Show how your agent reacts** (`nar-mood-enact`). The child combines:
- **a face:** eyes, brows and mouth from the parts kit, as an overlay the child drags onto the agent;
- **a movement:** the existing `.move-*` classes;
- **a force-field change:** bigger, smaller, spikier or off.

Puppet mode (the child drags the agent and the path replays) only if time allows.

The child may also go the other way round: make the reaction first, then pick the moment. Record which came first.

**3. Make a secret sign** (`nar-mood-sign`): the drawing canvas (reuse the brush), with an optional 🎤 name.

**4. Who can read this sign?** (`nar-mood-readers`). Any number can be chosen; "only me" clears the others.
- 🔒 only me (`people-me`)
- 👫 friends (`people-friends`)
- 🧑‍🏫 teachers (`people-teachers`)
- 🏠 family (`people-family`)
- 🌍 everyone (`people-everyone`)

Log `mood_situation`, `mood_enact`, `mood_sign` and `mood_readers`. v1 feeling codes are migrated (§6.2) and show as codes without a moment.

### 5.9 Agent rules (V8, session 4; sentence builder)

A rule is four slots, shown as coloured cards: who is orange, please/don't is green or red, the action is blue, and when is purple. Colour by role is familiar from Colourful Semantics, which many UK schools use.

- **Who** (`nar-rules-who`): `people-friends`, `people-teachers`, `people-family`, `people-everyone`.
- **✅ Please** (`please`) or **❌ Please don't** (`please-dont`).
- **Action** (`nar-rules-action`): 12 options, plus draw or say.

| id | Icon | Phrase |
|---|---|---|
| `act-give-time` | ⏳ | give me time |
| `act-talk-slower` | 🐢 | talk slower |
| `act-write-it` | ✏️ | write it down |
| `act-show-me` | 👉 | show me |
| `act-ask-first` | ❓ | ask me first |
| `act-touch-things` | 🎒 | touch my things |
| `act-finish-words` | 💬 | finish my words |
| `act-sit-with-me` | 🪑 | sit with me |
| `act-let-me-move` | 🚶 | let me move |
| `act-headphones` | 🎧 | let me wear headphones |
| `act-help-me` | 🙋 | help me |
| `act-include-me` | 👥 | include me |

- **When** (`nar-rules-when`):
  - `when-class` 🏫 in class
  - `when-lunch` 🍽️ at lunch
  - `when-playtime` ⚽ at playtime
  - `when-loud` 🔊 when it's loud
  - `when-upset` 💛 when I'm upset
  - `when-always` ♾️ always
- **Read-back:**
  1. Play `nar-rules-check`.
  2. Build the sentence (for example "Teachers, please give me time in class.") and speak it with `speechSynthesis`.
  3. The child taps ✅ That's right or ✏️ Change.
  4. Ask "Put it on my badge?" (`nar-rules-badge`).
- Allow up to 5 rules. Log `rule_build`, `rule_confirm` and `rule_onbadge`.

### 5.10 Badge & poster (V8, session 4; replaces "Where does my agent go?")

- **Three frames, drawn in code at true proportions** (`nar-badge-intro`):
  - the **Badge**: 320×240, with five small buttons beneath it like the Tufty;
  - its **Secret pocket**: a second 320×240 screen that "shows when I press ⭐";
  - the **Wall**: 800×480.
- **Under each frame, say who sees it:**
  - badge: "👀 people near me" (`nar-badge-front`);
  - pocket: "⭐ only when I choose" (`nar-badge-pocket`);
  - wall: "🏫 the whole school" (`nar-badge-wall`).
- **The tray holds the child's own pieces:** the agent, the power-up form, the emblem, the codename, each mood sign, the power, each rule, and the voice (as a 🔊 tile).
  - Children drag pieces onto frames, size them with ➕ ➖, and tap to remove them.
  - Anything not placed stays in the **🗄️ Vault**, shown as a locked drawer with its contents (`nar-badge-vault`).
- **Record what children want** even when the hardware can't do it yet (a voice on the badge, for example).
- Log `place_item` {frame, item}, `remove_item` and `resize_item`.

### 5.11 Agent card → Dossier

**Session 2 card (V5):**
- **The card opens** (`nar-card-intro`, `sfx-file-open`) with the emblem and codename shown big.
  - The agent idles in its HQ, and tapping it fires its power.
  - The power-up form stands beside it.
  - ▶️ plays the voice password with the bounce.
- **🏷️ Badge check** (`nar-card-badge`): can the child still tell it's their agent?
  - Render the badge face into a 320×240 canvas and show it **at about life size**. The Tufty's screen is about 49 × 37 mm; assume 132 CSS px per inch, adjustable in the adult panel.
  - If the badge mission isn't done yet, use a default layout: the agent on the left, the emblem and codename on the right.
  - 🔍 shows it big and pixelated.
  - Log `badge_check_open`.
- **🖼️ Wall check** (`nar-card-wall`): render at 800×480 and dither it (Floyd–Steinberg) to the wall palette.
  - The palette is an adult setting. The default is the 6-colour Spectra 6 panel (black, white, red, yellow, green, blue), with a 7-colour option.
  - Log `wall_check_open`.
- **Then Seal** (§5.2) and **Finish** (`nar-card-finish`).
- **Save card (PNG)** stays. Keep `drawCardToCanvas()` matching the screen.

**Dossier (V8).** The card becomes a two-sided file.
- **The front is public:** what the child placed on the badge and wall, with vault items shown as black redaction bars.
- **The back is TOP SECRET:** everything.
- Tap to flip (`nar-dossier-flip`, `sfx-file-open`). Log `card_flip`.

### 5.12 Exports for the build team (V6)

Add to the adult panel:
- **Badge images:** for each agent, one 320×240 PNG of the badge front and one of the secret pocket, named `<codename-slug>-<first 4 of id>-badge.png` and `…-pocket.png`.
- **Wall images:** one 800×480 PNG per agent, dithered to the wall palette.
- **Requests:** every unmatched search word and every "Something's missing" item across the agents on this iPad, with text, drawing thumbnails and ▶️ for recordings, exportable as JSON. This is Filip's sticker to-do list for the next week.
- **Sharing:** share several files at once with `navigator.share({ files })`, falling back to a list of download links.
- **The full JSON export** gains the v2 fields, and `session` on every event.

---

## 6. Data model v2 (approved)

### 6.1 The agent

```json
{
  "schemaVersion": 2,
  "id": "uuid",
  "createdAt": "ISO date",
  "sessions": [2],
  "practice": false,

  "codename": "Hidden Bear",
  "codenameParts": { "word": "Hidden", "animal": "Bear" },
  "codenameSource": "roll",
  "emblem": { "emoji": "🐻", "asset": null },
  "seal": null,

  "door": "parts",
  "cover": { "pixels": [], "shapes": [], "drawingPng": null, "stickers": [] },

  "powerup": {
    "look": { "pixels": [], "shapes": [], "drawingPng": null, "stickers": [], "glow": null },
    "power": { "png": null, "audioId": null, "idea": "idea-freeze", "effect": "fx-freeze" },
    "when": ["sit-too-loud", "sit-asked-answer"],
    "whenOwn": [{ "png": null, "audioId": null }]
  },

  "hq": { "id": "hq-library", "png": null },

  "voice": { "audioId": null, "filter": "normal", "threeWays": [null, null, null] },

  "field": {
    "size": "m", "texture": "bubbles", "colour": "#7fe7ff",
    "reactions": { "friend": "letin", "teacher": "wave", "new": "bounce" }
  },

  "moodCodes": [{
    "situation": "sit-too-loud", "situationOwn": null,
    "face": { "eyes": "eyes-wide", "brows": "brows-worried", "mouth": "mouth-wobbly" },
    "move": "shake", "fieldChange": "bigger",
    "sign": { "png": null, "audioId": null },
    "readers": ["people-me"],
    "firstStep": "situation"
  }],

  "rules": [{
    "who": "people-teachers", "please": true, "action": "act-give-time", "actionOwn": null,
    "when": "when-class", "confirmed": true, "onBadge": true
  }],

  "placements": {
    "badge":  [{ "item": "agent",   "x": 0.3, "y": 0.5, "scale": 1 }],
    "pocket": [{ "item": "mood:0",  "x": 0.5, "y": 0.5, "scale": 1 }],
    "wall":   [{ "item": "powerup", "x": 0.5, "y": 0.5, "scale": 1 }]
  },

  "missing": [],
  "requests": [{ "word": "ninja", "where": "sticker-search", "t": "ISO date" }],
  "missions": {
    "make": "todo", "powerup": "todo", "hq": "todo", "voice": "todo",
    "field": "todo", "mood": "todo", "rules": "todo", "badge": "todo"
  },
  "events": [],
  "legacy": {}
}
```

- **Placement `item` values:** `agent`, `powerup`, `emblem`, `codename`, `power`, `voice`, `mood:<index>`, `rule:<index>`.
- **Stickers:** `{ "emoji": "🎩", "asset": null, "x": 0.5, "y": 0.2, "scale": 1, "rotation": 0 }`, with exactly one of `emoji` or `asset` set.
- **Audio blobs** stay in their own IndexedDB store, keyed by id, as now.

### 6.2 Migrating v1 agents

`migrateAgent(agent)` runs on every load, can safely run twice, and never deletes data. The original v1 fields go into `legacy`, so exports stay readable.

| v1 field | v2 |
|---|---|
| `boost` | `powerup.look` |
| `boost.aura` | `powerup.look.glow` |
| `boost.background` | `hq.id`: space → `hq-space`, jungle → `hq-jungle`, sea → `hq-underwater`, city → `hq-city-rooftop`; anything else → no HQ |
| `feelingCodes` | `moodCodes` with no moment: `png` and `audioId` → `sign`, `move` → `move`; `face` is kept in `legacy` |
| `voice.yesClips` | `voice.threeWays` |
| `missions` | m1 → `make`, m2 → `powerup`, m4 → `voice`; everything else starts as `todo` |
| `places`, the old `rules` object, `feelingCodes`, `feelingWorn`, the old `missions` | `legacy` |

Then add every new field with its default, and set `schemaVersion: 2`.

### 6.3 Events

Events keep the v1 shape, plus `session` and `practice`:

```json
{ "t": "ISO date", "session": 2, "practice": false, "mission": "powerup",
  "action": "power_when_toggle", "detail": { "situation": "sit-too-loud", "on": true } }
```

- **Keep all v1 actions.** The new ones are named in §5.
- **Also log** `label_speak` {id} when a card speaks its label, `locked_tap`, and the adult actions `session_set` and `practice_toggle`.

---

## 7. Narration

- **🔊 on each step** plays that step's narrator id through `Assets.say()`. The ids and texts are in `asset-guide.md` §4.5.
- **Every picture card speaks its label when tapped,** as well as selecting it. A card's line is `nar-` plus the card id: `nar-sit-too-loud`, `nar-hq-library`, `nar-idea-fly`, `nar-people-friends`, `nar-act-give-time`, `nar-when-class`, `nar-door-parts`, and so on.
- **Adult setting "Read instructions aloud automatically":** off by default, because three iPads share a table.
- **Adult setting "Narration speed":** 0.8×, 0.9× or 1.0×, default 0.9×. Apply it with the audio element's `playbackRate`, keeping the pitch (`preservesPitch = true`, plus `webkitPreservesPitch` for Safari). The `speechSynthesis` fallback takes the same number as `utterance.rate`, so a stand-in line is read at the same pace as a recorded one. ElevenLabs' newest model (Eleven v4) has no speed setting, so the app slows narration itself. Children with language disorders process speech more slowly (Zapparrata, Brooks & Ober, 2023).
- **Rule read-backs** are built from parts, so they use `speechSynthesis`.

## 8. Sounds

The sound ids, the moments they play and their generated stand-ins are listed in `asset-guide.md` §4.6. Use those ids everywhere, through `Assets.sfx()`.

## 9. Look and feel (additions)

- **Wherever children read:**
  - text at least 22 px;
  - letter-spacing 0.03–0.06 em and line-height 1.4;
  - left-aligned (single words may be centred);
  - no italics and no capitalised sentences.
- **Keep the system font.** Wider letter spacing helps dyslexic readers (Zorzi et al., 2012), but "dyslexia fonts" don't (Kuster et al., 2018).
- **Picture cards** are at least 120×120 px, with a one- or two-word label under the picture.
- **Every new animation honours Full / Calm / Off.** Nothing flashes more than three times a second.

---

## 10. Milestones

Build one milestone at a time and stop after each. "Done when" is the test.

**V0 — Foundations.**
- §4 bug fixes.
- §5.0 asset system: the manifest from the guide, `assets.js`, stand-ins, the service worker, Asset check, the "bring in" procedure, `.gitignore`.
- §6 data model and migration.
- Word ids for missions.
- §3 session selector, unlock presets and practice mode.
- `session` on events.
- CLAUDE.md updated.

*Done when:* the app works as before; the floating ghost can't happen; Asset check lists every item as ⚠️; a v1 agent opens without errors; and a new event shows `session`.

**V1 — Codename and gallery.** §5.1 and the §5.2 gallery.

*Done when:* the reels spin and lock; Type finds emblems or logs a request; and after closing and reopening the app, the agent can be picked from the gallery.

**V2 — Parts kit and sticker library.** §5.3 and `tools/parts-sheet.html`.

*Done when:*
- a face can be built in under a minute by tapping parts;
- every hairstyle and head covering is there;
- search finds "ninja" or logs it;
- image stickers appear when their files exist;
- and the parts sheet opens.

**V3 — Power-up.** §5.4.

*Done when:* the ideas stay hidden until asked for; every effect plays; the situation cards show pictures or stand-ins; and the log shows the order.

**V4 — HQ.** §5.5.

**V5 — Voice, session-2 card and seal.** §5.6, the §5.11 card and the §5.2 seal.

*Done when:* the badge check shows a life-size 320×240 render; the wall check shows a dithered render; and sealing and unsealing work.

**→ Ready for session 2.** Run the whole session-2 flow on an iPad in about 13 minutes.

**V6 — Exports and moving agents.** §5.12 and §5.2 (moving). Before session 3.

**V7 — Force field and mood codes.** §5.7 and §5.8. For session 3.

**V8 — Rules, badge & poster, dossier.** §5.9, §5.10 and the §5.11 dossier. For session 4.

**V9 — Polish and final test.** Every 🔊 line wired up; sounds; motion levels; an offline install test on every iPad.

**T1 — Audio script: already supplied.** Filip has `tools/make_audio.py`, so don't write another one. Know how it works and keep it working:
- **What it is:** standard-library Python (`urllib`, `json`, `pathlib`) that makes the narrator lines and sound effects with ElevenLabs.
- **What it reads:** the tables in `asset-guide.md` §4.5 and §4.6 directly, not the manifest. If you change the shape of those tables, update its parser too (`read_guide()`).
- **Where it writes:** `assets/audio/narrator/<id>.mp3` and `assets/audio/sfx/<id>.mp3` under the exact manifest names, so audio needs no "bring in".
- **Keys:** `setup` stores `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` in `.env` and adds `.env` to `.gitignore`. Never commit `.env`.
- **Models:** the default is `eleven_v4`, which accepts only stability and similarity and understands `[whispers]`. An optional `NARRATOR_MODEL` line in `.env` switches models; for models without audio tags, the script removes the tags.
- **Privacy:** it sends nothing but narrator text and sound descriptions.

**T2 — Sticker script** (optional, when Filip asks). `tools/make_stickers.py` follows the same pattern with the OpenAI Images API:
- it uses each sticker's `prompt` plus the sticker style from the guide;
- it asks for a transparent background (check the current docs first);
- it saves into `assets/incoming/`.

---

## 11. Testing (every milestone)

- Finger only, in landscape and portrait, with no zooming or scrolling needed.
- Once with assets, and once with `assets/` empty.
- Close and reopen: auto-save works and the gallery reopens the agent.
- Exports produce files, and Asset check is right.
- Airplane mode after installing: everything works, including assets.
- The event log shows the new actions, in order, with `session`.

## 12. Do not add (updated)

- points, scores, leaderboards;
- timers (apart from the 10-second recording limit);
- camera access, accounts, cloud sync, analytics;
- **any network call from the app**: AI, image or voice services, speech-to-text;
- external fonts or libraries;
- text-heavy instructions;
- automatic interpretation of children's choices;
- gendered labels.

---

### References

- Kuster, S. M., van Weerdenburg, M., Gompel, M., & Bosman, A. M. T. (2018). Dyslexie font does not benefit reading in children with or without dyslexia. *Annals of Dyslexia*, 68(1), 25–42. https://doi.org/10.1007/s11881-017-0154-6
- Zapparrata, N. M., Brooks, P. J., & Ober, T. M. (2023). Developmental language disorder is associated with slower processing across domains: A meta-analysis of time-based tasks. *Journal of Speech, Language, and Hearing Research*, 66(1), 325–346. https://doi.org/10.1044/2022_JSLHR-22-00221
- Zorzi, M., Barbiero, C., Facoetti, A., et al. (2012). Extra-large letter spacing improves reading in dyslexia. *PNAS*, 109(28), 11455–11459. https://doi.org/10.1073/pnas.1205566109
