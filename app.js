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
const MILESTONE = 'v2-V3';

// The six missions, in the order children meet them.
/* The missions, in strip order (v2 spec §3). The ids are words now, not m1-m6:
   a log full of "m5" cannot be read six months later, and the missions have
   been reordered and renamed, so the numbers had stopped matching anyway.
   §6.2 migrates old agents.

   `opensIn` is the session a mission becomes available in. The adult panel's
   Session setting applies those as a preset, and single missions can then be
   switched off - for example HQ, when a rotation is running short. */
const MISSIONS = [
  { id: 'make',    icon: '🎨', opensIn: 2, title: 'Make your agent',  prompt: 'Make your agent. Pick a door.',            narrate: 'nar-make-intro' },
  { id: 'powerup', icon: '⚡', opensIn: 2, title: 'Power-up',         prompt: 'Your agent is powering up!',               narrate: 'nar-powerup-intro' },
  { id: 'hq',      icon: '📍', opensIn: 2, title: 'HQ',               prompt: 'Where is your agent strongest?',           narrate: 'nar-hq-intro' },
  { id: 'voice',   icon: '🎤', opensIn: 2, title: 'Voice password',   prompt: 'Record your secret voice password.',       narrate: 'nar-voice-intro' },
  { id: 'field',   icon: '🛡️', opensIn: 3, title: 'Force field',      prompt: "Make your agent's force field.",           narrate: 'nar-field-intro' },
  { id: 'mood',    icon: '💛', opensIn: 3, title: 'Mood codes',       prompt: 'Make a secret mood code.',                 narrate: 'nar-mood-intro' },
  { id: 'rules',   icon: '📋', opensIn: 4, title: 'Agent rules',      prompt: 'Make rules for the people around your agent.', narrate: 'nar-rules-intro' },
  { id: 'badge',   icon: '🏷️', opensIn: 4, title: 'Badge & poster',   prompt: 'Design your badge and your wall poster.',  narrate: 'nar-badge-intro' }
];

const REVEAL_ICON = '🗂️';

// Which session is running. The adult panel sets it; every event carries it.
const DEFAULT_SESSION = 2;

// Codename word lists (spec §7). Adjective + animal, with the animal's emoji.
const ADJECTIVES = [
  'Silent', 'Swift', 'Brave', 'Clever', 'Hidden', 'Golden', 'Midnight', 'Lucky',
  'Shadow', 'Bright', 'Sneaky', 'Mighty', 'Quiet', 'Wild', 'Cosmic', 'Electric',
  'Frosty', 'Turbo', 'Secret', 'Jazzy', 'Rapid', 'Steady', 'Neon', 'Royal'
];

const ANIMALS = [
  { name: 'Falcon',   emoji: '🦅' }, { name: 'Fox',     emoji: '🦊' },
  { name: 'Tiger',    emoji: '🐯' }, { name: 'Owl',     emoji: '🦉' },
  { name: 'Wolf',     emoji: '🐺' }, { name: 'Shark',   emoji: '🦈' },
  { name: 'Panda',    emoji: '🐼' }, { name: 'Dragon',  emoji: '🐉' },
  { name: 'Otter',    emoji: '🦦' }, { name: 'Cat',     emoji: '🐱' },
  { name: 'Bear',     emoji: '🐻' }, { name: 'Rabbit',  emoji: '🐰' },
  { name: 'Octopus',  emoji: '🐙' }, { name: 'Penguin', emoji: '🐧' },
  { name: 'Lion',     emoji: '🦁' }, { name: 'Frog',    emoji: '🐸' },
  { name: 'Hedgehog', emoji: '🦔' }, { name: 'Parrot',  emoji: '🦜' },
  { name: 'Dolphin',  emoji: '🐬' }, { name: 'Bee',     emoji: '🐝' },
  { name: 'Crab',     emoji: '🦀' }, { name: 'Koala',   emoji: '🐨' },
  { name: 'Monkey',   emoji: '🐵' }, { name: 'Moth',    emoji: '🦋' }
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
     locked  - padlock with a question mark (the mystery)

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
  return mission.opensIn <= state.session;
}

// The card is open once every mission that is open has been finished or passed.
function revealIsOpen() {
  if (!state.agent) return false;
  const open = MISSIONS.filter(missionIsOpen);
  if (open.length === 0) return true;
  return open.every(m => state.agent.missions[m.id] !== 'todo');
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
      const status  = state.agent.missions[mission.id];   // done | passed | todo
      const isNow   = state.screen === 'mission' && index === state.missionIndex;
      // v2 §3: a mission is locked until its session, or if an adult has
      // switched it off for this rotation.
      const locked  = !missionIsOpen(mission);

      const button = document.createElement('button');
      button.className = 'pip';
      button.dataset.index = index;

      if (locked)               button.classList.add('is-locked');
      else if (isNow)           button.classList.add('is-current');
      else if (status === 'done')   button.classList.add('is-done');
      else if (status === 'passed') button.classList.add('is-passed');
      else                         button.classList.add('is-open');

      button.innerHTML = locked
        ? '<span class="pip-icon">🔒</span><span class="pip-q">?</span>'
        : '<span class="pip-icon">' + mission.icon + '</span>' +
          (status === 'done'   ? '<span class="pip-stamp">✓</span>' : '') +
          (status === 'passed' ? '<span class="pip-stamp pip-stamp-grey">✓</span>' : '');

      button.setAttribute('aria-label', locked ? 'Locked' : mission.title);

      if (locked) {
        /* v2 §3: a locked mission explains itself rather than doing nothing.
           It is NOT disabled, because a disabled button cannot be tapped and
           so the child never hears why. */
        button.addEventListener('click', () => {
          logEvent('locked_tap', { mission: mission.id });
          speakLine('nar-locked');
        });
      } else {
        // Spec §6: tapping a done or passed icon goes back to that mission.
        button.addEventListener('click', () => goToMission(index, 'back_to'));
      }
      strip.appendChild(button);
    });

    // The Reveal sits at the end of the strip.
    const revealLocked = !revealIsOpen();
    const revealBtn = document.createElement('button');
    revealBtn.className = 'pip pip-reveal ' +
      (revealLocked ? 'is-locked' : (state.onReveal ? 'is-current' : 'is-open'));
    revealBtn.innerHTML = revealLocked
      ? '<span class="pip-icon">🔒</span><span class="pip-q">?</span>'
      : '<span class="pip-icon">' + REVEAL_ICON + '</span>';
    revealBtn.setAttribute('aria-label', revealLocked ? 'Locked' : 'Agent ID card');
    if (revealLocked) {
      revealBtn.addEventListener('click', () => {
        logEvent('locked_tap', { mission: 'card' });
        speakLine('nar-locked');
      });
    } else {
      revealBtn.addEventListener('click', openReveal);
    }
    strip.appendChild(revealBtn);
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
  $('#reveal-emoji').textContent  = agentEmblem();
  $('#reveal-name').textContent   = state.agent.codename || '';

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

// Which reels the child has decided to keep. A locked reel does not spin.
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
      if (!reelLocks.animal) animalEl.textContent = pick(ANIMALS).name;
    }, 70);

    await wait(420);
    clearInterval(flicker);
  }

  // Settle the word reel, then the animal reel a beat later.
  if (!reelLocks.word) {
    pendingCodename.word = pick(ADJECTIVES);
  }
  if (!reelLocks.animal) {
    const animal = pick(ANIMALS);
    pendingCodename.animal = animal.name;
    pendingCodename.emoji  = animal.emoji;
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

function toggleReelLock(reel) {
  reelLocks[reel] = !reelLocks[reel];
  logEvent('codename_lock', { reel: reel, on: reelLocks[reel] });
  paintCodename();
}

function paintCodename() {
  const wordEl   = $('#reel-word');
  const animalEl = $('#reel-animal');
  if (!wordEl) return;

  if (!wordEl.classList.contains('is-spinning')) wordEl.textContent = pendingCodename.word;
  if (!animalEl.classList.contains('is-spinning')) animalEl.textContent = pendingCodename.animal;
  $('#codename-emoji').textContent = pendingCodename.emoji || '🕵️';

  [['word', '#lock-word'], ['animal', '#lock-animal']].forEach(([reel, sel]) => {
    const button = $(sel);
    if (!button) return;
    const on = reelLocks[reel];
    button.textContent = on ? '🔒' : '🔓';
    button.classList.toggle('is-on', on);
    button.setAttribute('aria-checked', on ? 'true' : 'false');
  });

  // A typed name has no animal reel, so the second reel is hidden for it.
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
  // A rolled name brings the animal's emoji with it; a typed one has already
  // set its own emblem above, so only fill in a missing one here.
  if (source === 'roll' || !state.agent.emblem || !state.agent.emblem.emoji) {
    if (!state.agent.emblem || !state.agent.emblem.asset) {
      state.agent.emblem = { emoji: pendingCodename.emoji || '🕵️', asset: null };
    }
  }
  scheduleSave();
}

/* THE EMOJI IS THE HERO (v2 §5.1). Tapping it bounces it and says the name.
   There is no recorded audio for a name, so this is always speechSynthesis. */
function tapEmblem() {
  const hero = $('#emblem-hero');
  if (hero && fullMotion()) {
    hero.classList.remove('is-bouncing');
    void hero.offsetWidth;
    hero.classList.add('is-bouncing');
  }
  if (state.muted) return;
  speakWithVoice(pendingCodename.codename || 'Your spy name');
  logEvent('codename_speak', { codename: pendingCodename.codename });
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

  /* Two children CAN land on the same codename - there are only 24 adjectives
     and 24 animals, so in a group of 20 it happens about a quarter of the
     time, and more often still once anyone types their own. Two identical
     tiles leave a child no way to find their own work, and let them open
     somebody else's by mistake.

     So when a codename is shared, those tiles show the agent itself instead
     of the emblem. A child knows their own drawing on sight, which no amount
     of text would manage. Tiles with a name of their own are unchanged
     (v2 §5.2). */
  const seen = {};
  agents.forEach(a => {
    const key = (a.codename || '').toLowerCase();
    seen[key] = (seen[key] || 0) + 1;
  });

  /* Only worth swapping in if there is something to see. Two children who
     clash in the first minute, before either has drawn anything, would get
     two empty boxes - which is worse than two emblems. Judged per tile, so a
     clash where only one child has started still tells them apart. */
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
    const shared = seen[(agent.codename || '').toLowerCase()] > 1 && hasArt(agent);

    tile.innerHTML =
      (shared
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
    if (shared) {
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
    if (revealIsOpen()) { openReveal(); return; }
    index = anyOpen === -1 ? 0 : anyOpen;
  }
  goToMission(index, 'mission_enter');
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
  return {
    schemaVersion: 2,
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
  };
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

  if (agent.schemaVersion === 2) return fillDefaults(agent);

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
    missing: [], requests: [], events: [], legacy: {}
  };

  Object.keys(blank).forEach(key => {
    if (agent[key] === undefined || agent[key] === null) agent[key] = blank[key];
  });

  if (!agent.missions) agent.missions = blankMissions();
  // A mission added in a later V-milestone must appear on an older agent.
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
  // Milestone 4: a movement being previewed must not follow the child either.
  if (typeof previewMove === 'function') previewMove(null);
  // v2 §4.1: sweep up any drag preview stranded on <body>.
  if (typeof clearDragLeftovers === 'function') clearDragLeftovers();
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

  /* Each mission sets itself up as it opens. Only Make and Power-up use the
     shared editor; everything else puts it away first.

     v2 §3: `hq` and `field` have no screen yet, so they show the "coming
     soon" placeholder with Stamp it and Pass. The others keep their v1
     screens until their v2 versions are built. */
  if (mission.id === 'make') enterMake();
  else if (mission.id === 'powerup') enterPowerup();
  else hideEditor();

  if (mission.id === 'mood')  enterMood();
  if (mission.id === 'badge') enterBadge();
  if (mission.id === 'rules') enterRules();
  if (mission.id === 'voice') enterVoice();
  if (mission.id === 'hq')    enterHq();
}

// Stamp it ✓ : this mission is done, move on.
function stampMission() {
  if (!state.agent) return;
  const mission = MISSIONS[state.missionIndex];
  state.agent.missions[mission.id] = 'done';
  logEvent('stamp', { mission: mission.id });
  playStampFeedback();
  advance();
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
  openReveal();
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

function openReveal() {
  leaveCurrent();
  state.onReveal = true;
  showScreen('reveal');
  renderStrip();
  renderPreview();
  logEvent('mission_enter', { mission: 'reveal' });
  renderReveal().then(playRevealFinale);   // Milestones 6 and 8
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

function openMissing() {
  logEvent('missing_open', { screen: currentMissionId() });
  $('#missing-overlay').hidden = false;
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
  paintPpiButtons();
  paintWallButtons();
  paintBackupState();
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
      schemaVersion: 2,
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

   It ADDS; it never replaces. An agent whose id is already here is given a
   new one and kept alongside, so importing the same file twice gives you two
   copies rather than silently overwriting a child's later work.
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

async function importFromFile(file) {
  const result = $('#export-result');
  result.textContent = 'Reading…';

  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch (err) {
    result.textContent = 'That file is not an Agent Lab export.';
    return;
  }

  if (!payload || !Array.isArray(payload.agents)) {
    result.textContent = 'That file has no agents in it.';
    return;
  }

  const existing = (await Storage.listAgents()).map(a => a.id);
  let added = 0, renamed = 0, clips = 0, alreadyHad = 0;

  /* The recordings first, so an agent is never restored pointing at a clip
     that is not there yet. */
  const audio = payload.audio || {};
  for (const id of Object.keys(audio)) {
    try {
      const already = await Storage.loadAudio(id);
      if (already) { alreadyHad++; continue; }   // same uuid = the same clip
      await Storage.saveAudio(id, dataUrlToBlob(audio[id]));
      clips++;
    } catch (err) { reportError('import audio', err); }
  }

  for (const raw of payload.agents) {
    try {
      const agent = migrateAgent(raw);       // an older export still opens
      if (existing.indexOf(agent.id) !== -1) { agent.id = uuid(); renamed++; }
      agent.imported = true;
      await Storage.saveAgent(agent);
      existing.push(agent.id);
      added++;
    } catch (err) { reportError('import agent', err); }
  }

  const expectedClips = Object.keys(audio).length;
  const missed = expectedClips - clips - alreadyHad;

  result.textContent =
    'Imported ' + added + ' agent' + (added === 1 ? '' : 's') +
    (clips ? ' and ' + clips + ' recording' + (clips === 1 ? '' : 's') : '') +
    (renamed ? ' · ' + renamed + ' already here, kept as new copies' : '') +
    (missed > 0 ? ' · ⚠️ ' + missed + ' recording(s) would not restore' : '') + '.';

  await paintBackupState();
  await renderAgentList();
  await renderGallery();
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

/* v2 §5.11: the two settings the card's checks need. */
async function setBadgePpi(value) {
  state.badgePpi = Number(value);
  await Storage.setMeta('badgePpi', state.badgePpi);
  paintPpiButtons();
  sizeBadgeToLife();            // if the badge check is open, it resizes live
}

async function setWallPalette(value) {
  state.wallPalette = Number(value);
  await Storage.setMeta('wallPalette', state.wallPalette);
  paintWallButtons();
}

function paintPpiButtons() {
  $$('[data-ppi]').forEach(b =>
    b.classList.toggle('is-on', Number(b.dataset.ppi) === state.badgePpi));
}

function paintWallButtons() {
  $$('[data-wall]').forEach(b =>
    b.classList.toggle('is-on', Number(b.dataset.wall) === state.wallPalette));
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
  $('#lock-word').addEventListener('click', () => toggleReelLock('word'));
  $('#lock-animal').addEventListener('click', () => toggleReelLock('animal'));
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
  wirePowerup();
  wireHq();

  wireCardV5();
  wireMood();
  wireVoice();
  wireBadge();
  wireRules();
  wireReveal();
  wirePolish();
  wireSessionControls();
  $('#btn-stamp').addEventListener('click', stampMission);
  $('#btn-pass').addEventListener('click', passMission);
  $('#btn-finish').addEventListener('click', finishSession);

  // --- global buttons (there is one of each per screen) ---
  $$('[data-mute]').forEach(b => b.addEventListener('click', toggleMute));
  $$('[data-home]').forEach(b => b.addEventListener('click', goHome));
  $$('[data-speak]').forEach(b => b.addEventListener('click', speakPrompt));
  $('#btn-missing-close').addEventListener('click', closeMissing);

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
    const file = event.target.files && event.target.files[0];
    if (file) importFromFile(file);
    event.target.value = '';        // so the same file can be picked again
  });
  $$('[data-motion]').forEach(b =>
    b.addEventListener('click', () => setMotion(b.dataset.motion)));
  $$('[data-speed]').forEach(b =>
    b.addEventListener('click', () => setNarrationSpeed(b.dataset.speed)));
  $$('[data-ppi]').forEach(b =>
    b.addEventListener('click', () => setBadgePpi(b.dataset.ppi)));
  $$('[data-wall]').forEach(b =>
    b.addEventListener('click', () => setWallPalette(b.dataset.wall)));

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
  state.badgePpi     = await Storage.getMeta('badgePpi', 132);      // v2 §5.11
  state.wallPalette  = await Storage.getMeta('wallPalette', 6);     // v2 §5.11
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
  paintPpiButtons();
  paintWallButtons();

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
  const drawn = agent && agent.hq && agent.hq.png;
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
function agentHqId() {
  return (state.agent && state.agent.hq && state.agent.hq.id) || null;
}

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
  const hqId = (agent && agent.hq && agent.hq.id) || null;
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

  // Mission 2 shows the untouched Cover beside the Boost (spec §7).
  const cover = $('#m2-cover');
  if (cover && editor.part === 'powerup') renderAgentView(cover, state.agent.cover || {}, false);

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

/* Copy the Cover across to make the starting Boost.
   Only ever done once, and only if the Boost is still empty - otherwise a
   child who came back to Mission 2 would find their boost work overwritten.

   slice() copies the pixel array, and the stickers are copied one by one with
   Object.assign, so that moving a sticker on the Boost cannot also move it on
   the Cover. (Without that, both halves would point at the same objects.) */
/* The Power-up MIRRORS the Cover until the child changes it.

   This used to copy once, into an empty Power-up, and never again. So a child
   who went back and recoloured their hair saw the new colour on the Cover and
   the old one on the Power-up, with no way to reconcile them - reported on
   7 October as "it has left the memory from the first cycle".

   It now re-copies every time the Power-up opens, UNTIL the child edits the
   Power-up look through "Change my look". After that it is their own thing
   and is never overwritten. */
function copyCoverToPowerup() {
  const cover = state.agent.cover || {};
  const boost = state.agent.powerup.look;

  if (state.agent.powerup.lookEdited) return false;   // theirs now
  if (!hasArt(cover)) return false;

  // Nothing to do if it already matches.
  if (JSON.stringify(boost.shapes || []) === JSON.stringify(cover.shapes || []) &&
      JSON.stringify(boost.stickers || []) === JSON.stringify(cover.stickers || []) &&
      JSON.stringify(boost.pixels || []) === JSON.stringify(cover.pixels || []) &&
      (boost.drawingPng || null) === (cover.drawingPng || null)) return false;

  boost.pixels   = (cover.pixels || []).slice();
  boost.stickers = (cover.stickers || []).map(s => Object.assign({}, s));
  // Milestone 7 added two more doors, and the copy never learned about them:
  // a child who built with shapes or drew their agent got a blank Power-up.
  boost.shapes     = (cover.shapes || []).map(s => Object.assign({}, s));
  boost.drawingPng = cover.drawingPng || null;
  logEvent('boost_copy', { from: 'cover' });
  return true;
}

/* ---------------------------------------------------------------------------
   AURA - a glow colour around the agent (spec §7)
   ------------------------------------------------------------------------ */
function paintAuraSwatches() {
  const box = $('#aura-swatches');
  box.innerHTML = '';
  AURAS.forEach(aura => {
    const button = document.createElement('button');
    button.className = 'swatch' + (state.agent.powerup.look.glow === aura.id ? ' is-on' : '');
    // The "no glow" option is a crossed-out swatch rather than a colour.
    if (aura.colour) button.style.background = aura.colour;
    else { button.classList.add('swatch-none'); button.textContent = '🚫'; }
    button.setAttribute('aria-label', aura.label);
    button.addEventListener('click', () => setAura(aura.id));
    box.appendChild(button);
  });
}

function setAura(id) {
  state.agent.powerup.look.glow = id;
  logEvent('aura_choose', { aura: id });
  paintAuraSwatches();
  refreshAgentViews();
  scheduleSave();
}

/* ---------------------------------------------------------------------------
   BACKGROUND - where the boosted agent stands (spec §7)
   The pictures themselves are CSS gradients in style.css, so there is nothing
   to download and nothing to go missing offline.
   ------------------------------------------------------------------------ */
/* The place picker. V4 replaces this with the full HQ mission - "where is
   your agent strongest?", draw-your-own, the landing - but the twelve places
   are photographed now, so they are offered here rather than sitting unseen
   in a folder. The choice is already saved as `hq.id`, so V4 inherits it. */
function paintBackgroundOptions() {
  const box = $('#background-options');
  box.innerHTML = '';

  // "Nowhere" first: an agent does not have to have a place.
  const none = document.createElement('button');
  none.className = 'bg-option' + (agentHqId() ? '' : ' is-on');
  none.dataset.bg = 'plain';
  none.innerHTML = '<span class="bg-icon">⬜</span><span class="bg-label">Plain</span>';
  none.setAttribute('aria-label', 'No place');
  none.addEventListener('click', () => setBackground('plain'));
  box.appendChild(none);

  Assets.list('hq').forEach(place => {
    const card = Assets.card(place.id, { className: 'hq-pick' });
    if (agentHqId() === place.id) card.classList.add('is-on');
    card.addEventListener('click', () => {
      setBackground(place.id);
      speakLabel(place.id);          // v2 §7: a picture card says its label
    });
    box.appendChild(card);
  });
}

function setBackground(id) {
  state.agent.hq.id = (id === 'plain' ? null : id);
  /* The Place tab is a shortcut to the same choice the HQ mission makes, so it
     has to behave the same way: a photograph replaces a drawn place (v2 §5.5),
     or the drawing would linger in the data behind it. */
  state.agent.hq.png = null;
  logEvent('hq_choose', { id: state.agent.hq.id, from: 'place-tab' });
  paintBackgroundOptions();
  refreshAgentViews();
  scheduleSave();
}

/* ---------------------------------------------------------------------------
   The v1 Boost's entry point lived here. v2 V3 replaced it with the three-step
   Power-up in section 26, which is where enterPowerup() and wirePowerup() now
   are. This section keeps what that screen still uses: copyCoverToPowerup(),
   the aura swatches and the place picker.
   ------------------------------------------------------------------------ */
function watchPowerupViews() {
  watchAgentView($('#m2-cover'));
  watchAgentView($('#power-stage'));
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


/* ---------------------------------------------------------------------------
   DRAWING THE SCREEN
   One function paints the whole mission from the agent's data, so there is
   never a half-updated screen to reason about.
   ------------------------------------------------------------------------ */
function renderVoice() {
  if (!state.agent) return;
  const voice = state.agent.voice;
  const hasClip = Boolean(voice.audioId && voiceClip);

  // Steps 2 and 3 only exist once something has been recorded.
  $('#m4-after').hidden = !hasClip;

  const recording = recordingSlot === 'main';
  $('#m4-record-icon').textContent = recording ? '⏹️' : '🎤';
  $('#m4-record').classList.toggle('is-recording', recording);
  $('#m4-record').setAttribute('aria-label',
    recording ? 'Stop recording' : 'Record your voice password');

  $('#m4-hint').textContent =
    recording ? 'Listening… tap to stop'
              : hasClip ? 'Your password is saved'
                        : 'Say your secret password';

  // Keep the main button out of the way once there is a recording: the child
  // should reach for Play and the voices, not record over it by accident.
  $('#m4-record').classList.toggle('is-small', hasClip && !recording);

  paintFilterButtons();
}

function setRing(fraction) {
  // dashoffset counts DOWN from the full length as the ring fills.
  $('#m4-ring').style.strokeDashoffset = String(RING_LENGTH * (1 - fraction));
}

/* The six voices. Tapping one plays the recording through it and chooses it,
   which is what spec §7 means by "Tap to choose". */
function paintFilterButtons() {
  const row = $('#m4-filters');
  if (!row) return;
  row.innerHTML = '';

  Voice.FILTERS.forEach(filter => {
    const button = document.createElement('button');
    const chosen = state.agent.voice.filter === filter.id;
    button.className = 'btn tool filter-btn' + (chosen ? ' is-on' : '');
    button.innerHTML = '<span class="filter-icon">' + filter.icon + '</span>' +
                       '<span class="tool-word">' + filter.label + '</span>';
    button.setAttribute('aria-label', filter.label + ' voice');
    button.addEventListener('click', () => chooseFilter(filter.id));
    row.appendChild(button);
  });
}

/* ---------------------------------------------------------------------------
   RECORDING THE PASSWORD
   Spec §9: the audio engine may only be started inside a tap, which is exactly
   where this runs.
   ------------------------------------------------------------------------ */
async function tapRecord() {
  Voice.unlock();

  if (recordingSlot !== null) { Voice.stop(); return; }   // tapped again = stop

  if (!Voice.canRecord()) {
    showTrouble('This iPad cannot record. Tap Pass to carry on.');
    return;
  }

  const hadClip = Boolean(state.agent.voice.audioId);
  Voice.stopPlayback();
  hideTrouble();

  recordingSlot = 'main';
  setRing(0);
  renderVoice();
  logEvent(hadClip ? 'rerecord' : 'record_start', {});

  try {
    const result = await Voice.record({ onTick: setRing });
    await saveVoiceClip(result.blob, result.ms);
  } catch (err) {
    micFailed(err);
  }

  recordingSlot = null;
  setRing(0);
  renderVoice();
}

/* Keep the new recording and throw the old one away: spec §7 says only the
   last recording is kept. */
async function saveVoiceClip(blob, ms) {
  const voice = state.agent.voice;
  const oldId = voice.audioId;

  const id = uuid();
  await Storage.saveAudio(id, blob);
  voice.audioId = id;
  voiceClip = blob;

  // A recording just worked, so any earlier "the microphone said no" notice is
  // out of date and would only confuse the child.
  hideTrouble();

  if (oldId) {
    Voice.forget(oldId);
    await Storage.deleteAudio(oldId);
  }

  logEvent('record_stop', { ms: Math.round(ms), bytes: blob.size });
  scheduleSave();

  // Spec §7: play the raw recording FIRST, before any filter is offered. It
  // follows a tap, so Safari allows it to start on its own.
  renderVoice();
  await playVoice('normal', { raw: true });
}

/* Play the password. `raw` means this is the honest, unfiltered first listen,
   after which the voices are offered. */
async function playVoice(filterId, options) {
  const opts = options || {};
  const voice = state.agent.voice;
  if (!voice.audioId || !voiceClip) return;

  Voice.unlock();
  try {
    await Voice.play(voice.audioId, voiceClip, filterId, () => {
      $('#m4-play').classList.remove('is-playing');
    });
    $('#m4-play').classList.add('is-playing');
  } catch (err) {
    showTrouble('That recording could not be played back.');
    return;
  }

  if (opts.raw) {
    // Only now do the six voices appear.
    $('#m4-filters-block').hidden = false;
  }
  logEvent('filter_play', { filter: filterId, raw: Boolean(opts.raw) });
}

/* Tapping a voice plays it and keeps it (spec §7). */
async function chooseFilter(filterId) {
  const voice = state.agent.voice;
  const changed = voice.filter !== filterId;

  await playVoice(filterId, {});
  if (changed) {
    voice.filter = filterId;
    logEvent('filter_choose', { filter: filterId });
    scheduleSave();
  }
  paintFilterButtons();
}


/* ---------------------------------------------------------------------------
   WHEN THE MICROPHONE SAYS NO
   A child tapping "Don't allow", or an iPad with the microphone switched off
   in Settings, both land here. Nothing breaks: Pass is still there.
   ------------------------------------------------------------------------ */
function micFailed(err) {
  const name = err && err.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    showTrouble('The microphone is not allowed yet. An adult can turn it on in ' +
                'Settings, or tap Pass to carry on.');
  } else if (name === 'NotFoundError') {
    showTrouble('No microphone found on this iPad. Tap Pass to carry on.');
  } else {
    showTrouble('The recording did not work. Try again, or tap Pass.');
  }
  logEvent('record_fail', { reason: name || 'unknown' });
}

function showTrouble(message) {
  const el = $('#m4-trouble');
  el.textContent = message;
  el.hidden = false;
}

function hideTrouble() {
  $('#m4-trouble').hidden = true;
}


/* ---------------------------------------------------------------------------
   Wiring Mission 4 up. Called once, from wireUp().
   ------------------------------------------------------------------------ */
function wireVoice() {
  // Set the ring's dash pattern once: one full-length dash, so shortening the
  // offset reveals it a bit at a time.
  const ring = $('#m4-ring');
  ring.style.strokeDasharray = String(RING_LENGTH);
  setRing(0);

  $('#m4-record').addEventListener('click', tapRecord);
  $('#m4-play').addEventListener('click',
    () => playVoice(state.agent.voice.filter || 'normal', {}));
  $('#m4-rerecord').addEventListener('click', tapRecord);
}

/* Called by goToMission whenever Mission 4 opens. The recordings live in
   IndexedDB, so they have to be fetched back before anything can be played. */
async function enterVoice() {
  if (!state.agent) return;
  const voice = state.agent.voice;

  hideTrouble();
  voiceClip = null;
  if (!Array.isArray(voice.threeWays)) voice.threeWays = [null, null, null];

  if (voice.audioId) {
    const row = await Storage.loadAudio(voice.audioId);
    voiceClip = row ? row.blob : null;
    // A recording that has already been heard keeps its voices on show.
    $('#m4-filters-block').hidden = !voiceClip;
  } else {
    $('#m4-filters-block').hidden = true;
  }

  /* `voice.threeWays` stays in the model (v2 §6) and any clips already
     recorded are left untouched, but nothing loads or plays them now that
     "Say it 3 ways" is gone from the screen. */

  renderVoice();
}


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


/* ---------------------------------------------------------------------------
   THE SLOTS
   ------------------------------------------------------------------------ */
/* The v1 feeling-code screen is kept until V7 replaces it with mood codes
   (v2 §3), but the DATA is already v2: `moodCodes`, each with a `sign`.
   These three accessors are the whole adaptor, so the screen below can stay
   as it is and still write the right shape.

   "Which one is your agent wearing today?" has no v2 field - V7 replaces it
   with "who can read this sign?" - so the chosen index lives in `legacy`,
   which is exactly what legacy is for. */
function moodCodes() {
  if (!Array.isArray(state.agent.moodCodes)) state.agent.moodCodes = [];
  return state.agent.moodCodes;
}

function wornIndex() {
  const value = state.agent.legacy && state.agent.legacy.feelingWorn;
  return value === undefined ? null : value;
}

function setWornIndex(index) {
  if (!state.agent.legacy) state.agent.legacy = {};
  state.agent.legacy.feelingWorn = index;
}

// A mood code's drawing, wherever it is stored.
function signPng(code) {
  if (!code) return null;
  return (code.sign && code.sign.png) || code.png || null;
}

function renderMood() {
  if (!state.agent) return;
  const codes = moodCodes();

  const row = $('#m3-slots');
  row.innerHTML = '';

  for (let i = 0; i < 3; i++) {
    const code = codes[i];
    const slot = document.createElement('button');
    slot.className = 'm3-slot' + (code ? ' is-filled' : '');
    slot.setAttribute('aria-label', code ? 'Open code ' + (i + 1)
                                         : 'Make a new secret sign');

    if (code) {
      slot.innerHTML =
        '<img class="m3-slot-img" alt="" src="' + (signPng(code) || '') + '">' +
        '<span class="m3-slot-tags">' +
          (code.face ? '<span>' + code.face + '</span>' : '') +
          ((code.audioId || (code.sign && code.sign.audioId)) ? '<span>🎤</span>' : '') +
          '<span>' + moveIcon(code.move) + '</span>' +
        '</span>';
    } else {
      slot.innerHTML = '<span class="m3-slot-plus">✚</span><span>New sign</span>';
    }

    slot.addEventListener('click', () => openCoder(i));
    row.appendChild(slot);
  }

  // "Which one is your agent wearing today?" only makes sense once one exists.
  $('#m3-worn-block').hidden = codes.length === 0;
  renderWornRow();
}

function moveIcon(id) {
  const move = MOVES.find(m => m.id === id);
  return move ? move.icon : '🧘';
}

/* Spec §7: the child picks one to wear, or none. */
function renderWornRow() {
  const row = $('#m3-worn');
  if (!row) return;
  row.innerHTML = '';

  const codes = moodCodes();
  const worn = wornIndex();

  codes.forEach((code, i) => {
    const button = document.createElement('button');
    button.className = 'm3-worn-option' + (worn === i ? ' is-on' : '');
    button.innerHTML = '<img class="m3-worn-img" alt="" src="' + (signPng(code) || '') + '">';
    button.setAttribute('aria-label', 'Wear code ' + (i + 1));
    button.addEventListener('click', () => setWorn(i));
    row.appendChild(button);
  });

  // "None" is a real, equal choice, not a way of opting out.
  const none = document.createElement('button');
  none.className = 'm3-worn-option m3-worn-none' + (worn === null ? ' is-on' : '');
  none.textContent = 'None';
  none.setAttribute('aria-label', 'Wear none of them');
  none.addEventListener('click', () => setWorn(null));
  row.appendChild(none);
}

function setWorn(index) {
  setWornIndex(index);
  logEvent('feeling_worn', { index: index });
  renderWornRow();
  renderPreview();
  scheduleSave();
}


/* ---------------------------------------------------------------------------
   THE MAKER
   ------------------------------------------------------------------------ */
function openCoder(index) {
  const existing = moodCodes()[index];

  coder.index = index;
  coder.canvas = $('#m3-canvas');
  coder.undoStack = [];
  coder.colour = CODE_COLOURS[0];
  // Editing works on a copy, so backing out of a change leaves the saved one
  // alone until "Keep it" is pressed.
  coder.draft = existing
    ? Object.assign({}, existing)
    : { png: null, audioId: null, face: null, move: 'still' };

  $('#m3-slots-view').hidden = true;
  $('#m3-maker').hidden = false;
  $('#m3-delete').hidden = !existing;

  // The faces start hidden every time: the blank tile comes first (spec §7).
  $('#m3-faces').hidden = true;
  $('#m3-ideas').hidden = false;

  clearCodeCanvas();
  if (existing && existing.png) drawPngToCanvas(existing.png);

  paintCodePalette();
  paintFaces();
  paintMoves();
  paintFaceBadge();
  previewMove(coder.draft.move);
}

function closeCoder() {
  coder.index = null;
  coder.draft = null;
  $('#m3-maker').hidden = true;
  $('#m3-slots-view').hidden = false;
  previewMove(null);            // stop the preview moving once we are out
  renderMood();
}

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

function codeUp() {
  if (!coder.drawing) return;
  coder.drawing = false;
  if (coder.points.length > 0 && coder.onStroke) coder.onStroke();
  if (coder.points.length > 0) {
    // The brush is shared between the feeling code and the rule sheet, so the
    // event has to say which canvas it was. Without this the research log
    // cannot tell a feeling code apart from a drawn rule.
    logEvent('draw_stroke', {
      where: coder.canvas.id === 'm3-canvas' ? 'feeling_code' : 'rule',
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
   "NEED IDEAS?" - the six faces, offered only once asked for (spec §7)
   ------------------------------------------------------------------------ */
function openIdeas() {
  $('#m3-faces').hidden = false;
  $('#m3-ideas').hidden = true;
  logEvent('need_ideas_open', {});
}

function paintFaces() {
  const box = $('#m3-faces');
  box.innerHTML = '';
  FEELING_FACES.forEach(face => {
    const button = document.createElement('button');
    const chosen = coder.draft && coder.draft.face === face;
    button.className = 'btn tool face-btn' + (chosen ? ' is-on' : '');
    button.innerHTML = '<span class="filter-icon">' + face + '</span>';
    button.setAttribute('aria-label', 'Feeling ' + face);
    button.addEventListener('click', () => {
      // Tapping the chosen one again takes it off: a sign does not have to
      // have a face attached to it.
      coder.draft.face = chosen ? null : face;
      logEvent('feeling_face_choose', { face: coder.draft.face });
      paintFaces();
      paintFaceBadge();
    });
    box.appendChild(button);
  });
}

function paintFaceBadge() {
  const badge = $('#m3-face-badge');
  const face = coder.draft && coder.draft.face;
  badge.hidden = !face;
  badge.textContent = face || '';
}


/* ---------------------------------------------------------------------------
   MOVEMENT (spec §7 and §5a)
   The child picks; the app never assigns a movement to a feeling.
   Previewed on the agent THUMBNAIL, because §5a says the agent never moves
   while it is the thing being edited.
   ------------------------------------------------------------------------ */
function paintMoves() {
  const row = $('#m3-moves');
  row.innerHTML = '';
  MOVES.forEach(move => {
    const button = document.createElement('button');
    const chosen = coder.draft && coder.draft.move === move.id;
    button.className = 'btn tool move-btn' + (chosen ? ' is-on' : '');
    button.innerHTML = '<span class="filter-icon">' + move.icon + '</span>' +
                       '<span class="tool-word">' + move.label + '</span>';
    button.setAttribute('aria-label', move.label);
    button.addEventListener('click', () => {
      coder.draft.move = move.id;
      logEvent('feeling_move_choose', { move: move.id });
      paintMoves();
      previewMove(move.id);
    });
    row.appendChild(button);
  });
}

/* Put the chosen movement on the preview thumbnail. Passing null takes it off
   again - which matters, because a movement left running after the child has
   moved on would break §5a's "calm in between". */
function previewMove(moveId) {
  const view = $('#preview-art');
  if (!view) return;
  MOVES.forEach(m => view.classList.remove('move-' + m.id));
  if (moveId) view.classList.add('move-' + moveId);
}


/* ---------------------------------------------------------------------------
   RECORDING A NAME FOR THE SIGN (optional, spec §7: no typing)
   ------------------------------------------------------------------------ */
async function recordCodeName() {
  Voice.unlock();
  if (Voice.isRecording()) { Voice.stop(); return; }

  if (!Voice.canRecord()) {
    toast('This iPad cannot record');
    return;
  }

  const button = $('#m3-mic');
  button.classList.add('is-recording');
  logEvent('record_start', { slot: 'feeling_name' });

  try {
    const result = await Voice.record({ maxMs: 5000, onTick: () => {} });
    const oldId = coder.draft.audioId || (coder.draft.sign && coder.draft.sign.audioId);

    const id = uuid();
    await Storage.saveAudio(id, result.blob);
    coder.draft.audioId = id;
    if (oldId) { Voice.forget(oldId); await Storage.deleteAudio(oldId); }

    logEvent('record_stop', { slot: 'feeling_name', ms: Math.round(result.ms) });
    toast('Name saved 🎤');
  } catch (err) {
    toast('The microphone did not work');
    logEvent('record_fail', { slot: 'feeling_name' });
  }

  button.classList.remove('is-recording');
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

async function keepCode() {
  if (!canvasHasInk()) {
    toast('Draw your sign first');
    return;
  }

  const index = coder.index;
  const codes = moodCodes();
  const isNew = !codes[index];

  /* Written in the v2 shape (v2 §6.1): the drawing is the code's `sign`.
     The v1 screen's face and movement are kept, and V7 fills in the rest -
     the moment, the readers - when it replaces this screen. */
  const png = coder.canvas.toDataURL('image/png');
  coder.draft.sign = { png: png, audioId: coder.draft.audioId ||
                       (coder.draft.sign && coder.draft.sign.audioId) || null };
  coder.draft.png = png;              // kept so the open editor still reads it
  if (coder.draft.situation === undefined) coder.draft.situation = null;
  if (!Array.isArray(coder.draft.readers)) coder.draft.readers = [];

  // Codes fill the slots in order, so a code made in slot 3 while 1 and 2 are
  // empty still lands at the front of the list.
  if (isNew) codes.push(coder.draft);
  else codes[index] = coder.draft;

  logEvent(isNew ? 'feeling_code_add' : 'feeling_code_edit', {
    face: coder.draft.face,
    move: coder.draft.move,
    named: Boolean(coder.draft.audioId)
  });

  // The first code made is worn by default - the child can change it below.
  if (isNew && wornIndex() === null) setWornIndex(codes.length - 1);

  closeCoder();
  scheduleSave();
}

async function removeCode() {
  const index = coder.index;
  const codes = moodCodes();
  const code = codes[index];
  if (!code) { closeCoder(); return; }

  const audioId = code.audioId || (code.sign && code.sign.audioId);
  if (audioId) { Voice.forget(audioId); await Storage.deleteAudio(audioId); }
  codes.splice(index, 1);

  // The worn code may have been the one removed, or may have shuffled down.
  if (wornIndex() === index) setWornIndex(null);
  else if (wornIndex() > index) setWornIndex(wornIndex() - 1);

  logEvent('feeling_code_remove', {});
  closeCoder();
  scheduleSave();
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

function wireMood() {
  attachBrush($('#m3-canvas'));

  $('#m3-undo').addEventListener('click', undoCode);
  $('#m3-clear').addEventListener('click', clearCode);
  $('#m3-mic').addEventListener('click', recordCodeName);
  $('#m3-ideas').addEventListener('click', openIdeas);
  $('#m3-done').addEventListener('click', keepCode);
  $('#m3-delete').addEventListener('click', removeCode);
}

// Called by goToMission whenever Mission 3 opens.
function enterMood() {
  if (!state.agent) return;
  // Always arrive on the slots, never mid-edit from last time.
  $('#m3-maker').hidden = true;
  $('#m3-slots-view').hidden = false;
  coder.index = null;
  coder.draft = null;
  previewMove(null);
  renderMood();
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


/* ---------------------------------------------------------------------------
   THE CARDS
   The front of each card shows small icons of what is going there (spec §7),
   so a child can see at a glance what they have agreed to without opening it.
   ------------------------------------------------------------------------ */
/* v2 §5.10 replaces this screen with Badge & poster, which is V8's job. Until
   then the v1 places screen has to keep working: migrateAgent() moved `places`
   into `legacy`, so read and write it there. Reaching for state.agent.places
   threw the moment any v2 agent opened this mission. */
function placesStore() {
  if (!state.agent.legacy) state.agent.legacy = {};
  if (!state.agent.legacy.places) state.agent.legacy.places = {};
  return state.agent.legacy.places;
}

function renderBadge() {
  if (!state.agent) return;
  const row = $('#m5-cards');
  row.innerHTML = '';

  PLACES.forEach(place => {
    const chosen = placesStore()[place.id] || {};
    const on = PARTS.filter(part => chosen[part.id]);

    const card = document.createElement('button');
    card.className = 'place-card' + (on.length ? ' has-parts' : '');
    card.setAttribute('aria-label', place.name + ', ' +
      (on.length ? on.map(p => p.label).join(', ') : 'nothing yet'));

    card.innerHTML =
      '<span class="place-icon">' + place.icon + '</span>' +
      '<span class="place-name">' + place.name + '</span>' +
      '<span class="place-tags">' +
        (on.length
          ? on.map(p => '<span>' + p.icon + '</span>').join('')
          : '<span class="place-empty">nothing yet</span>') +
      '</span>';

    card.addEventListener('click', () => openPlaceCard(place.id));
    row.appendChild(card);
  });
}


/* ---------------------------------------------------------------------------
   FLIPPING A CARD OVER
   The card is rendered front-side-up, then flipped on the next frame, so the
   child sees it turn over rather than simply appearing back-side-up.
   ------------------------------------------------------------------------ */
function openPlaceCard(placeId) {
  const place = PLACES.find(p => p.id === placeId);
  if (!place) return;
  openPlace = placeId;

  $('#m5-front-icon').textContent = place.icon;
  $('#m5-front-name').textContent = place.name;
  $('#m5-back-title').textContent = 'What goes to ' + place.name + '?';

  $('#m5-cards-view').hidden = true;
  $('#m5-detail').hidden = false;

  const flip = $('#m5-flip');
  flip.classList.remove('is-flipped');
  // requestAnimationFrame waits for the browser to have drawn the front face.
  // Without it the class is added in the same frame and there is nothing to
  // animate from, so the card appears already turned over.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => flip.classList.add('is-flipped'));
  });

  paintPartToggles();
  logEvent('place_open', { place: placeId });
}

function closePlaceCard() {
  openPlace = null;
  $('#m5-detail').hidden = true;
  $('#m5-cards-view').hidden = false;
  renderBadge();
}

/* The five big on/off switches on the back of a card. */
function paintPartToggles() {
  const box = $('#m5-parts');
  box.innerHTML = '';
  const chosen = placesStore()[openPlace] || {};

  PARTS.forEach(part => {
    const on = Boolean(chosen[part.id]);

    const row = document.createElement('button');
    row.className = 'part-toggle' + (on ? ' is-on' : '');
    // role=switch tells VoiceOver this is an on/off control, not a link.
    row.setAttribute('role', 'switch');
    row.setAttribute('aria-checked', on ? 'true' : 'false');
    row.setAttribute('aria-label', part.label);

    row.innerHTML =
      '<span class="part-icon">' + part.icon + '</span>' +
      '<span class="part-label">' + part.label + '</span>' +
      '<span class="part-switch"><span class="part-knob"></span></span>' +
      '<span class="part-word">' + (on ? 'Yes' : 'No') + '</span>';

    row.addEventListener('click', () => togglePart(part.id));
    box.appendChild(row);
  });
}

function togglePart(partId) {
  const places = placesStore();
  if (!places[openPlace]) places[openPlace] = {};
  const now = !places[openPlace][partId];
  places[openPlace][partId] = now;

  logEvent('place_toggle', { place: openPlace, part: partId, on: now });
  paintPartToggles();
  scheduleSave();
}


/* ---------------------------------------------------------------------------
   Wiring Mission 5 up. Called once, from wireUp().
   ------------------------------------------------------------------------ */
function wireBadge() {
  $('#m5-done').addEventListener('click', closePlaceCard);
}

function enterBadge() {
  if (!state.agent) return;
  // Always arrive on the cards, never mid-flip from last time.
  $('#m5-detail').hidden = true;
  $('#m5-cards-view').hidden = false;
  openPlace = null;
  renderBadge();
}


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
const RULE_CARDS = [
  { id: 'dont',  icon: '✋', title: "Don't…" },
  { id: 'can',   icon: '👍', title: 'You can…' },
  { id: 'upset', icon: '💛', title: "When I'm upset I need…" }
];

// Spec §7 lists exactly these fourteen.
const RULE_ICONS = ['🤫','🎧','🚶','🤗','🙅','💬','✋','🧃','⏳','👥','🧑‍🏫','🛋️','🎮','✏️'];

let openRule = null;        // which rule card is open


function renderRules() {
  if (!state.agent) return;
  const row = $('#m6-cards');
  row.innerHTML = '';

  RULE_CARDS.forEach(rule => {
    const items = state.agent.rules[rule.id] || [];

    const card = document.createElement('button');
    card.className = 'rule-card' + (items.length ? ' has-items' : '');
    card.setAttribute('aria-label', rule.title + ', ' +
      (items.length ? items.length + ' chosen' : 'nothing yet'));

    card.innerHTML =
      '<span class="place-icon">' + rule.icon + '</span>' +
      '<span class="rule-title">' + rule.title + '</span>' +
      '<span class="place-tags">' +
        (items.length
          ? items.map(ruleChipHtml).join('')
          : '<span class="place-empty">nothing yet</span>') +
      '</span>';

    card.addEventListener('click', () => openRuleCard(rule.id));
    row.appendChild(card);
  });
}

/* One chosen rule, shown small: an icon, a drawing, or a recording. */
function ruleChipHtml(item) {
  if (item.icon) return '<span>' + item.icon + '</span>';
  if (item.png)  return '<img class="rule-mini" alt="" src="' + item.png + '">';
  return '<span>🎤</span>';
}


function openRuleCard(ruleId) {
  const rule = RULE_CARDS.find(r => r.id === ruleId);
  if (!rule) return;
  openRule = ruleId;

  $('#m6-title').textContent = rule.icon + ' ' + rule.title;
  $('#m6-cards-view').hidden = true;
  $('#m6-detail').hidden = false;

  paintRuleIcons();
  paintRuleChosen();
  logEvent('rule_open', { rule: ruleId });
}

function closeRuleCard() {
  openRule = null;
  $('#m6-detail').hidden = true;
  $('#m6-cards-view').hidden = false;
  renderRules();
}

/* The fourteen icons. Tapping one adds it; tapping it again takes it off. */
function paintRuleIcons() {
  const box = $('#m6-icons');
  box.innerHTML = '';
  const items = state.agent.rules[openRule] || [];

  RULE_ICONS.forEach(icon => {
    const on = items.some(i => i.icon === icon);
    const button = document.createElement('button');
    button.className = 'btn tool rule-icon-btn' + (on ? ' is-on' : '');
    button.innerHTML = '<span class="filter-icon">' + icon + '</span>';
    button.setAttribute('aria-label', 'Rule ' + icon + (on ? ', chosen' : ''));
    button.addEventListener('click', () => toggleRuleIcon(icon));
    box.appendChild(button);
  });
}

function toggleRuleIcon(icon) {
  const items = state.agent.rules[openRule];
  const at = items.findIndex(i => i.icon === icon);

  if (at === -1) items.push({ icon: icon, png: null, audioId: null });
  else items.splice(at, 1);

  logEvent('rule_set', { rule: openRule, icon: icon, on: at === -1 });
  paintRuleIcons();
  paintRuleChosen();
  scheduleSave();
}

/* Everything chosen for this rule, each with a way to take it off again. */
function paintRuleChosen() {
  const box = $('#m6-chosen');
  box.innerHTML = '';
  const items = state.agent.rules[openRule] || [];

  if (items.length === 0) {
    box.innerHTML = '<span class="place-empty">Tap an icon, draw one, or say it</span>';
    return;
  }

  items.forEach((item, index) => {
    const chip = document.createElement('div');
    chip.className = 'rule-chosen-chip';
    chip.innerHTML = ruleChipHtml(item);

    // A recording can be played back by tapping it.
    if (item.audioId) {
      chip.classList.add('is-audio');
      chip.addEventListener('click', () => playRuleClip(item.audioId));
    }

    const remove = document.createElement('button');
    remove.className = 'rule-chip-x';
    remove.textContent = '✕';
    remove.setAttribute('aria-label', 'Remove this');
    remove.addEventListener('click', (event) => {
      event.stopPropagation();
      removeRuleItem(index);
    });
    chip.appendChild(remove);

    box.appendChild(chip);
  });
}

async function removeRuleItem(index) {
  const items = state.agent.rules[openRule];
  const item = items[index];
  if (!item) return;

  if (item.audioId) { Voice.forget(item.audioId); await Storage.deleteAudio(item.audioId); }
  items.splice(index, 1);

  logEvent('rule_remove', { rule: openRule });
  paintRuleIcons();
  paintRuleChosen();
  scheduleSave();
}

async function playRuleClip(audioId) {
  Voice.unlock();
  const row = await Storage.loadAudio(audioId);
  if (!row) return;
  try { await Voice.play(audioId, row.blob, 'normal'); } catch (err) { /* ignore */ }
}


/* ---------------------------------------------------------------------------
   SAYING A RULE OUT LOUD
   ------------------------------------------------------------------------ */
async function recordRule() {
  Voice.unlock();
  if (Voice.isRecording()) { Voice.stop(); return; }
  if (!Voice.canRecord()) { toast('This iPad cannot record'); return; }

  const button = $('#m6-record');
  button.classList.add('is-recording');
  logEvent('record_start', { slot: 'rule_' + openRule });

  try {
    const result = await Voice.record({ maxMs: 8000, onTick: () => {} });
    const id = uuid();
    await Storage.saveAudio(id, result.blob);
    state.agent.rules[openRule].push({ icon: null, png: null, audioId: id });

    logEvent('rule_set', { rule: openRule, kind: 'voice' });
    paintRuleChosen();
    scheduleSave();
  } catch (err) {
    toast('The microphone did not work');
    logEvent('record_fail', { slot: 'rule_' + openRule });
  }

  button.classList.remove('is-recording');
}


/* ---------------------------------------------------------------------------
   THE SHARED DRAWING SHEET
   Mission 6 opens this to draw a rule. It borrows the same brush Mission 3
   uses by pointing `coder.canvas` at its canvas (see attachBrush).
   `onKeep` is called with the PNG when the child keeps the drawing.
   ------------------------------------------------------------------------ */
let drawSheetKeep = null;

function openDrawSheet(title, onKeep) {
  drawSheetKeep = onKeep;
  coder.canvas = $('#draw-canvas');
  coder.undoStack = [];
  coder.colour = CODE_COLOURS[0];

  $('#draw-title').textContent = title;
  clearCodeCanvas();
  paintCodePalette('#draw-palette');
  $('#draw-overlay').hidden = false;
}

function closeDrawSheet() {
  $('#draw-overlay').hidden = true;
  drawSheetKeep = null;
  // Wipe it on the way out as well as on the way in. A child's drawing has no
  // business sitting in a hidden canvas once they have finished with it.
  clearCodeCanvas();
  // Hand the brush back to Mission 3's canvas, so a later feeling code does
  // not quietly paint onto the sheet's canvas instead.
  coder.canvas = $('#m3-canvas');
  coder.undoStack = [];
}

function keepDrawSheet() {
  if (!canvasHasInk()) { toast('Draw something first'); return; }
  const png = coder.canvas.toDataURL('image/png');
  const keep = drawSheetKeep;
  closeDrawSheet();
  if (keep) keep(png);
}


/* ---------------------------------------------------------------------------
   Wiring Mission 6 up. Called once, from wireUp().
   ------------------------------------------------------------------------ */
function wireRules() {
  attachBrush($('#draw-canvas'));

  $('#m6-done').addEventListener('click', closeRuleCard);
  $('#m6-record').addEventListener('click', recordRule);
  $('#m6-draw').addEventListener('click', () => {
    openDrawSheet('Draw your rule', (png) => {
      state.agent.rules[openRule].push({ icon: null, png: png, audioId: null });
      logEvent('rule_set', { rule: openRule, kind: 'draw' });
      paintRuleChosen();
      scheduleSave();
    });
  });

  $('#draw-undo').addEventListener('click', undoCode);
  $('#draw-clear').addEventListener('click', clearCode);
  $('#draw-cancel').addEventListener('click', closeDrawSheet);
  $('#draw-save').addEventListener('click', keepDrawSheet);
}

function enterRules() {
  if (!state.agent) return;
  $('#m6-detail').hidden = true;
  $('#m6-cards-view').hidden = false;
  $('#draw-overlay').hidden = true;
  openRule = null;
  renderRules();
}


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
const cardAssets = { feeling: null, rules: {}, voiceBlob: null,
                     coverDrawing: null, boostDrawing: null,
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


/* ---------------------------------------------------------------------------
   THE CARD ON SCREEN
   ------------------------------------------------------------------------ */
async function renderReveal() {
  if (!state.agent) return;
  const agent = state.agent;

  $('#reveal-name').textContent  = agent.codename || '';
  $('#reveal-emoji').textContent = agentEmblem(agent);

  // The Cover: the agent in its HQ.
  renderAgentView($('#reveal-cover'), agent.cover || {}, false, null, agent);

  /* The Power: the same child's power-up look, but standing in the MOMENT the
     power is used rather than in the HQ again. Two identical pictures side by
     side told nobody anything (7 October iPad test). */
  const power = (agent.powerup && agent.powerup.power) || {};
  const look  = (agent.powerup && agent.powerup.look) || {};
  const boostEl = $('#reveal-boost');
  const moment = ((agent.powerup && agent.powerup.when) || [])[0] ||
                 (((agent.powerup && agent.powerup.whenOwn) || [])[0] || {}).png;
  if (moment) boostEl.dataset.scene = 'moment';
  else delete boostEl.dataset.scene;
  renderAgentView(boostEl, look, false, null, agent);
  showPowerMoment(boostEl, agent);

  const effect = POWER_EFFECTS.find(e => e.id === power.effect);
  const whenId = ((agent.powerup && agent.powerup.when) || [])[0];
  const whenLabel = whenId && Assets.item(whenId) ? Assets.item(whenId).label : null;
  $('#reveal-power-note').innerHTML =
    (effect ? '<span class="dossier-note-icon">' + effect.icon + '</span>' + effect.label
            : '') +
    (whenLabel ? '<span class="dossier-note-when">' + whenLabel + '</span>' : '');

  /* The mood code, and ONLY if there is one. Mood is a session-3 mission, so
     through the whole of session 2 this was an empty box labelled FEELING
     CODE, which reads as something broken rather than something not reached
     yet. */
  const worn = (agent.moodCodes || [])[wornIndex()];
  $('#reveal-feeling-cell').hidden = !worn;
  if (worn) {
    $('#reveal-feeling').innerHTML =
      '<img alt="" src="' + (signPng(worn) || '') + '">' +
      (worn.face ? '<span class="dossier-face">' + worn.face + '</span>' : '');
  }

  // The voice password, in whichever voice was chosen.
  const filter = Voice.FILTERS.find(f => f.id === (agent.voice.filter || 'normal'));
  $('#reveal-voice-name').textContent = agent.voice.audioId
    ? (filter ? filter.label : 'Normal')
    : 'none';
  $('#reveal-play').disabled = !agent.voice.audioId;

  renderRevealRules();

  renderRevealButtons();          // the Seal button says Seal or Change seal

  // Fetch everything the Save button will need, now rather than on the tap.
  await preloadCardAssets();
}

function renderRevealRules() {
  const box = $('#reveal-rules');
  box.innerHTML = '';

  /* Rules are a session-4 mission. Through sessions 2 and 3 this was three
     rows each saying "none" - which reads as a card with things missing from
     it rather than a card for work not yet done. Same reasoning as the mood
     code cell above. */
  const anyRules = RULE_CARDS.some(r => (state.agent.rules[r.id] || []).length);
  box.hidden = !anyRules;
  if (!anyRules) return;

  RULE_CARDS.forEach(rule => {
    const items = state.agent.rules[rule.id] || [];
    const row = document.createElement('div');
    row.className = 'dossier-rule-row';
    row.innerHTML =
      '<span class="dossier-rule-title">' + rule.icon + ' ' + rule.title + '</span>' +
      '<span class="dossier-rule-items">' +
        (items.length
          ? items.map(ruleChipHtml).join('')
          : '<span class="dossier-none">none</span>') +
      '</span>';
    box.appendChild(row);
  });
}

async function preloadCardAssets() {
  const agent = state.agent;

  const worn = (agent.moodCodes || [])[wornIndex()];
  cardAssets.feeling = await loadImage(signPng(worn));

  // Milestone 7: the Draw door's picture has to be loaded too, or a child who
  // used Draw would get a blank agent on the saved card.
  cardAssets.coverDrawing = await loadImage((agent.cover || {}).drawingPng);
  cardAssets.boostDrawing = await loadImage(((agent.powerup && agent.powerup.look) || {}).drawingPng);

  // v2 V2: the Parts door's layer, rasterised from the same SVG the screen
  // draws, so the card cannot disagree with what the child made.
  const look = (agent.powerup && agent.powerup.look) || {};
  cardAssets.coverShapes = await loadImage(shapesToSvgUrl((agent.cover || {}).shapes));
  // v2 §5.5: the HQ is the agent's background on the card as well.
  /* The HQ behind the agent on the saved card: the photograph if one was
     chosen, or the place the child drew (v2 §5.5). loadImage() takes any URL,
     and a PNG data URL is one. */
  cardAssets.hq = null;
  if (agent.hq && agent.hq.id)       cardAssets.hq = await Assets.image(agent.hq.id);
  else if (agent.hq && agent.hq.png) cardAssets.hq = await loadImage(agent.hq.png);

  /* The moment the power is used, for the card's POWER panel: the first
     situation the child chose, or one they drew themselves. */
  cardAssets.moment = null;
  const when = (agent.powerup && agent.powerup.when) || [];
  const ownWhen = (agent.powerup && agent.powerup.whenOwn) || [];
  if (when.length)                     cardAssets.moment = await Assets.image(when[0]);
  else if (ownWhen[0] && ownWhen[0].png) cardAssets.moment = await loadImage(ownWhen[0].png);
  cardAssets.boostShapes = await loadImage(shapesToSvgUrl(look.shapes));

  // v2 §5.3.2: every picture sticker the child has used.
  cardAssets.stickers = {};
  const used = [].concat(agent.cover.stickers || [], look.stickers || []);
  for (const sticker of used) {
    if (!sticker.asset || cardAssets.stickers[sticker.asset]) continue;
    cardAssets.stickers[sticker.asset] = await Assets.image(sticker.asset);
  }

  cardAssets.rules = {};
  for (const rule of RULE_CARDS) {
    const items = agent.rules[rule.id] || [];
    cardAssets.rules[rule.id] = [];
    for (const item of items) {
      cardAssets.rules[rule.id].push(item.png ? await loadImage(item.png) : null);
    }
  }

  // The voice password, ready for the ▶️ button.
  cardAssets.voiceBlob = null;
  if (agent.voice.audioId) {
    const row = await Storage.loadAudio(agent.voice.audioId);
    cardAssets.voiceBlob = row ? row.blob : null;
  }
}

/* Put the chosen situation behind the agent on the card's POWER cell. The
   photograph is the first moment the child picked; a moment they drew
   themselves is a PNG and goes in the same place. */
function showPowerMoment(el, agent) {
  const when = (agent.powerup && agent.powerup.when) || [];
  const own  = (agent.powerup && agent.powerup.whenOwn) || [];

  if (when.length) {
    Assets.image(when[0]).then(img => {
      if (!img) return;
      el.style.setProperty('--hq-image', 'url("' + img.src + '")');
      el.classList.add('has-hq');
    });
    return;
  }
  if (own.length && own[0].png) {
    el.style.setProperty('--hq-image', 'url("' + own[0].png + '")');
    el.classList.add('has-hq');
  }
}

/* Tap the POWER picture and the power goes off, the same way tapping the
   voice password plays the voice. On the card the power was the one thing a
   child could see but not set off (7 October iPad test). */
function fireRevealPower() {
  const effect = state.agent && state.agent.powerup &&
                 state.agent.powerup.power && state.agent.powerup.power.effect;
  if (!effect) return;
  Voice.unlock();

  const stage = $('#reveal-boost');
  POWER_EFFECTS.forEach(e => stage.classList.remove(e.id));
  void stage.offsetWidth;                    // restart the animation
  if (fullMotion()) stage.classList.add(effect);
  playSfx('sfx-' + effect.replace(/^fx-/, ''));
  logEvent('power_fire', { effect: effect, where: 'card' });
  setTimeout(() => stage.classList.remove(effect), 1500);
}

async function playRevealVoice() {
  const agent = state.agent;
  if (!agent.voice.audioId || !cardAssets.voiceBlob) return;
  Voice.unlock();
  logEvent('reveal_play', { filter: agent.voice.filter || 'normal' });
  /* The bars live on the voice button itself. This used to bounce
     #reveal-boost, so pressing ▶️ appeared to do something to the POWER
     card - which is what a tester reported as "it activates the Boost". */
  const bars = $('#reveal-play');
  try {
    bars.classList.add('is-playing');
    await Voice.play(agent.voice.audioId, cardAssets.voiceBlob,
                     agent.voice.filter || 'normal',
                     () => bars.classList.remove('is-playing'));
  } catch (err) {
    bars.classList.remove('is-playing');
    toast('That recording would not play');
  }
}


/* ---------------------------------------------------------------------------
   DRAWING THE CARD ONTO A CANVAS
   Plain 2D canvas calls. Emoji are drawn as text, which is why no picture
   files are needed for any of them.
   ------------------------------------------------------------------------ */

const CARD_W = 1000;
const CARD_H = 1250;

function drawCardToCanvas(canvas) {
  const agent = state.agent;
  const ctx = canvas.getContext('2d');
  canvas.width = CARD_W;
  canvas.height = CARD_H;

  // --- the paper ---
  ctx.fillStyle = '#f4ead6';
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // --- CLASSIFIED stamp, top right, tilted ---
  ctx.save();
  ctx.translate(CARD_W - 190, 96);
  ctx.rotate(-8 * Math.PI / 180);
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = '#ff5f56';
  ctx.lineWidth = 6;
  ctx.strokeRect(-110, -34, 220, 68);
  ctx.fillStyle = '#ff5f56';
  ctx.font = '700 34px ' + CARD_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CLASSIFIED', 0, 2);
  ctx.restore();

  // --- codename ---
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  label(ctx, 'CODENAME', 60, 90);
  ctx.fillStyle = '#1a1203';
  ctx.font = '800 64px ' + CARD_FONT;
  ctx.fillText(agent.codename || '', 60, 152);
  ctx.font = '60px ' + CARD_FONT;
  ctx.fillText(agentEmblem(agent), 60, 230);

  // --- the two agents ---
  label(ctx, 'COVER', 60, 290);
  drawAgentToCanvas(ctx, agent.cover || {}, 60, 310, 380, false);

  /* The POWER, matching the screen: the power-up look standing in the moment
     it is used, with the effect named under it. cardAssets.moment is that
     situation's photograph, loaded by preloadCardAssets(). */
  label(ctx, 'POWER', 560, 290);
  drawAgentToCanvas(ctx, (agent.powerup && agent.powerup.look) || {},
                    560, 310, 380, true, cardAssets.moment);

  const power = (agent.powerup && agent.powerup.power) || {};
  const effect = POWER_EFFECTS.find(e => e.id === power.effect);
  const whenId = ((agent.powerup && agent.powerup.when) || [])[0];
  const whenEntry = whenId ? Assets.item(whenId) : null;
  if (effect || whenEntry) {
    ctx.fillStyle = '#1a1203';
    ctx.font = '700 28px ' + CARD_FONT;
    ctx.textAlign = 'center';
    const line = [effect ? effect.icon + ' ' + effect.label : '',
                  whenEntry ? whenEntry.label : ''].filter(Boolean).join('   ');
    ctx.fillText(line, 750, 722);
    ctx.textAlign = 'left';
  }

  /* The mood code, only when there is one. In session 2 there never is, and
     an empty box labelled FEELING CODE reads as a fault. */
  const worn = (agent.moodCodes || [])[wornIndex()];
  if (worn) {
    label(ctx, 'FEELING CODE', 60, 760);
    roundedBox(ctx, 60, 780, 380, 300, '#16263f');   // dark, so white ink reads
    if (cardAssets.feeling) {
      ctx.drawImage(cardAssets.feeling, 100, 790, 280, 280);
      if (worn.face) {
        ctx.font = '54px ' + CARD_FONT;
        ctx.textAlign = 'right';
        ctx.fillText(worn.face, 426, 836);
        ctx.textAlign = 'left';
      }
    }
  }

  /* The voice password slides across to the empty half when there is no mood
     code, rather than leaving a gap where one used to be. */
  const voiceX = worn ? 560 : 310;
  label(ctx, 'VOICE PASSWORD', voiceX, 760);
  roundedBox(ctx, voiceX, 780, 380, 300);
  if (agent.voice.audioId) {
    const filter = Voice.FILTERS.find(f => f.id === (agent.voice.filter || 'normal'));
    ctx.font = '96px ' + CARD_FONT;
    ctx.textAlign = 'center';
    ctx.fillText(filter ? filter.icon : '🙂', voiceX + 190, 920);
    ctx.fillStyle = '#1a1203';
    ctx.font = '700 34px ' + CARD_FONT;
    ctx.fillText(filter ? filter.label : 'Normal', voiceX + 190, 1000);
    ctx.textAlign = 'left';
  } else {
    none(ctx, voiceX + 190, 940);
  }

  // --- the rules, only when there are some (see renderRevealRules) ---
  const anyRules = RULE_CARDS.some(r => (agent.rules[r.id] || []).length);
  if (!anyRules) return;
  label(ctx, 'AGENT RULES', 60, 1130);
  let y = 1160;
  RULE_CARDS.forEach(rule => {
    const items = agent.rules[rule.id] || [];
    ctx.fillStyle = '#1a1203';
    ctx.font = '600 24px ' + CARD_FONT;
    ctx.textAlign = 'left';
    ctx.fillText(rule.icon + ' ' + rule.title, 60, y);

    let x = 470;
    items.forEach((item, index) => {
      if (item.icon) {
        ctx.font = '30px ' + CARD_FONT;
        ctx.fillText(item.icon, x, y);
      } else if (item.png) {
        const img = (cardAssets.rules[rule.id] || [])[index];
        if (img) {
          ctx.fillStyle = '#16263f';
          ctx.fillRect(x, y - 26, 30, 30);
          ctx.drawImage(img, x, y - 26, 30, 30);
        }
      } else {
        ctx.font = '30px ' + CARD_FONT;
        ctx.fillText('🎤', x, y);
      }
      x += 40;
    });
    if (items.length === 0) {
      ctx.fillStyle = '#6a5c3c';
      ctx.font = 'italic 22px ' + CARD_FONT;
      ctx.fillText('none', 470, y);
    }
    y += 34;
  });
}

// The system font stack, as one string canvas can use.
const CARD_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function label(ctx, text, x, y) {
  ctx.fillStyle = '#6a5c3c';
  ctx.font = '600 20px ' + CARD_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Canvas has no letter-spacing in older Safari, so the gaps are drawn in.
  let cursor = x;
  for (const ch of text) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + 3;
  }
}

function none(ctx, cx, cy) {
  ctx.fillStyle = '#6a5c3c';
  ctx.font = 'italic 28px ' + CARD_FONT;
  ctx.textAlign = 'center';
  ctx.fillText('none', cx, cy);
  ctx.textAlign = 'left';
}

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
  const bg = withExtras ? hqToBackground(agentHqId()) : 'plain';

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


/* ---------------------------------------------------------------------------
   SAVING THE CARD (spec §7, §9)
   navigator.share({files}) is the reliable route on an iPad added to the home
   screen; <a download> often does nothing there. The download link is the
   fallback for everything else.
   ------------------------------------------------------------------------ */
async function saveCard() {
  if (!state.agent) return;

  const canvas = document.createElement('canvas');
  drawCardToCanvas(canvas);

  const safeName = (state.agent.codename || 'agent').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const filename = 'agent-' + safeName + '.png';

  canvas.toBlob(async function (blob) {
    if (!blob) { toast('The card could not be made'); return; }

    const file = new File([blob], filename, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Agent ID card' });
        logEvent('card_save', { how: 'share' });
        return;
      } catch (err) {
        // A cancelled share is not a failure - the child changed their mind.
        if (err && err.name === 'AbortError') { logEvent('card_save_cancel', {}); return; }
      }
    }

    // Fallback: an ordinary download link, clicked for them.
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Freeing the URL immediately can cancel the download on some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    logEvent('card_save', { how: 'download' });
    toast('Card saved 💾');
  }, 'image/png');
}

function wireReveal() {
  $('#btn-save-card').addEventListener('click', saveCard);
  $('#reveal-play').addEventListener('click', playRevealVoice);
  $('#reveal-fire').addEventListener('click', fireRevealPower);
  watchAgentView($('#reveal-cover'));
  watchAgentView($('#reveal-boost'));
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
  return shapes
    .map((shape, index) => ({ shape, index }))
    .sort((a, b) => {
      const za = a.shape.z === undefined ? Parts.layerOf(a.shape.type) : a.shape.z;
      const zb = b.shape.z === undefined ? Parts.layerOf(b.shape.type) : b.shape.z;
      if (za !== zb) return za - zb;
      return a.index - b.index;
    });
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
  const flip = shape.flipX ? ' scale(-1,1)' : '';
  const base = 'translate(' + (shape.x * 100) + ',' + (shape.y * 100) + ') ' +
               'rotate(' + (shape.rotation || 0) + ')' + flip;
  if (!part) return base + ' scale(' + (shape.size || 1) + ')';
  return base + ' scale(' + (shape.size || 1) + ') translate(-50,-50)';
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
  if (id === 'start')  { speakLine('nar-start-welcome'); return; }
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

function openMissing() {
  missingAudioId = null;
  logEvent('missing_open', { screen: currentMissionId() });

  coder.canvas = $('#missing-canvas');
  coder.undoStack = [];
  coder.colour = CODE_COLOURS[0];
  coder.width = 14;
  coder.mirror = false;
  coder.onStroke = null;
  clearCodeCanvas();
  paintCodePalette('#missing-palette');
  paintMissingRecordButton();

  $('#missing-overlay').hidden = false;
}

function closeMissing() {
  $('#missing-overlay').hidden = true;
  clearCodeCanvas();
  // Hand the brush back, so a later feeling code does not paint in here.
  coder.canvas = $('#m3-canvas');
  coder.undoStack = [];
}

function paintMissingRecordButton() {
  const button = $('#missing-record');
  button.classList.toggle('is-on', Boolean(missingAudioId));
  $('#missing-record-word').textContent = missingAudioId ? 'Saved' : 'Say it';
}

async function recordMissing() {
  Voice.unlock();
  if (Voice.isRecording()) { Voice.stop(); return; }
  if (!Voice.canRecord()) { toast('This iPad cannot record'); return; }

  const button = $('#missing-record');
  button.classList.add('is-recording');
  try {
    const result = await Voice.record({ maxMs: 10000, onTick: () => {} });
    const id = uuid();
    await Storage.saveAudio(id, result.blob);
    if (missingAudioId) await Storage.deleteAudio(missingAudioId);
    missingAudioId = id;
    playSfx('sfx-pop');
  } catch (err) {
    toast('The microphone did not work');
  }
  button.classList.remove('is-recording');
  paintMissingRecordButton();
}

async function saveMissing() {
  if (!state.agent) { closeMissing(); return; }

  const hasDrawing = canvasHasInk();
  if (!hasDrawing && !missingAudioId) {
    toast('Draw it or say it first');
    return;
  }

  state.agent.missing.push({
    screen: currentMissionId(),
    png: hasDrawing ? coder.canvas.toDataURL('image/png') : null,
    audioId: missingAudioId,
    t: nowIso()
  });

  logEvent('missing_save', {
    screen: currentMissionId(),
    drawn: hasDrawing,
    said: Boolean(missingAudioId)
  });

  missingAudioId = null;
  closeMissing();
  playSfx('sfx-pop');
  toast('Thank you 🧩');
  scheduleSave();
}


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

function startVoiceBounce(element) {
  if (!element || !fullMotion()) return;
  stopVoiceBounce(element);
  bounceScale = 1;

  function frame() {
    const rms = Voice.loudness();
    // Spec §5a: 1 + rms * 0.5, never past 1.25.
    const target = Math.min(1.25, 1 + rms * 0.5);
    // lerp 0.3: move three tenths of the way there each frame.
    bounceScale += (target - bounceScale) * 0.3;
    element.style.transform = 'scale(' + bounceScale.toFixed(3) + ') ' +
                              'translateY(' + ((1 - bounceScale) * 30).toFixed(1) + 'px)';
    bounceFrame = requestAnimationFrame(frame);
  }
  bounceFrame = requestAnimationFrame(frame);
}

function stopVoiceBounce(element) {
  if (bounceFrame) cancelAnimationFrame(bounceFrame);
  bounceFrame = null;
  if (element) element.style.transform = '';
}


/* ---------------------------------------------------------------------------
   THE BOOST POWER-UP (spec §5a item 3)
   About two and a half seconds, once, when Mission 2 opens, with a ✨ button
   to see it again. The order is the spec's: shake, one flash, spin and grow,
   sparkles, then the aura.
   ------------------------------------------------------------------------ */
let powerUpRunning = false;

function playBoostPowerUp() {
  const stageEl = stage();
  if (!stageEl || powerUpRunning) return;
  if (!fullMotion()) return;          // Calm and Off skip it entirely

  powerUpRunning = true;
  logEvent('boost_power_up', {});
  stageEl.classList.remove('power-up');
  void stageEl.offsetWidth;
  stageEl.classList.add('power-up');
  playSfx('sfx-powerup');

  // The sparkles land as the spin finishes, not at the start.
  setTimeout(() => {
    if (!$('#editor').hidden) {
      Effects.burstAt(stageEl, { count: 60, spread: 9 });
      playSfx('sfx-new');
    }
  }, 1300);

  setTimeout(() => {
    stageEl.classList.remove('power-up');
    powerUpRunning = false;
  }, 2500);
}


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

function playRevealFinale() {
  clearFinale();
  const dossier = $('#dossier');
  if (!dossier) return;

  if (!fullMotion()) { dossier.classList.add('is-open'); return; }

  dossier.classList.remove('is-open');
  dossier.classList.add('is-arriving');
  playSfx('sfx-whoosh');

  finaleTimers.push(setTimeout(() => {
    dossier.classList.remove('is-arriving');
    dossier.classList.add('is-open');
  }, 600));

  // The stamp slams down with a thud and a small screen shake.
  finaleTimers.push(setTimeout(() => {
    const stamp = $('.dossier-stamp');
    stamp.classList.remove('is-slamming');
    void stamp.offsetWidth;
    stamp.classList.add('is-slamming');
    playSfx('sfx-stamp');
    Effects.shake($('#screen-reveal'), 6);
  }, 800));

  // Sparkles, then the password plays itself once with the bounce.
  finaleTimers.push(setTimeout(() => {
    Effects.burstAt($('#dossier'), { count: 50, spread: 8 });
    playSfx('sfx-new');
  }, 1200));

  finaleTimers.push(setTimeout(() => {
    if (state.onReveal && state.agent && state.agent.voice.audioId) playRevealVoice();
  }, 1600));
}

/* Spec §5a: tapping anywhere skips straight to the finished card. */
function skipFinale() {
  if (finaleTimers.length === 0) return;
  clearFinale();
  const dossier = $('#dossier');
  dossier.classList.remove('is-arriving');
  dossier.classList.add('is-open');
  Effects.clear();
  logEvent('reveal_skip', {});
}

function clearFinale() {
  finaleTimers.forEach(clearTimeout);
  finaleTimers = [];
}


/* ---------------------------------------------------------------------------
   Wiring Milestone 8 up. Called once, from wireUp().
   ------------------------------------------------------------------------ */
function wirePolish() {
  attachBrush($('#missing-canvas'));

  $('#missing-record').addEventListener('click', recordMissing);
  $('#missing-undo').addEventListener('click', undoCode);
  $('#missing-clear').addEventListener('click', clearCode);
  $('#missing-save').addEventListener('click', saveMissing);

  // Tapping the preview makes the agent react (spec §5a item 1).
  const art = $('#preview-art');
  if (art) art.addEventListener('click', tapPreview);

  // Tapping anywhere on the Reveal skips the finale.
  $('#screen-reveal').addEventListener('pointerdown', skipFinale);

  // The ✨ replay button on Mission 2.
  const replay = $('#btn-power-replay');
  if (replay) replay.addEventListener('click', playBoostPowerUp);

  // Spec §5a: stop loops when the screen is hidden.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      stopVoiceBounce($('#dossier'));
      clearFinale();
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
const POWER_EFFECTS = [
  { id: 'fx-lightning', icon: '⚡', label: 'Lightning' },
  { id: 'fx-freeze',    icon: '❄️', label: 'Freeze' },
  { id: 'fx-fade',      icon: '👻', label: 'Vanish' },
  { id: 'fx-speed',     icon: '💨', label: 'Zoom' },
  { id: 'fx-thoughts',  icon: '💭', label: 'Thoughts' },
  { id: 'fx-shield',    icon: '🛡️', label: 'Shield' },
  { id: 'fx-float',     icon: '🪽', label: 'Float' },
  { id: 'fx-stomp',     icon: '💥', label: 'Stomp' },
  { id: 'fx-teleport',  icon: '🌀', label: 'Teleport' },
  { id: 'fx-grow',      icon: '🔍', label: 'Grow' }
];

// Whether the ideas have been revealed this visit. Never remembered: each
// child meets the blank square first.


/* ---------------------------------------------------------------------------
   THE WHOLE SCREEN
   ------------------------------------------------------------------------ */
function renderPowerup() {
  if (!state.agent) return;
  renderAgentView($('#power-stage'), state.agent.powerup.look, false);
  paintPowerEffects();
  paintPowerOwn();
  paintPowerWhen();
}

function enterPowerup() {
  if (!state.agent) return;
  disarmOwnRemove();     // never arrive with a card still asking to be removed

  const look = state.agent.powerup.look;
  if (!Array.isArray(look.pixels)) look.pixels = [];
  if (!Array.isArray(look.stickers)) look.stickers = [];
  if (!Array.isArray(look.shapes)) look.shapes = [];

  const copied = copyCoverToPowerup();
  if (copied) scheduleSave();

  // Back to the questions, not wherever "Change my look" left things.
  closePowerLook();
  renderPowerup();
  speakLine('nar-powerup-intro');

  // Spec §5a: the power-up plays once when the mission opens.
  setTimeout(playBoostPowerUp, 350);
}


/* ---------------------------------------------------------------------------
   STEP 1: MAKE UP A POWER (v2 §5.4)
   Blank first. Always.
   ------------------------------------------------------------------------ */
/* The ideas are revealed only when asked for. The event log therefore shows
   whether a child drew first or reached for the list - which is the finding
   this screen exists to produce. */
/* An idea brings its default effect, which the child can then change
   (v2 §5.4). Choosing it also plays it, so the link is immediate. */
/* ---------------------------------------------------------------------------
   STEP 2: WHAT DOES IT LOOK LIKE? (v2 §5.4)
   Each effect plays on the agent the moment it is tapped, with its sound.
   ------------------------------------------------------------------------ */
function paintPowerEffects() {
  const box = $('#power-effects');
  if (!box) return;
  box.innerHTML = '';

  POWER_EFFECTS.forEach(effect => {
    const tile = document.createElement('button');
    const chosen = state.agent.powerup.power.effect === effect.id;
    tile.className = 'btn tool effect-tile' + (chosen ? ' is-on' : '');
    tile.innerHTML = '<span class="filter-icon">' + effect.icon + '</span>' +
                     '<span class="tool-word">' + effect.label + '</span>';
    tile.setAttribute('aria-label', effect.label);
    tile.addEventListener('click', () => chooseEffect(effect));
    box.appendChild(tile);
  });
}

/* ✏️ MAKE MY OWN (v2 §5.4, reshaped after the 7 October iPad test)

   "Make up a power" was a question of its own: a blank canvas first, with the
   ten ideas held back until the child asked, so the log could show whether
   they invented before being offered a list. Three questions on one screen
   was too much on a real iPad, so inventing is now one card in this list, in
   the same shape as ✏️ My own in the question below.

   What the log can still say: whether a child took a ready-made effect or
   made their own, and in what order. What it can no longer say: whether they
   would have invented one unprompted. */
function paintPowerOwn() {
  const box = $('#power-own');
  if (!box) return;
  box.innerHTML = '';

  const own = state.agent.powerup.power;

  const make = document.createElement('button');
  make.className = 'when-own';
  make.setAttribute('aria-label', 'Make up your own power');
  make.innerHTML = '<span class="when-own-icon">✏️</span>' +
                   '<span class="when-own-label">Make my own</span>';
  make.addEventListener('click', openPowerOwn);
  box.appendChild(make);

  if (!own.png && !own.audioId) return;

  const tile = document.createElement('button');
  tile.className = 'when-own is-on' + (powerOwnArmed ? ' is-armed' : '');
  tile.innerHTML = (own.png
      ? '<img class="hq-own-thumb" alt="" src="' + own.png + '">'
      : '<span class="when-own-icon">🎤</span>') +
    '<span class="when-own-label">' + (powerOwnArmed ? 'Remove?' : 'My power') + '</span>';
  tile.setAttribute('aria-label', 'My own power');
  tile.addEventListener('click', armPowerOwnRemove);
  box.appendChild(tile);
}

function openPowerOwn() {
  openOwnCard({
    title: 'Make up your power',
    say: 'nar-power-make',
    onKeep: card => {
      state.agent.powerup.power.png = card.png;
      if (card.audioId) state.agent.powerup.power.audioId = card.audioId;
      logEvent('power_draw', { drawn: Boolean(card.png), said: Boolean(card.audioId) });
      paintPowerOwn();
      scheduleSave();
    }
  });
}

/* The same two taps as every other card a child made: one arms, one removes. */
let powerOwnArmed = false;
let powerOwnTimer = null;

function armPowerOwnRemove() {
  if (powerOwnArmed) {
    clearTimeout(powerOwnTimer);
    powerOwnArmed = false;
    const id = state.agent.powerup.power.audioId;
    if (id) { Voice.forget(id); Storage.deleteAudio(id); }
    state.agent.powerup.power.png = null;
    state.agent.powerup.power.audioId = null;
    logEvent('power_draw_remove', {});
    paintPowerOwn();
    scheduleSave();
    return;
  }
  clearTimeout(powerOwnTimer);
  powerOwnArmed = true;
  playSfx('sfx-pop');
  powerOwnTimer = setTimeout(() => { powerOwnArmed = false; paintPowerOwn(); }, 3000);
  paintPowerOwn();
}

function chooseEffect(effect) {
  state.agent.powerup.power.effect = effect.id;
  logEvent('power_effect_choose', { effect: effect.id });
  paintPowerEffects();
  fireEffect(effect.id);
  scheduleSave();
}

/* Play an effect on the agent. The sound id is the effect id with fx- swapped
   for sfx-, which is how asset-guide §4.6 names them. */
function fireEffect(effectId) {
  if (!effectId) return;
  const stage = $('#power-stage');
  if (!stage) return;

  POWER_EFFECTS.forEach(e => stage.classList.remove(e.id));
  void stage.offsetWidth;                    // restart the animation
  stage.classList.add(effectId);
  playSfx('sfx-' + effectId.replace(/^fx-/, ''));
  logEvent('power_fire', { effect: effectId });

  // Take the class off again, so the next tap always replays it.
  setTimeout(() => stage.classList.remove(effectId), 1500);
}


/* ---------------------------------------------------------------------------
   STEP 3: WHEN DOES YOUR AGENT USE IT? (v2 §5.4)

   The ten situation cards. Any number may be chosen - a power is not for one
   moment only. Each card speaks its label when tapped (v2 §7).

   "Someone is unkind" can bring up real experiences. The app does not react
   to it: it is logged exactly like every other card, and the facilitators
   follow the school's safeguarding route. Treating it specially in software
   would single a child out at the moment they least want it.
   ------------------------------------------------------------------------ */
function paintPowerWhen() {
  const box = $('#power-when');
  if (!box) return;
  box.innerHTML = '';

  const chosen = state.agent.powerup.when || [];

  Assets.list('situations').forEach(situation => {
    const card = Assets.card(situation.id);
    if (chosen.indexOf(situation.id) !== -1) card.classList.add('is-on');
    card.addEventListener('click', () => toggleWhen(situation.id));
    box.appendChild(card);
  });

  // ✏️ My own, for a moment none of the ten covers.
  const own = document.createElement('button');
  own.className = 'when-own';
  own.setAttribute('aria-label', 'Make your own card');
  own.innerHTML = '<span class="when-own-icon">✏️</span>' +
                  '<span class="when-own-label">My own</span>';
  own.addEventListener('click', openOwnCard);
  box.appendChild(own);

  // The child's own cards, alongside the ten.
  (state.agent.powerup.whenOwn || []).forEach((card, index) => {
    const tile = document.createElement('button');
    tile.className = 'when-own is-on';
    tile.innerHTML = (card.png
        ? '<img class="own-card-thumb" alt="" src="' + card.png + '">'
        : '<span class="when-own-icon">🎤</span>') +
      '<span class="when-own-label">My own</span>';
    tile.setAttribute('aria-label', 'My own card ' + (index + 1));
    // Tapping asks first (see armOwnRemove) - a child's drawing should never
    // vanish on one stray tap, and there is nowhere in the model (§6) to keep
    // an own card that is switched off, so removing is the only other action.
    if (ownRemoveArmed === index) {
      tile.classList.add('is-armed');
      tile.querySelector('.when-own-label').textContent = 'Remove?';
    }
    tile.addEventListener('click', () => armOwnRemove(index));
    box.appendChild(tile);
  });
}

function toggleWhen(situationId) {
  const list = state.agent.powerup.when;
  const at = list.indexOf(situationId);
  const on = at === -1;

  if (on) list.push(situationId);
  else list.splice(at, 1);

  logEvent('power_when_toggle', { situation: situationId, on: on });
  speakLabel(situationId);        // v2 §7: the card says its label
  playSfx('sfx-pop');
  paintPowerWhen();
  scheduleSave();
}


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

function armOwnRemove(index) {
  if (ownRemoveArmed === index) { disarmOwnRemove(); removeOwnCard(index); return; }
  clearTimeout(ownRemoveTimer);
  ownRemoveArmed = index;
  playSfx('sfx-pop');
  ownRemoveTimer = setTimeout(() => { ownRemoveArmed = null; paintPowerWhen(); }, 3000);
  paintPowerWhen();
}

function disarmOwnRemove() {
  clearTimeout(ownRemoveTimer);
  ownRemoveArmed = null;
}

async function removeOwnCard(index) {
  const list = state.agent.powerup.whenOwn;
  const card = list[index];
  if (!card) return;
  if (card.audioId) { Voice.forget(card.audioId); await Storage.deleteAudio(card.audioId); }
  list.splice(index, 1);
  logEvent('power_when_own_remove', {});
  paintPowerWhen();
  scheduleSave();
}


/* ---------------------------------------------------------------------------
   CHANGE MY LOOK (optional, v2 §5.4)
   Opens the editor on powerup.look. The glow lives here.
   ------------------------------------------------------------------------ */
function openPowerLook() {
  $('.power-wrap').hidden = true;
  $('#m2-editor-mount').hidden = false;
  $('#m2-cover').hidden = false;
  openEditor('#m2-editor-mount', 'powerup');
  speakLine('nar-look-edit');
  logEvent('look_edit_open', {});
}

function closePowerLook() {
  const wrap = $('.power-wrap');
  if (!wrap) return;
  wrap.hidden = false;
  $('#m2-editor-mount').hidden = true;
  $('#m2-cover').hidden = true;
  hideEditor();
  renderPowerup();
}


/* ---------------------------------------------------------------------------
   Wiring the Power-up up. Called once, from wireUp().
   ------------------------------------------------------------------------ */
function wirePowerup() {
  attachBrush($('#own-canvas'));
  $('#btn-power-look').addEventListener('click', openPowerLook);

  // Every 🔊 on this screen says its own step's line.
  $$('[data-say]').forEach(b =>
    b.addEventListener('click', () => speakLine(b.dataset.say)));

  // ➡️ skips to the next step by scrolling to it: the steps stay on one
  // screen, so skipping is moving, not hiding.
  $$('.power-skip').forEach(b => b.addEventListener('click', () => {
    const target = $('#power-step-' + b.dataset.step);
    if (target) target.scrollIntoView({ behavior: fullMotion() ? 'smooth' : 'auto',
                                        block: 'start' });
    logEvent('power_step_skip', { to: Number(b.dataset.step) });
  }));

  $('#own-undo').addEventListener('click', undoCode);
  $('#own-clear').addEventListener('click', clearCode);
  $('#own-mic').addEventListener('click', recordOwnCard);
  $('#own-cancel').addEventListener('click', closeOwnCard);
  $('#own-save').addEventListener('click', keepOwnCard);
  $('#own-say').addEventListener('click', () => speakLine($('#own-say').dataset.say));
}


/* ===========================================================================
   27. HQ (v2 V4, spec §5.5)

   "Where is your agent strongest?"

   Twelve photographs in two groups - six real places, six make-believe ones -
   and a thirteenth option the child draws. Tapping one drops the agent into
   that place with a small landing.

   The choice is just `hq.id`, which V2 already wired into every agent view
   (`setHqBackdrop`), so choosing here changes the Power-up stage, the preview
   thumbnail and the saved card at the same time. A drawn place is `hq.png`,
   which nothing used until now.

   There is no "right" place, and the app never says anything about the one a
   child picks (v2 §12). The quiet room and the jungle are the same size on
   screen and read out the same way.
   ======================================================================== */

/* The two groups, in the spec's order. The ids are the manifest's, so each
   card's picture and its `nar-<id>` voice line both arrive for free. */
const HQ_REAL    = ['hq-classroom', 'hq-playground', 'hq-library',
                    'hq-quiet-room', 'hq-lunch-hall', 'hq-home'];
const HQ_FANTASY = ['hq-space', 'hq-underwater', 'hq-jungle',
                    'hq-city-rooftop', 'hq-sky-castle', 'hq-secret-lab'];

function enterHq() {
  if (!state.agent) return;
  renderHq();
  speakLine('nar-hq-intro');
}

function renderHq() {
  if (!state.agent) return;
  renderAgentView($('#hq-stage'), state.agent.cover, false);
  paintHqRow('#hq-real', HQ_REAL);
  paintHqRow('#hq-fantasy', HQ_FANTASY);
  paintHqOwn();
  paintHqWhere();
}

/* One row of picture cards. `Assets.card()` gives the photograph with its
   emoji stand-in underneath, so an empty assets/ folder still works. */
function paintHqRow(selector, ids) {
  const box = $(selector);
  if (!box) return;
  box.innerHTML = '';

  ids.forEach(id => {
    const card = Assets.card(id);
    if (agentHqId() === id) card.classList.add('is-on');
    card.addEventListener('click', () => chooseHq(id));
    box.appendChild(card);
  });
}

/* The line under the agent: where it is right now, in words. */
function paintHqWhere() {
  const where = $('#hq-where');
  if (!where) return;
  const id = agentHqId();
  if (state.agent.hq && state.agent.hq.png && !id) {
    where.textContent = 'My own place';
    return;
  }
  const entry = id ? Assets.item(id) : null;
  where.textContent = entry ? entry.label : 'Nowhere yet';
}

function chooseHq(id) {
  const changing = agentHqId() && agentHqId() !== id;
  state.agent.hq.id = id;
  state.agent.hq.png = null;           // a photograph replaces a drawn place

  logEvent('hq_choose', { id: id, changed: Boolean(changing) });
  speakLabel(id);                      // v2 §7: the card says its label
  /* No pop here: landAgent() makes the sound for this action. Two at once
     just muddles, and §4.6 has no separate landing sound. */

  renderHq();
  refreshAgentViews();                 // the preview and every other stage
  landAgent();
  scheduleSave();
}

/* "Nowhere" is an equal choice, not a way of clearing a mistake: an agent
   does not have to have a place. */
function clearHq() {
  state.agent.hq.id = null;
  state.agent.hq.png = null;
  logEvent('hq_choose', { id: null });
  playSfx('sfx-pop');
  renderHq();
  refreshAgentViews();
  scheduleSave();
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
   Reuses the shared ✏️ sheet from V3 rather than adding another one: it
   already has the brush, the palette, the mic and the keep/cancel buttons.
   ------------------------------------------------------------------------ */
function openHqDraw() {
  openOwnCard({
    title: 'Draw your own place',
    say: 'nar-hq-draw',
    onKeep: card => {
      state.agent.hq.png = card.png;
      state.agent.hq.id = null;        // a drawn place replaces a photograph
      logEvent('hq_draw', { drawn: Boolean(card.png), said: Boolean(card.audioId) });
      if (card.audioId) state.agent.hq.audioId = card.audioId;
      renderHq();
      refreshAgentViews();
      landAgent();
      scheduleSave();
    }
  });
}

/* The drawn place, shown beside the ✏️ button once it exists. Tapping it asks
   before removing, the same two-tap rule as the Power-up's own cards. */
let hqOwnArmed = false;
let hqOwnTimer = null;

function paintHqOwn() {
  const box = $('#hq-own');
  if (!box) return;
  box.innerHTML = '';
  if (!state.agent.hq || !state.agent.hq.png) return;

  const tile = document.createElement('button');
  tile.className = 'when-own is-on' + (hqOwnArmed ? ' is-armed' : '');
  tile.innerHTML =
    '<img class="hq-own-thumb" alt="" src="' + state.agent.hq.png + '">' +
    '<span class="when-own-label">' + (hqOwnArmed ? 'Remove?' : 'My place') + '</span>';
  tile.setAttribute('aria-label', 'My own place');
  tile.addEventListener('click', armHqOwnRemove);
  box.appendChild(tile);
}

function armHqOwnRemove() {
  if (hqOwnArmed) {
    clearTimeout(hqOwnTimer);
    hqOwnArmed = false;
    state.agent.hq.png = null;
    logEvent('hq_draw_remove', {});
    renderHq();
    refreshAgentViews();
    scheduleSave();
    return;
  }
  clearTimeout(hqOwnTimer);
  hqOwnArmed = true;
  playSfx('sfx-pop');
  hqOwnTimer = setTimeout(() => { hqOwnArmed = false; paintHqOwn(); }, 3000);
  paintHqOwn();
}


/* Wiring the HQ up. Called once, from wireUp(). */
function wireHq() {
  $('#btn-hq-draw').addEventListener('click', openHqDraw);
  $('#btn-hq-none').addEventListener('click', clearHq);
  $('#btn-hq-again').addEventListener('click', landAgent);
}


/* ===========================================================================
   28. THE SEAL, THE BADGE CHECK AND THE WALL CHECK (v2 V5, §5.2 and §5.11)

   Three things the session-2 card offers:

   - **Seal** (§5.2) is NOT security. It is a spy-themed privacy choice, and
     *who chooses to seal* is itself the research data. Three symbols in order
     out of nine; a wrong try shakes and nothing ever locks a child out; and
     an adult can always open a file with the panel PIN.

   - **Badge check** (§5.11) renders the badge face at 320x240 and shows it at
     the size it will really be - the Tufty's screen is about 49 x 37 mm. It
     is meant to look tiny. The question is whether a child can still tell it
     is their agent.

   - **Wall check** (§5.11) renders at 800x480 and dithers it to the few
     colours an e-paper panel can actually print.
   ======================================================================== */

/* §5.2's nine symbols, in the spec's order. */
const SEAL_SYMBOLS = ['🦊', '🌙', '⚡', '🍕', '🎈', '🌵', '🐙', '🎲', '🔑'];
const SEAL_LENGTH = 3;

/* The Tufty 2040's screen, from §5.11. */
const BADGE_W = 320, BADGE_H = 240;
const BADGE_MM_W = 49, BADGE_MM_H = 37;
const MM_PER_INCH = 25.4;

/* The e-paper palettes (§5.11). Spectra 6 is the default; the 7-colour panel
   adds orange. These are the only colours the wall can actually show, which
   is the whole point of dithering to them. */
const WALL_PALETTES = {
  6: [[0,0,0], [255,255,255], [255,0,0], [255,255,0], [0,255,0], [0,0,255]],
  7: [[0,0,0], [255,255,255], [255,0,0], [255,255,0], [0,255,0], [0,0,255], [255,128,0]]
};


/* ---------------------------------------------------------------------------
   BADGE CHECK
   ------------------------------------------------------------------------ */
async function openBadgeCheck() {
  if (!state.agent) return;
  Voice.unlock();

  logEvent('badge_check_open', {});
  $('#badge-zoom-wrap').hidden = true;        // always starts life-size
  $('#badge-overlay').hidden = false;
  playSfx('sfx-file-open');

  await drawBadgeFace($('#badge-canvas'));
  sizeBadgeToLife();
  speakLine('nar-card-badge');
}

/* Scale the 320x240 canvas down to its real physical size. CSS pixels are not
   millimetres, so this needs to know how many of them this screen puts in an
   inch - an adult setting, because it is wrong on other hardware. */
function sizeBadgeToLife() {
  const canvas = $('#badge-canvas');
  if (!canvas) return;
  const ppi = state.badgePpi || 132;
  const widthPx  = (BADGE_MM_W / MM_PER_INCH) * ppi;
  const heightPx = (BADGE_MM_H / MM_PER_INCH) * ppi;
  canvas.style.width  = widthPx + 'px';
  canvas.style.height = heightPx + 'px';
}

/* The badge face. v2 §5.11: if the badge mission has not been done yet, use a
   default layout - the agent on the left, the emblem and codename on the
   right - so the check works in session 2, before that mission exists. */
async function drawBadgeFace(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, BADGE_W, BADGE_H);

  await preloadCardAssets();

  // The agent, filling the left square.
  const pad = 8;
  const size = BADGE_H - pad * 2;
  drawAgentToCanvas(ctx, state.agent.cover, pad, pad, size, true);

  // The emblem and codename on the right.
  const rightX = pad + size + 12;
  const rightW = BADGE_W - rightX - pad;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd23f';
  ctx.font = '48px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText((state.agent.emblem && state.agent.emblem.emoji) || '🕵️',
               rightX + rightW / 2, 78);

  // The codename, wrapped to the narrow column and shrunk until it fits.
  ctx.fillStyle = '#fff';
  const name = state.agent.codename || 'Agent';
  let fontSize = 26;
  let lines;
  do {
    ctx.font = '700 ' + fontSize + 'px -apple-system, BlinkMacSystemFont, sans-serif';
    lines = wrapText(ctx, name, rightW);
    fontSize -= 2;
  } while (lines.length > 3 && fontSize > 12);

  lines.forEach((line, i) => {
    ctx.fillText(line, rightX + rightW / 2,
                 140 + i * (fontSize + 6) - (lines.length - 1) * (fontSize + 6) / 2);
  });
}

/* Break a string into lines that fit a width. Canvas has no text wrapping. */
function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach(word => {
    const next = line ? line + ' ' + word : word;
    if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = word; }
    else line = next;
  });
  if (line) lines.push(line);
  return lines;
}

/* 🔍 Big: the same pixels, blown up with no smoothing. */
function toggleBadgeZoom() {
  const wrap = $('#badge-zoom-wrap');
  const showing = wrap.hidden;
  wrap.hidden = !showing;
  if (!showing) return;

  const from = $('#badge-canvas');
  const to = $('#badge-zoom');
  to.width = BADGE_W; to.height = BADGE_H;
  const ctx = to.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(from, 0, 0);
  logEvent('badge_zoom', {});
}

function closeBadgeCheck() { $('#badge-overlay').hidden = true; }


/* ---------------------------------------------------------------------------
   WALL CHECK
   ------------------------------------------------------------------------ */
async function openWallCheck() {
  if (!state.agent) return;
  Voice.unlock();

  const which = state.wallPalette || 6;
  logEvent('wall_check_open', { palette: which });
  $('#wall-overlay').hidden = false;
  playSfx('sfx-file-open');

  const canvas = $('#wall-canvas');
  await drawWallFace(canvas);
  ditherToPalette(canvas, WALL_PALETTES[which] || WALL_PALETTES[6]);

  $('#wall-note').textContent =
    'The wall can only print ' + (WALL_PALETTES[which] || WALL_PALETTES[6]).length + ' colours.';
  speakLine('nar-card-wall');
}

/* 800x480: the agent large on the left, emblem and codename on the right. */
async function drawWallFace(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await preloadCardAssets();

  const pad = 20;
  const size = canvas.height - pad * 2;
  drawAgentToCanvas(ctx, state.agent.cover, pad, pad, size, true);

  const rightX = pad + size + 24;
  const rightW = canvas.width - rightX - pad;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.font = '110px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText((state.agent.emblem && state.agent.emblem.emoji) || '🕵️',
               rightX + rightW / 2, 150);

  const name = state.agent.codename || 'Agent';
  let fontSize = 54;
  let lines;
  do {
    ctx.font = '700 ' + fontSize + 'px -apple-system, BlinkMacSystemFont, sans-serif';
    lines = wrapText(ctx, name, rightW);
    fontSize -= 3;
  } while (lines.length > 3 && fontSize > 20);

  lines.forEach((line, i) => {
    ctx.fillText(line, rightX + rightW / 2,
                 310 + i * (fontSize + 10) - (lines.length - 1) * (fontSize + 10) / 2);
  });
}

/* Floyd-Steinberg dithering (§5.11).

   An e-paper panel has no in-between colours: a pixel is one of six. Simply
   snapping each pixel to the nearest one loses every gradient. Dithering
   instead pushes the error - how far off the chosen colour was - onto the
   neighbours that have not been drawn yet, so a half-tone becomes a mix of
   two colours that READS as the shade from a step back. That is what the
   fractions below are: 7/16 of the error to the right, then 3/16, 5/16 and
   1/16 across the row underneath. */
function ditherToPalette(canvas, palette) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const image = ctx.getImageData(0, 0, w, h);
  const data = image.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;

      const oldR = data[i], oldG = data[i + 1], oldB = data[i + 2];
      const near = nearestColour(oldR, oldG, oldB, palette);

      data[i] = near[0]; data[i + 1] = near[1]; data[i + 2] = near[2];

      const errR = oldR - near[0], errG = oldG - near[1], errB = oldB - near[2];
      spread(data, w, h, x + 1, y,     errR, errG, errB, 7 / 16);
      spread(data, w, h, x - 1, y + 1, errR, errG, errB, 3 / 16);
      spread(data, w, h, x,     y + 1, errR, errG, errB, 5 / 16);
      spread(data, w, h, x + 1, y + 1, errR, errG, errB, 1 / 16);
    }
  }
  ctx.putImageData(image, 0, 0);
}

function spread(data, w, h, x, y, errR, errG, errB, factor) {
  if (x < 0 || x >= w || y < 0 || y >= h) return;
  const i = (y * w + x) * 4;
  data[i]     = clamp255(data[i]     + errR * factor);
  data[i + 1] = clamp255(data[i + 1] + errG * factor);
  data[i + 2] = clamp255(data[i + 2] + errB * factor);
}

function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

/* Nearest colour by plain squared distance. There is no need for a perceptual
   colour space here: the palettes are six fully-saturated corners. */
function nearestColour(r, g, b, palette) {
  let best = palette[0], bestDist = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i];
    const dr = r - p[0], dg = g - p[1], db = b - p[2];
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) { bestDist = dist; best = p; }
  }
  return best;
}

function closeWallCheck() { $('#wall-overlay').hidden = true; }


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
    renderRevealButtons();
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

/* The Seal button says what it will do. */
function renderRevealButtons() {
  const button = $('#btn-seal');
  if (!button || !state.agent) return;
  const sealed = Boolean(state.agent.seal);
  $('.btn-icon', button).textContent = sealed ? '🔓' : '🔒';
  $('.btn-label', button).textContent = sealed ? 'Change seal' : 'Seal';
}

function wireCardV5() {
  $('#btn-badge-check').addEventListener('click', openBadgeCheck);
  $('#btn-badge-zoom').addEventListener('click', toggleBadgeZoom);
  $('#btn-badge-close').addEventListener('click', closeBadgeCheck);

  $('#btn-wall-check').addEventListener('click', openWallCheck);
  $('#btn-wall-close').addEventListener('click', closeWallCheck);

  $('#btn-seal').addEventListener('click', openSealSheet);
  $('#btn-seal-undo').addEventListener('click', undoSeal);
  $('#btn-seal-adult').addEventListener('click', sealAskAdult);
  $('#btn-seal-cancel').addEventListener('click', closeSealSheet);
  $('#seal-say').addEventListener('click', () => speakLine($('#seal-say').dataset.say));
}
