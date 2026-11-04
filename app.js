/* ============================================================================
   app.js - navigation, state and the research event log
   ============================================================================
   MILESTONE 0. Everything here is the skeleton: the screens exist, you can move
   between them, and every agent is saved. The missions themselves are empty
   placeholders until later milestones.

   HOW THIS FILE IS ORGANISED
     1. CONFIG            things you may want to change (the PIN, word lists)
     2. STATE             the one agent currently being edited
     3. HELPERS           tiny shared utilities
     4. EVENT LOG         the research data (spec §8)
     5. AUTO-SAVE         debounced writes to IndexedDB (spec §6)
     6. SCREENS           showing one <section> at a time
     7. PROGRESS STRIP    the six mission icons + Reveal (spec §6)
     8. AGENT PREVIEW     the little always-visible thumbnail
     9. START SCREEN      codename roller
    10. MISSIONS          Stamp it / Pass / going back
    11. GLOBAL BUTTONS    mute, 🔊 speak, 🧩 something's missing
    12. ADULT PANEL       list, export, delete, settings (spec §7.9)
    13. BOOT              what runs when the app opens
    14. MAKE              pixel door + sticker layer
    15. POWER-UP          powers, aura, background
    16. VOICE             voice password: record + filters
    17. MOOD              mood codes (was the feeling code)
    18. BADGE             where the agent goes (becomes Badge in V8)
    19. RULES             agent rules + shared drawing sheet
    20. REVEAL            the agent ID card + save as PNG (Milestone 6)
    21. BUILD + DRAW      the other two Mission 1 doors (Milestone 7)
    22. POLISH & JUICE    §5a animation, sounds, spoken prompts (Milestone 8)
    23. OFFLINE           service worker + update banner (Milestone 9)
    24. SESSION           session preset, practice mode, asset check (v2 V0)
    25. PARTS KIT         heads, faces, hair and bodies (v2 V2)
    26. POWER-UP          power, effect, and when it is used (v2 V3)
   ========================================================================== */


/* ==========================================================================
   1. CONFIG
   ========================================================================== */

// Spec §14: this PIN is visible in public code on purpose. It is a speed bump
// to stop a curious child wandering into the adult panel, not real security.
const ADULT_PIN = '0502';

// Which milestone this build is up to. Stamped into every export so a file
// found later can be matched to the version of the app that made it.
const MILESTONE = 'v3-P0';

// The six missions, in the order children meet them.
/* The missions, in strip order (v2 spec §3). The ids are words now, not m1-m6:
   a log full of "m5" cannot be read six months later, and the missions have
   been reordered and renamed, so the numbers had stopped matching anyway.
   §6.2 migrates old agents.

   `opensIn` is the session a mission becomes available in. The adult panel's
   Session setting applies those as a preset, and single missions can then be
   switched off - for example HQ, when a rotation is running short. */
const MISSIONS = [
  /* v3 (agent-lab-v3-spec.md §3). The v2 screens - powerup, hq, voice,
     field, mood, rules, badge and the Reveal card - are retired: their DATA
     stays in every agent and every export, and git keeps their code under the
     session-2 tag. Only the way into them is gone.

     `defaultOn: false` keeps a mission on the strip but switched off in the
     session preset; an adult can switch it on in the panel (v3 §3). */
  { id: 'make',   icon: '🎨', opensIn: 2, title: 'Make your agent',     prompt: 'Make your agent.',                          narrate: 'nar-make-intro' },
  { id: 'suit',   icon: '🗣️', opensIn: 3, title: 'How my agent talks', prompt: 'How does your agent like to talk?',          narrate: 'nar-suit-likes' },
  { id: 'safe',   icon: '📍', opensIn: 3, title: 'Safe place',          prompt: 'Where does your agent feel safe to talk?',   narrate: 'nar-safe-talk', defaultOn: false },
  { id: 'powers', icon: '⚡', opensIn: 3, title: 'Powers',              prompt: "Pick a door. Find your agent's power.",      narrate: 'nar-powers-doors' },
  { id: 'bottle', icon: '🍾', opensIn: 3, title: 'The bottle',          prompt: 'What will your agent hand over?',            narrate: 'nar-bottle-intro' }
];


// Which session is running. The adult panel sets it; every event carries it.
const DEFAULT_SESSION = 3;         // v3 is for session 3 onwards

// Codename word lists (spec §7). A describing word + a spy word.
const ADJECTIVES = [
  'Silent', 'Swift', 'Brave', 'Clever', 'Hidden', 'Golden', 'Midnight', 'Lucky',
  'Shadow', 'Bright', 'Sneaky', 'Mighty', 'Quiet', 'Wild', 'Cosmic', 'Electric',
  'Frosty', 'Turbo', 'Secret', 'Jazzy', 'Rapid', 'Steady', 'Neon', 'Royal'
];

/* SPY WORDS, NOT ANIMALS (decided 3 November 2026).
   Up to session 2 the second reel was an animal, shown as a huge emoji. A big
   dolphin promises the child they will be working with a dolphin - and then
   nothing in the app ever mentions it again. So the second reel is now a spy
   word that is not a creature or a character, and its symbol is only a small
   badge on the agent's chest (see the Start screen in index.html).

   The research data still calls this reel `animal` (codenameParts.animal,
   the codename_spin and codename_lock events), so session-2 and session-3
   logs line up; DATA.md says what it holds now. Agents named in session 2
   keep their animal names - that is the child's work. Words already on the
   first reel (Shadow, Frosty…) are left out so no name repeats itself, and
   so are emoji that are little dark pictures (🌌 🌠) - they turn into a
   black square at badge size. */
const SPY_WORDS = [
  { name: 'Comet',   emoji: '☄️' }, { name: 'Storm',   emoji: '⛈️' },
  { name: 'Spark',   emoji: '✨' }, { name: 'Rocket',  emoji: '🚀' },
  { name: 'Arrow',   emoji: '🏹' }, { name: 'Thunder', emoji: '⚡' },
  { name: 'Blaze',   emoji: '🔥' }, { name: 'Wave',    emoji: '🌊' },
  { name: 'Star',    emoji: '⭐' }, { name: 'Moon',    emoji: '🌙' },
  { name: 'Cloud',   emoji: '☁️' }, { name: 'Breeze',  emoji: '🍃' },
  { name: 'Compass', emoji: '🧭' }, { name: 'Lantern', emoji: '🏮' },
  { name: 'Key',     emoji: '🔑' }, { name: 'Diamond', emoji: '💎' },
  { name: 'Riddle',  emoji: '🧩' }, { name: 'Orbit',   emoji: '🪐' },
  { name: 'Rainbow', emoji: '🌈' }, { name: 'Signal',  emoji: '📡' },
  { name: 'Shield',  emoji: '🛡️' }, { name: 'Magnet',  emoji: '🧲' },
  { name: 'Torch',   emoji: '🔦' }, { name: 'Crystal', emoji: '🔮' }
];


/* ==========================================================================
   2. STATE
   The app only ever edits ONE agent at a time. `state.agent` is that agent,
   shaped exactly like the data model in spec §8.
   ========================================================================== */

const state = {
  agent: null,        // the agent object currently being edited
  screen: 'start',    // which screen is showing
  missionIndex: 0,    // which MISSIONS entry is open
  onReveal: false,    // true while the Reveal screen is open
  muted: false,
  motion: 'full',     // 'full' | 'calm' | 'off'
  pinEntry: '',       // digits typed so far on the PIN pad

  // v2 §3. The session decides which missions are open, and every event
  // records it so the research data says which week it came from.
  session: DEFAULT_SESSION,
  // An adult can switch single missions off, for example when time is short.
  // { make: true, hq: false, ... }; missing means "use the session preset".
  missionOn: {},
  // v2 §3: work done while trying the app out is marked and kept out of
  // exports, so test data never contaminates the research data.
  practice: false,
  // v2 §5.3.2: 💩 and friends only appear when an adult turns this on.
  silly: false,
  // v3 §9.3: the display link, read from storage at boot. (The default
  // address is filled in by the code in section 29, which knows it.)
  displayOn: false,
  displayAddress: '',
  // v2 §7: how fast the narrator speaks. 0.8 / 0.9 / 1.0, default 0.9.
  narrationSpeed: 0.9
};


/* ==========================================================================
   3. HELPERS
   ========================================================================== */

// Short names for the two DOM lookups used constantly.
// querySelector finds the FIRST element matching a CSS selector.
// querySelectorAll finds ALL of them (we spread it into a real array).
const $  = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

const nowIso = () => new Date().toISOString();

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// A unique id. crypto.randomUUID is built into modern Safari; the fallback
// keeps older iPads working.
function uuid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

/* ---------------------------------------------------------------------------
   WHEN A BOOT STEP FAILS

   The banner, the error handlers and the on-screen report all live in
   boot-guard.js now, which loads before everything else and stays quiet
   unless an adult adds ?diag=1 to the address. A child must never meet a red
   block of stack trace: §12 rules out text-heavy UI, and there is nothing a
   nine-year-old can do with it but feel they broke something.

   All this does is hand a fault to the guard and write it to the console.
   ------------------------------------------------------------------------ */
function reportError(where, err) {
  const message = where + ' — ' + ((err && err.message) || String(err));
  if (window.__agentLabGuard) window.__agentLabGuard.problems.push(message);
  if (window.console && console.error) console.error('[Agent Lab]', where, err);
}


// A short message that fades away. Used for placeholder buttons in Milestone 0.
let toastTimer = null;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 1800);
}


/* ==========================================================================
   4. EVENT LOG - the research data (spec §8)
   Every meaningful action is appended to agent.events. Because each event
   carries a timestamp, time-per-mission can be worked out later from the
   mission_enter / mission_leave pairs.
   ========================================================================== */

function logEvent(action, detail) {
  if (!state.agent) return;
  state.agent.events.push({
    t: nowIso(),
    // v2 §6.3: which week this happened in, and whether it was a practice run.
    session: state.session,
    practice: Boolean(state.practice),
    mission: currentMissionId(),
    action: action,
    detail: detail || {}
  });
  scheduleSave();
}

// Which mission are we on? Used to tag every event.
function currentMissionId() {
  if (state.screen === 'start')  return 'start';
  if (state.screen === 'adult')  return 'adult';
  if (state.onReveal)            return 'reveal';
  if (state.screen === 'mission') return MISSIONS[state.missionIndex].id;
  return state.screen;
}


/* ==========================================================================
   5. AUTO-SAVE (spec §6: debounced to ~500ms, no Save button)
   "Debounce" means: wait until the changes stop coming, then save once.
   Without it, painting a pixel grid would hammer the database hundreds of
   times a second.
   ========================================================================== */

let saveTimer = null;

function scheduleSave() {
  if (!state.agent) return;
  paintStamp();                      // a change may have finished the mission

  /* If the editor is open ON the Power-up look and something changed, the
     child has deliberately made the Power-up different from the Cover. From
     then on it is theirs and stops mirroring (see copyCoverToPowerup). */
  const editorEl = $('#editor');
  if (editorEl && !editorEl.hidden && editor.part === 'powerup') {
    state.agent.powerup.lookEdited = true;
  }

  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 500);
}

/* A storage call that never settles must not freeze the app. Safari's
   IndexedDB can stall indefinitely rather than failing, so every wait on it
   is raced against a timer. Losing a save is recoverable; a frozen screen in
   front of a child is not. */
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((resolve, reject) =>
      setTimeout(() => reject(new Error((label || 'storage') + ' timed out')), ms))
  ]);
}

async function saveNow() {
  if (!state.agent) return;
  clearTimeout(saveTimer);
  try {
    await withTimeout(Storage.saveAgent(state.agent), 4000, 'save');
    await withTimeout(Storage.setMeta('lastAgentId', state.agent.id), 4000, 'save');
  } catch (err) {
    console.error('Save failed', err);
    reportError('save', err);
    toast('Could not save');
  }
}

// Also save the moment the app is backgrounded - on iOS a tab can be frozen
// without warning, so a pending 500ms timer might never fire.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveNow();
});


/* ==========================================================================
   6. SCREENS
   Only one <section class="screen"> carries the class "is-visible".
   ========================================================================== */

function showScreen(name) {
  state.screen = name;
  $$('.screen').forEach(section => {
    section.classList.toggle('is-visible', section.id === 'screen-' + name);
  });
}


/* ==========================================================================
   7. PROGRESS STRIP (spec §6)

   Each mission icon shows one of four states:
     done    - stamped (✓ over the icon)
     passed  - grey stamp
     current - glowing
     open    - not reached yet

   A mission that is not open is NOT SHOWN AT ALL (Filip, 3 November 2026).
   It used to be a padlock with a "?" - but in session 3 the only closed
   mission is Safe place, switched off by an adult, and a lock in the middle
   of the strip promised children something they could never open.

   None of this needs a new field in the data model. "How far have we got?"
   is worked out from the mission statuses plus wherever the child is now.
   ========================================================================== */

/* Is this mission open right now? (v2 §3)

   Two things decide it. The SESSION preset opens every mission whose
   `opensIn` has been reached - session 3 opens everything from sessions 2 and
   3. On top of that an adult may switch a single mission off, which is what
   `missionOn` holds. A mission the child has already worked on stays open
   whatever the setting, so nobody is locked out of their own work. */
function missionIsOpen(mission) {
  if (state.agent && state.agent.missions[mission.id] &&
      state.agent.missions[mission.id] !== 'todo') return true;
  if (state.missionOn[mission.id] === false) return false;
  if (state.missionOn[mission.id] === true) return true;
  /* v3 §3: Safe place is on the strip but OFF in the session-3 preset. An
     adult switches it on with missionOn, checked just above. */
  if (mission.defaultOn === false) return false;
  return mission.opensIn <= state.session;
}

/* Apply a session's preset (v2 §3). Clears any single-mission overrides, so
   choosing a session is always a clean starting point. */
async function setSession(session) {
  state.session = Number(session) || DEFAULT_SESSION;
  state.missionOn = {};
  await Storage.setMeta('session', state.session);
  await Storage.setMeta('missionOn', state.missionOn);
  if (state.agent) {
    if (!Array.isArray(state.agent.sessions)) state.agent.sessions = [];
    if (state.agent.sessions.indexOf(state.session) === -1) {
      state.agent.sessions.push(state.session);
    }
    logEvent('session_set', { session: state.session });
    scheduleSave();
  }
  paintSessionControls();
  renderStrip();
}

async function setMissionOn(id, on) {
  state.missionOn[id] = on;
  await Storage.setMeta('missionOn', state.missionOn);
  paintSessionControls();
  renderStrip();
}

async function setPractice(on) {
  state.practice = Boolean(on);
  await Storage.setMeta('practice', state.practice);
  if (state.agent) {
    state.agent.practice = state.practice;
    logEvent('practice_toggle', { practice: state.practice });
    scheduleSave();
  }
  paintSessionControls();
  paintPracticeBadge();
}

// A PRACTICE label, so nobody mistakes a try-out for a child's real work.
function paintPracticeBadge() {
  const on = Boolean(state.practice) || Boolean(state.agent && state.agent.practice);
  document.body.classList.toggle('is-practice', on);
}

function renderStrip() {
  if (!state.agent) return;

  // There is one strip per screen that needs it, so render into all of them.
  $$('[data-strip]').forEach(strip => {
    strip.innerHTML = '';

    MISSIONS.forEach((mission, index) => {
      // Switched off, or its session has not come: not on the strip.
      if (!missionIsOpen(mission)) return;

      const status  = state.agent.missions[mission.id];   // done | passed | todo
      const isNow   = state.screen === 'mission' && index === state.missionIndex;

      const button = document.createElement('button');
      button.className = 'pip';
      button.dataset.index = index;

      if (isNow)                    button.classList.add('is-current');
      else if (status === 'done')   button.classList.add('is-done');
      else if (status === 'passed') button.classList.add('is-passed');
      else                          button.classList.add('is-open');

      button.innerHTML = '<span class="pip-icon">' + mission.icon + '</span>' +
        (status === 'done'   ? '<span class="pip-stamp">✓</span>' : '') +
        (status === 'passed' ? '<span class="pip-stamp pip-stamp-grey">✓</span>' : '');
      button.setAttribute('aria-label', mission.title);

      // Spec §6: tapping a done or passed icon goes back to that mission.
      button.addEventListener('click', () => goToMission(index, 'back_to'));
      strip.appendChild(button);
    });

  });
}


/* ==========================================================================
   8. AGENT PREVIEW (spec §6: always visible)
   In Milestone 0 there is no artwork yet, so the preview shows the codename
   emoji. From Milestone 1 it will draw the real agent.
   ========================================================================== */

/* The emblem the child chose, wherever it is shown.

   v2 §5.1 moved it from `codenameEmoji` to `emblem.emoji`, and eight places
   were still reading the v1 field - so every v2 agent showed the generic 🕵️
   instead of its own animal, on the mission thumbnail and on the ID card.
   The v1 name is still read as a fallback for agents made before the move. */
function agentEmblem(agent) {
  const a = agent || state.agent;
  if (!a) return '🕵️';
  return (a.emblem && a.emblem.emoji) || a.codenameEmoji || '🕵️';
}

function renderPreview() {
  if (!state.agent) return;
  $('#preview-emoji').textContent = agentEmblem();
  $('#preview-name').textContent  = state.agent.codename || '';

  // From Milestone 1 the thumbnail shows the agent itself. Until anything has
  // been drawn there is nothing to show, so the codename emoji stands in.
  //
  // Milestone 2: there are now two versions of the agent, so the thumbnail has
  // to pick one. While an editor is open it mirrors whatever is being edited,
  // so the thumbnail and the stage never disagree. Anywhere else it shows the
  // Boost if one exists, because that is the agent's latest self.
  /* `state.agent[editor.part]` was right while the two halves were `cover`
     and `boost`, both top level. v2 moved the Boost to `powerup.look`, one
     level deeper, so that lookup returned the WRAPPER - which has no art on
     it, and the preview went blank for the whole of Power-up. part() already
     knows the path, so it should be the only thing that does. */
  const editorOpen = !$('#editor').hidden;
  const boost = (state.agent.powerup && state.agent.powerup.look) || {};
  const shown = editorOpen ? (part() || {})
                           : (hasArt(boost) ? boost : (state.agent.cover || {}));
  const anyArt = hasArt(shown);
  $('#preview-art').classList.toggle('has-art', anyArt);
  if (anyArt) renderAgentView($('#preview-view'), shown, false);
}


/* ==========================================================================
   9. START SCREEN - the codename roller
   ========================================================================== */

/* What the Start screen is offering, before an agent exists.
   v2 §5.1 splits the name into two reels, each of which can be locked. */
let pendingCodename = { codename: '', emoji: '', word: '', animal: '' };

/* Which reels the child has decided to keep. A locked reel does not spin.
   The 🔒 buttons under the reels were removed on 4 November 2026 (Filip:
   "do we need these?") - Roll and Type are enough, and two small padlocks
   under the name read as something locked away. So both stay false; the
   logic is kept so `codename_spin` keeps its shape in the data. */
const reelLocks = { word: false, animal: false };

let spinning = false;

/* SPIN THE REELS (v2 §5.1)

   The two reels stop one after the other, which is what makes it feel like a
   fruit machine rather than two words appearing. A locked reel is skipped
   entirely - that is the point of the lock: a child who likes "Bear" keeps it
   and re-rolls only the word. */
async function rollCodename(options) {
  const opts = options || {};
  if (spinning) return;

  const wordEl   = $('#reel-word');
  const animalEl = $('#reel-animal');
  if (!wordEl) return;                       // the Start screen is not built yet

  const bothLocked = reelLocks.word && reelLocks.animal;
  const animate = !opts.instant && fullMotion() && !bothLocked;

  if (animate) {
    spinning = true;
    playSfx('sfx-reel-spin');
    if (!reelLocks.word) wordEl.classList.add('is-spinning');
    if (!reelLocks.animal) animalEl.classList.add('is-spinning');

    // Flick through names while it spins, so the reel really is moving.
    const flicker = setInterval(() => {
      if (!reelLocks.word) wordEl.textContent = pick(ADJECTIVES);
      if (!reelLocks.animal) animalEl.textContent = pick(SPY_WORDS).name;
    }, 70);

    await wait(420);
    clearInterval(flicker);
  }

  // Settle the first reel, then the spy word a beat later. (The second reel
  // is still called `animal` in the code and the data - see SPY_WORDS.)
  if (!reelLocks.word) {
    pendingCodename.word = pick(ADJECTIVES);
  }
  if (!reelLocks.animal) {
    const spyWord = pick(SPY_WORDS);
    pendingCodename.animal = spyWord.name;
    pendingCodename.emoji  = spyWord.emoji;
  }

  if (animate) {
    wordEl.classList.remove('is-spinning');
    wordEl.textContent = pendingCodename.word;
    playSfx('sfx-reel-stop');
    await wait(220);
    animalEl.classList.remove('is-spinning');
    playSfx('sfx-reel-stop');
    spinning = false;
  }

  pendingCodename.codename = (pendingCodename.word + ' ' + pendingCodename.animal).trim();
  paintCodename();

  logEvent('codename_spin', {
    word: pendingCodename.word,
    animal: pendingCodename.animal,
    locks: { word: reelLocks.word, animal: reelLocks.animal }
  });

  // If the child re-rolls while an agent already exists, update it.
  if (state.agent) {
    applyCodenameToAgent('roll');
    renderPreview();
  }
}

// A tiny promise-based pause, so the spin reads top to bottom.
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function paintCodename() {
  const wordEl   = $('#reel-word');
  const animalEl = $('#reel-animal');
  if (!wordEl) return;

  if (!wordEl.classList.contains('is-spinning')) wordEl.textContent = pendingCodename.word;
  if (!animalEl.classList.contains('is-spinning')) animalEl.textContent = pendingCodename.animal;
  $('#codename-emoji').textContent = pendingCodename.emoji || '🕵️';

  // A typed name has no second reel, so it is hidden for one.
  $('#reel-animal').parentElement.hidden = !pendingCodename.animal;
}

/* Write whatever is on the Start screen onto the agent. `source` records HOW
   the name came about - rolled or typed - which v2 §6.1 keeps as
   `codenameSource`. */
function applyCodenameToAgent(source) {
  if (!state.agent) return;
  state.agent.codename = pendingCodename.codename;
  state.agent.codenameParts = { word: pendingCodename.word, animal: pendingCodename.animal };
  state.agent.codenameSource = source;
  // A rolled name brings its spy word's symbol with it; a typed one has
  // already set its own emblem above, so only fill in a missing one here.
  if (source === 'roll' || !state.agent.emblem || !state.agent.emblem.emoji) {
    if (!state.agent.emblem || !state.agent.emblem.asset) {
      state.agent.emblem = { emoji: pendingCodename.emoji || '🕵️', asset: null };
    }
  }
  scheduleSave();
}

/* THE HERO (v2 §5.1, changed in v3). It used to be the animal's emoji; it
   is now an empty agent with the emblem as a badge on its chest - the agent
   the child is about to make. Tapping it bounces it and says the name. */
function tapEmblem() {
  const hero = $('#emblem-hero');
  if (hero && fullMotion()) {
    hero.classList.remove('is-bouncing');
    void hero.offsetWidth;
    hero.classList.add('is-bouncing');
  }
  if (state.muted) return;
  sayCodename();
  logEvent('codename_speak', { codename: pendingCodename.codename });
}

/* A rolled name is said in the narrator's own voice, one word after the
   other: every first word and every spy word has its own recording
   (`nar-name-silent`, `nar-name-comet`…; Filip, 4 November - the iPad's
   voice sounded robotic next to the narrator). A name the child TYPED can
   only be read by the iPad's voice. A newer tap stops an older name. */
let codenameSayToken = 0;
function nameLineId(word) {
  return 'nar-name-' + String(word).toLowerCase().replace(/[^a-z]/g, '');
}
async function sayCodename() {
  sayNameWords({ word: pendingCodename.word, animal: pendingCodename.animal },
               pendingCodename.codename);
}

/* A rolled name, word by word, in the narrator's voice; a typed one can
   only be read by the iPad's voice. `parts` is { word, animal } - the
   codename's two reels (the second is still called `animal`). */
async function sayNameWords(parts, whole) {
  const word = parts.word;
  const spy = parts.animal;
  const rolled = ADJECTIVES.indexOf(word) !== -1 && SPY_WORDS.some(s => s.name === spy);
  if (!rolled) { speakWithVoice(whole || [word, spy].join(' ').trim() || 'Your spy name'); return; }
  const token = ++codenameSayToken;
  await Assets.sayAndWait(nameLineId(word), { text: word, maxMs: 2500 });
  if (token !== codenameSayToken) return;
  Assets.say(nameLineId(spy), { text: spy });
}


/* ---------------------------------------------------------------------------
   TYPE YOUR OWN SPY NAME (v2 §5.1)
   After typing, the sticker keywords are searched for each word and matching
   emblems are offered as big tiles. A word that finds nothing becomes a
   REQUEST - "📡 Request sent to HQ" - which is how a child's idea reaches
   next week's sticker list (§7). The app never promises anything.
   ------------------------------------------------------------------------ */
let typedEmblem = null;

function openTypeSheet() {
  typedEmblem = null;
  $('#type-input').value = pendingCodename.codenameTyped || '';
  $('#emblem-pick').hidden = true;
  $('#type-request').hidden = true;
  $('#emblem-options').innerHTML = '';
  $('#type-overlay').hidden = false;
  $('#type-input').focus();
  speakLine('nar-codename-type');
}

function closeTypeSheet() {
  $('#type-overlay').hidden = true;
}

/* Offer emblems for what has been typed so far. Runs as the child types, so
   the tiles appear while they are still thinking. */
function refreshEmblemOptions() {
  const text = $('#type-input').value.trim();
  const box = $('#emblem-options');
  box.innerHTML = '';

  if (text.length < 2) {
    $('#emblem-pick').hidden = true;
    $('#type-request').hidden = true;
    return;
  }

  const found = Stickers.search(text, { silly: state.silly }).slice(0, 8);
  $('#emblem-pick').hidden = found.length === 0;

  found.forEach(sticker => {
    const tile = document.createElement('button');
    tile.className = 'emblem-tile';
    const chosen = typedEmblem &&
      (typedEmblem.emoji === sticker.emoji && typedEmblem.asset === (sticker.asset || null));
    if (chosen) tile.classList.add('is-on');
    tile.innerHTML = '<span class="emblem-tile-art">' +
                     (sticker.emoji || sticker.fallback || '🧩') + '</span>' +
                     '<span class="emblem-tile-label">' + sticker.label + '</span>';
    tile.setAttribute('aria-label', sticker.label);
    tile.addEventListener('click', () => {
      typedEmblem = { emoji: sticker.emoji || null, asset: sticker.asset || null };
      logEvent('emblem_choose', { value: sticker.asset || sticker.emoji });
      refreshEmblemOptions();
    });
    box.appendChild(tile);
  });

  // Anything we could not match is recorded for next week.
  const missed = Stickers.unmatchedWords(text, { silly: state.silly });
  $('#type-request').hidden = missed.length === 0;
}

function confirmTypedCodename() {
  const text = $('#type-input').value.trim().slice(0, 20);
  if (!text) { closeTypeSheet(); return; }

  pendingCodename.codename = text;
  pendingCodename.word = text;
  pendingCodename.animal = '';          // a typed name has no animal reel

  /* v2 §5.1: "The child picks one or keeps 🕵️." A typed name is a fresh
     start, so it does NOT inherit the animal from a roll the child has just
     replaced - that animal belonged to a different name. */
  pendingCodename.emoji = typedEmblem ? (typedEmblem.emoji || '🕵️') : '🕵️';

  logEvent('codename_type', { text: text });

  // Words with no sticker become requests: Filip's to-do list for next week.
  const missed = Stickers.unmatchedWords(text, { silly: state.silly });
  if (missed.length && state.agent) {
    missed.forEach(word => {
      state.agent.requests.push({ word: word, where: 'codename-type', t: nowIso() });
      logEvent('sticker_request', { word: word });
    });
    speakLine('nar-codename-request');
  }

  if (state.agent) {
    state.agent.emblem = typedEmblem
      ? { emoji: typedEmblem.emoji, asset: typedEmblem.asset }
      : { emoji: '🕵️', asset: null };
    applyCodenameToAgent('type');
    renderPreview();
  }

  paintCodename();
  closeTypeSheet();
}


/* ---------------------------------------------------------------------------
   THE GALLERY (v2 §5.2)
   Every agent on this iPad, shown as its emblem and codename only. A child
   finds their own by its symbol. Children may carry an agent across weeks,
   which is the whole reason this exists.
   ------------------------------------------------------------------------ */
async function renderGallery() {
  const block = $('#gallery-block');
  const box = $('#gallery');
  if (!box) return;

  const agents = (await Storage.listAgents()).map(migrateAgent);
  window.__agentLabAgents = agents.length;   // boot-guard.js reports this
  block.hidden = agents.length === 0;
  box.innerHTML = '';
  if (agents.length === 0) return;

  /* v3 §4: EVERY tile shows the agent itself, not just its emblem. Children
     will not remember a codename a month on, but they know their own drawing
     on sight. (In v2 only tiles whose codename clashed did this; that is now
     the rule for all of them.)

     Two exceptions keep the emblem: a SEALED agent, because sealing was the
     child's choice to keep it private - its picture would undo that - and an
     agent with nothing drawn yet, which would otherwise be an empty box. */
  const hasArt = agent => {
    const c = agent.cover || {};
    return Boolean(
      (c.shapes && c.shapes.length) ||
      c.drawingPng ||
      (c.stickers && c.stickers.length) ||
      (c.pixels && c.pixels.some(p => p))
    );
  };

  agents.forEach(agent => {
    const tile = document.createElement('button');
    tile.className = 'gallery-tile' + (agent.practice ? ' is-practice-agent' : '');
    const emblem = (agent.emblem && agent.emblem.emoji) || '🕵️';
    const showAgent = hasArt(agent) && !agent.seal;

    tile.innerHTML =
      (showAgent
        ? '<span class="gallery-agent agent-view" data-door="pixel">' +
            '<canvas class="agent-pixels" width="16" height="16"></canvas>' +
            '<img class="agent-drawing" alt="" hidden>' +
            '<svg class="agent-shapes" viewBox="0 0 100 100" aria-hidden="true" hidden></svg>' +
            '<span class="sticker-layer"></span>' +
          '</span>'
        : '<span class="gallery-emblem">' + emblem + '</span>') +
      '<span class="gallery-name">' + (agent.codename || 'Agent') + '</span>' +
      (agent.practice ? '<span class="gallery-practice">PRACTICE</span>' : '');

    // Draw this agent - not the one that happens to be open (see
    // renderAgentView's `owner`).
    if (showAgent) {
      const view = tile.querySelector('.gallery-agent');
      renderAgentView(view, agent.cover || {}, false, agent.door, agent);
    }
    // v2 §5.2: a sealed tile shows the lock and asks before it opens.
    if (agent.seal) {
      tile.insertAdjacentHTML('beforeend', '<span class="tile-lock">🔒</span>');
      tile.classList.add('is-sealed');
    }
    tile.setAttribute('aria-label',
      (agent.seal ? 'Sealed: ' : 'Open ') + (agent.codename || 'agent'));
    tile.addEventListener('click', () => {
      if (agent.seal) askForSeal(agent, openAgentFromGallery);
      else openAgentFromGallery(agent.id);
    });
    box.appendChild(tile);
  });
}

/* Open an agent where it left off (v2 §5.2). The same walk Continue uses:
   the first mission that is open this session and not yet finished. */
async function openAgentFromGallery(id) {
  let loaded;
  try { loaded = await withTimeout(Storage.loadAgent(id), 4000, 'read'); }
  catch (err) { reportError('open agent', err); toast('Could not open that agent'); return; }
  const agent = migrateAgent(loaded);
  if (!agent) return;

  state.agent = agent;
  state.onReveal = false;
  noteSession(state.agent);
  await Storage.setMeta('lastAgentId', agent.id);

  pendingCodename = {
    codename: agent.codename || '',
    emoji: (agent.emblem && agent.emblem.emoji) || agent.codenameEmoji || '🕵️',
    word: (agent.codenameParts && agent.codenameParts.word) || '',
    animal: (agent.codenameParts && agent.codenameParts.animal) || ''
  };
  paintPracticeBadge();
  logEvent('agent_open', { from: 'gallery' });

  let index = MISSIONS.findIndex(m => missionIsOpen(m) && agent.missions[m.id] === 'todo');
  if (index === -1) {
    const anyOpen = MISSIONS.findIndex(missionIsOpen);
    index = anyOpen === -1 ? 0 : anyOpen;
  }
  goToMission(index, 'mission_enter');
  askLikeMeOnOpen();
}

// A brand new agent, shaped exactly like spec §8.
/* The v2 agent (v2 spec §6.1). Every field has a default, so a brand-new
   agent and a migrated v1 agent end up the same shape. */
/* An agent worked on this week records that (v2 §3), so the research data
   shows which sessions each agent was built across. */
function noteSession(agent) {
  if (!agent) return;
  if (!Array.isArray(agent.sessions)) agent.sessions = [];
  if (agent.sessions.indexOf(state.session) === -1) {
    agent.sessions.push(state.session);
    scheduleSave();
  }
}

function makeAgent() {
  /* Built as v2 always was, then given its v3 fields by fillDefaults(), so
     there is one place that knows what a v3 agent holds. */
  return fillDefaults({
    schemaVersion: 3,
    id: uuid(),
    createdAt: nowIso(),
    sessions: [state.session],
    practice: state.practice,

    codename: pendingCodename.codename,
    codenameParts: { word: pendingCodename.word || '', animal: pendingCodename.animal || '' },
    codenameSource: 'roll',
    // The emblem is the child's icon: on the agent, and on the badge (§5.1).
    emblem: { emoji: pendingCodename.emoji || '🕵️', asset: null },
    seal: null,

    door: null,
    cover: { pixels: [], shapes: [], drawingPng: null, stickers: [] },

    powerup: {
      look: { pixels: [], shapes: [], drawingPng: null, stickers: [], glow: null },
      power: { png: null, audioId: null, idea: null, effect: null },
      when: [],
      whenOwn: []
    },

    hq: { id: null, png: null },

    voice: { audioId: null, filter: 'normal', threeWays: [null, null, null] },

    field: {
      size: 'm', texture: 'none', colour: null,
      reactions: { friend: null, teacher: null, new: null }
    },

    moodCodes: [],
    rules: [],

    placements: { badge: [], pocket: [], wall: [] },

    missing: [],
    requests: [],
    missions: blankMissions(),
    events: [],
    legacy: {}
  });
}

// Every mission starts as 'todo'. Written from MISSIONS so adding a mission
// to that list is the only place a new id has to be typed.
function blankMissions() {
  const out = {};
  MISSIONS.forEach(m => { out[m.id] = 'todo'; });
  return out;
}


/* ---------------------------------------------------------------------------
   MIGRATING A v1 AGENT (v2 spec §6.2)

   Runs on EVERY load, and is safe to run twice: it only ever fills in what is
   missing. It never deletes anything - the original v1 fields are copied into
   `legacy` so an export made next year is still readable, and so a mistake
   here cannot cost a child their work.
   ------------------------------------------------------------------------ */

// v1 Boost backgrounds became HQ places.
const V1_BACKGROUND_TO_HQ = {
  space:  'hq-space',
  jungle: 'hq-jungle',
  sea:    'hq-underwater',
  city:   'hq-city-rooftop',
  sunset: 'hq-sky-castle'
  // 'plain' meant no place at all, so those agents get no HQ.
};

function migrateAgent(agent) {
  if (!agent || typeof agent !== 'object') return agent;

  /* --- the Build door is called Parts in v2 §5.3 ---
     This runs BEFORE the v2 early return, because agents made during V0-V3 are
     already schemaVersion 2 and may still say "build". renderAgentView() only
     draws shapes for 'parts', so an agent that missed this would quietly lose
     its face. The child always saw "Parts"; only the stored value and the
     research log said "build". */
  if (agent.door === 'build') agent.door = 'parts';

  /* v2 and v3 agents need only their defaults filled in. fillDefaults() is
     where v3's fields are added and schemaVersion becomes 3 - so every path
     through here, v1 included, ends up a v3 agent. */
  if (agent.schemaVersion === 2 || agent.schemaVersion === 3) return fillDefaults(agent);

  const legacy = agent.legacy || {};

  // --- the Boost becomes the Power-up's look ---
  if (agent.boost && !agent.powerup) {
    agent.powerup = {
      look: {
        pixels: agent.boost.pixels || [],
        shapes: agent.boost.shapes || [],
        drawingPng: agent.boost.drawingPng || null,
        stickers: agent.boost.stickers || [],
        glow: agent.boost.aura || null
      },
      power: { png: null, audioId: null, idea: null, effect: null },
      when: [],
      whenOwn: []
    };
    if (!agent.hq) {
      agent.hq = { id: V1_BACKGROUND_TO_HQ[agent.boost.background] || null, png: null };
    }
    legacy.boost = agent.boost;
    delete agent.boost;
  }

  // --- feeling codes become mood codes with no moment ---
  if (Array.isArray(agent.feelingCodes) && !agent.moodCodes) {
    agent.moodCodes = agent.feelingCodes.map(code => ({
      situation: null, situationOwn: null,
      face: null,
      move: code.move || 'still',
      fieldChange: null,
      sign: { png: code.png || null, audioId: code.audioId || null },
      readers: [],
      firstStep: null
    }));
    // The old `face` has no home in v2's face (eyes/brows/mouth), so it is
    // kept rather than guessed at.
    legacy.feelingCodes = agent.feelingCodes;
    legacy.feelingWorn = agent.feelingWorn;
    delete agent.feelingCodes;
    delete agent.feelingWorn;
  }

  // --- the voice bonus clips get their v2 name ---
  if (agent.voice && agent.voice.yesClips && !agent.voice.threeWays) {
    agent.voice.threeWays = agent.voice.yesClips;
    delete agent.voice.yesClips;
  }

  // --- the old rules object becomes an empty list of v2 sentence rules ---
  if (agent.rules && !Array.isArray(agent.rules)) {
    legacy.rules = agent.rules;
    agent.rules = [];
  }

  // --- places have no v2 equivalent until Badge & poster (V8) ---
  if (agent.places) { legacy.places = agent.places; delete agent.places; }

  // --- the codename emoji becomes the emblem ---
  if (agent.codenameEmoji && !agent.emblem) {
    agent.emblem = { emoji: agent.codenameEmoji, asset: null };
  }

  // --- mission ids become words ---
  if (agent.missions && agent.missions.m1 !== undefined) {
    legacy.missions = agent.missions;
    const old = agent.missions;
    agent.missions = blankMissions();
    if (old.m1) agent.missions.make = old.m1;
    if (old.m2) agent.missions.powerup = old.m2;
    if (old.m4) agent.missions.voice = old.m4;
    // m3, m5 and m6 belonged to screens that v2 redesigns, so those missions
    // start again rather than being marked done on the strength of v1 work.
  }

  agent.legacy = legacy;
  agent.schemaVersion = 2;
  return fillDefaults(agent);
}

/* Add any field a v2 agent should have but does not. This is what makes
   migrateAgent safe to run twice, and it also repairs an agent saved by an
   older V-milestone. */
function fillDefaults(agent) {
  const blank = {
    sessions: [], practice: false,
    codenameParts: { word: '', animal: '' },
    codenameSource: 'roll',
    emblem: { emoji: agent.codenameEmoji || '🕵️', asset: null },
    seal: null,
    cover: { pixels: [], shapes: [], drawingPng: null, stickers: [] },
    powerup: { look: { pixels: [], shapes: [], drawingPng: null, stickers: [], glow: null },
               power: { png: null, audioId: null, idea: null, effect: null },
               when: [], whenOwn: [],
               // false = still mirroring the Cover (see copyCoverToPowerup)
               lookEdited: false },
    hq: { id: null, png: null },
    voice: { audioId: null, filter: 'normal', threeWays: [null, null, null] },
    field: { size: 'm', texture: 'none', colour: null,
             reactions: { friend: null, teacher: null, new: null } },
    moodCodes: [], rules: [],
    placements: { badge: [], pocket: [], wall: [] },
    missing: [], requests: [], events: [], legacy: {},

    /* ---- v3 (agent-lab-v3-spec.md §10). Only ADDED: nothing from v1 or v2
       is renamed, moved or removed, so a session-2 agent keeps every field it
       had and a fresh export still carries all of it. ---- */
    likeMe: null,          // 'likeme-like' | 'likeme-bit' | 'likeme-else'
    base: null,            // 'base-1' … 'base-8' | 'blank'
    // 🗣️ How my agent talks. Each card goes on ONE of three piles per step:
    // likes / likesUnsure / likesNot, and school / schoolUnsure / schoolNot
    // (👍 🤷 👎). `best` is the one the agent likes most. The three-pile
    // sort, `best` and `secretWord` were added on 3 November 2026, at
    // Filip's request after he tried P3 (see DATA.md).
    suit: { likes: [], likesUnsure: [], likesNot: [], likesOwn: [],
            school: [], schoolUnsure: [], schoolNot: [], schoolOwn: [],
            best: null },
    secretWord: null,      // { audioId, filter } - an invented word, said
    handshake: null,       // { taps: [0, 310, 620] }  ms from the first tap
    safe: { talk: null, stops: null },
    powers: [],            // up to 3; see DATA.md for the shape of one
    bottles: []            // up to 3; see DATA.md
  };

  Object.keys(blank).forEach(key => {
    if (agent[key] === undefined) agent[key] = blank[key];
    // null is a real answer for some v3 fields (likeMe, base, handshake), so
    // it is only replaced where the blank is an object or a list.
    else if (agent[key] === null && blank[key] !== null) agent[key] = blank[key];
  });

  // A v3 object that exists but is missing a key - from a half-finished
  // import, say - gets the missing key and keeps everything it had.
  ['likes', 'likesUnsure', 'likesNot', 'likesOwn',
   'school', 'schoolUnsure', 'schoolNot', 'schoolOwn'].forEach(k => {
    if (!Array.isArray(agent.suit[k])) agent.suit[k] = [];
  });
  if (agent.suit.best === undefined) agent.suit.best = null;
  if (agent.safe.talk === undefined) agent.safe.talk = null;
  if (agent.safe.stops === undefined) agent.safe.stops = null;
  if (!Array.isArray(agent.powers)) agent.powers = [];
  if (!Array.isArray(agent.bottles)) agent.bottles = [];

  agent.schemaVersion = 3;

  if (!agent.missions) agent.missions = blankMissions();
  /* A mission added later must appear on an older agent. In v3 that means
     suit, safe, powers and bottle arrive as 'todo'; Make is already there, so
     it keeps whatever session 2 gave it; and the v2 keys (powerup, hq, voice,
     …) are left exactly as they were - they are research data, not clutter. */
  MISSIONS.forEach(m => {
    if (agent.missions[m.id] === undefined) agent.missions[m.id] = 'todo';
  });
  if (!Array.isArray(agent.sessions)) agent.sessions = [];
  if (!Array.isArray(agent.requests)) agent.requests = [];
  if (!Array.isArray(agent.rules)) agent.rules = [];
  return agent;
}

async function startNewAgent() {
  if (!pendingCodename.codename) await rollCodename({ instant: true });
  state.agent = makeAgent();
  state.onReveal = false;
  logEvent('agent_create', { codename: state.agent.codename });

  /* Go to the mission FIRST, then save.

     This used to `await saveNow()` before moving. A rejected save was
     handled, but a save that never SETTLES was not - and IndexedDB on iOS
     Safari does stall, particularly after a page comes back from the
     back-forward cache. The child then tapped New agent and nothing at all
     happened, which is indistinguishable from a dead button.

     Nothing is lost by reordering: the agent is in memory, the save runs
     straight after, and the debounced auto-save catches it again on the
     first change. */
  goToMission(0, 'mission_enter');
  saveNow();
}

// Spec §7: Continue resumes the last UNFINISHED agent only.
async function continueAgent() {
  /* These two have to finish before anything can be shown - the agent IS the
     answer here - but they still must not hang forever (see withTimeout). */
  let lastId, agent;
  try {
    lastId = await withTimeout(Storage.getMeta('lastAgentId', null), 4000, 'read');
    if (!lastId) return;
    agent = await withTimeout(Storage.loadAgent(lastId), 4000, 'read');
  } catch (err) {
    reportError('continue', err);
    toast('Could not open that agent');
    return;
  }
  if (!agent) return;

  state.agent = migrateAgent(agent);        // v2 §6.2
  noteSession(state.agent);
  state.onReveal = false;
  pendingCodename = { codename: agent.codename, emoji: agentEmblem(agent) };

  // Drop the child back on the first OPEN mission they have not finished.
  let index = MISSIONS.findIndex(m => missionIsOpen(m) && agent.missions[m.id] === 'todo');
  if (index === -1) index = MISSIONS.findIndex(missionIsOpen);
  if (index === -1) index = 0;
  goToMission(index, 'mission_enter');
  askLikeMeOnOpen();
}

// Decide whether to offer Continue, by checking for an unfinished agent.
async function refreshContinueButton() {
  const lastId = await Storage.getMeta('lastAgentId', null);
  let show = false;
  if (lastId) {
    const agent = migrateAgent(await Storage.loadAgent(lastId));
    if (agent) {
      // "Unfinished" = at least one mission that is OPEN this session is
      // still todo. A mission locked until session 4 does not count.
      show = MISSIONS.some(m => missionIsOpen(m) && agent.missions[m.id] === 'todo');
    }
  }
  $('#btn-continue').hidden = !show;
}


/* ==========================================================================
   10. MISSIONS - navigation, Stamp it, Pass
   ========================================================================== */

// Record that we are leaving wherever we were, so the time maths works.
function leaveCurrent() {
  // Milestone 3: a recording or a playback must never carry on into the next
  // screen. Stopping the recorder also hands the microphone back (spec §9).
  if (typeof Voice !== 'undefined') { Voice.stop(); Voice.stopPlayback(); }
  // v2 §4.1: sweep up any drag preview stranded on <body>.
  if (typeof clearDragLeftovers === 'function') clearDragLeftovers();
  // v3 §5: keep a handshake being tapped, and stop one playing back; and
  // let no "next part" timer from How my agent talks fire on another screen.
  if (typeof stopHandshake === 'function') stopHandshake();
  if (typeof stopSuit === 'function') stopSuit();
  if (typeof stopPowers === 'function') stopPowers();
  if (typeof stopBottle === 'function') stopBottle();
  if (state.screen === 'mission' || state.onReveal) logEvent('mission_leave', {});
}

function goToMission(index, reasonAction) {
  leaveCurrent();
  state.onReveal = false;
  state.missionIndex = Math.max(0, Math.min(MISSIONS.length - 1, index));

  showScreen('mission');

  const mission = MISSIONS[state.missionIndex];
  // Spec §5a: the scanner sweeps and the title decrypts as a mission opens.
  scannerSweep();
  decryptTitle($('#mission-title'), mission.title);

  // Show only this mission's panel.
  $$('.mission-panel').forEach(panel => {
    panel.classList.toggle('is-visible', panel.dataset.mission === mission.id);
  });

  renderStrip();
  renderPreview();

  // Logged BEFORE the mission sets itself up, so that anything the setup logs
  // (Mission 2's boost_copy, for one) lands after the arrival in the event log
  // and the research timeline reads in the order things actually happened.
  logEvent(reasonAction === 'back_to' ? 'back_to' : 'mission_enter', { mission: mission.id });
  stampWasReady = null;

  /* Each mission sets itself up as it opens. Only Make uses the shared
     editor. The four v3 missions are "coming soon" placeholders at P0, so
     they just put the editor away; each gets its own enter function when its
     milestone builds it (suit P3, safe P4, powers P5, bottle P6). */
  if (mission.id === 'make') enterMake();
  else if (mission.id === 'suit') enterSuit();
  else if (mission.id === 'safe') enterSafe();
  else if (mission.id === 'powers') enterPowers();
  else if (mission.id === 'bottle') enterBottle();
  else hideEditor();
  paintStamp();
}

/* HAS THIS MISSION BEEN DONE? Stamp it waits quietly until it has (v84,
   Filip: children reached for the big yellow Stamp it before anything
   else). Never a lock: a waiting Stamp it still works, and Pass is always
   there. "Done" is the smallest thing that makes the mission mean
   something: a face on the agent, every "likes" card sorted, a safe place,
   one power, one bottle kept or sent. */
function missionReady(id) {
  const a = state.agent;
  if (!a) return true;
  if (id === 'make') return Boolean(a.cover && ((a.cover.shapes || []).length ||
                                                 a.cover.drawingPng || (a.cover.pixels || []).some(Boolean)));
  if (id === 'suit') return TALK_MODES.every(m => pileOf('likes', m.id));
  if (id === 'safe') return Boolean(a.safe && a.safe.talk);
  if (id === 'powers') return a.powers.some(p => p.power);
  if (id === 'bottle') return a.bottles.some(b => b.state !== 'open');
  return true;
}

/* Lists that may be longer than their space fade at the bottom while
   there is more below (style.css, .has-more). Measured after the browser
   has laid the list out, and again whenever one is scrolled. */
const FADE_LISTS = '#powers-slot-cards, #powers-door-cards, #powers-door-grid, ' +
                   '#bottle-tokens, #suit-best-cards, #bottle-disguise';
function updateFades() {
  // Reading scrollHeight makes the browser lay the list out first, so
  // this is right straight after a paint - no need to wait for a frame.
  $$(FADE_LISTS).forEach(el => {
    el.classList.toggle('has-more', el.scrollHeight - el.clientHeight - el.scrollTop > 4);
  });
}
document.addEventListener('scroll', e => {
  if (e.target && e.target.matches && e.target.matches(FADE_LISTS)) updateFades();
}, true);
window.addEventListener('resize', updateFades);

let stampWasReady = null;
function paintStamp() {
  const stamp = $('#btn-stamp');
  if (!stamp || state.screen !== 'mission') return;
  const ready = missionReady(currentMissionId());
  stamp.classList.toggle('is-waiting', !ready);
  // The moment it becomes ready, it pops once to say "now you can".
  if (ready && stampWasReady === false) {
    stamp.classList.remove('is-ready-now');
    void stamp.offsetWidth;
    stamp.classList.add('is-ready-now');
  }
  stampWasReady = ready;
}

// Stamp it ✓ : this mission is done, move on.
function stampMission() {
  if (!state.agent) return;
  const mission = MISSIONS[state.missionIndex];
  state.agent.missions[mission.id] = 'done';
  logEvent('stamp', { mission: mission.id });
  playStampFeedback();
  // v3 §4: "Is your agent like you?" comes right after Make is stamped -
  // once per agent. askLikeMe() carries straight on if it was asked before.
  if (mission.id === 'make') askLikeMe('stamp', advance);
  else advance();
}

// Pass : skip this mission, grey stamp, logged (spec §6).
function passMission() {
  if (!state.agent) return;
  const mission = MISSIONS[state.missionIndex];
  state.agent.missions[mission.id] = 'passed';
  logEvent('pass', { mission: mission.id });
  advance();
}

/* Move to the next OPEN mission (v2 §3). Walking by index alone would drop a
   child into a mission that this session has not unlocked. */
function advance() {
  saveNow();
  for (let i = state.missionIndex + 1; i < MISSIONS.length; i++) {
    if (missionIsOpen(MISSIONS[i])) { goToMission(i, 'mission_enter'); return; }
  }
  /* v3 §3: there is no card screen any more - a short finish, then back to
     the start. */
  showFinish();
}

/* THE FINISH (v3 §3): the agent, big, with its powers' icons, and the
   stamp; "Mission complete. Well done, agent." Then 🏠 to the start. */
function showFinish() {
  if (!state.agent) { finishSession(); return; }
  renderAgentView($('#finish-stage'), state.agent.cover, false);
  const row = $('#finish-powers');
  row.innerHTML = '';
  state.agent.powers.forEach(p => {
    if (!p.power) return;
    if (p.own && p.own.png && (p.power === 'own' || p.power === 'v2')) {
      const img = document.createElement('img');
      img.alt = '';
      img.src = p.own.png;
      row.appendChild(img);
    } else {
      const span = document.createElement('span');
      span.textContent = powerEmoji(p);
      row.appendChild(span);
    }
  });
  // The stamp lands again each time (the animation restarts).
  const stamp = $('#finish-stamp');
  stamp.style.animation = 'none';
  void stamp.offsetWidth;
  stamp.style.animation = '';
  $('#finish-overlay').hidden = false;
  playSfx('sfx-stamp');
  speakLine('nar-card-finish');
}

function closeFinish() {
  $('#finish-overlay').hidden = true;
  finishSession();
}

// Spec §5a: the stamp lands with a thud and a few sparkles.
function playStampFeedback() {
  const button = $('#btn-stamp');
  button.classList.remove('stamp-kick');
  void button.offsetWidth;           // forces the browser to restart the animation
  button.classList.add('stamp-kick');
  playSfx('sfx-stamp');
  Effects.burstAt(button, { count: 22, spread: 6 });
}

/* 🏠 Back to the start, WITHOUT finishing the agent.

   Replaces 🧩 "Something's missing" on the top bar (7 October iPad test). A
   child who opened the wrong agent - easily done when two share a codename -
   had no way out except reaching the card and tapping Finish, which marked
   somebody else's agent as done.

   The agent is saved on the way out, exactly as it stands, and keeps its
   place in the gallery. Nothing is stamped and nothing is lost. */
async function goHome() {
  if (state.agent) {
    logEvent('go_home', { from: currentMissionId() });
    await saveNow();
  }
  leaveCurrent();
  state.agent = null;
  state.onReveal = false;
  showScreen('start');
  rollCodename({ instant: true });
  await refreshContinueButton();
  await renderGallery();
}

async function finishSession() {
  logEvent('finish', {});
  await saveNow();
  state.agent = null;
  state.onReveal = false;
  showScreen('start');
  rollCodename({ instant: true });
  await refreshContinueButton();
  await renderGallery();           // v2 §5.2
}


/* ==========================================================================
   11. GLOBAL BUTTONS: mute, 🔊 speak, 🧩 something's missing
   ========================================================================== */

async function toggleMute() {
  state.muted = !state.muted;
  Voice.setMuted(state.muted);
  if (state.muted && 'speechSynthesis' in window) speechSynthesis.cancel();
  await Storage.setMeta('muted', state.muted);
  paintMuteButtons();
  logEvent('mute_toggle', { muted: state.muted });
}

function paintMuteButtons() {
  $$('[data-mute]').forEach(button => {
    const isAdultButton = button.id === 'btn-adult-mute';
    const icon = state.muted ? '🔇' : '🔊';
    button.textContent = isAdultButton ? icon + (state.muted ? ' Off' : ' On') : icon;
  });
}

/* ==========================================================================
   12. ADULT PANEL (spec §7.9)
   Reached by holding the logo for 3 seconds, then entering the PIN.
   ========================================================================== */

// ---- the 3-second long press on the logo ----
let holdTimer = null;

function startHold() {
  const bar = $('#logo-hold');
  bar.classList.add('is-filling');
  holdTimer = setTimeout(() => {
    bar.classList.remove('is-filling');
    openPinPad();
  }, 3000);
}

function cancelHold() {
  clearTimeout(holdTimer);
  $('#logo-hold').classList.remove('is-filling');
}

// ---- the PIN pad ----
function openPinPad() {
  state.pinEntry = '';
  paintPinDots();
  showScreen('pin');
}

function buildPinPad() {
  const pad = $('#pin-pad');
  ['1','2','3','4','5','6','7','8','9','⌫','0','✓'].forEach(label => {
    const button = document.createElement('button');
    button.className = 'btn pin-key';
    button.textContent = label;
    button.addEventListener('click', () => pressPinKey(label));
    pad.appendChild(button);
  });
}

function pressPinKey(label) {
  if (label === '⌫') {
    state.pinEntry = state.pinEntry.slice(0, -1);
  } else if (label === '✓') {
    return submitPin();
  } else if (state.pinEntry.length < 4) {
    state.pinEntry += label;
  }
  paintPinDots();
  if (state.pinEntry.length === 4) submitPin();
}

function paintPinDots() {
  $$('#pin-dots i').forEach((dot, index) => {
    dot.classList.toggle('is-filled', index < state.pinEntry.length);
  });
}

function submitPin() {
  if (state.pinEntry === ADULT_PIN) {
    state.pinEntry = '';
    openAdultPanel();
  } else {
    state.pinEntry = '';
    paintPinDots();
    $('#pin-dots').classList.add('is-wrong');
    setTimeout(() => $('#pin-dots').classList.remove('is-wrong'), 500);
  }
}

// ---- the panel itself ----
async function openAdultPanel() {
  showScreen('adult');
  await renderAgentList();
  paintSessionControls();
  paintMuteButtons();
  paintMotionButtons();
  paintSpeedButtons();
  paintBackupState();
  paintDisplayLink('');
  paintWaitingCount();
  $('#export-result').innerHTML = '';
  $('#delete-confirm').hidden = true;
}

async function renderAgentList() {
  const list   = $('#agent-list');
  // v2 §6.2: migrate on every load, so the panel never shows a v1 shape.
  const agents = (await Storage.listAgents()).map(migrateAgent);

  if (agents.length === 0) {
    list.innerHTML = '<p class="adult-note">No agents saved yet.</p>';
    return;
  }

  list.innerHTML = '';
  agents.forEach(agent => {
    const done   = MISSIONS.filter(m => agent.missions[m.id] === 'done').length;
    const passed = MISSIONS.filter(m => agent.missions[m.id] === 'passed').length;

    const row = document.createElement('div');
    row.className = 'agent-row';
    row.innerHTML =
      '<span class="agent-thumb">' + agentEmblem(agent) + '</span>' +
      '<span class="agent-meta">' +
        '<b>' + escapeHtml(agent.codename || '(no codename)') + '</b>' +
        '<small>' + new Date(agent.createdAt).toLocaleString() + '</small>' +
        '<small>' + done + ' done · ' + passed + ' passed · ' +
                    agent.events.length + ' events</small>' +
      '</span>';

    const openButton = document.createElement('button');
    openButton.className = 'btn';
    openButton.textContent = 'Open';
    openButton.addEventListener('click', () => {
      state.agent = agent;
      pendingCodename = { codename: agent.codename, emoji: agentEmblem(agent) };
      goToMission(0, 'mission_enter');
    });

    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn btn-danger';
    deleteButton.textContent = '🗑️';
    deleteButton.addEventListener('click', async () => {
      // Single confirmation for one agent; "delete all" asks twice (spec §7.9).
      if (!confirm('Delete ' + (agent.codename || 'this agent') + '?')) return;
      await Storage.deleteAgent(agent.id);
      if (state.agent && state.agent.id === agent.id) state.agent = null;
      await renderAgentList();
    });

    row.appendChild(openButton);
    row.appendChild(deleteButton);
    list.appendChild(row);
  });
}

// Codenames are app-generated, but a typed one could contain < or &, which
// would break the HTML above. This makes any text safe to insert.
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

/* ---- Export (spec §7.9 and §14) ----
   One JSON file holding every agent, every event, and (from Milestone 3) the
   recordings as base64. navigator.share is preferred because <a download> is
   unreliable in a home-screen app (spec §9). */
/* HAS THIS iPAD'S WORK BEEN SAVED ANYWHERE ELSE?

   Agents live in IndexedDB, which is part of Safari's website data for this
   site - so "Clear History and Website Data" deletes every one of them. It
   has already happened once in testing. The export is the only copy that
   survives that, so the panel says plainly how many agents are on this iPad
   and when they were last exported. */
/* Is this the home-screen app or a browser tab? iOS answers with
   navigator.standalone; everywhere else it is the display-mode media query.
   It matters because on iPad the two have SEPARATE storage - agents made in
   a Safari tab are not in the home-screen app, and the other way round. */
function installedToHomeScreen() {
  if (window.navigator.standalone) return true;
  return window.matchMedia &&
         window.matchMedia('(display-mode: standalone)').matches;
}

async function paintBackupState() {
  const box = $('#backup-state');
  if (!box) return;

  const agents = await Storage.listAgents();
  const last = await Storage.getMeta('lastExportAt', null);
  const lastCount = await Storage.getMeta('lastExportCount', 0);

  if (!agents.length) { box.textContent = 'No agents on this iPad yet.'; box.className = 'backup-state'; return; }

  if (!last) {
    box.className = 'backup-state is-warn';
    box.textContent = '⚠️ ' + agents.length + ' agent' + (agents.length === 1 ? '' : 's') +
      ' on this iPad, never exported. Clearing Safari\u2019s history would delete them.';
    return;
  }

  const when = new Date(last);
  const mins = Math.round((Date.now() - when.getTime()) / 60000);
  const ago = mins < 1 ? 'just now'
            : mins < 60 ? mins + ' min ago'
            : when.toLocaleString();
  const since = agents.length - lastCount;

  box.className = 'backup-state' + (since > 0 ? ' is-warn' : ' is-ok');
  box.textContent = (since > 0 ? '⚠️ ' : '✅ ') +
    agents.length + ' agent' + (agents.length === 1 ? '' : 's') + ' on this iPad · ' +
    'last export ' + ago +
    (since > 0 ? ' · ' + since + ' added since' : '');
}

async function exportAll() {
  const result = $('#export-result');
  result.textContent = 'Building file…';

  try {
    let agents = (await Storage.listAgents()).map(migrateAgent);

    /* v2 §3: practice agents are left out unless the adult ticks the box, so
       a facilitator trying the app out never lands in the research data. */
    const includePractice = $('#chk-include-practice') &&
                            $('#chk-include-practice').checked;
    if (!includePractice) agents = agents.filter(a => !a.practice);

    const clips  = (await Storage.listAudio()) || [];

    // Turn each audio Blob into base64 text so it fits inside JSON.
    const audio = {};
    for (const clip of clips) audio[clip.id] = await blobToDataUrl(clip.blob);

    const payload = {
      app: 'Agent Lab',
      exportedAt: nowIso(),
      milestone: MILESTONE,
      schemaVersion: 3,              // v3 §10: every agent below is v3, v2 fields intact
      includesPractice: Boolean(includePractice),
      agentCount: agents.length,
      agents: agents,
      audio: audio
    };

    const date     = new Date().toISOString().slice(0, 10);   // YYYY-MM-DD
    const filename = 'agent-lab-export-' + date + '.json';
    const blob     = new Blob([JSON.stringify(payload, null, 2)],
                              { type: 'application/json' });

    // Preferred route on iPad: the share sheet.
    const file = new File([blob], filename, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      result.textContent = 'Shared ' + filename;
      await noteExport(agents.length);
      return;
    }

    // Fallback: a tap-to-download link.
    const url  = URL.createObjectURL(blob);
    result.innerHTML = '';
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.className = 'btn btn-accent';
    link.textContent = '⬇️ ' + filename;
    link.addEventListener('click', () => noteExport(agents.length));
    result.appendChild(link);

  } catch (err) {
    console.error(err);
    result.textContent = 'Export failed: ' + err.message;
  }
}

/* ---------------------------------------------------------------------------
   IMPORT (v2 §5.2)

   The other half of Export, and the one that makes the export worth doing:
   agents live in this browser's website data, so clearing it deletes them.
   An exported file puts them back - on this iPad after a wipe, or on a
   different one when a child does not get the same device next week.

   It ADDS; it never replaces. For each agent in the file (v3 §14, P0):
     - not on this iPad          -> ADDED, with its own id;
     - here already, unchanged   -> SKIPPED, because adding it again would
                                    only put a duplicate tile in the gallery;
     - here already, but changed -> COPIED in as a new agent alongside, so a
                                    child's later work is never overwritten.
   Several files can be picked at once (`multiple` on the file input), which
   is how a whole class's exports from several iPads come back in one go.
   ------------------------------------------------------------------------ */
/* Turn an exported "data:audio/mp4;base64,…" string back into a Blob.

   Decoded by hand rather than with fetch(). The app's Content-Security-Policy
   sets `connect-src 'self'`, which blocks fetching a data: URL - so the
   recordings silently failed to restore while the agents came back fine, and
   the only sign was a message that did not mention them. The voices are the
   least replaceable thing in an export. */
function dataUrlToBlob(dataUrl) {
  const comma = String(dataUrl).indexOf(',');
  const header = String(dataUrl).slice(0, comma);
  const base64 = String(dataUrl).slice(comma + 1);
  const type = (header.match(/^data:([^;]+)/) || [, 'application/octet-stream'])[1];

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: type });
}

/* "Is this the same agent, with nothing new in it?" v3 §14 suggests
   comparing the number of events and the time of the last one: a child
   cannot do anything to an agent without adding an event, so if both match,
   nothing has happened to it since. createdAt is included as well, so two
   different agents can never look alike.

   The result is a short string - a "fingerprint" - so two agents can be
   compared with a plain ===. */
function agentFingerprint(agent) {
  const events = Array.isArray(agent.events) ? agent.events : [];
  const last = events.length ? events[events.length - 1].t : '';
  return [agent.createdAt || '', events.length, last || ''].join('|');
}

/* Import every file the adult picked, one after another, and give ONE report
   at the end. `files` is a FileList - array-like, but not a real array - so
   Array.from() turns it into one that has .forEach and a for-of loop. */
async function importFiles(files) {
  const result = $('#export-result');
  const list = Array.from(files || []);
  if (!list.length) return;
  result.textContent = 'Reading…';

  // What is on this iPad already: each agent's id, and its fingerprint.
  // `here` is a Map - a lookup table from id to fingerprint. `prints` is a
  // Set - a list where the only question is "is this in it?".
  const here = new Map();
  const prints = new Set();
  (await Storage.listAgents()).forEach(raw => {
    const agent = migrateAgent(raw);
    here.set(agent.id, agentFingerprint(agent));
    prints.add(agentFingerprint(agent));
  });

  // The running totals, across every file.
  const totals = { added: 0, skipped: 0, copied: 0, clips: 0, missed: 0, badFiles: 0 };
  for (const file of list) {
    await importOneFile(file, here, prints, totals);
  }

  const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');
  const parts = [
    'Added ' + plural(totals.added, 'agent'),
    'skipped ' + totals.skipped + ' already here',
    'copied ' + totals.copied + ' changed'
  ];
  if (totals.clips) parts.push(plural(totals.clips, 'recording'));
  if (totals.missed) parts.push('⚠️ ' + totals.missed + ' recording(s) would not restore');
  if (totals.badFiles) parts.push('⚠️ ' + plural(totals.badFiles, 'file') + ' not read');
  result.textContent = parts.join(' · ') + '.';

  await paintBackupState();
  await renderAgentList();
  await renderGallery();
}

/* One file: its recordings first, then its agents. Adds to `totals`, and to
   `here` and `prints` as it goes, so the same agent in two files (or twice
   in one) is only ever added once. */
async function importOneFile(file, here, prints, totals) {
  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch (err) {
    totals.badFiles++;
    return;
  }
  if (!payload || !Array.isArray(payload.agents)) { totals.badFiles++; return; }

  /* The recordings first, so an agent is never restored pointing at a clip
     that is not there yet. A clip's id is a uuid, so the same id means the
     same recording, and one that is already here is left alone. */
  const audio = payload.audio || {};
  for (const id of Object.keys(audio)) {
    try {
      if (await Storage.loadAudio(id)) continue;
      await Storage.saveAudio(id, dataUrlToBlob(audio[id]));
      totals.clips++;
    } catch (err) {
      totals.missed++;
      reportError('import audio', err);
    }
  }

  for (const raw of payload.agents) {
    try {
      const agent = migrateAgent(raw);       // an older export still opens
      const print = agentFingerprint(agent);

      if (here.has(agent.id) && here.get(agent.id) === print) {
        totals.skipped++;                    // the very same agent, unchanged
        continue;
      }
      if (prints.has(print)) {
        // Unchanged, but here under a different id: the copy a previous
        // import made. Without this, importing a file a second time would
        // add that copy again every time.
        totals.skipped++;
        continue;
      }
      if (here.has(agent.id)) {
        agent.id = uuid();                   // changed: keep both
        totals.copied++;
      } else {
        totals.added++;
      }
      agent.imported = true;
      await Storage.saveAgent(agent);
      here.set(agent.id, print);
      prints.add(print);
    } catch (err) { reportError('import agent', err); }
  }
}

/* Remember that the work left this iPad, and how much of it, so the panel can
   say whether anything has been made since. */
async function noteExport(count) {
  await Storage.setMeta('lastExportAt', nowIso());
  await Storage.setMeta('lastExportCount', count);
  paintBackupState();
}

// FileReader turns a Blob into a "data:" string. It is callback-based, so we
// wrap it in a Promise to be able to await it.
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// ---- motion level (saved now, used from Milestone 8) ----
async function setMotion(level) {
  state.motion = level;
  await Storage.setMeta('motion', level);
  document.body.dataset.motion = level;
  paintMotionButtons();
}

/* v2 §7: the narration speed an adult has chosen. It reaches the audio
   through Assets, which applies it as playbackRate with the pitch kept, and
   as utterance.rate on the speechSynthesis stand-in. */
async function setNarrationSpeed(speed) {
  state.narrationSpeed = Number(speed);
  Assets.setSpeed(state.narrationSpeed);
  await Storage.setMeta('narrationSpeed', state.narrationSpeed);
  paintSpeedButtons();
  logEvent('narration_speed', { speed: state.narrationSpeed });
  // Say a line at the new pace, so the choice can be heard rather than guessed.
  speakLine('nar-make-intro');
}

function paintSpeedButtons() {
  $$('[data-speed]').forEach(button => {
    button.classList.toggle('is-on', Number(button.dataset.speed) === state.narrationSpeed);
  });
}

function paintMotionButtons() {
  $$('[data-motion]').forEach(button => {
    button.classList.toggle('is-on', button.dataset.motion === state.motion);
  });
}


/* ==========================================================================
   13. BOOT - wire up every button, then open the Start screen
   ========================================================================== */

function wireUp() {

  // --- Start screen: the reels, the locks and the emblem (v2 §5.1) ---
  $('#btn-roll').addEventListener('click', () => rollCodename());
  $('#emblem-hero').addEventListener('click', tapEmblem);
  $('#btn-new').addEventListener('click', startNewAgent);
  $('#btn-continue').addEventListener('click', continueAgent);

  // --- Type your own spy name (v2 §5.1) ---
  $('#btn-type').addEventListener('click', openTypeSheet);
  $('#btn-type-cancel').addEventListener('click', closeTypeSheet);
  $('#btn-type-ok').addEventListener('click', confirmTypedCodename);
  $('#btn-type-speak').addEventListener('click', () => speakLine('nar-codename-type'));
  // Emblems appear while the child types, not after they finish.
  $('#type-input').addEventListener('input', refreshEmblemOptions);

  // --- hidden adult route: hold the logo for 3 seconds ---
  // Pointer events cover finger, pen and mouse in one go (spec §9).
  const logo = $('#logo');
  logo.addEventListener('pointerdown', startHold);
  logo.addEventListener('pointerup', cancelHold);
  logo.addEventListener('pointercancel', cancelHold);
  logo.addEventListener('pointerleave', cancelHold);
  // Stop iPadOS showing the text-selection / callout menu on a long hold.
  logo.addEventListener('contextmenu', e => e.preventDefault());

  // --- missions ---
  wireMake();
  wireDoors();
  wireSafe();

  wireOwnCard();
  wireSeal();
  wireQuickAgent();
  wireSuit();
  wirePowers();
  wireBottle();
  $('#finish-home').addEventListener('click', closeFinish);
  wirePolish();
  wireSessionControls();
  $('#btn-stamp').addEventListener('click', stampMission);
  $('#btn-pass').addEventListener('click', passMission);

  // --- global buttons (there is one of each per screen) ---
  $$('[data-mute]').forEach(b => b.addEventListener('click', toggleMute));
  $$('[data-home]').forEach(b => b.addEventListener('click', goHome));
  $$('[data-speak]').forEach(b => b.addEventListener('click', speakPrompt));

  // --- adult panel ---
  buildPinPad();
  $('#btn-pin-cancel').addEventListener('click', () => {
    state.pinEntry = '';
    showScreen('start');
  });
  $('#btn-adult-close').addEventListener('click', async () => {
    showScreen('start');
    await refreshContinueButton();
    /* The panel can delete agents, so the gallery behind it may now be
       wrong. It was only ever rebuilt on boot and on Finish, which meant a
       deleted agent kept its tile until the app was reloaded - and tapping
       that tile would have opened nothing. */
    await renderGallery();
  });
  $('#btn-export').addEventListener('click', exportAll);
  $('#btn-import').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', event => {
    // v3: `multiple` on the input, so this can be several files at once.
    // Copy the list BEFORE clearing the input, because clearing it empties
    // the FileList it gave us.
    const files = Array.from(event.target.files || []);
    if (files.length) importFiles(files);
    event.target.value = '';        // so the same file can be picked again
  });
  $$('[data-motion]').forEach(b =>
    b.addEventListener('click', () => setMotion(b.dataset.motion)));
  $$('[data-speed]').forEach(b =>
    b.addEventListener('click', () => setNarrationSpeed(b.dataset.speed)));


  // Delete all, with the double confirmation the spec asks for.
  $('#btn-delete-all').addEventListener('click', () => {
    $('#delete-confirm').hidden = false;
  });
  $('#btn-delete-cancel').addEventListener('click', () => {
    $('#delete-confirm').hidden = true;
  });
  $('#btn-delete-all-2').addEventListener('click', async () => {
    await Storage.clearAgents();
    await Storage.clearAudio();
    await Storage.setMeta('lastAgentId', null);
    state.agent = null;
    $('#delete-confirm').hidden = true;
    await renderAgentList();
    toast('All agents deleted');
  });
}

/* Run one boot step. If it fails, say so on screen and CARRY ON - a broken
   setting must not cost a child the gallery and their whole agent. */
async function step(name, fn) {
  try { return await withTimeout(Promise.resolve(fn()), 6000, name); }
  catch (err) { reportError('boot: ' + name, err); return undefined; }
}

async function boot() {
  await step('wiring the buttons', () => wireUp());

  // Load saved settings. Wrapped, because IndexedDB can be unavailable
  // (private browsing, a full iPad) and that must not cost the gallery.
  await step('saved settings', async () => {
  state.muted  = await Storage.getMeta('muted', false);
  state.motion = await Storage.getMeta('motion', null);

  // v2 §3: which session is running, which missions the adult has switched
  // off, and whether this iPad is in practice mode. All three survive a
  // reload, because an adult sets them once at the start of a rotation.
  state.session   = await Storage.getMeta('session', DEFAULT_SESSION);
  state.missionOn = await Storage.getMeta('missionOn', {}) || {};
  state.practice  = await Storage.getMeta('practice', false);
  state.silly     = await Storage.getMeta('silly', false);
  state.narrationSpeed = await Storage.getMeta('narrationSpeed', Assets.DEFAULT_SPEED);
  // v3 §9.3: the display link. Off until an adult switches it on.
  state.displayOn      = await Storage.getMeta('displayOn', false);
  state.displayAddress = await Storage.getMeta('displayAddress', DISPLAY_DEFAULT_ADDRESS);
  });
  Assets.setSpeed(state.narrationSpeed);
  paintPracticeBadge();

  // Spec §5a: default to Full, or Calm if the iPad has Reduce Motion switched on.
  if (!state.motion) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    state.motion = reduce ? 'calm' : 'full';
  }
  document.body.dataset.motion = state.motion;
  Voice.setMuted(state.muted);
  paintMuteButtons();
  paintMotionButtons();
  paintSpeedButtons();

  // Milestone 9: offline support.
  registerServiceWorker();

  // Spec §3: ask iOS to keep our data.
  const persistence = await step('storage persistence',
                                 () => Storage.requestPersistence()) || 'error';
  $('#storage-state').textContent =
    'Storage persistence: ' + persistence +
    (installedToHomeScreen() ? ' · opened from the home screen ✅'
                             : ' · opened in a browser tab (separate storage) ⚠️');

  // Milestone 9: say plainly whether offline actually works on this iPad.
  // Registration is asynchronous, so the first read is usually "installing".
  // Reading again a second later gives the adult panel the real answer.
  async function showOffline() {
    const base = $('#storage-state').textContent.split('\nOffline:')[0];
    $('#storage-state').textContent = base + '\nOffline: ' + (await offlineState());
  }
  await step('offline check', showOffline);
  setTimeout(() => step('offline check', showOffline), 1500);

  // v2 §5.3.2: merge the picture stickers from the asset manifest into the
  // library, so a file Filip adds this week is searchable next week.
  if (typeof Stickers !== 'undefined')
    await step('picture stickers', () => Stickers.loadImageStickers());

  await step('codename roller', () => rollCodename({ instant: true }));
  await step('Continue button', () => refreshContinueButton());
  await step('the gallery', () => renderGallery());       // v2 §5.2
  showScreen('start');

  /* boot-guard.js watches for this. If it never arrives, the guard says so on
     screen - which is the only way to catch a startup that simply stops. */
  window.__agentLabReady = true;
}

// DOMContentLoaded fires once the HTML is parsed, so every element exists.
document.addEventListener('DOMContentLoaded', boot);


/* ==========================================================================
   14. MAKE (was MISSION 1) - PIXEL DOOR + STICKER LAYER (added in Milestone 1)
   ==========================================================================

   HOW THE AGENT IS DRAWN
   The agent is two layers stacked on top of each other inside .agent-view:
     1. a <canvas> that is literally 16 x 16 pixels, blown up by CSS;
     2. a .sticker-layer of emoji positioned on top.
   The same pair is used for the big editable stage and for the little preview
   thumbnail, so there is only one drawing function to keep correct.

   WHY A 16x16 CANVAS RATHER THAN 256 <div>s
   One canvas is far less work for the iPad, dragging across it is simple
   maths rather than hit-testing 256 elements, and it can be turned into a PNG
   in one call when the ID card needs it in Milestone 6.
   ========================================================================== */

const GRID = 16;                       // 16 x 16, per spec §7

// 16 colours: six skin tones first, then white/black/grey, then brights.
const PALETTE = [
  '#3d2314', '#6b4226', '#8d5524', '#c68642',
  '#e0ac69', '#ffdbac', '#ffffff', '#000000',
  '#8c9bab', '#e63946', '#f77f00', '#ffd23f',
  '#43aa8b', '#4cc9f0', '#4361ee', '#b5179e'
];

/* MILESTONE 2 — the two extras the Boost adds on top of the Mission 1 editor.

   AURA: a glow around the agent, drawn with a CSS drop-shadow filter.
   BACKGROUND: where the agent stands. Each is a CSS gradient defined in
   style.css under .agent-view[data-bg="..."], so nothing is downloaded. */
const AURAS = [
  { id: null,       colour: null,      label: 'No glow' },
  { id: 'gold',     colour: '#ffd23f', label: 'Gold' },
  { id: 'red',      colour: '#ff4d4d', label: 'Fire' },
  { id: 'ice',      colour: '#7fe7ff', label: 'Ice' },
  { id: 'green',    colour: '#5ef08a', label: 'Slime' },
  { id: 'purple',   colour: '#c77dff', label: 'Magic' },
  { id: 'pink',     colour: '#ff86c8', label: 'Pink' },
  { id: 'white',    colour: '#ffffff', label: 'Bright' }
];

/* Where the agent stands. In v1 this was a Boost setting; v2 §6.1 moves it to
   `agent.hq`, and V4 will replace this picker with the twelve photographed HQ
   places. Until then the same six gradients are offered, but each one SAVES AN
   HQ ID, so a child's choice survives into V4 instead of being thrown away. */
const BACKGROUNDS = [
  { id: 'plain',            icon: '⬜', label: 'Plain'      },
  { id: 'hq-space',         icon: '🪐', label: 'Space'      },
  { id: 'hq-city-rooftop',  icon: '🏙️', label: 'City'       },
  { id: 'hq-jungle',        icon: '🌴', label: 'Jungle'     },
  { id: 'hq-underwater',    icon: '🌊', label: 'Sea'        },
  { id: 'hq-sky-castle',    icon: '🌅', label: 'Sky castle' }
];

/* The CSS gradients are keyed by short names, so an HQ id is translated here.
   An HQ with no gradient yet (the classroom, the library and the rest, which
   get photographs at V4) simply shows plain - never a broken background. */
const HQ_BACKGROUND = {
  'hq-space':        'space',
  'hq-city-rooftop': 'city',
  'hq-jungle':       'jungle',
  'hq-underwater':   'sea',
  'hq-sky-castle':   'sunset'
};

/* Put the HQ photograph behind an agent, if that photograph exists. The
   image is set as a CSS background so it sits under every layer - pixels,
   shapes, drawing and stickers - without being another element to position. */
function setHqBackdrop(view, hqId, owner) {
  /* A view can declare that it supplies its own scene - the card's POWER
     panel shows the moment the power is used, not the HQ. Without this the
     HQ photograph loads a moment later and silently overwrites it, which is
     a race the moment always lost. */
  if (view.dataset.scene === 'moment') return;

  /* v2 §5.5 (V4): a place the child DREW is an HQ like any other, so it has to
     become the background too. It is already a PNG data URL, so there is
     nothing to load and no race to guard against. */
  const agent = owner || state.agent;
  // v3 §6: the safe-to-talk place if there is one, else the HQ.
  const drawn = agentPlace(agent).png;
  if (!hqId && drawn) {
    view.style.setProperty('--hq-image', 'url("' + drawn + '")');
    view.classList.add('has-hq');
    return;
  }

  if (!hqId || typeof Assets === 'undefined') {
    view.style.removeProperty('--hq-image');
    view.classList.remove('has-hq');
    return;
  }
  Assets.image(hqId).then(img => {
    // The agent may have moved on while the picture loaded.
    if (view.dataset.bg !== hqToBackground(hqId)) return;
    if (!img) { view.classList.remove('has-hq'); return; }
    view.style.setProperty('--hq-image', 'url("' + img.src + '")');
    view.classList.add('has-hq');
  });
}

function hqToBackground(hqId) {
  if (!hqId) return 'plain';
  return HQ_BACKGROUND[hqId] || 'plain';
}

// Editor state that is NOT part of the saved agent - it is just what the
// child is doing right now, so it never needs storing.
const editor = {
  part: 'cover',        // 'cover' now; Mission 2 will point this at 'boost'
  tool: 'paint',        // 'paint' | 'erase' | 'fill'
  colour: PALETTE[9],   // the red, a friendly starting colour
  tab: 'me',            // v2 §5.1: the child's own emblem is shown first
  selected: null,       // index of the selected sticker, or null
  selectedShape: null,  // index of the selected shape (Build door), or null
  undoStack: [],
  painting: false,
  paintedCells: 0,      // counted so one event is logged per finger lift
  lastCell: null,       // the square the finger was over a moment ago
  drag: null            // in-progress sticker drag
};


/* ---------------------------------------------------------------------------
   ONE EDITOR, TWO MISSIONS
   There is only one editor in index.html. Mission 1 and Mission 2 each have an
   empty "mount" div, and moveEditorTo() physically moves the editor into
   whichever one is on screen. Moving a DOM element keeps all of its event
   listeners, so everything stays wired up and there is no second copy of the
   editor to keep in step.

   `editor.part` says which half of the agent those tools are editing:
   'cover' in Make, 'powerup' in Power-up.
   ------------------------------------------------------------------------ */
/* Which half of the agent the editor is working on.
   v2 §6.1 renamed the Boost to the Power-up's "look", and moved it one level
   deeper, so this is the single place that knows the path. */
function part() {
  if (editor.part === 'powerup') return state.agent.powerup.look;
  return state.agent.cover;
}

// The v2 background lives on the agent's HQ, not on the look (v2 §6.1).

// The one editable stage. A function rather than a saved reference, because
// the element moves between missions.
function stage() {
  return $('#editor-stage');
}

// Move the editor into a mission's mount point and show it.
function moveEditorTo(mountSelector) {
  const mount = $(mountSelector);
  const el = $('#editor');
  if (mount && el.parentElement !== mount) mount.appendChild(el);
  el.hidden = false;
}

// Missions 3-6 have no editor, so hide it rather than leave it sitting in
// whichever panel used it last.
function hideEditor() {
  const el = $('#editor');
  if (el) el.hidden = true;
  // The left column's controls belong to the editor, so they go with it.
  const main = $('#main-controls');
  if (main) main.hidden = true;
}

// Pixels are stored as one flat array of 256 entries: a colour, or null for
// empty. A flat array is much smaller in the export than 16 nested arrays.
function ensurePixels() {
  const p = part();
  if (!Array.isArray(p.pixels) || p.pixels.length !== GRID * GRID) {
    p.pixels = new Array(GRID * GRID).fill(null);
  }
  if (!Array.isArray(p.stickers)) p.stickers = [];
  if (!Array.isArray(p.shapes)) p.shapes = [];
  return p;
}


/* ---------------------------------------------------------------------------
   UNDO (spec §6: undo inside every editor)
   One stack covers both painting and stickers, so Undo always means "take
   back the last thing I did", which is the only version a child will expect.
   Each entry is a copy of the pixels and stickers taken BEFORE a change.
   ------------------------------------------------------------------------ */
function pushUndo() {
  const p = ensurePixels();
  editor.undoStack.push({
    pixels: p.pixels.slice(),                         // slice() copies the array
    stickers: p.stickers.map(s => Object.assign({}, s)),
    shapes: p.shapes.map(s => Object.assign({}, s))   // Milestone 7: Build door
  });
  if (editor.undoStack.length > 40) editor.undoStack.shift();   // cap the memory
}

function undo() {
  const previous = editor.undoStack.pop();
  if (!previous) return;
  const p = ensurePixels();
  p.pixels = previous.pixels;
  p.stickers = previous.stickers;
  p.shapes = previous.shapes || [];
  editor.selected = null;
  editor.selectedShape = null;
  logEvent('undo', {});
  refreshAgentViews();
  scheduleSave();
}


/* ---------------------------------------------------------------------------
   DRAWING THE AGENT
   renderAgentView() paints one .agent-view: the canvas, then the stickers.
   refreshAgentViews() updates every copy on screen at once.
   ------------------------------------------------------------------------ */
function renderAgentView(view, data, interactive, door, owner) {
  /* `data` is a cover or a look - half an agent. The HQ and the door live on
     the WHOLE agent, and until the gallery started drawing other people's
     agents this function just reached for `state.agent` and was always right.
     It is not right for a gallery tile, so the owner can be passed in. */
  const agent = owner || state.agent;
  // MILESTONE 2: the Boost carries a background and an aura. Both are pure CSS,
  // set here as an attribute and a custom property, so the same function draws
  // a plain Cover and a glowing Boost in a space scene.
  /* v2 §5.5: "The HQ becomes the agent's background on later screens and on
     the card." Now that the twelve places are photographed, the agent stands
     in the real one; the CSS gradient stays as the stand-in for a place with
     no picture yet, so an empty assets/ folder still works. */
  // v3 §6: the agent stands in its safe-to-talk place, or its HQ.
  const hqId = agentPlace(agent).id;
  view.dataset.bg = hqToBackground(hqId);
  setHqBackdrop(view, hqId, agent);
  const aura = AURAS.find(a => a.id === (data.glow || data.aura));
  view.style.setProperty('--aura', aura && aura.colour ? aura.colour : 'transparent');
  view.classList.toggle('has-aura', Boolean(aura && aura.colour));

  /* MILESTONE 7: there are three doors now, and each keeps its own work
     (spec §7). Only the chosen one is shown - otherwise a child who tried
     Pixel, then switched to Draw, would see both at once. */
  const which = door || (agent && agent.door) || 'pixel';
  view.dataset.door = which;          // CSS uses this to hide the pixel grid

  const canvas = $('canvas.agent-pixels', view);
  canvas.hidden = which !== 'pixel';
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, GRID, GRID);

  if (which === 'pixel') {
    const pixels = data.pixels || [];
    for (let i = 0; i < pixels.length; i++) {
      if (!pixels[i]) continue;                  // null = empty square
      ctx.fillStyle = pixels[i];
      ctx.fillRect(i % GRID, Math.floor(i / GRID), 1, 1);
    }
  }

  // --- the Draw door's picture ---
  const drawing = $('img.agent-drawing', view);
  if (drawing) {
    const show = which === 'draw' && Boolean(data.drawingPng);
    drawing.hidden = !show;
    if (show && drawing.getAttribute('src') !== data.drawingPng) {
      drawing.src = data.drawingPng;
    }
  }

  // --- the Build door's shapes ---
  const svg = $('svg.agent-shapes', view);
  if (svg) {
    /* `hidden` is a property of HTML elements, not SVG ones: setting svg.hidden
       quietly sets a JavaScript property and leaves the HTML attribute in
       place, so the CSS rule for [hidden] goes on hiding it. The attribute has
       to be set and removed by hand. */
    if (which === 'parts') {
      svg.removeAttribute('hidden');
      renderShapes(svg, data.shapes || [], interactive);
    } else {
      svg.setAttribute('hidden', '');
      svg.innerHTML = '';
    }
  }

  const layer = $('.sticker-layer', view);
  layer.innerHTML = '';
  (data.stickers || []).forEach((sticker, index) => {
    const el = document.createElement('span');
    el.className = 'sticker';

    /* v2 §5.3.2: exactly one of `emoji` and `asset` is set. A picture sticker
       shows its fallback emoji until the file arrives, so an agent made this
       week still looks right next week - and right now. */
    if (sticker.asset) {
      const entry = Assets.item(sticker.asset);
      el.textContent = (entry && entry.fallback) || '🧩';
      Assets.image(sticker.asset).then(img => {
        if (!img) return;
        el.textContent = '';
        const picture = document.createElement('img');
        picture.className = 'sticker-img';
        picture.alt = '';
        picture.src = img.src;
        el.appendChild(picture);
      });
    } else {
      el.textContent = sticker.emoji;
    }

    el.style.left = (sticker.x * 100) + '%';
    el.style.top  = (sticker.y * 100) + '%';
    el.style.setProperty('--scale', sticker.scale);
    el.style.setProperty('--rot', sticker.rotation + 'deg');
    if (interactive && index === editor.selected) el.classList.add('is-selected');
    if (interactive) {
      el.dataset.index = index;
      el.addEventListener('pointerdown', startStickerDrag);
    }
    layer.appendChild(el);
  });
}

/* An emoji has to be sized in real pixels, and the stage changes size when the
   iPad is rotated. ResizeObserver tells us whenever an .agent-view changes
   size, and we set the sticker size from its width. 14% of the stage width
   gives a sticker that reads clearly without swamping a 16x16 agent. */
function watchAgentView(view) {
  if (!view || typeof ResizeObserver === 'undefined') return;
  const observer = new ResizeObserver(entries => {
    entries.forEach(entry => {
      const width = entry.contentRect.width;
      entry.target.style.setProperty('--sticker-px', (width * 0.14) + 'px');
    });
  });
  observer.observe(view);
  // Set it once straight away, so the first render is not briefly tiny.
  view.style.setProperty('--sticker-px', (view.getBoundingClientRect().width * 0.14) + 'px');
}

function refreshAgentViews() {
  if (!state.agent) return;
  const data = ensurePixels();

  const stageEl = stage();
  if (stageEl && !$('#editor').hidden) renderAgentView(stageEl, data, true);

  renderPreview();
  paintStickerControls();
}


/* ---------------------------------------------------------------------------
   THE DOORS
   Each door keeps its own work, because the data model has separate places for
   pixels, shapes and a drawing. Switching back and forth loses nothing.
   ------------------------------------------------------------------------ */
function chooseDoor(door) {
  const switching = state.agent.door && state.agent.door !== door;
  state.agent.door = door;
  logEvent(switching ? 'door_switch' : 'door_choose', { door: door });
  /* v2 §7: a picture card speaks its label when tapped, and its line is `nar-`
     plus the card id - so the door ids have to match the recordings
     (nar-door-parts, nar-door-pixel, nar-door-draw). */
  speakLine('nar-door-' + door);
  openEditor('#m1-editor-mount', 'cover');
  scheduleSave();
}

/* Open the editor inside the mission that asked for it.
   `mountSelector` says where to put it; `which` is 'cover' or 'powerup'. */
function openEditor(mountSelector, which) {
  editor.part = which || 'cover';
  ensurePixels();
  editor.selected = null;
  editor.undoStack = [];        // undo never reaches back into another mission

  moveEditorTo(mountSelector || '#m1-editor-mount');

  const main = $('#main-controls');
  if (main) main.hidden = false;

  // The Boost's two extra tabs, and the Door button, which only Mission 1 has.
  const isBoost = editor.part === 'powerup';
  $$('[data-boost-only]').forEach(el => { el.hidden = !isBoost; });

  /* One kit now: Parts and Stickers. An agent saved under the old Pixel or
     Draw door keeps its door value so its work still DRAWS wherever the
     agent does, but the editor always opens on Parts. */
  coder.onStroke = null;
  editor.selectedShape = null;

  buildPartsTray();
  paintPartsPalette();
  setRail('parts');
  paintPalette();
  paintToolButtons();
  buildStickerTray();
  paintShapeControls();

  if (isBoost) { paintAuraSwatches(); paintBackgroundOptions(); }
  refreshAgentViews();
}


/* ---------------------------------------------------------------------------
   PAINTING
   Pointer events give one code path for finger, pencil and mouse (spec §9).
   setPointerCapture keeps every move coming to the canvas even when the finger
   slides outside it, so a stroke never gets stuck half-drawn.
   ------------------------------------------------------------------------ */

// Turn a screen position into a grid square, or null if outside.
function cellFromPointer(event, stageEl) {
  const rect = stageEl.getBoundingClientRect();
  const col = Math.floor((event.clientX - rect.left) / rect.width  * GRID);
  const row = Math.floor((event.clientY - rect.top)  / rect.height * GRID);
  if (col < 0 || col >= GRID || row < 0 || row >= GRID) return null;
  return row * GRID + col;
}

function stageDown(event) {
  // A tap on a sticker is handled by the sticker itself.
  if (event.target.classList.contains('sticker')) return;

  /* Only the Pixel door paints on the stage. Parts has its shapes, and Draw
     has its own canvas on top, which takes the pointer events itself.

     Tapping bare stage clears the selection - BOTH kinds. This used to clear
     a selected part but not a selected sticker, because the line that cleared
     stickers lived in the Pixel branch below and Pixel is gone (7 October
     iPad test). So a sticker stayed selected however far away you tapped,
     while a part let go, and the two behaved differently for no reason. */
  if (state.agent && state.agent.door !== 'pixel') {
    if (editor.selectedShape !== null || editor.selected !== null) {
      editor.selectedShape = null;
      editor.selected = null;
      refreshAgentViews();
      paintShapeControls();
    }
    return;
  }

  // Tapping bare canvas clears the selection (the Pixel door's own path).
  if (editor.selected !== null || editor.selectedShape !== null) {
    editor.selected = null;
    editor.selectedShape = null;
    refreshAgentViews();
    paintShapeControls();
  }

  const stageEl = stage();
  const cell = cellFromPointer(event, stageEl);
  if (cell === null) return;

  pushUndo();                       // one undo entry per stroke, not per square
  editor.painting = true;
  editor.paintedCells = 0;
  editor.lastCell = null;
  // Keeps the stroke coming to the canvas even if the finger slides off it.
  try { stageEl.setPointerCapture(event.pointerId); } catch (err) { /* harmless */ }

  if (editor.tool === 'fill') {
    floodFill(cell);
    endStroke();
  } else {
    applyCell(cell);
    editor.lastCell = cell;
  }
}

function stageMove(event) {
  if (!editor.painting || editor.tool === 'fill') return;
  const cell = cellFromPointer(event, stage());
  if (cell === null) return;

  // A finger moving quickly fires pointermove only every few squares, which
  // would leave a dotted trail. So we fill in every square on the straight
  // line between the last one and this one.
  if (editor.lastCell !== null && editor.lastCell !== cell) {
    paintLine(editor.lastCell, cell);
  } else {
    applyCell(cell);
  }
  editor.lastCell = cell;
}

/* Walk from one square to another, painting each square on the way.
   This takes the longer of the two distances (across or down) as the number
   of steps, then moves a fraction of the way each step - the simple version
   of the line-drawing algorithm every paint program uses. */
function paintLine(from, to) {
  const x0 = from % GRID, y0 = Math.floor(from / GRID);
  const x1 = to   % GRID, y1 = Math.floor(to   / GRID);
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));

  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t);
    applyCell(y * GRID + x);
  }
}

function stageUp() {
  if (!editor.painting) return;
  endStroke();
}

function applyCell(index) {
  const p = ensurePixels();
  const value = editor.tool === 'erase' ? null : editor.colour;
  if (p.pixels[index] === value) return;       // nothing changed, skip the work
  p.pixels[index] = value;
  editor.paintedCells++;
  renderAgentView(stage(), p, true);
}

// Spec §8: painting logs ONE event per finger lift, not one per square.
function endStroke() {
  editor.painting = false;
  if (editor.paintedCells > 0) {
    logEvent('paint', {
      tool: editor.tool,
      colour: editor.tool === 'erase' ? null : editor.colour,
      cells: editor.paintedCells
    });
  } else {
    editor.undoStack.pop();        // a stroke that changed nothing is not undoable
  }
  editor.paintedCells = 0;
  refreshAgentViews();
  scheduleSave();
}

/* Flood fill: starting from one square, spread to its neighbours as long as
   they are the same colour as where we started. The "stack" is a simple list
   of squares still to check - no recursion, so a full 256-square fill cannot
   overflow anything. */
function floodFill(start) {
  const p = ensurePixels();
  const target = p.pixels[start];
  const replacement = editor.tool === 'erase' ? null : editor.colour;
  if (target === replacement) return;

  const stack = [start];
  const seen = new Set();

  while (stack.length) {
    const index = stack.pop();
    if (seen.has(index)) continue;
    seen.add(index);
    if (p.pixels[index] !== target) continue;

    p.pixels[index] = replacement;
    editor.paintedCells++;

    const col = index % GRID;
    const row = Math.floor(index / GRID);
    if (col > 0)        stack.push(index - 1);
    if (col < GRID - 1) stack.push(index + 1);
    if (row > 0)        stack.push(index - GRID);
    if (row < GRID - 1) stack.push(index + GRID);
  }
}

function clearAll() {
  pushUndo();
  const p = ensurePixels();
  const door = (state.agent && state.agent.door) || 'pixel';

  // Only clear the door the child is actually using. Wiping all three would
  // throw away work they cannot see and did not ask about.
  if (door === 'pixel') p.pixels = new Array(GRID * GRID).fill(null);
  if (door === 'parts') p.shapes = [];
  if (door === 'draw') {
    pushCodeUndo();
    clearCodeCanvas();
    p.drawingPng = null;
  }
  p.stickers = [];

  editor.selected = null;
  editor.selectedShape = null;
  logEvent('clear', { door: door });
  refreshAgentViews();
  scheduleSave();
}


/* ---------------------------------------------------------------------------
   THE TOOL RAIL
   ------------------------------------------------------------------------ */
function setRail(which) {
  // One body per tab. Milestone 2 added Aura and Place.
  ['parts', 'stickers', 'aura', 'background'].forEach(name => {
    $('#rail-' + name).hidden = which !== name;
  });
  $$('[data-rail]').forEach(b => b.classList.toggle('is-on', b.dataset.rail === which));
}

/* The same sixteen colours serve the Pixel door and the Build door, so a child
   has the same skin tones available whichever way they make their agent. */
function paintPalette(selector) {
  const target = selector || '#palette';
  const palette = $(target);
  if (!palette) return;
  palette.innerHTML = '';
  PALETTE.forEach(colour => {
    const swatch = document.createElement('button');
    swatch.className = 'swatch' + (colour === editor.colour ? ' is-on' : '');
    swatch.style.background = colour;
    swatch.setAttribute('aria-label', 'Colour ' + colour);
    swatch.addEventListener('click', () => {
      editor.colour = colour;
      // Picking a colour means you want to paint with it.
      if (editor.tool === 'erase') editor.tool = 'paint';
      paintPalette('#palette');
      paintPalette('#build-palette');
      paintToolButtons();

    });
    palette.appendChild(swatch);
  });
}

function paintToolButtons() {
  $$('[data-tool]').forEach(b => b.classList.toggle('is-on', b.dataset.tool === editor.tool));
}


/* ---------------------------------------------------------------------------
   STICKERS
   A sticker is { emoji, x, y, scale, rotation } with x and y stored 0-1, so a
   sticker put on an agent's head stays on its head at any screen size (§8).
   ------------------------------------------------------------------------ */
/* THE STICKER TRAY (v2 §5.3.2)

   The 31 emoji are gone: the library now comes from stickers.js, which also
   merges in the picture stickers from the asset manifest, so a file Filip
   adds this week appears here next week with no code change.

   A sticker is `{ emoji, asset, x, y, scale, rotation }` with exactly one of
   emoji and asset set (v2 §5.3.2, §6.1). */
function buildStickerTray() {
  const tabs = $('#sticker-tabs');
  tabs.innerHTML = '';

  const visibleTabs = Stickers.TABS;
  if (!visibleTabs.some(t => t.id === editor.tab)) editor.tab = 'me';

  visibleTabs.forEach(tab => {
    const button = document.createElement('button');
    button.className = 'btn seg sticker-tab' + (tab.id === editor.tab ? ' is-on' : '');
    button.innerHTML = '<span class="sticker-tab-icon">' + tab.icon + '</span>' +
                       '<span class="sticker-tab-label">' + tab.label + '</span>';
    button.setAttribute('aria-label', tab.label);
    button.addEventListener('click', () => {
      editor.tab = tab.id;
      buildStickerTray();
      if (tab.id === 'search') $('#sticker-search').focus();
    });
    tabs.appendChild(button);
  });

  // The search field only belongs on the Search tab.
  $('#sticker-search-box').hidden = editor.tab !== 'search';

  const tray = $('#sticker-tray');
  tray.innerHTML = '';

  let list;
  if (editor.tab === 'search') {
    const query = $('#sticker-search').value.trim();
    list = query ? Stickers.search(query, { silly: state.silly }) : [];
    if (!query) {
      tray.innerHTML = '<p class="tray-empty">Type a word to find a sticker.</p>';
      return;
    }
    if (list.length === 0) {
      tray.innerHTML = '<p class="tray-empty">Nothing yet. HQ has been told.</p>';
      return;
    }
  } else if (editor.tab === 'me') {
    list = meTabStickers();
  } else {
    list = Stickers.inTab(editor.tab, { silly: state.silly });
  }

  if (list.length === 0) {
    tray.innerHTML = '<p class="tray-empty">Nothing in here yet.</p>';
    return;
  }

  list.forEach(sticker => tray.appendChild(stickerTrayButton(sticker)));
}

/* One tray button. A picture sticker shows its image once the file exists and
   its fallback emoji until then, so the tray looks the same either way. */
function stickerTrayButton(sticker) {
  const button = document.createElement('button');
  button.className = 'tray-sticker' + (sticker.isNew ? ' is-new' : '');
  button.setAttribute('aria-label', 'Sticker ' + (sticker.label || sticker.emoji));
  button.title = sticker.label || '';

  if (sticker.asset) {
    button.textContent = sticker.fallback || '🧩';
    Assets.image(sticker.asset).then(img => {
      if (!img) return;
      button.textContent = '';
      const picture = document.createElement('img');
      picture.className = 'tray-sticker-img';
      picture.alt = '';
      picture.src = img.src;
      button.appendChild(picture);
    });
  } else {
    button.textContent = sticker.emoji;
  }

  button.addEventListener('pointerdown', event => startTrayDrag(event, sticker));
  return button;
}

/* ★ Me: the child's own emblem first (v2 §5.1). */
function meTabStickers() {
  const emblem = state.agent && state.agent.emblem;
  const out = [];
  if (emblem && emblem.asset) {
    const entry = Assets.item(emblem.asset);
    out.push({ asset: emblem.asset, emoji: null, label: (entry && entry.label) || 'My symbol',
               fallback: (entry && entry.fallback) || '🧩' });
  } else if (emblem && emblem.emoji) {
    out.push({ emoji: emblem.emoji, asset: null, label: 'My symbol' });
  }
  if (!out.some(s => s.emoji === '🕵️')) out.push({ emoji: '🕵️', asset: null, label: 'Spy' });
  return out;
}

/* Searching while the child types (v2 §5.3.2). A word with no sticker becomes
   a request - which is how a child's idea reaches next week's list (§7). */
let searchRequestTimer = null;

function onStickerSearch() {
  buildStickerTray();

  const query = $('#sticker-search').value.trim();
  const found = query ? Stickers.search(query, { silly: state.silly }).length : 0;
  if (query.length >= 2) logEvent('sticker_search', { query: query, results: found });

  const missed = query ? Stickers.unmatchedWords(query, { silly: state.silly }) : [];
  $('#sticker-request').hidden = missed.length === 0;

  /* Only record a request once the child has stopped typing, or "dragon"
     would log d, dr, dra, drag... as five separate wishes. */
  clearTimeout(searchRequestTimer);
  if (missed.length === 0) return;
  searchRequestTimer = setTimeout(() => {
    if (!state.agent) return;
    missed.forEach(word => {
      const already = state.agent.requests.some(r => r.word === word);
      if (already) return;
      state.agent.requests.push({ word: word, where: 'sticker-search', t: nowIso() });
      logEvent('sticker_request', { word: word });
    });
    scheduleSave();
  }, 1200);
}


/* `sticker` is an entry from the library, or a bare emoji string from older
   code. Stored as { emoji, asset, ... } with exactly one of the two set. */
function addSticker(sticker, x, y) {
  const entry = typeof sticker === 'string' ? { emoji: sticker, asset: null } : sticker;

  pushUndo();
  const p = ensurePixels();
  p.stickers.push({
    emoji: entry.emoji || null,
    asset: entry.asset || null,
    x: x, y: y, scale: 1, rotation: 0
  });
  editor.selected = p.stickers.length - 1;
  logEvent('sticker_add', { emoji: entry.emoji || null, asset: entry.asset || null });
  playSfx('sfx-pop');
  refreshAgentViews();

  // Spec §5a: the sticker lands with a bounce.
  const landed = $('.sticker-layer .sticker:last-child', stage());
  if (landed) landed.classList.add('just-landed');
  scheduleSave();
}

/* Dragging out of the tray. A "ghost" emoji follows the finger; letting go
   over the agent drops it there. A quick tap that barely moves drops it in
   the middle instead, which is far easier for a child who finds dragging hard. */
/* ---------------------------------------------------------------------------
   DRAGGING OUT OF A TRAY (v2 spec §4.1)

   THE BUG THIS REPLACES
   The old version put its move and up listeners on the TRAY BUTTON. That
   button is thrown away and rebuilt whenever the tray is rebuilt - which
   happens on any tab tap - so if a rebuild landed mid-drag, `up` never fired,
   its clean-up never ran, and the ghost (position: fixed, z-index 70) was left
   floating over every screen for the rest of the session. That is the stray
   dog in every test screenshot.

   THE FIX, AND THE PATTERN FOR EVERY DRAG IN v2
     1. Listen on `window`, which is never rebuilt.
     2. Put every piece of clean-up in ONE function, and call it from every
        exit: pointerup, pointercancel, and lostpointercapture.
     3. leaveCurrent() sweeps up any ghost that still somehow survived.
   ------------------------------------------------------------------------ */
function startTrayDrag(event, emoji) {
  /* NOT preventDefault() here, and no ghost yet.

     This used to claim the gesture the instant a finger touched a sticker:
     preventDefault, pointer capture and a ghost, all on pointerdown. That
     left the browser no way to scroll the tray, so a finger laid on a
     sticker and swiped down stuck fast - a child had to find the gap beside
     the stickers to scroll. The parts tray never did this, which is why that
     one always felt right (7 October iPad test).

     Now the gesture stays undecided until the finger moves far enough.
     Within that first 8px the browser is free to take it as a scroll, in
     which case it sends pointercancel and the drag quietly gives up. */
  const tray = event.currentTarget;
  const entry = typeof emoji === 'string' ? { emoji: emoji, asset: null } : emoji;

  const startX = event.clientX, startY = event.clientY;
  let finished = false;
  let dragging = false;
  let ghost = null;

  function beginDrag(e) {
    if (dragging) return;
    dragging = true;
    try { tray.setPointerCapture(e.pointerId); } catch (err) { /* harmless */ }

    ghost = document.createElement('span');
    ghost.className = 'sticker-ghost';
    if (entry.asset) {
      ghost.textContent = entry.fallback || '🧩';
      Assets.image(entry.asset).then(img => {
        if (!img || !ghost || !ghost.isConnected) return;
        ghost.textContent = '';
        const picture = document.createElement('img');
        picture.className = 'sticker-img';
        picture.alt = '';
        picture.src = img.src;
        ghost.appendChild(picture);
      });
    } else {
      ghost.textContent = entry.emoji;
    }
    ghost.style.left = e.clientX + 'px';
    ghost.style.top  = e.clientY + 'px';
    document.body.appendChild(ghost);
  }

  // The one and only clean-up. Safe to call twice.
  function cleanUp() {
    if (finished) return;
    finished = true;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
    tray.removeEventListener('lostpointercapture', cancel);
    if (ghost) ghost.remove();
  }

  function move(e) {
    if (!dragging) {
      // Still undecided: has the finger gone far enough to mean a drag?
      if (Math.hypot(e.clientX - startX, e.clientY - startY) < 8) return;
      beginDrag(e);
    }
    e.preventDefault();               // now it is ours, so stop any panning
    ghost.style.left = e.clientX + 'px';
    ghost.style.top  = e.clientY + 'px';
  }

  function cancel() { cleanUp(); }

  function up(e) {
    const moved = Math.hypot(e.clientX - startX, e.clientY - startY);
    cleanUp();                      // tidy up BEFORE doing anything that could throw

    const stageEl = stage();
    if (!stageEl) return;
    const rect = stageEl.getBoundingClientRect();
    const insideStage =
      e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top  && e.clientY <= rect.bottom;

    if (insideStage) {
      addSticker(entry, (e.clientX - rect.left) / rect.width,
                        (e.clientY - rect.top) / rect.height);
    } else if (moved < 12) {
      addSticker(entry, 0.5, 0.5);        // a tap: drop it in the middle
    }
  }

  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', cancel);   // the browser took it: scrolling
  tray.addEventListener('lostpointercapture', cancel);
}

/* The safety net (v2 spec §4.1). Anything a drag parks on <body> is swept up
   here, so a stranded preview can never outlive the screen it came from. */
function clearDragLeftovers() {
  $$('.sticker-ghost').forEach(el => el.remove());
}

/* Moving a sticker that is already on the agent. */
function startStickerDrag(event) {
  event.preventDefault();
  event.stopPropagation();                  // do not start painting underneath

  const el = event.currentTarget;
  const index = Number(el.dataset.index);
  const stageEl = stage();

  // Update the highlight WITHOUT rebuilding the sticker layer. Rebuilding would
  // destroy `el` - the very element this drag is attached to - and the drag
  // would die on the first move.
  editor.selected = index;
  editor.selectedShape = null;      // one thing selected at a time
  paintSelection();
  paintShapeControls();             // Flip/Front/Back hide: a sticker has none

  try { el.setPointerCapture(event.pointerId); } catch (err) { /* harmless */ }
  let moved = false;
  let snapshotTaken = false;

  /* Where the finger went down, and how far the sticker's centre was from it.
     Keeping that gap means a sticker grabbed by its edge stays where it was
     grabbed instead of jumping so its middle sits under the finger. */
  const startX = event.clientX;
  const startY = event.clientY;
  const grabbed = ensurePixels().stickers[index];
  const startRect = stageEl.getBoundingClientRect();
  const offsetX = grabbed ? grabbed.x - (startX - startRect.left) / startRect.width  : 0;
  const offsetY = grabbed ? grabbed.y - (startY - startRect.top)  / startRect.height : 0;

  function move(e) {
    if (!state.agent) return;

    /* A tap is never perfectly still: a finger always wobbles a pixel or two,
       and that used to count as a drag, so simply TAPPING a sticker to select
       it nudged it out of place. Nothing moves until the finger has travelled
       far enough to mean it. 8px is below what anyone aims for and well above
       a wobble. */
    if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) < 8) return;

    if (!snapshotTaken) { pushUndo(); snapshotTaken = true; }
    moved = true;

    const rect = stageEl.getBoundingClientRect();
    const sticker = ensurePixels().stickers[index];
    if (!sticker) return;
    // Clamp to the stage so a sticker can never be dragged out of sight.
    sticker.x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width  + offsetX));
    sticker.y = Math.min(1, Math.max(0, (e.clientY - rect.top)  / rect.height + offsetY));
    const live = $('.sticker-layer .sticker[data-index="' + index + '"]', stageEl);
    if (live) {
      live.style.left = (sticker.x * 100) + '%';
      live.style.top  = (sticker.y * 100) + '%';
    }
  }

  function up() {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
    if (moved) { logEvent('sticker_move', {}); scheduleSave(); }
  }

  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
}

/* Stickers and parts share one set of controls in the left column now, so
   this just asks that set to repaint. */
function paintStickerControls() {
  paintShapeControls();
}

/* Move the selection highlight without touching the elements themselves.
   Used while dragging, where rebuilding the layer would break the drag. */
function paintSelection() {
  const stageEl = stage();
  if (stageEl) {
    $$('.sticker', stageEl).forEach(el => {
      el.classList.toggle('is-selected', Number(el.dataset.index) === editor.selected);
    });
  }
  paintStickerControls();
}

function stickerAction(what) {
  const p = ensurePixels();
  const sticker = p.stickers[editor.selected];
  if (!sticker) return;
  pushUndo();

  if (what === 'bigger')  sticker.scale = Math.min(3, sticker.scale + 0.25);
  if (what === 'smaller') sticker.scale = Math.max(0.4, sticker.scale - 0.25);
  if (what === 'rotate')  sticker.rotation = (sticker.rotation + 30) % 360;
  if (what === 'delete') {
    p.stickers.splice(editor.selected, 1);
    editor.selected = null;
    logEvent('sticker_remove', { emoji: sticker.emoji || null, asset: sticker.asset || null });
  }
  refreshAgentViews();
  scheduleSave();
}


/* ---------------------------------------------------------------------------
   Wiring Mission 1 up. Called once, from wireUp().
   ------------------------------------------------------------------------ */
function wireMake() {
  watchAgentView(stage());
  watchAgentView($('#preview-view'));

  const stageEl = stage();
  stageEl.addEventListener('pointerdown', stageDown);
  stageEl.addEventListener('pointermove', stageMove);
  stageEl.addEventListener('pointerup', stageUp);
  stageEl.addEventListener('pointercancel', stageUp);

  $$('[data-rail]').forEach(b => b.addEventListener('click', () => setRail(b.dataset.rail)));
  $$('[data-tool]').forEach(b => b.addEventListener('click', () => {
    editor.tool = b.dataset.tool;
    paintToolButtons();
  }));
  $('#btn-undo').addEventListener('click', undo);
  $('#btn-clear').addEventListener('click', clearAll);
  // The same two, in the left column where a child can actually find them.
  /* One set of buttons for whatever is selected. Each asks what that is and
     calls the right handler, so there is no longer a sticker set and a parts
     set competing for the same job. */
  $$('[data-ctl]').forEach(b =>
    b.addEventListener('click', () => controlAction(b.dataset.ctl)));

  $('#main-undo').addEventListener('click', undo);
  $('#main-clear').addEventListener('click', clearAll);
}

// Called by goToMission whenever Mission 1 opens: show the doors, or go
// straight back into the editor if a door was already chosen.
function enterMake() {
  if (!state.agent) return;

  /* There is one way in now, so there is nothing to choose. Draw was dropped
     after the iPad test - a blank canvas gave children less than the parts
     kit and nobody reached for it - and Pixel went earlier, so Make opens
     straight into the parts editor. An agent made with one of the old doors
     keeps its door value, so its work still draws wherever the agent does. */
  if (!state.agent.door) {
    state.agent.door = 'parts';
    logEvent('door_choose', { door: 'parts', auto: true });
    scheduleSave();
  }
  ensurePixels();
  openEditor('#m1-editor-mount', 'cover');
  // v3 §4: a brand-new agent starts by picking a ready agent or blank.
  if (shouldOfferBases()) openBasePicker();
}


/* ==========================================================================
   15. POWER-UP (was MISSION 2 / Boost) (added in Milestone 2)
   ==========================================================================

   WHAT MISSION 2 IS (spec §7)
   The child has made their agent in Mission 1 - the "Cover". Mission 2 makes a
   second version of that same agent, the "Boost": the powered-up one. The app
   copies the Cover across so the child starts from their own agent rather than
   an empty square, and the Cover stays beside it as a small reminder.

   The tools are exactly Mission 1's, because `editor.part` is pointed at
   `agent.boost` instead of `agent.cover`. On top of those there are three
   additions, all of which live in the data model already (spec §8):
     - a Powers sticker tab (⚡ 🔥 ❄️ …), filtered in by buildStickerTray();
     - agent.boost.aura       - a glow colour;
     - agent.boost.background - where the agent stands.
   ========================================================================== */

/* Has the child put anything into this half of the agent yet? */
function hasArt(partData) {
  if (!partData) return false;
  return (partData.pixels || []).some(Boolean) ||
         (partData.stickers || []).length > 0 ||
         (partData.shapes || []).length > 0 ||
         Boolean(partData.drawingPng);
}

/* ==========================================================================
   16. VOICE PASSWORD (was MISSION 4) (added in Milestone 3)
   ==========================================================================

   WHAT MISSION 4 IS (spec §7)
   The child records a secret password in their own voice, hears it back as it
   really is, then tries it through six different voices and keeps the one they
   like. The filters are playback only: the recording itself is never altered.

   HOW THE PIECES FIT
     audio.js   does the microphone and the Web Audio work and knows nothing
                about screens.
     storage.js keeps the recording as a Blob in its own IndexedDB store,
                under an audioId (spec §8).
     this file  keeps `agent.voice = { audioId, filter, threeWays }` and drives
                the buttons.

   WHY THE BLOB IS HELD IN MEMORY TOO
   `voiceClip` below is the Blob we just recorded or loaded. Keeping it saves
   fetching it out of IndexedDB on every single play.
   ========================================================================== */

// The recording currently loaded, and the three bonus clips, as Blobs.
let voiceClip = null;

// Which slot is recording right now: 'main', or 0/1/2 for a Yes slot.
let recordingSlot = null;

// The ring is a circle of this length; shortening the dash fills it up.
const RING_LENGTH = 2 * Math.PI * 54;      // r=54 in the SVG


/* ==========================================================================
   17. MOOD CODES (was MISSION 3, feeling code) (added in Milestone 4)
   ==========================================================================

   WHAT MISSION 3 IS (spec §7)
   A feeling code is a secret sign the child invents for a feeling: a scribble
   that means "I am happy", or "leave me alone". Up to three of them.

   THE ORDER IS THE POINT
   The blank tile comes FIRST. The six faces behind "Need ideas?" appear only
   after the child has had a go at their own sign, and never before. A child
   shown 😀😢😠 first would just pick one; a child given a blank square invents
   something. The research is about what they invent, so the blank square is
   not a design nicety - it is the measurement.

   Likewise the movement: the child always chooses which movement goes with
   their feeling. The app never decides that sad means droop.

   HOW A CODE IS STORED (spec §8)
     { png: "data:image/png...", audioId: null, face: null, move: "bounce" }
   The drawing is a PNG data URL rather than a list of strokes, because that is
   what the ID card in Milestone 6 will need, and it keeps the export simple.
   ========================================================================== */

// Spec §7: exactly these six, and only after "Need ideas?".
const FEELING_FACES = ['😀', '😢', '😠', '😨', '😌', '🤪'];

// Spec §5a: the five movements. The CSS classes live in style.css.
const MOVES = [
  { id: 'bounce', icon: '🙂', label: 'Bounce' },
  { id: 'shake',  icon: '😬', label: 'Shake'  },
  { id: 'sway',   icon: '🌊', label: 'Sway'   },
  { id: 'spin',   icon: '🌀', label: 'Spin'   },
  { id: 'still',  icon: '🧘', label: 'Still'  }
];

// A short palette: light colours that read on the dark tile.
const CODE_COLOURS = ['#ffffff', '#ffd23f', '#ff6b63', '#4cc9f0', '#5ef08a', '#c77dff'];

// What the maker is doing right now. None of this is saved.
const coder = {
  index: null,        // which of the three slots is open
  colour: CODE_COLOURS[0],
  drawing: false,
  points: [],         // the stroke being drawn
  undoStack: [],      // canvas snapshots, taken before each stroke
  draft: null,        // the code being built, before "Keep it"
  canvas: null,       // which canvas the brush is painting on right now
  width: 14,          // brush thickness; the Draw door offers three (spec §7)
  mirror: false,      // Draw door 🪞: every stroke is copied left/right
  onStroke: null      // called when a stroke finishes, so the Draw door saves
};


/* The brush is shared: Mission 3 points it at the feeling-code canvas, and
   Mission 6's drawing sheet points it at its own. Everything below works on
   whichever `coder.canvas` currently is. */
function codeCtx() {
  return coder.canvas.getContext('2d');
}

function clearCodeCanvas() {
  const canvas = coder.canvas;
  codeCtx().clearRect(0, 0, canvas.width, canvas.height);
}

/* Put a saved PNG back on the canvas so it can be edited again. Images load
   asynchronously, so the drawing happens in the onload handler. */
function drawPngToCanvas(png) {
  const img = new Image();
  img.onload = function () { codeCtx().drawImage(img, 0, 0); };
  img.src = png;
}


/* ---------------------------------------------------------------------------
   DRAWING
   A thick round brush. The line is smoothed by curving through the MIDPOINT
   between each pair of points: joining raw points gives visible corners,
   because a finger reports its position only every few milliseconds.
   ------------------------------------------------------------------------ */
function codePoint(event) {
  const canvas = coder.canvas;
  const rect = canvas.getBoundingClientRect();
  // The canvas is 320x320 inside but drawn bigger on screen, so screen
  // positions have to be scaled back into canvas coordinates.
  return {
    x: (event.clientX - rect.left) / rect.width  * canvas.width,
    y: (event.clientY - rect.top)  / rect.height * canvas.height
  };
}

function codeDown(event) {
  event.preventDefault();
  const canvas = coder.canvas;

  pushCodeUndo();
  coder.drawing = true;
  coder.points = [codePoint(event)];
  try { canvas.setPointerCapture(event.pointerId); } catch (err) { /* harmless */ }

  // A single tap should still leave a dot.
  const ctx = codeCtx();
  ctx.fillStyle = coder.colour;
  const p0 = coder.points[0];
  ctx.beginPath();
  ctx.arc(p0.x, p0.y, coder.width / 2, 0, Math.PI * 2);
  ctx.fill();
  if (coder.mirror) {
    ctx.beginPath();
    ctx.arc(mirrorX(p0.x), p0.y, coder.width / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* The mirror flips a point across the middle of the canvas, so a stroke on the
   left is copied to the right. Drawing a face becomes much easier. */
function mirrorX(x) {
  return coder.canvas.width - x;
}

function codeMove(event) {
  if (!coder.drawing) return;
  coder.points.push(codePoint(event));

  const pts = coder.points;
  if (pts.length < 2) return;

  const ctx = codeCtx();
  ctx.strokeStyle = coder.colour;
  ctx.lineWidth = coder.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  /* The very first move needs a straight piece joining the starting dot to
     where the curves begin. Without it the curve starts at the midpoint of the
     first two points, and a quick stroke leaves its opening dot stranded in
     space - which looked like a bug and was one. */
  if (pts.length === 2) {
    const midX = (pts[0].x + pts[1].x) / 2;
    const midY = (pts[0].y + pts[1].y) / 2;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(midX, midY);
    ctx.stroke();
    if (coder.mirror) {
      ctx.beginPath();
      ctx.moveTo(mirrorX(pts[0].x), pts[0].y);
      ctx.lineTo(mirrorX(midX), midY);
      ctx.stroke();
    }
    return;
  }

  const a = pts[pts.length - 3];
  const b = pts[pts.length - 2];
  const c = pts[pts.length - 1];
  const from = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const to   = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 };

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  // b is the "control point": the curve bends towards it without touching it.
  ctx.quadraticCurveTo(b.x, b.y, to.x, to.y);
  ctx.stroke();

  // Spec §7: the 🪞 mirror copies every stroke across the left/right axis.
  if (coder.mirror) {
    ctx.beginPath();
    ctx.moveTo(mirrorX(from.x), from.y);
    ctx.quadraticCurveTo(mirrorX(b.x), b.y, mirrorX(to.x), to.y);
    ctx.stroke();
  }
}

/* Which name each drawing canvas goes by in the event log. A canvas missing
   from this list is logged by its own id, so a new one is never silent. */
const STROKE_WHERE = {
  'own-canvas': 'own_card',      // the shared ✏️ "draw it or say it" sheet
  // 'power' was the ⚡ Powers canvas, gone since 3 November 2026 (v80):
  // older logs still say it (DATA.md).
  'm3-canvas':  'feeling_code',  // v1 Mission 3 (retired)
  'draw-canvas': 'rule'          // v1 Mission 6's drawing sheet (retired)
};

function codeUp() {
  if (!coder.drawing) return;
  coder.drawing = false;
  if (coder.points.length > 0 && coder.onStroke) coder.onStroke();
  if (coder.points.length > 0) {
    // The brush is shared by several canvases, so the event has to say which
    // one it was, or the research log cannot tell them apart.
    //
    // ⚠️ Up to session 2 this said 'rule' for EVERY canvas but the feeling
    // code's - including the ✏️ My own sheet, which was the only one a child
    // could reach in session 2. So in session-2 data, where: 'rule' means the
    // ✏️ sheet (DATA.md says so). v3 names each canvas properly.
    logEvent('draw_stroke', {
      where: STROKE_WHERE[coder.canvas.id] || coder.canvas.id,
      points: coder.points.length
    });
  }
  coder.points = [];
}

/* Undo keeps whole-canvas snapshots. A feeling code is a handful of strokes on
   a small canvas, so this is cheap and far simpler than replaying strokes. */
function pushCodeUndo() {
  const canvas = coder.canvas;
  coder.undoStack.push(codeCtx().getImageData(0, 0, canvas.width, canvas.height));
  if (coder.undoStack.length > 20) coder.undoStack.shift();
}

function undoCode() {
  const previous = coder.undoStack.pop();
  if (!previous) return;
  codeCtx().putImageData(previous, 0, 0);
  logEvent('undo', { where: coder.canvas.id });
}

function clearCode() {
  pushCodeUndo();
  clearCodeCanvas();
  logEvent('clear', { where: coder.canvas.id });
}

function paintCodePalette(selector) {
  const box = $(selector || '#m3-palette');
  box.innerHTML = '';
  CODE_COLOURS.forEach(colour => {
    const swatch = document.createElement('button');
    swatch.className = 'swatch' + (colour === coder.colour ? ' is-on' : '');
    swatch.style.background = colour;
    swatch.setAttribute('aria-label', 'Colour ' + colour);
    swatch.addEventListener('click', () => {
      coder.colour = colour;
      paintCodePalette(selector);
    });
    box.appendChild(swatch);
  });
}


/* ---------------------------------------------------------------------------
   KEEPING AND REMOVING A CODE
   ------------------------------------------------------------------------ */
function canvasHasInk() {
  const canvas = coder.canvas;
  const data = codeCtx().getImageData(0, 0, canvas.width, canvas.height).data;
  // Every 4th byte is the alpha channel: anything above 0 means ink.
  // Stepping 4 pixels at a time is plenty to notice a 14px-wide brush stroke.
  for (let i = 3; i < data.length; i += 16) {
    if (data[i] > 0) return true;
  }
  return false;
}

/* ---------------------------------------------------------------------------
   Wiring Mission 3 up. Called once, from wireUp().
   ------------------------------------------------------------------------ */
// Attach the shared brush to a canvas. Used by Mission 3 and by the drawing
// sheet Mission 6 opens.
function attachBrush(canvas) {
  canvas.addEventListener('pointerdown', codeDown);
  canvas.addEventListener('pointermove', codeMove);
  canvas.addEventListener('pointerup', codeUp);
  canvas.addEventListener('pointercancel', codeUp);
}

/* ==========================================================================
   18. BADGE (was MISSION 5, places) (added in Milestone 5)
   ==========================================================================

   WHAT MISSION 5 IS (spec §7)
   Five places the agent might travel to, and five parts of the agent that
   might travel. The child decides, part by part, place by place.

   THE DEFAULT IS THE WHOLE POINT
   Everything starts OFF. Sharing is always something a child switches on, not
   something they have to notice and switch off. A child who taps nothing has
   shared nothing, and that is a valid, complete answer - which is also why
   there is no "share everything" shortcut anywhere on this screen.
   ========================================================================== */

// The keys here must match the data model in spec §8 exactly.
const PLACES = [
  { id: 'justMe', icon: '🔒', name: 'Just me' },
  { id: 'badge',  icon: '🏷️', name: 'My badge' },
  { id: 'class',  icon: '🏫', name: 'My class' },
  { id: 'wall',   icon: '🖼️', name: 'School wall' },
  { id: 'home',   icon: '🏠', name: 'Home' }
];

const PARTS = [
  { id: 'cover',    icon: '🎨', label: 'Cover' },
  { id: 'boost',    icon: '⚡', label: 'Boost' },
  { id: 'feeling',  icon: '💛', label: 'Feeling code' },
  { id: 'voice',    icon: '🎤', label: 'Voice' },
  { id: 'codename', icon: '🕵️', label: 'Codename' }
];

let openPlace = null;        // which place card is flipped open


/* ==========================================================================
   19. AGENT RULES (was MISSION 6) (added in Milestone 5)
   ==========================================================================

   WHAT MISSION 6 IS (spec §7)
   Three rules the child sets for the people around their agent: what not to
   do, what is fine to do, and what they need when they are upset.

   NO TYPING ANYWHERE
   A rule is an icon the child taps, a picture they draw, or something they
   say out loud. Those are three different ways in, and a child who cannot
   write is not shut out of any of them.
   ========================================================================== */

// The keys match the data model in spec §8.

// Spec §7 lists exactly these fourteen.
const RULE_ICONS = ['🤫','🎧','🚶','🤗','🙅','💬','✋','🧃','⏳','👥','🧑‍🏫','🛋️','🎮','✏️'];

let openRule = null;        // which rule card is open


/* ---------------------------------------------------------------------------
   THE SHARED DRAWING SHEET
   Mission 6 opens this to draw a rule. It borrows the same brush Mission 3
   uses by pointing `coder.canvas` at its canvas (see attachBrush).
   `onKeep` is called with the PNG when the child keeps the drawing.
   ------------------------------------------------------------------------ */
let drawSheetKeep = null;

/* ==========================================================================
   20. REVEAL - THE AGENT ID CARD (added in Milestone 6)
   ==========================================================================

   WHAT THE REVEAL IS (spec §7)
   Everything the child made, gathered onto one card: codename, both agents,
   the feeling code they are wearing, their voice password, and their rules.

   SAVING IT AS A PICTURE
   There is no library to turn HTML into an image (spec §4 forbids any), so the
   card is DRAWN A SECOND TIME onto a canvas, by hand, in drawCardToCanvas().
   That means the screen version and the saved version are two separate pieces
   of code describing the same card - if you change one, change the other.

   WHY IMAGES ARE LOADED BEFORE THE BUTTON IS PRESSED
   iPad Safari only allows navigator.share() to run as a direct result of a
   tap. Loading an image is slow and would break that chain, so every picture
   the card needs is fetched when the Reveal opens, and the Save button then
   only has to draw and share.
   ========================================================================== */

// Pictures the card needs, loaded ahead of the Save button being pressed.
const cardAssets = { coverDrawing: null, boostDrawing: null,
                     coverShapes: null, boostShapes: null, stickers: {}, hq: null };

// Canvas versions of the Mission 2 backgrounds (CSS gradients cannot be read
// back out, so the saved card paints its own approximation).
const BG_CANVAS = {
  plain:  ['#0e2240', '#0e2240'],
  space:  ['#1a0b3d', '#050418'],
  city:   ['#35206b', '#0b1b33'],
  jungle: ['#0d4f2b', '#06301a'],
  sea:    ['#0a6ea8', '#03243f'],
  sunset: ['#ff8e3c', '#3a1c5a']
};

/* Load one image and hand back a Promise. Resolves with null rather than
   failing, so one missing picture can never stop the card being saved. */
function loadImage(src) {
  return new Promise(resolve => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}


/* Load everything drawAgentToCanvas() needs to draw one agent: its drawing,
   its parts rasterised from the same SVG the screen shows, its HQ and its
   picture stickers.

   This used to load the whole Reveal card - mood sign, rules, voice clip, the
   power's moment. The card is retired in v3 (§3); what is left is the agent
   itself, which v3 §9.1 needs again for the picture a sent bottle carries.
   It takes any agent, not just the open one. */
async function preloadCardAssets(agentArg) {
  const agent = agentArg || state.agent;
  if (!agent) return;
  const look = (agent.powerup && agent.powerup.look) || {};

  cardAssets.coverDrawing = await loadImage((agent.cover || {}).drawingPng);
  cardAssets.boostDrawing = await loadImage(look.drawingPng);
  cardAssets.coverShapes  = await loadImage(shapesToSvgUrl((agent.cover || {}).shapes));
  cardAssets.boostShapes  = await loadImage(shapesToSvgUrl(look.shapes));

  cardAssets.hq = null;
  const place = agentPlace(agent);     // v3 §6: safe place first, then HQ
  if (place.id)       cardAssets.hq = await Assets.image(place.id);
  else if (place.png) cardAssets.hq = await loadImage(place.png);

  cardAssets.stickers = {};
  const used = [].concat((agent.cover || {}).stickers || [], look.stickers || []);
  for (const sticker of used) {
    if (!sticker.asset || cardAssets.stickers[sticker.asset]) continue;
    cardAssets.stickers[sticker.asset] = await Assets.image(sticker.asset);
  }
}

/* ---------------------------------------------------------------------------
   DRAWING THE CARD ONTO A CANVAS
   Plain 2D canvas calls. Emoji are drawn as text, which is why no picture
   files are needed for any of them.
   ------------------------------------------------------------------------ */

const CARD_W = 1000;
const CARD_H = 1250;

// The system font stack, as one string canvas can use.
const CARD_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function roundedBox(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill || '#e2d5ba';
  ctx.beginPath();
  // roundRect is not on older iPad Safari, so fall back to a plain rectangle.
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, 18);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

/* One agent: background, then pixels, then stickers. `withExtras` adds the
   Boost's background and aura. */
function drawAgentToCanvas(ctx, data, x, y, size, withExtras, backdrop) {
  /* `backdrop` overrides the HQ for one cell. The card's POWER panel uses it
     to put the agent in the MOMENT its power is used rather than in the HQ
     again, which is what the screen shows. */
  const bg = withExtras ? hqToBackground(agentPlace(state.agent).id) : 'plain';

  // The rounded box the background sits inside, clipped so a photograph does
  // not spill past the agent's corners.
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, size, size, 18);
  else ctx.rect(x, y, size, size);
  ctx.clip();

  const scene = backdrop || (withExtras ? cardAssets.hq : null);
  if (scene) {
    // v2 §5.5: the real place, cropped to fill the square.
    ctx.drawImage(scene, x, y, size, size);
  } else {
    const pair = BG_CANVAS[bg] || BG_CANVAS.plain;
    const grad = ctx.createLinearGradient(x, y, x, y + size);
    grad.addColorStop(0, pair[0]);
    grad.addColorStop(1, pair[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();

  ctx.save();
  // The aura is a glow, which on canvas is a shadow.
  const aura = withExtras ? AURAS.find(a => a.id === (data.glow || data.aura)) : null;
  if (aura && aura.colour) {
    ctx.shadowColor = aura.colour;
    ctx.shadowBlur = 26;
  }

  const door = (state.agent && state.agent.door) || 'pixel';

  if (door === 'draw') {
    // The Draw door: one picture, already loaded by preloadCardAssets().
    const img = withExtras ? cardAssets.boostDrawing : cardAssets.coverDrawing;
    if (img) ctx.drawImage(img, x, y, size, size);
    drawStickersToCanvas(ctx, data.stickers || [], x, y, size);
    ctx.restore();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    return;
  }

  if (door === 'parts') {
    const layer = withExtras ? cardAssets.boostShapes : cardAssets.coverShapes;
    if (layer) ctx.drawImage(layer, x, y, size, size);
    drawStickersToCanvas(ctx, data.stickers || [], x, y, size);
    ctx.restore();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    return;
  }

  /* PIXELS. They are painted onto a 16x16 offscreen canvas first and then
     blown up in ONE drawImage. Drawing 256 separate squares straight onto the
     card would give each square its own shadow, and all those little glows
     overlapping drew a grid of seams across the agent's face. One image means
     one glow around the whole shape, which is what the aura is meant to be.
     imageSmoothingEnabled = false keeps the pixels crisp as they scale up. */
  const off = document.createElement('canvas');
  off.width = GRID;
  off.height = GRID;
  const octx = off.getContext('2d');
  const pixels = data.pixels || [];
  for (let i = 0; i < pixels.length; i++) {
    if (!pixels[i]) continue;
    octx.fillStyle = pixels[i];
    octx.fillRect(i % GRID, Math.floor(i / GRID), 1, 1);
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, x, y, size, size);

  drawStickersToCanvas(ctx, data.stickers || [], x, y, size);

  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

/* Stickers, in the same relative positions the editor stored (spec §8). */
function drawStickersToCanvas(ctx, stickers, x, y, size) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  stickers.forEach(sticker => {
    ctx.save();
    ctx.translate(x + sticker.x * size, y + sticker.y * size);
    ctx.rotate((sticker.rotation || 0) * Math.PI / 180);
    const px = Math.round(size * 0.14 * (sticker.scale || 1));

    // v2 §5.3.2: picture stickers have to be drawn here too.
    const img = sticker.asset ? cardAssets.stickers[sticker.asset] : null;
    if (img) {
      ctx.drawImage(img, -px / 2, -px / 2, px, px);
    } else {
      const entry = sticker.asset ? Assets.item(sticker.asset) : null;
      ctx.font = px + 'px ' + CARD_FONT;
      ctx.fillText(sticker.emoji || (entry && entry.fallback) || '🧩', 0, 0);
    }
    ctx.restore();
  });
}

/* THE SHAPES AND PARTS, ON THE SAVED CARD (v2 V2)

   v1 redrew the seven shapes with canvas calls. That stopped being sensible
   at 85 parts: every part would have to be described twice, once as SVG for
   the screen and once as canvas for the card, and the two would drift apart
   the first time one was adjusted.

   So the card now RASTERISES THE SAME SVG the screen uses. The shapes layer
   is serialised to an SVG document, turned into a data URL, loaded as an
   image and drawn. One description of each part, and the card cannot
   disagree with the screen.

   Images load asynchronously, so these are prepared in preloadCardAssets()
   before the Save button can be pressed (Safari only allows share() straight
   off a tap). */
function shapesToSvgUrl(shapes) {
  if (!shapes || shapes.length === 0) return null;

  let body = '';
  layerOrder(shapes).forEach(({ shape }) => {
    const part = Parts.get(shape.type);
    const transform = shapeTransform(shape, part);
    if (part) {
      // The tint is written in directly: a data URL has no stylesheet.
      const painted = part.svg
        .replace(/class="tint tint-stroke"/g,
                 'fill="' + shape.colour + '" stroke="' + shape.colour + '"')
        .replace(/class="tint-stroke"/g, 'stroke="' + shape.colour + '"')
        .replace(/class="tint"/g, 'fill="' + shape.colour + '"');
      body += '<g transform="' + transform + '">' + painted + '</g>';
    } else {
      body += '<g transform="' + transform + '" fill="' + shape.colour + '">' +
              v1ShapeMarkup(shape.type) + '</g>';
    }
  });

  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" ' +
              'width="600" height="600">' +
              '<g stroke="#1b1b2f" stroke-width="2.5" stroke-linejoin="round" ' +
              'stroke-linecap="round" vector-effect="non-scaling-stroke">' +
              body + '</g></svg>';

  // encodeURIComponent rather than base64: it keeps the markup readable in a
  // debugger and handles the quotes and hashes in colours safely.
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/* The seven v1 shapes as markup, matching shapeElement()'s geometry. */
function v1ShapeMarkup(type) {
  if (type === 'circle')   return '<circle cx="0" cy="0" r="10"/>';
  if (type === 'oval')     return '<ellipse cx="0" cy="0" rx="10" ry="6.5"/>';
  if (type === 'square')   return '<rect x="-9" y="-9" width="18" height="18"/>';
  if (type === 'rounded')  return '<rect x="-9" y="-9" width="18" height="18" rx="4.5"/>';
  if (type === 'triangle') return '<polygon points="0,-10 9.5,8 -9.5,8"/>';
  if (type === 'star') {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 10 : 4.2;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      pts.push((Math.cos(a) * r).toFixed(2) + ',' + (Math.sin(a) * r).toFixed(2));
    }
    return '<polygon points="' + pts.join(' ') + '"/>';
  }
  return '<path d="M0,-9 C6,-9 10,-4 9,1 C8,6 4,9 0,9 C-5,9 -10,6 -9,0 ' +
         'C-8,-5 -6,-9 0,-9 Z"/>';
}

// Kept for anything still asking; the card uses the rasterised layer instead.
function drawShapesToCanvas(ctx, shapes, x, y, size) {
  const k = size / 100;                 // the SVG viewBox is 100 units wide
  shapes.forEach(shape => {
    ctx.save();
    ctx.translate(x + shape.x * size, y + shape.y * size);
    ctx.rotate((shape.rotation || 0) * Math.PI / 180);
    ctx.scale((shape.size || 1) * k, (shape.size || 1) * k);
    ctx.fillStyle = shape.colour;
    ctx.beginPath();

    if (shape.type === 'circle') ctx.arc(0, 0, 10, 0, Math.PI * 2);
    else if (shape.type === 'oval') ctx.ellipse(0, 0, 10, 6.5, 0, 0, Math.PI * 2);
    else if (shape.type === 'square') ctx.rect(-9, -9, 18, 18);
    else if (shape.type === 'rounded') {
      if (ctx.roundRect) ctx.roundRect(-9, -9, 18, 18, 4.5);
      else ctx.rect(-9, -9, 18, 18);
    }
    else if (shape.type === 'triangle') {
      ctx.moveTo(0, -10); ctx.lineTo(9.5, 8); ctx.lineTo(-9.5, 8); ctx.closePath();
    }
    else if (shape.type === 'star') {
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 10 : 4.2;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }
    else {
      // blob: the same curves as the SVG version
      ctx.moveTo(0, -9);
      ctx.bezierCurveTo(6, -9, 10, -4, 9, 1);
      ctx.bezierCurveTo(8, 6, 4, 9, 0, 9);
      ctx.bezierCurveTo(-5, 9, -10, 6, -9, 0);
      ctx.bezierCurveTo(-8, -5, -6, -9, 0, -9);
      ctx.closePath();
    }

    ctx.fill();
    ctx.restore();
  });
}


/* ==========================================================================
   21. MISSION 1 - BUILD AND DRAW DOORS (added in Milestone 7)
   ==========================================================================

   Mission 1 offers three doors (spec §7). Pixel arrived at Milestone 1; these
   are the other two. Each door keeps its own work in its own place in the data
   model, so a child can try all three and lose nothing:

     pixel -> part().pixels        a flat array of 256 colours
     draw  -> part().drawingPng    one PNG data URL
     build -> part().shapes        a list of { type, x, y, size, rotation, colour }

   Shapes store x, y and size as fractions of the stage (0-1), exactly like
   stickers do (spec §8), so they keep their places at any screen size.
   ========================================================================== */

// Spec §7 names these seven.
const SHAPES = [
  { id: 'circle',  label: 'Circle' },
  { id: 'oval',    label: 'Oval' },
  { id: 'square',  label: 'Square' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'triangle',label: 'Triangle' },
  { id: 'star',    label: 'Star' },
  { id: 'blob',    label: 'Blob' }
];

// The three brush sizes the Draw door offers (spec §7).
const BRUSHES = [8, 18, 34];

const DOOR_CANVAS_SIZE = 640;


/* ---------------------------------------------------------------------------
   DRAWING THE SHAPES
   Everything is SVG inside a 100x100 box, so a shape scales with the stage
   without any of it being redrawn.
   ------------------------------------------------------------------------ */
const SVG_NS = 'http://www.w3.org/2000/svg';

/* The outline of each shape, drawn centred on 0,0 in a 20-unit box. The
   transform on the group then moves, turns and sizes it. */
function shapeElement(type) {
  if (type === 'circle')  return make('circle', { cx: 0, cy: 0, r: 10 });
  if (type === 'oval')    return make('ellipse', { cx: 0, cy: 0, rx: 10, ry: 6.5 });
  if (type === 'square')  return make('rect', { x: -9, y: -9, width: 18, height: 18 });
  if (type === 'rounded') return make('rect', { x: -9, y: -9, width: 18, height: 18, rx: 4.5 });
  if (type === 'triangle')return make('polygon', { points: '0,-10 9.5,8 -9.5,8' });
  if (type === 'star') {
    // Ten points, alternating far and near, which is what makes a star.
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 10 : 4.2;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      pts.push((Math.cos(a) * r).toFixed(2) + ',' + (Math.sin(a) * r).toFixed(2));
    }
    return make('polygon', { points: pts.join(' ') });
  }
  // blob: four curves that do not quite agree with each other
  return make('path', {
    d: 'M0,-9 C6,-9 10,-4 9,1 C8,6 4,9 0,9 C-5,9 -10,6 -9,0 C-8,-5 -6,-9 0,-9 Z'
  });
}

function make(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const key in attrs) el.setAttribute(key, attrs[key]);
  return el;
}

/* v2 §5.3.1: a part's drawing order follows its category - a body behind a
   head, a head behind ears, hair over the lot - unless the child has used
   ⬆️ or ⬇️, which sets an explicit `z`. The array order breaks ties, so two
   parts on the same layer stay in the order they were added. */
function layerOrder(shapes) {
  // v3 P2: the sum lives in parts.js, so tools/parts-sheet.html can draw the
  // ready-made agents in exactly the order the app does.
  return Parts.drawOrder(shapes);
}

function renderShapes(svg, shapes, interactive) {
  svg.innerHTML = '';

  layerOrder(shapes).forEach(({ shape, index }) => {
    const part = Parts.get(shape.type);
    const group = make('g', { transform: shapeTransform(shape, part) });

    if (part) {
      /* A part is an SVG fragment in its own 100x100 box, so it is dropped in
         as markup. The `tint` class is what takes the child's colour, set
         here on the group so every tinted element inside follows. */
      group.innerHTML = part.svg;
      group.setAttribute('class', 'part-group');
      group.style.setProperty('--tint', shape.colour);
    } else {
      // One of the seven v1 shapes, still drawn the way it always was.
      const el = shapeElement(shape.type);
      el.setAttribute('fill', shape.colour);
      group.appendChild(el);
    }

    if (interactive && index === editor.selectedShape) {
      group.setAttribute('class', (part ? 'part-group ' : '') + 'is-selected');
    }
    if (interactive) {
      group.dataset.index = index;
      group.addEventListener('pointerdown', startShapeDrag);
    }
    svg.appendChild(group);
  });
}

/* Where a shape sits, as one transform.

   The two kinds measure differently, which is why this is in one place:
     a v1 shape is drawn around 0,0 in a 20-unit box, so `size` is a scale;
     a PART is drawn in a 100-unit box with its middle at 50,50, so it has to
     be shifted back by half its box before being scaled into position.
   `flipX` mirrors a part, which is how one ear or one tail serves both sides. */
function shapeTransform(shape, part) {
  // A part's transform lives in parts.js (v3 P2), one copy for the app and
  // the parts sheet. Only the seven v1 shapes are still worked out here.
  if (part) return Parts.transform(shape);
  const flip = shape.flipX ? ' scale(-1,1)' : '';
  return 'translate(' + (shape.x * 100) + ',' + (shape.y * 100) + ') ' +
         'rotate(' + (shape.rotation || 0) + ')' + flip +
         ' scale(' + (shape.size || 1) + ')';
}



function addShape(type, x, y) {
  pushUndo();
  const p = ensurePixels();
  p.shapes.push({
    type: type, x: x, y: y,
    size: 1.6, rotation: 0, colour: editor.colour
  });
  editor.selectedShape = p.shapes.length - 1;
  logEvent('shape_add', { shape: type, colour: editor.colour });
  playSfx('sfx-pop');
  refreshAgentViews();
  scheduleSave();
}

/* Dragging a shape out of the tray, the same way stickers work. */
/* The same window-listener pattern as startTrayDrag (v2 spec §4.1). */
function startShapeTrayDrag(event, type) {
  event.preventDefault();
  const tray = event.currentTarget;
  try { tray.setPointerCapture(event.pointerId); } catch (err) { /* harmless */ }

  const startX = event.clientX, startY = event.clientY;
  let finished = false;

  function cleanUp() {
    if (finished) return;
    finished = true;
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
    tray.removeEventListener('lostpointercapture', cancel);
  }

  function cancel() { cleanUp(); }

  function up(e) {
    const moved = Math.hypot(e.clientX - startX, e.clientY - startY);
    cleanUp();

    const stageEl = stage();
    if (!stageEl) return;
    const rect = stageEl.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top  && e.clientY <= rect.bottom;

    if (inside) {
      addShape(type, (e.clientX - rect.left) / rect.width,
                     (e.clientY - rect.top) / rect.height);
    } else if (moved < 12) {
      addShape(type, 0.5, 0.5);       // a tap drops it in the middle
    }
  }

  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', cancel);
  tray.addEventListener('lostpointercapture', cancel);
}

/* Moving a shape already on the agent. Same 8px threshold as stickers, so a
   tap selects without nudging. */
function startShapeDrag(event) {
  event.preventDefault();
  event.stopPropagation();

  const group = event.currentTarget;
  const index = Number(group.dataset.index);
  const stageEl = stage();

  /* Update the highlight WITHOUT rebuilding the shapes. Rebuilding would
     destroy `group` - the very element this drag is attached to - and the drag
     would die on the first move. (The sticker drag has the same trap.) */
  editor.selectedShape = index;
  editor.selected = null;
  paintShapeSelection();
  paintShapeControls();
  paintPartsPalette();          // v2 §5.3.1: this part's own colours first

  const startX = event.clientX, startY = event.clientY;
  const rect0 = stageEl.getBoundingClientRect();
  const shape0 = ensurePixels().shapes[index];
  const offsetX = shape0 ? shape0.x - (startX - rect0.left) / rect0.width : 0;
  const offsetY = shape0 ? shape0.y - (startY - rect0.top) / rect0.height : 0;

  let moved = false;
  let snapshotTaken = false;

  function move(e) {
    if (!state.agent) return;
    if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) < 8) return;
    if (!snapshotTaken) { pushUndo(); snapshotTaken = true; }
    moved = true;

    const rect = stageEl.getBoundingClientRect();
    const shape = ensurePixels().shapes[index];
    if (!shape) return;
    shape.x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width + offsetX));
    shape.y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height + offsetY));

    /* Move the group directly rather than rebuilding: rebuilding would destroy
       the element this drag is attached to.

       This MUST use shapeTransform(), the same function the renderer uses.
       It used to build the transform by hand and left off the trailing
       translate(-50,-50) that every parts-kit piece needs, plus the flip - so
       the moment a finger touched a part it jumped half its own size sideways
       and then would not track properly. Two places computing one transform
       is the same trap as drawing the ID card twice. */
    group.setAttribute('transform', shapeTransform(shape, Parts.get(shape.type)));
  }

  function up() {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    window.removeEventListener('lostpointercapture', up);
    if (moved) { logEvent('shape_move', {}); scheduleSave(); }
  }

  /* On window, not on the group (v2 §4.1). Pointer capture usually keeps the
     events coming, but it can throw or be lost, and then a finger that slid
     off the shape stopped moving it. */
  try { group.setPointerCapture(event.pointerId); } catch (err) { /* harmless */ }
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  window.addEventListener('lostpointercapture', up);
}

/* Move the selection outline without touching the elements themselves. */
function paintShapeSelection() {
  const svg = $('svg.agent-shapes', stage());
  if (!svg) return;
  Array.from(svg.children).forEach(g => {
    const on = Number(g.dataset.index) === editor.selectedShape;
    /* classList.toggle, NOT setAttribute('class', …).

       Writing the whole class attribute wiped `part-group` off every group -
       and `part-group` is what carries the child's colour
       (.part-group .tint { fill: var(--tint) }). Without it each part fell
       back to its raw fill, so tapping ONE part turned ALL of them black and
       looked like the child had lost their work. */
    g.classList.toggle('is-selected', on);
  });
}

/* What is selected right now - a part on the stage, a sticker, or nothing. */
function selectedKind() {
  if (editor.selectedShape !== null && editor.selectedShape !== undefined) return 'shape';
  if (editor.selected !== null && editor.selected !== undefined) return 'sticker';
  return null;
}

/* One button, two possible meanings. Flip, Front and Back only apply to
   parts, so they are hidden while a sticker is selected rather than sitting
   there doing nothing. */
function controlAction(what) {
  const kind = selectedKind();
  if (kind === 'shape') return shapeAction(what);
  if (kind === 'sticker') return stickerAction(what);
}

function paintShapeControls() {
  const kind = selectedKind();
  const sel = $('#main-controls-sel');
  if (sel) sel.hidden = kind === null;
  $$('[data-parts-only]').forEach(el => { el.hidden = kind !== 'shape'; });
}

/* Spec §7: buttons rather than pinch gestures - easier to code, and far
   easier for a child who finds two-finger gestures hard. */
function shapeAction(what) {
  const p = ensurePixels();
  const index = editor.selectedShape;
  const shape = p.shapes[index];
  if (!shape) return;
  pushUndo();

  /* A part measures its size as a fraction of the stage, a v1 shape as a
     scale factor, so the steps differ. Without this, one ➕ on a part made it
     fill the screen. */
  const isPart = Parts.isPart(shape.type);
  const step = isPart ? 0.06 : 0.3;
  const min  = isPart ? 0.05 : 0.3;
  const max  = isPart ? 1.6  : 5;

  if (what === 'bigger')  shape.size = Math.min(max, (shape.size || 1) + step);
  if (what === 'smaller') shape.size = Math.max(min, (shape.size || 1) - step);
  if (what === 'rotate')  shape.rotation = ((shape.rotation || 0) + 30) % 360;
  if (what === 'colour')  shape.colour = editor.colour;
  if (what === 'flip')    { flipPart(); return; }

  // v2 §5.3.1: ⬆️ and ⬇️ override the category layer order.
  if (what === 'front' || what === 'back') { layerPart(what); return; }
  if (what === 'delete') {
    p.shapes.splice(index, 1);
    editor.selectedShape = null;
    logEvent('shape_remove', { shape: shape.type });
  }

  if (what !== 'delete') logEvent('shape_change', { what: what, shape: shape.type });
  refreshAgentViews();
  scheduleSave();
}


/* ---------------------------------------------------------------------------
   THE DRAW DOOR
   A big canvas with the shared brush pointed at it. The picture is kept as a
   PNG data URL (spec §8: part().drawingPng).
   ------------------------------------------------------------------------ */
/* The Draw door's palette sets the brush colour (coder.colour), and keeps
   editor.colour in step so switching doors does not change colour underfoot. */
/* ---------------------------------------------------------------------------
   Wiring the parts kit up. Called once, from wireUp().
   The brush, its three sizes and the mirror went with the Draw door.
   ------------------------------------------------------------------------ */
function wireDoors() {
  // v2 V2: the parts kit's palette toggle and the sticker search.
  $('#btn-parts-more').addEventListener('click', () => {
    partsUi.morePalette = !partsUi.morePalette;
    paintPartsPalette();
  });
  $('#sticker-search').addEventListener('input', onStickerSearch);
}


/* ==========================================================================
   22. POLISH & JUICE (added in Milestone 8, spec §5a and §6)
   ==========================================================================

   Four things live here:
     - the 🧩 Something's missing popup, now real and on every screen (§6);
     - 🔊 spoken prompts, so nothing depends on being able to read (§6);
     - sound effects, generated in audio.js rather than loaded (§5a);
     - the animation sequences from §5a.

   SPEC §5a'S GUARDRAILS, AND WHERE THEY ARE KEPT
     - One big moment per mission: the Boost power-up and the Reveal finale
       are the only two, and each plays once.
     - Nothing flashes more than three times a second. The one white flash in
       the power-up is a single pulse, not a strobe.
     - Animation never blocks input, and every long sequence can be skipped
       with a tap.
     - Motion level Full / Calm / Off, honoured by checking motionLevel().
   ========================================================================== */

function motionLevel() {
  return document.body.dataset.motion || 'full';
}

// Is the big, showy kind of animation allowed?
function fullMotion() {
  return motionLevel() === 'full';
}

// Sound only when not muted (spec §6).
/* A sound by its v2 id, for example 'sfx-stamp'. Assets plays the recorded
   file if it exists and the generated stand-in if it does not, so the app
   sounds complete from the first day (v2 §5.0, §8). */
function playSfx(name) {
  if (state.muted) return;
  if (typeof Assets !== 'undefined' && name.indexOf('sfx-') === 0) {
    Assets.sfx(name);
    return;
  }
  Voice.sfx(name);          // a bare generated name, from older code
}


/* ---------------------------------------------------------------------------
   🔊 SPOKEN PROMPTS (spec §6)
   A facilitator may record audio/m1.m4a and friends later. Until those exist,
   the iPad reads the prompt out itself. Either way a child who cannot read
   still knows what the mission is.
   ------------------------------------------------------------------------ */
/* v2 §7: 🔊 plays this step's narrator line through Assets.say(), which uses
   the recorded file if Filip has made it and the iPad's own voice if not. */
function speakPrompt() {
  const id = currentMissionId();
  const mission = MISSIONS.find(m => m.id === id);
  logEvent('speak', { mission: id });

  if (mission && mission.narrate) { speakLine(mission.narrate, mission.prompt); return; }
  if (id === 'reveal') { speakLine('nar-card-intro'); return; }
  if (id === 'start')  { speakLine('nar-v3-welcome'); return; }
  speakWithVoice(mission ? mission.prompt : 'Make your agent.');
}

/* Say one narrator line by id. `fallbackText` is used only if the id is not
   in the manifest at all, which should not happen but must not be silent. */
function speakLine(id, fallbackText) {
  if (state.muted) { toast('Sound is off'); return; }
  if (typeof Assets === 'undefined') { speakWithVoice(fallbackText || ''); return; }
  Assets.say(id, { text: fallbackText || '' });
}

/* v2 §7: every picture card says its label when it is tapped, as well as
   selecting it. The line is `nar-` plus the card's id. */
function speakLabel(cardId) {
  if (state.muted) return;
  logEvent('label_speak', { id: cardId });
  if (typeof Assets !== 'undefined') Assets.say('nar-' + cardId);
}

function speakWithVoice(text) {
  if (!('speechSynthesis' in window)) { toast(text); return; }
  // Cancel anything still being said, or the prompts queue up and overlap.
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;         // a little slower than default, for children
  utterance.pitch = 1.05;
  speechSynthesis.speak(utterance);
}


/* ---------------------------------------------------------------------------
   🧩 SOMETHING'S MISSING (spec §6)
   On every screen, always. The child draws or says what the app did not let
   them do, and it is saved against the screen they were on - which is the
   point of it as research: it records the gaps in our own design.
   ------------------------------------------------------------------------ */
let missingAudioId = null;

/* ---------------------------------------------------------------------------
   THE AGENT COMES ALIVE (spec §5a item 1)
   Idle motion is only ever on the PREVIEW thumbnail, never on the agent while
   it is being edited - that is the spec's golden rule.
   ------------------------------------------------------------------------ */
const TAP_REACTIONS = ['react-jump', 'react-spin', 'react-wobble'];

function tapPreview() {
  const art = $('#preview-art');
  if (!art || !fullMotion()) return;

  // A movement the child chose for a feeling code wins over a random reaction.
  if (MOVES.some(m => art.classList.contains('move-' + m.id))) return;

  TAP_REACTIONS.forEach(c => art.classList.remove(c));
  void art.offsetWidth;                       // restart the animation
  art.classList.add(pick(TAP_REACTIONS));
  playSfx('sfx-pop');
  logEvent('agent_tap', {});
}


/* ---------------------------------------------------------------------------
   THE VOICE DRIVES THE BODY (spec §5a item 2)
   While the password plays, the agent grows and shrinks with how loud it is.
   The movement is smoothed with a lerp so it glides instead of twitching.
   ------------------------------------------------------------------------ */
let bounceFrame = null;
let bounceScale = 1;

/* ---------------------------------------------------------------------------
   THE BOOST POWER-UP (spec §5a item 3)
   About two and a half seconds, once, when Mission 2 opens, with a ✨ button
   to see it again. The order is the spec's: shake, one flash, spin and grow,
   sparkles, then the aura.
   ------------------------------------------------------------------------ */
let powerUpRunning = false;

/* ---------------------------------------------------------------------------
   SPY TRANSITIONS (spec §5a item 5)
   ------------------------------------------------------------------------ */
function scannerSweep() {
  if (!fullMotion()) return;
  const line = $('#scanner');
  line.classList.remove('is-sweeping');
  void line.offsetWidth;
  line.classList.add('is-sweeping');
  playSfx('sfx-whoosh');
}

/* The mission title "decrypts": random letters settle into the real ones.
   Spaces are left alone so the shape of the words stays readable. */
const SCRAMBLE = '!<>-_\\/[]{}—=+*^?#';

function decryptTitle(element, finalText) {
  if (!element) return;
  if (!fullMotion()) { element.textContent = finalText; return; }

  const start = performance.now();
  const duration = 500;

  /* A safety net. requestAnimationFrame stops in a backgrounded tab, and if it
     stopped mid-decrypt the title would be left as nonsense. This guarantees
     the real words land whatever happens to the frames. */
  clearTimeout(element._decryptSafety);
  element._decryptSafety = setTimeout(() => { element.textContent = finalText; },
                                      duration + 150);

  function frame(now) {
    const progress = Math.min(1, (now - start) / duration);
    // Letters settle left to right as the progress passes each one.
    const settled = Math.floor(progress * finalText.length);
    let out = '';
    for (let i = 0; i < finalText.length; i++) {
      if (i < settled || finalText[i] === ' ') out += finalText[i];
      else out += SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)];
    }
    element.textContent = out;
    if (progress < 1) requestAnimationFrame(frame);
    else element.textContent = finalText;
  }
  requestAnimationFrame(frame);
}


/* ---------------------------------------------------------------------------
   THE REVEAL FINALE (spec §5a item 6)
   The dossier opens, the stamp lands, sparkles fly, and the password plays
   itself once - which Safari permits, because it follows the tap that got
   here. Tapping anywhere skips to the finished card.
   ------------------------------------------------------------------------ */
let finaleTimers = [];

/* ---------------------------------------------------------------------------
   Wiring Milestone 8 up. Called once, from wireUp().
   ------------------------------------------------------------------------ */
function wirePolish() {
  // Tapping the preview makes the agent react (spec §5a item 1).
  const art = $('#preview-art');
  if (art) art.addEventListener('click', tapPreview);

  // Spec §5a: stop loops when the screen is hidden.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if ('speechSynthesis' in window) speechSynthesis.cancel();
    }
  });
}


/* ==========================================================================
   23. OFFLINE (added in Milestone 9, spec §4 and §9)
   ==========================================================================

   The service worker in sw.js keeps a copy of the app so it opens with no
   internet at all. This section is the page's half of that: it registers the
   worker, and it shows the "New version" banner when a newer one is waiting.

   WHY A NEW VERSION WAITS RATHER THAN TAKING OVER
   A child may be halfway through making their agent. Swapping the app out
   underneath them would be, at best, confusing. So a new worker sits and
   waits, and the banner lets an adult choose the moment.

   A SERVICE WORKER NEEDS HTTPS
   Browsers only allow one over https, or on localhost. That is why this is
   wrapped in a check rather than assumed - opening the files directly, or
   over plain http from another machine, simply skips it.
   ========================================================================== */

// What actually happened when we tried. The adult panel reports this, and a
// wrong answer there is worse than no answer: it is how an adult decides
// whether the app is safe to use with the Wi-Fi off.
let swStatus = 'not tried';

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) { swStatus = 'not supported'; return; }

  /* updateViaCache:'none' stops the browser serving sw.js itself from its own
     HTTP cache. Without it the file that decides which version an iPad runs
     could be a stale copy, which is how an iPad stayed on an old release. */
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
    .then(function (registration) {
    swStatus = 'registered';

    // One may already be waiting from a previous visit.
    if (registration.waiting && navigator.serviceWorker.controller) {
      showUpdateBanner(registration.waiting);
    }

    // A new one has been found and is downloading.
    registration.addEventListener('updatefound', function () {
      const incoming = registration.installing;
      if (!incoming) return;

      incoming.addEventListener('statechange', function () {
        /* "installed" with a controller already present means this is an
           UPDATE, not the first install. On a first install there is nothing
           to tell anyone about - the app simply works offline from now on. */
        if (incoming.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner(incoming);
        }
      });
    });
  }).catch(function (err) {
    // No offline support. The app still works; it just needs the network.
    swStatus = 'failed: ' + (err && err.name ? err.name : 'unknown');
  });

  /* When the new worker takes over, reload once so the page is running the
     new files. The guard stops the endless reload loop this famously causes. */
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}

function showUpdateBanner(worker) {
  const banner = $('#update-banner');
  if (!banner) return;
  banner.hidden = false;

  $('#btn-update').onclick = function () {
    banner.hidden = true;
    logEvent('update_apply', {});
    // Tell the waiting worker to take over; controllerchange then reloads.
    worker.postMessage({ type: 'SKIP_WAITING' });
  };
}

/* The adult panel shows whether offline support is actually working, because
   "it should work offline" is not the same as "it does". */
async function offlineState() {
  if (!('serviceWorker' in navigator)) return 'not supported by this browser ⚠️';
  if (!window.isSecureContext) return 'needs https (or localhost) ⚠️';
  if (swStatus.indexOf('failed') === 0) return swStatus + ' — NOT working offline ⚠️';
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return 'not registered — NOT working offline ⚠️';
    if (navigator.serviceWorker.controller) return 'ready — works offline ✅';
    return 'installing — close and reopen once to finish';
  } catch (err) {
    return 'unavailable ⚠️';
  }
}


/* ==========================================================================
   24. SESSION, PRACTICE AND ASSET CHECK (added in V0 of the v2 spec)
   ==========================================================================
   Three adult-panel jobs that belong together: deciding which missions are
   open this week, keeping try-out data out of the research data, and showing
   which pictures and sounds have actually arrived.
   ========================================================================== */

function paintSessionControls() {
  $$('[data-session]').forEach(b =>
    b.classList.toggle('is-on', Number(b.dataset.session) === state.session));

  const practice = $('#btn-practice');
  if (practice) {
    practice.textContent = state.practice ? '⚠️ On' : 'Off';
    practice.classList.toggle('is-on', state.practice);
  }

  const box = $('#mission-switches');
  if (!box) return;
  box.innerHTML = '';

  MISSIONS.forEach(mission => {
    const open = missionIsOpen(mission);
    // A mission below this session's preset is off by default; say so rather
    // than letting it look broken.
    const futureWeek = mission.opensIn > state.session;

    const row = document.createElement('button');
    row.className = 'mission-switch' + (open ? ' is-on' : '');
    row.setAttribute('role', 'switch');
    row.setAttribute('aria-checked', open ? 'true' : 'false');
    row.innerHTML =
      '<span class="ms-icon">' + mission.icon + '</span>' +
      '<span class="ms-label">' + mission.title + '</span>' +
      '<span class="ms-state">' + (open ? 'Open' : (futureWeek ? 'Session ' + mission.opensIn : 'Off')) + '</span>';
    row.addEventListener('click', () => setMissionOn(mission.id, !open));
    box.appendChild(row);
  });
}


/* ---------------------------------------------------------------------------
   ASSET CHECK (v2 §5.0)
   Every item in the manifest, grouped, with ✅ or ⚠️ and a ▶️ to hear the
   sound ones. This is the list Filip works from between sessions.
   ------------------------------------------------------------------------ */
const ASSET_GROUPS = [
  { key: 'hq',         title: 'HQ places',      kind: 'image' },
  { key: 'situations', title: 'Situation cards', kind: 'image' },
  { key: 'stickers',   title: 'Stickers',       kind: 'image' },
  // v3 §11.1: the four new picture groups.
  { key: 'powers',     title: 'Power cards',    kind: 'image' },
  { key: 'doors',      title: 'Doors',          kind: 'image' },
  { key: 'cards',      title: 'Choice cards',   kind: 'image' },
  { key: 'display',    title: 'Display (big screen)', kind: 'image' },
  { key: 'narrator',   title: 'Narrator lines', kind: 'audio' },
  { key: 'sfx',        title: 'Sound effects',  kind: 'audio' }
];

async function runAssetCheck() {
  const box = $('#asset-check');
  box.innerHTML = '<p class="adult-note">Checking…</p>';
  await Assets.ready;
  // Ask the server fresh: files may have arrived since the app was opened.
  Assets.refresh();

  box.innerHTML = '';
  let totalHave = 0, totalAll = 0;

  for (const group of ASSET_GROUPS) {
    const items = Assets.list(group.key);
    if (items.length === 0) continue;

    // Ask about every item at once rather than one after another; a hundred
    // HEAD requests in a row would make this feel broken.
    const present = await Promise.all(items.map(item =>
      group.kind === 'image' ? Assets.hasImage(item.id) : Assets.hasAudio(item.id)));

    const have = present.filter(Boolean).length;
    totalHave += have;
    totalAll += items.length;

    const section = document.createElement('div');
    section.className = 'asset-group';
    section.innerHTML = '<h4 class="asset-group-title">' + group.title +
      ' <span class="asset-count">' + have + ' / ' + items.length + '</span></h4>';

    const list = document.createElement('div');
    list.className = 'asset-list';

    items.forEach((item, i) => {
      const row = document.createElement('div');
      row.className = 'asset-row' + (present[i] ? ' is-ok' : '');
      row.innerHTML =
        '<span class="asset-mark">' + (present[i] ? '✅' : '⚠️') + '</span>' +
        '<span class="asset-id">' + item.id + '</span>' +
        '<span class="asset-label">' + (item.label || item.text || '') + '</span>';

      if (group.kind === 'audio') {
        const play = document.createElement('button');
        play.className = 'btn asset-play';
        play.textContent = '▶️';
        play.setAttribute('aria-label', 'Play ' + item.id);
        play.addEventListener('click', () => Assets.preview(item.id));
        row.appendChild(play);
      }
      list.appendChild(row);
    });

    section.appendChild(list);
    box.appendChild(section);
  }

  if (totalAll === 0) {
    box.innerHTML = '<p class="adult-note">No manifest found. ' +
      'The app is using stand-ins for everything, which is fine.</p>';
    return;
  }

  const summary = document.createElement('p');
  summary.className = 'asset-summary';
  summary.textContent = totalHave + ' of ' + totalAll + ' files are here. ' +
    (totalAll - totalHave) + ' still using stand-ins.';
  box.insertBefore(summary, box.firstChild);
}


function wireSessionControls() {
  $$('[data-session]').forEach(b =>
    b.addEventListener('click', () => setSession(b.dataset.session)));

  $('#btn-practice').addEventListener('click', () => setPractice(!state.practice));
  $('#btn-asset-check').addEventListener('click', runAssetCheck);
  wireDisplayLink();
}


/* ==========================================================================
   25. THE PARTS KIT (added in v2 V2, spec §5.3.1)
   ==========================================================================

   WHAT THIS ADDS
   v1's Build door had seven shapes. A child could decorate an agent with
   them, but not build a face. parts.js draws 85 parts - heads, eyes, brows,
   mouths, noses, ears, hair, headwear, bodies and extras - and this section
   puts them on the agent.

   THE ONE THING THAT MAKES IT WORK
   Tapping a face part does not drop it in the middle of the stage. It snaps
   to where it belongs ON THE MOST RECENTLY ADDED HEAD, scaled to that head
   (v2 §5.3.1). That is what lets a child build a face by tapping rather than
   by dragging ten things into alignment - and it is why "a face can be built
   in under a minute" is V2's test.

   Parts live in the SAME `shapes` array as the v1 shapes, as more `type`s
   (v2 §5.3.1), so renderShapes, the card renderer, undo and the Boost copy
   all work on them without being duplicated.
   ========================================================================== */

// Which part tray is open, and whether the full colour range is showing.
const partsUi = { cat: 'heads', morePalette: false };

/* Every colour the parts kit knows, de-duplicated, in palette order. */
let allColoursCache = null;
function allPartColours() {
  if (allColoursCache) return allColoursCache;
  const seen = {}, out = [];
  Object.keys(Parts.PALETTES).forEach(key => {
    Parts.PALETTES[key].forEach(colour => {
      if (!seen[colour]) { seen[colour] = true; out.push(colour); }
    });
  });
  allColoursCache = out;
  return out;
}

/* The most recently added head, if there is one. Face parts land on it. */
function mostRecentHead() {
  const shapes = ensurePixels().shapes;
  for (let i = shapes.length - 1; i >= 0; i--) {
    const part = Parts.get(shapes[i].type);
    if (part && part.cat === 'heads') return shapes[i];
  }
  return null;
}

/* Work out where a tapped part should land, and how big it should be.

   A head or a body uses the stage: its anchor and size are fractions of the
   whole picture. A face part uses the HEAD: its anchor is a position across
   the head's own box (0.5, 0.44 is where eyes go) and its size is a fraction
   of the head's width. With no head yet, it falls back to the stage so the
   part still appears somewhere sensible rather than nowhere. */
function placementFor(part) {
  const head = mostRecentHead();
  const onFace = Parts.FACE_CATS.indexOf(part.cat) !== -1;

  if (!onFace || !head) {
    return { x: part.anchor.x, y: part.anchor.y, size: part.size };
  }

  const headPart = Parts.get(head.type);
  const headSize = head.size || 0.4;          // the head's width, 0-1 of stage

  // The head's box runs from its centre out by half its size in each
  // direction, so an anchor of 0.5,0.44 is converted into stage coordinates.
  return {
    x: head.x + (part.anchor.x - 0.5) * headSize,
    y: head.y + (part.anchor.y - 0.5) * headSize,
    // A face part's size is given relative to the head it sits on.
    size: part.size * headSize / (headPart ? 1 : 1)
  };
}

function addPart(partId) {
  const part = Parts.get(partId);
  if (!part) return;

  pushUndo();
  const p = ensurePixels();
  const place = placementFor(part);

  p.shapes.push({
    type: part.id,
    x: place.x, y: place.y,
    size: place.size,
    rotation: 0,
    colour: Parts.defaultColour(part),
    flipX: false
  });

  editor.selectedShape = p.shapes.length - 1;
  editor.selected = null;
  logEvent('part_add', { type: part.id, cat: part.cat, onHead: Boolean(mostRecentHead()) });
  playSfx('sfx-pop');
  refreshAgentViews();
  paintShapeControls();
  paintPartsPalette();
  scheduleSave();
}


/* ---------------------------------------------------------------------------
   THE TRAYS
   Non-human options come first inside each category (v2 §5.3.1); parts.js
   lists them in that order, so this only has to keep it.
   ------------------------------------------------------------------------ */
/* Tapping a category selects the part of that category already on the agent,
   if there is one.

   A child cannot reliably tap a face part on the stage: eyes, mouth, brows
   and hair all pile onto the same small head, and hair is a hollow crescent
   whose middle is empty, so a tap falls through to whatever is underneath.
   Measured on 7 October: tapping the head selected the eyes, tapping the hair
   selected the eyes, tapping the eyes selected the hair - not one part was
   selected by tapping its own centre. The palette then showed somebody else's
   colours, which reads as "hair has no colour option".

   Tapping the Hair tab is unambiguous, and it is what a child means anyway.
   The most recently added one wins, since that is the one on top. */
function selectPlacedPart(catId) {
  if (!state.agent) return;
  const shapes = ensurePixels().shapes || [];
  for (let i = shapes.length - 1; i >= 0; i--) {
    const part = Parts.get(shapes[i].type);
    if (part && part.cat === catId) {
      editor.selectedShape = i;
      editor.selected = null;
      refreshAgentViews();
      paintShapeControls();
      paintPartsPalette();
      return;
    }
  }
}

function buildPartsTray() {
  const tabs = $('#parts-cats');
  if (!tabs) return;
  tabs.innerHTML = '';

  Parts.CATEGORIES.forEach(cat => {
    const button = document.createElement('button');
    button.className = 'btn seg parts-cat' + (cat.id === partsUi.cat ? ' is-on' : '');
    button.innerHTML = '<span class="parts-cat-icon">' + cat.icon + '</span>' +
                       '<span class="parts-cat-label">' + cat.label + '</span>';
    button.setAttribute('aria-label', cat.label);
    button.addEventListener('click', () => {
      partsUi.cat = cat.id;
      selectPlacedPart(cat.id);     // "I want to change the hair" → select it
      buildPartsTray();
    });
    tabs.appendChild(button);
  });

  const tray = $('#parts-tray');
  tray.innerHTML = '';

  // The Shapes tab is still the seven v1 shapes.
  if (partsUi.cat === 'shapes') {
    SHAPES.forEach(shape => {
      tray.appendChild(shapeTrayButton(shape.id, shape.label));
    });
    return;
  }

  Parts.inCategory(partsUi.cat).forEach(part => {
    const button = document.createElement('button');
    button.className = 'tray-part';
    button.setAttribute('aria-label', part.label);
    button.title = part.label;

    // A little preview, drawn with the part's own default colour.
    const svg = make('svg', { viewBox: '0 0 100 100' });
    const g = make('g', {});
    g.innerHTML = part.svg;
    g.setAttribute('class', 'part-group');
    g.style.setProperty('--tint', Parts.defaultColour(part));
    svg.appendChild(g);
    button.appendChild(svg);

    // Tap to place; drag to place where you let go.
    button.addEventListener('click', () => addPart(part.id));
    tray.appendChild(button);
  });
}

// One of the seven v1 shapes, as a tray button (kept from Milestone 7).
function shapeTrayButton(id, label) {
  const button = document.createElement('button');
  button.className = 'tray-part';
  button.setAttribute('aria-label', 'Shape ' + label);
  const svg = make('svg', { viewBox: '-12 -12 24 24' });
  const el = shapeElement(id);
  el.setAttribute('fill', editor.colour);
  svg.appendChild(el);
  button.appendChild(svg);
  button.addEventListener('pointerdown', event => startShapeTrayDrag(event, id));
  return button;
}


/* ---------------------------------------------------------------------------
   COLOURING A PART (v2 §5.3.1)
   The part's own palette comes first - hair colours for hair, skin tones for
   a head - and everything else is behind "More". A child colouring hair
   should not have to hunt through sixteen brights for a brown.
   ------------------------------------------------------------------------ */
function paintPartsPalette() {
  const box = $('#parts-palette');
  if (!box) return;
  box.innerHTML = '';

  const shape = ensurePixels().shapes[editor.selectedShape];
  const part = shape ? Parts.get(shape.type) : null;

  /* "+ More" offers EVERY colour in the kit, not just the `any` palette.

     It used to add `any` on top of the part's own palette — but a part with
     no palette of its own already gets `any`, so for most parts it added
     nothing at all and the button appeared dead (7 October iPad test).
     The part's own colours still come first (v2 §5.3.1). */
  const own = Parts.paletteFor(part);
  const colours = partsUi.morePalette
    ? own.concat(allPartColours().filter(c => own.indexOf(c) === -1))
    : own;

  colours.forEach(colour => {
    const swatch = document.createElement('button');
    swatch.className = 'swatch' + (shape && shape.colour === colour ? ' is-on' : '');
    swatch.style.background = colour;
    swatch.setAttribute('aria-label', 'Colour ' + colour);
    swatch.addEventListener('click', () => recolourPart(colour));
    box.appendChild(swatch);
  });

  /* Hidden when there is nothing more to show, rather than sitting there
     doing nothing. */
  const more = $('#btn-parts-more');
  if (more) {
    const extra = allPartColours().filter(c => own.indexOf(c) === -1).length;
    more.textContent = partsUi.morePalette ? '− Fewer' : '+ More';
    more.hidden = extra === 0;
  }
}

function recolourPart(colour) {
  editor.colour = colour;
  const p = ensurePixels();
  const shape = p.shapes[editor.selectedShape];
  if (!shape) { paintPartsPalette(); return; }

  pushUndo();
  shape.colour = colour;
  logEvent('part_recolour', { type: shape.type, colour: colour });
  refreshAgentViews();
  paintPartsPalette();
  buildPartsTray();
  scheduleSave();
}


/* ---------------------------------------------------------------------------
   FLIP AND LAYER (v2 §5.3.1)
   ⬆️ ⬇️ override the category order; ↔️ mirrors a part.
   ------------------------------------------------------------------------ */
function flipPart() {
  const shape = ensurePixels().shapes[editor.selectedShape];
  if (!shape) return;
  pushUndo();
  shape.flipX = !shape.flipX;
  logEvent('part_flip', { type: shape.type, flipped: shape.flipX });
  refreshAgentViews();
  scheduleSave();
}

/* Move a part in front of or behind everything else. This sets an explicit
   `z`, which is what overrides the category order. */
function layerPart(direction) {
  const p = ensurePixels();
  const shape = p.shapes[editor.selectedShape];
  if (!shape) return;
  pushUndo();

  const layers = p.shapes.map(s => (s.z === undefined ? Parts.layerOf(s.type) : s.z));
  shape.z = direction === 'front' ? Math.max.apply(null, layers.concat([0])) + 1
                                  : Math.min.apply(null, layers.concat([0])) - 1;

  logEvent('part_layer', { type: shape.type, to: direction });
  refreshAgentViews();
  scheduleSave();
}


/* ==========================================================================
   26. POWER-UP (v2 V3, spec §5.4)
   ==========================================================================

   WHAT CHANGED FROM THE BOOST
   v1's Mission 2 asked a child to make a second, shinier version of their
   agent. It captured WHAT they chose and nothing about what it was for. v2
   §2 is blunt about why that failed: "a glow with no job can't be interpreted,
   so it can't become a requirement for the badge."

   So the Power-up asks three questions instead of one, on a single screen:
     1. what is your power?          (blank canvas first, ideas only on request)
     2. what does it look like?      (ten effects, played on the agent)
     3. WHEN does your agent use it? (the ten situation cards)

   Step 3 is the one that matters. Power x situation is the link v2 is after:
   it shows the moments where children want support.

   TWO RULES THIS SECTION KEEPS
   - **The ideas stay hidden** until the child has drawn something or tapped
     "Need ideas?". A child shown ten powers picks one; a child given a blank
     square invents. The event log records which happened, in order.
   - **No communication-themed powers are offered** (v2 §5.4). If children
     invent them, that is a finding, not a prompt we planted.
   ========================================================================== */

// The ten ideas, each with the effect it brings (v2 §5.4). Note what is NOT
// here: nothing about talking, being understood, or making yourself heard.
// The ten effects. The sound id is the effect id with fx- swapped for sfx-.

// Whether the ideas have been revealed this visit. Never remembered: each
// child meets the blank square first.


/* ---------------------------------------------------------------------------
   STEP 1: MAKE UP A POWER (v2 §5.4)
   Blank first. Always.
   ------------------------------------------------------------------------ */
/* The ideas are revealed only when asked for. The event log therefore shows
   whether a child drew first or reached for the list - which is the finding
   this screen exists to produce. */
/* The same two taps as every other card a child made: one arms, one removes. */
let powerOwnArmed = false;
let powerOwnTimer = null;

/* ---------------------------------------------------------------------------
   ✏️ MY OWN CARD
   A shared sheet: draw it, say it, or both. Used by step 3 now and by HQ and
   mood codes later, which is why `ownCardKeep` says where the result goes.
   ------------------------------------------------------------------------ */
let ownCardKeep = null;
let ownCardAudioId = null;

function openOwnCard(options) {
  const opts = (options && options.title) ? options : {};
  ownCardAudioId = null;
  ownCardKeep = opts.onKeep || function (card) {
    state.agent.powerup.whenOwn.push(card);
    logEvent('power_when_own', { drawn: Boolean(card.png), said: Boolean(card.audioId) });
    paintPowerWhen();
    scheduleSave();
  };

  $('#own-title').textContent = opts.title || 'Make your own card';
  $('#own-say').dataset.say = opts.say || 'nar-own-card';

  coder.canvas = $('#own-canvas');
  coder.undoStack = [];
  coder.colour = CODE_COLOURS[0];
  coder.width = 14;
  coder.mirror = false;
  coder.onStroke = null;
  clearCodeCanvas();
  paintCodePalette('#own-palette');
  paintOwnMic();

  $('#own-overlay').hidden = false;
  speakLine(opts.say || 'nar-own-card');
}

function closeOwnCard() {
  $('#own-overlay').hidden = true;
  clearCodeCanvas();
  coder.onStroke = null;
  coder.undoStack = [];
}

function paintOwnMic() {
  const button = $('#own-mic');
  if (!button) return;
  button.classList.toggle('is-on', Boolean(ownCardAudioId));
  $('#own-mic-word').textContent = ownCardAudioId ? 'Saved' : 'Say it';
}

async function recordOwnCard() {
  Voice.unlock();
  if (Voice.isRecording()) { Voice.stop(); return; }
  if (!Voice.canRecord()) { toast('This iPad cannot record'); return; }

  const button = $('#own-mic');
  button.classList.add('is-recording');
  try {
    const result = await Voice.record({ maxMs: 10000, onTick: () => {} });
    const id = uuid();
    await Storage.saveAudio(id, result.blob);
    if (ownCardAudioId) await Storage.deleteAudio(ownCardAudioId);
    ownCardAudioId = id;
    playSfx('sfx-pop');
  } catch (err) {
    toast('The microphone did not work');
  }
  button.classList.remove('is-recording');
  paintOwnMic();
}

function keepOwnCard() {
  const drawn = canvasHasInk();
  if (!drawn && !ownCardAudioId) { toast('Draw it or say it first'); return; }

  const card = {
    png: drawn ? coder.canvas.toDataURL('image/png') : null,
    audioId: ownCardAudioId
  };
  const keep = ownCardKeep;
  ownCardAudioId = null;
  closeOwnCard();
  if (keep) keep(card);
  playSfx('sfx-pop');
}

/* One tap arms, a second tap within 3 seconds removes. No dialog: §12 rules
   out text-heavy UI, and the whole 136px card stays the touch target. */
let ownRemoveArmed = null;
let ownRemoveTimer = null;

/* ---------------------------------------------------------------------------
   Wiring the Power-up up. Called once, from wireUp().
   ------------------------------------------------------------------------ */
/* The shared ✏️ "draw it or say it" sheet (openOwnCard), and every 🔊 on any
   screen that says its own line. Both used to be wired inside wirePowerup()
   but serve the whole app: the HQ screen, and from v3 every ✏️ My own. */
function wireOwnCard() {
  attachBrush($('#own-canvas'));
  $$('[data-say]').forEach(b =>
    b.addEventListener('click', () => speakLine(b.dataset.say)));
  $('#own-undo').addEventListener('click', undoCode);
  $('#own-clear').addEventListener('click', clearCode);
  $('#own-mic').addEventListener('click', recordOwnCard);
  $('#own-cancel').addEventListener('click', closeOwnCard);
  $('#own-save').addEventListener('click', keepOwnCard);
  $('#own-say').addEventListener('click', () => speakLine($('#own-say').dataset.say));
}

/* ===========================================================================
   27. SAFE PLACE (v3 §6, P4), built on the v2 HQ screen (v2 V4, §5.5)

   Two questions, one at a time, on the screen that asked "Where is your
   agent strongest?" in session 2:
     💬 "Where does your agent feel safe to talk?"     -> agent.safe.talk
     ⛔ "Where does your agent's power stop working?" -> agent.safe.stops

   Each answer is one of the twelve places, Nowhere, or a place the child
   draws or says on the shared ✏️ sheet. Tapping a place drops the agent into
   it with the same small landing as v2.

   - IT NEVER WRITES TO `hq` (v3 §6). Session 2's "strongest" answer stays
     exactly as it was, so the two sessions can be compared.
   - Nowhere is an equal choice - a card the same size as the places - not a
     way of clearing a mistake.
   - On every other screen the agent now stands in its safe-to-talk place,
     or in its HQ if it has none (agentPlace()).
   - The app says nothing about the place a child picks (v2 §12). The quiet
     room and the jungle are the same size and read out the same way.
   - Off in the session-3 preset (MISSIONS: defaultOn false); an adult
     switches it on in the panel.
   ======================================================================== */

/* The two groups, in the spec's order. The ids are the manifest's, so each
   card's picture and its `nar-<id>` voice line both arrive for free. */
const HQ_REAL    = ['hq-classroom', 'hq-playground', 'hq-library',
                    'hq-quiet-room', 'hq-lunch-hall', 'hq-home'];
const HQ_FANTASY = ['hq-space', 'hq-underwater', 'hq-jungle',
                    'hq-city-rooftop', 'hq-sky-castle', 'hq-secret-lab'];

const SAFE_NOWHERE = 'safe-nowhere';

const SAFE_STEPS = {
  talk:  { title: 'Where does your agent feel safe to talk?',
           say: 'nar-safe-talk', next: 'stops' },
  stops: { title: "Where does your agent's power stop working?",
           say: 'nar-safe-stops', next: null }
};

const safeUi = { step: 'talk' };

/* Where an agent stands on every screen (v3 §6): its safe-to-talk place if
   it has a real one, otherwise its HQ from session 2. Returns { id, png }
   in the same shape as `hq`, so the code that draws backgrounds does not
   need to know which it got. */
function agentPlace(agent) {
  if (!agent) return { id: null, png: null };
  const talk = agent.safe && agent.safe.talk;
  if (talk && (talk.png || (talk.id && talk.id !== SAFE_NOWHERE))) {
    return { id: talk.png ? null : talk.id, png: talk.png || null };
  }
  return { id: (agent.hq && agent.hq.id) || null, png: (agent.hq && agent.hq.png) || null };
}

function enterSafe() {
  if (!state.agent) return;
  hideEditor();
  safeUi.step = 'talk';
  renderSafe();
}

/* The answer for the step on screen, or null. */
function safeAnswer() {
  return (state.agent && state.agent.safe && state.agent.safe[safeUi.step]) || null;
}

function renderSafe() {
  if (!state.agent) return;
  const step = SAFE_STEPS[safeUi.step];
  $('#safe-title').textContent = step.title;
  $('#safe-next').hidden = !step.next;
  $$('[data-safe-step]').forEach(b =>
    b.classList.toggle('is-on', b.dataset.safeStep === safeUi.step));

  renderAgentView($('#hq-stage'), state.agent.cover, false);
  showPlaceOn($('#hq-stage'), safeAnswer());

  paintPlaceRow('#hq-real', HQ_REAL);
  paintPlaceRow('#hq-fantasy', HQ_FANTASY);
  paintNowhere();
  paintSafeOwn();
  paintSafeWhere();
}

/* Put a place behind the agent on one view: a photograph, a drawing, or
   none. The stage is marked data-scene="moment", so setHqBackdrop() will not
   swap in the HQ a moment later. `placeToken` stops a slow photograph from
   an earlier tap landing after a newer choice. */
let placeToken = 0;
function showPlaceOn(view, answer) {
  const token = ++placeToken;
  const clear = () => {
    view.style.removeProperty('--hq-image');
    view.classList.remove('has-hq');
  };
  if (!answer) { clear(); return; }
  if (answer.png) {
    view.style.setProperty('--hq-image', 'url("' + answer.png + '")');
    view.classList.add('has-hq');
    return;
  }
  if (!answer.id || answer.id === SAFE_NOWHERE) { clear(); return; }
  Assets.image(answer.id).then(img => {
    if (token !== placeToken) return;
    if (!img) { clear(); return; }
    view.style.setProperty('--hq-image', 'url("' + img.src + '")');
    view.classList.add('has-hq');
  });
}

/* One row of picture cards. `Assets.card()` gives the photograph with its
   emoji stand-in underneath, so an empty assets/ folder still works. */
function paintPlaceRow(selector, ids) {
  const box = $(selector);
  if (!box) return;
  box.innerHTML = '';
  const answer = safeAnswer();
  ids.forEach(id => {
    const card = Assets.card(id);
    if (answer && answer.id === id) card.classList.add('is-on');
    card.addEventListener('click', () => chooseSafe(id));
    box.appendChild(card);
  });
}

function paintNowhere() {
  const box = $('#safe-nowhere');
  box.innerHTML = '';
  const card = Assets.card(SAFE_NOWHERE, { fallback: '🚫', label: 'Nowhere' });
  const answer = safeAnswer();
  if (answer && answer.id === SAFE_NOWHERE) card.classList.add('is-on');
  card.addEventListener('click', () => chooseSafe(SAFE_NOWHERE));
  box.appendChild(card);
}

/* The line under the agent: where it is for this question, in words. */
function paintSafeWhere() {
  const answer = safeAnswer();
  let text = 'Not chosen yet';
  if (answer && (answer.png || answer.audioId)) text = 'My own place';
  else if (answer && answer.id === SAFE_NOWHERE) text = 'Nowhere';
  else if (answer && answer.id) {
    const entry = Assets.item(answer.id);
    text = entry ? entry.label : answer.id;
  }
  $('#hq-where').textContent = text;
}

function chooseSafe(id) {
  const step = safeUi.step;
  const before = safeAnswer();
  state.agent.safe[step] = { id: id, png: null };
  logEvent('safe_choose', {
    step: step,
    id: id,
    changed: Boolean(before && (before.id || before.png || before.audioId))
  });
  speakLabel(id);                 // the card says its label: "Library", "Nowhere"…
  renderSafe();
  refreshAgentViews();            // the thumbnail stands in the new place too
  if (id !== SAFE_NOWHERE) landAgent();
  else playSfx('sfx-pop');
  scheduleSave();
}

/* Move between the two questions: ➡️, or the 💬 ⛔ buttons. */
function goSafeStep(step, how) {
  if (!SAFE_STEPS[step] || step === safeUi.step) return;
  logEvent('safe_step', { to: step, how: how });
  safeUi.step = step;
  renderSafe();
}

/* The landing (v2 §5.5). The class is removed first so that choosing the same
   place twice replays it - an animation only restarts when the class is
   actually added again. */
const HQ_LAND_MS = 620;                 // must match the hq-land rule in style.css
let hqLandTimer = null;

function landAgent() {
  const stage = $('#hq-stage');
  if (!stage || !fullMotion()) return;

  stage.classList.remove('is-landing');
  void stage.offsetWidth;              // forces the browser to notice
  stage.classList.add('is-landing');
  playSfx('sfx-whoosh');               // §4.6's "quick, soft whoosh"

  /* A timer, not `animationend`. Four layers carry this animation and only
     the visible ones fire the event at all - and none of them fire if the
     tab is in the background, which would leave `is-landing` stuck on the
     stage for the rest of the session. A timer always arrives. */
  clearTimeout(hqLandTimer);
  hqLandTimer = setTimeout(() => stage.classList.remove('is-landing'),
                           HQ_LAND_MS + 60);
}


/* ---------------------------------------------------------------------------
   ✏️ DRAW MY OWN PLACE
   The shared ✏️ sheet: draw it, say it, or both. A drawn place replaces a
   photograph and the other way round, as in v2. A place that is only SAID
   keeps its recording as `audioId` - there is nothing to draw behind the
   agent, but the child's words are not thrown away.
   ------------------------------------------------------------------------ */
function openSafeDraw() {
  const step = safeUi.step;
  openOwnCard({
    title: 'Draw your own place',
    say: SAFE_STEPS[step].say,
    onKeep: card => {
      state.agent.safe[step] = { id: null, png: card.png, audioId: card.audioId || null };
      logEvent('safe_draw', { step: step, drawn: Boolean(card.png), said: Boolean(card.audioId) });
      renderSafe();
      refreshAgentViews();
      if (card.png) landAgent();
      scheduleSave();
    }
  });
}

/* The child's own place, beside the ✏️ button once it exists, with the
   two-tap remove every kept card has (ownCardTile). */
function paintSafeOwn() {
  const box = $('#hq-own');
  box.innerHTML = '';
  const answer = safeAnswer();
  if (!answer || !(answer.png || answer.audioId)) return;
  const step = safeUi.step;
  box.appendChild(ownCardTile(answer, 'safe-' + step,
    () => removeSafeOwn(step),
    () => paintSafeOwn()));
}

async function removeSafeOwn(step) {
  const answer = state.agent.safe[step];
  if (!answer) return;
  if (answer.audioId) { Voice.forget(answer.audioId); await Storage.deleteAudio(answer.audioId); }
  state.agent.safe[step] = null;
  logEvent('safe_draw_remove', { step: step });
  renderSafe();
  refreshAgentViews();
  scheduleSave();
}


/* Wiring Safe place up. Called once, from wireUp(). */
function wireSafe() {
  $('#btn-hq-draw').addEventListener('click', openSafeDraw);
  $('#btn-hq-again').addEventListener('click', landAgent);
  $('#safe-next').addEventListener('click', () => {
    const next = SAFE_STEPS[safeUi.step].next;
    if (next) goSafeStep(next, 'next');
  });
  $$('[data-safe-step]').forEach(b =>
    b.addEventListener('click', () => goSafeStep(b.dataset.safeStep, 'tab')));
  $('#safe-say').addEventListener('click', () => speakLine(SAFE_STEPS[safeUi.step].say));
}


/* ===========================================================================
   28. THE SEAL (v2 V5, §5.2)

   The seal is NOT security. It is a spy-themed privacy choice, and *who
   chooses to seal* is itself the research data. Three symbols in order out
   of nine; a wrong try shakes and nothing ever locks a child out; and an
   adult can always open a file with the panel PIN.

   v3 keeps the seal (v3 §3) but retired the card that offered it, so for now
   a child can OPEN a sealed agent but cannot seal a new one. The badge check
   and wall check that shared this section went with the card; git and the
   session-2 tag keep them.
   ======================================================================== */

/* §5.2's nine symbols, in the spec's order. */
const SEAL_SYMBOLS = ['🦊', '🌙', '⚡', '🍕', '🎈', '🌵', '🐙', '🎲', '🔑'];
const SEAL_LENGTH = 3;


/* ---------------------------------------------------------------------------
   THE SEAL (v2 §5.2)

   Two jobs in one sheet, told apart by `sealMode`:
     'set'  - the child is choosing three symbols to seal this file
     'open' - a sealed file is being opened and the symbols are being checked

   It is deliberately gentle. A wrong try shakes the row and clears it; there
   is no counter, no lock-out and no "2 tries left". The symbols are visible
   as they are chosen, because this is an order-of-symbols choice, not a
   memory test, and a child who forgets theirs is not locked out of their own
   work - "Ask a grown-up" opens it with the adult PIN.
   ------------------------------------------------------------------------ */
/* Log an event onto an agent that is NOT the one in state, and save it
   straight away.

   `logEvent()` writes to `state.agent` and leaves the debounced save to catch
   up. That is wrong here: opening a sealed file replaces `state.agent` with a
   fresh copy loaded from storage, which threw the event away before the save
   ran - so the log recorded every failed unseal and never a successful one. */
async function logEventOnAgent(agent, action, detail) {
  if (!agent) return;
  if (!Array.isArray(agent.events)) agent.events = [];
  agent.events.push({
    t: nowIso(), session: state.session, practice: Boolean(state.practice),
    mission: currentMissionId(), action: action, detail: detail || {}
  });
  await Storage.saveAgent(agent);
}

let sealMode = 'set';
let sealPicked = [];
let sealTargetId = null;        // which agent is being opened, in 'open' mode
let sealOnOpen = null;          // what to do once it is open

function openSealSheet() {
  if (!state.agent) return;
  Voice.unlock();

  sealMode = 'set';
  sealPicked = [];
  sealTargetId = null;

  $('#seal-title').textContent = state.agent.seal ? 'Change your symbols' : 'Seal your file?';
  $('#seal-say').dataset.say = 'nar-card-seal';
  $('#btn-seal-adult').hidden = true;        // nothing to unlock while setting
  paintSealSymbols();
  paintSealPicked();

  $('#seal-overlay').hidden = false;
  speakLine('nar-card-seal');
}

/* Asking for the symbols of a sealed agent, from the gallery. */
function askForSeal(agent, onOpen) {
  Voice.unlock();

  sealMode = 'open';
  sealPicked = [];
  sealTargetId = agent.id;
  sealOnOpen = onOpen;

  $('#seal-title').textContent = (agent.codename || 'This file') + ' is sealed';
  $('#seal-say').dataset.say = 'nar-seal-open';
  $('#btn-seal-adult').hidden = false;
  paintSealSymbols();
  paintSealPicked();

  $('#seal-overlay').hidden = false;
  speakLine('nar-seal-open');
}

function paintSealSymbols() {
  const box = $('#seal-symbols');
  box.innerHTML = '';
  SEAL_SYMBOLS.forEach(symbol => {
    const button = document.createElement('button');
    button.className = 'seal-symbol';
    button.textContent = symbol;
    button.setAttribute('aria-label', 'Symbol ' + symbol);
    button.addEventListener('click', () => pickSeal(symbol));
    box.appendChild(button);
  });
}

function paintSealPicked(wrong) {
  const row = $('#seal-picked');
  row.innerHTML = '';
  for (let i = 0; i < SEAL_LENGTH; i++) {
    const slot = document.createElement('span');
    slot.className = 'seal-slot' + (sealPicked[i] ? ' is-filled' : '');
    slot.textContent = sealPicked[i] || '';
    row.appendChild(slot);
  }
  row.classList.toggle('is-wrong', Boolean(wrong));
}

function pickSeal(symbol) {
  if (sealPicked.length >= SEAL_LENGTH) return;
  sealPicked.push(symbol);
  playSfx('sfx-pop');
  paintSealPicked();

  if (sealPicked.length === SEAL_LENGTH) {
    // A beat, so the child sees the third symbol land before anything happens.
    setTimeout(sealComplete, 350);
  }
}

function undoSeal() {
  if (!sealPicked.length) return;
  sealPicked.pop();
  paintSealPicked();
}

function sealComplete() {
  if (sealMode === 'set') {
    state.agent.seal = sealPicked.join('');
    logEvent('seal_set', {});          // WHICH symbols are not research data
    playSfx('sfx-seal');
    scheduleSave();
    closeSealSheet();
    toast('🔒 Sealed');
    return;
  }

  // 'open'
  openSealedAgent();
}

async function openSealedAgent() {
  const agent = migrateAgent(await Storage.loadAgent(sealTargetId));
  if (!agent) { closeSealSheet(); return; }

  if (agent.seal === sealPicked.join('')) {
    // Saved onto the file being opened, before it is reloaded.
    await logEventOnAgent(agent, 'seal_open_ok', {});
    playSfx('sfx-seal');
    closeSealSheet();
    if (sealOnOpen) sealOnOpen(agent.id);
    return;
  }

  /* Wrong. Shake, clear, and let them try again as often as they like - there
     is no counter and no lock-out. The attempt belongs to the file that was
     knocked on, not to whatever agent happens to be open. */
  await logEventOnAgent(agent, 'seal_open_fail', {});
  paintSealPicked(true);
  setTimeout(() => { sealPicked = []; paintSealPicked(); }, 450);
}

/* "Ask a grown-up": the panel PIN opens any file. A child who forgets their
   symbols must never lose their own work. */
async function sealAskAdult() {
  const entered = prompt('Grown-up PIN');
  if (entered === null) return;
  if (String(entered).trim() !== ADULT_PIN) { paintSealPicked(true); return; }

  const id = sealTargetId;
  const agent = await Storage.loadAgent(id);
  await logEventOnAgent(agent, 'seal_open_ok', { by: 'adult' });
  closeSealSheet();
  if (sealOnOpen) sealOnOpen(id);
}

function closeSealSheet() {
  $('#seal-overlay').hidden = true;
  sealPicked = [];
}

/* The seal (v2 §5.2), kept in v3: a sealed agent still asks for its symbols
   before it opens from the gallery. Its only entry point was the retired
   card, so no child can SET a seal until a v3 screen offers it again. */
function wireSeal() {
  $('#btn-seal-undo').addEventListener('click', undoSeal);
  $('#btn-seal-adult').addEventListener('click', sealAskAdult);
  $('#btn-seal-cancel').addEventListener('click', closeSealSheet);
  // #seal-say needs no listener of its own: it carries data-say in the HTML,
  // so wireOwnCard()'s generic [data-say] wiring already speaks whatever
  // line it says at the moment of the tap. A second listener said it twice.
}



/* ===========================================================================
   29. THE DISPLAY LINK (v3 §9.3, P1)

   The ONE way anything leaves this iPad (v3 §1): when a child sends a
   bottle, that bottle goes to the relay on Filip's laptop, over the room's
   own Wi-Fi, and the relay shows it on the big screen.

   What an adult sees, in the adult panel:
     - an on/off switch, OFF until an adult turns it on;
     - the relay's address, tact-display.local:8443 unless changed;
     - 📡 Test, which asks the relay "are you there?" (✅ / ⚠️);
     - 🍾 Send test bottle, a made-up bottle with no child's data in it.

   Rules from §9.3 that the code below keeps:
     - Only https, only port 8443, only a *.local name or localhost. The
       Content-Security-Policy in index.html enforces the same thing, so even
       a mistake here could not reach anywhere else.
     - Every request gives up after 4 seconds.
     - A child never sees an error. sendToRelay() just answers false, and P6
       keeps that bottle as `waiting` until the link comes back.
     - The service worker ignores these requests (they are not to this app's
       own address), so nothing sent or received here is ever cached.

   SYNTAX NOTES FOR A BEGINNER
   - `fetch()` asks another computer for something and waits for the answer.
   - An AbortController is a "cancel button" for a fetch: a timer presses it
     after 4 seconds, so a missing relay cannot leave the app waiting.
   - `try { … } finally { … }` runs the `finally` part whether the `try` part
     worked or failed - here, to stop the timer either way.
   ======================================================================== */
const DISPLAY_DEFAULT_ADDRESS = 'tact-display.local:8443';
const RELAY_PORT = 8443;
const RELAY_TIMEOUT_MS = 4000;

/* Turn what the adult typed into the relay's web address - or null if it is
   an address the app is not allowed to reach. Forgiving about what is typed
   ("https://", a missing port, capitals); strict about where it can point. */
function relayOrigin(address) {
  let text = String(address || '').trim().toLowerCase();
  text = text.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const match = text.match(/^([a-z0-9-]+(?:\.[a-z0-9-]+)*)(?::(\d+))?$/);
  if (!match) return null;
  const host = match[1];
  const port = match[2] ? Number(match[2]) : RELAY_PORT;
  if (port !== RELAY_PORT) return null;
  if (host !== 'localhost' && !/\.local$/.test(host)) return null;
  return 'https://' + host + ':' + port;
}

/* Ask the relay for something, giving up after 4 seconds. Throws if it
   cannot be reached; the callers below turn that into ⚠️ or `false`. */
async function relayFetch(path, options) {
  const origin = relayOrigin(state.displayAddress || DISPLAY_DEFAULT_ADDRESS);
  if (!origin) throw new Error('address not allowed');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RELAY_TIMEOUT_MS);
  try {
    return await fetch(origin + path, Object.assign({
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'omit'        // no cookies, nothing about this iPad
    }, options));
  } finally {
    clearTimeout(timer);
  }
}

/* Send one bottle. Answers true if the relay took it, false if not - it
   never throws, because a failure must never reach a child (§9.3). P6 builds
   the payload (§9.1: no agent id, no event log, and for a friend or teacher
   only the envelope) and keeps an unsent bottle as `waiting`. */
async function sendToRelay(payload) {
  if (!state.displayOn) return false;
  try {
    const response = await relayFetch('/bottle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return response.ok;
  } catch (err) {
    return false;
  }
}

/* ---- the adult panel's Display link card ---- */

function paintDisplayLink(message) {
  const button = $('#btn-display-on');
  if (!button) return;
  button.textContent = state.displayOn ? '📡 On' : 'Off';
  button.classList.toggle('is-on', state.displayOn);
  button.setAttribute('aria-checked', state.displayOn ? 'true' : 'false');
  const input = $('#display-address');
  if (document.activeElement !== input) {
    input.value = state.displayAddress || DISPLAY_DEFAULT_ADDRESS;
  }
  if (message !== undefined) $('#display-result').textContent = message;
}

async function setDisplayOn(on) {
  state.displayOn = Boolean(on);
  await Storage.setMeta('displayOn', state.displayOn);
  // Switching on is the moment to send anything that has been waiting.
  if (state.displayOn) sendWaitingBottles();
  paintDisplayLink(state.displayOn
    ? 'On. A bottle a child sends will go to the display.'
    : 'Off. Bottles stay on this iPad until the link is on.');
}

async function setDisplayAddress(text) {
  if (!relayOrigin(text)) {
    paintDisplayLink('⚠️ That address will not work. It must end in .local:8443 ' +
                     '(for example tact-display.local:8443). See the README.');
    return;
  }
  // Saved tidied up - "https://Tact-Display.local/" becomes
  // "tact-display.local:8443" - so the field always shows one clear form.
  state.displayAddress = relayOrigin(text).replace('https://', '');
  await Storage.setMeta('displayAddress', state.displayAddress);
  paintDisplayLink('Address saved. Tap 📡 Test.');
}

/* The words for a failed request. An adult reads these, so they can say
   what to check - but they are never shown to a child. */
function relayTrouble(err) {
  if (err && err.message === 'address not allowed') {
    return '⚠️ The address must end in .local:8443.';
  }
  if (err && err.name === 'AbortError') {
    return '⚠️ No answer within 4 seconds. Is the relay running on the laptop, ' +
           'and is this iPad on the same Wi-Fi?';
  }
  return '⚠️ Could not reach the display. Check the relay is running, the iPad ' +
         'is on the same Wi-Fi, and the certificate is trusted on this iPad (README).';
}

async function testDisplayLink() {
  paintDisplayLink('Testing…');
  try {
    const response = await relayFetch('/status', { method: 'GET' });
    const answer = await response.json().catch(() => ({}));
    paintDisplayLink(response.ok && answer.ok
      ? '✅ The display answered.' + (state.displayOn ? '' : ' Switch the link on to use it.')
      : '⚠️ Something answered, but not the Agent Lab relay.');
  } catch (err) {
    paintDisplayLink(relayTrouble(err));
  }
}

/* A made-up bottle, so the whole path can be tried before the children
   arrive. It carries NOTHING from any agent on this iPad. */
async function sendTestBottle() {
  paintDisplayLink('Sending…');
  const payload = {
    type: 'bottle',
    test: true,
    bottleId: uuid(),
    sentAt: nowIso(),
    to: 'who-everyone',
    toEmblem: null,
    signed: true,
    from: { codename: 'Test bottle', emblem: '📡', picture: null, handshake: null },
    items: []
  };
  try {
    const response = await relayFetch('/bottle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    paintDisplayLink(response.ok
      ? '✅ Sent. It should be on the display now.'
      : '⚠️ The relay turned it away.');
  } catch (err) {
    paintDisplayLink(relayTrouble(err));
  }
}

function wireDisplayLink() {
  $('#btn-display-on').addEventListener('click', () => setDisplayOn(!state.displayOn));
  $('#display-address').addEventListener('change', event => setDisplayAddress(event.target.value));
  $('#btn-display-test').addEventListener('click', testDisplayLink);
  $('#btn-display-send').addEventListener('click', sendTestBottle);
}


/* ===========================================================================
   30. QUICK AGENT (v3 §4, P2)

   Two things make a new agent quicker, and one question is asked of every
   agent once:

   1. START FROM A READY AGENT. When Make opens on an agent with nothing on
      it, a sheet offers the eight ready agents from Parts.BASES and "Start
      blank". Picking one COPIES its shapes into the cover - every part of
      it can then be changed - and the editor opens on Hair (or on Hats, for
      an agent whose head is covered), with the colours showing, because
      changing the hair and the colours is what makes it the child's own.
      The eight are shuffled each time, so none of them is "the first one".

   2. IS YOUR AGENT LIKE YOU? Three equal cards. Asked once per agent: right
      after Make is stamped, or - for an agent made before v3 - the first
      time it is opened. One tap answers, another tap changes the answer, and
      ➡️ carries on with or without one. The app never comments on it.

   The log answers the research questions on its own: `base_choose` says
   which agent a child started from (and where it was on the grid), and
   `like_me_ask` / `like_me` / `like_me_skip` say when the question came and
   what was chosen, including every change of mind.
   ======================================================================== */

const LIKE_ME = [
  { id: 'likeme-like', emoji: '🪞', label: 'Like me' },
  { id: 'likeme-bit',  emoji: '🌗', label: 'A bit like me' },
  { id: 'likeme-else', emoji: '🎭', label: 'Someone else' }
];

/* ---- 1. The ready agents ---- */

/* Offer them when Make opens on an agent that has never been offered them
   and has nothing on it yet. That is every new agent - and also one whose
   iPad was closed while the sheet was up, which then simply sees it again. */
function shouldOfferBases() {
  return Boolean(state.agent) && state.agent.base === null &&
         !hasArt(state.agent.cover);
}

/* A new random order every time. The Fisher-Yates shuffle: walk backwards
   through the list, swapping each item with a random one at or before it. */
function shuffled(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function openBasePicker() {
  const grid = $('#base-grid');
  grid.innerHTML = '';

  shuffled(Parts.BASES).forEach((base, i) => {
    const button = document.createElement('button');
    button.className = 'base-card';
    // No name: "a ready agent" is all a screen reader says, as a child sees.
    button.setAttribute('aria-label', 'Ready agent');
    // Cropped to where the ready agents actually are (from the top of the
    // tallest hair to the bottom of the body), so each one fills its tile.
    const svg = make('svg', { viewBox: '12 2 76 86', 'aria-hidden': 'true' });
    renderShapes(svg, base.shapes, false);
    button.appendChild(svg);
    button.addEventListener('click', () => chooseBase(base, i + 1));
    grid.appendChild(button);
  });

  // Start blank, last: the same empty dashed agent as the Start screen.
  const blank = document.createElement('button');
  blank.className = 'base-card base-blank';
  blank.innerHTML =
    '<svg class="hero-outline" viewBox="0 0 100 120" aria-hidden="true">' +
      '<circle cx="50" cy="32" r="24"/>' +
      '<path d="M12 117 C12 84 29 64 50 64 C71 64 88 84 88 117 Z"/>' +
    '</svg>' +
    '<span class="base-blank-label">Start blank</span>';
  blank.addEventListener('click', () => chooseBase(null, Parts.BASES.length + 1));
  grid.appendChild(blank);

  $('#base-overlay').hidden = false;
}

/* `base` is a Parts.BASES entry, or null for Start blank. `position` is
   where it was on the grid (1-9), kept in the log because the order is
   shuffled and a researcher may want to know whether position mattered. */
function chooseBase(base, position) {
  if (!state.agent) return;
  $('#base-overlay').hidden = true;

  if (!base) {
    state.agent.base = 'blank';
    logEvent('base_choose', { base: 'blank', position: position });
    speakLabel('base-blank');
    scheduleSave();
    return;
  }

  pushUndo();                          // so ↩️ Undo can go back to blank
  const cover = ensurePixels();
  // A COPY, so nothing a child does can ever change the ready agent itself.
  cover.shapes = JSON.parse(JSON.stringify(base.shapes));
  state.agent.base = base.id;
  logEvent('base_choose', { base: base.id, position: position });
  playSfx('sfx-pop');

  // v3 §4: open on the hair - or the hijab, turban or cap where there is one
  // instead - with its colours showing.
  const hasHair = cover.shapes.some(s => (Parts.get(s.type) || {}).cat === 'hair');
  partsUi.cat = hasHair ? 'hair' : 'headwear';
  selectPlacedPart(partsUi.cat);
  buildPartsTray();
  refreshAgentViews();
  scheduleSave();
}

/* ---- 2. Is your agent like you? ---- */

/* Asked once: the `like_me_ask` event is the record that it was. An answer
   from before that event existed counts too. */
function likeMeAsked(agent) {
  return Boolean(agent) && (agent.likeMe !== null ||
    (agent.events || []).some(e => e.action === 'like_me_ask'));
}

let likeMeThen = null;               // what to do once the sheet closes

/* Ask the question if this agent has not been asked. `when` is 'stamp' or
   'open', for the log. `then` runs after the sheet closes - or straight
   away, if there is nothing to ask. */
function askLikeMe(when, then) {
  if (!state.agent || likeMeAsked(state.agent)) {
    if (then) then();
    return;
  }
  likeMeThen = then || null;
  logEvent('like_me_ask', { when: when });
  paintLikeMe();
  $('#likeme-overlay').hidden = false;
  scheduleSave();
}

function paintLikeMe() {
  const box = $('#likeme-cards');
  box.innerHTML = '';
  LIKE_ME.forEach(card => {
    // modeCard() is defined with "How my agent talks" (section 31).
    box.appendChild(modeCard(card, state.agent.likeMe === card.id,
                             () => chooseLikeMe(card.id)));
  });
}

function chooseLikeMe(id) {
  if (!state.agent) return;
  state.agent.likeMe = id;
  logEvent('like_me', { answer: id });
  speakLabel(id);
  paintLikeMe();
  scheduleSave();
}

/* v3 §4: "or the first time an agent without an answer is opened" - but
   only an agent whose Make is finished. One that is still being made will
   be asked when its Make is stamped, about an agent that exists. */
function askLikeMeOnOpen() {
  if (state.agent && state.agent.missions.make !== 'todo') askLikeMe('open');
}

function closeLikeMe() {
  if (!state.agent) return;
  if (state.agent.likeMe === null) logEvent('like_me_skip', {});
  $('#likeme-overlay').hidden = true;
  scheduleSave();
  const then = likeMeThen;
  likeMeThen = null;
  if (then) then();
}

function wireQuickAgent() {
  $('#btn-likeme-go').addEventListener('click', closeLikeMe);
}


/* ===========================================================================
   31. HOW MY AGENT TALKS (v3 §5, P3)

   Redesigned twice on 3 November 2026, after Filip tried it. The room is
   loud, so nothing may depend on hearing or reading, and the agent must be
   big and DO the thing. So:

   - ONE CARD AT A TIME, big. The card's picture moves (talking beats and
     sends out rings, signing hands wave…), the agent acts it out beside it,
     and the sentence is SAID: "My agent likes… Talking." This is how a
     Talking Mat works (Murphy, University of Stirling), a method built for
     children who find talking about talking hard.
   - The child answers with THE AGENT, not a symbol: three small copies of
     their own agent - one nods ✓, one tilts its head ?, one shakes it ✗ -
     and the big agent does the same when one is tapped. The data is the
     same three piles as before (yes / unsure / no).
   - Three parts, each a short heading with an icon:
       🗣️ My agent likes…        suit.likes / likesUnsure / likesNot
       ⭐ Which one does your
          agent like the most?    suit.best - one card from the ✓ pile
       🤫 A secret word          secretWord - an invented word, said with 🎤,
                                 given one of the six spy voices
   - "School wants us to…" is GONE (Filip, 4 November 2026, v87): what
     school expects is to come out some other way. Its fields (suit.school
     and the rest) stay in the data, empty from v87.
   - No ✏️ My own here any more: nobody used it in session 2 (Filip). The
     fields stay in the data; nothing new goes into them.
   - THE APP NEVER REACTS TO THE PILES: what an agent likes is for the
     analysis and for next session's questions, never for a comment.
   - The secret handshake lives on a sheet that Powers opens (see below).
   ======================================================================== */

/* `act` is how the agent acts the card out (style.css, .act-*); `anim` is
   how the card's picture moves while it is on screen (.pic-card[data-anim]).
   Both are Full motion only - the card and its emoji carry the meaning. */
const TALK_MODES = [
  { id: 'mode-talk',      emoji: '🗣️', label: 'Talking',          act: 'jump',   anim: 'beat' },
  // "Hands" looked like a high five (Filip, 3 November): it means signing.
  { id: 'mode-hands',     emoji: '🤟', label: 'Signing',          act: 'wiggle', anim: 'wave' },
  { id: 'mode-handshake', emoji: '🤝', label: 'Secret handshake', act: 'wiggle', anim: 'shake' },
  { id: 'mode-draw',      emoji: '✏️', label: 'Drawing',          act: 'wiggle', anim: 'scribble' },
  { id: 'mode-act',       emoji: '🎭', label: 'Acting it out',    act: 'jump',   anim: 'bounce' },
  // "Pictures" was not clear either: it means picture cards to point at.
  { id: 'mode-pictures',  emoji: '🎴', label: 'Picture cards',    act: 'rise',   anim: 'flip' },
  { id: 'mode-write',     emoji: '📝', label: 'Writing',          act: 'wiggle', anim: 'scribble' },
  { id: 'mode-device',    emoji: '📱', label: 'A device',         act: 'rise',   anim: 'glow' }
];

// The three piles, and where each is saved. ("school" had its own until
// v87, when that part was removed.)
const SUIT_PILES = {
  likes:  { yes: 'likes',  unsure: 'likesUnsure',  no: 'likesNot' }
};

/* How the agent answers: it nods, tilts its head or shakes it, with a mark
   by its head and a few notes (rising for yes, falling for no). */
const SUIT_ANSWERS = {
  yes:    { mark: '✓', act: 'nod',   notes: [2, 4] },
  unsure: { mark: '?', act: 'tilt',  notes: [3, 2, 3] },
  no:     { mark: '✗', act: 'shake', notes: [4, 1] }
};

/* `frame` is the start of the sentence, said before every card: "My agent
   likes…" then "Talking." The words on screen and the words spoken are the
   same (Filip: the heading was never said). */
const SUIT_PHASES = {
  likes:  { title: 'My agent likes…', frame: 'nar-likes-frame', modes: TALK_MODES },
  best:   { title: 'Which one does your agent like the most?', say: 'nar-suit-most' },
  word:   { title: 'Make up a secret word', say: 'nar-word-make' }
};
const SUIT_ORDER = ['likes', 'best', 'word'];
const SUIT_FLY_MS = 560;             // a sorted card flying to its pile (style.css)

const suitUi = { phase: 'likes', index: 0, moving: false };
let suitTimer = null;                 // the short pause before the next part
let suitSayToken = 0;                 // stops an old sentence finishing late

/* ---- shared card helpers (used by Quick agent, Safe place and Powers) ---- */

/* A picture card that can be on or off. Assets.card() draws it: Filip's
   picture if it has arrived, the emoji until then (v2 §5.0). The emoji and
   label passed in are only used if the id is missing from the manifest. */
function modeCard(mode, on, onTap) {
  const button = Assets.card(mode.id, { fallback: mode.emoji, label: mode.label });
  if (on) button.classList.add('is-on');
  if (mode.anim) button.dataset.anim = mode.anim;
  button.setAttribute('aria-pressed', on ? 'true' : 'false');
  button.addEventListener('click', onTap);
  return button;
}

/* A kept ✏️ My own card, shared by every screen that has them. One tap arms
   it (it turns red and says "Remove?"), a second within three seconds
   removes it, and it disarms itself otherwise - a child's own drawing never
   vanishes on one stray tap (CLAUDE.md). `key` names this card uniquely so
   only one is armed at a time; `repaint` redraws whatever shows it. */
function ownCardTile(card, key, onRemove, repaint) {
  const tile = document.createElement('button');
  tile.className = 'when-own is-on';
  tile.innerHTML = (card.png
      ? '<img class="own-card-thumb" alt="" src="' + card.png + '">'
      : '<span class="when-own-icon">🎤</span>') +
    '<span class="when-own-label">My own</span>';
  tile.setAttribute('aria-label', 'My own card');
  if (ownRemoveArmed === key) {
    tile.classList.add('is-armed');
    tile.querySelector('.when-own-label').textContent = 'Remove?';
  }
  tile.addEventListener('click', () => {
    clearTimeout(ownRemoveTimer);
    if (ownRemoveArmed === key) {
      ownRemoveArmed = null;
      onRemove();
      return;
    }
    ownRemoveArmed = key;
    playSfx('sfx-pop');
    repaint();
    ownRemoveTimer = setTimeout(() => { ownRemoveArmed = null; repaint(); }, 3000);
  });
  return tile;
}

/* ✏️ My own: the button that opens the shared sheet. */
function ownCardButton(onTap) {
  const own = document.createElement('button');
  own.className = 'when-own';
  own.setAttribute('aria-label', 'Make your own card');
  own.innerHTML = '<span class="when-own-icon">✏️</span>' +
                  '<span class="when-own-label">My own</span>';
  own.addEventListener('click', onTap);
  return own;
}

/* An empty agent-view, ready for renderAgentView() to draw into. */
function agentViewHtml(extraClass) {
  return '<span class="agent-view ' + (extraClass || '') + '">' +
    '<canvas class="agent-pixels" width="16" height="16"></canvas>' +
    '<img class="agent-drawing" alt="" hidden>' +
    '<svg class="agent-shapes" viewBox="0 0 100 100" aria-hidden="true" hidden></svg>' +
    '<span class="sticker-layer"></span></span>';
}

/* A few notes, one after another - the answers and the power battery. */
function playNotes(steps, gapMs) {
  if (state.muted) return;
  steps.forEach((step, i) => setTimeout(() => Voice.note(step), i * (gapMs || 110)));
}

function modeById(id) {
  return TALK_MODES.find(m => m.id === id) || null;
}

/* Which pile a card is on in one sorting part: 'yes', 'unsure', 'no', or
   null if it has not been sorted yet. */
function pileOf(step, modeId) {
  const piles = SUIT_PILES[step];
  return Object.keys(piles).find(pile =>
    state.agent.suit[piles[pile]].indexOf(modeId) !== -1) || null;
}

/* The cards that can be "the most": everything on the ✓ pile. */
function bestChoices() {
  return state.agent.suit.likes.map(id => ({ id: id, mode: modeById(id) }))
    .filter(choice => choice.mode);
}

/* Has the child finished this part? Used to decide where to start when the
   screen opens, so a child coming back carries on where they stopped. */
function suitPhaseDone(phase) {
  const suit = state.agent.suit;
  if (phase === 'best') return suit.best !== null || bestChoices().length === 0;
  if (phase === 'word') return Boolean(state.agent.secretWord);
  return SUIT_PHASES[phase].modes.every(m => pileOf(phase, m.id));
}

function enterSuit() {
  if (!state.agent) return;
  hideEditor();
  renderAgentView($('#suit-stage'), state.agent.cover, false);
  // The three small agents on the answer buttons are this agent too.
  $$('.suit-pile .agent-view').forEach(view => renderAgentView(view, state.agent.cover, false));
  startSuitPhase(SUIT_ORDER.find(p => !suitPhaseDone(p)) || 'likes');
}

/* Called by leaveCurrent(): nothing carries on into the next screen - no
   timer, and no half-said sentence finishing on the next screen. */
function stopSuit() {
  clearTimeout(suitTimer);
  clearTimeout(actTimer);
  suitSayToken++;
  suitUi.moving = false;
}

function startSuitPhase(phase) {
  clearTimeout(suitTimer);
  suitUi.moving = false;
  // Nothing on the ✓ pile means there is nothing to choose from.
  if (phase === 'best' && bestChoices().length === 0) phase = 'word';
  suitUi.phase = phase;

  const conf = SUIT_PHASES[phase];
  if (conf.modes) {
    // Start at the first card not yet sorted - or at the beginning, to
    // look again, if every card already is.
    const first = conf.modes.findIndex(m => !pileOf(phase, m.id));
    suitUi.index = first === -1 ? 0 : first;
  }
  paintSuit();
  if (conf.modes) presentCard();
  else saySuitLine(conf.say, conf.title);
  // The last answer's mark must not stay by the agent's head.
  if (phase === 'best') actOut({ emoji: '⭐', act: 'jump' });
  if (phase === 'word') actOut({ emoji: '🤫', act: 'hush' });
}

/* Move to another part: ⭐ 🏫 … at the top, ➡️, or automatically after the
   last card. `how` says which, for the log. */
function goSuitPhase(phase, how) {
  if (phase === suitUi.phase) return;
  logEvent('suit_phase', { to: phase, how: how });
  startSuitPhase(phase);
}

function paintSuit() {
  const phase = suitUi.phase;
  $('#suit-title').textContent = SUIT_PHASES[phase].title;
  $$('[data-suit-phase]').forEach(b => {
    b.classList.toggle('is-on', b.dataset.suitPhase === phase);
    // ⭐ only makes sense once something is on the ✓ pile.
    b.disabled = b.dataset.suitPhase === 'best' && bestChoices().length === 0;
  });
  $('#suit-sort').hidden = !SUIT_PHASES[phase].modes;
  $('#suit-best').hidden = phase !== 'best';
  $('#suit-word').hidden = phase !== 'word';
  if (SUIT_PHASES[phase].modes) paintSort();
  if (phase === 'best') paintBest();
  if (phase === 'word') paintWord();
  updateFades();
}

/* ---- saying it ---- */

/* One line, with its words as the stand-in if the recording is missing. */
function saySuitLine(id, text) {
  if (state.muted || !id) return;
  suitSayToken++;
  Assets.say(id, { text: text });
}

/* The sentence for one card: "My agent likes…" and then the card. A newer
   sentence (the next card) cancels this one - say() stops the line that is
   playing, and the token stops the second half starting afterwards. */
async function sayCardSentence(phase, mode) {
  if (state.muted) return;
  const token = ++suitSayToken;
  const conf = SUIT_PHASES[phase];
  await Assets.sayAndWait(conf.frame, { text: conf.title, maxMs: 3500 });
  if (token !== suitSayToken) return;
  // The sentence ends with the card's short story - "Signing! Talking with
  // hands, like Makaton." - which says what the card MEANS, plainly and
  // without leaning either way: this is a Talking Mat, and the answer is
  // the child's (Filip, 4 November: deepen the narration).
  Assets.say(storyId(mode.id), { text: mode.label + '.' });
}

/* ---- sorting ---- */

/* `dealt` is true when this card has just arrived, so it slides in. */
function paintSort(dealt) {
  const phase = suitUi.phase;
  const modes = SUIT_PHASES[phase].modes;
  const mode = modes[suitUi.index];

  const slot = $('#suit-card');
  slot.innerHTML = '';
  if (mode) {
    // Tapping the card shows it acted out again, and says the sentence.
    const card = modeCard(mode, false, () => {
      logEvent('label_speak', { id: mode.id });
      actOut(mode);
      sayCardSentence(phase, mode);
    });
    if (dealt && fullMotion()) card.classList.add('is-dealt');
    slot.appendChild(card);
  } else {
    slot.innerHTML = '<div class="suit-card-done" aria-label="All sorted">✓</div>';
  }

  const current = mode ? pileOf(phase, mode.id) : null;
  $$('.suit-pile').forEach(b => {
    b.hidden = !mode;
    b.classList.toggle('is-on', b.dataset.pile === current);
  });
  $('#suit-back').hidden = suitUi.index === 0;

  const dots = $('#suit-dots');
  dots.innerHTML = '';
  modes.forEach((m, i) => {
    const dot = document.createElement('span');
    if (pileOf(phase, m.id)) dot.classList.add('is-on');
    if (i === suitUi.index) dot.classList.add('is-here');
    dots.appendChild(dot);
  });
}

/* The card on screen: the agent acts it out, and the sentence is said.
   Not logged - the child did nothing yet. A tap on the card is logged. */
function presentCard() {
  const mode = SUIT_PHASES[suitUi.phase].modes[suitUi.index];
  if (!mode) return;
  actOut(mode);
  sayCardSentence(suitUi.phase, mode);
}

function sortCard(pile) {
  if (suitUi.moving) return;             // the last card is still flying
  const step = suitUi.phase;
  const modes = SUIT_PHASES[step].modes;
  const mode = modes && modes[suitUi.index];
  if (!mode) return;

  const suit = state.agent.suit;
  const piles = SUIT_PILES[step];
  // A card lives on one pile at a time: take it off wherever it was.
  Object.keys(piles).forEach(p => {
    const at = suit[piles[p]].indexOf(mode.id);
    if (at !== -1) suit[piles[p]].splice(at, 1);
  });
  suit[piles[pile]].push(mode.id);
  // The favourite has to be a ✓ card.
  if (step === 'likes' && pile !== 'yes' && suit.best === mode.id) suit.best = null;

  logEvent('suit_sort', { step: step, mode: mode.id, pile: pile });
  scheduleSave();

  // The agent answers - nods, tilts or shakes its head - and the card flies
  // to the pile that was tapped.
  const answer = SUIT_ANSWERS[pile];
  actOut({ emoji: answer.mark, act: answer.act, mark: pile });
  playNotes(answer.notes);
  suitSayToken++;                        // the old card's sentence stops here
  Assets.stopSaying();

  const card = $('#suit-card .pic-card');
  suitUi.moving = true;
  if (card && fullMotion()) card.classList.add('fly-' + pile);
  suitTimer = setTimeout(nextCard, card && fullMotion() ? SUIT_FLY_MS : 0);

  function nextCard() {
    suitUi.moving = false;
    suitUi.index += 1;
    paintSort(true);
    if (suitUi.index < modes.length) { presentCard(); return; }
    // The last card: a tick, a breath, and on to the next part.
    suitTimer = setTimeout(() => {
      const next = step === 'likes' ? 'best' : 'word';
      logEvent('suit_phase', { to: next, how: 'auto' });
      startSuitPhase(next);
    }, 1200);
  }
}

function suitBack() {
  if (suitUi.index === 0 || suitUi.moving) return;
  clearTimeout(suitTimer);
  suitUi.index -= 1;
  logEvent('suit_back', { step: suitUi.phase });
  paintSort(true);
  presentCard();
}

/* ---- ⭐ the one the agent likes the most ---- */

function paintBest() {
  const box = $('#suit-best-cards');
  box.innerHTML = '';
  const best = state.agent.suit.best;
  bestChoices().forEach(choice => {
    box.appendChild(modeCard(choice.mode, best === choice.id, () => chooseBest(choice)));
  });
  // ➡️ appears once one is chosen: this part asks for exactly one.
  $('#suit-best-go').hidden = !best;
}

function chooseBest(choice) {
  state.agent.suit.best = choice.id;
  logEvent('suit_best', { best: choice.id });
  actOut(choice.mode);
  saySuitLine('nar-' + choice.mode.id, choice.mode.label + '.');
  playNotes([2, 4, 7]);
  paintBest();
  scheduleSave();
}

/* ---- 🤫 a secret word ---- */

function paintWord() {
  const word = state.agent.secretWord;
  $('#word-mic').textContent = Voice.isRecording() ? '⏹️' : '🎤';
  const box = $('#word-voices');
  box.hidden = !word;
  box.innerHTML = '';
  if (!word) return;
  Voice.FILTERS.forEach(filter => {
    const button = document.createElement('button');
    button.className = 'btn word-voice' + (word.filter === filter.id ? ' is-on' : '');
    button.innerHTML = '<span class="voice-icon">' + filter.icon + '</span>' +
                       '<span class="btn-label">' + filter.label + '</span>';
    button.addEventListener('click', () => chooseWordVoice(filter.id));
    box.appendChild(button);
  });
}

async function recordWord() {
  Voice.unlock();
  if (Voice.isRecording()) { Voice.stop(); return; }
  if (!Voice.canRecord()) { toast('This iPad cannot record'); return; }

  const mic = $('#word-mic');
  mic.classList.add('is-recording');
  mic.textContent = '⏹️';
  try {
    const result = await Voice.record({ maxMs: 10000, onTick: () => {} });
    const id = uuid();
    await Storage.saveAudio(id, result.blob);
    const old = state.agent.secretWord;
    if (old && old.audioId) { Voice.forget(old.audioId); await Storage.deleteAudio(old.audioId); }
    // A new recording keeps the spy voice already chosen.
    state.agent.secretWord = { audioId: id, filter: (old && old.filter) || 'normal' };
    logEvent('secret_word_record', { ms: Math.round(result.ms), again: Boolean(old) });
    scheduleSave();
    playWord();
  } catch (err) {
    toast('The microphone did not work');
  }
  mic.classList.remove('is-recording');
  paintWord();
}

function chooseWordVoice(filterId) {
  if (!state.agent.secretWord) return;
  state.agent.secretWord.filter = filterId;
  logEvent('secret_word_voice', { filter: filterId });
  paintWord();
  playWord();
  scheduleSave();
}

async function playWord() {
  const word = state.agent && state.agent.secretWord;
  if (!word || state.muted) return;
  Voice.unlock();
  const row = await Storage.loadAudio(word.audioId);
  if (!row) return;
  actOut({ emoji: '🤫', act: 'jump' });
  Voice.play(word.audioId, row.blob, word.filter);
}

/* ---- the agent acting it out ---- */

/* The card's emoji appears by the agent's head and STAYS while the card is
   on screen, because it says what the agent is doing - so it shows in Calm
   and Off as well. The movement is decoration, so Full motion only, and
   its clean-up is a timer, not animationend (CLAUDE.md).

   An answer is acted out the same way: the agent nods (✓), tilts its head
   (?) or shakes it (✗), with the mark by its head in the answer's colour.
   A talking card sends rings out from the emoji, like sound. */
let actTimer = null;
const ACT_MOVES = ['act-wiggle', 'act-jump', 'act-hush', 'act-rise', 'act-nod', 'act-tilt', 'act-shake'];
function actOut(mode) {
  const stageEl = $('#suit-stage');
  const act = $('#suit-act');
  if (!stageEl || !act) return;

  act.textContent = mode.emoji;
  act.dataset.mark = mode.mark || '';
  act.classList.toggle('has-rings', mode.anim === 'beat');
  act.classList.remove('is-showing');
  void act.offsetWidth;                       // restart the pop
  act.classList.add('is-showing');

  ACT_MOVES.forEach(c => stageEl.classList.remove(c));
  if (!fullMotion() || !mode.act) return;
  void stageEl.offsetWidth;
  stageEl.classList.add('act-' + mode.act);
  clearTimeout(actTimer);
  actTimer = setTimeout(() => ACT_MOVES.forEach(c => stageEl.classList.remove(c)), 1400);
}

/* ---- the secret handshake ---- */

const HANDSHAKE_MAX_TAPS = 8;      // v3 §5: up to 8 taps
const HANDSHAKE_GAP_MS = 1500;     // it ends 1.5 s after the last tap…
const HANDSHAKE_MAX_MS = 6000;     // …or 6 s after the first
const HANDSHAKE_PULSE_MS = 140;    // how long the pad lights for each tap
const HANDSHAKE_SETTLE_MS = 500;   // taps ignored just after the 8th (below)

const handshake = {
  recording: false,
  start: 0,          // performance.now() at the first tap
  taps: [],          // ms from the first tap
  endTimer: null,
  capTimer: null,
  playTimers: [],
  quietUntil: 0      // see HANDSHAKE_SETTLE_MS
};

/* pointerdown, not click: a click arrives only when the finger lifts, which
   would smear a fast rhythm. preventDefault stops the iPad treating two
   quick taps as a double-tap zoom. */
function handshakeTap(event) {
  event.preventDefault();
  if (!state.agent) return;
  stopHandshakePlayback();

  const now = performance.now();
  /* A child drumming on the pad goes past the 8th tap. Without a short
     pause those extra taps would start a NEW handshake straight away and
     replace the one just made, so for half a second after an 8-tap finish
     the pad listens to nothing. */
  if (!handshake.recording && now < handshake.quietUntil) return;
  if (!handshake.recording) {
    // Tapping the pad again starts a new one (v3 §5).
    if (state.agent.handshake) logEvent('handshake_redo', {});
    handshake.recording = true;
    handshake.start = now;
    handshake.taps = [];
    handshake.capTimer = setTimeout(finishHandshake, HANDSHAKE_MAX_MS);
    $('#handshake-pad').classList.add('is-recording');
  }

  handshake.taps.push(Math.round(now - handshake.start));
  lightPad();
  handshakeNote(handshake.taps.length - 1);
  paintHandshakeDots(handshake.taps, handshake.taps.length);

  clearTimeout(handshake.endTimer);
  if (handshake.taps.length >= HANDSHAKE_MAX_TAPS) {
    handshake.quietUntil = now + HANDSHAKE_SETTLE_MS;
    finishHandshake();
    return;
  }
  handshake.endTimer = setTimeout(finishHandshake, HANDSHAKE_GAP_MS);
}

function finishHandshake() {
  if (!handshake.recording) return;
  clearTimeout(handshake.endTimer);
  clearTimeout(handshake.capTimer);
  handshake.recording = false;
  $('#handshake-pad').classList.remove('is-recording');
  if (!state.agent || handshake.taps.length === 0) return;

  const taps = handshake.taps.slice();
  state.agent.handshake = { taps: taps };
  // The whole rhythm goes in the log as well as the field, so a handshake
  // that is later replaced by a new one is still in the research record.
  logEvent('handshake_make', { taps: taps, ms: taps[taps.length - 1] });
  scheduleSave();
  paintHandshake();
  // It plays straight back, after a short breath (v3 §5).
  handshake.playTimers.push(setTimeout(() => playHandshake(false), 450));
}

/* Play the saved rhythm back as pulses of light and sound. */
function playHandshake(isReplay) {
  const saved = state.agent && state.agent.handshake;
  if (!saved || !saved.taps || !saved.taps.length) return;
  stopHandshakePlayback();
  if (isReplay) logEvent('handshake_replay', {});
  saved.taps.forEach((t, i) => {
    handshake.playTimers.push(setTimeout(() => {
      lightPad();
      handshakeNote(i);
      paintHandshakeDots(saved.taps, i + 1);
    }, t));
  });
}

function stopHandshakePlayback() {
  handshake.playTimers.forEach(clearTimeout);
  handshake.playTimers = [];
}

/* Called by leaveCurrent(): a rhythm being tapped when the child leaves is
   kept rather than lost, and nothing goes on playing on the next screen. */
function stopHandshake() {
  if (handshake.recording) finishHandshake();
  stopHandshakePlayback();
}

/* Each tap is the next note up a pentatonic scale, so whatever rhythm a
   child taps comes out as a little tune (Filip, 3 November: the knock
   "sounded like poking holes"). Playing it back plays the same tune, and
   the big screen plays it too (display.js). */
function handshakeNote(i) {
  if (!state.muted) Voice.note(i);
}

function lightPad() {
  const pad = $('#handshake-pad');
  pad.classList.add('is-lit');
  setTimeout(() => pad.classList.remove('is-lit'), HANDSHAKE_PULSE_MS);
}

/* The dots are a picture of the rhythm: spaced by the time between taps, so
   a quick-quick-slow handshake LOOKS quick-quick-slow. No numbers. The
   first `lit` dots are lit, which is how playback shows where it is. */
function paintHandshakeDots(taps, lit) {
  const box = $('#handshake-dots');
  box.innerHTML = '';
  taps.forEach((t, i) => {
    const dot = document.createElement('span');
    if (i < lit) dot.className = 'is-on';
    if (i > 0) dot.style.marginLeft = Math.min(48, Math.round((t - taps[i - 1]) / 25)) + 'px';
    box.appendChild(dot);
  });
}

function paintHandshake() {
  const saved = state.agent && state.agent.handshake;
  const taps = saved && saved.taps ? saved.taps : [];
  paintHandshakeDots(taps, 0);
  $('#handshake-replay').hidden = taps.length === 0;
}

/* The handshake sheet. Powers (P5) opens it when a child picks 🤝 as the way
   a power switches on, so the handshake IS the switch; `onDone` hears the
   rhythm (or null) when the sheet closes. */
let handshakeDone = null;
function openHandshakeSheet(onDone) {
  handshakeDone = onDone || null;
  paintHandshake();
  $('#handshake-overlay').hidden = false;
  logEvent('handshake_open', {});
}

function closeHandshakeSheet() {
  stopHandshake();
  $('#handshake-overlay').hidden = true;
  const done = handshakeDone;
  handshakeDone = null;
  if (done) done(state.agent && state.agent.handshake);
}

function wireSuit() {
  $$('[data-suit-phase]').forEach(b =>
    b.addEventListener('click', () => goSuitPhase(b.dataset.suitPhase, 'tab')));
  $$('.suit-pile').forEach(b =>
    b.addEventListener('click', () => sortCard(b.dataset.pile)));
  $('#suit-back').addEventListener('click', suitBack);
  $('#suit-best-go').addEventListener('click', () => goSuitPhase('word', 'next'));
  $('#word-mic').addEventListener('click', recordWord);
  // The 🔊: the sentence for the card on screen - or the part's question,
  // or, once a secret word exists, the line that asks for a spy voice.
  $('#suit-say').addEventListener('click', () => {
    const phase = suitUi.phase;
    const conf = SUIT_PHASES[phase];
    if (state.muted) { toast('Sound is off'); return; }
    if (conf.modes && conf.modes[suitUi.index]) {
      sayCardSentence(phase, conf.modes[suitUi.index]);
    } else if (phase === 'word' && state.agent && state.agent.secretWord) {
      saySuitLine('nar-word-voice', 'Now pick a spy voice for it.');
    } else {
      saySuitLine(conf.say || conf.frame, conf.title);
    }
  });

  $('#handshake-pad').addEventListener('pointerdown', handshakeTap);
  $('#handshake-replay').addEventListener('click', () => playHandshake(true));
  $('#handshake-done').addEventListener('click', closeHandshakeSheet);
  // Before a handshake exists the 🔊 says how to make one; after, how to
  // hear it and make a new one.
  $('#handshake-say').addEventListener('click', () => speakLine(
    state.agent && state.agent.handshake ? 'nar-handshake-listen' : 'nar-handshake-make'));
}


/* ===========================================================================
   32. POWERS (v3 §7, P5) - the heart of v3

   One power is the aim; up to three are allowed. The agent stands BIG on
   the left and does the power, and each step has a short heading that is
   also SAID, because a loud room cannot rely on the voice alone.

   Redesigned on 3 November 2026 after Filip tried it. The blank canvas that
   came first left children staring at a palette ("I am not sure what the
   point is"), and the sentence's four icons did not say what to do. Now it
   is a game:

   🚪 THE DOORS come first. Six family doors and a ✨ SECRET DOOR. A door
      swings open like a door in a game (with a creak), and its power cards
      are dealt face-down and flip over. The secret door is how a child
      makes up a power of their own (draw it or say it). A power from
      session 2, if there is one, waits as a ⏪ tile beside them (§7.4).
      This departs from v3 §7.1 "invent first": the doors are no longer
      locked until the child has drawn - so `inventedFirst` is null now.
   🔋 CHARGE THE POWER. A battery under the agent, one cell per question:
      🎛️ which devices (only for "Control school devices") · 🕐 When ·
      👥 Who · 🔌 Switch on · 🎯 What happens then. One question at a time,
      said aloud; each card picked sends a spark into its cell, which
      lights up with a rising note. Then ⚡ Power on!: the cells light one
      by one, the agent does the power, and the sentence reads itself back
      card by card, each cell lighting as it is read.
   ⚡ MY POWERS. Fire one again, change one, remove one (two taps), or make
      another - three at most.

   The powers are about SCHOOL (Filip): "Pause my school", "Control all
   school displays", and which devices - the bell, the lights… - so the
   interventions the children imagine are located where they happen.

   Each power is saved in agent.powers as soon as it is chosen, so nothing
   is lost if the iPad is closed half-way through.
   ======================================================================== */

const MAX_POWERS = 3;
const DOOR_OPEN_MS = 1400;           // a door creaking open (style.css, door-swing)

/* Suspense, like a game (Filip, 4 November): as a door creaks open the
   narrator whispers one of these, and only then does the door say what is
   behind it. Which one is chosen at random - it carries no meaning. */
const DOOR_WHISPERS = [
  ['nar-door-what', "What's behind this door?"],
  ['nar-door-peek', "Shh… Let's take a peek."],
  ['nar-door-creak', "It's opening… slowly…"]
];

/* Every power has a sound of its own (Filip: "Turn the classroom down" and
   "Dim the classroom lights" made the same sound). Filip's files if they
   exist; the generated stand-in in the asset guide's "stand-in" column if
   not. display.js plays the same sounds on the big screen. */
const POWER_SFX = {
  'pow-slow-everybody': 'sfx-slow',      'pow-pause': 'sfx-freeze',
  'pow-hold-turn': 'sfx-ticket',         'pow-warn-me': 'sfx-warn',
  'pow-say-again': 'sfx-rewind',         'pow-turn-down': 'sfx-turn-down',
  'pow-dim-lights': 'sfx-dim',           'pow-quiet-bubble': 'sfx-shield',
  'pow-translator': 'sfx-translate',     'pow-my-way': 'sfx-thoughts',
  'pow-get-me': 'sfx-ray',               'pow-control-teachers': 'sfx-remote',
  'pow-question-swap': 'sfx-swap',       'pow-pass': 'sfx-pass',
  'pow-invisible': 'sfx-fade',           'pow-control-displays': 'sfx-screens',
  'pow-control-devices': 'sfx-lightning','pow-see-points': 'sfx-star',
  'pow-change-rule': 'sfx-scroll',       'pow-speak-for-friends': 'sfx-bubbles',
  'pow-call-ally': 'sfx-call',           'pow-team-up': 'sfx-high-five'
};

/* Every card's label and stand-in emoji are written here as well as in the
   asset guide, because the app must work with an empty assets/ folder - no
   manifest, no labels - and these screens would be blank without them. */
const POWER_CARDS = [
  { id: 'pow-slow-everybody', emoji: '🐢', label: 'Slow everybody down' },
  { id: 'pow-pause', emoji: '⏸️', label: 'Pause my school' },
  { id: 'pow-hold-turn', emoji: '🎟️', label: 'Hold my turn' },
  { id: 'pow-warn-me', emoji: '🔔', label: 'Warn me first' },
  { id: 'pow-say-again', emoji: '🔁', label: 'Say it again' },
  { id: 'pow-turn-down', emoji: '🔉', label: 'Turn the classroom down' },
  { id: 'pow-dim-lights', emoji: '🌙', label: 'Dim the classroom lights' },
  { id: 'pow-quiet-bubble', emoji: '🫧', label: 'Quiet bubble' },
  { id: 'pow-translator', emoji: '🔄', label: 'Translator' },
  { id: 'pow-my-way', emoji: '🌀', label: 'Everyone talks my way' },
  { id: 'pow-get-me', emoji: '💡', label: 'Get-what-I-mean ray' },
  { id: 'pow-control-teachers', emoji: '🎮', label: 'Control teachers' },
  { id: 'pow-question-swap', emoji: '🔀', label: 'Question swap' },
  { id: 'pow-pass', emoji: '🛑', label: 'Pass' },
  { id: 'pow-invisible', emoji: '👻', label: 'Invisibility cloak' },
  { id: 'pow-control-displays', emoji: '📺', label: 'Control all school displays' },
  { id: 'pow-control-devices', emoji: '🎛️', label: 'Control school devices' },
  { id: 'pow-see-points', emoji: '⭐', label: 'See my points' },
  { id: 'pow-change-rule', emoji: '📜', label: 'Change a school rule' },
  { id: 'pow-speak-for-friends', emoji: '💬', label: 'Speak for your friends' },
  { id: 'pow-call-ally', emoji: '📣', label: 'Call an ally' },
  { id: 'pow-team-up', emoji: '🤝', label: 'Team up' }
];

// §7.2: always in this order. DATA.md repeats it, for the analysis.
const POWER_DOORS = [
  { id: 'fam-time',     emoji: '⏳', label: 'Time',
    powers: ['pow-slow-everybody', 'pow-pause', 'pow-hold-turn', 'pow-warn-me', 'pow-say-again'] },
  { id: 'fam-senses',   emoji: '🔊', label: 'Sound and light',
    powers: ['pow-turn-down', 'pow-dim-lights', 'pow-quiet-bubble'] },
  { id: 'fam-language', emoji: '🗣️', label: 'Words',
    powers: ['pow-translator', 'pow-my-way', 'pow-get-me'] },
  { id: 'fam-floor',    emoji: '✋', label: 'Turns',
    powers: ['pow-control-teachers', 'pow-question-swap', 'pow-pass', 'pow-invisible'] },
  { id: 'fam-screens',  emoji: '📺', label: 'Screens',
    powers: ['pow-control-displays', 'pow-control-devices', 'pow-see-points', 'pow-change-rule'] },
  { id: 'fam-together', emoji: '🤝', label: 'Together',
    powers: ['pow-speak-for-friends', 'pow-call-ally', 'pow-team-up'] }
];

// The seventh door: behind it, the child makes up a power of their own.
const SECRET_DOOR = { id: 'door-secret', emoji: '✨', label: 'Secret door' };

// The session-2 situation ids, so power × situation can be compared across
// sessions (§7.3).
const SITUATION_CARDS = [
  { id: 'sit-too-loud', emoji: '🔊', label: 'Too loud' },
  { id: 'sit-not-understood', emoji: '❓', label: 'Nobody gets what I mean' },
  { id: 'sit-waiting', emoji: '⏳', label: 'Waiting' },
  { id: 'sit-did-well', emoji: '🏆', label: 'I did it!' },
  { id: 'sit-asked-answer', emoji: '✋', label: 'Asked to answer' },
  { id: 'sit-unkind', emoji: '💢', label: 'Someone is unkind' },
  { id: 'sit-plans-change', emoji: '🔄', label: 'Plans change' },
  { id: 'sit-new-place', emoji: '🚪', label: 'Somewhere new' },
  { id: 'sit-playtime', emoji: '⚽', label: 'Playtime' },
  { id: 'sit-tricky-work', emoji: '🧠', label: 'Tricky work' }
];

// who-teacher means ANY adult at school, teacher or assistant (§7.3).
const WHO_CARDS = [
  { id: 'who-me', emoji: '🙋', label: 'Me' },
  { id: 'who-friend', emoji: '👫', label: 'A friend' },
  { id: 'who-teacher', emoji: '🧑‍🏫', label: 'My teacher' },
  { id: 'who-class', emoji: '🏫', label: 'My class' },
  { id: 'who-everyone', emoji: '🌍', label: 'Everyone' },
  { id: 'who-room', emoji: '💡', label: 'The room' }
];

// how-handshake opens the handshake sheet (section 31); how-word plays the
// agent's secret word, if it has one. how-badge is the badge the club is
// designing - which switches children want is design data.
const HOW_CARDS = [
  { id: 'how-badge', emoji: '🏷️', label: 'My badge' },
  { id: 'how-handshake', emoji: '🤝', label: 'My secret handshake' },
  { id: 'how-hand-sign', emoji: '✋', label: 'A hand sign' },
  { id: 'how-word', emoji: '🗣️', label: 'A secret word' },
  { id: 'how-drawing', emoji: '✏️', label: 'A drawing' },
  { id: 'how-button', emoji: '🔘', label: 'A button' }
];

/* "Control school devices" - but WHICH devices (Filip, 3 November). Things
   a school really has, several of them hard on the senses. */
const DEVICE_CARDS = [
  { id: 'dev-bell', emoji: '🔔', label: 'The school bell' },
  { id: 'dev-alarm', emoji: '🚨', label: 'The fire alarm' },
  { id: 'dev-lights', emoji: '💡', label: 'The lights' },
  { id: 'dev-speakers', emoji: '🔊', label: 'The speakers' },
  { id: 'dev-board', emoji: '📋', label: 'The whiteboard' },
  { id: 'dev-computers', emoji: '💻', label: 'The computers' }
];

/* The battery's cells, in order. `only` limits a cell to one power. The
   titles are the questions, said aloud as each cell is reached. */
const POWER_SLOTS = [
  { id: 'devices', icon: '🎛️', title: 'Which ones does your agent control?', say: 'nar-powers-devices',
    cards: DEVICE_CARDS, only: 'pow-control-devices' },
  { id: 'when',   icon: '🕐', title: 'When does your agent use it?',  say: 'nar-powers-when',
    cards: SITUATION_CARDS, own: 'whenOwn', max: 3 },
  { id: 'who',    icon: '👥', title: 'Who does your power work on?',  say: 'nar-powers-who',
    cards: WHO_CARDS, own: 'whoOwn' },
  { id: 'how',    icon: '🔌', title: 'How do you switch it on?',      say: 'nar-powers-how',
    cards: HOW_CARDS, own: 'howOwn' },
  { id: 'sothat', icon: '🎯', title: 'What happens then?',            say: 'nar-powers-then' }
];

const powersUi = {
  phase: 'doors',
  index: null,       // which agent.powers entry is being worked on
  door: null,        // the open door's id, or null for all of them
  slot: 'when',
  busy: false,       // true while a power plays and reads itself back
  opening: false,    // true while a door swings open
  dealNext: false,   // deal the cards on the next paint (a door or a question)
  chargedFor: null   // the power whose battery has said "Fully charged!"
};
let powersTimers = [];

function powerCard(id) { return POWER_CARDS.find(c => c.id === id) || null; }
function currentPower() {
  return powersUi.index === null ? null : (state.agent.powers[powersUi.index] || null);
}
/* The cells this power's battery has: devices only for "Control devices". */
function slotsFor(p) {
  return POWER_SLOTS.filter(s => !s.only || (p && s.only === p.power));
}
function slotById(id) { return POWER_SLOTS.find(s => s.id === id); }
/* A slot's own cards - and an empty list for a slot that has none. */
function ownList(p, slot) { return slot.own ? (p[slot.own] || []) : []; }

/* A session-2 power is anything the child made on the Power-up: a drawing,
   a recording - or only an effect, which many children chose on its own. */
function hasV2Power(agent) {
  const v2 = agent.powerup && agent.powerup.power;
  return Boolean(v2 && (v2.png || v2.audioId || v2.effect));
}

/* The words a kept power goes by, and what stands for it on screen. */
function powerLabel(p) {
  if (p.power === 'own') return 'My own power';
  if (p.power === 'v2') return 'From last time';
  const card = powerCard(p.power);
  return card ? card.label : p.power;
}
function powerEmoji(p) {
  if (p.power === 'own') return '✨';
  if (p.power === 'v2') return '⏪';
  const card = powerCard(p.power);
  return card ? card.emoji : '⚡';
}

/* ---- entering, leaving, moving between steps ---- */

function enterPowers() {
  if (!state.agent) return;
  hideEditor();
  renderAgentView($('#powers-stage'), state.agent.cover, false);
  clearPowerFx();
  if (state.agent.powers.some(p => p.power)) startPowersPhase('mine');
  else newPower();
}

/* Called by leaveCurrent(): no prop, timer or read-back follows the child
   to the next screen. */
function stopPowers() {
  powersTimers.forEach(clearTimeout);
  powersTimers = [];
  clearTimeout(powerFxTimer);
  powersUi.busy = false;
  powersUi.opening = false;
  const panel = $('[data-mission="powers"]');
  if (panel) panel.classList.remove('is-busy');
  clearPowerFx();
}

/* A fresh start: the doors, all shut. Nothing is saved until a power is
   chosen. */
function newPower() {
  if (state.agent.powers.length >= MAX_POWERS) { startPowersPhase('mine'); return; }
  powersUi.index = null;
  powersUi.door = null;
  startPowersPhase('doors');
  // A whispered welcome to the doors, the way a game sets a scene.
  sayPowersLine('nar-powers-doors', 'Secret doors… Each one hides a power.');
}

function startPowersPhase(phase) {
  powersUi.phase = phase;
  paintPowers();
}

function goPowersPhase(phase, how) {
  if (powersUi.busy || phase === powersUi.phase) return;
  logEvent('powers_phase', { to: phase, how: how });
  if (phase === 'doors') powersUi.door = null;
  if (phase === 'sentence') { arriveAtSlot(firstOpenSlot(currentPower())); return; }
  startPowersPhase(phase);
}

function paintPowers() {
  const phase = powersUi.phase;
  const p = currentPower();
  const tab = name => $('[data-powers-phase="' + name + '"]');
  tab('sentence').hidden = !(p && p.power);
  tab('mine').hidden = !state.agent.powers.some(x => x.power);
  $$('[data-powers-phase]').forEach(b =>
    b.classList.toggle('is-on', b.dataset.powersPhase === phase));

  ['doors', 'sentence', 'mine'].forEach(name => {
    $('#powers-' + name).hidden = name !== phase;
  });

  let title = 'Pick a door';
  if (phase === 'doors') {
    const door = POWER_DOORS.find(d => d.id === powersUi.door);
    if (door) title = door.label;
  }
  if (phase === 'sentence') title = slotById(powersUi.slot).title;
  if (phase === 'mine') title = 'My powers';
  $('#powers-title').textContent = title;

  paintBattery();
  if (phase === 'doors') paintDoors();
  if (phase === 'sentence') paintSentence();
  if (phase === 'mine') paintShelf();
  updateFades();
}

/* A line of narration, with its words as the stand-in. */
function sayPowersLine(id, text) {
  if (state.muted || !id) return;
  Assets.say(id, { text: text });
}

/* ---- 🚪 the doors ---- */

function paintDoors() {
  const grid = $('#powers-door-grid');
  const cards = $('#powers-door-cards');
  grid.innerHTML = '';
  cards.innerHTML = '';
  const door = POWER_DOORS.find(d => d.id === powersUi.door);
  grid.hidden = Boolean(door);
  cards.hidden = !door;
  $('#powers-door-back').hidden = !door;
  // With all the doors showing there are no buttons under them, and an
  // empty row still took a gap's worth of the doors' room.
  $('#powers-doors .powers-door-tools').hidden = !door;
  const p = currentPower();
  $('#powers-chosen-go').hidden = !(p && p.power && door);
  // Cards are dealt when the door opens - not again on every repaint.
  const deal = powersUi.dealNext;
  powersUi.dealNext = false;

  if (!door) {
    POWER_DOORS.concat([SECRET_DOOR]).forEach(d => {
      const card = Assets.card(d.id, { fallback: d.emoji, label: d.label });
      card.classList.add('door-card');
      if (d === SECRET_DOOR) card.classList.add('is-secret');
      card.addEventListener('click', () => openDoor(d, card));
      grid.appendChild(card);
    });
    // ⏪ A power from session 2 waits beside the doors (§7.4) - unless it
    // is already one of this agent's powers.
    if (hasV2Power(state.agent) && !state.agent.powers.some(x => x.power === 'v2')) {
      const v2 = state.agent.powerup.power;
      const tile = document.createElement('button');
      tile.className = 'when-own door-lasttime';
      tile.innerHTML = (v2.png
          ? '<img class="own-card-thumb" alt="" src="' + v2.png + '">'
          : '<span class="when-own-icon">' + (v2.audioId ? '🎤' : '⚡') + '</span>') +
        '<span class="when-own-label">⏪ Last time</span>';
      tile.setAttribute('aria-label', 'Your power from last time');
      tile.addEventListener('click', chooseLastTime);
      grid.appendChild(tile);
    }
    return;
  }

  // Behind the door: its cards, dealt face-down and flipped over one by
  // one - the mystery of what is behind it (Full motion only).
  door.powers.forEach((id, i) => {
    const card = modeCard(powerCard(id), Boolean(p && p.power === id), () => choosePower(id));
    if (deal) dealCard(card, i);
    cards.appendChild(card);
  });
}

/* Deal a card: it arrives face-down and flips over, `i` cards after the
   first. Only once, as it arrives - repainting must not deal it again. */
function dealCard(card, i) {
  if (!fullMotion()) return;
  card.classList.add('is-dealing');
  card.style.setProperty('--deal-delay', (i * 140) + 'ms');
  powersTimers.push(setTimeout(() => card.classList.remove('is-dealing'), 950 + i * 140));
}

/* A door creaks open like a door in a game: it rattles, then swings slowly
   on its hinge with light spilling out, while the narrator whispers. Only
   when the door is open AND the whisper has finished does the door say what
   is behind it - Filip: "suspenseful is a good thing". The wait is made of
   pause() timers, so leaving the screen (stopPowers) simply stops it. */
async function openDoor(door, card) {
  if (powersUi.opening || powersUi.busy) return;
  powersUi.opening = true;
  playSfx('sfx-door-open');
  if (fullMotion()) card.classList.add('is-opening');
  logEvent(door === SECRET_DOOR ? 'powers_secret_open' : 'powers_door_open',
           door === SECRET_DOOR ? {} : { family: door.id });

  const whisper = door === SECRET_DOOR
    ? ['nar-door-secret', 'The secret door… What will you make?']
    : DOOR_WHISPERS[Math.floor(Math.random() * DOOR_WHISPERS.length)];
  await Promise.all([
    pause(fullMotion() ? DOOR_OPEN_MS : 300),
    Assets.sayAndWait(whisper[0], { text: whisper[1], muted: state.muted, maxMs: 4000 })
  ]);
  if (!powersUi.opening) return;              // the child left meanwhile
  powersUi.opening = false;

  if (door === SECRET_DOOR) {
    card.classList.remove('is-opening');
    openOwnCard({
      title: 'Make up a power',
      say: 'nar-powers-make',
      onKeep: kept => chooseOwnPower(kept)
    });
    return;
  }
  powersUi.door = door.id;
  powersUi.dealNext = true;
  paintPowers();
  // The door introduces itself: "The Time door! Powers to stop, slow and
  // save time." The bare names (nar-fam-…) are no longer played.
  sayPowersLine(doorIntroId(door), door.label + '.');
}

function doorIntroId(door) { return 'nar-door-' + door.id.replace(/^fam-/, ''); }

/* The power being worked on, made the first time something is chosen. */
function ensurePower() {
  let p = currentPower();
  if (p) return p;
  p = {
    id: uuid().slice(0, 8),
    power: null,
    own: { png: null, audioId: null },
    /* v3 §7.1 asked whether a child invented before seeing the ideas. Since
       3 November the doors come first, so the question cannot arise. */
    inventedFirst: null,
    devices: [],
    when: [], whenOwn: [], who: [], whoOwn: [], how: [], howOwn: [],
    soThat: null,
    skipped: [],
    order: ['power']
  };
  state.agent.powers.push(p);
  powersUi.index = state.agent.powers.length - 1;
  return p;
}

/* A card from a door: the agent does it straight away, and ✓ This one
   carries on to charging it. */
function choosePower(id) {
  if (powersUi.busy) return;
  const p = ensurePower();
  p.power = id;
  if (id === 'pow-control-devices' && !p.devices) p.devices = [];
  logEvent('powers_choose', { power: id });
  sayPowerStory(id);
  playPower(p);
  paintPowers();
  scheduleSave();
}

/* Tapping a power card: the narrator tells the power as a tiny story -
   "Pause my school! Freeze! Nobody moves. Not even the teachers." The
   card's words stay short; the voice goes further (Filip, 4 November).
   Every story has the same warmth: it says what the power DOES and never
   judges the choice (v3 §17: no reactions to what a child chose). Logged
   as the card speaking, like any label. The read-back after ⚡ Power on!
   still uses the short label line. */
function sayPowerStory(id) {
  if (state.muted) return;
  logEvent('label_speak', { id: id });
  const card = powerCard(id);
  Assets.say(storyId(id), { text: card ? card.label + '!' : '' });
}

/* The same for a card in a battery question - "Too loud! When school gets
   noisy, the power kicks in." It resolves when the story has been told, so
   anything that follows (a secret word) does not talk over it. */
function sayCardStory(card) {
  if (state.muted) return Promise.resolve();
  logEvent('label_speak', { id: card.id });
  return Assets.sayAndWait(storyId(card.id), { text: card.label + '!', maxMs: 8000 });
}

/* A card's story line: `nar-story-` and its id (a power without "pow-"). */
function storyId(id) { return 'nar-story-' + id.replace(/^pow-/, ''); }

/* ✨ Behind the secret door: the child's own power, drawn or said. */
function chooseOwnPower(card) {
  const p = ensurePower();
  p.power = 'own';
  p.own = { png: card.png || null, audioId: card.audioId || null };
  logEvent('powers_choose', { power: 'own', drawn: Boolean(p.own.png), said: Boolean(p.own.audioId) });
  playPower(p);
  scheduleSave();
  arriveAtSlot(firstOpenSlot(p));
}

/* ⏪ From last time (§7.4). The session-2 drawing and recording are used,
   never copied or moved: they still belong to powerup.power. */
function chooseLastTime() {
  if (powersUi.busy) return;
  const v2 = state.agent.powerup.power;
  const p = ensurePower();
  p.power = 'v2';
  p.own = { png: v2.png || null, audioId: v2.audioId || null };
  logEvent('powers_choose', { power: 'v2' });
  playPower(p);
  scheduleSave();
  arriveAtSlot(firstOpenSlot(p));
}

/* ---- 🔋 charging the power ---- */

function slotEmpty(p, slotId) {
  if (slotId === 'sothat') return !p.soThat;
  const slot = slotById(slotId);
  return (p[slotId] || []).length === 0 && ownList(p, slot).length === 0;
}

/* Where to start charging: the first empty cell, or the first cell. */
function firstOpenSlot(p) {
  const slots = slotsFor(p);
  const open = slots.find(s => slotEmpty(p, s.id));
  return (open || slots[0]).id;
}

/* The little picture of what is in a cell: up to three emoji, ✏️ for own. */
function slotFill(p, slot) {
  if (slot.id === 'sothat') return p.soThat ? '✏️' : '';
  const emojis = (p[slot.id] || []).map(id => (slot.cards.find(c => c.id === id) || {}).emoji || '•');
  ownList(p, slot).forEach(() => emojis.push('✏️'));
  return emojis.slice(0, 3).join('') + (emojis.length > 3 ? '…' : '');
}

/* Arrive at a question: the cell lights as "here", the cards are dealt,
   and the question is said - every time, so it never depends on reading. */
function arriveAtSlot(slotId) {
  powersUi.slot = slotId;
  powersUi.dealNext = true;
  startPowersPhase('sentence');
  const slot = slotById(slotId);
  sayPowersLine(slot.say, slot.title);
}

/* The battery under the agent: one cell per question, and a cap that
   glows once every cell has something in it. Shown only while charging. */
function paintBattery() {
  const battery = $('#powers-battery');
  const p = currentPower();
  const show = powersUi.phase === 'sentence' && p && p.power;
  battery.hidden = !show;
  if (!show) return;
  const cells = $('#powers-cells');
  cells.innerHTML = '';
  const slots = slotsFor(p);
  slots.forEach(slot => {
    const b = document.createElement('button');
    b.className = 'battery-cell' +
      (slot.id === powersUi.slot ? ' is-here' : '') +
      (slotEmpty(p, slot.id) ? '' : ' is-full');
    b.dataset.slot = slot.id;
    b.setAttribute('aria-label', slot.title);
    b.innerHTML = '<span class="cell-icon">' + slot.icon + '</span>' +
                  '<span class="cell-fill">' + slotFill(p, slot) + '</span>';
    b.addEventListener('click', () => goSlot(slot.id, 'tab'));
    cells.appendChild(b);
  });
  battery.classList.toggle('is-charged', slots.every(s => !slotEmpty(p, s.id)));
}

function paintSentence() {
  const p = currentPower();
  if (!p) return;
  const slot = slotById(powersUi.slot);
  const box = $('#powers-slot-cards');
  box.innerHTML = '';
  // Cards are dealt when a question is arrived at - not on every repaint.
  const deal = powersUi.dealNext;
  powersUi.dealNext = false;

  if (slot.id === 'sothat') {
    if (p.soThat) {
      box.appendChild(ownCardTile(p.soThat, 'sothat-' + p.id,
        () => removeSoThat(), () => paintSentence()));
    } else {
      // One big button: draw it, or say it.
      const make = document.createElement('button');
      make.className = 'when-own powers-then';
      make.setAttribute('aria-label', 'Draw it or say it');
      make.innerHTML = '<span class="when-own-icon">✏️ 🎤</span>' +
                       '<span class="when-own-label">Draw it or say it</span>';
      make.addEventListener('click', () => openOwnCard({
        title: slot.title,
        say: slot.say,
        onKeep: card => {
          p.soThat = card;
          noteSlotOrder(p, 'sothat');
          logEvent('powers_sothat', { drawn: Boolean(card.png), said: Boolean(card.audioId) });
          chargeCell('sothat', null);
          paintPowers();
          scheduleSave();
        }
      }));
      box.appendChild(make);
    }
  } else {
    const list = p[slot.id] || [];
    const full = slot.max && list.length + ownList(p, slot).length >= slot.max;
    slot.cards.forEach((card, i) => {
      const on = list.indexOf(card.id) !== -1;
      const button = modeCard(card, on, () => toggleSlotCard(slot, card, button));
      if (full && !on) button.classList.add('is-full');
      if (deal) dealCard(button, i);
      box.appendChild(button);
    });
    if (slot.own && !full) {
      box.appendChild(ownCardButton(() => openOwnCard({
        title: slot.title,
        say: slot.say,
        onKeep: card => {
          p[slot.own].push(card);
          noteSlotOrder(p, slot.id);
          logEvent('powers_slot', { slot: slot.id, value: 'own', on: true,
                                    drawn: Boolean(card.png), said: Boolean(card.audioId) });
          chargeCell(slot.id, null);
          paintPowers();
          scheduleSave();
        }
      })));
    }
    ownList(p, slot).forEach((card, i) => {
      box.appendChild(ownCardTile(card, slot.id + '-' + p.id + '-' + i,
        () => removeSlotOwn(slot, i), () => paintSentence()));
    });
  }

  // ➡️ to the next question - it glows once this one has an answer. On the
  // last question ⚡ Power on! takes over, glowing.
  const slots = slotsFor(p);
  const last = slots[slots.length - 1].id === slot.id;
  const next = $('#powers-slot-next');
  next.hidden = last;
  next.classList.toggle('is-ready', !slotEmpty(p, slot.id));
  $('#powers-fire').classList.toggle('is-ready', last || slots.every(s => !slotEmpty(p, s.id)));
}

/* `order` keeps the order in which the slots were first filled (§10). */
function noteSlotOrder(p, slotId) {
  if (p.order.indexOf(slotId) === -1) p.order.push(slotId);
}

function goSlot(slotId, how) {
  if (powersUi.busy || (slotId === powersUi.slot && powersUi.phase === 'sentence')) return;
  logEvent('powers_slot_open', { slot: slotId, how: how });
  arriveAtSlot(slotId);
}

/* ➡️ on a question. Going on from an EMPTY one is a skip, and is logged. */
function nextSlot() {
  const p = currentPower();
  if (!p || powersUi.busy) return;
  const slots = slotsFor(p);
  const at = slots.findIndex(s => s.id === powersUi.slot);
  if (slotEmpty(p, powersUi.slot)) logEvent('powers_slot_skip', { slot: powersUi.slot });
  const next = slots[at + 1];
  if (next) goSlot(next.id, 'next');
}

/* A spark flies from what was tapped into its cell in the battery, and the
   cell lights with a note - higher for each cell, so a battery filling up
   SOUNDS like it is filling up. */
function chargeCell(slotId, fromEl) {
  const p = currentPower();
  const at = slotsFor(p).findIndex(s => s.id === slotId);
  playNotes([Math.max(0, at) + 2, Math.max(0, at) + 4], 120);
  announceCharged(p);
  const cell = () => $('#powers-cells [data-slot="' + slotId + '"]');
  if (!fullMotion()) return;
  if (fromEl) flySpark(fromEl, cell());
  powersTimers.push(setTimeout(() => {
    const c = cell();
    if (!c) return;
    c.classList.remove('is-charging');
    void c.offsetWidth;
    c.classList.add('is-charging');
  }, fromEl ? SPARK_MS : 0));
}

/* The moment every cell has something in it, the battery is full: a
   rising run of notes and "Fully charged! Press Power on!" - once per
   power, and a moment later, so the card's own label is heard first. */
function announceCharged(p) {
  const full = slotsFor(p).every(s => !slotEmpty(p, s.id));
  if (!full) { if (powersUi.chargedFor === p.id) powersUi.chargedFor = null; return; }
  if (powersUi.chargedFor === p.id) return;
  powersUi.chargedFor = p.id;
  powersTimers.push(setTimeout(() => {
    playNotes([2, 4, 5, 7, 9], 110);
    sayPowersLine('nar-powers-charged', 'Fully charged! Press Power on!');
  }, 1300));
}

/* A ⚡ that flies across the screen from one element to another. It lives
   on <body> for its flight and removes itself when it lands, whatever
   screen the child is on by then. */
function flySpark(fromEl, toEl, content) {
  if (!fromEl || !toEl || !fullMotion()) return;
  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();
  const spark = document.createElement('span');
  spark.className = 'fly-spark';
  spark.textContent = content || '⚡';
  spark.style.left = (a.left + a.width / 2) + 'px';
  spark.style.top = (a.top + a.height / 2) + 'px';
  document.body.appendChild(spark);
  void spark.offsetWidth;
  spark.style.transform = 'translate(' + (b.left + b.width / 2 - a.left - a.width / 2) + 'px,' +
                          (b.top + b.height / 2 - a.top - a.height / 2) + 'px) scale(.6)';
  setTimeout(() => spark.remove(), SPARK_MS + 50);
}
const SPARK_MS = 600;                // a spark's flight (style.css, .fly-spark)

function toggleSlotCard(slot, card, button) {
  if (powersUi.busy) return;
  const p = currentPower();
  if (!p[slot.id]) p[slot.id] = [];
  const list = p[slot.id];
  const at = list.indexOf(card.id);
  const on = at === -1;
  if (on && slot.max && list.length + ownList(p, slot).length >= slot.max) return;  // §7.3: up to 3

  if (on) list.push(card.id);
  else list.splice(at, 1);
  if (on) noteSlotOrder(p, slot.id);
  logEvent('powers_slot', { slot: slot.id, value: card.id, on: on });
  const told = on ? sayCardStory(card) : null;
  if (on) chargeCell(slot.id, button);
  else playSfx('sfx-pop');
  paintPowers();
  scheduleSave();

  if (!on) return;
  // 🤝 The handshake IS the switch: tapping it opens the handshake sheet,
  // where a child taps one (or hears the one they have). 🗣️ plays the
  // agent's own secret word, if it made one in "How my agent talks".
  if (card.id === 'how-handshake') {
    openHandshakeSheet(() => paintPowers());
    if (state.agent.handshake) playHandshake(false);
  }
  // The secret word plays once its card's story has been told.
  if (card.id === 'how-word') {
    told.then(() => { if (powersUi.phase === 'sentence' && !powersUi.busy) playSecretWord(); });
  }
  // The devices light up on the stage as they are picked.
  if (slot.id === 'devices') playPower(p);
}

async function removeSlotOwn(slot, index) {
  const p = currentPower();
  const card = p[slot.own][index];
  if (!card) return;
  if (card.audioId) { Voice.forget(card.audioId); await Storage.deleteAudio(card.audioId); }
  p[slot.own].splice(index, 1);
  logEvent('powers_slot', { slot: slot.id, value: 'own', on: false });
  paintPowers();
  scheduleSave();
}

async function removeSoThat() {
  const p = currentPower();
  if (!p || !p.soThat) return;
  if (p.soThat.audioId) { Voice.forget(p.soThat.audioId); await Storage.deleteAudio(p.soThat.audioId); }
  p.soThat = null;
  logEvent('powers_sothat_remove', {});
  paintPowers();
  scheduleSave();
}

async function playSecretWord() {
  const word = state.agent && state.agent.secretWord;
  if (!word || state.muted) return;
  Voice.unlock();
  const row = await Storage.loadAudio(word.audioId);
  if (row) Voice.play(word.audioId, row.blob, word.filter);
}

/* ---- ⚡ power on! ---- */

/* The battery lights up cell by cell, the power plays on the agent, and
   the sentence reads itself back: the power, then each cell in order, each
   card by its own recorded line - and each cell lights as it is read. */
async function firePower(index) {
  if (powersUi.busy) return;
  const p = state.agent.powers[index];
  if (!p || !p.power) return;
  powersUi.index = index;

  // §10: the sentence is saved with its skipped slots listed - every slot
  // still empty when the power is switched on.
  const slots = slotsFor(p);
  p.skipped = slots.filter(s => slotEmpty(p, s.id)).map(s => s.id);
  logEvent('powers_fire', { index: index });
  scheduleSave();

  powersUi.busy = true;
  const panel = $('[data-mission="powers"]');
  panel.classList.add('is-busy');
  Voice.unlock();

  // Show the battery for the read-back, even when fired from My powers.
  powersUi.phase = 'sentence';
  paintPowers();

  // Charging up: each cell lights in turn, each a note higher.
  for (let i = 0; i < slots.length; i++) {
    if (!powersUi.busy) return;
    markReading(slots[i].id, true);
    playNotes([i + 2]);
    await pause(240);
  }
  slots.forEach(s => markReading(s.id, false));

  await Promise.all([sayAndPause('nar-powers-fire', 'Power on!'), playPower(p)]);
  if (!powersUi.busy) return;                       // the child left

  // The power itself: its own line, or the child's own recording.
  if (p.own && p.own.audioId && (p.power === 'own' || p.power === 'v2')) {
    await playOwnClip(p.own.audioId);
  } else if (p.power !== 'own' && p.power !== 'v2') {
    await sayAndPause('nar-' + p.power, powerLabel(p) + '.');
  }

  for (const slot of slots) {
    if (!powersUi.busy) return;
    if (slotEmpty(p, slot.id)) continue;
    markReading(slot.id, true);
    if (slot.id === 'sothat') {
      if (p.soThat.audioId) await playOwnClip(p.soThat.audioId);
      else await pause(900);
    } else {
      for (const id of p[slot.id]) {
        const card = slot.cards.find(c => c.id === id);
        await sayAndPause('nar-' + id, card ? card.label + '.' : '');
      }
      for (const card of ownList(p, slot)) {
        if (card.audioId) await playOwnClip(card.audioId);
        else await pause(700);
      }
    }
    markReading(slot.id, false);
  }

  powersUi.busy = false;
  panel.classList.remove('is-busy');
  startPowersPhase('mine');
  sayPowersLine('nar-powers-more', 'Make another power, or Stamp it.');
}

/* A recorded line, and never less than a moment - so with the sound off a
   read-back still steps through the cells at a pace a child can follow. */
function sayAndPause(id, text) {
  return Promise.all([
    Assets.sayAndWait(id, { muted: state.muted, text: text }),
    pause(700)
  ]);
}

function pause(ms) {
  return new Promise(resolve => { powersTimers.push(setTimeout(resolve, ms)); });
}

async function playOwnClip(audioId) {
  if (state.muted) { await pause(900); return; }
  const row = await Storage.loadAudio(audioId);
  if (!row) return;
  await Promise.race([Voice.play(audioId, row.blob, 'normal'), pause(11000)]);
}

function markReading(slotId, on) {
  const b = $('#powers-cells [data-slot="' + slotId + '"]');
  if (b) b.classList.toggle('is-reading', on);
}

/* ---- ⚡ my powers ---- */

function paintShelf() {
  const shelf = $('#powers-shelf');
  shelf.innerHTML = '';
  state.agent.powers.forEach((p, index) => {
    if (!p.power) return;
    const card = document.createElement('div');
    card.className = 'power-kept';
    const art = p.own && p.own.png && (p.power === 'own' || p.power === 'v2')
      ? '<img alt="" src="' + p.own.png + '">'
      : powerEmoji(p);
    const strip = slotsFor(p).map(s => slotFill(p, s)).join(' ');
    card.innerHTML =
      '<div class="power-kept-art">' + art + '</div>' +
      '<div class="power-kept-label"></div>' +
      '<div class="power-kept-strip" aria-hidden="true">' + strip + '</div>' +
      '<div class="power-kept-tools"></div>';
    card.querySelector('.power-kept-label').textContent = powerLabel(p);

    const tools = card.querySelector('.power-kept-tools');
    const fire = document.createElement('button');
    fire.className = 'btn';
    fire.setAttribute('aria-label', 'Power on');
    fire.textContent = '⚡';
    fire.addEventListener('click', () => firePower(index));
    const edit = document.createElement('button');
    edit.className = 'btn';
    edit.setAttribute('aria-label', 'Change it');
    edit.textContent = '🔋';
    edit.addEventListener('click', () => {
      powersUi.index = index;
      logEvent('powers_edit', { index: index });
      arriveAtSlot(slotsFor(p)[0].id);
    });
    tools.appendChild(fire);
    tools.appendChild(edit);
    tools.appendChild(removePowerButton(index));
    shelf.appendChild(card);
  });
  // §7: three is the limit.
  $('#powers-new').hidden = state.agent.powers.length >= MAX_POWERS;
}

/* 🗑️ with the two-tap arm every kept thing has. */
function removePowerButton(index) {
  const key = 'power-' + index;
  const b = document.createElement('button');
  b.className = 'btn' + (ownRemoveArmed === key ? ' is-armed' : '');
  b.setAttribute('aria-label', ownRemoveArmed === key ? 'Remove? Tap again' : 'Remove');
  // Armed: red, and the bin wobbles - "tap again to throw it away".
  b.textContent = '🗑️';
  b.addEventListener('click', () => {
    clearTimeout(ownRemoveTimer);
    if (ownRemoveArmed === key) { ownRemoveArmed = null; removePower(index); return; }
    ownRemoveArmed = key;
    playSfx('sfx-pop');
    paintShelf();
    ownRemoveTimer = setTimeout(() => { ownRemoveArmed = null; paintShelf(); }, 3000);
  });
  return b;
}

async function removePower(index) {
  const p = state.agent.powers[index];
  if (!p) return;
  // Its recordings go with it - except a session-2 power's, which still
  // belongs to powerup.power and must never be deleted.
  const clips = [];
  if (p.power !== 'v2' && p.own && p.own.audioId) clips.push(p.own.audioId);
  if (p.soThat && p.soThat.audioId) clips.push(p.soThat.audioId);
  ['whenOwn', 'whoOwn', 'howOwn'].forEach(k => (p[k] || []).forEach(c => { if (c.audioId) clips.push(c.audioId); }));
  for (const id of clips) { Voice.forget(id); await Storage.deleteAudio(id); }

  state.agent.powers.splice(index, 1);
  powersUi.index = null;
  logEvent('powers_remove', { index: index });

  /* A bottle's ⚡ item names its power by its place in this list (§10), so
     the places after this one move down by one. An item that gave THIS
     power keeps its powerId but its `power` becomes null: the power it
     gave no longer exists on this agent. */
  state.agent.bottles.forEach(b => b.items.forEach(item => {
    if (item.type !== 'item-power' || typeof item.power !== 'number') return;
    if (item.powerId === p.id || item.power === index) item.power = null;
    else if (item.power > index) item.power -= 1;
  }));
  scheduleSave();
  if (state.agent.powers.length === 0) newPower();
  else startPowersPhase('mine');
}

/* ---- the power, on the stage ----
   The five ★ powers from Filip's notes have their own scenes (§7.2). Four
   more borrow v2's effects. Every other power pops its icon over the agent
   and can get its own scene later. Each has its own sound (POWER_SFX). In Calm and Off the props
   still appear, standing still - they say what the power IS. */
const POWER_CLASS_FX = {
  'pow-pause':        ['fx-freeze'],
  'pow-quiet-bubble': ['fx-shield'],
  'pow-my-way':       ['fx-thoughts'],
  'pow-invisible':    ['fx-fade']
};

const STAGE_FX_CLASSES = ['pfx-slowmo', 'pfx-wash', 'pfx-bounce', 'fx-lightning', 'fx-freeze',
  'fx-fade', 'fx-speed', 'fx-thoughts', 'fx-shield', 'fx-float', 'fx-stomp', 'fx-teleport', 'fx-grow'];

// Where the chosen devices stand round the agent, in the order picked.
const DEVICE_SPOTS = [[14, 20], [86, 20], [86, 76], [14, 76], [50, 8], [50, 92]];

function clearPowerFx() {
  const layer = $('#powers-fx');
  if (layer) layer.innerHTML = '';
  const stageEl = $('#powers-stage');
  if (stageEl) STAGE_FX_CLASSES.forEach(c => stageEl.classList.remove(c));
}

/* A prop on the layer over the agent, at x/y in % of the stage. */
function prop(content, x, y, classes, size) {
  const el = document.createElement('span');
  el.className = 'pfx-prop ' + (classes || '');
  el.style.left = x + '%';
  el.style.top = y + '%';
  if (size) el.style.fontSize = size + 'px';
  if (typeof content === 'string') el.textContent = content;
  else el.appendChild(content);
  $('#powers-fx').appendChild(el);
  return el;
}

/* A zap from one point to another. The stage is square, so % works for
   both directions: the beam is turned to the right angle and stretched. */
function beam(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const wrap = document.createElement('div');
  wrap.style.position = 'absolute';
  wrap.style.left = x1 + '%';
  wrap.style.top = y1 + '%';
  wrap.style.width = Math.sqrt(dx * dx + dy * dy) + '%';
  wrap.style.transform = 'rotate(' + Math.atan2(dy, dx) + 'rad)';
  wrap.style.transformOrigin = 'left center';
  const line = document.createElement('div');
  line.className = 'pfx-beam';
  line.style.width = '100%';
  wrap.appendChild(line);
  $('#powers-fx').appendChild(wrap);
}

/* NOT called stageMove: that is the Make editor's pointermove handler
   (section 14), and a second declaration with the same name replaces the
   first for the whole app - from P5 until v81 dragging a finger over a
   pixel agent ran this instead. */
function powerStageMove(cls) {
  const stageEl = $('#powers-stage');
  STAGE_FX_CLASSES.forEach(c => stageEl.classList.remove(c));
  if (!fullMotion()) return;
  void stageEl.offsetWidth;
  stageEl.classList.add(cls);
}

/* Play a power. Resolves when its scene has finished.

   It has its OWN timer. It used to clear every timer in powersTimers - and
   ⚡ Power on! starts the "Power on!" line (whose pause lives there) at the
   same moment as the scene, so the line's wait was cancelled, never ended,
   and the read-back hung for good. */
let powerFxTimer = null;
function playPower(p) {
  clearPowerFx();
  clearTimeout(powerFxTimer);
  let ms = 2200;
  const id = p.power;

  if (id === 'pow-slow-everybody') {
    // ★ Everything on the stage slows for 4 s: the agent sways in slow
    // motion, a tortoise crosses, and a clock sits by the agent's head.
    ms = 4000;
    prop('🐢', 50, 88, 'pfx-walk', 46);
    prop('⏳', 80, 18, 'pfx-pop');
    powerStageMove('pfx-slowmo');
    playSfx(POWER_SFX[id]);
  } else if (id === 'pow-control-teachers') {
    // ★ A remote-control zap, and the grown-up hops.
    prop('🎮', 70, 70, 'pfx-pop', 44);
    beam(72, 64, 88, 34);
    prop('🧑‍🏫', 88, 28, 'pfx-pop pfx-hop', 56);
    playSfx(POWER_SFX[id]);
    ms = 2600;
  } else if (id === 'pow-control-displays') {
    // ★ A zap at a screen, and the whole scene washes with colour once.
    prop('🎮', 70, 70, 'pfx-pop', 44);
    beam(72, 64, 88, 30);
    prop('📺', 88, 26, 'pfx-pop', 56);
    powerStageMove('pfx-wash');
    playSfx(POWER_SFX[id]);
    ms = 2600;
  } else if (id === 'pow-control-devices') {
    // ★ Lightning, and the devices the child picked switch on and off -
    // twice and a half a second at most. A light, a speaker and a board
    // until any are picked.
    const picked = (p.devices || []).map(d => (DEVICE_CARDS.find(c => c.id === d) || {}).emoji).filter(Boolean);
    (picked.length ? picked : ['💡', '🔊', '📋']).forEach((emoji, i) => {
      const spot = DEVICE_SPOTS[i % DEVICE_SPOTS.length];
      prop(emoji, spot[0], spot[1], 'pfx-pop pfx-blink');
    });
    powerStageMove('fx-lightning');
    playSfx(POWER_SFX[id]);
    ms = 2600;
  } else if (id === 'pow-speak-for-friends') {
    // ★ A friend joins, and two speech bubbles rise.
    prop('🧑', 16, 66, 'pfx-pop', 60);
    prop('💬', 44, 24, 'pfx-rise', 48);
    prop('💬', 20, 38, 'pfx-rise', 40);
    powerStageMove('pfx-bounce');
    playSfx(POWER_SFX[id]);
    ms = 2600;
  } else if (id === 'own' || id === 'v2') {
    // The child's own power: their drawing pops up by the agent, or 🎤 if
    // they said it. A session-2 power plays its session-2 effect too.
    if (p.own && p.own.png) {
      const img = document.createElement('img');
      img.src = p.own.png;
      img.alt = '';
      prop(img, 78, 22, 'pfx-pop');
    } else {
      prop(id === 'v2' ? '⚡' : '🎤', 78, 22, 'pfx-pop');
    }
    const v2fx = id === 'v2' && state.agent.powerup.power.effect;
    powerStageMove(v2fx || 'pfx-bounce');
    playSfx('sfx-powerup');
  } else {
    // Every other power: its icon pops over the agent, with a sound.
    const card = powerCard(id);
    prop(card ? card.emoji : '⚡', 50, 12, 'pfx-pop', 60);
    const fx = POWER_CLASS_FX[id];
    powerStageMove(fx ? fx[0] : 'pfx-bounce');
    playSfx(POWER_SFX[id] || 'sfx-powerup');
  }

  return new Promise(resolve => {
    // When the scene ends, its props go too: a remote and a zap left on
    // the stage look like part of the NEXT thing on screen.
    powerFxTimer = setTimeout(() => {
      clearPowerFx();
      resolve();
    }, ms);
  });
}

function wirePowers() {
  $('#powers-door-back').addEventListener('click', () => {
    powersUi.door = null;
    logEvent('powers_phase', { to: 'doors', how: 'back' });
    paintPowers();
  });
  $('#powers-chosen-go').addEventListener('click', () => {
    logEvent('powers_phase', { to: 'sentence', how: 'next' });
    arriveAtSlot(firstOpenSlot(currentPower()));
  });
  $('#powers-slot-next').addEventListener('click', nextSlot);
  $('#powers-fire').addEventListener('click', () => firePower(powersUi.index));
  $('#powers-new').addEventListener('click', () => {
    logEvent('powers_new', {});
    newPower();
  });
  $$('[data-powers-phase]').forEach(b =>
    b.addEventListener('click', () => goPowersPhase(b.dataset.powersPhase, 'tab')));
  $('#powers-say').addEventListener('click', () => {
    if (state.muted) { toast('Sound is off'); return; }
    const phase = powersUi.phase;
    const door = POWER_DOORS.find(d => d.id === powersUi.door);
    if (phase === 'doors' && door) sayPowersLine(doorIntroId(door), door.label + '.');
    else if (phase === 'doors') sayPowersLine('nar-powers-doors', "Pick a door. Find your agent's power.");
    else if (phase === 'sentence') {
      const slot = slotById(powersUi.slot);
      sayPowersLine(slot.say, slot.title);
    } else sayPowersLine('nar-powers-more', 'Make another power, or Stamp it.');
  });
}


/* ===========================================================================
   33. THE BOTTLE (v3 §8, P6)

   "What will your agent hand over?" The bottle is the hero of this screen:
   it stands big on the left, and each item dropped in adds a band of
   colour. The colours belong to the item TYPES, not to feelings.

     🍾 Fill      up to 4 items, one of each kind
     👥 Who for   🙋 me (kept on this iPad) · 👫 a friend · 🧑‍🏫 my teacher ·
                  🌍 everyone (the big screen)
     🕵️ From      "Who is it from?" - the agent itself (its picture and
                  codename), or 🎭 a mystery. Not asked for "me". Honest
                  wording: a mystery hides the sender ON THE DISPLAY, and in
                  a mystery bottle EVERY recording must be in a spy voice.
                  (It used to ask "Show your agent?", which Filip found
                  confusing, 3 November 2026.)
     🚀 Send      push the cork in, then swipe the bottle up or HOLD 🚀
                  (every gesture has a tap alternative)
     🗂️ Shelf     up to three bottles per agent

   SENDING (v3 §9.1). Only what the display will show leaves the iPad, and
   only for a bottle the child sends: never the agent's id, its event log,
   or any other agent. For a friend or a teacher only the envelope goes (who
   it is for, and who it is from if signed); the contents stay here.

   THE CHILD ALWAYS SEES THE SAME FLIGHT. If the display link is off or
   fails, the bottle is kept as `waiting` and goes by itself the next time
   the link works - a child never sees an error (§9.3).

   A voice is sent as the sound the child HEARD: Voice.render() disguises it
   on the iPad, so a mystery bottle's real voice never leaves the iPad.
   ======================================================================== */

const MAX_BOTTLES = 3;
const MAX_ITEMS = 4;

// Each kind of item, its token and its colour band.
/* `from: true` - something the agent ALREADY MADE in an earlier mission;
   the bottle offers the agent's own (its powers by name, its handshake,
   its secret word, its favourite way to talk) and only if they exist.
   The rest are made new, here (Filip, 4 November: "fill the bottle with
   what they have chosen - right now it's random"). */
const BOTTLE_ITEMS = [
  { id: 'item-power',     emoji: '⚡', label: 'A power to give',               colour: '#ffd23f', from: true },
  { id: 'item-handshake', emoji: '🤝', label: 'My handshake',                  colour: '#ff8fab', from: true },
  { id: 'item-word',      emoji: '🤫', label: 'My secret word',                colour: '#e63946', from: true },
  { id: 'item-talk',      emoji: '🗣️', label: 'How my agent likes to talk',     colour: '#b5e48c', from: true },
  { id: 'item-drawing',   emoji: '✏️', label: 'A drawing',                     colour: '#4cc9f0' },
  { id: 'item-voice',     emoji: '🎤', label: 'A voice message',               colour: '#b892ff' },
  // Said, not drawn (Filip, 3 November): a game is hard to draw, and
  // children know its name.
  { id: 'item-game',      emoji: '🎮', label: 'My favourite game',             colour: '#43aa8b' },
  // About the agent, not the child (v3 §2, rule 1; Filip, 3 November).
  { id: 'item-cant-live', emoji: '💎', label: "Something my agent can't live without", colour: '#f77f00' },
  { id: 'item-safe',      emoji: '📍', label: 'My safe place',                 colour: '#9fb3d1', from: true }
];

/* Who a bottle is for. The ids are the Who cards' (who-…), so the data
   lines up with Powers; the WORDS here say school (Filip, 4 November:
   "don't forget it is all about the school"), and replace the cards'. */
const BOTTLE_TO = [
  { id: 'who-me',       emoji: '🙋', label: 'For me' },
  { id: 'who-friend',   emoji: '👫', label: 'A friend at school', named: true },
  { id: 'who-teacher',  emoji: '🧑‍🏫', label: 'My teacher', named: true },
  { id: 'who-everyone', emoji: '🌍', label: 'Everyone at school' }
];

const BOTTLE_HOLD_MS = 900;          // how long 🚀 must be held

const bottleUi = {
  phase: 'fill',
  index: null,          // which agent.bottles entry is being made
  sub: null,            // null, 'power' or 'voice' - one item being made
  subType: null,        // for 'voice': 'item-voice' or 'item-game'
  voiceDraft: null,     // { audioId, filter } while a recording is made
  corked: false,
  newBand: -1,          // the band to drop in, once
  armed: null,          // the chip waiting for its second tap
  friends: []           // the other agents on this iPad, for 👫
};
let bottleTimers = [];
let bottleHold = null;

function itemKind(id) { return BOTTLE_ITEMS.find(k => k.id === id); }
/* The icon for an item under the bottle: a power's or a way of talking's
   own icon, otherwise its kind's. */
function itemEmoji(item) {
  if (item.type === 'item-power') {
    const p = state.agent.powers.find(x => x.id === item.powerId) ||
              (typeof item.power === 'number' ? state.agent.powers[item.power] : null);
    if (p) return powerEmoji(p);
  }
  if (item.type === 'item-talk') {
    const mode = modeById(item.mode);
    if (mode) return mode.emoji;
  }
  return itemKind(item.type).emoji;
}
function currentBottle() {
  return bottleUi.index === null ? null : (state.agent.bottles[bottleUi.index] || null);
}

/* Safe place counts as "done" when it holds a real place to talk in. */
function safePlaceForBottle() {
  const talk = state.agent.safe && state.agent.safe.talk;
  return talk && (talk.png || (talk.id && talk.id !== SAFE_NOWHERE)) ? talk : null;
}

/* The powers a bottle can give: the agent's own, and a session-2 power. */
function givablePowers() {
  const out = [];
  state.agent.powers.forEach((p, i) => {
    if (p.power) out.push({ power: i, powerId: p.id, emoji: powerEmoji(p), label: powerLabel(p) });
  });
  if (hasV2Power(state.agent) && !state.agent.powers.some(p => p.power === 'v2')) {
    out.push({ power: 'v2', powerId: null, emoji: '⏪', label: 'From last time' });
  }
  return out;
}

/* ---- entering, leaving, steps ---- */

function enterBottle() {
  if (!state.agent) return;
  hideEditor();
  bottleUi.sub = null;
  bottleUi.corked = false;
  bottleUi.armed = null;
  const open = state.agent.bottles.findIndex(b => b.state === 'open');
  if (open !== -1) {
    bottleUi.index = open;
    startBottlePhase('fill');
  } else if (state.agent.bottles.length) {
    bottleUi.index = null;
    startBottlePhase('shelf');
  } else {
    bottleUi.index = null;
    startBottlePhase('fill');
  }
  // What the bottle IS, said straight away (Filip, 4 November: "it should
  // be clear from the start what the bottle is").
  if (bottleUi.phase === 'fill') sayBottleStep('fill');
  // A good moment to send anything still waiting from earlier.
  sendWaitingBottles();
}

/* Every step of the bottle says its question as it opens. */
function sayBottleStep(phase) {
  const line = BOTTLE_TITLES[phase];
  if (!line || phase === 'shelf') return;
  bottleSay([[line[1], line[0]]]);
}

/* THE BOTTLE'S NARRATOR. Lines are said one after another, each waiting
   for the last to end: [id, words, then] - `then` runs when that line
   ends (a handshake's tune, a secret word). A new call starts afresh and
   drops whatever was still to come, so nothing from one step talks over
   the next. `append` adds to the lines already being said instead - how
   "Your bottle is full!" waits for the item's own story to finish. */
let bottleSayToken = 0;
let bottleQueue = [];
let bottleSaying = false;
async function bottleSay(lines, append) {
  if (state.muted) return;
  if (!append) { bottleSayToken++; bottleQueue = []; }
  bottleQueue.push(...lines);
  if (append && bottleSaying) return;          // the running loop will get there
  const token = bottleSayToken;
  bottleSaying = true;
  while (bottleQueue.length && token === bottleSayToken) {
    const line = bottleQueue.shift();
    await Assets.sayAndWait(line[0], { text: line[1] || '', maxMs: 8000 });
    if (line[2] && token === bottleSayToken) line[2]();
  }
  if (token === bottleSayToken) bottleSaying = false;
}

/* An item goes in, its lines are said, and - if that filled the bottle -
   "Your bottle is full!" follows them. */
function addAndSay(item, lines) {
  addBottleItem(item);
  bottleSay(lines || []);
  const b = currentBottle();
  if (b && b.items.length === MAX_ITEMS) {
    bottleSay([['nar-bottle-full', 'Your bottle is full to the top!']], true);
  }
}

function stopBottle() {
  bottleTimers.forEach(clearTimeout);
  bottleTimers = [];
  bottleSayToken++;                   // nothing still to say follows the child out
  bottleQueue = [];
  bottleSaying = false;
  cancelRocketHold();
  const art = $('#bottle-art');
  if (art) art.classList.remove('is-flying');
}

function startBottlePhase(phase) {
  bottleUi.phase = phase;
  if (phase !== 'send') bottleUi.corked = false;
  paintBottle();
}

function goBottlePhase(phase, how) {
  if (phase === bottleUi.phase) return;
  logEvent('bottle_phase', { to: phase, how: how });
  startBottlePhase(phase);
  // The send step says "push the cork in" itself when the cork button is
  // the thing to press.
  sayBottleStep(phase);
}

const BOTTLE_TITLES = {
  fill: ['What goes in?', 'nar-bottle-intro'],
  to:   ['Who is it for?', 'nar-bottle-to'],
  sign: ['Who is it from?', 'nar-bottle-from'],
  send: ['Cork it, send it', 'nar-bottle-cork'],
  shelf: ['My bottles', 'nar-bottle-intro']
};

function paintBottle() {
  const b = currentBottle();
  const phase = bottleUi.phase;
  const tab = name => $('[data-bottle-phase="' + name + '"]');
  tab('to').hidden = !(b && b.items.length);
  tab('sign').hidden = !(b && b.to && b.to !== 'who-me');
  // A mystery with a recording still in a real voice goes back through 🕵️.
  const undisguised = b && b.signed === false &&
    recordedItems(b).some(it => (it.filter || 'normal') === 'normal');
  tab('send').hidden = !(b && b.to && (b.to === 'who-me' || b.signed !== null)) || undisguised;
  tab('shelf').hidden = !state.agent.bottles.some(x => x.state !== 'open');
  $$('[data-bottle-phase]').forEach(btn =>
    btn.classList.toggle('is-on', btn.dataset.bottlePhase === phase));
  ['fill', 'to', 'sign', 'send', 'shelf'].forEach(name => {
    $('#bottle-' + name).hidden = name !== phase;
  });
  let title = BOTTLE_TITLES[phase][0];
  if (phase === 'send' && b && b.to === 'who-me') title = 'Cork it, keep it';
  $('#bottle-title').textContent = title;

  // On the shelf there is no bottle being made, and an empty one standing
  // there reads as unfinished - the shelf shows the bottles themselves.
  $('.bottle-wrap').hidden = phase === 'shelf';
  paintBottleArt();
  paintBottleChips();
  if (phase === 'fill') paintTokens();
  if (phase === 'to') paintBottleTo();
  if (phase === 'sign') paintBottleSign();
  if (phase === 'send') paintBottleSend();
  if (phase === 'shelf') paintBottleShelf();
  updateFades();
}

/* ---- the bottle itself ---- */

/* The glass, the bands and the cork, as SVG. Drawn by code so it can be
   drawn small on the shelf too. */
const BOTTLE_PATH = 'M50 8 H70 V46 C70 58 100 62 100 84 V184 C100 192 94 196 86 196 ' +
                    'H34 C26 196 20 192 20 184 V84 C20 62 50 58 50 46 Z';

function bottleSvg(bottle, opts) {
  const o = opts || {};
  const items = (bottle && bottle.items) || [];
  const id = 'clip' + Math.random().toString(36).slice(2, 8);
  let bands = '';
  items.forEach((item, i) => {
    const kind = itemKind(item.type);
    const y = 166 - i * 30;
    bands += '<rect class="bottle-band' + (i === o.newBand ? ' is-new' : '') + '" x="18" y="' + y +
             '" width="84" height="30" fill="' + (kind ? kind.colour : '#fff') + '"/>';
  });
  const cork = o.corked
    ? '<rect class="bottle-cork' + (o.newCork ? ' is-new' : '') + '" x="47" y="0" width="26" height="22" rx="5"/>'
    : '';
  return '<svg viewBox="0 0 120 200" aria-hidden="true">' +
    '<defs><clipPath id="' + id + '"><path d="' + BOTTLE_PATH + '"/></clipPath></defs>' +
    '<g clip-path="url(#' + id + ')">' + bands + '</g>' +
    '<path class="bottle-glass" d="' + BOTTLE_PATH + '"/>' + cork + '</svg>';
}

function paintBottleArt() {
  const art = $('#bottle-art');
  art.classList.remove('is-flying');
  art.innerHTML = bottleSvg(currentBottle(), {
    newBand: bottleUi.newBand,
    corked: bottleUi.corked,
    newCork: bottleUi.corked === 'new'
  });
  bottleUi.newBand = -1;
  if (bottleUi.corked === 'new') bottleUi.corked = true;
}

/* What is in the bottle, as chips under it. One tap arms a chip, a second
   takes it out - nothing a child made vanishes on one stray tap. */
function paintBottleChips() {
  const box = $('#bottle-items');
  box.innerHTML = '';
  const b = currentBottle();
  if (!b || bottleUi.phase === 'shelf') return;
  b.items.forEach((item, i) => {
    const kind = itemKind(item.type);
    const chip = document.createElement('button');
    chip.className = 'bottle-chip' + (bottleUi.armed === i ? ' is-armed' : '');
    chip.style.setProperty('--chip', kind.colour);
    chip.setAttribute('aria-label', bottleUi.armed === i ? 'Take it out? Tap again' : kind.label);
    // Armed: red with a bin - "tap again to take it out" (a "?" there
    // was not understood, Filip 4 November).
    if (bottleUi.armed === i) chip.textContent = '🗑️';
    else if (item.png) chip.innerHTML = '<img alt="" src="' + item.png + '">';
    else chip.textContent = itemEmoji(item);
    chip.addEventListener('click', () => armBottleChip(i));
    box.appendChild(chip);
  });
}

function armBottleChip(i) {
  if (bottleUi.phase === 'send' && bottleUi.corked) return;   // corked: sealed
  clearTimeout(ownRemoveTimer);
  if (bottleUi.armed === i) {
    bottleUi.armed = null;
    removeBottleItem(i);
    return;
  }
  bottleUi.armed = i;
  playSfx('sfx-pop');
  paintBottleChips();
  ownRemoveTimer = setTimeout(() => { bottleUi.armed = null; paintBottleChips(); }, 3000);
}

async function removeBottleItem(i) {
  const b = currentBottle();
  const item = b && b.items[i];
  if (!item) return;
  // A recording made for the bottle goes with it.
  if (item.audioId) { Voice.forget(item.audioId); await Storage.deleteAudio(item.audioId); }
  b.items.splice(i, 1);
  logEvent('bottle_item_remove', { type: item.type });
  paintBottle();
  scheduleSave();
}

/* ---- 🍾 fill ---- */

/* The tokens, in two groups. 🕵️ FROM YOUR AGENT: what this agent has
   already made - each power by its own name and picture, its handshake,
   its secret word, the way it likes to talk most, its safe place - and
   nothing it has not made. ✨ MAKE NEW: things made here and now. */
function paintTokens() {
  const b = currentBottle();
  const items = (b && b.items) || [];
  const full = items.length >= MAX_ITEMS;
  const box = $('#bottle-tokens');
  box.innerHTML = '';
  box.hidden = Boolean(bottleUi.sub);
  const has = type => items.some(it => it.type === type);

  const fromAgent = [];
  givablePowers().forEach(choice => {
    const p = typeof choice.power === 'number' ? state.agent.powers[choice.power] : null;
    const inThis = items.some(it => it.type === 'item-power' &&
      (it.powerId ? it.powerId === choice.powerId : it.power === choice.power));
    fromAgent.push({ kind: itemKind('item-power'), label: choice.label, emoji: choice.emoji,
                     png: p && p.own && p.own.png && p.power === 'own' ? p.own.png : null,
                     choice: choice, isIn: inThis });
  });
  if (state.agent.handshake) fromAgent.push({ kind: itemKind('item-handshake') });
  if (state.agent.secretWord) fromAgent.push({ kind: itemKind('item-word') });
  const best = state.agent.suit && modeById(state.agent.suit.best);
  if (best) fromAgent.push({ kind: itemKind('item-talk'), label: best.label, emoji: best.emoji, mode: best });
  if (safePlaceForBottle()) fromAgent.push({ kind: itemKind('item-safe') });

  const fresh = BOTTLE_ITEMS.filter(k => !k.from).map(k => ({ kind: k }));

  const group = (icon, words, tokens) => {
    if (!tokens.length) return;
    const head = document.createElement('div');
    head.className = 'token-group-head';
    head.textContent = icon + ' ' + words;
    box.appendChild(head);
    const grid = document.createElement('div');
    grid.className = 'token-grid';
    tokens.forEach(tok => grid.appendChild(tokenButton(tok, full, has)));
    box.appendChild(grid);
  };
  group('🕵️', 'From your agent', fromAgent);
  group('✨', 'Make new', fresh);

  $('#bottle-fill-go').hidden = !(items.length && !bottleUi.sub);
  paintBottleSub();
}

/* One token. One of each KIND goes in a bottle (§8), so once a power is
   in, the other powers wait; the one that is in shows ✓. */
function tokenButton(tok, full, has) {
  const kind = tok.kind;
  const token = document.createElement('button');
  token.className = 'btn bottle-token' + (tok.isIn ? ' is-in' : '');
  token.style.setProperty('--chip', kind.colour);
  token.innerHTML = '<span class="token-icon"></span><span class="btn-label"></span>';
  const icon = token.querySelector('.token-icon');
  if (tok.png) icon.innerHTML = '<img alt="" src="' + tok.png + '">';
  else icon.textContent = tok.emoji || kind.emoji;
  token.querySelector('.btn-label').textContent = tok.label || kind.label;
  token.disabled = full || has(kind.id);
  token.addEventListener('click', () => tapToken(kind, tok));
  return token;
}

/* The bottle is saved the moment its first item goes in (state 'open'). */
function ensureBottle() {
  let b = currentBottle();
  if (b) return b;
  b = {
    id: uuid(),
    createdAt: nowIso(),
    items: [],
    to: null,
    toAgentId: null,
    toNameAudioId: null,
    signed: null,
    state: 'open',
    sentAt: null,
    deliveredAt: null
  };
  state.agent.bottles.push(b);
  bottleUi.index = state.agent.bottles.length - 1;
  return b;
}

function addBottleItem(item) {
  const b = ensureBottle();
  if (b.items.length >= MAX_ITEMS) return;
  b.items.push(item);
  bottleUi.newBand = b.items.length - 1;
  bottleUi.sub = null;
  logEvent('bottle_item_add', { type: item.type });
  playSfx('sfx-bottle-drop');
  paintBottle();
  scheduleSave();
}

function tapToken(kind, tok) {
  const b = currentBottle();
  if (b && b.items.length >= MAX_ITEMS) return;
  logEvent('label_speak', { id: kind.id });

  // ⚡ One of the agent's own powers, by name: it goes straight in, and
  // the narrator tells its story ("Pause my school! Freeze!…").
  if (kind.id === 'item-power') {
    const p = typeof tok.choice.power === 'number' ? state.agent.powers[tok.choice.power] : null;
    const story = p && p.power && p.power.indexOf('pow-') === 0
      ? [storyId(p.power), tok.label + '!'] : [storyId('item-power'), kind.label + '!'];
    addPowerItem(tok.choice, [story]);
    return;
  }
  // 🤝 The agent's handshake: the rhythm goes in, then plays as its tune.
  if (kind.id === 'item-handshake') {
    addAndSay({ type: 'item-handshake', taps: state.agent.handshake.taps.slice() },
              [[storyId('item-handshake'), kind.label + '!', () => playHandshake(false)]]);
    return;
  }
  // 🤫 The secret word goes in as a COPY of its recording, so making a new
  // secret word later cannot empty the bottle - then it plays, in its voice.
  if (kind.id === 'item-word') {
    addSecretWordItem();
    return;
  }
  // 🗣️ The way the agent likes to talk most (⭐ in How my agent talks):
  // "My agent likes… Signing! Talking with hands, like Makaton."
  if (kind.id === 'item-talk') {
    addAndSay({ type: 'item-talk', mode: tok.mode.id },
              [['nar-likes-frame', 'My agent likes…'], [storyId(tok.mode.id), tok.mode.label + '.']]);
    return;
  }
  if (kind.id === 'item-safe') {
    const place = safePlaceForBottle();
    addAndSay({ type: 'item-safe', place: { id: place.id || null, png: place.png || null } },
              [[storyId(kind.id), kind.label + '!']]);
    return;
  }
  // A voice message, or the name of a favourite game: 🎤 and a spy voice.
  // What to do is said straight away, so a child knows what the 🎤 is for.
  if (kind.id === 'item-voice' || kind.id === 'item-game') {
    bottleUi.sub = 'voice';
    bottleUi.subType = kind.id;
    bottleUi.voiceDraft = null;
    bottleSay([kind.id === 'item-game'
      ? ['nar-game-say', 'Say the name of your favourite game.']
      : ['nar-voice-say', 'Tap the microphone. Say your message.']]);
    paintTokens();
    return;
  }
  // A drawing, or something my agent can't live without: the shared ✏️
  // sheet - draw it, say it, or both. The sheet says the token's story.
  openOwnCard({
    title: kind.label,
    say: storyId(kind.id),
    onKeep: card => addAndSay({ type: kind.id, png: card.png || null, audioId: card.audioId || null })
  });
}

async function addSecretWordItem() {
  const word = state.agent.secretWord;
  const row = word && await Storage.loadAudio(word.audioId);
  if (!row) return;
  const id = uuid();
  await Storage.saveAudio(id, row.blob);
  addAndSay({ type: 'item-word', audioId: id, filter: word.filter || 'normal' },
            [[storyId('item-word'), 'My secret word!', () => playClipIn(id, word.filter || 'normal')]]);
}

/* A power GIVEN to whoever the bottle is for. `power` is the power's place
   in agent.powers (§10), and `powerId` its own id, so the item still knows
   which power it was if an earlier one is removed. */
function addPowerItem(choice, lines) {
  addAndSay({ type: 'item-power', power: choice.power, powerId: choice.powerId }, lines);
  playSfx('sfx-gift');
}

/* One item being made: a voice message, or a game's name. (Which power
   to give used to be chosen here; since v83 each power is its own token.) */
function paintBottleSub() {
  const sub = $('#bottle-sub');
  sub.innerHTML = '';
  sub.hidden = !bottleUi.sub;
  if (!bottleUi.sub) return;

  const back = document.createElement('button');
  back.className = 'btn tool';
  back.setAttribute('aria-label', 'Back');
  back.textContent = '↩️';
  back.addEventListener('click', cancelBottleSub);

  // A voice message or a game's name: 🎤, then any of the six voices,
  // then ✓ in it goes. The token's icon says which one is being made.
  const draft = bottleUi.voiceDraft;
  const kind = itemKind(bottleUi.subType || 'item-voice');
  const what = document.createElement('div');
  what.className = 'bottle-sub-what';
  what.innerHTML = '<span class="sub-what-icon"></span><span class="sub-what-label"></span>';
  what.querySelector('.sub-what-icon').textContent = kind.emoji;
  what.querySelector('.sub-what-label').textContent = kind.label;
  what.style.setProperty('--chip', kind.colour);
  sub.appendChild(what);
  const mic = document.createElement('button');
  mic.id = 'bottle-mic';
  mic.className = 'btn btn-big word-mic';
  mic.setAttribute('aria-label', 'Record a voice message');
  mic.textContent = Voice.isRecording() ? '⏹️' : '🎤';
  mic.addEventListener('click', recordBottleVoice);
  sub.appendChild(mic);
  if (draft) {
    sub.appendChild(voicePicker(draft.filter, true, filterId => {
      draft.filter = filterId;
      logEvent('bottle_voice_filter', { filter: filterId });
      paintBottleSub();
      playClipIn(draft.audioId, filterId);
    }));
    const put = document.createElement('button');
    put.className = 'btn btn-accent btn-big';
    put.innerHTML = '✓ <span class="btn-label">Put it in</span>';
    put.addEventListener('click', () => {
      const d = bottleUi.voiceDraft;
      bottleUi.voiceDraft = null;
      addAndSay({ type: bottleUi.subType || 'item-voice', audioId: d.audioId, filter: d.filter });
    });
    sub.appendChild(put);
  }
  sub.appendChild(back);
}

/* The six spy voices as buttons. `withNormal` false leaves "Normal" out -
   a mystery voice message must be disguised (§8). */
function voicePicker(current, withNormal, onPick) {
  const row = document.createElement('div');
  row.className = 'word-voices';
  Voice.FILTERS.forEach(filter => {
    if (!withNormal && filter.id === 'normal') return;
    const b = document.createElement('button');
    b.className = 'btn word-voice' + (current === filter.id ? ' is-on' : '');
    b.innerHTML = '<span class="voice-icon">' + filter.icon + '</span><span class="btn-label"></span>';
    b.querySelector('.btn-label').textContent = filter.label;
    b.addEventListener('click', () => onPick(filter.id));
    row.appendChild(b);
  });
  return row;
}

async function playClipIn(audioId, filterId) {
  if (state.muted) return;
  Voice.unlock();
  const row = await Storage.loadAudio(audioId);
  if (row) Voice.play(audioId, row.blob, filterId);
}

async function recordBottleVoice() {
  Voice.unlock();
  if (Voice.isRecording()) { Voice.stop(); return; }
  if (!Voice.canRecord()) { toast('This iPad cannot record'); return; }
  const mic = $('#bottle-mic');
  if (mic) { mic.classList.add('is-recording'); mic.textContent = '⏹️'; }
  try {
    const result = await Voice.record({ maxMs: 10000, onTick: () => {} });
    const id = uuid();
    await Storage.saveAudio(id, result.blob);
    const old = bottleUi.voiceDraft;
    if (old && old.audioId) { Voice.forget(old.audioId); await Storage.deleteAudio(old.audioId); }
    bottleUi.voiceDraft = { audioId: id, filter: (old && old.filter) || 'normal' };
    logEvent('bottle_voice_record', { ms: Math.round(result.ms) });
    playClipIn(id, bottleUi.voiceDraft.filter);
  } catch (err) {
    toast('The microphone did not work');
  }
  paintBottleSub();
}

async function cancelBottleSub() {
  const d = bottleUi.voiceDraft;
  if (d && d.audioId) { Voice.forget(d.audioId); await Storage.deleteAudio(d.audioId); }
  bottleUi.voiceDraft = null;
  bottleUi.sub = null;
  bottleUi.subType = null;
  paintTokens();
}

/* ---- 👥 who is it for ---- */

function paintBottleTo() {
  const b = currentBottle();
  const box = $('#bottle-to-cards');
  box.innerHTML = '';
  BOTTLE_TO.forEach(to => {
    const card = modeCard(to, b.to === to.id, () => chooseBottleTo(to.id));
    // The bottle's own words, not the Who card's: "A friend at school".
    const label = card.querySelector('.pic-card-label');
    if (label) label.textContent = to.label;
    box.appendChild(card);
  });
  $('#bottle-to-go').hidden = !b.to;
  paintToName(b);
  /* The list of every agent on this iPad, to pick a friend's, is gone
     (Filip, 4 November: children do not know which agent is their
     friend's). "A friend" is the answer, and the narrator confirms it.
     `toAgentId` stays null from v84. */
}

function chooseBottleTo(id) {
  const b = currentBottle();
  // A name said for one person does not belong to another: changing who
  // the bottle is for deletes it.
  if (b.toNameAudioId && b.to !== id) forgetToName(b);
  b.to = id;
  if (id !== 'who-friend') b.toAgentId = null;
  if (id === 'who-me') b.signed = null;       // nothing to sign for "me"
  logEvent('bottle_to', { who: id });
  // Its story - for a friend or a teacher, "…say their name".
  logEvent('label_speak', { id: id });
  const to = BOTTLE_TO.find(x => x.id === id);
  bottleSay([['nar-story-to-' + id.replace(/^who-/, ''), to ? to.label + '!' : '']]);
  paintBottle();
  scheduleSave();
}

/* ---- 🎤 saying who it is for ----
   For a friend or a teacher the child may SAY their name (Filip decided
   this on 4 November 2026, knowing it records a real name - an exception
   to "codenames only" for this one thing). It is optional. The recording
   stays on this iPad: it is NEVER part of what is sent to the display
   (buildBottlePayload leaves it out), but it IS in the export, which holds
   every recording - DATA.md marks it as personal data. */
function paintToName(b) {
  const box = $('#bottle-to-name');
  const to = BOTTLE_TO.find(x => x.id === b.to);
  box.hidden = !(to && to.named);
  if (box.hidden) return;
  const mic = $('#to-name-mic');
  mic.classList.toggle('has-clip', Boolean(b.toNameAudioId));
  mic.querySelector('.to-name-icon').textContent = Voice.isRecording() ? '⏹️' : '🎤';
  mic.querySelector('.btn-label').textContent = b.toNameAudioId ? 'Say it again' : 'Say who';
  $('#to-name-play').hidden = !b.toNameAudioId;
}

async function recordToName() {
  Voice.unlock();
  if (Voice.isRecording()) { Voice.stop(); return; }
  if (!Voice.canRecord()) { toast('This iPad cannot record'); return; }
  const b = currentBottle();
  const mic = $('#to-name-mic');
  mic.classList.add('is-recording');
  mic.querySelector('.to-name-icon').textContent = '⏹️';
  bottleSay([]);                       // the narrator stops while the child speaks
  try {
    const result = await Voice.record({ maxMs: 10000, onTick: () => {} });
    const id = uuid();
    await Storage.saveAudio(id, result.blob);
    const again = Boolean(b.toNameAudioId);
    if (again) await forgetToName(b, true);
    b.toNameAudioId = id;
    logEvent('bottle_to_name', { ms: Math.round(result.ms), again: again });
    scheduleSave();
    // The child hears the name back, then the narrator confirms it.
    const ok = b.to === 'who-teacher'
      ? ['nar-name-ok-teacher', 'Got it! It goes to your teacher at school.']
      : ['nar-name-ok-friend', 'Got it! It goes to your friend at school.'];
    await playToName(b);
    if (bottleUi.phase === 'to') bottleSay([ok]);
  } catch (err) {
    toast('The microphone did not work');
  }
  mic.classList.remove('is-recording');
  paintToName(b);
}

async function playToName(b) {
  if (!b.toNameAudioId || state.muted) return;
  const row = await Storage.loadAudio(b.toNameAudioId);
  if (row) await Promise.race([Voice.play(b.toNameAudioId, row.blob, 'normal'),
                               new Promise(r => setTimeout(r, 11000))]);
}

/* The name recording goes - when it is said again, or the bottle is for
   someone else now. `quiet` when a new one is replacing it (that is
   logged as `again`). */
async function forgetToName(b, quiet) {
  const id = b.toNameAudioId;
  b.toNameAudioId = null;
  if (!id) return;
  if (!quiet) logEvent('bottle_to_name_remove', {});   // before the new choice is logged
  Voice.forget(id);
  await Storage.deleteAudio(id);
}

/* ---- 🕵️ who is it from? ---- */

/* The two answers, as cards: the agent itself - its picture and its
   codename - or a mystery, the same empty dashed agent as the Start
   screen with a "?" on it. Showing the agent says what "signed" means
   better than any word could. */
function signCard(signed, on) {
  const card = document.createElement('button');
  card.className = 'pic-card sign-card' + (on ? ' is-on' : '');
  card.setAttribute('aria-pressed', on ? 'true' : 'false');
  const art = document.createElement('span');
  art.className = 'pic-card-art sign-art';
  if (signed) {
    art.innerHTML = agentViewHtml('sign-agent');
    renderAgentView(art.querySelector('.agent-view'), state.agent.cover, false);
  } else {
    art.innerHTML = '<svg class="hero-outline" viewBox="0 0 100 120" aria-hidden="true">' +
      '<circle cx="50" cy="32" r="24"/><path d="M12 117 C12 84 29 64 50 64 C71 64 88 84 88 117 Z"/></svg>' +
      '<span class="sign-q">?</span>';
  }
  const label = document.createElement('span');
  label.className = 'pic-card-label';
  // "From Swift Arrow": a codename alone did not say what the card means.
  label.textContent = signed ? 'From ' + (state.agent.codename || 'my agent') : '🎭 Mystery';
  card.appendChild(art);
  card.appendChild(label);
  card.setAttribute('aria-label', signed ? 'From my agent' : 'A mystery');
  card.addEventListener('click', () => chooseSign(signed));
  return card;
}

/* Everything in the bottle that carries a recording: a voice message, a
   game's name, and anything said on the ✏️ sheet. */
function recordedItems(bottle) {
  return bottle.items.filter(it => it.audioId);
}

function paintBottleSign() {
  const b = currentBottle();
  const box = $('#bottle-sign-cards');
  box.innerHTML = '';
  box.appendChild(signCard(true, b.signed === true));
  box.appendChild(signCard(false, b.signed === false));

  /* A mystery must not give the sender away by their voice: EVERY
     recording in a mystery bottle takes a spy voice - "Normal" is not
     offered, and the child hears the disguise before going on (§8). */
  const disguise = $('#bottle-disguise');
  disguise.innerHTML = '';
  const recorded = recordedItems(b);
  const plain = b.signed === false ? recorded.filter(it => (it.filter || 'normal') === 'normal') : [];
  disguise.hidden = b.signed !== false || recorded.length === 0;
  if (!disguise.hidden) {
    const head = document.createElement('div');
    head.className = 'soon-icon';
    head.textContent = '🎭🎤';
    disguise.appendChild(head);
    const current = recorded[0].filter || 'normal';
    disguise.appendChild(voicePicker(current, false, filterId => {
      recorded.forEach(it => { it.filter = filterId; });
      logEvent('bottle_voice_filter', { filter: filterId, mystery: true });
      paintBottle();                    // the 🚀 tab can show again
      playClipIn(recorded[0].audioId, filterId);
      scheduleSave();
    }));
  }
  $('#bottle-sign-go').hidden = b.signed === null || plain.length > 0;
}

function chooseSign(signed) {
  const b = currentBottle();
  b.signed = signed;
  logEvent('bottle_sign', { signed: signed });
  // Signed: "Signed! Everyone will see it's from your agent." and then
  // the agent's name, in the narrator's voice. A mystery: what it hides.
  // Only a rolled name has the narrator's recordings; a typed one is left
  // unsaid rather than read by the iPad's robotic voice.
  const parts = state.agent.codenameParts || {};
  const rolled = ADJECTIVES.indexOf(parts.word) !== -1 && SPY_WORDS.some(s => s.name === parts.animal);
  if (signed) {
    bottleSay([['nar-sign-agent', "Signed! Everyone will see it's from your agent."]].concat(rolled
      ? [[nameLineId(parts.word), parts.word], [nameLineId(parts.animal), parts.animal]] : []));
  } else {
    bottleSay([['nar-sign-mystery', "Mystery. The big screen won't say who."]]);
  }
  paintBottle();
  scheduleSave();
}

/* ---- 🚀 cork it, send it ---- */

function paintBottleSend() {
  const b = currentBottle();
  const forMe = b.to === 'who-me';
  $('#bottle-cork').hidden = Boolean(bottleUi.corked);
  $('#bottle-rocket').hidden = !bottleUi.corked || forMe;
  $('#bottle-keep').hidden = !bottleUi.corked || !forMe;
}

function corkBottle() {
  bottleUi.corked = 'new';
  bottleUi.armed = null;
  logEvent('bottle_cork', {});
  playSfx('sfx-cork');
  if (currentBottle().to !== 'who-me') bottleSay([['nar-bottle-send', 'Swipe it up, or hold the rocket. Off it goes!']]);
  paintBottle();
}

function keepBottle() {
  const b = currentBottle();
  b.state = 'kept';
  logEvent('bottle_keep', {});
  bottleSay([['nar-bottle-kept', 'Your bottle stays safe on your shelf.']]);
  bottleUi.index = null;
  scheduleSave();
  startBottlePhase('shelf');
}

/* Send: the same flight whether or not the link works (§8). */
function sendBottle() {
  const b = currentBottle();
  if (!b || !bottleUi.corked || b.to === 'who-me' || b.state !== 'open') return;
  cancelRocketHold();
  b.state = 'sent';
  b.sentAt = nowIso();
  logEvent('bottle_send', { to: b.to, signed: Boolean(b.signed), items: b.items.map(it => it.type) });
  playSfx('sfx-bottle-send');
  $('#bottle-art').classList.add('is-flying');
  scheduleSave();

  const agent = state.agent;
  bottleTimers.push(setTimeout(() => {
    // On its way - and to whom (Filip: "it does not say to whom").
    const sentLine = { 'who-everyone': 'nar-bottle-sent-everyone',
                       'who-friend': 'nar-bottle-sent-friend',
                       'who-teacher': 'nar-bottle-sent-teacher' }[b.to] || 'nar-bottle-sent';
    bottleSay([[sentLine, 'Whoosh!']]);
    bottleUi.index = null;
    startBottlePhase('shelf');
  }, 1300));

  // Then, quietly, the actual sending.
  deliverBottle(agent, b).then(ok => {
    if (ok) return;
    b.state = 'waiting';
    if (agent === state.agent) { logEvent('bottle_queued', {}); scheduleSave(); }
    else logEventOnAgent(agent, 'bottle_queued', {});
    paintWaitingCount();
  });
}

/* Hold 🚀: the button fills while it is held, and sends when it is full.

   NOT called startHold/cancelHold: those are the logo's long press (section
   12), and a second function declaration with the same name silently
   REPLACES the first for the whole app. From P6 until v81 holding the logo
   ran this code instead, so the adult panel - and Export - could not be
   reached. */
function startRocketHold(event) {
  event.preventDefault();
  const rocket = $('#bottle-rocket');
  rocket.style.setProperty('--hold-ms', BOTTLE_HOLD_MS + 'ms');
  rocket.classList.add('is-holding');
  clearTimeout(bottleHold);
  bottleHold = setTimeout(sendBottle, BOTTLE_HOLD_MS);
}

function cancelRocketHold() {
  clearTimeout(bottleHold);
  bottleHold = null;
  const rocket = $('#bottle-rocket');
  if (rocket) rocket.classList.remove('is-holding');
}

/* Swipe the bottle up to send it. */
let swipeFrom = null;
function bottleSwipeStart(event) { swipeFrom = event.clientY; }
function bottleSwipeEnd(event) {
  if (swipeFrom === null) return;
  const dy = event.clientY - swipeFrom;
  swipeFrom = null;
  if (bottleUi.phase === 'send' && dy < -60) sendBottle();
}

/* ---- 🗂️ the shelf ---- */

function paintBottleShelf() {
  const list = $('#bottle-shelf-list');
  list.innerHTML = '';
  state.agent.bottles.forEach(b => {
    if (b.state === 'open') return;
    const card = document.createElement('div');
    card.className = 'bottle-kept';
    const to = BOTTLE_TO.find(t => t.id === b.to);
    // A child sees "sent" whether it has arrived yet or is still waiting.
    const stateText = b.state === 'kept' ? '🔒 Kept' : '🚀 Sent';
    card.innerHTML = '<div class="kept-art">' + bottleSvg(b, { corked: true }) + '</div>' +
      '<div class="kept-to">' + (to ? to.emoji : '') + (b.signed === false ? '🎭' : '') + '</div>' +
      '<div class="kept-state"></div>';
    card.querySelector('.kept-state').textContent = stateText;
    list.appendChild(card);
  });
  $('#bottle-new').hidden = state.agent.bottles.length >= MAX_BOTTLES;
}

/* ---- what goes to the display (v3 §9.1) ---- */

/* A picture made smaller, so a bottle stays well under the relay's 2 MB. */
function shrinkPng(dataUrl, max) {
  return new Promise(resolve => {
    if (!dataUrl) { resolve(null); return; }
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/* The agent as a picture, at most `size` pixels, drawn by the same code as
   the v2 card (drawAgentToCanvas), standing in its place. */
async function agentPicture(agent, size) {
  await preloadCardAssets(agent);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  drawAgentToCanvas(canvas.getContext('2d'), agent.cover || {}, 0, 0, size, false, cardAssets.hq);
  return canvas.toDataURL('image/png');
}

/* A recording as the sound the child heard: disguised on the iPad. */
async function renderedClip(audioId, filterId) {
  try {
    const row = await Storage.loadAudio(audioId);
    if (!row) return null;
    return await blobToDataUrl(await Voice.render(audioId, row.blob, filterId || 'normal'));
  } catch (err) {
    reportError('render voice', err);
    return null;
  }
}

/* `mystery` is true for an unsigned bottle. Its recordings were all given a
   spy voice on the 🕵️ step; if one somehow was not (an item added after
   that step), its sound is left behind rather than sent in the child's
   real voice. */
async function itemPayload(agent, item, mystery) {
  const out = { type: item.type };
  const filter = item.filter || 'normal';
  const clip = async () => (mystery && filter === 'normal') ? null : renderedClip(item.audioId, filter);
  if (item.type === 'item-power') {
    const p = item.power === 'v2' ? null
      : (agent.powers.find(x => x.id === item.powerId) || agent.powers[item.power]);
    out.power = p ? p.power : 'v2';
    const own = p ? p.own : (agent.powerup && agent.powerup.power);
    out.picture = await shrinkPng(own && own.png, 256);
    // "Control teachers" shows what the child's "so that" shows (§7.2).
    if (p && p.power === 'pow-control-teachers' && p.soThat) out.soThat = await shrinkPng(p.soThat.png, 256);
  } else if (item.type === 'item-handshake') {
    out.taps = item.taps;
  } else if (item.type === 'item-voice' || item.type === 'item-word') {
    // A voice message, or the secret word (v83) - each in its spy voice.
    out.audio = await clip();
    out.filter = item.filter;
  } else if (item.type === 'item-talk') {
    out.mode = item.mode;                  // v83: e.g. "mode-hands"
  } else if (item.type === 'item-safe') {
    out.place = item.place.id;
    out.picture = await shrinkPng(item.place.png, 512);
  } else {
    // A drawing, a game, something the agent can't live without - each
    // recording in the voice the child heard (a mystery's is disguised).
    out.picture = await shrinkPng(item.png, 512);
    out.audio = item.audioId ? await clip() : null;
  }
  return out;
}

/* The bottle as it travels. NEVER the agent id, the event log, another
   agent, or the name a child said for a friend or teacher (v86, it stays
   on this iPad) (§9.1). For a friend or a teacher: the envelope only. */
async function buildBottlePayload(agent, bottle) {
  let toEmblem = null;
  if (bottle.to === 'who-friend' && bottle.toAgentId) {
    const friend = await Storage.loadAgent(bottle.toAgentId);
    toEmblem = friend ? agentEmblem(migrateAgent(friend)) : null;
  }
  const payload = {
    type: 'bottle',
    bottleId: bottle.id,               // random; nothing to do with the agent id
    sentAt: bottle.sentAt,
    to: bottle.to,
    toEmblem: toEmblem,
    signed: Boolean(bottle.signed),
    from: null,
    items: []
  };
  if (bottle.signed) {
    payload.from = {
      codename: agent.codename,
      emblem: agentEmblem(agent),
      picture: await agentPicture(agent, 256),
      handshake: agent.handshake ? agent.handshake.taps : null
    };
  }
  if (bottle.to === 'who-everyone') {
    for (const item of bottle.items) payload.items.push(await itemPayload(agent, item, !bottle.signed));
  }
  // The relay takes 2 MB at most. A bottle that would be bigger drops its
  // sounds rather than not arriving at all.
  if (JSON.stringify(payload).length > 1900000) {
    payload.items.forEach(it => { if (it.audio) { it.audio = null; it.audioDropped = true; } });
  }
  return payload;
}

/* Hand one bottle to the relay. True if it took it. */
async function deliverBottle(agent, bottle) {
  if (!state.displayOn) return false;
  let ok = false;
  try {
    ok = await sendToRelay(await buildBottlePayload(agent, bottle));
  } catch (err) {
    reportError('bottle payload', err);
  }
  if (!ok) return false;
  bottle.state = 'delivered';
  bottle.deliveredAt = nowIso();
  const ms = Date.parse(bottle.deliveredAt) - Date.parse(bottle.sentAt);
  if (agent === state.agent) { logEvent('bottle_delivered', { ms: ms }); scheduleSave(); }
  else await logEventOnAgent(agent, 'bottle_delivered', { ms: ms });
  return true;
}

/* Every bottle on this iPad still waiting to go - from any agent. Stops at
   the first failure: the link is down, and the rest would fail too. */
let sendingWaiting = false;
async function sendWaitingBottles() {
  if (sendingWaiting || !state.displayOn) return 0;
  sendingWaiting = true;
  let sent = 0;
  try {
    const agents = (await Storage.listAgents()).map(migrateAgent);
    outer:
    for (const stored of agents) {
      // The open agent is changed in memory, never behind its back.
      const agent = state.agent && state.agent.id === stored.id ? state.agent : stored;
      for (const bottle of agent.bottles.filter(b => b.state === 'waiting')) {
        if (await deliverBottle(agent, bottle)) sent++;
        else break outer;
      }
    }
  } catch (err) {
    reportError('send waiting bottles', err);
  }
  sendingWaiting = false;
  paintWaitingCount();
  return sent;
}

/* The adult panel's count. Adults see numbers; children never do. */
async function paintWaitingCount() {
  const label = $('#bottles-waiting');
  if (!label) return 0;
  const agents = (await Storage.listAgents()).map(migrateAgent);
  let n = 0;
  agents.forEach(stored => {
    const agent = state.agent && state.agent.id === stored.id ? state.agent : stored;
    n += agent.bottles.filter(b => b.state === 'waiting').length;
  });
  label.textContent = n === 0 ? 'No bottles waiting'
    : n === 1 ? '1 bottle waiting' : n + ' bottles waiting';
  return n;
}

function wireBottle() {
  $$('[data-bottle-phase]').forEach(b =>
    b.addEventListener('click', () => goBottlePhase(b.dataset.bottlePhase, 'tab')));
  $('#bottle-fill-go').addEventListener('click', () => goBottlePhase('to', 'next'));
  $('#to-name-mic').addEventListener('click', recordToName);
  $('#to-name-play').addEventListener('click', () => { Voice.unlock(); playToName(currentBottle()); });
  $('#bottle-to-go').addEventListener('click', () =>
    goBottlePhase(currentBottle().to === 'who-me' ? 'send' : 'sign', 'next'));
  $('#bottle-sign-go').addEventListener('click', () => goBottlePhase('send', 'next'));
  $('#bottle-cork').addEventListener('click', corkBottle);
  $('#bottle-keep').addEventListener('click', keepBottle);
  const rocket = $('#bottle-rocket');
  rocket.addEventListener('pointerdown', startRocketHold);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(e => rocket.addEventListener(e, cancelRocketHold));
  const art = $('#bottle-art');
  art.addEventListener('pointerdown', bottleSwipeStart);
  window.addEventListener('pointerup', bottleSwipeEnd);
  $('#bottle-new').addEventListener('click', () => {
    if (state.agent.bottles.length >= MAX_BOTTLES) return;
    logEvent('bottle_new', {});
    bottleUi.index = null;
    startBottlePhase('fill');
  });
  $('#bottle-say').addEventListener('click', () => speakLine(BOTTLE_TITLES[bottleUi.phase][1]));

  // The adult panel: send the waiting bottles now.
  $('#btn-send-waiting').addEventListener('click', async () => {
    paintDisplayLink('Sending…');
    const n = await sendWaitingBottles();
    const left = await paintWaitingCount();
    paintDisplayLink(left === 0 ? '✅ Nothing waiting.' :
      (n ? '✅ Sent ' + n + '. ' : '') + '⚠️ ' + left + ' still waiting - is the link on and the relay running?');
  });

  // While the app is open, try the waiting ones every 30 seconds.
  setInterval(() => { if (state.displayOn) sendWaitingBottles(); }, 30000);
}
