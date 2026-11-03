# Agent Lab — data dictionary

Every field Agent Lab saves and every event it logs, and what each one means.

**This file is part of the research record, so it must always match the code.**
Every milestone that adds or changes a field or an event updates this file in
the same commit (v3 §1). If the two ever disagree, the code is what ran, so fix
this file.

Last updated: **v3 P4** (3 November 2026). `schemaVersion` is now **3**.

---

## 1. Where the data lives

Everything is stored on the iPad, in the browser's IndexedDB database
`agent-lab` (`storage.js`). It has three stores:

| Store | Key | Holds |
|---|---|---|
| `agents` | `id` | One record per agent: section 3. |
| `audio` | `id` | One recording per row: `{ id, blob }`. `blob` is the audio file (`audio/mp4` on an iPad). Agents point at recordings by this `id` (every `audioId` field). |
| `meta` | `key` | iPad settings, not about any child: section 6. |

**What leaves the iPad:**
- **The export file**, when an adult taps Export in the adult panel (section 2).
- **A bottle**, sent to the relay on Filip's laptop, only when the Display
  link is on: a child's bottle when the child sends it (from P6), or an
  adult's test bottle (section 7). Nothing else is ever sent — never the
  event log, the agent record, its id, or any other agent.

**Clearing Safari's website data deletes all of it.** See CLAUDE.md, "Settled
decisions". Export first.

---

## 2. The export file

`agent-lab-export-YYYY-MM-DD.json`, made by **Export all** in the adult panel.

| Field | Meaning |
|---|---|
| `app` | Always `"Agent Lab"`. |
| `exportedAt` | When the file was made (ISO date and time). |
| `milestone` | The build that made it, e.g. `"v3-P0"`. Session 2 exports say `"v2-V3"`. |
| `schemaVersion` | `3` from v3 on. Session 2 exports say `2`. |
| `includesPractice` | `true` if the adult ticked "include practice agents". Practice agents are left out otherwise. |
| `agentCount` | How many agents are in `agents`. |
| `agents` | Every agent record (section 3), each passed through `migrateAgent()` first, so it is always the current shape. |
| `audio` | Every recording on the iPad: `{ "<audioId>": "data:audio/mp4;base64,…" }`. |

**Import** (adult panel → Import from a file) takes one or several of these
files. For each agent in them:

| On this iPad already? | What import does | Reported as |
|---|---|---|
| No | Adds it with its own `id`, and sets `imported: true`. | added |
| Yes, unchanged | Nothing. | skipped |
| Yes, but changed | Adds it as a new agent with a new `id`, beside the one already here. | copied |

"Unchanged" means the same `createdAt`, the same number of events and the same
time on the last event. Recordings whose `id` is already on the iPad are left
alone.

---

## 3. The agent record

One record per agent. Fields are grouped by where they come from. **Nothing is
ever deleted:** retired missions' fields stay in every record and every export
(v3 §3, §10).

### 3.1 Identity

| Field | Type | Meaning |
|---|---|---|
| `schemaVersion` | number | `3`. `migrateAgent()` brings any older record up to 3 every time one is loaded, and is safe to run twice. |
| `id` | string | A random uuid. Never a name. |
| `createdAt` | ISO date | When the agent was made. |
| `sessions` | number[] | Every session number this agent has been opened in, e.g. `[2, 3]`. |
| `practice` | boolean | Made in practice mode. Practice agents are labelled and left out of exports. |
| `imported` | boolean | Present and `true` if the agent arrived through Import. |

### 3.2 Codename and emblem (v2 §5.1)

| Field | Type | Meaning |
|---|---|---|
| `codename` | string | The spy name, e.g. `"Electric Bear"` (session 2) or `"Clever Blaze"` (v3). **Never a real name.** Not unique: two agents can share one. |
| `codenameParts` | `{ word, animal }` | The two reels. `word` is the describing word. **`animal` is the second reel: an animal up to session 2, a spy word from v3** (Comet, Storm, Key…; the key keeps its old name so the logs line up). A typed name has `animal: ""`. |
| `codenameSource` | `"roll"` / `"type"` | Whether the child rolled the name or typed their own. |
| `emblem` | `{ emoji, asset }` | The agent's symbol. For a rolled name it is the second reel's emoji — the animal up to session 2, the spy word's symbol from v3 (☄️ for Comet). For a typed name it is the sticker the child picked (`asset` is set instead if it was a picture sticker). `🕵️` if none. |
| `codenameEmoji` | string | **v1 only.** The old name for `emblem.emoji`; read only by `agentEmblem()` as a fallback. |
| `seal` | string / null | Three seal symbols joined, e.g. `"🦊⚡🔑"`, or `null`. A sealed agent asks for them before it opens. The symbols are 🦊 🌙 ⚡ 🍕 🎈 🌵 🐙 🎲 🔑. In v3 a child can open a sealed agent but cannot seal a new one yet. |
| `requests` | object[] | Words a child wanted and found no sticker for: `{ word, where, t }`. `where` is `"codename-type"` or `"sticker-search"`. Shown as "📡 Request sent to HQ"; nothing is sent anywhere. |

### 3.3 The look

| Field | Type | Meaning |
|---|---|---|
| `door` | `"parts"` / `"pixel"` / `"draw"` / null | How the Cover was made. Since 8 October 2026 every new agent is `"parts"`. Older test agents can be `"pixel"` or `"draw"`, and are still drawn. (`"build"` is an old name for `"parts"`, renamed by `migrateAgent()`.) |
| `cover` | look | **The agent.** The one shown everywhere. See "A look" below. |

**A look** is `{ pixels, shapes, drawingPng, stickers }`:

| Field | Meaning |
|---|---|
| `pixels` | Pixel door: 256 entries (16×16, row by row), each a colour like `"#ff6b6b"` or `null` for an empty square. |
| `shapes` | Parts door: a list, drawn in order (later = in front). Each is `{ type, x, y, size, rotation, colour, flipX }`. `type` is a part id from `parts.js` (e.g. `"head-round"`) or one of the seven v1 shapes. `x`, `y` are the centre as fractions 0–1 of the stage. `size` is a scale (1 = the part's natural size), `rotation` in degrees, `colour` the child's tint, `flipX` mirrored or not. |
| `drawingPng` | Draw door: the drawing as a PNG data URL, or `null`. |
| `stickers` | A list of `{ emoji, asset, x, y, scale, rotation }`. One of `emoji` / `asset` is set. `x`, `y` are fractions 0–1, so a sticker stays put on any screen size. |

### 3.4 Session 2 missions (v2; retired in v3, data kept)

These were the session-2 screens. **v3 removed the screens, not the data.**

| Field | Meaning |
|---|---|
| `powerup.look` | The Power-up look: a look (above) plus `glow`, the aura id or `null`. |
| `powerup.lookEdited` | `true` once the child changed the Power-up look; until then it mirrored the Cover. Missing on agents that never opened the Power-up. |
| `powerup.power` | `{ png, audioId, idea, effect }`. `png` / `audioId`: the child's own power, drawn and/or said, on the ✏️ sheet. `effect`: the effect chosen (`fx-…`). `idea`: an idea tile; the idea step was removed before session 2, so this is `null` there. |
| `powerup.when` | Situation ids the child picked (`sit-…`): when the agent uses its power. |
| `powerup.whenOwn` | The child's own situation cards: each `{ png, audioId }`. |
| `hq` | `{ id, png }` — "Where is your agent strongest?" (session 2). `id` is an HQ place (`hq-…`); `png` is a drawn place instead (and `audioId` if it was also said). Only one of `id`/`png` is set. Both `null` means either "never chosen" or "Nowhere" — the event log tells them apart (`hq_choose { id: null }` is Nowhere). **v3 never writes to it.** The agent stands in its HQ on every screen unless it has a safe-to-talk place (`safe.talk`), which comes first. |
| `voice` | `{ audioId, filter, threeWays }`. The voice password: the recording, and the spy voice chosen to play it (`Voice.FILTERS` in `audio.js`; `"normal"` = unchanged). `threeWays` is three `audioId`s or `null`s from "Say it 3 ways", removed on 7 October 2026 — nothing shows them. |

### 3.5 Fields for v2 missions that never opened

v2 planned these for sessions 3 and 4. v3 replaced those missions, so on
session-2 agents they hold their empty defaults — **except** on agents migrated
from v1, where `moodCodes` and `rules` can carry v1 work.

| Field | Default | Meaning |
|---|---|---|
| `field` | `{ size: "m", texture: "none", colour: null, reactions: {…} }` | v2 force field. Never built. |
| `moodCodes` | `[]` | v2 mood codes. On a v1 agent: its feeling codes, each `{ situation, situationOwn, face, move, fieldChange, sign: { png, audioId }, readers, firstStep }`, of which only `move` and `sign` hold anything. |
| `rules` | `[]` | v2 sentence rules. Never built. (v1 rules are in `legacy.rules`.) |
| `placements` | `{ badge: [], pocket: [], wall: [] }` | v2 badge and poster. Never built. |
| `missing` | `[]` | "🧩 Something's missing" notes: `{ screen, png, audioId, t }`. The button left the top bar in v2, so this is empty on session-2 agents. |

### 3.6 Missions

| Field | Meaning |
|---|---|
| `missions` | One entry per mission id: `"todo"`, `"done"` (Stamp it) or `"passed"` (Pass). |

- **v3 keys:** `make`, `suit`, `safe`, `powers`, `bottle`.
- **v2 keys** (`powerup`, `hq`, `voice`, `field`, `mood`, `rules`, `badge`) stay
  on every agent that had them, exactly as session 2 left them.
- A v2 agent keeps its `make` status; the four new v3 keys arrive as `"todo"`.
- In P0 the four new missions are placeholders, so `"done"` / `"passed"` on
  them means only that the child tapped Stamp it / Pass on a "coming soon" screen.

### 3.7 v3 fields (agent-lab-v3-spec.md §10)

Added at P0 with their empty defaults. **The three-pile sort, `suit.best` and
`secretWord` were added on 3 November 2026, after Filip tried the first
version of P3** (approved then). The "Milestone" column says which
milestone first writes each one; until then it keeps its default.

| Field | Default | Will hold | Milestone |
|---|---|---|---|
| `likeMe` | `null` | `"likeme-like"` / `"likeme-bit"` / `"likeme-else"` — "Is your agent like you?". The LAST answer; every answer, including changes of mind, is in the log (`like_me`). `null` if never answered — `like_me_skip` says if it was asked and skipped. | P2 ✅ |
| `base` | `null` | `"base-1"` … `"base-8"` (a ready agent from `Parts.BASES` in `parts.js`), or `"blank"`. Which one the child started from. The cover's `shapes` start as a copy of that base and change from there. `null` on agents made before v3. | P2 ✅ |
| `suit` | see right | 🗣️ How my agent talks. Every card is sorted onto ONE of three piles, Talking-Mats style: 👍 Yes / 🤷 Not sure / 👎 No. **"My agent likes…"**: `likes` (👍), `likesUnsure` (🤷), `likesNot` (👎). **"School wants…"**: `school`, `schoolUnsure`, `schoolNot`. Each is a list of card ids, in the order they were put there. Cards: `mode-talk` (Talking), `mode-hands` (Signing), `mode-handshake`, `mode-draw`, `mode-act`, `mode-pictures` (Picture cards), `mode-write`, `mode-device`, and — in "School wants…" only — `mode-hand-up`, `mode-quiet`. `likesOwn` / `schoolOwn`: the child's ✏️ My own cards, each `{ png, audioId }`, which count as 👍. **`best`**: the one way the agent likes most — a card id from `likes`, or `"own-0"`, `"own-1"`… for an own card — or `null`. A card not yet sorted is on no pile. The app never compares the piles. Default `{ likes: [], likesUnsure: [], likesNot: [], likesOwn: [], school: [], schoolUnsure: [], schoolNot: [], schoolOwn: [], best: null }`. | P3 ✅ |
| `secretWord` | `null` | 🤫 An invented word the child said: `{ audioId, filter }`. `filter` is one of the six spy voices (`normal`, `squeaky`, `deep`, `robot`, `radio`, `echo` — `Voice.FILTERS` in `audio.js`). A new recording replaces the old one (the old clip is deleted) and keeps the chosen voice. | P3 ✅ |
| `handshake` | `null` | The secret handshake: `{ taps: [0, 252, 504, 1206] }` — each tap in milliseconds from the first. Up to 8 taps, at most 6 seconds. The LAST one made; every one is in the log (`handshake_make`). Made on the handshake sheet, which Powers opens (P5). | P5 |
| `safe` | `{ talk: null, stops: null }` | 📍 Safe place. `talk`: "Where does your agent feel safe to talk?" `stops`: "Where does your agent's power stop working?" Each is `null` (not answered) or `{ id, png }`: `id` is one of the twelve HQ place ids or `"safe-nowhere"` (Nowhere, an equal choice); or `id: null` with `png` (a drawn place) and/or `audioId` (a place the child said) from the ✏️ sheet. The agent stands in `safe.talk` on every screen when it is a real place. Off in the session-3 preset. | P4 ✅ |
| `powers` | `[]` | Up to 3 powers. Shape below. | P5 |
| `bottles` | `[]` | Up to 3 bottles. Shape below. | P6 |

**One power** (v3 §10):

| Field | Meaning |
|---|---|
| `id` | Short random id. |
| `power` | A power card id (`pow-…`), `"own"` for one the child made up, or `"v2"` for the session-2 power. |
| `own` | `{ png, audioId }` — the made-up power, drawn and/or said. |
| `inventedFirst` | `true` if the child made up a power before opening the cards. |
| `when` / `whenOwn` | Situation ids / own cards. |
| `who` / `whoOwn` | Who-card ids / own cards. |
| `how` / `howOwn` | How-card ids / own cards. |
| `soThat` | `{ png, audioId }` or `null`. |
| `skipped` | Which parts of the sentence the child skipped. |
| `order` | The order the child filled the sentence in, e.g. `["power", "when", "who", "how"]`. |

**One bottle** (v3 §10):

| Field | Meaning |
|---|---|
| `id` | Random id. |
| `createdAt` | ISO date. |
| `items` | What is in it, e.g. `{ type: "item-power", power: 0 }`. An `item-power` points at one of the agent's `powers` by index, or at `"v2"`. |
| `to` | A who-card id, e.g. `"who-everyone"`. |
| `toAgentId` | Another agent's `id`, if sent to an agent; else `null`. |
| `signed` | `true` = signed with the codename; `false` = a mystery bottle. |
| `state` | `"kept"`, `"waiting"`, `"sent"` or `"delivered"`. |
| `sentAt` / `deliveredAt` | ISO dates, or `null`. |

### 3.8 `legacy`

v1 fields that v2 had no place for, copied here by `migrateAgent()` so nothing
from v1 was lost: `boost`, `feelingCodes`, `feelingWorn`, `rules`, `places`,
`missions` (the v1 `m1`…`m6` statuses). Empty `{}` on any agent made in v2 or
later.

### 3.9 `events`

The event log: section 4.

---

## 4. The event log (`agent.events`)

Every meaningful action appends one event. **This log is the research data**,
and it records what the child did, in order — never what it means (v2 §12).

Every event has the same six fields:

| Field | Meaning |
|---|---|
| `t` | When (ISO date and time, to the millisecond). |
| `session` | The session the adult panel was set to (2, 3, …). |
| `practice` | Practice mode on or off at the time. |
| `mission` | The screen the child was on: a mission id, `"start"`, `"adult"`, or `"reveal"` (session 2's card). |
| `action` | What happened: the tables below. |
| `detail` | An object with the specifics; `{}` if none. |

**Adult panel actions** (`session_set`, `practice_toggle`, `narration_speed`)
are logged on whichever agent happens to be open, with `mission: "adult"`. They
are about the iPad, not the child.

The "v3" column says whether the current app can still log the event.
"hidden" = the code is there but no screen reaches it until a later milestone.

### 4.1 Start screen, codename and gallery

| Action | When | `detail` | v3 |
|---|---|---|---|
| `codename_spin` | The reels are rolled. | `{ word, animal, locks: { word, animal } }` — `animal` is the second reel (a spy word from v3) | ✅ |
| `codename_lock` | A 🔒 under a reel is tapped. | `{ reel: "word"/"animal", on }` | ✅ |
| `codename_speak` | The hero is tapped (it says the name): the big animal up to session 2, the empty agent from v3. | `{ codename }` | ✅ |
| `codename_type` | A typed name is used. | `{ text }` | ✅ |
| `emblem_choose` | A sticker is picked as the emblem for a typed name. | `{ value }` (emoji or asset id) | ✅ |
| `agent_create` | New agent. The first event on every agent. | `{ codename }` | ✅ |
| `agent_open` | An agent is opened from the gallery. | `{ from: "gallery" }` | ✅ |
| `seal_open_ok` | A sealed agent is opened with the right symbols, or by an adult. | `{}` or `{ by: "adult" }` | ✅ |
| `seal_open_fail` | A wrong try at a seal. Nothing locks; the row just clears. | `{}` | ✅ |
| `seal_set` | The child sealed the agent. | `{}` | hidden |

### 4.2 Moving through the missions

| Action | When | `detail` | v3 |
|---|---|---|---|
| `mission_enter` | A mission screen opens. | `{ mission }` | ✅ |
| `back_to` | The child taps an earlier pip on the strip to go back. | `{ mission }` | ✅ |
| `mission_leave` | Leaving a mission screen. | `{}` | ✅ |
| `stamp` | Stamp it. | `{ mission }` | ✅ |
| `pass` | Pass. | `{ mission }` | ✅ |
| `locked_tap` | A locked pip is tapped. | `{ mission }` | ✅ |
| `finish` | The flow ended and the app went back to the start. | `{}` | ✅ |
| `go_home` | 🏠 tapped: saved as it stands, nothing stamped. | `{ from }` (the screen) | ✅ |
| `speak` | 🔊 tapped for a mission's question. | `{ mission }` | ✅ |
| `label_speak` | A picture card spoke its label. | `{ id }` (the card) | ✅ |
| `mute_toggle` | Sound on/off. | `{ muted }` | ✅ |
| `agent_tap` | The agent's thumbnail was tapped (it reacts). | `{}` | ✅ |
| `update_apply` | An adult tapped "New version ready". | `{}` | ✅ |

### 4.3 Make (the parts editor)

| Action | When | `detail` | v3 |
|---|---|---|---|
| `door_choose` | The Make editor opened on a new agent. Always Parts now. | `{ door: "parts", auto: true }` | ✅ |
| `door_switch` | v1/v2: the child changed door. | `{ door }` | ✅ (unreachable with one door) |
| `part_add` | A part was added from the tray. | `{ type, cat, onHead }` — `onHead`: it snapped onto a head | ✅ |
| `part_recolour` | A part's colour changed. | `{ type, colour }` | ✅ |
| `part_flip` | ↔ Flip. | `{ type, flipped }` | ✅ |
| `part_layer` | Front / Back. | `{ type, to }` | ✅ |
| `shape_add` | A v1 shape was added (Shapes category). | `{ shape, colour }` | ✅ |
| `shape_change` | Bigger, smaller, turn… on a part or shape. | `{ what, shape }` | ✅ |
| `shape_move` | A part or shape was dragged. | `{}` | ✅ |
| `shape_remove` | Remove. | `{ shape }` | ✅ |
| `sticker_add` | A sticker was placed. | `{ emoji, asset }` | ✅ |
| `sticker_move` | A sticker was dragged, resized or turned. | `{}` | ✅ |
| `sticker_remove` | A sticker was removed. | `{ emoji, asset }` | ✅ |
| `sticker_search` | 🔍 search. | `{ query, results }` | ✅ |
| `sticker_request` | A searched word had no sticker. | `{ word }` | ✅ |
| `paint` | Pixel door: one finger-lift of painting. | `{ tool, colour, cells }` | ✅ (old agents) |
| `undo` | Undo. | `{}` in the editor; `{ where }` on a drawing canvas | ✅ |
| `clear` | Clear. | `{ door }` in the editor; `{ where }` on a drawing canvas | ✅ |

### 4.3a Quick agent (v3 P2)

| Action | When | `detail` | v3 |
|---|---|---|---|
| `base_choose` | A ready agent or Start blank was picked, when Make opened on an empty new agent. | `{ base, position }` — `base` is `"base-1"`…`"base-8"` or `"blank"`; `position` is where it was on the 3×3 grid (1–9, reading order). The eight are **shuffled** each time and Start blank is always 9th, so `position` is what the child saw, not a fixed order. | ✅ |
| `like_me_ask` | "Is your agent like you?" was shown. Once per agent. | `{ when: "stamp" / "open" }` — straight after Make was stamped, or on opening an agent whose Make was already finished | ✅ |
| `like_me` | A card was tapped. A second tap on another card is another `like_me`, so changes of mind are kept. | `{ answer }` — `"likeme-like"`, `"likeme-bit"`, `"likeme-else"` | ✅ |
| `like_me_skip` | ➡️ with no card chosen. | `{}` | ✅ |

### 4.3b How my agent talks (v3 P3)

| Action | When | `detail` | v3 |
|---|---|---|---|
| `suit_sort` | A card was put on a pile. Putting it on another pile later (coming back, or ↩️) is another `suit_sort`, so changes of mind are kept. | `{ step: "likes"/"school", mode, pile: "yes"/"unsure"/"no" }` | ✅ |
| `suit_back` | ↩️ — back one card. | `{ step }` | ✅ |
| `suit_phase` | Another part opened. | `{ to: "likes"/"best"/"school"/"word", how: "auto"/"next"/"tab" }` — `auto` after the last card, `next` is ➡️, `tab` the 🗣️ ⭐ 🏫 🤫 buttons | ✅ |
| `suit_best` | ⭐ A card was picked as the best one. | `{ best }` — a card id or `"own-0"`… | ✅ |
| `suit_own` | A ✏️ My own card was kept. | `{ step, drawn, said }` | ✅ |
| `suit_own_remove` | A ✏️ card was removed (second tap of two). | `{ step }` | ✅ |
| `secret_word_record` | 🎤 A secret word was recorded. | `{ ms, again }` — `again` if it replaced one | ✅ |
| `secret_word_voice` | A spy voice was picked for it. | `{ filter }` | ✅ |
| `handshake_open` | The handshake sheet was opened (from Powers). | `{}` | P5 |
| `handshake_make` | A handshake was finished: 1.5 s after the last tap, at the 8th tap, or 6 s after the first. | `{ taps, ms }` — `taps` is the whole rhythm (ms from the first tap), `ms` its length | P5 |
| `handshake_redo` | The pad was tapped again when a handshake already existed, starting a new one. | `{}` | P5 |
| `handshake_replay` | ▶️ Play it. (The automatic play-back after making one is not logged.) | `{}` | P5 |

Each card says its label as it appears (not logged); a TAP on the card is a
`label_speak`. The agent acts every card out — it moves (Full motion), and
the card's emoji appears by its head (always) — and that is not logged.

### 4.3c Safe place (v3 P4)

| Action | When | `detail` | v3 |
|---|---|---|---|
| `safe_choose` | A place, or Nowhere, was tapped. | `{ step: "talk"/"stops", id, changed }` — `id` is an HQ place id or `"safe-nowhere"`; `changed` is true if that question already had an answer | ✅ |
| `safe_step` | The other question was opened. | `{ to: "talk"/"stops", how: "next"/"tab" }` — `next` is ➡️, `tab` is the 💬 / ⛔ buttons | ✅ |
| `safe_draw` | A place from the ✏️ sheet was kept. | `{ step, drawn, said }` | ✅ |
| `safe_draw_remove` | That place was removed (second tap of two). | `{ step }` | ✅ |

Every place tapped is also a `label_speak`.

### 4.4 Drawing and the ✏️ My own sheet

| Action | When | `detail` | v3 |
|---|---|---|---|
| `draw_stroke` | One stroke on a drawing canvas. | `{ where, points }` | ✅ |
| `hq_choose` | Session 2: an HQ place chosen. `{ id: null }` is Nowhere. | `{ id, changed }`, `{ id: null }`, or `{ id, from: "place-tab" }` | — (v2 only) |
| `hq_draw` | Session 2: a drawn HQ kept. | `{ drawn, said }` | — (v2 only) |
| `hq_draw_remove` | Session 2: a drawn HQ removed. | `{}` | — (v2 only) |
| `power_when_own` | An own situation card kept. | `{ drawn, said }` | hidden |

> ⚠️ **`draw_stroke` `where` in session-2 data.** Up to session 2, `where` was
> `"feeling_code"` for the v1 feeling-code canvas and `"rule"` for **every
> other canvas**. In session 2 the only canvas a child could reach was the ✏️
> My own sheet, so **`where: "rule"` in session-2 data means a stroke on the
> ✏️ sheet**, not a rule. The event's `mission` (`powerup` or `hq`) and the
> keep event that follows (`power_draw`, `power_when_own`, `hq_draw`) say
> which ✏️ it was. From v3 `where` is `"own_card"` for that sheet, and the
> `mission` says which screen it was on (e.g. `suit`).

### 4.5 Adult panel

| Action | When | `detail` | v3 |
|---|---|---|---|
| `session_set` | The session was changed. | `{ session }` | ✅ |
| `practice_toggle` | Practice mode on/off. | `{ practice }` | ✅ |
| `narration_speed` | Narration speed changed. | `{ speed }` | ✅ |

### 4.6 Session 2 only (v2 screens, retired in v3)

These are in session-2 data. v3 cannot log them.

| Action | Screen | `detail` |
|---|---|---|
| `boost_copy` | Power-up: the Cover was copied into the Power-up look. | `{ from: "cover" }` |
| `look_edit_open` | Power-up: "My look" opened. | `{}` |
| `aura_choose` | Power-up: an aura (glow). | `{ aura }` |
| `power_effect_choose` | Power-up: an effect tile. | `{ effect }` |
| `power_fire` | Power-up / card: the power played on the agent. | `{ effect }` or `{ effect, where: "card" }` |
| `power_draw` | Power-up: own power kept on the ✏️ sheet. | `{ drawn, said }` |
| `power_draw_remove` | Power-up: own power removed. | `{}` |
| `power_when_toggle` | Power-up: a situation card on/off. | `{ situation, on }` |
| `power_when_own_remove` | Power-up: an own situation removed. | `{}` |
| `power_step_skip` | Power-up: ➡️ to skip a step. | `{ to }` |
| `boost_power_up` | v1 Boost / Power-up replay ✨. | `{}` |
| `record_start` / `record_stop` / `record_fail` | Voice: 🎤 recording. | `record_stop`: `{ ms, bytes }`; `record_fail`: `{ reason }`; others may carry `{ slot }` |
| `rerecord` | Voice: re-record. | `{}` |
| `filter_play` | Voice: a spy voice played. | `{ filter, raw }` |
| `filter_choose` | Voice: a spy voice chosen. | `{ filter }` |
| `reveal_play` | Card: ▶️ the voice password. | `{ filter }` |
| `reveal_skip` | Card: the finale skipped. | `{}` |
| `card_save` | Card: Save card. | `{ how: "share" / "download" }` |
| `card_save_cancel` | Card: the share sheet was closed. | `{}` |
| `badge_check_open` / `badge_zoom` | Card: badge check. | `{}` |
| `wall_check_open` | Card: wall check. | `{ palette }` |
| `missing_open` / `missing_save` | 🧩 Something's missing (left the top bar in v2). | `{ screen }`; `{ screen, drawn, said }` |

### 4.7 v1 and older test builds only

Not in session-2 data. Listed so an old test export can still be read.

| Action | From | `detail` |
|---|---|---|
| `feeling_code_add` / `feeling_code_edit` / `feeling_code_remove` | v1 Mission 3 | various |
| `feeling_face_choose` / `feeling_move_choose` / `feeling_worn` | v1 Mission 3 | `{ face }` / `{ move }` / `{ index }` |
| `feeling_draw` | v1 Mission 3 (Milestone 4) | |
| `need_ideas_open` | v1 Mission 3 | `{}` |
| `place_open` / `place_toggle` | v1 Mission 5 | `{ place }` / `{ place, part, on }` |
| `rule_open` / `rule_set` / `rule_remove` | v1 Mission 6 | `{ rule, … }` |
| `background_choose` | v1 Boost backgrounds | `{ background }` |
| `codename_roll` | v1 codename roller | `{ codename }` |
| `brush_size` / `mirror_toggle` | the Draw door (removed 8 October 2026) | `{ width }` / `{ on }` |
| `ideas_open` / `power_idea_choose` / `power_record` | v2 Power-up step 1 (removed 7 October 2026) | |
| `three_ways_record` | v2 "Say it 3 ways" (removed 7 October 2026) | `{ slot: "big"/"small"/"asking" }` |

---

## 5. Recordings

Every `audioId` in an agent points at a row in the `audio` store. Recordings
are at most 10 seconds. A re-recording deletes the clip it replaced.
**Never put recordings into ChatGPT, ElevenLabs or any online service.**

---

## 6. iPad settings (`meta` store)

About the iPad, not about any child. Not exported.

| Key | Meaning |
|---|---|
| `session` | The session the adult panel is set to. Default 3 in v3. |
| `missionOn` | `{ "<mission id>": true/false }` — single missions an adult switched on or off. Cleared when the session changes. |
| `practice` | Practice mode. |
| `motion` | `"full"` / `"calm"` / `"off"`. |
| `muted` | Sound off. |
| `narrationSpeed` | Narration speed, default `0.9`. |
| `silly` | Allows the silly stickers in search. Nothing sets it, so it is always `false`. |
| `lastAgentId` | The agent Continue opens. |
| `lastExportAt` / `lastExportCount` | When this iPad was last exported, and how many agents went. |
| `badgePpi` / `wallPalette` | v2 badge and wall check settings. No longer read. |
| `displayOn` | v3: the Display link is on. Default `false`. |
| `displayAddress` | v3: where the relay is, e.g. `"tact-display.local:8443"`. Only a `.local` name or `localhost`, only port 8443 (the app's security policy allows nothing else). |

---

## 7. What goes to the display (v3 §9)

The iPad sends a bottle to the relay as JSON over https (`POST /bottle`). The
relay keeps bottles **in memory only**, for that run, and passes them to the
display. Neither writes anything to disk. The relay prints one line per
bottle — time, `to`, signed or mystery, the item types, the size — and never
its contents or a codename.

**The test bottle** (adult panel → Display link → 🍾 Send test bottle). It
carries nothing from any agent:

```json
{
  "type": "bottle",
  "test": true,
  "bottleId": "random uuid",
  "sentAt": "ISO date",
  "to": "who-everyone",
  "toEmblem": null,
  "signed": true,
  "from": { "codename": "Test bottle", "emblem": "📡", "picture": null, "handshake": null },
  "items": []
}
```

**A child's bottle** follows v3 §9.1 and is built at P6, which will document
it here — including how a voice message is made to sound on the display
exactly as the child heard it.

The Display link logs no events: it is the adult's set-up, not something a
child did.
