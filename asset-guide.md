# Agent Lab — Asset Guide

What to make in ChatGPT and ElevenLabs, how to make it, and what to call each file.

**This file is the source of truth for assets.** Claude Code builds `assets/manifest.json` from the tables below. If you change a filename, a prompt or a narrator line, change it here, then tell Claude Code **"Sync the asset list."**

---

## 0. The plan

- **Two tracks at once.** Claude Code builds with stand-ins: emoji, code-drawn graphics and the iPad's own voice. You make the files, and they slot in as they arrive. Nobody waits for anybody.
- **Your checklist is on the iPad.** Adult panel → Asset check shows ✅ for every file that's in and ⚠️ for every stand-in.
- **Priorities:**
  - ⭐ before session 2
  - ◻️ before session 3 or 4
  - 🔁 every week

| Who | Makes |
|---|---|
| You, in ChatGPT | 12 HQ places ⭐, 10 situation cards ⭐, 13 special stickers ⭐, reference sheets (optional), app icon (optional) |
| You, in ElevenLabs | 115 narrator lines (65 ⭐) and 21 sound effects (19 ⭐) |
| Claude Code, in code | the parts kit (eyes, mouths, hair, bodies…), power effects, force fields, badge and wall frames, all animation |
| Nobody, ever | anything containing a child's name, drawing or voice |

**Rough time:**
- images: an afternoon;
- narration: 15 minutes with the script (§4.4) or about 2 hours by hand;
- sound effects: about 45 minutes.

---

## 1. Rules for every file

- **Name it exactly as in the tables:** lower case, with hyphens. The extension doesn't matter (`.png`, `.jpg`, `.webp`, `.mp3`), because Claude Code converts files.
- **Put downloads in `assets/incoming/`,** then tell Claude Code **"Bring in the new assets."** It resizes, compresses, renames and moves each file into place, then tells you what's still missing.
- **Never put children's work into ChatGPT or ElevenLabs:** no names, drawings or voices. ElevenLabs is for over-18s only, and a child's voice is personal data. Typed requests (§7) are words you review first.
- **Keep API keys out of the repo.** If you use the scripts, the keys live in a `.env` file. `tools/make_audio.py setup` adds `.env` to `.gitignore` for you.
- **Judge every image on the iPad at small size** before you keep it.

---

## 2. ChatGPT: set up once (10 minutes)

1. **Make two ChatGPT Projects:** "Agent Lab scenes" and "Agent Lab stickers". Paste the matching style block below into each project's instructions. Every chat in a project then starts with it.
2. **Make a style anchor first.** In the scenes project, generate `hq-classroom` and ask for changes until you love it. Download it. In every later scenes chat, attach it and say: *"Same style as the attached image."*
3. **Ask for one image per message,** square. Ask for changes in plain words: "less busy", "darker", "remove the writing on the board".
4. **Download and rename** each image with its id from the tables.

**Scenes style** (instructions for "Agent Lab scenes"):

```
Flat 2D vector illustration for a children's spy game, ages 7–14.
Bold simple shapes, clean edges, rounded corners, soft flat shading. No textures, no photorealism, no 3D.
Calm, friendly and uncluttered. Medium-dark, slightly muted colours, so a bright character drawn by a child stands out in front.
Eye-level, wide view. Keep the lower middle of the picture clear (open floor), because a character will be added there.
No people, faces or hands. No text, letters, numbers, logos, flags or signs with writing: boards, screens and book spines are blank.
Real places should look like a UK school or home, not an American one.
Square, 1:1.
```

**Add this to the message for situation cards (§3.2):**

```
Other characters, where the scene needs them, are simple round bean-shaped figures in soft grey-lilac with two dot eyes: no skin colour, hair, gender cues or clothing details. Leave the centre foreground empty for the main character. Question marks and simple symbols are fine.
```

**Sticker style** (instructions for "Agent Lab stickers"):

```
One single object as a sticker for a children's app, ages 7–14.
Flat 2D vector, thick rounded dark-navy outline, bright friendly colours, simple shapes.
Centred, filling about 80% of the square. Plain flat pure-white background.
No shadow, no text, no people.
Square, 1:1.
```

---

## 3. Images

### 3.1 HQ places ⭐ — `assets/img/hq/`

Paste the scene description as your prompt; the scenes project adds the style.

| id | label | kind | fallback | scene |
|---|---|---|---|---|
| hq-classroom | Classroom | real | 🏫 | A UK primary school classroom: group tables with chairs, a blank whiteboard, coat pegs, a display board with blank coloured paper, plants on the windowsill, big windows with daylight. |
| hq-playground | Playground | real | 🛝 | A UK school playground: a climbing frame, painted hopscotch shapes without numbers, benches, a low fence and trees, a sunny day. |
| hq-library | Library | real | 📚 | A school library corner: low bookshelves with colourful blank book spines, beanbags, a rug and a reading lamp. |
| hq-quiet-room | Quiet room | real | 🛋️ | A calm sensory room: soft mats, beanbags, a small tent, fairy lights, soft blue and purple light. |
| hq-lunch-hall | Lunch hall | real | 🍽️ | An empty, tidy school lunch hall: long tables, stacked trays, a serving counter; calm and quiet. |
| hq-home | Home | real | 🏠 | A cosy room at home: a sofa with blankets, a rug, a shelf with toys and plants, warm lamp light. |
| hq-space | Space | fantasy | 🪐 | Outer space: a small rocky moon surface as the floor, planets and stars in the sky, a distant spaceship. |
| hq-underwater | Under the sea | fantasy | 🐠 | Under the sea: a sandy floor, coral, seaweed, bubbles, light rays from above. |
| hq-jungle | Jungle | fantasy | 🌴 | A jungle clearing: mossy ground, giant leaves, hanging vines, a waterfall far behind. |
| hq-city-rooftop | City rooftop | fantasy | 🌃 | A city rooftop at night: a flat roof as the floor, a water tower, a skyline with lit windows, the moon. |
| hq-sky-castle | Sky castle | fantasy | 🏰 | A castle on a floating island above the clouds: a stone courtyard floor, towers with plain pennants, clouds below. |
| hq-secret-lab | Secret lab | fantasy | 🧪 | A secret spy base: a round vault door, consoles with glowing buttons, radar screens and a wall map made of abstract shapes, all without writing. |

### 3.2 Situation cards ⭐ — `assets/img/situations/`

These are used twice: "When does your agent use its power?" (session 2) and mood codes (session 3). Add the situation-card block to each message.

| id | label | fallback | scene |
|---|---|---|---|
| sit-too-loud | Too loud | 🔊 | A school lunch hall full of bean figures, with big jagged sound-wave shapes bursting from every side and clattering trays. |
| sit-not-understood | Nobody gets what I mean | ❓ | Two bean figures looking puzzled at an empty space in the centre; floating speech bubbles filled with scribbles and question marks. |
| sit-waiting | Waiting | ⏳ | A long school corridor with a queue of bean figures, a big wall clock and an hourglass; a gap in the queue in the centre foreground. |
| sit-did-well | I did it! | 🏆 | A gold trophy, stars and confetti bursting around an empty spotlight circle in the centre; bean figures clapping at the sides. |
| sit-asked-answer | Asked to answer | ✋ | A classroom seen from the side: bean figures at desks all turning to look at an empty chair in the centre, lit by a spotlight; a blank whiteboard behind. |
| sit-unkind | Someone is unkind | 💢 | A playground corner: two bean figures at the edge with spiky dark speech bubbles pointing at an empty space in the centre; a small grey cloud above that space. |
| sit-plans-change | Plans change | 🔄 | A visual timetable of blank picture cards on a wall; one card flipping over and swapping with a big question-mark card; swirling arrows. |
| sit-new-place | Somewhere new | 🚪 | An open doorway glowing with light into an unfamiliar room with unknown shapes; footprints leading from the empty centre foreground to the door. |
| sit-playtime | Playtime | ⚽ | A sunny playground: bean figures playing tag and ball at the edges, a ball mid-bounce, open space in the centre. |
| sit-tricky-work | Tricky work | 🧠 | A school desk at the bottom of the picture with a worksheet of tangled scribble lines (no letters), a broken pencil, crumpled paper balls, and a small storm cloud of squiggles above. |

### 3.3 Special stickers ⭐ — `assets/img/stickers/`

These fill gaps in the emoji set. Use the stickers project.

**Removing the white background.** ChatGPT's transparent backgrounds are still hit-and-miss: sometimes it paints a fake checkerboard. So ask for white and remove it yourself:
- **Mac:** right-click the file in Finder → Quick Actions → Remove Background.
- **Windows 11:** open it in Paint → Remove background → save as PNG.
- **Or** ask Claude Code for T2 (spec §10), which makes stickers through the OpenAI API with real transparency.

| id | label | tab | fallback | keywords | new | object |
|---|---|---|---|---|---|---|
| stk-hearing-aid | Hearing aid | ears | 🦻 | hearing aid, hear, ear | | A behind-the-ear hearing aid in a bright colour. |
| stk-cochlear-implant | Cochlear implant | ears | 🦻 | cochlear, implant, hearing, ear | | A cochlear implant sound processor with its round coil, in a bright colour. |
| stk-ear-defenders | Ear defenders | ears | 🎧 | ear defenders, quiet, noise, headphones | | Chunky children's ear defenders in a bright colour. |
| stk-aac-talker | Talker | gadgets | 📱 | talker, aac, tablet, talk, communication | | A tablet communication aid with a carry handle, showing a grid of coloured symbol squares made of simple shapes, no words. |
| stk-fidget-spinner | Spinner | fidgets | 🌀 | spinner, fidget, spin | | A three-armed fidget spinner. |
| stk-pop-it | Pop-it | fidgets | 🫧 | pop it, fidget, bubbles, rainbow | | A rainbow pop-it fidget toy. |
| stk-tangle | Tangle | fidgets | 🪢 | tangle, fidget, twist | | A twisty tangle fidget toy in bright segments. |
| stk-cape | Cape | clothes | 🧣 | cape, hero, cloak | | A flowing superhero cape. |
| stk-eye-mask | Hero mask | clothes | 🎭 | mask, hero, eye mask, disguise | | A superhero eye mask. |
| stk-utility-belt | Gadget belt | clothes | 🧰 | belt, gadget, utility | | A utility belt with small pouches and a buckle. |
| stk-walkie-talkie | Walkie-talkie | gadgets | 📻 | walkie talkie, radio, spy | | A chunky walkie-talkie. |
| stk-jetpack | Jetpack | gadgets | 🚀 | jetpack, fly, rocket | | A small jetpack with flames. |
| stk-spy-watch | Spy watch | gadgets | ⌚ | watch, spy, gadget | | A spy gadget wristwatch with a glowing blank screen. |

**Leave out disability-identity symbols,** such as the sunflower lanyard, unless children ask for them. Offering them nudges children towards disclosure, which is exactly what the badge & poster mission studies. Assistive objects like hearing aids are different: they let children show themselves as they are, if they want to.

### 3.4 Reference sheets (optional; never shipped) — `assets/reference/`

These help Claude Code draw the parts kit, especially hair. Use the scenes project, but start the message with: *"Ignore the composition rules: plain light background, labels are fine."*

| id | sheet |
|---|---|
| ref-hair | A 4×4 sheet of 16 cartoon hairstyles on plain oval heads, front view: short crop, buzz cut, short curls, afro, afro puffs, cornrows, box braids, locs, twists, top bun, ponytail, long straight, bob, wavy, spiky, mohawk. |
| ref-headwear | Hijab, turban (dastar), headscarf, beanie, cap, hood and headband, each on a plain oval head, front view. |
| ref-faces | Ten cartoon eye styles and ten cartoon mouth styles, in two rows. |
| ref-bodies | Eight cartoon body shapes, front view: three human shapes, a hoodie, a super suit, a robot, a blob, a furry monster. |

### 3.5 App icon (optional) — `assets/img/ui/`

| id | description |
|---|---|
| ui-app-icon | An app icon: a stylised spy hat and magnifying glass on deep navy, with yellow accents, centred, no text. Solid background, no transparency. |

---

### v3 pictures: read this before 3.6–3.9

Added for session 3 (`agent-lab-v3-spec.md` §11.1). Every card a child chooses
from or watches gets a picture; the app shows each one's emoji until the file
arrives, so nothing waits for them.

- **Make `pow-slow-everybody` first,** in the stickers project, and refine it
  until you love it. It is the style anchor: attach it to every later v3 chat
  and say *"Same style as the attached image."*
- **One image per message.** Ask for a white background, then remove it (§3.3).
  Check every picture against §6.
- **Cards marked 👤 show figures.** Start those messages with:

```
This card may show people, but only like this: simple round bean-shaped figures in soft grey-lilac with two dot eyes and rounded mitten hands. No skin colour, hair, gender cues or clothing details. A grown-up at school is a taller bean figure wearing a lanyard. Arrows, motion lines, speech bubbles, question marks and stars are fine. Still no writing, letters or numbers.
```

- **Some are copies, not new pictures:** `who-teacher` is a copy of
  `disp-teacher`, `mode-handshake` is a copy of `how-handshake`, and
  `mode-device` is a copy of the existing `stk-aac-talker`. Copy the file under the second name. (The five school cards that were
  copies went with "School wants us to…" in v87.)
- **To bring them in,** put the downloads in `assets/incoming/` and say
  **"Bring in the new assets."** Every v3 picture is the sticker kind (PNG,
  longest side 512, transparency kept), except `disp-shore` — the wide kind,
  JPEG, longest side 1920, centre-cropped to 16:9 — and `disp-board`, a sticker
  with a longest side of 1024.

### 3.6 Power cards ⭐ — `assets/img/powers/`

From v90 each door offers three powers. **Hold my turn, Warn me first,
Question swap and See my points are no longer offered**; their pictures and
lines stay, for older data and the display.

Stickers project. Make the five from Filip's notes first: slow everybody down,
control teachers, control all displays, control devices and speak for your
friends.

| id | label | fallback | 👤 | picture |
|---|---|---|---|---|
| pow-slow-everybody | Slow everybody down | 🐢 | | A big friendly tortoise carrying a round clock on its shell, with soft wavy slow-motion lines behind it. |
| pow-pause | Pause my school | ⏸️ | | A big round pause button with two bars, with tiny ice crystals frozen round its edge. |
| pow-hold-turn | Hold my turn | 🎟️ | | A glowing golden ticket with a star in the middle, like a token that saves your turn. |
| pow-warn-me | Warn me first | 🔔 | | A friendly bell ringing, with three dots in an arc beside it lighting up one after another. |
| pow-say-again | Say it again | 🔁 | | A speech bubble with a curved replay arrow looping round it. |
| pow-turn-down | Turn the classroom down | 🔉 | | A big volume knob turned down low, with sound waves getting smaller and softer. |
| pow-dim-lights | Dim the classroom lights | 🌙 | | A light bulb glowing softly beside a slider switch pushed halfway down. |
| pow-quiet-bubble | Quiet bubble | 🫧 | 👤 | A bean figure sitting calmly inside a big shiny bubble, with jagged sound waves bouncing off the outside. |
| pow-translator | Translator | 🔄 | | A small machine with two windows: a picture of a house goes in one side and comes out of the other as a speech bubble with a house in it, with arrows going both ways. |
| pow-my-way | Everyone talks my way | 🌀 | 👤 | A row of bean figures all copying the same big wave as a leader bean figure in front. |
| pow-get-me | Get-what-I-mean ray | 💡 | | A ray gun shooting a beam of light into a speech bubble, which lights up with a light bulb inside. |
| pow-control-teachers | Control teachers | 🎮 | 👤 | A chunky game controller; above it, a taller bean figure with a lanyard happily follows a big curved arrow, mid-step. |
| pow-question-swap | Question swap | 🔀 | 👤 | A small bean figure and a taller bean figure with a lanyard; two speech bubbles with question marks swap places between them along curved arrows. |
| pow-pass | Pass | 🛑 | 👤 | A calm bean figure holding up a green card, with a curved arrow jumping over a dot above it. |
| pow-invisible | Invisibility cloak | 👻 | | A flowing cloak whose lower half fades into sparkles and becomes see-through. |
| pow-control-displays | Control all school displays | 📺 | | A remote control pointing at a big wall screen that glows with bright swirls of colour. |
| pow-control-devices | Control school devices | 🎛️ | | A remote control in the middle, with a lamp, a speaker and a whiteboard around it, each joined to it by a little spark. |
| pow-see-points | See my points | ⭐ | | A big gold star with one open eye in its middle. |
| pow-change-rule | Change a school rule | 📜 | | A paper scroll unrolling, with a pencil drawing new simple shapes on it. |
| pow-speak-for-friends | Speak for your friends | 💬 | 👤 | Two bean figures side by side holding mitten hands; one has a big speech bubble with a small heart in it. |
| pow-call-ally | Call an ally | 📣 | 👤 | A megaphone sending out soft signal waves, and a second bean figure running in to help. |
| pow-team-up | Team up | 🤝 | 👤 | Two bean figures doing a high five, with sparkles. |

### 3.7 Doors ⭐ — `assets/img/doors/`

Stickers project. Make `fam-time` first, then attach it and say *"Same door,
but …"* for the rest.

| id | label | fallback | 👤 | picture |
|---|---|---|---|---|
| fam-time | Time | ⏳ | | A tall, rounded, deep-blue wooden door, slightly open with warm light inside, with a glowing hourglass on it. |
| fam-senses | Sound and light | 🔊 | | The same door in orange, with a glowing light bulb and a sound wave on it. |
| fam-language | Words | 🗣️ | | The same door in green, with a glowing speech bubble on it. |
| fam-floor | Turns | ✋ | | The same door in purple, with two glowing curved arrows chasing each other in a circle. |
| fam-screens | Screens | 📺 | | The same door in teal, with a glowing screen on it. |
| fam-together | Together | 🤝 | | The same door in pink, with two glowing linked rings on it. |

### 3.8 Display ⭐ — `assets/img/display/`

`disp-shore` uses the scenes project; the other three use the stickers project.

| id | label | fallback | 👤 | picture |
|---|---|---|---|---|
| disp-shore | Shore | 🏖️ | | Ignore "square". A calm seaside seen from the beach at golden hour: smooth sand across the bottom third, small gentle waves, and a wide soft sky with a low sun and a few clouds. Lots of empty space and nothing on the sand. Wide landscape; it will be cropped to 16:9, so keep everything important in the middle band. |
| disp-board | Board | 📌 | | A wide wooden noticeboard on two short posts, with an empty cork surface, front view. |
| disp-bottle | Bottle | 🍾 | | A sea-green glass bottle standing upright, with a cork and a rolled-up paper scroll inside. |
| disp-teacher | Teacher figure | 🧑‍🏫 | 👤 | A taller bean figure wearing a lanyard, standing, front view, arms relaxed. |

### 3.9 Choice cards ◻️ — `assets/img/cards/`

Stickers project. The emoji are fine until these arrive.

| id | label | fallback | 👤 | picture |
|---|---|---|---|---|
| likeme-like | Like me | 🪞 | 👤 | A bean figure looking into a mirror and seeing exactly the same bean figure. |
| likeme-bit | A bit like me | 🌗 | 👤 | A bean figure looking into a mirror; the reflection is the same shape, but one half is a different colour. |
| likeme-else | Someone else | 🎭 | | A colourful masquerade mask on a stick. |
| mode-talk | Talking | 🗣️ | | A speech bubble with sound waves coming from it. |
| mode-hands | Signing | 🤟 | 👤 | One bean figure signing: both grey-lilac mitten hands up in front of its chest making a clear sign shape, small curved motion lines beside each hand. The hands do NOT touch each other and there is no second figure, so it cannot read as a high five or a clap. |
| mode-handshake | Secret handshake | 🤝 | | Copy of `how-handshake`. |
| mode-draw | Drawing | ✏️ | | A pencil drawing a sun on a sheet of paper. |
| mode-act | Acting it out | 🎭 | 👤 | A bean figure in a big dramatic pose on a small stage under a spotlight. |
| mode-pictures | Picture cards | 🎴 | 👤 | A bean figure holding up one picture card (a cup) and pointing at it with a mitten hand, with three more picture cards (a ball, a house, a star) fanned beside it. The cards have thick white borders, like communication picture cards. |
| mode-write | Writing | 📝 | | A pencil writing wavy lines, not letters, on lined paper. |
| mode-device | A device | 📱 | | Copy of `stk-aac-talker`. |
| dev-bell | The school bell | 🔔 | | A round red school bell on a wall bracket, ringing, with curved ring lines. |
| dev-alarm | The fire alarm | 🚨 | | A red wall fire-alarm box with a flashing light on top and short alarm lines round it. |
| dev-lights | The lights | 💡 | | A ceiling light hanging down, glowing, with soft rays. |
| dev-speakers | The speakers | 🔊 | | A box speaker on a wall bracket with sound waves coming out. |
| dev-board | The whiteboard | 📋 | | A classroom interactive whiteboard on a stand, its screen glowing blue. |
| dev-computers | The computers | 💻 | | An open laptop with a glowing screen next to a small desktop screen. |
| rule-hand-up | Put your hand up | 🙋 | 👤 | Copy of `mode-hand-up`. |
| rule-quiet | Be quiet | 🤫 | 👤 | Copy of `mode-quiet`. |
| rule-look | Look at who's talking | 👀 | 👤 | A small bean figure with big round eyes looking up at a taller bean figure with a lanyard who has a speech bubble, with dotted lines from the eyes to the speaker. |
| rule-quick | Answer quickly | ⚡ | 👤 | A bean figure with a speech bubble shooting out fast, with speed lines and a small stopwatch beside it. |
| rule-speak-up | Speak up | 📢 | 👤 | A bean figure speaking into a megaphone, with big bold sound waves coming out. |
| rule-only-talk | Only talk | 👄 | 👤 | A bean figure with a big speech bubble; beside it, a pencil, a picture card and a signing mitten hand, each faded and crossed out with a soft grey line. |
| rule-write | Write it down | 📝 | | Copy of `mode-write`. |
| rule-sit-still | Sit still | 🪑 | 👤 | A bean figure sitting very straight on a classroom chair, hands flat on a desk. |
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


## 4. ElevenLabs: narrator and sounds

### 4.1 Whose voice?

The children asked for real recorded voices rather than synthetic speech. Treat this narrator as **HQ's placeholder**. Later, two participatory options are open:
- the children choose HQ's voice from three candidates;
- the children record some lines themselves. Their recordings must stay on the iPads, never in the repo or an online service, so that would need a small extra feature.

### 4.2 Choose the voice (once, 15 minutes)

1. Go to ElevenLabs → Voices → Voice Library. Filter for English with a British accent, for narration or characters.
2. Shortlist three voices. Test each with:
   - *"Welcome to Agent Lab."*
   - *"[whispers] Make a secret sign for it."*
   - *"When does your agent use this power?"*
3. Choose a voice that is warm, clear and unhurried; not babyish or sing-song, and not a celebrity sound-alike.
4. Note its **Voice ID** for the script.

### 4.3 Settings

- **Model:** Eleven v4 (`eleven_v4`), the newest model, which follows audio tags such as `[whispers]`. If it gives you trouble, add `NARRATOR_MODEL=eleven_multilingual_v2` to `.env`; the script then removes the tags, which that model would read aloud.
- **Speed:** Eleven v4 has no speed setting; it takes only stability and similarity. Instead, the app plays narration a little slower (0.9×, an adult setting) without changing the pitch. Children with language disorders process speech more slowly (Zapparrata, Brooks & Ober, 2023), so choose a voice that already sounds unhurried.
- **Voice settings:** stability 0.5 and similarity 0.75. The script sends only the settings the chosen model accepts.
- **Output:** MP3, 44.1 kHz, 128 kbps.
- **Pauses:** use full stops between short sentences. Avoid tags other than `[whispers]`.

### 4.4 Two ways to make the narration

**With the script (recommended for 115 lines).** `tools/make_audio.py` makes the narrator lines and the sound effects. It reads the tables in this guide and saves every file straight into `assets/audio/` under its exact name.
1. Put `make_audio.py` in `agent-lab/tools/`.
2. In Terminal, from the agent-lab folder, run `python3 tools/make_audio.py setup`. It asks for your API key, lets you pick the narrator from your voices, saves both in `.env`, and adds `.env` to `.gitignore`.
3. Run `python3 tools/make_audio.py narrator` to make the session-2 lines. Add `--session 4` for everything.
4. Run `python3 tools/make_audio.py play narrator` to listen.
5. To redo one line, run `python3 tools/make_audio.py narrator --only nar-hq-intro --force`.

Session 2 is 1,401 characters of text and all sessions together are 2,352, which fits within a basic plan. The step-by-step page "Agent Lab Voices" has every command with a copy button.

**By hand.** Text to Speech → paste the line → Generate → Download → rename → `assets/incoming/`.

### 4.5 Narrator lines

The rules for lines:
- short sentences of eight words or fewer;
- the same words every time (agent, mission, Stamp it);
- British spelling.

Lines starting with `[whispers]` keep the tag in the text.

**Session 2: instructions ⭐**

| id | plays when | text |
|---|---|---|
| nar-start-welcome | Start screen 🔊 | Welcome to Agent Lab. Tap New agent to begin. |
| nar-gallery | Start screen, when agents exist | Find your agent. Tap your symbol. |
| nar-codename-roll | Codename | Spin for your spy name. |
| nar-codename-lock | Codename locks | Tap a lock to keep that word. |
| nar-codename-type | Type sheet | Make up your own spy name. |
| nar-codename-request | Typed word not found | Request sent to HQ. |
| nar-make-intro | Make: the doors | Make your agent. Pick a door. |
| nar-door-parts | Parts door | Build your agent from parts. |
| nar-door-pixel | Pixel door | Colour in the squares. |
| nar-door-draw | Draw door | Draw your agent with your finger. |
| nar-make-stickers | Sticker tray | Drag stickers onto your agent. |
| nar-make-search | Sticker search | Type a word to find a sticker. |
| nar-missing | 🧩 Something's missing | Something missing? Draw it or say it. |
| nar-locked | Tapping a locked mission | This opens on a later mission day. |
| nar-powerup-intro | Power-up starts | Your agent is powering up! |
| nar-power-make | Power, step 1 | Make up a power. Draw it or say it. |
| nar-power-ideas | Need ideas? | Here are some ideas. |
| nar-power-effect | Power, step 2 | What does your power look like? |
| nar-power-when | Power, step 3 | When does your agent use this power? |
| nar-own-card | ✏️ My own | Make your own card. |
| nar-look-edit | Change my look | Change how your powered-up agent looks. |
| nar-hq-intro | HQ | Where is your agent strongest? |
| nar-hq-draw | HQ: draw my own | Draw your own place. |
| nar-voice-intro | Voice | Record your secret voice password. |
| nar-voice-listen | After recording | Listen back. |
| nar-voice-filters | Spy voices | Try the spy voices. Pick one for your agent. |
| nar-voice-3ways | Say it 3 ways | Say it three ways. Big, small, and asking. |
| nar-card-intro | Card opens | [whispers] Agent file complete. |
| nar-card-badge | Badge check | Here is your agent on a badge. Can you still tell it's yours? |
| nar-card-wall | Wall check | Here is your agent on the wall. |
| nar-card-seal | Seal | Seal your file? Pick three secret symbols. |
| nar-seal-open | Opening a sealed file | Tap your three secret symbols. |
| nar-card-finish | Finish | Mission complete. Well done, agent. |

**Session 2: card labels ⭐** (the iPad voice stands in if you run out of time)

| id | text |
|---|---|
| nar-sit-too-loud | Too loud. |
| nar-sit-not-understood | Nobody gets what I mean. |
| nar-sit-waiting | Waiting. |
| nar-sit-did-well | I did it! |
| nar-sit-asked-answer | Asked to answer. |
| nar-sit-unkind | Someone is unkind. |
| nar-sit-plans-change | Plans change. |
| nar-sit-new-place | Somewhere new. |
| nar-sit-playtime | Playtime. |
| nar-sit-tricky-work | Tricky work. |
| nar-hq-classroom | Classroom. |
| nar-hq-playground | Playground. |
| nar-hq-library | Library. |
| nar-hq-quiet-room | Quiet room. |
| nar-hq-lunch-hall | Lunch hall. |
| nar-hq-home | Home. |
| nar-hq-space | Space. |
| nar-hq-underwater | Under the sea. |
| nar-hq-jungle | Jungle. |
| nar-hq-city-rooftop | City rooftop. |
| nar-hq-sky-castle | Sky castle. |
| nar-hq-secret-lab | Secret lab. |
| nar-idea-freeze | Freeze time. |
| nar-idea-invisible | Turn invisible. |
| nar-idea-speed | Super speed. |
| nar-idea-mind | Read minds. |
| nar-idea-shield | Shield. |
| nar-idea-fly | Fly. |
| nar-idea-strong | Super strong. |
| nar-idea-teleport | Teleport. |
| nar-idea-grow | Grow and shrink. |
| nar-idea-animals | Talk to animals. |

**Session 3: v3 instructions ◻️**

The words on screen stay short; the narrator may say more (Filip, 4 November
2026: "the writing is there to help, but deepen the narration"). The stories
(`nar-story-…`: powers, battery cards, talks cards, bottle tokens) and door
introductions (`nar-door-…`) say what a card or door DOES, all with the same warmth - never "good choice", because
the app does not react to what a child chose (v3 §17).

| id | plays when | text |
|---|---|---|
| nar-v3-welcome | Start screen 🔊 | Find your agent, or make a new one. |
| nar-v3-gallery | Start screen, when agents exist | Is your agent here? Tap it. |
| nar-base-pick | Quick agent | Pick an agent to start from. |
| nar-base-blank | Start blank | Or start from nothing. |
| nar-likeme-ask | Like-me question | Is your agent like you? |
| nar-suit-likes | Talking, step 1 | How does your agent like to talk? |
| nar-handshake-make | Handshake | Tap a secret handshake for your agent. |
| nar-handshake-listen | Handshake plays back | Listen. Tap again to make a new one. |
| nar-likes-frame | Talking: said before every card | My agent likes to communicate by… |
| nar-suit-most | Talking: the favourite | Which one does your agent like the most? |
| nar-answer-yes | A card goes on ✓ | Yes! |
| nar-answer-unsure | A card goes on ? | Not sure. |
| nar-answer-no | A card goes on ✗ | No. |
| nar-safe-talk | Safe place, step 1 | Where does your agent feel safe to talk? |
| nar-safe-stops | Safe place, step 2 | Where does your agent's power stop working? |
| nar-powers-doors | Powers start: the doors | [whispers] Secret doors… Each one hides a power. |
| nar-door-what | A door creaks open (one of three, at random) | [whispers] What's behind this door? |
| nar-door-peek | A door creaks open (one of three, at random) | [whispers] Shh… Let's take a peek. |
| nar-door-creak | A door creaks open (one of three, at random) | [whispers] It's opening… slowly… |
| nar-door-other | After a door introduces itself | Pick one, or try another door! |
| nar-powers-charged | Every cell of the battery is full | Fully charged! Now hold down Power on! |
| nar-powers-hold | Arriving at the last question, where Power on! appears | When you're ready, hold down Power on! |
| nar-door-time | A family door has opened | The Time door! Powers to stop, slow and save time. |
| nar-door-senses | A family door has opened | The Sound and light door! Powers for noise and brightness. |
| nar-door-language | A family door has opened | The Words door! Powers that help everyone understand. |
| nar-door-floor | A family door has opened | The Turns door! Powers for whose turn it is. |
| nar-door-screens | A family door has opened | The Screens door! Powers over the school's machines. |
| nar-door-together | A family door has opened | The Together door! Powers to share with friends. |
| nar-story-slow-everybody | A power card is tapped | Slow everybody down! The whole school moves like a tortoise now. |
| nar-story-pause | A power card is tapped | Pause my school! Freeze! Nobody moves. Not even the teachers. |
| nar-story-hold-turn | A power card is tapped | Hold my turn! Your agent's turn is saved, like a ticket. Nobody can take it. |
| nar-story-warn-me | A power card is tapped | Warn me first! A little bell rings before anything changes. |
| nar-story-say-again | A power card is tapped | Say it again! Rewind! The words come back, nice and slow. |
| nar-story-turn-down | A power card is tapped | Turn the classroom down! Shhh… All the noise fades away. |
| nar-story-dim-lights | A power card is tapped | Dim the classroom lights! Click. Soft, calm light everywhere. |
| nar-story-quiet-bubble | A power card is tapped | Quiet bubble! Your agent floats inside. The noise just bounces off. |
| nar-story-translator | A power card is tapped | Translator! Pictures turn into words. Words turn into pictures. |
| nar-story-my-way | A power card is tapped | Everyone talks my way! Now everyone talks your agent's way. |
| nar-story-get-me | A power card is tapped | Get-what-I-mean ray! Zap! Now everyone understands your agent. |
| nar-story-control-teachers | A power card is tapped | Control teachers! Press a button, and the teacher does it. |
| nar-story-question-swap | A power card is tapped | Question swap! This time, the teacher answers the question. |
| nar-story-pass | A power card is tapped | Pass! Your agent can skip this one. No problem. |
| nar-story-invisible | A power card is tapped | Invisibility cloak! Whoosh. Nobody can see your agent now. |
| nar-story-control-displays | A power card is tapped | Control all school displays! Every screen shows what your agent wants. |
| nar-story-control-devices | A power card is tapped | Control school devices! The bell, the lights… your agent is in charge. |
| nar-story-see-points | A power card is tapped | See my points! Your agent sees the points. Nothing is hidden. |
| nar-story-change-rule | A power card is tapped | Change a school rule! Out with the old rule. In with a new one. |
| nar-story-speak-for-friends | A power card is tapped | Speak for your friends! Your agent says it for them. |
| nar-story-call-ally | A power card is tapped | Call an ally! A friend runs over to help. |
| nar-story-team-up | A power card is tapped | Team up! Two agents together are even stronger. |
| nar-story-mode-talk | A talks card, after "My agent likes…" | Talking! Saying it out loud, with words. |
| nar-story-mode-hands | A talks card, after "My agent likes…" | Signing! Talking with hands, like Makaton. |
| nar-story-mode-handshake | A talks card, after "My agent likes…" | A secret handshake! A rhythm only your agent knows. |
| nar-story-mode-draw | A talks card, after "My agent likes…" | Drawing! Showing it with a picture. |
| nar-story-mode-act | A talks card, after "My agent likes…" | Acting it out! Showing it with the whole body. |
| nar-story-mode-pictures | A talks card, after "My agent likes…" | Picture cards! Pointing at a picture to say it. |
| nar-story-mode-write | A talks card, after "My agent likes…" | Writing! Putting the words on paper. |
| nar-story-mode-device | A talks card, after "My agent likes…" | A device! A tablet that talks for your agent. |
| nar-story-who-me | A Who card is picked | Me! The power works on your agent. |
| nar-story-who-friend | A Who card is picked | A friend! The power works on a friend. |
| nar-story-who-teacher | A Who card is picked | My teacher! The power works on the grown-ups at school. |
| nar-story-who-class | A Who card is picked | My class! The whole class feels the power. |
| nar-story-who-everyone | A Who card is picked | Everyone! The whole school feels the power. |
| nar-story-who-room | A Who card is picked | The room! The lights, the sounds, the whole room changes. |
| nar-story-how-badge | A Switch-on card is picked | My badge! Tap the badge, and on it goes. |
| nar-story-how-handshake | A Switch-on card is picked | My secret handshake! Tap the rhythm, and the power wakes up. |
| nar-story-how-hand-sign | A Switch-on card is picked | A hand sign! One secret sign, and the power switches on. |
| nar-story-how-word | A Switch-on card is picked | A secret word! Say it, and the power switches on. |
| nar-story-how-drawing | A Switch-on card is picked | A drawing! Draw the sign, and the power begins. |
| nar-story-how-button | A Switch-on card is picked | A button! Press it, and the power switches on. |
| nar-story-dev-bell | A device card is picked | The school bell! Your agent decides when it rings. |
| nar-story-dev-alarm | A device card is picked | The fire alarm! Your agent controls how it sounds. |
| nar-story-dev-lights | A device card is picked | The lights! Brighter, softer, on or off. Your agent decides. |
| nar-story-dev-speakers | A device card is picked | The speakers! Louder or quieter. Your agent decides. |
| nar-story-dev-board | A device card is picked | The whiteboard! Your agent chooses what it shows. |
| nar-story-dev-computers | A device card is picked | The computers! Your agent is at the controls. |
| nar-story-rule-hand-up | A rule card is picked | Put your hand up! Hands up before anyone talks. |
| nar-story-rule-quiet | A rule card is picked | Be quiet! No talking in class. |
| nar-story-rule-look | A rule card is picked | Look at who's talking! Eyes on the speaker. |
| nar-story-rule-quick | A rule card is picked | Answer quickly! Say the answer straight away. |
| nar-story-rule-speak-up | A rule card is picked | Speak up! Loud and clear, so everyone hears. |
| nar-story-rule-only-talk | A rule card is picked | Only talk! Words out loud, and nothing else. |
| nar-story-rule-write | A rule card is picked | Write it down! Put it on paper. |
| nar-story-rule-sit-still | A rule card is picked | Sit still! Stay in your seat. |
| nar-story-item-power | A bottle token is tapped | A power to give! Your agent gives one of its powers away. |
| nar-story-item-handshake | A bottle token is tapped | My handshake! Your agent's secret rhythm goes inside. |
| nar-story-item-drawing | A bottle token is tapped | A drawing! Draw something to put inside. |
| nar-story-item-cant-live | A bottle token is tapped | Something your agent can't live without! Draw it or say it. |
| nar-story-item-safe | A bottle token is tapped | Your agent's safe place! It goes inside the bottle. |
| nar-story-item-word | A bottle token is tapped | My secret word! It goes inside, in its spy voice. |
| nar-story-to-me | Who the bottle is for | For me! It stays safe on your shelf. |
| nar-story-to-friend | Who the bottle is for | For a friend at school! Tap the microphone and say their name. |
| nar-story-to-teacher | Who the bottle is for | For your teacher at school! Tap the microphone and say their name. |
| nar-story-to-everyone | Who the bottle is for | For everyone at school! It goes up on the big screen. |
| nar-powers-who | Who slot | Who does the power work on? Pick as many as you like. |
| nar-powers-how | How slot | How does your agent switch it on? A badge? A secret word? |
| nar-powers-devices | Devices cell | Which ones does your agent control? Pick as many as you like. |
| nar-powers-rules | Rules cell | Which school rule does your agent change? Pick as many as you like. |
| nar-powers-then | What-happens cell | And then what happens? Draw it, or say it. |
| nar-powers-fire | Power fires | Power on! |
| nar-powers-more | After a power | Your power is ready. Make another, or Stamp it. |
| nar-bottle-intro | Bottle | This is your agent's message bottle! Put things inside. Then pick who at school gets it! |
| nar-bottle-full | Fourth item goes in | Your bottle is full to the top! |
| nar-bottle-to | Who it's for | Who at school is this bottle for? |
| nar-bottle-from | Who it's from | Who is it from? Sign it with your agent? Or keep it a mystery? |
| nar-game-say | Favourite game | Say the name of your favourite game. |
| nar-voice-say | Voice message | Tap the microphone. Say your message. |
| nar-bottle-cork | Cork | Now push the cork in, nice and tight. |
| nar-bottle-send | Send | Swipe it up, or hold the rocket. Off it goes! |
| nar-bottle-sent | After sending | Whoosh! Your bottle is on its way. |
| nar-bottle-sent-everyone | Sent to everyone | Whoosh! Off to the big screen. Everyone at school will see it! |
| nar-bottle-sent-friend | Sent to a friend | Whoosh! It's in the school post for your friend. |
| nar-bottle-sent-teacher | Sent to a teacher | Whoosh! It's in the school post for your teacher. |
| nar-name-ok-friend | A friend's name has been said | Got it! It goes to your friend at school. |
| nar-name-ok-teacher | A teacher's name has been said | Got it! It goes to your teacher at school. |
| nar-bottle-kept | Kept | Your bottle stays safe on your shelf. |

**Session 3: v3 card labels ◻️**

| id | text |
|---|---|
| nar-likeme-like | Like me. |
| nar-likeme-bit | A bit like me. |
| nar-likeme-else | Someone else. |
| nar-mode-talk | Talking. |
| nar-mode-hands | Signing. |
| nar-mode-handshake | Secret handshake. |
| nar-mode-draw | Drawing. |
| nar-mode-act | Acting it out. |
| nar-mode-pictures | Picture cards. |
| nar-mode-write | Writing. |
| nar-mode-device | A device. |
| nar-safe-nowhere | Nowhere. |
| nar-fam-time | Time. |
| nar-fam-senses | Sound and light. |
| nar-fam-language | Words. |
| nar-fam-floor | Turns. |
| nar-fam-screens | Screens. |
| nar-fam-together | Together. |
| nar-pow-slow-everybody | Slow everybody down. |
| nar-pow-pause | Pause my school. |
| nar-pow-hold-turn | Hold my turn. |
| nar-pow-warn-me | Warn me first. |
| nar-pow-say-again | Say it again. |
| nar-pow-turn-down | Turn the classroom down. |
| nar-pow-dim-lights | Dim the classroom lights. |
| nar-pow-quiet-bubble | Quiet bubble. |
| nar-pow-translator | Translator. |
| nar-pow-my-way | Everyone talks my way. |
| nar-pow-get-me | Get-what-I-mean ray. |
| nar-pow-control-teachers | Control teachers. |
| nar-pow-question-swap | Question swap. |
| nar-pow-pass | Pass. |
| nar-pow-invisible | Invisibility cloak. |
| nar-pow-control-displays | Control all school displays. |
| nar-pow-control-devices | Control school devices. |
| nar-pow-see-points | See my points. |
| nar-pow-change-rule | Change a school rule. |
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
| nar-dev-bell | The school bell. |
| nar-dev-alarm | The fire alarm. |
| nar-dev-lights | The lights. |
| nar-dev-speakers | The speakers. |
| nar-dev-board | The whiteboard. |
| nar-dev-computers | The computers. |
| nar-rule-hand-up | Put your hand up. |
| nar-rule-quiet | Be quiet. |
| nar-rule-look | Look at who's talking. |
| nar-rule-quick | Answer quickly. |
| nar-rule-speak-up | Speak up. |
| nar-rule-only-talk | Only talk. |
| nar-rule-write | Write it down. |
| nar-rule-sit-still | Sit still. |
| nar-item-power | A power to give. |
| nar-item-handshake | My handshake. |
| nar-item-drawing | A drawing. |
| nar-item-voice | A voice message. |
| nar-item-game | My favourite game. |
| nar-item-cant-live | Something my agent can't live without. |
| nar-item-safe | My safe place. |
| nar-sign-agent | Signed! Everyone will see it's from your agent. |
| nar-sign-mystery | Mystery. The big screen won't say who. |
| nar-name-silent | Silent |
| nar-name-swift | Swift |
| nar-name-brave | Brave |
| nar-name-clever | Clever |
| nar-name-hidden | Hidden |
| nar-name-golden | Golden |
| nar-name-midnight | Midnight |
| nar-name-lucky | Lucky |
| nar-name-shadow | Shadow |
| nar-name-bright | Bright |
| nar-name-sneaky | Sneaky |
| nar-name-mighty | Mighty |
| nar-name-quiet | Quiet |
| nar-name-wild | Wild |
| nar-name-cosmic | Cosmic |
| nar-name-electric | Electric |
| nar-name-frosty | Frosty |
| nar-name-turbo | Turbo |
| nar-name-secret | Secret |
| nar-name-jazzy | Jazzy |
| nar-name-rapid | Rapid |
| nar-name-steady | Steady |
| nar-name-neon | Neon |
| nar-name-royal | Royal |
| nar-name-comet | Comet |
| nar-name-storm | Storm |
| nar-name-spark | Spark |
| nar-name-rocket | Rocket |
| nar-name-arrow | Arrow |
| nar-name-thunder | Thunder |
| nar-name-blaze | Blaze |
| nar-name-wave | Wave |
| nar-name-star | Star |
| nar-name-moon | Moon |
| nar-name-cloud | Cloud |
| nar-name-breeze | Breeze |
| nar-name-compass | Compass |
| nar-name-lantern | Lantern |
| nar-name-key | Key |
| nar-name-diamond | Diamond |
| nar-name-riddle | Riddle |
| nar-name-orbit | Orbit |
| nar-name-rainbow | Rainbow |
| nar-name-signal | Signal |
| nar-name-shield | Shield |
| nar-name-magnet | Magnet |
| nar-name-torch | Torch |
| nar-name-crystal | Crystal |

### 4.6 Sound effects

**With the script:** run `python3 tools/make_audio.py sfx`, then `python3 tools/make_audio.py play sfx`. It adds the style line and the duration for you. Redo one sound with `--only sfx-stamp --force`.

**By hand:** ElevenLabs → Sound Effects → paste the prompt plus the style line → set the duration → Generate → pick the best → Download → rename → `assets/incoming/`.

**Style line for every sound:** *"Soft, friendly, cartoon-like and clean. Not too loud, no harsh high pitches, no music, no voices."* Some children may be sound-sensitive.

The "stand-in" column is the generated sound the app plays until your file arrives.

| id | plays when | prompt | seconds | stand-in | tier |
|---|---|---|---|---|---|
| sfx-stamp | Stamp it | A rubber stamp thudding onto paper on a wooden desk, one hit. | 0.6 | stamp | ⭐ |
| sfx-reel-spin | Codename reels spin | Slot-machine reels spinning with light mechanical clicks. | 1.5 | whoosh | ⭐ |
| sfx-reel-stop | A reel stops | A slot-machine reel stopping with a bright ding. | 0.5 | pop | ⭐ |
| sfx-pop | A sticker or part lands | A soft bubble pop. | 0.5 | pop | ⭐ |
| sfx-whoosh | Moving between screens | A quick, soft whoosh. | 0.6 | whoosh | ⭐ |
| sfx-powerup | Power-up starts | A magical rising shimmer that ends bright. | 2 | power | ⭐ |
| sfx-lightning | Effect: lightning | A small cartoon electric zap. | 1 | power | ⭐ |
| sfx-freeze | Effect: freeze | An icy crackle of frost forming. | 1 | sparkle | ⭐ |
| sfx-fade | Effect: invisible | A soft magical shimmer fading away. | 1 | sparkle | ⭐ |
| sfx-speed | Effect: speed | A very fast cartoon zoom. | 0.8 | whoosh | ⭐ |
| sfx-thoughts | Effect: thoughts | Soft bubbly blips, like thoughts popping up. | 1 | sparkle | ⭐ |
| sfx-shield | Effect: shield | An energy shield humming on. | 1 | power | ⭐ |
| sfx-float | Effect: float | A gentle rising whoosh. | 1 | whoosh | ⭐ |
| sfx-stomp | Effect: stomp | One heavy cartoon footstep thump. | 0.6 | stamp | ⭐ |
| sfx-teleport | Effect: teleport | A swirling teleport zap. | 1 | power | ⭐ |
| sfx-grow | Effect: grow and shrink | A cartoon slide whistle going up. | 1 | power | ⭐ |
| sfx-file-open | Card or dossier opens | A paper folder opening, pages rustling. | 1 | whoosh | ⭐ |
| sfx-seal | Sealing the file | A wax seal pressed down, a soft squish and click. | 0.8 | stamp | ⭐ |
| sfx-new | New stickers have arrived | A cheerful two-note chime. | 0.7 | sparkle | ⭐ |
| sfx-door-open | A power door opens | A small wooden door creaking open, short and friendly. | 0.7 | whoosh | ◻️ |
| sfx-slow | Slow everybody down | A gentle sound slowing down and dropping in pitch, like a toy winding down. | 1.5 | whoosh | ◻️ |
| sfx-bottle-drop | An item drops into the bottle | A small object dropping into a glass bottle, one soft clink. | 0.6 | pop | ◻️ |
| sfx-cork | The cork goes in | A cork pushed into a glass bottle, a soft squeak and a pop. | 0.6 | pop | ◻️ |
| sfx-bottle-send | The bottle flies off | A soft rising whoosh with a tiny sparkle at the end. | 1 | whoosh | ◻️ |
| sfx-bottle-arrive | A bottle arrives on the display | A gentle splash of water, then a soft two-note chime. | 1.2 | sparkle | ◻️ |
| sfx-gift | A power is given | A soft magical sparkle travelling from left to right. | 1 | sparkle | ◻️ |
| sfx-timer-ring | A real-for-a-minute ring starts or ends | One soft, low bell ring. | 1.2 | sparkle | ◻️ |
| sfx-ticket | Power: Hold my turn | A ticket machine printing a small ticket, then one soft ding. | 1 | pop | ◻️ |
| sfx-warn | Power: Warn me first | Three gentle chime notes rising one after another, like a soft countdown. | 1.5 | sparkle | ◻️ |
| sfx-rewind | Power: Say it again | A cassette tape rewinding quickly, ending in a playful little squeak. | 1 | whoosh | ◻️ |
| sfx-turn-down | Power: Turn the classroom down | A busy buzzing hum that fades quickly away into calm quiet. | 1.5 | whoosh | ◻️ |
| sfx-dim | Power: Dim the classroom lights | A light switch clicking, then a soft low hum gently fading down. | 1.2 | power | ◻️ |
| sfx-translate | Power: Translator | A small friendly machine whirring, then two bright beeps. | 1.2 | sparkle | ◻️ |
| sfx-ray | Power: Get-what-I-mean ray | A cartoon ray gun beam: a bright, rising, wobbly zap. | 1 | power | ◻️ |
| sfx-remote | Power: Control teachers | A game controller button clicking, then a playful springy boing. | 1 | pop | ◻️ |
| sfx-screens | Power: Control all school displays | An old television switching on: a soft fizz, then a bright hum. | 1.2 | power | ◻️ |
| sfx-swap | Power: Question swap | Two quick soft whooshes passing each other, one left and one right. | 0.8 | whoosh | ◻️ |
| sfx-pass | Power: Pass | One short, soft, friendly referee whistle. | 0.6 | sparkle | ◻️ |
| sfx-star | Power: See my points | A sparkly twinkle with a soft bell ding at the end. | 1 | sparkle | ◻️ |
| sfx-scroll | Power: Change a school rule | A paper scroll unrolling with a soft rustle, then a quick pencil scribble. | 1.2 | whoosh | ◻️ |
| sfx-bubbles | Power: Speak for your friends | Two soft bubbly pops, one high and one low, like two speech bubbles appearing. | 0.8 | pop | ◻️ |
| sfx-call | Power: Call an ally | A short cartoon megaphone honk, then quick light footsteps running in. | 1.2 | pop | ◻️ |
| sfx-high-five | Power: Team up | A cartoon high-five clap with a little sparkle. | 0.8 | sparkle | ◻️ |

---

## 5. Bringing files in

1. Rename each file with its id and put it in `assets/incoming/`.
2. Tell Claude Code: **"Bring in the new assets."**
3. Then: **"Commit and push."**
4. On each iPad, open the app and tap the "New version" banner. Then check Adult panel → Asset check.

---

## 6. Quality check for every image

- [ ] No people (bean figures only, and only on situation cards), no faces, no hands.
- [ ] No writing anywhere. Zoom in: boards, book spines and screens often hide gibberish letters.
- [ ] HQ places: the lower middle is clear for the agent.
- [ ] Not too bright or busy, so a bright, child-made agent stands out.
- [ ] Real places look British (no lockers, no yellow school buses).
- [ ] Stickers: one object, background removed, no white halo.
- [ ] Nothing stereotyped. Image generators amplify demographic stereotypes (Bianchi et al., 2023).
- [ ] Still clear at small size on the iPad.

---

## 7. The weekly loop: "you asked, we added" 🔁

1. After a session, go to Adult panel → Requests → Export, on every iPad that was used.
2. Read the list. Drop anything rude, risky or identifying (such as real names).
3. For each sticker you'll make, add a row to the §3.3 table (id `stk-…`, label, tab, fallback, keywords) and put ✨ in the **new** column.
4. Make the stickers in the stickers project, remove their backgrounds, and put them in `assets/incoming/`.
5. Tell Claude Code: **"Sync the asset list and bring in the new assets."** Then **"Commit and push."** Update the iPads.
6. In the next session, the new stickers wear ✨. The week after, clear the ✨ marks and sync again.

This is how children's influence becomes visible (Lundy, 2007): they see the system change because they asked. The app only ever says "Request sent to HQ", so it never promises anything you can't deliver.

---

## 8. What not to make, and why

- **The parts kit** (eyes, mouths, hair, bodies). Claude Code draws it as SVG, because parts must be recolourable (skin and hair tones), line up on a face, and stay crisp on a 320×240 badge. Generated pictures can't do all three. You can help with the optional reference sheets (§3.4).
- **Power effects, force fields, frames and animation.** These are code.
- **Live AI in the app.** The app never calls ChatGPT or ElevenLabs, for three reasons:
  - the keys would be public on GitHub Pages;
  - OpenAI requires zero data retention before its API processes under-13s' personal data;
  - a machine's picture would replace the child's own making.

---

### References

- Bianchi, F., Kalluri, P., Durmus, E., et al. (2023). Easily accessible text-to-image generation amplifies demographic stereotypes at large scale. *FAccT '23*. https://doi.org/10.1145/3593013.3594095
- Lundy, L. (2007). 'Voice' is not enough: Conceptualising Article 12 of the United Nations Convention on the Rights of the Child. *British Educational Research Journal*, 33(6), 927–942. https://doi.org/10.1080/01411920701657033
- Zapparrata, N. M., Brooks, P. J., & Ober, T. M. (2023). Developmental language disorder is associated with slower processing across domains: A meta-analysis of time-based tasks. *Journal of Speech, Language, and Hearing Research*, 66(1), 325–346. https://doi.org/10.1044/2022_JSLHR-22-00221

---

## 9. Retired (v2; not made)

v3 replaced the force field, mood codes, rules, badge and dossier screens
(`agent-lab-v3-spec.md` §3). These lines and sounds are kept here as a record,
not made. They sit outside §4.5 and §4.6 on purpose: `tools/make_audio.py`
reads only those two sections, and `tools/sync-assets.py` reads only the
headings it lists, so nothing here is made or put in the manifest. Their files
from earlier sessions stay where they are.

**Retired: session 3 force field and mood codes (v2; not made)**

| id | text |
|---|---|
| nar-field-intro | Make your agent's force field. Pick its size and look. |
| nar-field-approach | Someone is coming. What does your force field do? |
| nar-approach-friend | A friend. |
| nar-approach-teacher | A teacher. |
| nar-approach-new | Someone new. |
| nar-react-bounce | Bounce off. |
| nar-react-letin | Let them in. |
| nar-react-wave | Wave hello. |
| nar-mood-intro | Make a secret mood code. |
| nar-mood-situation | Pick a moment. |
| nar-mood-enact | Show how your agent reacts. |
| nar-mood-sign | [whispers] Make a secret sign for it. |
| nar-mood-readers | Who can read this sign? |
| nar-people-me | Only me. |
| nar-people-friends | Friends. |
| nar-people-teachers | Teachers. |
| nar-people-family | Family. |
| nar-people-everyone | Everyone. |

**Retired: session 4 rules, badge and dossier (v2; not made)**

| id | text |
|---|---|
| nar-rules-intro | Make rules for the people around your agent. |
| nar-rules-who | Who is this rule for? |
| nar-rules-action | What should they do? |
| nar-rules-when | When? |
| nar-rules-check | Listen. Is this right? |
| nar-rules-badge | Put this rule on your badge? |
| nar-please | Please. |
| nar-please-dont | Please don't. |
| nar-act-give-time | Give me time. |
| nar-act-talk-slower | Talk slower. |
| nar-act-write-it | Write it down. |
| nar-act-show-me | Show me. |
| nar-act-ask-first | Ask me first. |
| nar-act-touch-things | Touch my things. |
| nar-act-finish-words | Finish my words. |
| nar-act-sit-with-me | Sit with me. |
| nar-act-let-me-move | Let me move. |
| nar-act-headphones | Let me wear headphones. |
| nar-act-help-me | Help me. |
| nar-act-include-me | Include me. |
| nar-when-class | In class. |
| nar-when-lunch | At lunch. |
| nar-when-playtime | At playtime. |
| nar-when-loud | When it's loud. |
| nar-when-upset | When I'm upset. |
| nar-when-always | Always. |
| nar-badge-intro | Design your badge and your wall poster. |
| nar-badge-front | People near you can see your badge. |
| nar-badge-pocket | Press the star to open your secret pocket. |
| nar-badge-wall | The whole school can see the wall. |
| nar-badge-vault | Anything you leave out stays in your vault. |
| nar-dossier-flip | Flip your file. The back is top secret. |

**Retired: v3, after Filip's first try (3 November 2026)**

How my agent talks, Powers and the bottle were redesigned. These lines are no
longer played; files already made stay where they are.

| id | text | why |
|---|---|---|
| nar-suit-school | How does school want your agent to talk? | "School wants us to…" is said before every card instead |
| nar-suit-best | Which way does your agent like best? | now `nar-suit-most` |
| nar-powers-ideas | Here are some ideas. Pick a door. | the doors come first now: `nar-powers-doors` |
| nar-powers-sothat | So that what? Draw it or say it. | now `nar-powers-then` |
| nar-bottle-sign | Show your agent, or send a mystery? | now `nar-bottle-from` |
| nar-mode-hand-up | Hand up. | school has its own cards now |
| nar-mode-quiet | Being quiet. | school has its own cards now |
| nar-bottle-friend | Tap your friend's agent. | v84: the list of every agent is gone - children did not know which was their friend's |
| nar-word-make | Make up a secret word. Tap the microphone and say it. | v89: removed to keep the session short |
| nar-word-voice | Now pick a spy voice for it. | v89: removed to keep the session short |
| nar-powers-make | Make up a power. Draw it or say it. | v89: removed to keep the session short |
| nar-door-secret | [whispers] The secret door… What will you make? | v89: removed to keep the session short |
| nar-story-sit-too-loud | Too loud! When school gets noisy, the power kicks in. | v89: removed to keep the session short |
| nar-story-sit-not-understood | Nobody gets what your agent means? Then the power kicks in. | v89: removed to keep the session short |
| nar-story-sit-waiting | Waiting, and waiting… That's when your agent uses it. | v89: removed to keep the session short |
| nar-story-sit-did-well | I did it! When your agent wins, the power appears. | v89: removed to keep the session short |
| nar-story-sit-asked-answer | Asked to answer, with everyone looking. That's the moment. | v89: removed to keep the session short |
| nar-story-sit-unkind | Someone is unkind. Your agent's power is ready. | v89: removed to keep the session short |
| nar-story-sit-plans-change | Plans change! Something new, all of a sudden. Your agent is ready. | v89: removed to keep the session short |
| nar-story-sit-new-place | Somewhere new! A new room, new faces. The power helps. | v89: removed to keep the session short |
| nar-story-sit-playtime | Playtime! Out in the playground, the power is on. | v89: removed to keep the session short |
| nar-story-sit-tricky-work | Tricky work! When it gets hard, the power helps. | v89: removed to keep the session short |
| nar-powers-when | When does your agent use this power? Pick up to three. | v89: removed to keep the session short |
| nar-school-frame | School wants us to… | v87: "School wants us to…" removed |
| nar-story-school-talk-lot | Talk a lot! Lots of talking, all day long. | v87: "School wants us to…" removed |
| nar-story-school-only-talk | Only talk! Words out loud, and nothing else. | v87: "School wants us to…" removed |
| nar-story-school-makaton | Learn Makaton! Signs that go with words. | v87: "School wants us to…" removed |
| nar-story-school-look | Look at who's talking! Eyes on the speaker. | v87: "School wants us to…" removed |
| nar-story-school-quick | Answer quickly! Say the answer straight away. | v87: "School wants us to…" removed |
| nar-story-school-speak-up | Speak up! Loud and clear, so everyone hears. | v87: "School wants us to…" removed |
| nar-story-school-write | Write it down! Put it on paper. | v87: "School wants us to…" removed |
| nar-story-school-pictures | Use picture cards! Point at pictures to say things. | v87: "School wants us to…" removed |
| nar-story-school-device | Use a device! A tablet that helps with talking. | v87: "School wants us to…" removed |
| nar-school-talk-lot | Talk a lot. | v87: "School wants us to…" removed |
| nar-school-only-talk | Only talk. | v87: "School wants us to…" removed |
| nar-school-makaton | Learn Makaton. | v87: "School wants us to…" removed |
| nar-school-look | Look at who's talking. | v87: "School wants us to…" removed |
| nar-school-quick | Answer quickly. | v87: "School wants us to…" removed |
| nar-school-speak-up | Speak up. | v87: "School wants us to…" removed |
| nar-school-write | Write it down. | v87: "School wants us to…" removed |
| nar-school-pictures | Use picture cards. | v87: "School wants us to…" removed |
| nar-school-device | Use a device. | v87: "School wants us to…" removed |

| id | label | picture | why |
|---|---|---|---|
| mode-hand-up | Hand up | A bean figure with one mitten hand raised high. | school has its own cards now |
| mode-quiet | Being quiet | A calm bean figure holding a mitten hand where its mouth would be, with a small crossed-out sound wave beside it. | school has its own cards now |
| door-secret | Secret door | The same door in gold, glowing brighter than the others, with a big sparkling question mark on it and light spilling out round its edges. | v89: the secret door was removed |
| school-talk-lot | Talk a lot | Copy of `mode-talk`. | v87: "School wants us to…" removed |
| school-only-talk | Only talk | A bean figure with a big speech bubble; beside it, a pencil, a picture card and a signing mitten hand, each faded and crossed out with a soft grey line. | v87: "School wants us to…" removed |
| school-makaton | Learn Makaton | Copy of `mode-hands`. | v87: "School wants us to…" removed |
| school-look | Look at who's talking | A small bean figure with big round eyes looking up at a taller bean figure with a lanyard who has a speech bubble, with dotted lines from the eyes to the speaker. | v87: "School wants us to…" removed |
| school-quick | Answer quickly | A bean figure with a speech bubble shooting out fast, with speed lines and a small stopwatch beside it. | v87: "School wants us to…" removed |
| school-speak-up | Speak up | A bean figure speaking into a megaphone, with big bold sound waves coming out. | v87: "School wants us to…" removed |
| school-write | Write it down | Copy of `mode-write`. | v87: "School wants us to…" removed |
| school-pictures | Use picture cards | Copy of `mode-pictures`. | v87: "School wants us to…" removed |
| school-device | Use a device | Copy of `mode-device`. | v87: "School wants us to…" removed |

| id | plays when | prompt | why |
|---|---|---|---|
| sfx-handshake-tap | A handshake tap | One soft, very short knock on a wooden table. | each tap is a note now, made by the app (`Voice.note`) - the knock "sounded like poking holes" |

**Retired: sounds (v2; not made)**

| id | plays when | prompt | seconds | stand-in | tier |
|---|---|---|---|---|---|
| sfx-field-bounce | Force field bounces someone off | A springy, rubbery boing. | 0.6 | pop | ◻️ |
| sfx-field-open | Force field lets someone in | A soft bubble opening. | 0.6 | pop | ◻️ |

