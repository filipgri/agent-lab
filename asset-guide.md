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
- **Keep API keys out of the repo.** If you use the scripts, the keys live in a `.env` file, which Claude Code adds to `.gitignore` in V0. Check it's listed there before you create the file.
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

- **Model:** the newest one that follows audio tags such as `[whispers]` (Eleven v4 at the time of writing). If it sounds unstable, use Multilingual v2 and remove the tags.
- **Speed: 0.9** (the range is 0.7–1.2). Children with language disorders process speech more slowly (Zapparrata, Brooks & Ober, 2023).
- **Voice settings:** stability in the middle, style low, speaker boost on.
- **Output:** MP3, 44.1 kHz, 128 kbps.
- **Pauses:** use full stops between short sentences. Avoid tags other than `[whispers]`.

### 4.4 Two ways to make the narration

**With the script (recommended for 115 lines).**
1. Ask Claude Code for **T1** (spec §10).
2. Create a file called `.env` in the repo folder containing:
   ```
   ELEVENLABS_API_KEY=your-key-here
   ELEVENLABS_VOICE_ID=the-voice-id
   ```
3. Say **"Make the narrator voices."** It makes every missing file with the exact name.
4. Listen on the iPad (Asset check ▶️). To redo a line, say for example **"Redo nar-hq-intro."**

The whole script is about 3,000 characters, which fits within a basic plan.

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

**Session 3: force field and mood codes ◻️**

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

**Session 4: rules, badge and dossier ◻️**

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

### 4.6 Sound effects

**How:** ElevenLabs → Sound Effects → paste the prompt plus the style line → set the duration → Generate → pick the best → Download → rename → `assets/incoming/`.

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
| sfx-field-bounce | Force field bounces someone off | A springy, rubbery boing. | 0.6 | pop | ◻️ |
| sfx-field-open | Force field lets someone in | A soft bubble opening. | 0.6 | pop | ◻️ |

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
