# Agent Lab — data dictionary

Every field Agent Lab saves and every event it logs, and what each one means.

**This file is part of the research record, so it must always match the code.**
Every milestone that adds or changes a field or an event updates this file in
the same commit (v3 §1). If the two ever disagree, the code is what ran, so fix
this file.

Last updated: **v89** (4 November 2026). `schemaVersion` is still **3**.

> **v89: shorter.** Three things are no longer asked, to keep the session
> short (their fields stay in every record, empty from v89):
> 🤫 **the secret word** (`secretWord`; `secret_word_record` and
> `secret_word_voice` only before v89 - a bottle can still carry one made
> earlier); 🕐 **When** in Powers (`powers[].when` / `whenOwn`; Filip:
> "for later, or asking them"); and the ✨ **secret door** (a power can no
> longer be `"own"`; `powers_secret_open` was logged from v80 to v88).
> How my agent talks now ends after ⭐ the favourite: its Next stamps the
> mission (`stamp`) and goes on to Powers.

> **v88: gestures, and "Which rule?".** Every gesture has a tap that does
> the same, and the log says which was used: `via` on `suit_sort`
> ("drag"/"tap"), `bottle_item_add` ("drag"/"tap"), `powers_fire`
> ("hold"/"tap") and the recordings (`secret_word_record`,
> `bottle_voice_record`, `bottle_to_name`: "hold"/"tap" - held like a
> walkie-talkie, or tapped on and off). New event `powers_charge_stop`.
> "Change a school rule" asks which rules (`powers[].rules`, `rulesOwn`).

> **v87: "School wants us to…" is removed.** How my agent talks asks only
> "My agent likes…", the favourite, and the secret word. `suit.school`,
> `schoolUnsure` and `schoolNot` stay in every record but are no longer
> filled; `suit_sort { step: "school" }` and `suit_phase { to: "school" }`
> appear only in data from before v87 (no session ran with them).

> ⚠️ **v86: a bottle can hold a REAL NAME, spoken.** For a friend or a
> teacher the child may say who it is for (`toNameAudioId`). Filip decided
> this on 4 November 2026, as an exception to "codenames only". The
> recording stays on the iPad and is never sent to the display, but it IS
> in every export (which carries all recordings), and `tools/analyse.py`
> writes it as `…_bottleN-to-name-PERSONAL`. Treat it as personal data:
> store it securely and delete it when the study allows.

> **v84:** the bottle no longer lists every agent on the iPad to pick a
> friend's (children did not know which was their friend's), so
> `toAgentId` stays `null` and `bottle_friend_pick` is no longer logged.
> Nothing else in the data changed: the rest of v84 is narration, the
> green Next buttons and a Stamp it that waits until a mission is done.

> **v83: the bottle is filled from the agent's own work.** Two new item
> types, `item-word` (the secret word) and `item-talk` (the way the agent
> likes to talk most) - see "Items" in §3.7 and the payload in §7. Each of
> the agent's powers is now its own token, so the "which power?" step is
> gone (the `item-power` record is unchanged). Battery cards and talks
> cards now tell a short story when tapped; still `label_speak { id }`.

> **v82** changed no field and no event. Narration only: a power card,
> when tapped, now says a short story of what it does (`nar-story-…`) and
> a door introduces itself (`nar-door-…`). Both are still logged as
> `label_speak { id }` with the card's own id.

> **What changed in v81:** the 🔒 under each codename reel is gone, so
> `codename_lock` is no longer logged and `codename_spin`'s `locks` are
> always `false`. Nothing else in the data changed (v81 was sound, speed
> and wording, and a fix that makes the adult panel reachable again).

> **What changed in v80** (3 November, after Filip's first try of How my
> agent talks, Powers and the bottle; all before session 3 ran, so no session data is
> affected): "School wants us to…" has its own cards (§3.7 `suit`); ✏️ My own
> left How my agent talks; Powers opens on the doors, so `inventedFirst` is
> `null` and `powers_draw`, `powers_record` and `powers_ideas_open` are no
> longer logged; a ✨ secret door (`powers_secret_open`); a power can name
> its `devices`; "My favourite game" is said, not drawn; every recording in
> a mystery bottle takes a spy voice; missions switched off are hidden, so
> `locked_tap` is no longer logged; the power labels name school ("Pause my
> school"). Ids are unchanged except where a section says so.

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
| `suit` | see right | 🗣️ How my agent talks. Every card is sorted onto ONE of three piles, Talking-Mats style. The child answers with the agent itself — it nods ✓, tilts its head ? or shakes it ✗ — and the piles are saved as yes / unsure / no. **"My agent likes…"**: `likes` (✓), `likesUnsure` (?), `likesNot` (✗), with the cards `mode-talk` (Talking), `mode-hands` (Signing), `mode-handshake`, `mode-draw`, `mode-act`, `mode-pictures` (Picture cards), `mode-write`, `mode-device`. **"School wants us to…"** (asked from v80 to v86 only - removed in v87, no session ran with it): `school`, `schoolUnsure`, `schoolNot`, with cards of its own since v80: `school-talk-lot` (Talk a lot), `school-only-talk` (Only talk), `school-makaton` (Learn Makaton), `school-look` (Look at who's talking), `school-quick` (Answer quickly), `school-speak-up` (Speak up), `school-write` (Write it down), `school-pictures` (Use picture cards), `school-device` (Use a device). **Five pairs can be compared** across the two questions: `school-talk-lot`↔`mode-talk`, `school-makaton`↔`mode-hands`, `school-write`↔`mode-write`, `school-pictures`↔`mode-pictures`, `school-device`↔`mode-device`. (Before v80 the school cards were the "likes" cards plus `mode-hand-up` and `mode-quiet`; no session ran with them.) Each pile is a list of card ids, in the order they were put there. `likesOwn` / `schoolOwn`: ✏️ My own cards `{ png, audioId }` — **no longer offered since v80** (nobody used My own in session 2), so they stay `[]`. **`best`**: "Which one does your agent like the most?" — a card id from `likes`, or `null`. (`"own-0"`… could only come from before v80.) A card not yet sorted is on no pile. The app never compares the piles. Default `{ likes: [], likesUnsure: [], likesNot: [], likesOwn: [], school: [], schoolUnsure: [], schoolNot: [], schoolOwn: [], best: null }`. | P3 ✅ |
| `secretWord` | `null` | 🤫 An invented word the child said: `{ audioId, filter }`. `filter` is one of the six spy voices (`normal`, `squeaky`, `deep`, `robot`, `radio`, `echo` — `Voice.FILTERS` in `audio.js`). A new recording replaces the old one (the old clip is deleted) and keeps the chosen voice. | P3 ✅ |
| `handshake` | `null` | The secret handshake: `{ taps: [0, 252, 504, 1206] }` — each tap in milliseconds from the first. Up to 8 taps, at most 6 seconds. The LAST one made; every one is in the log (`handshake_make`). Made on the handshake sheet, which Powers opens when a child turns on 🤝 "My secret handshake" in the 🔌 slot. | P5 ✅ |
| `safe` | `{ talk: null, stops: null }` | 📍 Safe place. `talk`: "Where does your agent feel safe to talk?" `stops`: "Where does your agent's power stop working?" Each is `null` (not answered) or `{ id, png }`: `id` is one of the twelve HQ place ids or `"safe-nowhere"` (Nowhere, an equal choice); or `id: null` with `png` (a drawn place) and/or `audioId` (a place the child said) from the ✏️ sheet. The agent stands in `safe.talk` on every screen when it is a real place. Off in the session-3 preset. | P4 ✅ |
| `powers` | `[]` | ⚡ Up to 3 powers, in the order they were made. Shape below. A power is saved the moment it is chosen, so a half-finished sentence is kept. | P5 ✅ |
| `bottles` | `[]` | 🍾 Up to 3 bottles, in the order they were made. Shape below. A bottle is saved the moment its first item goes in. | P6 ✅ |

**One power** (v3 §10):

| Field | Meaning |
|---|---|
| `id` | Short random id (8 characters). Not linked to anything else. |
| `power` | A power card id (`pow-…`, below), `"own"` for one the child made up behind the ✨ secret door, or `"v2"` for their session-2 power ("⏪ Last time"). |
| `own` | `{ png, audioId }`. For `"own"`: the made-up power, drawn and/or said. For `"v2"`: the session-2 drawing and recording, pointed at, never copied (they still belong to `powerup.power` and are never deleted from here). For a card: both `null` (before v80 it could hold a drawing made on the ✨ canvas before the card was picked). |
| `inventedFirst` | **`null` since v80**: the doors come first, so the question "did the child invent before seeing the ideas?" cannot arise (an `"own"` power is still recognisable by `power`). Before v80: `true` if the child drew or said something on ✨ before opening the ideas, `false` if they opened the ideas first. |
| `rules` / `rulesOwn` | 📜 v88. Only for `pow-change-rule`: "Which rule does your agent change?" - `rule-hand-up` (Put your hand up), `rule-quiet` (Be quiet), `rule-look` (Look at who's talking), `rule-quick` (Answer quickly), `rule-speak-up` (Speak up), `rule-only-talk` (Only talk), `rule-write` (Write it down), `rule-sit-still` (Sit still), any number, in the order picked / ✏️ own rules `{ png, audioId }`. This is how what school EXPECTS is now found (Filip, after "School wants us to…" was removed). `[]` for other powers; missing on powers made before v88. |
| `devices` | 🎛️ Only for `pow-control-devices` (v80, at Filip's request: "say which devices"): which ones — `dev-bell` (the school bell), `dev-alarm` (the fire alarm), `dev-lights`, `dev-speakers`, `dev-board` (the whiteboard), `dev-computers`. Any number, in the order picked. `[]` for every other power (and missing on powers made before v80). If a child changes a power away from "Control school devices", the list stays but means nothing. |
| `when` / `whenOwn` | 🕐 Situation ids (the session-2 ids: `sit-too-loud`, `sit-not-understood`, `sit-waiting`, `sit-did-well`, `sit-asked-answer`, `sit-unkind`, `sit-plans-change`, `sit-new-place`, `sit-playtime`, `sit-tricky-work`) / own cards `{ png, audioId }`. **Three at most, cards and own together.** |
| `who` / `whoOwn` | 👥 `who-me`, `who-friend`, `who-teacher` (any adult at school), `who-class`, `who-everyone`, `who-room` / own cards. Any number. |
| `how` / `howOwn` | 🔌 How it switches on: `how-badge`, `how-handshake`, `how-hand-sign`, `how-word`, `how-drawing`, `how-button` / own cards. Any number. |
| `soThat` | 🎯 "What happens then?" (it asked "So that…" before v80) — `{ png, audioId }` from the ✏️ sheet, or `null`. |
| `skipped` | The slots still EMPTY when the power was last switched on (⚡), e.g. `["sothat"]` — `devices` counts as a slot for "Control school devices". Set at every ⚡. `[]` until the first. |
| `order` | The order the sentence was filled in: always `"power"` first, then each slot the first time something was put in it, e.g. `["power", "who", "when"]`. |

**The power cards and their doors** (§7.2). The doors are always shown in
this order; the family ids are a lens for the analysis, and the children
see the plain labels.

| Door (`family`) | Label | Powers |
|---|---|---|
| `fam-time` | Time | `pow-slow-everybody` ★, `pow-pause`, `pow-hold-turn`, `pow-warn-me`, `pow-say-again` |
| `fam-senses` | Sound and light | `pow-turn-down`, `pow-dim-lights`, `pow-quiet-bubble` |
| `fam-language` | Words | `pow-translator`, `pow-my-way`, `pow-get-me` |
| `fam-floor` | Turns | `pow-control-teachers` ★, `pow-question-swap`, `pow-pass`, `pow-invisible` |
| `fam-screens` | Screens | `pow-control-displays` ★, `pow-control-devices` ★, `pow-see-points`, `pow-change-rule` |
| `fam-together` | Together | `pow-speak-for-friends` ★, `pow-call-ally`, `pow-team-up` |

★ = from Filip's notes; these five have their own scenes on the agent.

**Labels since v80** (the ids are unchanged): `pow-pause` "Pause my school"
(was "Pause the world"), `pow-turn-down` "Turn the classroom down",
`pow-dim-lights` "Dim the classroom lights", `pow-control-displays` "Control
all school displays", `pow-control-devices` "Control school devices",
`pow-change-rule` "Change a school rule" — Filip: the powers are about
school, so they name it. The doors also have a ✨ secret door
(`door-secret`), which is not a family: behind it the child makes up their
own power.

**One bottle** (v3 §10):

| Field | Meaning |
|---|---|
| `id` | Random uuid. Also the `bottleId` the display sees — it has nothing to do with the agent's id. |
| `createdAt` | ISO date: when its first item went in. |
| `items` | Up to 4, ONE of each kind, in the order they went in. See "Items" below. |
| `to` | `"who-me"` (kept on this iPad), `"who-friend"`, `"who-teacher"` or `"who-everyone"` (the big screen); `null` while being filled. |
| `toAgentId` | The friend's agent `id`, if the child tapped one on this iPad; else `null` ("a friend" on its own is fine). **Always `null` from v84**, when the list of agents was removed. |
| `toNameAudioId` | v86, **personal data**. For `who-friend` or `who-teacher`: the child's recording of WHO it is for - a real name, said aloud - or `null` (it is optional). Deleted if the child says it again (the new one replaces it) or changes who the bottle is for. Never sent to the display; in the export with every other recording. Missing on bottles made before v86. |
| `signed` | "Who is it from?" (it asked "Show your agent?" before v80): `true` from my agent (the card shows the agent and its codename); `false` 🎭 a mystery; `null` for `"who-me"` (not asked) or not yet chosen. |
| `state` | `"open"` while being filled (an addition to §10: it is saved at once so nothing is lost if the iPad is closed); `"kept"` (for me); `"sent"` (the moment the child sent it); `"waiting"` (the display link was off or failed — it goes by itself when the link works); `"delivered"` (the relay took it). **The child sees the same "🚀 Sent" for sent, waiting and delivered.** |
| `sentAt` / `deliveredAt` | ISO dates, or `null`. |

**Items** (§8). Colours on screen belong to the item TYPE, not to feelings.

| `type` | Fields |
|---|---|
| `item-power` | `power` (the power's place in `powers`, or `"v2"`), `powerId` (that power's `id` — an addition, so the item still knows which power if an earlier one is removed; if the power itself is removed, `power` becomes `null`) |
| `item-handshake` | `taps` — a copy of the rhythm when it went in |
| `item-drawing`, `item-cant-live` | `png` and/or `audioId`, from the ✏️ sheet. `item-cant-live` is "Something my agent can't live without" since v80 (it said "I" before). |
| `item-game` | "My favourite game" — **said, not drawn, since v80**: `audioId`, `filter` (recorded like a voice message, with a spy voice). Before v80: `png` and/or `audioId` from the ✏️ sheet. |
| `item-voice` | `audioId`, `filter` — one of the six spy voices. |
| `item-word` | v83. The agent's secret word: `audioId` — a COPY of `secretWord`'s recording, made when it goes in, so a new secret word later cannot empty the bottle — and `filter`, the secret word's spy voice at that moment (a mystery can change it). Only offered if the agent has a secret word. |
| `item-talk` | v83. `mode` — the way the agent likes to talk most (`suit.best`, a `mode-…` id) at that moment. Only offered once ⭐ has been answered. |

Since v83 the fill step has two groups: 🕵️ **From your agent** - each of
its powers by name, its handshake, its secret word, its favourite way to
talk and its safe place, each only if it exists - and ✨ **Make new**: a
drawing, a voice message, a favourite game, something it can't live
without. One of each KIND per bottle, as before: once one power is in, the
others wait.

**In a mystery bottle every recording takes a spy voice** (v80; before it,
only `item-voice` did): any item with an `audioId` gets a `filter`, chosen
once for all of them on the 🕵️ step, and `"normal"` is not offered. An item
from the ✏️ sheet has no `filter` until then — read a missing `filter` as
`"normal"`.
| `item-safe` | `place: { id, png }` — a copy of `safe.talk` (only offered once Safe place has a real place) |

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
| `codename_lock` | A 🔒 under a reel is tapped. | `{ reel: "word"/"animal", on }` | — (before v81: the locks are gone, so `locks` in `codename_spin` is always false) |
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
| `locked_tap` | A locked pip is tapped. | `{ mission }` | — (before v80: a mission that is not open is now not on the strip at all) |
| `finish` | The flow ended and the app went back to the start. | `{}` | ✅ |
| `go_home` | 🏠 tapped: saved as it stands, nothing stamped. | `{ from }` (the screen) | ✅ |
| `speak` | 🔊 tapped for a mission's question. | `{ mission }` | ✅ |
| `label_speak` | A picture card spoke its label - for a power card (v82), its short story. | `{ id }` (the card) | ✅ |
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
| `suit_sort` | A card was put on a pile. Putting it on another pile later (coming back, or ↩️) is another `suit_sort`, so changes of mind are kept. | `{ step: "likes"/"school", mode, pile: "yes"/"unsure"/"no", via }` — `via` (v88): `"drag"` if the card was carried onto its answer, `"tap"` if the answer was tapped | ✅ |
| `suit_back` | ↩️ — back one card. | `{ step }` | ✅ |
| `suit_phase` | Another part opened. | `{ to: "likes"/"best"/"school"/"word", how: "auto"/"next"/"tab" }` — `auto` after the last card, `next` is ➡️, `tab` the 🗣️ ⭐ 🏫 🤫 buttons | ✅ |
| `suit_best` | ⭐ "Which one does your agent like the most?" — a card was picked. | `{ best }` — a card id (`"own-0"`… only before v80) | ✅ |
| `suit_own` | A ✏️ My own card was kept. | `{ step, drawn, said }` | — (before v80) |
| `suit_own_remove` | A ✏️ card was removed (second tap of two). | `{ step }` | — (before v80) |
| `secret_word_record` | 🎤 A secret word was recorded. | `{ ms, again, via }` — `again` if it replaced one; `via` (v88) `"hold"` (held while speaking, like a walkie-talkie) or `"tap"` (tapped on, then off) | ✅ |
| `secret_word_voice` | A spy voice was picked for it. | `{ filter }` | ✅ |
| `handshake_open` | The handshake sheet was opened (from 🤝 in Powers' 🔌 slot). | `{}` | ✅ |
| `handshake_make` | A handshake was finished: 1.5 s after the last tap, at the 8th tap, or 6 s after the first. | `{ taps, ms }` — `taps` is the whole rhythm (ms from the first tap), `ms` its length | ✅ |
| `handshake_redo` | The pad was tapped again when a handshake already existed, starting a new one. | `{}` | ✅ |
| `handshake_replay` | ▶️ Play it. (The automatic play-back after making one is not logged.) | `{}` | ✅ |

Each card's sentence is said as it appears — "My agent likes…" / "School
wants us to…" and then the card (not logged); a TAP on the card says it
again and is a `label_speak`. The agent acts every card out — it moves
(Full motion), and the card's emoji appears by its head (always) — and
answers by nodding, tilting or shaking its head. None of that is logged:
`suit_sort` is the answer.

### 4.3c Safe place (v3 P4)

| Action | When | `detail` | v3 |
|---|---|---|---|
| `safe_choose` | A place, or Nowhere, was tapped. | `{ step: "talk"/"stops", id, changed }` — `id` is an HQ place id or `"safe-nowhere"`; `changed` is true if that question already had an answer | ✅ |
| `safe_step` | The other question was opened. | `{ to: "talk"/"stops", how: "next"/"tab" }` — `next` is ➡️, `tab` is the 💬 / ⛔ buttons | ✅ |
| `safe_draw` | A place from the ✏️ sheet was kept. | `{ step, drawn, said }` | ✅ |
| `safe_draw_remove` | That place was removed (second tap of two). | `{ step }` | ✅ |

Every place tapped is also a `label_speak`.

### 4.3d Powers (v3 P5)

| Action | When | `detail` | v3 |
|---|---|---|---|
| `powers_draw` | The first stroke on the ✨ canvas for a new power. (Every stroke was also a `draw_stroke` with `where: "power"`.) | `{}` | — (before v80: the ✨ canvas is gone) |
| `powers_record` | 🎤 on ✨: the power was said. | `{ ms }` | — (before v80) |
| `powers_ideas_open` | 💡 Need ideas? — or 🚪 — the FIRST time for this power. | `{ inventedFirst }` | — (before v80: the doors come first) |
| `powers_door_open` | A family door was opened (it swings open, then its cards are dealt). | `{ family }` | ✅ |
| `powers_secret_open` | The ✨ secret door was opened: the ✏️ sheet follows, to make up a power. Cancelling the sheet makes nothing. | `{}` | ✅ v80 |
| `powers_choose` | A power was chosen: a card in a door, ✨ an own power from the secret door, or ⏪ Last time. Choosing again changes it. | `{ power }`, plus `{ drawn, said }` for `"own"` | ✅ |
| `powers_phase` | Another step opened (🚪 🔋 ⚡). | `{ to: "doors"/"sentence"/"mine", how: "next"/"tab"/"back" }` — `back` is 🚪 back to all the doors from inside one (`to: "make"` only before v80) | ✅ |
| `powers_slot_open` | Another question (a battery cell) opened. | `{ slot, how: "next"/"tab" }` — `tab` is tapping a cell | ✅ |
| `powers_slot` | A card in a question turned on or off, or an own card kept or removed. | `{ slot, value, on }` — `slot` is `rules` (v88)/`devices`/`when`/`who`/`how`; `value` is a card id or `"own"` (then also `drawn`, `said`) | ✅ |
| `powers_slot_skip` | ➡️ on a slot that was still empty. | `{ slot }` | ✅ |
| `powers_sothat` | 🎯 "What happens then?" was kept (drawn or said). | `{ drawn, said }` | ✅ |
| `powers_sothat_remove` | …and removed (two taps). | `{}` | ✅ |
| `powers_fire` | ⚡ Power on! — the agent does the power and the sentence reads itself back. | `{ index, via }` — which of the agent's powers; `via` (v88) `"hold"` if ⚡ was held until the battery charged, `"tap"` for a tap (also on My powers) | ✅ |
| `powers_charge_stop` | v88: ⚡ was held, then let go before the battery had charged - nothing fired. | `{ cells }` — how many cells had lit | ✅ |
| `powers_edit` | 🔋 on a kept power, to change its answers (📝 before v80). | `{ index }` | ✅ |
| `powers_new` | ➕ Another power. | `{}` | ✅ |
| `powers_remove` | 🗑️ A power was removed (two taps). | `{ index }` | ✅ |

### 4.3e The bottle (v3 P6)

| Action | When | `detail` | v3 |
|---|---|---|---|
| `bottle_item_add` | An item went into the bottle. | `{ type, via }` — `via` (v88): `"drag"` if its token was carried into the bottle, `"tap"` if tapped (an item made on a sheet carries the way its token was used) | ✅ |
| `bottle_item_remove` | An item was taken out (two taps on its chip). | `{ type }` | ✅ |
| `bottle_voice_record` | 🎤 for a voice message, or (v80) for the name of a favourite game. The `bottle_item_add` that follows says which. | `{ ms, via }` — `via` as for `secret_word_record` | ✅ |

A token tapped is also a `label_speak { id }` with the token's KIND (e.g.
`item-power`), as its story is told; `bottle_item_add { type }` says what
went in.
| `bottle_voice_filter` | A spy voice was picked. | `{ filter }`, plus `mystery: true` when the 🕵️ step asked for it — then it applies to EVERY recording in the bottle | ✅ |
| `bottle_phase` | Another step opened (🍾 👥 🕵️ 🚀 🗂️; 🕵️ was ✍️ before v80). | `{ to, how: "next"/"tab" }` — `to: "sign"` is "Who is it from?" | ✅ |
| `bottle_to` | Who it is for. | `{ who }` | ✅ |
| `bottle_to_name` | v86: 🎤 the child said who a friend's or teacher's bottle is for. | `{ ms, again, via }` — `again` if it replaced an earlier one. The recording itself is `toNameAudioId` (personal data). | ✅ |
| `bottle_to_name_remove` | v86: that recording was deleted because the bottle is now for someone else. | `{}` | ✅ |
| `bottle_friend_pick` | A friend's agent was tapped (or tapped again to un-pick). | `{ toAgentId }` | — (before v84: the list of agents is gone) |
| `bottle_sign` | "Who is it from?": the agent, or 🎭 a mystery. | `{ signed }` | ✅ |
| `bottle_cork` | The cork went in. | `{}` | ✅ |
| `bottle_send` | Sent: swiped up, or 🚀 held. | `{ to, signed, items }` — `items` are the types | ✅ |
| `bottle_keep` | 🔒 Kept (for me). | `{}` | ✅ |
| `bottle_queued` | It could not go yet: it waits. | `{}` | ✅ |
| `bottle_delivered` | The relay took it — at once, or later. | `{ ms }` — from sending to arriving | ✅ |
| `bottle_new` | ➕ Another bottle. | `{}` | ✅ |

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
> `mission` says which screen it was on (e.g. `suit`). `where: "power"` (the
> ✨ Powers canvas) exists only in builds before v80.

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

**A child's bottle** (P6, v3 §9.1), built by `buildBottlePayload()`. Sent only
when the child sends it (🙋 "me" bottles are never sent), and only what the
display will show — never the agent's `id`, its event log, or any other agent:

```json
{
  "type": "bottle",
  "bottleId": "the bottle's own random id",
  "sentAt": "ISO date",
  "to": "who-everyone",
  "toEmblem": null,
  "signed": true,
  "from": { "codename": "Clever Blaze", "emblem": "🔥", "picture": "data:image/png… (256 px)", "handshake": [0, 310, 620] },
  "items": [
    { "type": "item-power", "power": "pow-control-teachers", "picture": null, "soThat": null },
    { "type": "item-voice", "audio": "data:audio/wav…", "filter": "robot" },
    { "type": "item-word", "audio": "data:audio/wav…", "filter": "deep" },
    { "type": "item-talk", "mode": "mode-hands" },
    { "type": "item-drawing", "picture": "data:image/png… (≤512 px)", "audio": null },
    { "type": "item-handshake", "taps": [0, 250, 500] },
    { "type": "item-safe", "place": "hq-space", "picture": null }
  ]
}
```

- `from` is `null` for a mystery; `picture` is the agent drawn by
  `drawAgentToCanvas` in its place, 256 px. `toEmblem` is the friend agent's
  emblem if one was tapped.
- **For a friend or a teacher, `items` is empty**: the envelope only; the
  contents stay on the iPad (§9.1). **The spoken name (`toNameAudioId`)
  is never sent**, for any bottle.
- `soThat` is only sent with "Control teachers" (the display shows it).
- **Voices are disguised ON THE iPAD** (the §9.1 choice): `Voice.render()` runs
  the same filter through an OfflineAudioContext and sends a WAV (mono,
  16 kHz), so the display plays exactly what the child heard — and a
  mystery bottle's real voice never leaves the iPad. **Every** recording
  is sent in its item's `filter` (v80: a game's name, and anything said on
  the ✏️ sheet, too); in a mystery bottle they all have a spy voice, and a
  recording that somehow still has none is left out (`audio: null`) rather
  than sent in the child's real voice.
- A bottle over 1.9 MB drops its sounds (`audio: null, audioDropped: true`)
  rather than not arriving.

**The display and the relay keep nothing** (P7). The relay holds this run's
bottles in memory so a reloaded display can rebuild its board and post shelf;
Ctrl-C forgets them all. The display records nothing at all — no log, no
storage. **H** (safeguarding) takes a bottle off the screen and asks the relay
to forget it too (`POST /hide`, which only the display page itself may call),
so a reload cannot bring it back. Its "real for a minute" settings live in
memory only, and a reload switches every power off again.

The Display link logs no events: it is the adult's set-up, not something a
child did.

---

## 8. The analysis tables (`tools/analyse.py`, P9)

`python3 tools/analyse.py <exports…> [--out FOLDER]` reads every iPad's export
and writes to a folder OUTSIDE the repo (default `../agent-lab-analysis`).
Agents are merged by `id`, keeping the copy with the most events. Rows never
contain a child's name. `agent_ref` = the first 8 characters of the agent's
id; `power_ref` and `bottle_ref` likewise. Lists are space-separated. 1/0
for yes/no. Running it twice on the same files gives the same output.

**`agents.csv`** — one row per agent

| Column | From |
|---|---|
| `agent_ref`, `codename`, `codename_source`, `created_at` | §3.1–3.2 |
| `sessions` | the sessions it was opened in |
| `practice`, `imported`, `sealed` | 1/0 |
| `door`, `base`, `like_me` | §3.3, §3.7 |
| `event_count` | how many events in its log |
| `status_make` … `status_bottle` | the v3 missions: `todo` / `done` / `passed` |
| `status_powerup`, `status_hq`, `status_voice` | the session-2 missions |
| `suit_likes`, `suit_likes_unsure`, `suit_likes_not` | the 👍 🤷 👎 piles of "My agent likes…" |
| `suit_likes_own`, `suit_school_own` | own cards: `drawn`, `said` or `drawn+said`, one per card |
| `suit_school`, `suit_school_unsure`, `suit_school_not` | the piles of "School wants us to…" (its own `school-…` cards since v80) |
| `suit_best` | ⭐ the one the agent likes the most |
| `secret_word`, `secret_word_voice` | 1/0, and its spy voice |
| `handshake_taps` | the rhythm, ms from the first tap |
| `safe_talk`, `safe_stops` | a place id, `safe-nowhere`, or `own:drawn` etc. |
| `hq_v2` | session 2's HQ, the same way |
| `v2_power_effect`, `v2_power_when` | session 2's power |
| `power_count`, `bottle_count` | how many |

**`powers.csv`** — one row per power: `agent_ref`, `codename`, `power_index`,
`power_ref`, `power` (a card id, `own` or `v2`), `family` (the door, from §4
of this file; empty for own/v2), `invented_first` (1/0; empty since v80,
when the doors come first), `own_drawn`, `own_said`, `devices` (v80: the
devices a "Control school devices" power controls), `rules`, `rules_own`
(v88: the school rules "Change a school rule" changes, and own ones), `when`, `when_own`,
`who`, `who_own`, `how`, `how_own`, `so_that` (`drawn`/`said`/both),
`skipped`, `order`, `times_fired` (its `powers_fire` events).

**`bottles.csv`** — one row per bottle: `agent_ref`, `codename`,
`bottle_index`, `bottle_ref`, `created_at`, `state`, `to`, `to_agent_ref`
(the friend's agent, if one was tapped), `to_name_said` (1/0, v86: a name
was said - the recording is in `audio/` as `…_bottleN-to-name-PERSONAL`),
`signed` (1/0, empty for "me"),
`items` (the types), `powers_given` (the power each ⚡ gave — `removed` if
that power was later removed), `voice_filter`, `sent_at`, `delivered_at`.

**`events.csv`** — one row per event: `agent_ref`, `codename`, `seq` (its
place in that agent's log), `t`, `session`, `practice`, `mission`, `action`,
`detail` (the detail object as JSON). Section 4 says what each action means.

**`drawings/`** and **`audio/`**: every drawing and recording, named
`<agent_ref>_<what>` — e.g. `f3d36b62_power0.png`, `b2719579_secret-word.m4a`.
A recording is the RAW voice as recorded; its spy voice is in the tables.

**`cards/`**: one page per agent (`<agent_ref>.html`) and an `index.html`.
Each card draws the agent with a copy of the app's own `parts.js`.
