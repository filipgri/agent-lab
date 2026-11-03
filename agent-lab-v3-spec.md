# Agent Lab v3 — Powers and the Bottle

What changes in Agent Lab for session 3 onwards. Session 2 ran on commit `b0ba4c1` (tag it `session-2`; see §0). Written for Claude Code.

**Read together with** `agent-lab-v2-spec.md`, `agent-lab-build-spec.md` and `asset-guide.md`.
**Where this file and the earlier specs disagree, this file wins. For assets, `asset-guide.md` wins** (§11 says what to add to it).

---

## 0. How to use this file (for Filip)

1. **Before anything changes,** bookmark the version the children used in session 2. In Terminal, in the agent-lab folder:
   ```bash
   git tag session-2            # a permanent label on the current version
   git push origin session-2    # saves that label on GitHub
   ```
   Then copy the iPads' JSON exports to secure KCL storage.
2. Put this file in the `agent-lab` folder, next to the other specs.
3. In Claude Code, say: **"Read agent-lab-v3-spec.md, then build P0 only. Stop and explain what you did."**
4. Test on an iPad (§15), then ask for the next milestone.
5. **You need P0–P8 for session 3.** P9 (the analysis script) can come after it. If time runs short, §14 lists what to cut first.
6. After P0 has added the new lines to `asset-guide.md`, make the voice and sounds:
   ```bash
   python3 tools/make_audio.py narrator --session 3
   python3 tools/make_audio.py sfx --session 3
   ```
7. **Make the pictures alongside the build** (§11.1). Start with the style anchor, then the five ★ powers, the doors and the display. Emoji stand in until each one arrives, so nothing waits for them.
8. §16 is the session protocol. It's light on purpose: the app collects during the session, you analyse at home, and the talking happens next session.

---

## 1. Instructions for Claude Code

Everything in v2 §1 still applies:
- Filip is a beginner, so explain each milestone in plain language, explain new syntax, and comment generously.
- Build one milestone at a time, then stop.
- Use plain HTML, CSS and JavaScript, with no frameworks, build step, libraries, CDNs, web fonts or analytics.
- Every asset has a stand-in, and the app works with an empty `assets/` folder.
- **The app never interprets a child.**

**What changes:**
- **One rule changes: a bottle may leave the iPad.** When a child sends a bottle, and only then, that bottle goes to a relay on Filip's laptop over the room's private network (§9). Nothing else ever leaves the iPad.
- **New folder `display/`** holds the public display page and `relay.py`, the laptop relay. The relay uses the Python standard library only, like the scripts in `tools/`.
- **New file `DATA.md`** is a data dictionary: every saved field and every logged event, with what it means. Every milestone updates it. It's part of the research record, so it must always match the code.
- **The data model changes in §10 are approved.** Anything beyond them still needs asking.
- **At P0, update `CLAUDE.md`** as §13 describes.
- **Before calling a milestone done,** run v2's checks (landscape and portrait; with assets and with `assets/` empty). From P1 on, also test once with the relay running and once with it off.

---

## 2. Why v3

**What changed after session 2:**
- **Children won't remember which agent was theirs a month later, and sessions are short.** So any child can make a quick new agent in about two minutes, or pick an old one from a gallery of pictures.
- **Feelings move to a separate app (the dunes).** v3 has no feeling screens and no feeling words.
- **The club's theme became sharing.** v3 asks about **communicative power**: who has to adjust, when, through which channel, and for whom.

**The question behind each mission.** Lundy (2007) argues that children need space, an audience and influence as well as a voice.

| Mission | Question | Link recorded | Why it matters |
|---|---|---|---|
| Quick agent + "like me?" | Who is speaking? | how close the agent is to the child | The agent speaks and the child composes (Goffman, 1979). Read everything the agent "says" through this. |
| How my agent talks | **Voice**: which ways of talking count? | preferred modes × the modes school expects | Some ways of speaking carry authority and others don't. |
| Safe place (optional) | **Space**: where can talk happen? | where it's safe × where power stops | A map of where communication is easy or hard. |
| Powers | **Influence**: who has to adjust? | power × when × who × how × so that | Children's own theory of where power sits. "Who" is who has to adjust, which makes double empathy observable (Milton, 2012). |
| Bottle | **Audience**: to whom, and how publicly? | items × addressee × signed or mystery | Giving a power (power-with) versus using it on someone (power-over). |
| Display | Being seen | what arrives on the public screen | Children's reactions are discussed next session (§16). |

**Four rules that protect what the data means:**
1. **Ask about the agent, never the child.** Every prompt is about the agent.
2. **Invent first, ideas second.** Ideas appear only after the child has made something or asked for them, and the log shows which came first. If children only choose from our cards, we end up measuring our own categories.
3. **Record, never interpret.** Every step can be skipped, and skips are data. No scores, no labels, and no reactions to what a child drew or said.
4. **Keep the session light.** The app collects quietly. Nothing on the iPad asks a child to explain themselves; that happens next session, with pointed questions (§16).

---

## 3. Missions, sessions and the flow

| Strip | id | Mission | Opens in session | Target time |
|---|---|---|---|---|
| (Start) | — | Gallery, or New agent + codename | — | 1 min |
| 🎨 | `make` | Quick agent | 2 | 2 min |
| 🗣️ | `suit` | How my agent talks | 3 | 1.5 min |
| 📍 | `safe` | Safe place: **off in the session-3 preset** | 3 | 1 min |
| ⚡ | `powers` | Powers | 3 | 3 min |
| 🍾 | `bottle` | The bottle | 3 | 2 min |

- **A new agent should take about 8–9 minutes, and one picked from the gallery about 6.** Time it at P8.
- **Safe place is in the strip but switched off in the session-3 preset** (for example with a `defaultOn: false` flag on its `MISSIONS` entry). An adult can switch it on when there's time.
- **Retired:** the v2 screens for `powerup`, `hq` (as a mission), `voice`, `field`, `mood`, `rules`, `badge` and the Reveal `card`. Remove them from `MISSIONS` and from the strip, and remove their screens. Git and the `session-2` tag keep them.
  - **Their data stays** in every agent record and every export. Never delete it.
  - **Keep the code that draws old agents:** `renderAgentView`, `drawAgentToCanvas`, `shapesToSvgUrl`, and all three doors (parts, pixel, draw).
- **Keep the foundations:**
  - `storage.js`, `assets.js`, `audio.js` (the recorder and `Voice.FILTERS`), `effects.js`, `parts.js`, `stickers.js`, `boot-guard.js` and `sw.js`;
  - the codename reels, the parts editor, the seal and `openOwnCard`;
  - export and import, the adult panel and practice mode;
  - every release rule in CLAUDE.md.
- **Reuse rather than rebuild:**
  - the HQ screen layout becomes Safe place;
  - the situation cards (`Assets.list('situations')`) become "when";
  - the recorder and spy voices become voice messages;
  - `openOwnCard` is every ✏️ My own.
- **The end:** after the bottle comes a short finish (the agent with its power icons, `nar-card-finish` and the stamp), then back to the start. There's no card screen.

---

## 4. Start screen and quick agent

**Gallery (P0).**
- Every tile shows **the agent itself** with its codename, not just the emblem. Children recognise their own drawing faster than they recall a name. This makes v2's "shared codename" tile the default for every tile.
- A sealed agent still shows its emblem and 🔒, not its picture, because sealing was the child's choice.
- Practice agents keep their label.
- `nar-v3-gallery` plays when there are agents.

**Quick agent (P2).**
1. **Codename:** the existing reels, unchanged.
2. **Start from a ready agent** (`nar-base-pick`): a row of 8 bases, plus **Start blank** (`nar-base-blank`).
   - Each base is a complete face and body made from `parts.js` parts and stored as data: a `BASES` array of `cover.shapes` lists in `parts.js`. Add a Bases view to `tools/parts-sheet.html` so Filip can review them.
   - Together the bases cover:
     - a range of skin tones;
     - hair: afro puffs, braids, locs, curly, straight, short;
     - head coverings: hijab, turban, cap;
     - glasses, hearing aids and a cochlear implant.
   - None is "the default", none has a gendered label, and they must look clearly different from each other at a glance.
   - Picking a base copies it into `cover.shapes`. The editor opens with the rail on Hair, then Colours, then Stickers. Every other category stays one tap away.
   - Log `base_choose` {base}: `base-1` … `base-8`, or `blank`.
3. **"Is your agent like you?"** (`nar-likeme-ask`). Three big cards: 🪞 `likeme-like`, 🌗 `likeme-bit` and 🎭 `likeme-else`. One tap, and the child can change it.
   - It's asked once per agent: right after Make is stamped, or the first time an agent without an answer is opened.
   - Log `like_me` {answer}.

---

## 5. How my agent talks (P3)

**Step 1: "How does your agent like to talk?"** (`nar-suit-likes`). The child picks any number of cards:

| id | Icon | Label |
|---|---|---|
| `mode-talk` | 🗣️ | Talking |
| `mode-hands` | ✋ | Hands |
| `mode-handshake` | 🤝 | Secret handshake |
| `mode-draw` | ✏️ | Drawing |
| `mode-act` | 🎭 | Acting it out |
| `mode-pictures` | 🖼️ | Pictures |
| `mode-write` | 📝 | Writing |
| `mode-device` | 📱 | A device |

Plus ✏️ My own.

**Step 2: "How does school want your agent to talk?"** (`nar-suit-school`). The same cards, plus two that appear only here: 🙋 `mode-hand-up` (Hand up) and 🤫 `mode-quiet` (Being quiet). Plus ✏️ My own.

- **Tapping a card makes the agent do it** (waving hands, acting, scribbling, a speech wave for talking…), and the card speaks its label. A small CSS animation or an emoji pop is enough, gated on `fullMotion()`.
- **The app never compares the two lists.** The gap between them is for the analysis.
- Log `suit_toggle` {step: `likes` | `school`, mode, on} and `suit_own` {step}.

**Step 3: secret handshake** (`nar-handshake-make`). Offered to everyone, and skippable.
- A big round pad. The child taps a rhythm of up to 8 taps. It ends 1.5 s after the last tap, at the 8th tap, or after 6 s.
- It plays back straight away as pulses with `sfx-handshake-tap` (`nar-handshake-listen`). Tapping the pad again starts a new one.
- Save it as tap times in ms from the first tap. It becomes the agent's signature on the display, and one way to switch powers on.
- Log `handshake_make` {taps, ms}, `handshake_replay` and `handshake_redo`.

---

## 6. Safe place (P4; off by default)

Reuse the HQ screen (`enterHq`): the agent on the left, the twelve places on the right (`HQ_REAL`, `HQ_FANTASY`), ✏️ Draw my own, and the landing. There are two steps on one screen, each with 🔊 and ➡️ skip:

1. **"Where does your agent feel safe to talk?"** (`nar-safe-talk`) → `safe.talk`.
2. **"Where does your agent's power stop working?"** (`nar-safe-stops`) → `safe.stops`.

- Add **Nowhere** (`safe-nowhere`) as an equal choice in both steps.
- **Never write to `hq`.** v2's "strongest" answer stays as it was, so the two sessions can be compared.
- On later v3 screens the agent stands in its safe place, or in its HQ if there's no safe place.
- Log `safe_choose` {step, id} and `safe_draw` {step}.

---

## 7. Powers (P5)

This is the heart of v3. **One power is the aim; up to 3 are allowed.**

### 7.1 Invent first
- **"Make up a power. Draw it or say it."** (`nar-powers-make`): a blank canvas and 🎤, as in v2's Power-up step 1.
- **Need ideas?** (`nar-powers-ideas`) opens the six doors (§7.2). **The doors aren't rendered at all** until the child has drawn, recorded, or tapped Need ideas.
- A child who draws and then picks a card keeps their drawing as that power's picture.
- Log `powers_draw`, `powers_record` and `powers_ideas_open` {inventedFirst}.

### 7.2 The six doors

Big doors, each with an icon and one word, always in this order (note the order in `DATA.md`). Each door opens its cards plus ✏️ My own. Log `powers_door_open` {family} (with `sfx-door-open`) and `powers_choose` {power}.

| Door (family id) | Label | Powers |
|---|---|---|
| ⏳ `fam-time` | Time | slow everybody down · pause the world · hold my turn · warn me first · say it again |
| 🔊 `fam-senses` | Sound and light | turn the room down · dim the lights · quiet bubble |
| 🗣️ `fam-language` | Words | translator · everyone talks my way · get-what-I-mean ray |
| ✋ `fam-floor` | Turns | control teachers · question swap · pass · invisibility cloak |
| 📺 `fam-screens` | Screens | control all displays · control devices · see my points · change a rule |
| 🤝 `fam-together` | Together | speak for your friends · call an ally · team up |

The family ids are a lens for the analysis, not the children's words. Labels the children see stay plain.

| id | Icon | Label | On the iPad | On the display (§9.5) |
|---|---|---|---|---|
| `pow-slow-everybody` ★ | 🐢 | Slow everybody down | every animation on the stage slows for 4 s (`sfx-slow`) | the whole scene slows for 10 s |
| `pow-pause` | ⏸️ | Pause the world | `fx-freeze` | the scene freezes for 5 s |
| `pow-hold-turn` | 🎟️ | Hold my turn | a glowing token above the agent | the token stays pinned to the board |
| `pow-warn-me` | 🔔 | Warn me first | a 3-2-1 ring | a 3-2-1 ring before the next arrival |
| `pow-say-again` | 🔁 | Say it again | a backwards spin | the previous arrival plays again |
| `pow-turn-down` | 🔉 | Turn the room down | sound waves shrink | display sound off and colours softer for 15 s |
| `pow-dim-lights` | 🌙 | Dim the lights | the stage dims | the screen dims for 15 s |
| `pow-quiet-bubble` | 🫧 | Quiet bubble | `fx-shield` | a bubble round the agent; everything else pauses |
| `pow-translator` | 🔄 | Translator | a picture and a speech bubble swap | the drawing turns into a speech bubble and back |
| `pow-my-way` | 🌀 | Everyone talks my way | `fx-thoughts` | every agent on the board does the sender's way of talking for 10 s |
| `pow-get-me` | 💡 | Get-what-I-mean ray | a beam from the agent | a beam lights up the bottle's contents |
| `pow-control-teachers` ★ | 🎮 | Control teachers | a remote-control zap | a teacher figure (a bean) does what the child's "so that" shows |
| `pow-question-swap` | 🔀 | Question swap | a ? flips round | a big ? flies from the board to the teacher figure |
| `pow-pass` | 🛑 | Pass | a gentle stop hand | a calm "pass" card |
| `pow-invisible` | 👻 | Invisibility cloak | `fx-fade` | the agent fades; its contents still show |
| `pow-control-displays` ★ | 📺 | Control all displays | a remote-control zap | the sender's emblem and colour wash across the screen for 10 s |
| `pow-control-devices` ★ | 🎛️ | Control devices | `fx-lightning` | icons of lights, speakers and a whiteboard switch on and off |
| `pow-see-points` | ⭐ | See my points | a star with an eye opening | a star with an eye, **never a number** |
| `pow-change-rule` | 📜 | Change a rule | a scroll unrolls | a scroll unrolls with the child's drawing |
| `pow-speak-for-friends` ★ | 💬 | Speak for your friends | two speech bubbles | two speech bubbles |
| `pow-call-ally` | 📣 | Call an ally | a second figure pops up beside the agent | a second agent outline joins |
| `pow-team-up` | 🤝 | Team up | two figures side by side | two agents stand together |

★ = from Filip's notes, with the wording kept. **Build these five first,** on both the iPad and the display. Any other power can start as its icon popping over the agent with its sound, and get its own effect later.

### 7.3 The sentence

After a power is chosen or made up, a **sentence strip** appears: four slots in a row, each with an icon, 🔊 and ➡️ skip. The child fills them by tapping picture cards, in any order.

| Slot | Prompt | Cards | How many |
|---|---|---|---|
| When | `nar-powers-when` | the 10 situation cards (`sit-…`) + ✏️ | up to 3 |
| Who it works on | `nar-powers-who` | 🙋 `who-me` · 👫 `who-friend` · 🧑‍🏫 `who-teacher` · 🏫 `who-class` · 🌍 `who-everyone` · 🏠 `who-room` + ✏️ | any |
| How it switches on | `nar-powers-how` | 🏷️ `how-badge` · 🤝 `how-handshake` · ✋ `how-hand-sign` · 🗣️ `how-word` · ✏️ `how-drawing` · 🔘 `how-button` + ✏️ | any |
| So that… | `nar-powers-sothat` | draw it or say it (`openOwnCard`) | optional |

- **`who-teacher` means any adult at school,** teacher or teaching assistant. Its picture shows an adult, not a role.
- **`how-handshake` plays the agent's own handshake,** if it has one.
- **`how-badge` refers to the badges the club is designing.** Which switches children want is design data.
- **The situation ids are the session-2 ids,** so power × situation can be compared across sessions.
- **Then fire it** (`nar-powers-fire`). The power plays on the agent, and the strip reads itself back by playing each card's own label line in order. These are recorded lines, so no synthetic speech is needed.
- **"Someone is unkind"** works as it did in v2: the app doesn't react, and facilitators follow the safeguarding route.
- **Removing a kept power** uses the two-tap arm, the same as ✏️ My own cards.
- Log `powers_slot` {slot, value, on}, `powers_slot_skip` {slot}, `powers_sothat` {drawn, said}, `powers_fire` {index} and `powers_remove` {index}.

### 7.4 From last time (optional)

If an agent has a v2 power (`powerup.power`), show it first as a card: **"Your power from last time"**. Choosing it starts a sentence with `power: "v2"`. Cut this if time is short.

---

## 8. The bottle (P6)

**"What will your agent hand over?"** (`nar-bottle-intro`). An empty glass bottle sits in the middle, with item tokens around it. The child taps a token, or drags it, and it drops in (`sfx-bottle-drop`), adding a coloured band. The colours belong to the item types, not to feelings. **Up to 4 items** (`nar-bottle-full`).

| id | Token | Label | What goes in |
|---|---|---|---|
| `item-power` | ⚡ | A power to give | one of the agent's powers, or its v2 power, **given** to whoever the bottle is for |
| `item-handshake` | 🤝 | My handshake | the rhythm |
| `item-drawing` | ✏️ | A drawing | drawn in the shared sheet |
| `item-voice` | 🎤 | A voice message | up to 10 s, with an optional spy voice (`Voice.FILTERS`) |
| `item-game` | 🎮 | My favourite game | draw it or say it |
| `item-cant-live` | 💎 | Something I can't live without | draw it or say it |
| `item-safe` | 📍 | My safe place | the chosen place card (only if Safe place was done) |

**Who is it for?** (`nar-bottle-to`). One choice:
- 🔒 `who-me`: the bottle stays on the agent's shelf on this iPad (`nar-bottle-kept`).
- 👫 `who-friend`: the child may tap the friend's agent among the tiles (`nar-bottle-friend`). If it isn't on this iPad, "a friend" on its own is fine.
- 🧑‍🏫 `who-teacher`.
- 🌍 `who-everyone`: the big screen.

**Show your agent, or send a mystery?** (`nar-bottle-sign`). Not asked for `who-me`.
- ✍️ `sign-agent`.
- 🎭 `sign-mystery`: *"Mystery. The big screen won't say who."* Be honest: this hides the sender on the display only. Never promise that nobody can ever know.
- **A mystery voice message must use a spy voice.** "normal" isn't offered, and the child hears the disguise before sending.

**Sending:**
- The child pushes the cork in (`nar-bottle-cork`, `sfx-cork`).
- Then they swipe the bottle up, **or press and hold the big 🚀 button**, because every gesture needs a tap alternative.
- The bottle flies off the top of the screen (`sfx-bottle-send`, `nar-bottle-sent`).
- **If the display link is off or fails, the child sees exactly the same flight.** The bottle is saved as `waiting` and goes the next time the link works. The adult panel shows how many are waiting, with a **Send waiting bottles** button.
- **Up to 3 bottles per agent.**

Log:
- `bottle_item_add` {type} and `bottle_item_remove` {type};
- `bottle_to` {who}, `bottle_friend_pick` and `bottle_sign` {signed};
- `bottle_cork`, `bottle_send` {to, signed, items} and `bottle_keep`;
- `bottle_queued` and `bottle_delivered` {ms}.

**Later, not for session 3:** a friend adding to the bottle and agreeing with 👍 ("speak for your friends" for real), and a recipient opening a friend's or teacher's bottle on the sender's iPad.

---

## 9. Sending, the relay and the display (P1, P7)

### 9.1 What may leave the iPad
- **Only when the child sends, and only that bottle,** to the relay on the room's private network.
- **Never** the event log, the agent record, the agent's id, or any other agent.
- **Send only what the display will show:**
  - for `who-friend` and `who-teacher`: the envelope only (who it's for, the recipient's emblem, and the sender if signed); the contents stay on the iPad;
  - for `who-everyone`: the items as well.

```json
{
  "type": "bottle",
  "bottleId": "random id, not linked to the agent id",
  "sentAt": "ISO date",
  "to": "who-everyone",
  "toEmblem": null,
  "signed": true,
  "from": { "codename": "Hidden Bear", "emblem": "🐻", "picture": "data:image/png… (256 px or less)", "handshake": [0, 310, 620] },
  "items": [
    { "type": "item-power", "power": "pow-slow-everybody", "picture": null },
    { "type": "item-drawing", "picture": "data:image/png… (512 px or less)" },
    { "type": "item-voice", "audio": "data:audio/mp4…", "filter": "robot" }
  ]
}
```

- **`from` is `null` for a mystery.** The agent's picture is drawn with `drawAgentToCanvas`.
- **The display must play exactly what the child heard.** Either render the filtered clip on the iPad (`OfflineAudioContext`), or send the clip with its filter id and run the same filter graph on the display. Pick one and note which in `DATA.md`.

### 9.2 The relay: `display/relay.py`
- It uses the Python 3 standard library only (`http.server.ThreadingHTTPServer`, `ssl`, `json`), like `tools/`. It runs on Filip's laptop with a certificate made by mkcert (§9.4).
- **Routes:**
  - `GET /status`: the iPad's link test.
  - `POST /bottle`: bottles from the iPads. Limit 2 MB. It answers CORS for `https://filipgri.github.io` and `http://localhost:8000`.
  - `GET /events`: Server-Sent Events to the display.
  - `/`: serves the `display/` folder.
- **It writes nothing to disk.** Bottles live in memory for the current run, so a reloaded display can catch up; Ctrl-C forgets them all.
- It prints one line per bottle (time, to, signed, item types, size), never its contents.
- Run it with `python3 display/relay.py`. The defaults are `--host tact-display.local --port 8443`.

### 9.3 The iPad side (P1)
- **Adult panel → Display link:**
  - an address field (default `tact-display.local:8443`);
  - **Test** (✅ / ⚠️);
  - an on/off switch, off by default;
  - **Send test bottle**.
- **CSP:** `connect-src 'self'` becomes `connect-src 'self' https://*.local:8443 https://localhost:8443`. Nothing else may ever be added.
- **The service worker already ignores non-GET and cross-origin requests.** Keep it that way, so relay requests are never cached.
- **Requests time out after 4 s.** A failure just queues the bottle; a child never sees an error.
- **If the iPads can't find `tact-display.local`, stop and tell Filip.** The fix (a fixed IP in the certificate and the CSP) changes this section.

### 9.4 Setting up the room (README section, for Filip)
- **A pocket Wi-Fi router** (no internet needed) or a phone hotspot. The laptop and the iPads all join it, because school Wi-Fi often blocks devices from talking to each other.
- **Name the laptop `tact-display`:** System Settings → General → Sharing → Local hostname. If macOS asks whether Python may accept incoming connections, allow it.
- **Make the certificate, once:**
  ```bash
  brew install mkcert
  mkcert -install            # your laptop now trusts certificates you make
  mkcert -cert-file display/certs/cert.pem -key-file display/certs/key.pem tact-display.local localhost 127.0.0.1
  mkcert -CAROOT             # shows the folder that holds rootCA.pem
  ```
- **On each iPad, once:**
  1. AirDrop `rootCA.pem` to the iPad.
  2. Settings → Profile Downloaded → Install.
  3. Settings → General → About → Certificate Trust Settings → switch it on.
- **Add `display/certs/` to `.gitignore`.** Never commit a certificate or key.
- **Before the session,** open the app once on each iPad with internet, so it's cached and works offline on the router.

### 9.5 The display: `display/index.html` (P7)

Open it full screen on the laptop at `https://localhost:8443/`, shown on a TV or projector.

- **The scene:** a calm shore at the bottom, where bottles land, and a board above it (the pictures `disp-shore` and `disp-board`, drawn in code until they arrive). The only text is a signed agent's codename. **No counts, totals or rankings, ever.**
- **When a bottle for `who-everyone` arrives:**
  1. A soft chime (`sfx-bottle-arrive`). The bottle drops in at once and waits in a queue along the top edge.
  2. It's released automatically after 3 s, or by the facilitator in held mode. It lands and the cork pops.
  3. A signed bottle: the agent walks on with its codename, and its handshake pulses as light. A mystery: a ? outline.
  4. The items play one at a time:
     - a given power travels across as a gift (`sfx-gift`), then does its display effect (§7.2);
     - a drawing is pinned to the board;
     - a voice message plays;
     - the game and the can't-live-without appear as cards.
  5. The agent waves and leaves. Drawings stay pinned for the rest of the session.
- **For `who-friend` and `who-teacher`:** a sealed bottle marked with the recipient's emblem (or 👫 or 🧑‍🏫) floats to a post shelf. It's never opened on the display.
- **Keep it predictable for autistic children:**
  - one arrival at a time, with a visible queue;
  - a chime before every arrival;
  - nothing flashes more than 3 times a second;
  - volume normalised and capped, with no sudden loud sounds;
  - Full / Calm / Off motion.
- **"Real for a minute"** (optional). A display setting lists the powers; all are off by default. When a power Filip has switched on arrives, the display shows a 60 s ring, with `sfx-timer-ring` at the start and end, and the adults in the room do it for real for that minute. Only switch on powers agreed with staff beforehand.
- **Facilitator keys** (`?` shows this list):

  | Key | Does |
  |---|---|
  | Space | release the next bottle |
  | A | switch between automatic and held release |
  | P | pause or resume |
  | **H** | hide the bottle on screen (safeguarding) |
  | C | clear the board |
  | M | mute |
  | F | full screen |
  | **D** | play a demo bottle (works with no network) |
  | 1–6 | demo one power family |

- **D is the fallback.** If the network fails, Filip becomes the relay and presses D as each child sends. That shows the idea, though not the child's own bottle.
- **The display keeps nothing.** A reload starts empty, apart from the relay's in-memory catch-up.

---

## 10. Data model v3 (approved)

v3 only adds fields. **Nothing is renamed or removed.** `migrateAgent()` still takes v1 agents to v2 first, then fills in the v3 defaults and sets `schemaVersion: 3`. It must stay safe to run twice.

```json
{
  "schemaVersion": 3,

  "likeMe": null,
  "base": null,

  "suit": { "likes": [], "likesOwn": [], "school": [], "schoolOwn": [] },
  "handshake": null,

  "safe": { "talk": null, "stops": null },

  "powers": [{
    "id": "short random id",
    "power": "pow-slow-everybody",
    "own": { "png": null, "audioId": null },
    "inventedFirst": true,
    "when": ["sit-too-loud"],  "whenOwn": [],
    "who": ["who-class"],      "whoOwn": [],
    "how": ["how-handshake"],  "howOwn": [],
    "soThat": null,
    "skipped": [],
    "order": ["power", "when", "who", "how"]
  }],

  "bottles": [{
    "id": "random id",
    "createdAt": "ISO date",
    "items": [{ "type": "item-power", "power": 0 }],
    "to": "who-everyone",
    "toAgentId": null,
    "signed": true,
    "state": "kept",
    "sentAt": null,
    "deliveredAt": null
  }],

  "missions": { "make": "done", "suit": "todo", "safe": "todo", "powers": "todo", "bottle": "todo" }
}
```

- **What each field can hold:**
  - `likeMe`: `likeme-like` / `likeme-bit` / `likeme-else`.
  - `base`: `base-1` … `base-8` / `blank`.
  - `handshake`: `{ "taps": [0, 310, 620] }`.
  - `safe.talk` and `safe.stops`: `{ "id": "hq-library" or "safe-nowhere", "png": null }`.
  - `soThat` and every `…Own` entry: `{ "png", "audioId" }`.
  - `powers[].power`: a power id, `own`, or `v2`.
  - an `item-power` points to one of the agent's powers by its index, or to `"v2"`.
  - `bottles[].state`: `kept`, `waiting`, `sent` or `delivered`.
- **`missions`:** old agents keep their v2 keys. Add the v3 keys as `todo`, except `make`, which keeps its v2 status.
- **The full JSON export** gets `schemaVersion: 3` and the new fields, and still includes every v2 field.

---

## 11. Narration, sounds and pictures (add to `asset-guide.md` at P0)

**How the tools read the guide.**
- `tools/make_audio.py` is Filip's script, so **don't change it**. It reads only §4.5 and §4.6:
  - in §4.5, a bold heading starting `**Session 3` puts the lines under it in session 3;
  - in §4.6, ◻️ means session 3.
- `tools/sync-assets.py` reads a fixed list of headings, and **only the first table** under each.

**So, at P0:**
1. **Move the retired tables** to a new last section at the end of the file, `## 9. Retired (v2; not made)`, and start each heading with **Retired**. They are:
   - the session-3 force field and mood codes lines;
   - the session-4 rules, badge and dossier lines;
   - `sfx-field-bounce` and `sfx-field-open`.
2. **Add the two v3 tables below to §4.5.** Add the v3 sounds as **rows at the end of the existing §4.6 table**, not as a second table.
3. **Update `sync-assets.py`'s heading list:** read the two v3 headings and stop reading the retired ones. Then run it.
4. **Check** that `python3 tools/make_audio.py list --session 3` shows the session-2 lines plus exactly the v3 lines and sounds, and none of the retired ones.
5. **Add the picture tables** and extend the asset tools for them (§11.1).

**Lines that are reused:** the `nar-sit-…`, `nar-hq-…` and `nar-own-card` labels, plus `nar-locked`, `nar-seal-open`, `nar-card-seal` and `nar-card-finish`.

**Session 3: v3 instructions ◻️**

| id | plays when | text |
|---|---|---|
| nar-v3-welcome | Start screen 🔊 | Find your agent, or make a new one. |
| nar-v3-gallery | Start screen, when agents exist | Is your agent here? Tap it. |
| nar-base-pick | Quick agent | Pick an agent to start from. |
| nar-base-blank | Start blank | Or start from nothing. |
| nar-likeme-ask | Like-me question | Is your agent like you? |
| nar-suit-likes | Talking, step 1 | How does your agent like to talk? |
| nar-suit-school | Talking, step 2 | How does school want your agent to talk? |
| nar-handshake-make | Handshake | Tap a secret handshake for your agent. |
| nar-handshake-listen | Handshake plays back | Listen. Tap again to make a new one. |
| nar-safe-talk | Safe place, step 1 | Where does your agent feel safe to talk? |
| nar-safe-stops | Safe place, step 2 | Where does your agent's power stop working? |
| nar-powers-make | Powers start | Make up a power. Draw it or say it. |
| nar-powers-ideas | Need ideas? | Here are some ideas. Pick a door. |
| nar-powers-when | When slot | When does your agent use it? |
| nar-powers-who | Who slot | Who does your power work on? |
| nar-powers-how | How slot | How do you switch it on? |
| nar-powers-sothat | So-that slot | So that what? Draw it or say it. |
| nar-powers-fire | Power fires | Power on! |
| nar-powers-more | After a power | Make another power, or Stamp it. |
| nar-bottle-intro | Bottle | What will your agent hand over? |
| nar-bottle-full | Fourth item goes in | Your bottle is full. |
| nar-bottle-to | Who it's for | Who is it for? |
| nar-bottle-friend | Pick a friend | Tap your friend's agent. |
| nar-bottle-sign | Sign or mystery | Show your agent, or send a mystery? |
| nar-bottle-cork | Cork | Push the cork in. |
| nar-bottle-send | Send | Swipe it up to send it. |
| nar-bottle-sent | After sending | Your bottle is on its way. |
| nar-bottle-kept | Kept | Your bottle stays on your shelf. |

**Session 3: v3 card labels ◻️**

| id | text |
|---|---|
| nar-likeme-like | Like me. |
| nar-likeme-bit | A bit like me. |
| nar-likeme-else | Someone else. |
| nar-mode-talk | Talking. |
| nar-mode-hands | Hands. |
| nar-mode-handshake | Secret handshake. |
| nar-mode-draw | Drawing. |
| nar-mode-act | Acting it out. |
| nar-mode-pictures | Pictures. |
| nar-mode-write | Writing. |
| nar-mode-device | A device. |
| nar-mode-hand-up | Hand up. |
| nar-mode-quiet | Being quiet. |
| nar-safe-nowhere | Nowhere. |
| nar-fam-time | Time. |
| nar-fam-senses | Sound and light. |
| nar-fam-language | Words. |
| nar-fam-floor | Turns. |
| nar-fam-screens | Screens. |
| nar-fam-together | Together. |
| nar-pow-slow-everybody | Slow everybody down. |
| nar-pow-pause | Pause the world. |
| nar-pow-hold-turn | Hold my turn. |
| nar-pow-warn-me | Warn me first. |
| nar-pow-say-again | Say it again. |
| nar-pow-turn-down | Turn the room down. |
| nar-pow-dim-lights | Dim the lights. |
| nar-pow-quiet-bubble | Quiet bubble. |
| nar-pow-translator | Translator. |
| nar-pow-my-way | Everyone talks my way. |
| nar-pow-get-me | Get-what-I-mean ray. |
| nar-pow-control-teachers | Control teachers. |
| nar-pow-question-swap | Question swap. |
| nar-pow-pass | Pass. |
| nar-pow-invisible | Invisibility cloak. |
| nar-pow-control-displays | Control all displays. |
| nar-pow-control-devices | Control devices. |
| nar-pow-see-points | See my points. |
| nar-pow-change-rule | Change a rule. |
| nar-pow-speak-for-friends | Speak for your friends. |
| nar-pow-call-ally | Call an ally. |
| nar-pow-team-up | Team up. |
| nar-who-me | Me. |
| nar-who-friend | A friend. |
| nar-who-teacher | My teacher. |
| nar-who-class | My class. |
| nar-who-everyone | Everyone. |
| nar-who-room | The room. |
| nar-how-badge | My badge. |
| nar-how-handshake | My secret handshake. |
| nar-how-hand-sign | A hand sign. |
| nar-how-word | A secret word. |
| nar-how-drawing | A drawing. |
| nar-how-button | A button. |
| nar-item-power | A power to give. |
| nar-item-handshake | My handshake. |
| nar-item-drawing | A drawing. |
| nar-item-voice | A voice message. |
| nar-item-game | My favourite game. |
| nar-item-cant-live | Something I can't live without. |
| nar-item-safe | My safe place. |
| nar-sign-agent | With my agent. |
| nar-sign-mystery | Mystery. The big screen won't say who. |

**v3 sounds:** rows to add at the end of the §4.6 table. They use the same style line.

| id | plays when | prompt | seconds | stand-in | tier |
|---|---|---|---|---|---|
| sfx-handshake-tap | A handshake tap | One soft knock on a wooden table. | 0.3 | pop | ◻️ |
| sfx-door-open | A power door opens | A small wooden door creaking open, short and friendly. | 0.7 | whoosh | ◻️ |
| sfx-slow | Slow everybody down | A gentle sound slowing down and dropping in pitch, like a toy winding down. | 1.5 | whoosh | ◻️ |
| sfx-bottle-drop | An item drops into the bottle | A small object dropping into a glass bottle, one soft clink. | 0.6 | pop | ◻️ |
| sfx-cork | The cork goes in | A cork pushed into a glass bottle, a soft squeak and a pop. | 0.6 | pop | ◻️ |
| sfx-bottle-send | The bottle flies off | A soft rising whoosh with a tiny sparkle at the end. | 1 | whoosh | ◻️ |
| sfx-bottle-arrive | A bottle arrives on the display | A gentle splash of water, then a soft two-note chime. | 1.2 | sparkle | ◻️ |
| sfx-gift | A power is given | A soft magical sparkle travelling from left to right. | 1 | sparkle | ◻️ |
| sfx-timer-ring | A real-for-a-minute ring starts or ends | One soft, low bell ring. | 1.2 | sparkle | ◻️ |

### 11.1 Pictures (ChatGPT; make them alongside the build)

Illustrated cards look crafted and read more clearly than emoji, which only stand in.

**Pictures go on everything a child chooses from or watches. Code stays wherever things move, fill up or change colour:**
- the parts kit and the bases, which must be recolourable;
- the bottle filling up on the iPad;
- every effect and animation;
- the sentence strip.

**How to make them.** Use the two ChatGPT projects from §2 of the asset guide.
- **Make `pow-slow-everybody` first,** in the stickers project, and refine it until you love it. It's the style anchor: attach it to every later v3 chat and say *"Same style as the attached image."*
- **Cards marked 👤 show figures.** Start those messages with:
  ```
  This card may show people, but only like this: simple round bean-shaped figures in soft grey-lilac with two dot eyes and rounded mitten hands. No skin colour, hair, gender cues or clothing details. A grown-up at school is a taller bean figure wearing a lanyard. Arrows, motion lines, speech bubbles, question marks and stars are fine. Still no writing, letters or numbers.
  ```
- **One image per message.** Ask for a white background, then remove it (asset guide §3.3). Check every picture against §6.
- **Three are copies, not new pictures:** `who-teacher` is `disp-teacher`, `mode-handshake` is `how-handshake`, and `mode-device` is the existing `stk-aac-talker`. Copy the file under the second name.
- **To bring them in,** put downloads in `assets/incoming/` and tell Claude Code **"Bring in the new assets."**

**Power cards ⭐** go in `assets/img/powers/` and use the stickers project. Make the five from your notes first: slow everybody down, control teachers, control all displays, control devices and speak for your friends.

| id | label | fallback | 👤 | picture |
|---|---|---|---|---|
| pow-slow-everybody | Slow everybody down | 🐢 | | A big friendly tortoise carrying a round clock on its shell, with soft wavy slow-motion lines behind it. |
| pow-pause | Pause the world | ⏸️ | | A big round pause button with two bars, with tiny ice crystals frozen round its edge. |
| pow-hold-turn | Hold my turn | 🎟️ | | A glowing golden ticket with a star in the middle, like a token that saves your turn. |
| pow-warn-me | Warn me first | 🔔 | | A friendly bell ringing, with three dots in an arc beside it lighting up one after another. |
| pow-say-again | Say it again | 🔁 | | A speech bubble with a curved replay arrow looping round it. |
| pow-turn-down | Turn the room down | 🔉 | | A big volume knob turned down low, with sound waves getting smaller and softer. |
| pow-dim-lights | Dim the lights | 🌙 | | A light bulb glowing softly beside a slider switch pushed halfway down. |
| pow-quiet-bubble | Quiet bubble | 🫧 | 👤 | A bean figure sitting calmly inside a big shiny bubble, with jagged sound waves bouncing off the outside. |
| pow-translator | Translator | 🔄 | | A small machine with two windows: a picture of a house goes in one side and comes out of the other as a speech bubble with a house in it, with arrows going both ways. |
| pow-my-way | Everyone talks my way | 🌀 | 👤 | A row of bean figures all copying the same big wave as a leader bean figure in front. |
| pow-get-me | Get-what-I-mean ray | 💡 | | A ray gun shooting a beam of light into a speech bubble, which lights up with a light bulb inside. |
| pow-control-teachers | Control teachers | 🎮 | 👤 | A chunky game controller; above it, a taller bean figure with a lanyard happily follows a big curved arrow, mid-step. |
| pow-question-swap | Question swap | 🔀 | 👤 | A small bean figure and a taller bean figure with a lanyard; two speech bubbles with question marks swap places between them along curved arrows. |
| pow-pass | Pass | 🛑 | 👤 | A calm bean figure holding up a green card, with a curved arrow jumping over a dot above it. |
| pow-invisible | Invisibility cloak | 👻 | | A flowing cloak whose lower half fades into sparkles and becomes see-through. |
| pow-control-displays | Control all displays | 📺 | | A remote control pointing at a big wall screen that glows with bright swirls of colour. |
| pow-control-devices | Control devices | 🎛️ | | A remote control in the middle, with a lamp, a speaker and a whiteboard around it, each joined to it by a little spark. |
| pow-see-points | See my points | ⭐ | | A big gold star with one open eye in its middle. |
| pow-change-rule | Change a rule | 📜 | | A paper scroll unrolling, with a pencil drawing new simple shapes on it. |
| pow-speak-for-friends | Speak for your friends | 💬 | 👤 | Two bean figures side by side holding mitten hands; one has a big speech bubble with a small heart in it. |
| pow-call-ally | Call an ally | 📣 | 👤 | A megaphone sending out soft signal waves, and a second bean figure running in to help. |
| pow-team-up | Team up | 🤝 | 👤 | Two bean figures doing a high five, with sparkles. |

**Doors ⭐** go in `assets/img/doors/` and use the stickers project. Make `fam-time` first, then attach it and say *"Same door, but …"* for the rest.

| id | label | fallback | 👤 | picture |
|---|---|---|---|---|
| fam-time | Time | ⏳ | | A tall, rounded, deep-blue wooden door, slightly open with warm light inside, with a glowing hourglass on it. |
| fam-senses | Sound and light | 🔊 | | The same door in orange, with a glowing light bulb and a sound wave on it. |
| fam-language | Words | 🗣️ | | The same door in green, with a glowing speech bubble on it. |
| fam-floor | Turns | ✋ | | The same door in purple, with two glowing curved arrows chasing each other in a circle. |
| fam-screens | Screens | 📺 | | The same door in teal, with a glowing screen on it. |
| fam-together | Together | 🤝 | | The same door in pink, with two glowing linked rings on it. |

**Display ⭐** goes in `assets/img/display/`. `disp-shore` uses the scenes project; the other three use the stickers project.

| id | label | fallback | 👤 | picture |
|---|---|---|---|---|
| disp-shore | Shore | 🏖️ | | Ignore "square". A calm seaside seen from the beach at golden hour: smooth sand across the bottom third, small gentle waves, and a wide soft sky with a low sun and a few clouds. Lots of empty space and nothing on the sand. Wide landscape; it will be cropped to 16:9, so keep everything important in the middle band. |
| disp-board | Board | 📌 | | A wide wooden noticeboard on two short posts, with an empty cork surface, front view. |
| disp-bottle | Bottle | 🍾 | | A sea-green glass bottle standing upright, with a cork and a rolled-up paper scroll inside. |
| disp-teacher | Teacher figure | 🧑‍🏫 | 👤 | A taller bean figure wearing a lanyard, standing, front view, arms relaxed. |

**Choice cards ◻️** go in `assets/img/cards/` and use the stickers project. The emoji are fine until these arrive.

| id | label | fallback | 👤 | picture |
|---|---|---|---|---|
| likeme-like | Like me | 🪞 | 👤 | A bean figure looking into a mirror and seeing exactly the same bean figure. |
| likeme-bit | A bit like me | 🌗 | 👤 | A bean figure looking into a mirror; the reflection is the same shape, but one half is a different colour. |
| likeme-else | Someone else | 🎭 | | A colourful masquerade mask on a stick. |
| mode-talk | Talking | 🗣️ | | A speech bubble with sound waves coming from it. |
| mode-hands | Hands | ✋ | 👤 | Two grey-lilac mitten hands moving, with motion lines, as if signing. |
| mode-handshake | Secret handshake | 🤝 | | Copy of `how-handshake`. |
| mode-draw | Drawing | ✏️ | | A pencil drawing a sun on a sheet of paper. |
| mode-act | Acting it out | 🎭 | 👤 | A bean figure in a big dramatic pose on a small stage under a spotlight. |
| mode-pictures | Pictures | 🖼️ | | Four picture cards in a grid, showing a cup, a ball, a house and a star. |
| mode-write | Writing | 📝 | | A pencil writing wavy lines, not letters, on lined paper. |
| mode-device | A device | 📱 | | Copy of `stk-aac-talker`. |
| mode-hand-up | Hand up | 🙋 | 👤 | A bean figure with one mitten hand raised high. |
| mode-quiet | Being quiet | 🤫 | 👤 | A calm bean figure holding a mitten hand where its mouth would be, with a small crossed-out sound wave beside it. |
| who-me | Me | 🙋 | 👤 | One bean figure pointing at itself with a mitten hand, with a small star above it. |
| who-friend | A friend | 👫 | 👤 | Two bean figures side by side with linked arms. |
| who-teacher | My teacher | 🧑‍🏫 | 👤 | Copy of `disp-teacher`. |
| who-class | My class | 🏫 | 👤 | A group of small bean figures sitting round a table. |
| who-everyone | Everyone | 🌍 | 👤 | A big crowd of bean figures in rows, filling the picture. |
| who-room | The room | 💡 | | A small cut-away room like a doll's house: a ceiling light, a speaker on the wall, a window and a table, with no figures. |
| how-badge | My badge | 🏷️ | | A small rectangular electronic badge with a glowing blank screen, hanging from a lanyard clip. |
| how-handshake | My secret handshake | 🤝 | 👤 | Two grey-lilac mitten hands meeting in a handshake, with little rhythm dots around them. |
| how-hand-sign | A hand sign | ✋ | 👤 | One grey-lilac mitten hand making a sign, with small motion lines. |
| how-word | A secret word | 🗣️ | | A speech bubble with a small golden key inside it. |
| how-drawing | A drawing | ✏️ | | A pencil drawing a simple swirl on a sheet of paper. |
| how-button | A button | 🔘 | | A big round push button, glowing. |

**For Claude Code, at P0:**
- Add these four tables to `asset-guide.md` after §3.5, as §3.6 Power cards, §3.7 Doors, §3.8 Display and §3.9 Choice cards, together with the 👤 add-on and the note about copies.
- In `sync-assets.py`, read them into new manifest groups: `powers`, `doors`, `display` and `cards`.
- In `bring-in-assets.py`, every new picture is the sticker kind (PNG, longest side 512, transparency kept), except:
  - `disp-shore`, a new **wide** kind: JPEG, quality 80, longest side 1920, centre-cropped to 16:9;
  - `disp-board`, a sticker with a longest side of 1024.
- Draw every v3 card with `Assets.card(id)`, so its emoji shows until the picture exists. Asset check lists the new groups.

---

## 12. Look and feel (additions)

- **Everything in v2 §9 still applies:** text at least 22 px, picture cards at least 120×120 px, the system font, and Full / Calm / Off motion.
- **The sentence strip** is four boxes in a row. Each shows its slot's icon until it's filled.
- **The bottle on the iPad** is drawn in SVG, because its bands fill up from the bottom as items go in. The display's bottle is the picture `disp-bottle`.
- **Every v3 card shows its picture** when the file exists, and its emoji until then (`Assets.card`).
- **The display** is high contrast, with large shapes that can be read from the back of a room.
- **Check every new screen at 1180×734 and at 744 px wide,** in both orientations.

---

## 13. Changes to CLAUDE.md (P0)

1. **"Read this first":** put this file at the top of the table.

   | File | What it is | Wins when they disagree |
   |---|---|---|
   | `agent-lab-v3-spec.md` | v3: powers and the bottle (session 3 on) | **beats both specs** |
   | `agent-lab-v2-spec.md` | the v2 changes | beats the build spec |
   | `agent-lab-build-spec.md` | the original v1 brief | lowest |
   | `asset-guide.md` | every image, voice line and sound | **beats all three, for assets** |
   | `DATA.md` | every saved field and logged event | must always match the code |

2. **Non-negotiables:** replace the first two bullets with these.
   - *All data stays on the iPad in IndexedDB, with one exception (v3 §9). When a child sends a bottle, that bottle and nothing else goes to the relay on Filip's laptop over the room's private network. Never the event log, the agent record, its id, or other agents. The relay and the display keep nothing on disk. No accounts, no cloud, no analytics.*
   - *No camera access, ever. The microphone records only when a child taps 🎤.*

   Then add to the CSP bullet: *`connect-src` may list `https://*.local:8443` and `https://localhost:8443` (the relay) and nothing else.*
3. **Do not add:** also add feeling screens or feeling words (the dunes app owns feelings); counts, totals or rankings anywhere, including the display; and any network destination except the relay.
4. **Files:** add `display/index.html` (plus any `display/*.js` and `display/*.css`), `display/relay.py`, `display/certs/` (gitignored), `tools/analyse.py` (P9) and `DATA.md`.
5. **Progress:** start a "v3 (agent-lab-v3-spec.md)" section with P0. Mark v2's V6–V9 as replaced by v3.
6. **Keep every convention.** Where one names a retired screen, leave it in, because the lesson still applies.

---

## 14. Milestones

Build one at a time and stop after each. "Done when" is the test.

**P0: Clear the ground.**
- Check that the tag `session-2` exists on GitHub (`git ls-remote --tags origin`). If it doesn't, stop and ask Filip.
- Update CLAUDE.md (§13), update the asset guide and sync it (§11), and write `DATA.md` covering every existing field and event.
- Retire the v2 screens (§3). `MISSIONS` becomes the five v3 missions, with the session-3 preset (Safe place off).
- Add the v3 data model and extend `migrateAgent()` (§10). Exports carry `schemaVersion: 3`.
- Make gallery tiles show the agent (§4).
- Import:
  - takes several files at once (`multiple`);
  - **skips an agent that is already on this iPad unchanged** (same id and the same content, for example the same number of events and the same last event time);
  - still adds a changed copy as a new agent, as it does now;
  - reports how many it added, skipped and copied.
- Each v3 mission shows a "coming soon" placeholder with Stamp it and Pass.

*Done when:*
- an imported session-2 export shows every agent as a picture;
- importing all six iPads' files onto one iPad gives one tile per agent, and importing them again adds nothing;
- an old agent opens on the v3 strip with Make stamped, and its v2 fields are unchanged in a fresh export;
- `make_audio.py list --session 3` is right;
- Asset check lists the new picture groups (⚠️ until the files arrive);
- and `DATA.md` exists.

**P1: Link test.** Build:
- `relay.py`;
- a bare display that shows each arrival as its codename with a chime;
- the adult panel's Display link;
- the CSP change;
- the README setup (§9.2–9.4).

*Done when* a real iPad, running the **home-screen app from GitHub Pages** and joined to the pocket router:
- shows ✅ on Test;
- sends a test bottle that appears on the laptop's display within a second;
- still opens the app from the home screen when the router has no internet;
- shows ⚠️ when the relay is stopped, with nothing else changing.

**If this can't be made to work, stop and tell Filip.** The display can still run on D (demo) alone.

**P2: Quick agent** (§4). *Done when:*
- a new child gets from New agent to a stamped agent, with its "like me?" answer, in under 3 minutes;
- the 8 bases look clearly different on the parts sheet;
- an old agent is asked "like me?" once.

**P3: How my agent talks** (§5). *Done when:*
- both steps record their choices in order;
- tapping a card makes the agent act it out;
- a handshake records, plays back and can be redone.

**P4: Safe place** (§6). *Done when:*
- both answers save to `safe`, not `hq`;
- Nowhere and Draw my own both work;
- the mission is off in the session-3 preset and can be switched on.

**P5: Powers** (§7). *Done when:*
- the doors can't appear before the child has drawn, recorded or tapped Need ideas;
- `inventedFirst` is right in both cases;
- the five ★ powers play their effects;
- a sentence saves with its skipped slots listed;
- the read-back plays the cards' own lines;
- three powers is the limit.

**P6: The bottle** (§8). *Done when:*
- 4 items fit and a fifth doesn't;
- every addressee works;
- a mystery voice can't be sent in "normal";
- with the link off, a sent bottle is `waiting` and goes when the link returns;
- both the swipe and the press-and-hold send;
- the payload, as logged on the relay, has no agent id, and has no contents when it's for a friend or a teacher.

**P7: The display** (§9.5). *Done when:*
- ten bottles sent in a row play one at a time;
- the ★ effects work;
- friend and teacher bottles go to the post shelf unopened;
- every facilitator key works, including D with the relay stopped;
- "real for a minute" shows the ring only for powers that are switched on;
- no number appears anywhere.

**P8: Rehearsal.** A full run on two iPads and the display, set up as it will be in the room. Fix any blockers. Bump every version number, following CLAUDE.md's release rules.

*Done when:*
- a new agent's whole flow takes 9 minutes or less, and a gallery agent's takes 6 or less;
- a bottle sent from each iPad arrives;
- turning the router off halfway changes nothing for the child.

**P9: Analysis script (after the session).** `tools/analyse.py` uses the Python standard library only and runs on Filip's laptop. It reads every iPad's JSON export, merges them (one row per agent id, keeping the copy with the most events), and writes to a folder outside the repo:
- `agents.csv`, `powers.csv` (one row per power, with every slot), `bottles.csv` and `events.csv`;
- a `drawings/` folder of PNGs named by `agent_ref`, the first 8 characters of the agent id;
- one page per agent, `cards/<agent_ref>.html`, showing its picture, its powers as sentence strips and its bottles. This is for preparing next session's questions.

Rows never contain names. The CSV columns go into `DATA.md`. The output folder is listed in `.gitignore`, and nothing in it is ever committed.

*Done when:* the CSVs open in Excel with one row per thing and every column is in `DATA.md`; the agent cards open in a browser; and running it twice on the same files gives the same output.

**If time is short, cut in this order:**
1. §7.4 (from last time);
2. "real for a minute";
3. the non-★ effects (icon pops instead);
4. the handshake.

Safe place is already off.

**Never cut:** invent first, the sentence slots, the addressee and sign choices, the queue, or D on the display.

**Later (session 4): Look back.** Opens each agent's own powers and bottle with one picture question at a time, so next session's pointed questions can be asked on the iPad. Not part of v3; spec it after P9's analysis.

---

## 15. Testing (every milestone)

- **Everything in v2 §11 still applies:** finger only, both orientations, with and without assets, close and reopen, Airplane mode.
- **From P1:** test once with the relay on and once with it off.
- **An imported session-2 agent** goes through every v3 mission, and its v2 data is unchanged in the export.
- **The event log** shows the new actions in order, each with `session`, and `DATA.md` lists them all.
- **Sizes:** 1180×734 and 744 px wide.
- **The display:** the queue, the keys, D with no network, and Calm and Off.

---

## 16. The session protocol (for Filip; not code)

Light by design: the session is short and there's little time to talk. The app collects during the session, the analysis happens at home, and the meaning-making happens next session with pointed questions.

**Before the session (a short staff chat):**
- Agree the safeguarding route for anything a bottle shows (H hides it on the display).
- Agree how "control teachers" is framed: as research about power and pace.
- Optionally, agree which powers can be "real for a minute" and what the adults will do. If not, leave them all off.
- Plan the one honest line about mystery bottles: the big screen won't say who, but the iPad remembers.
- Set Session 3, check that practice mode is off, and get a ✅ from Test on every iPad.

**During the session:**
- Children work through the flow. No one needs to explain anything.
- If a second adult is free, they jot a few lines at the display: time, codename (or "mystery"), what happened. If no one is free, skip it; the app log is the record.

**After the session (at home):**
1. Export every iPad, copy the files to KCL storage, and fill in the paper codename register (see the README).
2. Tag the version: `git tag session-3 && git push origin session-3`.
3. Run `tools/analyse.py`. For each child, pick their most telling power or bottle and write **two or three pointed questions**.
4. If staff are willing, take one or two power claims to them and agree one small real change.

**Next session:** open each child's agent (its powers are on the Powers screen) and ask the questions. Then tell the children what changed, if anything. Their answers and the staff's response are data too (Lundy, 2018).

**What pointed questions look like.** They're concrete, they're about the agent, there's one idea per question, and they offer picture choices before an open "why":
- *"Your agent slows everybody down when it's too loud. Who should slow down most?"* (show the who cards)
- *"You sent your bottle to everyone. Did you want everyone to see it?"* 👍 / 👎 / 🤷
- *"You sent a mystery. Was that so nobody knew, or for fun?"*
- *"School wants your agent to put its hand up. Your agent likes drawing. What would help?"*
- *"Should we try 'slow everybody down' for real in class?"* 👍 / 👎

**Reporting:** with 8–10 children in one school, describe cases and patterns, not percentages. Code invented powers inductively first, then read them through the six families.

---

## 17. Do not add (updated)

Everything in v2 §12 still applies, plus:
- feeling screens or feeling words;
- counts, totals, rankings or "most popular", anywhere, including the display;
- any network destination except the relay, and nothing sent except a bottle the child chose to send;
- reactions to what a child drew, said or chose;
- any promise of total secrecy.

---

### References

The DOIs for Spiel et al. (2019) and Lundy (2018) were checked; the other references were not re-checked.

- Allen, A. (1998). Rethinking power. *Hypatia*, 13(1), 21–40.
- Crompton, C. J., Ropar, D., Evans-Williams, C. V., Flynn, E. G., & Fletcher-Watson, S. (2020). Autistic peer-to-peer information transfer is highly effective. *Autism*, 24(7), 1704–1712.
- Foucault, M. (1982). The subject and power. *Critical Inquiry*, 8(4), 777–795.
- Goffman, E. (1979). Footing. *Semiotica*, 25(1–2), 1–29.
- Lundy, L. (2007). 'Voice' is not enough: Conceptualising Article 12 of the United Nations Convention on the Rights of the Child. *British Educational Research Journal*, 33(6), 927–942.
- Lundy, L. (2018). In defence of tokenism? Implementing children's right to participate in collective decision-making. *Childhood*, 25(3), 340–354. https://doi.org/10.1177/0907568218777292
- Milton, D. (2012). On the ontological status of autism: The 'double empathy problem'. *Disability & Society*, 27(6), 883–887.
- Spiel, K., Frauenberger, C., Keyes, O., & Fitzpatrick, G. (2019). Agency of autistic children in technology research — A critical literature review. *ACM Transactions on Computer-Human Interaction*, 26(6), 1–40. https://doi.org/10.1145/3344919
- Power-over and power-with (Mary Parker Follett): see *Feminist Perspectives on Power*, Stanford Encyclopedia of Philosophy.
