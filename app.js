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
    14. MISSION 1         pixel door + sticker layer (Milestone 1)
    15. MISSION 2         boost: powers, aura, background (Milestone 2)
    16. MISSION 4         voice password: record + filters (Milestone 3)
    17. MISSION 3         secret feeling code (Milestone 4)
    18. MISSION 5         where does my agent go? (Milestone 5)
    19. MISSION 6         agent rules + shared drawing sheet (Milestone 5)
    20. REVEAL            the agent ID card + save as PNG (Milestone 6)
    21. BUILD + DRAW      the other two Mission 1 doors (Milestone 7)
    22. POLISH & JUICE    §5a animation, sounds, spoken prompts (Milestone 8)
    23. OFFLINE           service worker + update banner (Milestone 9)
   ========================================================================== */


/* ==========================================================================
   1. CONFIG
   ========================================================================== */

// Spec §14: this PIN is visible in public code on purpose. It is a speed bump
// to stop a curious child wandering into the adult panel, not real security.
const ADULT_PIN = '2468';

// Which milestone this build is up to. Stamped into every export so a file
// found later can be matched to the version of the app that made it.
const MILESTONE = 9;

// The six missions, in the order children meet them.
const MISSIONS = [
  { id: 'm1', icon: '🎨', title: 'Make your agent',        prompt: 'Make your agent.' },
  { id: 'm2', icon: '⚡', title: 'Boost',                  prompt: 'Give your agent a boost.' },
  { id: 'm3', icon: '💛', title: 'Secret feeling code',    prompt: 'Make a secret sign for a feeling.' },
  { id: 'm4', icon: '🎤', title: 'Voice password',         prompt: 'Record your secret voice password.' },
  { id: 'm5', icon: '🗺️', title: 'Where does my agent go?', prompt: 'Where does your agent go?' },
  { id: 'm6', icon: '📋', title: 'Agent rules',            prompt: 'Make your agent rules.' }
];

const REVEAL_ICON = '🗂️';

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
  missionIndex: 0,    // 0..5 for m1..m6
  onReveal: false,    // true while the Reveal screen is open
  muted: false,
  motion: 'full',     // 'full' | 'calm' | 'off' (used from Milestone 8)
  pinEntry: ''        // digits typed so far on the PIN pad
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
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 500);
}

async function saveNow() {
  if (!state.agent) return;
  clearTimeout(saveTimer);
  try {
    await Storage.saveAgent(state.agent);
    await Storage.setMeta('lastAgentId', state.agent.id);
  } catch (err) {
    console.error('Save failed', err);
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

function maxUnlockedIndex() {
  let furthest = state.onReveal ? MISSIONS.length : state.missionIndex;
  MISSIONS.forEach((m, i) => {
    if (state.agent && state.agent.missions[m.id] !== 'todo' && i > furthest) furthest = i;
  });
  // The Reveal unlocks once the last mission has been stamped or passed.
  if (state.agent && state.agent.missions.m6 !== 'todo') furthest = MISSIONS.length;
  return furthest;
}

function renderStrip() {
  if (!state.agent) return;
  const unlocked = maxUnlockedIndex();

  // There is one strip per screen that needs it, so render into all of them.
  $$('[data-strip]').forEach(strip => {
    strip.innerHTML = '';

    MISSIONS.forEach((mission, index) => {
      const status  = state.agent.missions[mission.id];   // done | passed | todo
      const isNow   = state.screen === 'mission' && index === state.missionIndex;
      const locked  = index > unlocked;

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
      button.disabled = locked;

      // Spec §6: tapping a done or passed icon goes back to that mission.
      if (!locked) {
        button.addEventListener('click', () => goToMission(index, 'back_to'));
      }
      strip.appendChild(button);
    });

    // The Reveal sits at the end of the strip.
    const revealLocked = unlocked < MISSIONS.length;
    const revealBtn = document.createElement('button');
    revealBtn.className = 'pip pip-reveal ' +
      (revealLocked ? 'is-locked' : (state.onReveal ? 'is-current' : 'is-open'));
    revealBtn.innerHTML = revealLocked
      ? '<span class="pip-icon">🔒</span><span class="pip-q">?</span>'
      : '<span class="pip-icon">' + REVEAL_ICON + '</span>';
    revealBtn.disabled = revealLocked;
    revealBtn.setAttribute('aria-label', revealLocked ? 'Locked' : 'Agent ID card');
    if (!revealLocked) revealBtn.addEventListener('click', openReveal);
    strip.appendChild(revealBtn);
  });
}


/* ==========================================================================
   8. AGENT PREVIEW (spec §6: always visible)
   In Milestone 0 there is no artwork yet, so the preview shows the codename
   emoji. From Milestone 1 it will draw the real agent.
   ========================================================================== */

function renderPreview() {
  if (!state.agent) return;
  $('#preview-emoji').textContent = state.agent.codenameEmoji || '🕵️';
  $('#preview-name').textContent  = state.agent.codename || '';
  $('#reveal-emoji').textContent  = state.agent.codenameEmoji || '🕵️';
  $('#reveal-name').textContent   = state.agent.codename || '';

  // From Milestone 1 the thumbnail shows the agent itself. Until anything has
  // been drawn there is nothing to show, so the codename emoji stands in.
  //
  // Milestone 2: there are now two versions of the agent, so the thumbnail has
  // to pick one. While an editor is open it mirrors whatever is being edited,
  // so the thumbnail and the stage never disagree. Anywhere else it shows the
  // Boost if one exists, because that is the agent's latest self.
  const editorOpen = !$('#editor').hidden;
  const boost = state.agent.boost || {};
  const shown = editorOpen ? (state.agent[editor.part] || {})
                           : (hasArt(boost) ? boost : (state.agent.cover || {}));
  const anyArt = hasArt(shown);
  $('#preview-art').classList.toggle('has-art', anyArt);
  if (anyArt) renderAgentView($('#preview-view'), shown, false);
}


/* ==========================================================================
   9. START SCREEN - the codename roller
   ========================================================================== */

// What the Start screen is currently offering, before an agent exists.
let pendingCodename = { codename: '', emoji: '' };

function rollCodename() {
  const animal = pick(ANIMALS);
  pendingCodename = {
    codename: pick(ADJECTIVES) + ' ' + animal.name,
    emoji: animal.emoji
  };
  paintCodename();

  // If the child re-rolls while an agent already exists, update and log it.
  if (state.agent) {
    state.agent.codename      = pendingCodename.codename;
    state.agent.codenameEmoji = pendingCodename.emoji;
    logEvent('codename_roll', { codename: pendingCodename.codename });
    renderPreview();
  }
}

function paintCodename() {
  $('#codename-emoji').textContent = pendingCodename.emoji;
  $('#codename-text').textContent  = pendingCodename.codename;
}

// A brand new agent, shaped exactly like spec §8.
function makeAgent() {
  return {
    id: uuid(),
    codename: pendingCodename.codename,
    codenameEmoji: pendingCodename.emoji,
    codenameAudioId: null,
    createdAt: nowIso(),
    door: null,
    cover: { pixels: [], shapes: [], drawingPng: null, stickers: [] },
    boost: { pixels: [], shapes: [], drawingPng: null, stickers: [], aura: null, background: null },
    feelingCodes: [],
    feelingWorn: null,
    voice: { audioId: null, filter: 'normal', yesClips: [] },
    places: {
      justMe: { cover: false, boost: false, feeling: false, voice: false, codename: false },
      badge:  { cover: false, boost: false, feeling: false, voice: false, codename: false },
      class:  { cover: false, boost: false, feeling: false, voice: false, codename: false },
      wall:   { cover: false, boost: false, feeling: false, voice: false, codename: false },
      home:   { cover: false, boost: false, feeling: false, voice: false, codename: false }
    },
    rules: { dont: [], can: [], upset: [] },
    missing: [],
    missions: { m1: 'todo', m2: 'todo', m3: 'todo', m4: 'todo', m5: 'todo', m6: 'todo' },
    events: []
  };
}

async function startNewAgent() {
  if (!pendingCodename.codename) rollCodename();
  state.agent = makeAgent();
  state.onReveal = false;
  await saveNow();
  logEvent('agent_create', { codename: state.agent.codename });
  goToMission(0, 'mission_enter');
}

// Spec §7: Continue resumes the last UNFINISHED agent only.
async function continueAgent() {
  const lastId = await Storage.getMeta('lastAgentId', null);
  if (!lastId) return;
  const agent = await Storage.loadAgent(lastId);
  if (!agent) return;

  state.agent = agent;
  state.onReveal = false;
  pendingCodename = { codename: agent.codename, emoji: agent.codenameEmoji };

  // Drop the child back on the first mission they have not finished.
  let index = MISSIONS.findIndex(m => agent.missions[m.id] === 'todo');
  if (index === -1) index = MISSIONS.length - 1;
  goToMission(index, 'mission_enter');
}

// Decide whether to offer Continue, by checking for an unfinished agent.
async function refreshContinueButton() {
  const lastId = await Storage.getMeta('lastAgentId', null);
  let show = false;
  if (lastId) {
    const agent = await Storage.loadAgent(lastId);
    if (agent) {
      // "Unfinished" = at least one mission still todo.
      show = MISSIONS.some(m => agent.missions[m.id] === 'todo');
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

  // Each mission gets a chance to set itself up as it opens.
  if (mission.id === 'm1') enterMission1();
  else if (mission.id === 'm2') enterMission2();
  else hideEditor();        // every other mission: put the shared editor away

  if (mission.id === 'm3') enterMission3();
  if (mission.id === 'm5') enterMission5();
  if (mission.id === 'm6') enterMission6();
  if (mission.id === 'm4') enterMission4();
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

function advance() {
  saveNow();
  if (state.missionIndex < MISSIONS.length - 1) {
    goToMission(state.missionIndex + 1, 'mission_enter');
  } else {
    openReveal();
  }
}

// Spec §5a: the stamp lands with a thud and a few sparkles.
function playStampFeedback() {
  const button = $('#btn-stamp');
  button.classList.remove('stamp-kick');
  void button.offsetWidth;           // forces the browser to restart the animation
  button.classList.add('stamp-kick');
  playSfx('stamp');
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

async function finishSession() {
  logEvent('finish', {});
  await saveNow();
  state.agent = null;
  state.onReveal = false;
  showScreen('start');
  rollCodename();
  await refreshContinueButton();
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
  paintMuteButtons();
  paintMotionButtons();
  $('#export-result').innerHTML = '';
  $('#delete-confirm').hidden = true;
}

async function renderAgentList() {
  const list   = $('#agent-list');
  const agents = await Storage.listAgents();

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
      '<span class="agent-thumb">' + (agent.codenameEmoji || '🕵️') + '</span>' +
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
      pendingCodename = { codename: agent.codename, emoji: agent.codenameEmoji };
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
async function exportAll() {
  const result = $('#export-result');
  result.textContent = 'Building file…';

  try {
    const agents = await Storage.listAgents();
    const clips  = (await Storage.listAudio()) || [];

    // Turn each audio Blob into base64 text so it fits inside JSON.
    const audio = {};
    for (const clip of clips) audio[clip.id] = await blobToDataUrl(clip.blob);

    const payload = {
      app: 'Agent Lab',
      exportedAt: nowIso(),
      milestone: MILESTONE,
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
    result.appendChild(link);

  } catch (err) {
    console.error(err);
    result.textContent = 'Export failed: ' + err.message;
  }
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

function paintMotionButtons() {
  $$('[data-motion]').forEach(button => {
    button.classList.toggle('is-on', button.dataset.motion === state.motion);
  });
}


/* ==========================================================================
   13. BOOT - wire up every button, then open the Start screen
   ========================================================================== */

function wireUp() {

  // --- Start screen ---
  $('#btn-roll').addEventListener('click', rollCodename);
  $('#btn-new').addEventListener('click', startNewAgent);
  $('#btn-continue').addEventListener('click', continueAgent);

  $('#btn-codename-mic').addEventListener('click', () => {
    toast('Recording arrives in Milestone 3');
  });

  // Typing a codename instead of rolling one (spec §7).
  $('#btn-type').addEventListener('click', () => {
    $('#type-input').value = pendingCodename.codename;
    $('#type-overlay').hidden = false;
    $('#type-input').focus();
  });
  $('#btn-type-cancel').addEventListener('click', () => {
    $('#type-overlay').hidden = true;
  });
  $('#btn-type-ok').addEventListener('click', () => {
    const typed = $('#type-input').value.trim();
    if (typed) {
      pendingCodename.codename = typed;
      paintCodename();
      if (state.agent) {
        state.agent.codename = typed;
        logEvent('codename_type', {});
        renderPreview();
      }
    }
    $('#type-overlay').hidden = true;
  });

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
  wireMission1();
  wireDoors();
  wireMission2();
  wireMission3();
  wireMission4();
  wireMission5();
  wireMission6();
  wireReveal();
  wirePolish();
  $('#btn-stamp').addEventListener('click', stampMission);
  $('#btn-pass').addEventListener('click', passMission);
  $('#btn-finish').addEventListener('click', finishSession);

  // --- global buttons (there is one of each per screen) ---
  $$('[data-mute]').forEach(b => b.addEventListener('click', toggleMute));
  $$('[data-missing]').forEach(b => b.addEventListener('click', openMissing));
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
  });
  $('#btn-export').addEventListener('click', exportAll);
  $$('[data-motion]').forEach(b =>
    b.addEventListener('click', () => setMotion(b.dataset.motion)));

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

async function boot() {
  wireUp();

  // Load saved settings.
  state.muted  = await Storage.getMeta('muted', false);
  state.motion = await Storage.getMeta('motion', null);

  // Spec §5a: default to Full, or Calm if the iPad has Reduce Motion switched on.
  if (!state.motion) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    state.motion = reduce ? 'calm' : 'full';
  }
  document.body.dataset.motion = state.motion;
  Voice.setMuted(state.muted);
  paintMuteButtons();
  paintMotionButtons();

  // Milestone 9: offline support.
  registerServiceWorker();

  // Spec §3: ask iOS to keep our data.
  const persistence = await Storage.requestPersistence();
  $('#storage-state').textContent =
    'Storage persistence: ' + persistence +
    (window.navigator.standalone ? ' · opened from home screen ✅'
                                 : ' · opened in Safari (separate storage) ⚠️');

  // Milestone 9: say plainly whether offline actually works on this iPad.
  // Registration is asynchronous, so the first read is usually "installing".
  // Reading again a second later gives the adult panel the real answer.
  async function showOffline() {
    const base = $('#storage-state').textContent.split('\nOffline:')[0];
    $('#storage-state').textContent = base + '\nOffline: ' + (await offlineState());
  }
  await showOffline();
  setTimeout(showOffline, 1500);

  rollCodename();
  await refreshContinueButton();
  showScreen('start');
}

// DOMContentLoaded fires once the HTML is parsed, so every element exists.
document.addEventListener('DOMContentLoaded', boot);


/* ==========================================================================
   14. MISSION 1 - PIXEL DOOR + STICKER LAYER (added in Milestone 1)
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

// The sticker tray, in the categories the spec lists (§7).
const STICKER_TABS = [
  { id: 'head',   label: 'Head',   emoji: ['🎩','🧢','👑','⛑️','🎀','🪖'] },
  { id: 'face',   label: 'Face',   emoji: ['👓','🕶️','🥸','😷'] },
  { id: 'ears',   label: 'Ears',   emoji: ['🎧','🦻'] },
  { id: 'moving', label: 'Moving', emoji: ['🦽','🦼','🦯','🛴','🛹'] },
  { id: 'pets',   label: 'Pets',   emoji: ['🐱','🐶','🐉','🦊','🐸','🦜'] },
  { id: 'things', label: 'Things', emoji: ['⚽','🎮','🎨','📚','🎵','🧸'] },
  // Powers only appear on the Boost (spec §7, Mission 2), so this tab is
  // filtered out while Mission 1's Cover is being edited.
  { id: 'powers', label: 'Powers', boostOnly: true,
    emoji: ['⚡','🔥','❄️','🌈','⭐','🪽','💥','🛡️','🧲','🌀'] }
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

const BACKGROUNDS = [
  { id: 'plain',  icon: '⬜', label: 'Plain'  },
  { id: 'space',  icon: '🪐', label: 'Space'  },
  { id: 'city',   icon: '🏙️', label: 'City'   },
  { id: 'jungle', icon: '🌴', label: 'Jungle' },
  { id: 'sea',    icon: '🌊', label: 'Sea'    },
  { id: 'sunset', icon: '🌅', label: 'Sunset' }
];

// Editor state that is NOT part of the saved agent - it is just what the
// child is doing right now, so it never needs storing.
const editor = {
  part: 'cover',        // 'cover' now; Mission 2 will point this at 'boost'
  tool: 'paint',        // 'paint' | 'erase' | 'fill'
  colour: PALETTE[9],   // the red, a friendly starting colour
  tab: 'head',
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
   'cover' in Mission 1, 'boost' in Mission 2.
   ------------------------------------------------------------------------ */
function part() {
  return state.agent[editor.part];
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
  // The Draw door keeps whole-canvas snapshots instead, because a brush stroke
  // is not a list of things the way pixels and shapes are.
  if (state.agent && state.agent.door === 'draw') {
    undoCode();
    saveDoorDrawing();
    return;
  }

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
function renderAgentView(view, data, interactive, door) {
  // MILESTONE 2: the Boost carries a background and an aura. Both are pure CSS,
  // set here as an attribute and a custom property, so the same function draws
  // a plain Cover and a glowing Boost in a space scene.
  view.dataset.bg = data.background || 'plain';
  const aura = AURAS.find(a => a.id === data.aura);
  view.style.setProperty('--aura', aura && aura.colour ? aura.colour : 'transparent');
  view.classList.toggle('has-aura', Boolean(aura && aura.colour));

  /* MILESTONE 7: there are three doors now, and each keeps its own work
     (spec §7). Only the chosen one is shown - otherwise a child who tried
     Pixel, then switched to Draw, would see both at once. */
  const which = door || (state.agent && state.agent.door) || 'pixel';
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
    if (which === 'build') {
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
    el.textContent = sticker.emoji;
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
  if (cover && editor.part === 'boost') renderAgentView(cover, state.agent.cover || {}, false);

  renderPreview();
  paintStickerControls();
}


/* ---------------------------------------------------------------------------
   THE DOORS
   Each door keeps its own work, because the data model has separate places for
   pixels, shapes and a drawing. Switching back and forth loses nothing.
   ------------------------------------------------------------------------ */
function showDoors() {
  $('#m1-doors').hidden = false;
  moveEditorTo('#m1-editor-mount');
  $('#editor').hidden = true;
  $$('#m1-doors .door-card').forEach(card => {
    card.classList.toggle('is-chosen', state.agent && state.agent.door === card.dataset.door);
  });
}

function chooseDoor(door) {
  const switching = state.agent.door && state.agent.door !== door;
  state.agent.door = door;
  logEvent(switching ? 'door_switch' : 'door_choose', { door: door });
  openEditor('#m1-editor-mount', 'cover');
  scheduleSave();
}

/* Open the editor inside the mission that asked for it.
   `mountSelector` says where to put it; `which` is 'cover' or 'boost'. */
function openEditor(mountSelector, which) {
  editor.part = which || 'cover';
  ensurePixels();
  editor.selected = null;
  editor.undoStack = [];        // undo never reaches back into another mission

  if (mountSelector === '#m1-editor-mount') $('#m1-doors').hidden = true;
  moveEditorTo(mountSelector || '#m1-editor-mount');

  // The Boost's two extra tabs, and the Door button, which only Mission 1 has.
  const isBoost = editor.part === 'boost';
  $$('[data-boost-only]').forEach(el => { el.hidden = !isBoost; });
  $('#btn-change-door').hidden = isBoost;

  /* MILESTONE 7: only the chosen door's tab is offered. A child in the Draw
     door has no use for a pixel palette, and three unusable tabs would just
     be three more things to get wrong. */
  const door = (state.agent.door) || 'pixel';
  $$('[data-door-only]').forEach(el => { el.hidden = el.dataset.doorOnly !== door; });
  $('#door-canvas').hidden = door !== 'draw';
  editor.selectedShape = null;

  const tabCount = 2 + (isBoost ? 2 : 0);
  $('.rail-tabs').classList.toggle('is-four', tabCount > 2);

  if (door === 'draw') openDrawDoor();
  else { coder.onStroke = null; }
  if (door === 'build') buildShapeTray();

  setRail(door === 'pixel' ? 'paint' : door);
  paintPalette();
  paintToolButtons();
  buildStickerTray();
  paintShapeControls();
  if (door === 'build') paintPalette('#build-palette');
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

  // Only the Pixel door paints on the stage. Build has its shapes, and Draw
  // has its own canvas on top, which takes the pointer events itself.
  if (state.agent && state.agent.door !== 'pixel') {
    if (editor.selectedShape !== null) {
      editor.selectedShape = null;
      refreshAgentViews();
      paintShapeControls();
    }
    return;
  }

  // Tapping bare canvas clears the selection.
  if (editor.selected !== null) {
    editor.selected = null;
    refreshAgentViews();
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
  if (door === 'build') p.shapes = [];
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
  ['paint', 'build', 'draw', 'stickers', 'aura', 'background'].forEach(name => {
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

      // On the Build door the palette doubles as "recolour this shape".
      if (state.agent && state.agent.door === 'build') {
        buildShapeTray();
        if (editor.selectedShape !== null) shapeAction('colour');
      }
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
function buildStickerTray() {
  const tabs = $('#sticker-tabs');
  tabs.innerHTML = '';

  // Powers belong to the Boost only, so drop that tab in Mission 1. If the
  // child left the tray on Powers and then went back to Mission 1, move them
  // to a tab that still exists.
  const visibleTabs = STICKER_TABS.filter(t => !t.boostOnly || editor.part === 'boost');
  if (!visibleTabs.some(t => t.id === editor.tab)) editor.tab = visibleTabs[0].id;

  visibleTabs.forEach(tab => {
    const button = document.createElement('button');
    button.className = 'btn seg' + (tab.id === editor.tab ? ' is-on' : '');
    button.textContent = tab.label;
    button.addEventListener('click', () => { editor.tab = tab.id; buildStickerTray(); });
    tabs.appendChild(button);
  });

  const tray = $('#sticker-tray');
  tray.innerHTML = '';
  const current = visibleTabs.find(t => t.id === editor.tab);
  current.emoji.forEach(emoji => {
    const button = document.createElement('button');
    button.className = 'tray-sticker';
    button.textContent = emoji;
    button.setAttribute('aria-label', 'Sticker ' + emoji);
    button.addEventListener('pointerdown', event => startTrayDrag(event, emoji));
    tray.appendChild(button);
  });
}

function addSticker(emoji, x, y) {
  pushUndo();
  const p = ensurePixels();
  p.stickers.push({ emoji: emoji, x: x, y: y, scale: 1, rotation: 0 });
  editor.selected = p.stickers.length - 1;
  logEvent('sticker_add', { emoji: emoji });
  playSfx('pop');
  refreshAgentViews();

  // Spec §5a: the sticker lands with a bounce.
  const landed = $('.sticker-layer .sticker:last-child', stage());
  if (landed) landed.classList.add('just-landed');
  scheduleSave();
}

/* Dragging out of the tray. A "ghost" emoji follows the finger; letting go
   over the agent drops it there. A quick tap that barely moves drops it in
   the middle instead, which is far easier for a child who finds dragging hard. */
function startTrayDrag(event, emoji) {
  event.preventDefault();
  const tray = event.currentTarget;
  // Pointer capture keeps the move and up events coming to the tray button even
  // once the finger has slid away from it. It can throw if the pointer has
  // already gone, and a thrown error here would strand the ghost on screen.
  try { tray.setPointerCapture(event.pointerId); } catch (err) { /* harmless */ }

  const ghost = document.createElement('span');
  ghost.className = 'sticker-ghost';
  ghost.textContent = emoji;
  ghost.style.left = event.clientX + 'px';
  ghost.style.top  = event.clientY + 'px';
  document.body.appendChild(ghost);

  const startX = event.clientX, startY = event.clientY;

  function move(e) {
    ghost.style.left = e.clientX + 'px';
    ghost.style.top  = e.clientY + 'px';
  }

  function up(e) {
    tray.removeEventListener('pointermove', move);
    tray.removeEventListener('pointerup', up);
    tray.removeEventListener('pointercancel', up);
    ghost.remove();

    const moved = Math.hypot(e.clientX - startX, e.clientY - startY);
    const stageEl = stage();
    const rect = stageEl.getBoundingClientRect();
    const insideStage =
      e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top  && e.clientY <= rect.bottom;

    if (insideStage) {
      addSticker(emoji, (e.clientX - rect.left) / rect.width,
                        (e.clientY - rect.top) / rect.height);
    } else if (moved < 12) {
      addSticker(emoji, 0.5, 0.5);        // a tap: drop it in the middle
    }
  }

  tray.addEventListener('pointermove', move);
  tray.addEventListener('pointerup', up);
  tray.addEventListener('pointercancel', up);
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
  paintSelection();

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
    if (moved) { logEvent('sticker_move', { emoji: el.textContent }); scheduleSave(); }
  }

  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
}

// The ➕ ➖ ↻ 🗑️ row, shown only while a sticker is selected.
function paintStickerControls() {
  const controls = $('#sticker-controls');
  if (!controls) return;
  controls.hidden = editor.selected === null;
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
    logEvent('sticker_remove', { emoji: sticker.emoji });
  }
  refreshAgentViews();
  scheduleSave();
}


/* ---------------------------------------------------------------------------
   Wiring Mission 1 up. Called once, from wireUp().
   ------------------------------------------------------------------------ */
function wireMission1() {
  watchAgentView(stage());
  watchAgentView($('#preview-view'));

  $$('#m1-doors .door-card').forEach(card => {
    card.addEventListener('click', () => chooseDoor(card.dataset.door));
  });

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
  $$('[data-sticker]').forEach(b =>
    b.addEventListener('click', () => stickerAction(b.dataset.sticker)));

  $('#btn-undo').addEventListener('click', undo);
  $('#btn-clear').addEventListener('click', clearAll);
  $('#btn-change-door').addEventListener('click', showDoors);
}

// Called by goToMission whenever Mission 1 opens: show the doors, or go
// straight back into the editor if a door was already chosen.
function enterMission1() {
  if (!state.agent) return;
  ensurePixels();
  if (state.agent.door) openEditor('#m1-editor-mount', 'cover');
  else showDoors();
}


/* ==========================================================================
   15. MISSION 2 - BOOST (added in Milestone 2)
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
  return (partData.pixels || []).some(Boolean) || (partData.stickers || []).length > 0;
}

/* Copy the Cover across to make the starting Boost.
   Only ever done once, and only if the Boost is still empty - otherwise a
   child who came back to Mission 2 would find their boost work overwritten.

   slice() copies the pixel array, and the stickers are copied one by one with
   Object.assign, so that moving a sticker on the Boost cannot also move it on
   the Cover. (Without that, both halves would point at the same objects.) */
function copyCoverToBoost() {
  const cover = state.agent.cover || {};
  const boost = state.agent.boost;

  if (hasArt(boost) || !hasArt(cover)) return false;

  boost.pixels   = (cover.pixels || []).slice();
  boost.stickers = (cover.stickers || []).map(s => Object.assign({}, s));
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
    button.className = 'swatch' + (state.agent.boost.aura === aura.id ? ' is-on' : '');
    // The "no glow" option is a crossed-out swatch rather than a colour.
    if (aura.colour) button.style.background = aura.colour;
    else { button.classList.add('swatch-none'); button.textContent = '🚫'; }
    button.setAttribute('aria-label', aura.label);
    button.addEventListener('click', () => setAura(aura.id));
    box.appendChild(button);
  });
}

function setAura(id) {
  state.agent.boost.aura = id;
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
function paintBackgroundOptions() {
  const box = $('#background-options');
  box.innerHTML = '';
  BACKGROUNDS.forEach(bg => {
    const button = document.createElement('button');
    const chosen = (state.agent.boost.background || 'plain') === bg.id;
    button.className = 'bg-option' + (chosen ? ' is-on' : '');
    button.dataset.bg = bg.id;          // the gradient is picked by this attribute
    button.innerHTML = '<span class="bg-icon">' + bg.icon + '</span>' +
                       '<span class="bg-label">' + bg.label + '</span>';
    button.setAttribute('aria-label', bg.label);
    button.addEventListener('click', () => setBackground(bg.id));
    box.appendChild(button);
  });
}

function setBackground(id) {
  state.agent.boost.background = id;
  logEvent('background_choose', { background: id });
  paintBackgroundOptions();
  refreshAgentViews();
  scheduleSave();
}

/* ---------------------------------------------------------------------------
   Wiring Mission 2 up. Called once, from wireUp().
   ------------------------------------------------------------------------ */
function wireMission2() {
  watchAgentView($('#m2-cover'));
}

// Called by goToMission whenever Mission 2 opens.
function enterMission2() {
  if (!state.agent) return;

  // Make sure boost has its arrays before anything reads them.
  if (!Array.isArray(state.agent.boost.pixels)) state.agent.boost.pixels = [];
  if (!Array.isArray(state.agent.boost.stickers)) state.agent.boost.stickers = [];

  const copied = copyCoverToBoost();
  if (copied) scheduleSave();

  openEditor('#m2-editor-mount', 'boost');

  // Spec §5a: the power-up plays once when Mission 2 opens. A moment later,
  // so the editor has been laid out and the stage is where it will stay.
  setTimeout(playBoostPowerUp, 350);
}


/* ==========================================================================
   16. MISSION 4 - VOICE PASSWORD (added in Milestone 3)
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
     this file  keeps `agent.voice = { audioId, filter, yesClips }` and drives
                the buttons.

   WHY THE BLOB IS HELD IN MEMORY TOO
   `voiceClip` below is the Blob we just recorded or loaded. Keeping it saves
   fetching it out of IndexedDB on every single play.
   ========================================================================== */

// The recording currently loaded, and the three bonus clips, as Blobs.
let voiceClip = null;
let yesClips = [null, null, null];

// Which slot is recording right now: 'main', or 0/1/2 for a Yes slot.
let recordingSlot = null;

// The ring is a circle of this length; shortening the dash fills it up.
const RING_LENGTH = 2 * Math.PI * 54;      // r=54 in the SVG


/* ---------------------------------------------------------------------------
   DRAWING THE SCREEN
   One function paints the whole mission from the agent's data, so there is
   never a half-updated screen to reason about.
   ------------------------------------------------------------------------ */
function renderMission4() {
  if (!state.agent) return;
  const voice = state.agent.voice;
  const hasClip = Boolean(voice.audioId && voiceClip);

  // Steps 2 and 3 only exist once something has been recorded.
  $('#m4-after').hidden = !hasClip;
  $('#m4-yes-block').hidden = !hasClip;

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
  paintYesSlots();
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

/* The three bonus "yes" slots (spec §7). Each is record, or play-and-redo. */
function paintYesSlots() {
  const row = $('#m4-yes');
  if (!row) return;
  row.innerHTML = '';

  for (let i = 0; i < 3; i++) {
    const slot = document.createElement('div');
    slot.className = 'yes-slot';

    const filled = Boolean(state.agent.voice.yesClips[i] && yesClips[i]);
    const busy   = recordingSlot === i;

    const main = document.createElement('button');
    main.className = 'btn tool yes-btn' + (busy ? ' is-recording' : '');
    main.innerHTML = '<span class="filter-icon">' +
                     (busy ? '⏹️' : filled ? '▶️' : '🎤') + '</span>' +
                     '<span class="tool-word">Yes ' + (i + 1) + '</span>';
    main.setAttribute('aria-label',
      busy ? 'Stop recording yes ' + (i + 1)
           : filled ? 'Play yes ' + (i + 1) : 'Record yes ' + (i + 1));
    main.addEventListener('click', () => {
      if (busy) Voice.stop();
      else if (filled) playYes(i);
      else recordYes(i);
    });
    slot.appendChild(main);

    // A filled slot also gets a small redo button under it.
    if (filled && !busy) {
      const redo = document.createElement('button');
      redo.className = 'btn yes-redo';
      redo.textContent = '🔄';
      redo.setAttribute('aria-label', 'Record yes ' + (i + 1) + ' again');
      redo.addEventListener('click', () => recordYes(i));
      slot.appendChild(redo);
    }

    row.appendChild(slot);
  }
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
  renderMission4();
  logEvent(hadClip ? 'rerecord' : 'record_start', {});

  try {
    const result = await Voice.record({ onTick: setRing });
    await saveVoiceClip(result.blob, result.ms);
  } catch (err) {
    micFailed(err);
  }

  recordingSlot = null;
  setRing(0);
  renderMission4();
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
  renderMission4();
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
   THE BONUS "YES x3" SLOTS (spec §7)
   The same recorder, into agent.voice.yesClips instead.
   ------------------------------------------------------------------------ */
async function recordYes(index) {
  Voice.unlock();
  if (recordingSlot !== null) { Voice.stop(); return; }
  if (!Voice.canRecord()) {
    showTrouble('This iPad cannot record. Tap Pass to carry on.');
    return;
  }

  Voice.stopPlayback();
  recordingSlot = index;
  renderMission4();
  logEvent('record_start', { slot: 'yes' + (index + 1) });

  try {
    const result = await Voice.record({ onTick: () => {} });
    const oldId = state.agent.voice.yesClips[index];

    const id = uuid();
    await Storage.saveAudio(id, result.blob);
    state.agent.voice.yesClips[index] = id;
    yesClips[index] = result.blob;

    if (oldId) { Voice.forget(oldId); await Storage.deleteAudio(oldId); }

    logEvent('record_stop', { slot: 'yes' + (index + 1), ms: Math.round(result.ms) });
    scheduleSave();
  } catch (err) {
    micFailed(err);
  }

  recordingSlot = null;
  renderMission4();
}

async function playYes(index) {
  const id = state.agent.voice.yesClips[index];
  if (!id || !yesClips[index]) return;
  Voice.unlock();
  try {
    await Voice.play(id, yesClips[index], state.agent.voice.filter || 'normal');
    logEvent('filter_play', { slot: 'yes' + (index + 1) });
  } catch (err) { /* a clip that will not decode is not worth a popup */ }
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
function wireMission4() {
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
async function enterMission4() {
  if (!state.agent) return;
  const voice = state.agent.voice;

  hideTrouble();
  voiceClip = null;
  yesClips = [null, null, null];

  if (voice.audioId) {
    const row = await Storage.loadAudio(voice.audioId);
    voiceClip = row ? row.blob : null;
    // A recording that has already been heard keeps its voices on show.
    $('#m4-filters-block').hidden = !voiceClip;
  } else {
    $('#m4-filters-block').hidden = true;
  }

  for (let i = 0; i < 3; i++) {
    const id = voice.yesClips[i];
    if (!id) continue;
    const row = await Storage.loadAudio(id);
    yesClips[i] = row ? row.blob : null;
  }

  renderMission4();
}


/* ==========================================================================
   17. MISSION 3 - SECRET FEELING CODE (added in Milestone 4)
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
function renderMission3() {
  if (!state.agent) return;
  const codes = state.agent.feelingCodes;

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
        '<img class="m3-slot-img" alt="" src="' + code.png + '">' +
        '<span class="m3-slot-tags">' +
          (code.face ? '<span>' + code.face + '</span>' : '') +
          (code.audioId ? '<span>🎤</span>' : '') +
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

  const codes = state.agent.feelingCodes;
  const worn = state.agent.feelingWorn;

  codes.forEach((code, i) => {
    const button = document.createElement('button');
    button.className = 'm3-worn-option' + (worn === i ? ' is-on' : '');
    button.innerHTML = '<img class="m3-worn-img" alt="" src="' + code.png + '">';
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
  state.agent.feelingWorn = index;
  logEvent('feeling_worn', { index: index });
  renderWornRow();
  renderPreview();
  scheduleSave();
}


/* ---------------------------------------------------------------------------
   THE MAKER
   ------------------------------------------------------------------------ */
function openCoder(index) {
  const existing = state.agent.feelingCodes[index];

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
  renderMission3();
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
      where: coder.canvas.id === 'm3-canvas' ? 'feeling_code'
           : coder.canvas.id === 'door-canvas' ? 'draw_door' : 'rule',
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
      // On the Build door the palette is also "change this shape's colour".
      if (selector === '#build-palette') {
        editor.colour = colour;
        buildShapeTray();
        if (editor.selectedShape !== null) shapeAction('colour');
      }
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
    const oldId = coder.draft.audioId;

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
  const codes = state.agent.feelingCodes;
  const isNew = !codes[index];

  coder.draft.png = coder.canvas.toDataURL('image/png');

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
  if (isNew && state.agent.feelingWorn === null) state.agent.feelingWorn = codes.length - 1;

  closeCoder();
  scheduleSave();
}

async function removeCode() {
  const index = coder.index;
  const codes = state.agent.feelingCodes;
  const code = codes[index];
  if (!code) { closeCoder(); return; }

  if (code.audioId) { Voice.forget(code.audioId); await Storage.deleteAudio(code.audioId); }
  codes.splice(index, 1);

  // The worn code may have been the one removed, or may have shuffled down.
  if (state.agent.feelingWorn === index) state.agent.feelingWorn = null;
  else if (state.agent.feelingWorn > index) state.agent.feelingWorn--;

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

function wireMission3() {
  attachBrush($('#m3-canvas'));

  $('#m3-undo').addEventListener('click', undoCode);
  $('#m3-clear').addEventListener('click', clearCode);
  $('#m3-mic').addEventListener('click', recordCodeName);
  $('#m3-ideas').addEventListener('click', openIdeas);
  $('#m3-done').addEventListener('click', keepCode);
  $('#m3-delete').addEventListener('click', removeCode);
}

// Called by goToMission whenever Mission 3 opens.
function enterMission3() {
  if (!state.agent) return;
  // Always arrive on the slots, never mid-edit from last time.
  $('#m3-maker').hidden = true;
  $('#m3-slots-view').hidden = false;
  coder.index = null;
  coder.draft = null;
  previewMove(null);
  renderMission3();
}


/* ==========================================================================
   18. MISSION 5 - WHERE DOES MY AGENT GO? (added in Milestone 5)
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
function renderMission5() {
  if (!state.agent) return;
  const row = $('#m5-cards');
  row.innerHTML = '';

  PLACES.forEach(place => {
    const chosen = state.agent.places[place.id] || {};
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
  renderMission5();
}

/* The five big on/off switches on the back of a card. */
function paintPartToggles() {
  const box = $('#m5-parts');
  box.innerHTML = '';
  const chosen = state.agent.places[openPlace] || {};

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
  const places = state.agent.places;
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
function wireMission5() {
  $('#m5-done').addEventListener('click', closePlaceCard);
}

function enterMission5() {
  if (!state.agent) return;
  // Always arrive on the cards, never mid-flip from last time.
  $('#m5-detail').hidden = true;
  $('#m5-cards-view').hidden = false;
  openPlace = null;
  renderMission5();
}


/* ==========================================================================
   19. MISSION 6 - AGENT RULES (added in Milestone 5)
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


function renderMission6() {
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
  renderMission6();
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
function wireMission6() {
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

function enterMission6() {
  if (!state.agent) return;
  $('#m6-detail').hidden = true;
  $('#m6-cards-view').hidden = false;
  $('#draw-overlay').hidden = true;
  openRule = null;
  renderMission6();
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
                     coverDrawing: null, boostDrawing: null };

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
  $('#reveal-emoji').textContent = agent.codenameEmoji || '🕵️';

  // The two agents.
  renderAgentView($('#reveal-cover'), agent.cover || {}, false);
  renderAgentView($('#reveal-boost'), agent.boost || {}, false);

  // The feeling code being worn, if there is one.
  const worn = agent.feelingCodes[agent.feelingWorn];
  const feelingBox = $('#reveal-feeling');
  feelingBox.innerHTML = worn
    ? '<img alt="" src="' + worn.png + '">' +
      (worn.face ? '<span class="dossier-face">' + worn.face + '</span>' : '')
    : '<span class="dossier-none">none</span>';

  // The voice password, in whichever voice was chosen.
  const filter = Voice.FILTERS.find(f => f.id === (agent.voice.filter || 'normal'));
  $('#reveal-voice-name').textContent = agent.voice.audioId
    ? (filter ? filter.label : 'Normal')
    : 'none';
  $('#reveal-play').disabled = !agent.voice.audioId;

  renderRevealRules();

  // Fetch everything the Save button will need, now rather than on the tap.
  await preloadCardAssets();
}

function renderRevealRules() {
  const box = $('#reveal-rules');
  box.innerHTML = '';

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

  const worn = agent.feelingCodes[agent.feelingWorn];
  cardAssets.feeling = await loadImage(worn ? worn.png : null);

  // Milestone 7: the Draw door's picture has to be loaded too, or a child who
  // used Draw would get a blank agent on the saved card.
  cardAssets.coverDrawing = await loadImage((agent.cover || {}).drawingPng);
  cardAssets.boostDrawing = await loadImage((agent.boost || {}).drawingPng);

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

async function playRevealVoice() {
  const agent = state.agent;
  if (!agent.voice.audioId || !cardAssets.voiceBlob) return;
  Voice.unlock();
  logEvent('reveal_play', { filter: agent.voice.filter || 'normal' });
  const art = $('#reveal-boost') || $('#reveal-cover');
  try {
    await Voice.play(agent.voice.audioId, cardAssets.voiceBlob,
                     agent.voice.filter || 'normal',
                     () => stopVoiceBounce(art));
    startVoiceBounce(art);     // spec §5a item 2
  } catch (err) { toast('That recording would not play'); }
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
  ctx.fillText(agent.codenameEmoji || '🕵️', 60, 230);

  // --- the two agents ---
  label(ctx, 'COVER', 60, 290);
  drawAgentToCanvas(ctx, agent.cover || {}, 60, 310, 380, false);

  label(ctx, 'BOOST', 560, 290);
  drawAgentToCanvas(ctx, agent.boost || {}, 560, 310, 380, true);

  // --- feeling code ---
  label(ctx, 'FEELING CODE', 60, 760);
  roundedBox(ctx, 60, 780, 380, 300, '#16263f');   // dark, so white ink reads
  const worn = agent.feelingCodes[agent.feelingWorn];
  if (cardAssets.feeling) {
    ctx.drawImage(cardAssets.feeling, 100, 790, 280, 280);
    if (worn && worn.face) {
      ctx.font = '54px ' + CARD_FONT;
      ctx.textAlign = 'right';
      ctx.fillText(worn.face, 426, 836);
      ctx.textAlign = 'left';
    }
  } else {
    none(ctx, 250, 940);
  }

  // --- voice password ---
  label(ctx, 'VOICE PASSWORD', 560, 760);
  roundedBox(ctx, 560, 780, 380, 300);
  if (agent.voice.audioId) {
    const filter = Voice.FILTERS.find(f => f.id === (agent.voice.filter || 'normal'));
    ctx.font = '96px ' + CARD_FONT;
    ctx.textAlign = 'center';
    ctx.fillText(filter ? filter.icon : '🙂', 750, 920);
    ctx.fillStyle = '#1a1203';
    ctx.font = '700 34px ' + CARD_FONT;
    ctx.fillText(filter ? filter.label : 'Normal', 750, 1000);
    ctx.textAlign = 'left';
  } else {
    none(ctx, 750, 940);
  }

  // --- the rules ---
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
function drawAgentToCanvas(ctx, data, x, y, size, withExtras) {
  // background
  const bg = withExtras ? (data.background || 'plain') : 'plain';
  const pair = BG_CANVAS[bg] || BG_CANVAS.plain;
  const grad = ctx.createLinearGradient(x, y, x, y + size);
  grad.addColorStop(0, pair[0]);
  grad.addColorStop(1, pair[1]);
  ctx.fillStyle = grad;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, size, size, 18);
  else ctx.rect(x, y, size, size);
  ctx.fill();

  ctx.save();
  // The aura is a glow, which on canvas is a shadow.
  const aura = withExtras ? AURAS.find(a => a.id === data.aura) : null;
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

  if (door === 'build') {
    drawShapesToCanvas(ctx, data.shapes || [], x, y, size);
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
    ctx.font = Math.round(size * 0.14 * (sticker.scale || 1)) + 'px ' + CARD_FONT;
    ctx.fillText(sticker.emoji, 0, 0);
    ctx.restore();
  });
}

/* The Build door's shapes, drawn with canvas rather than SVG. The outlines
   match shapeElement() above: both describe the same seven shapes in a
   20-unit box centred on zero, so the card matches the screen. */
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

function renderShapes(svg, shapes, interactive) {
  svg.innerHTML = '';
  shapes.forEach((shape, index) => {
    const group = make('g', {
      // Order matters: move first, then turn, then size.
      transform: 'translate(' + (shape.x * 100) + ',' + (shape.y * 100) + ') ' +
                 'rotate(' + (shape.rotation || 0) + ') ' +
                 'scale(' + (shape.size || 1) + ')'
    });
    const el = shapeElement(shape.type);
    el.setAttribute('fill', shape.colour);
    group.appendChild(el);

    if (interactive && index === editor.selectedShape) {
      group.setAttribute('class', 'is-selected');
    }
    if (interactive) {
      group.dataset.index = index;
      group.addEventListener('pointerdown', startShapeDrag);
    }
    svg.appendChild(group);
  });
}


/* ---------------------------------------------------------------------------
   THE SHAPE TRAY
   ------------------------------------------------------------------------ */
function buildShapeTray() {
  const tray = $('#shape-tray');
  tray.innerHTML = '';
  SHAPES.forEach(shape => {
    const button = document.createElement('button');
    button.className = 'tray-shape';
    button.setAttribute('aria-label', 'Shape ' + shape.label);

    // A little preview of the shape itself, rather than a word.
    const svg = make('svg', { viewBox: '-12 -12 24 24' });
    const el = shapeElement(shape.id);
    el.setAttribute('fill', editor.colour);
    svg.appendChild(el);
    button.appendChild(svg);

    button.addEventListener('pointerdown', event => startShapeTrayDrag(event, shape.id));
    tray.appendChild(button);
  });
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
  playSfx('pop');
  refreshAgentViews();
  scheduleSave();
}

/* Dragging a shape out of the tray, the same way stickers work. */
function startShapeTrayDrag(event, type) {
  event.preventDefault();
  const tray = event.currentTarget;
  try { tray.setPointerCapture(event.pointerId); } catch (err) { /* harmless */ }

  const startX = event.clientX, startY = event.clientY;

  function up(e) {
    tray.removeEventListener('pointermove', move);
    tray.removeEventListener('pointerup', up);
    tray.removeEventListener('pointercancel', up);

    const moved = Math.hypot(e.clientX - startX, e.clientY - startY);
    const rect = stage().getBoundingClientRect();
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
  function move() { /* the shape itself is the preview; nothing to follow */ }

  tray.addEventListener('pointermove', move);
  tray.addEventListener('pointerup', up);
  tray.addEventListener('pointercancel', up);
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

    // Move the group directly rather than rebuilding: rebuilding would destroy
    // the element this drag is attached to.
    group.setAttribute('transform',
      'translate(' + (shape.x * 100) + ',' + (shape.y * 100) + ') ' +
      'rotate(' + (shape.rotation || 0) + ') scale(' + (shape.size || 1) + ')');
  }

  function up() {
    group.removeEventListener('pointermove', move);
    group.removeEventListener('pointerup', up);
    group.removeEventListener('pointercancel', up);
    if (moved) { logEvent('shape_move', {}); scheduleSave(); }
  }

  try { group.setPointerCapture(event.pointerId); } catch (err) { /* harmless */ }
  group.addEventListener('pointermove', move);
  group.addEventListener('pointerup', up);
  group.addEventListener('pointercancel', up);
}

/* Move the selection outline without touching the elements themselves. */
function paintShapeSelection() {
  const svg = $('svg.agent-shapes', stage());
  if (!svg) return;
  Array.from(svg.children).forEach(g => {
    const on = Number(g.dataset.index) === editor.selectedShape;
    if (on) g.setAttribute('class', 'is-selected');
    else g.removeAttribute('class');
  });
}

function paintShapeControls() {
  const controls = $('#shape-controls');
  if (controls) controls.hidden = editor.selectedShape === null;
}

/* Spec §7: buttons rather than pinch gestures - easier to code, and far
   easier for a child who finds two-finger gestures hard. */
function shapeAction(what) {
  const p = ensurePixels();
  const index = editor.selectedShape;
  const shape = p.shapes[index];
  if (!shape) return;
  pushUndo();

  if (what === 'bigger')  shape.size = Math.min(5, (shape.size || 1) + 0.3);
  if (what === 'smaller') shape.size = Math.max(0.3, (shape.size || 1) - 0.3);
  if (what === 'rotate')  shape.rotation = ((shape.rotation || 0) + 30) % 360;
  if (what === 'colour')  shape.colour = editor.colour;

  // Last in the list is drawn last, so "front" means moving to the end.
  if (what === 'front') {
    p.shapes.splice(index, 1);
    p.shapes.push(shape);
    editor.selectedShape = p.shapes.length - 1;
  }
  if (what === 'back') {
    p.shapes.splice(index, 1);
    p.shapes.unshift(shape);
    editor.selectedShape = 0;
  }
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
function openDrawDoor() {
  const canvas = $('#door-canvas');
  coder.canvas = canvas;
  coder.undoStack = [];
  coder.width = BRUSHES[1];
  coder.mirror = false;
  coder.colour = editor.colour;
  // Every finished stroke is kept, so there is no Save button here either.
  coder.onStroke = saveDoorDrawing;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Put back whatever was drawn before.
  const existing = part().drawingPng;
  if (existing) {
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.src = existing;
  }

  paintDrawDoorPalette();
  paintBrushButtons();
}

/* The Draw door's palette sets the brush colour (coder.colour), and keeps
   editor.colour in step so switching doors does not change colour underfoot. */
function paintDrawDoorPalette() {
  const box = $('#draw-door-palette');
  box.innerHTML = '';
  PALETTE.forEach(colour => {
    const swatch = document.createElement('button');
    swatch.className = 'swatch' + (colour === coder.colour ? ' is-on' : '');
    swatch.style.background = colour;
    swatch.setAttribute('aria-label', 'Colour ' + colour);
    swatch.addEventListener('click', () => {
      coder.colour = colour;
      editor.colour = colour;
      paintDrawDoorPalette();
    });
    box.appendChild(swatch);
  });
}

function saveDoorDrawing() {
  part().drawingPng = $('#door-canvas').toDataURL('image/png');
  renderPreview();
  scheduleSave();
}

function paintBrushButtons() {
  $$('[data-brush]').forEach(b =>
    b.classList.toggle('is-on', Number(b.dataset.brush) === coder.width));
  $('#btn-mirror').classList.toggle('is-on', coder.mirror);
}


/* ---------------------------------------------------------------------------
   Wiring the two new doors up. Called once, from wireUp().
   ------------------------------------------------------------------------ */
function wireDoors() {
  attachBrush($('#door-canvas'));

  $$('[data-shape]').forEach(b =>
    b.addEventListener('click', () => shapeAction(b.dataset.shape)));

  $$('[data-brush]').forEach(b => b.addEventListener('click', () => {
    coder.width = Number(b.dataset.brush);
    logEvent('brush_size', { width: coder.width });
    paintBrushButtons();
  }));

  $('#btn-mirror').addEventListener('click', () => {
    coder.mirror = !coder.mirror;
    logEvent('mirror_toggle', { on: coder.mirror });
    paintBrushButtons();
  });
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
function playSfx(name) {
  if (state.muted) return;
  Voice.sfx(name);
}


/* ---------------------------------------------------------------------------
   🔊 SPOKEN PROMPTS (spec §6)
   A facilitator may record audio/m1.m4a and friends later. Until those exist,
   the iPad reads the prompt out itself. Either way a child who cannot read
   still knows what the mission is.
   ------------------------------------------------------------------------ */
const promptAudio = {};        // mission id -> HTMLAudioElement, or false

function speakPrompt() {
  const id = currentMissionId();
  const mission = MISSIONS.find(m => m.id === id);
  const text = mission ? mission.prompt
             : id === 'reveal' ? 'Here is your agent.'
             : 'Make your agent.';

  logEvent('speak', { mission: id });
  if (state.muted) { toast('Sound is off'); return; }

  // A recorded file wins if the facilitator has provided one.
  if (promptAudio[id] === undefined) {
    const audio = new Audio('./audio/' + id + '.m4a');
    audio.addEventListener('error', () => { promptAudio[id] = false; });
    promptAudio[id] = audio;
  }
  const recorded = promptAudio[id];
  if (recorded) {
    recorded.currentTime = 0;
    // play() rejects when the file is missing; fall through to the voice.
    recorded.play().catch(() => { promptAudio[id] = false; speakWithVoice(text); });
    return;
  }
  speakWithVoice(text);
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
    playSfx('pop');
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
  playSfx('pop');
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
  playSfx('tap');
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
  playSfx('power');

  // The sparkles land as the spin finishes, not at the start.
  setTimeout(() => {
    if (!$('#editor').hidden) {
      Effects.burstAt(stageEl, { count: 60, spread: 9 });
      playSfx('sparkle');
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
  playSfx('whoosh');
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
  playSfx('whoosh');

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
    playSfx('stamp');
    Effects.shake($('#screen-reveal'), 6);
  }, 800));

  // Sparkles, then the password plays itself once with the bounce.
  finaleTimers.push(setTimeout(() => {
    Effects.burstAt($('#dossier'), { count: 50, spread: 8 });
    playSfx('sparkle');
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

  navigator.serviceWorker.register('./sw.js').then(function (registration) {
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
