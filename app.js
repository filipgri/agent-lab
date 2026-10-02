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
   ========================================================================== */


/* ==========================================================================
   1. CONFIG
   ========================================================================== */

// Spec §14: this PIN is visible in public code on purpose. It is a speed bump
// to stop a curious child wandering into the adult panel, not real security.
const ADULT_PIN = '2468';

// Which milestone this build is up to. Stamped into every export so a file
// found later can be matched to the version of the app that made it.
const MILESTONE = 4;

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
  $('#mission-title').textContent = mission.title;

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

// The full stamp animation and thud sound arrive in Milestone 8. For now the
// button gets a brief visual kick so the tap feels answered.
function playStampFeedback() {
  const button = $('#btn-stamp');
  button.classList.remove('stamp-kick');
  void button.offsetWidth;           // forces the browser to restart the animation
  button.classList.add('stamp-kick');
}

function openReveal() {
  leaveCurrent();
  state.onReveal = true;
  showScreen('reveal');
  renderStrip();
  renderPreview();
  logEvent('mission_enter', { mission: 'reveal' });
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
  wireMission2();
  wireMission3();
  wireMission4();
  $('#btn-stamp').addEventListener('click', stampMission);
  $('#btn-pass').addEventListener('click', passMission);
  $('#btn-finish').addEventListener('click', finishSession);

  // --- global buttons (there is one of each per screen) ---
  $$('[data-mute]').forEach(b => b.addEventListener('click', toggleMute));
  $$('[data-missing]').forEach(b => b.addEventListener('click', openMissing));
  $$('[data-speak]').forEach(b => b.addEventListener('click', () => {
    toast('Spoken prompts arrive in Milestone 8');
  }));
  $('#btn-missing-close').addEventListener('click', () => {
    $('#missing-overlay').hidden = true;
  });

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
  paintMuteButtons();
  paintMotionButtons();

  // Spec §3: ask iOS to keep our data.
  const persistence = await Storage.requestPersistence();
  $('#storage-state').textContent =
    'Storage persistence: ' + persistence +
    (window.navigator.standalone ? ' · opened from home screen ✅'
                                 : ' · opened in Safari (separate storage) ⚠️');

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
    stickers: p.stickers.map(s => Object.assign({}, s))
  });
  if (editor.undoStack.length > 40) editor.undoStack.shift();   // cap the memory
}

function undo() {
  const previous = editor.undoStack.pop();
  if (!previous) return;
  const p = ensurePixels();
  p.pixels = previous.pixels;
  p.stickers = previous.stickers;
  editor.selected = null;
  logEvent('undo', {});
  refreshAgentViews();
  scheduleSave();
}


/* ---------------------------------------------------------------------------
   DRAWING THE AGENT
   renderAgentView() paints one .agent-view: the canvas, then the stickers.
   refreshAgentViews() updates every copy on screen at once.
   ------------------------------------------------------------------------ */
function renderAgentView(view, data, interactive) {
  // MILESTONE 2: the Boost carries a background and an aura. Both are pure CSS,
  // set here as an attribute and a custom property, so the same function draws
  // a plain Cover and a glowing Boost in a space scene.
  view.dataset.bg = data.background || 'plain';
  const aura = AURAS.find(a => a.id === data.aura);
  view.style.setProperty('--aura', aura && aura.colour ? aura.colour : 'transparent');
  view.classList.toggle('has-aura', Boolean(aura && aura.colour));

  const canvas = $('canvas.agent-pixels', view);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, GRID, GRID);

  const pixels = data.pixels || [];
  for (let i = 0; i < pixels.length; i++) {
    if (!pixels[i]) continue;                  // null = empty square
    ctx.fillStyle = pixels[i];
    ctx.fillRect(i % GRID, Math.floor(i / GRID), 1, 1);
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
  if (door !== 'pixel') {
    toast(door === 'build' ? 'Build arrives in Milestone 7' : 'Draw arrives in Milestone 7');
    return;
  }
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
  $('.rail-tabs').classList.toggle('is-four', isBoost);

  setRail('paint');
  paintPalette();
  paintToolButtons();
  buildStickerTray();
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
  p.pixels = new Array(GRID * GRID).fill(null);
  p.stickers = [];
  editor.selected = null;
  logEvent('clear', {});
  refreshAgentViews();
  scheduleSave();
}


/* ---------------------------------------------------------------------------
   THE TOOL RAIL
   ------------------------------------------------------------------------ */
function setRail(which) {
  // One body per tab. Milestone 2 added Aura and Place.
  ['paint', 'stickers', 'aura', 'background'].forEach(name => {
    $('#rail-' + name).hidden = which !== name;
  });
  $$('[data-rail]').forEach(b => b.classList.toggle('is-on', b.dataset.rail === which));
}

function paintPalette() {
  const palette = $('#palette');
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
      paintPalette();
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
  if (state.agent.door === 'pixel') openEditor('#m1-editor-mount', 'cover');
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
  draft: null         // the code being built, before "Keep it"
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

function codeCtx() {
  return $('#m3-canvas').getContext('2d');
}

function clearCodeCanvas() {
  const canvas = $('#m3-canvas');
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
  const canvas = $('#m3-canvas');
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
  const canvas = $('#m3-canvas');

  pushCodeUndo();
  coder.drawing = true;
  coder.points = [codePoint(event)];
  try { canvas.setPointerCapture(event.pointerId); } catch (err) { /* harmless */ }

  // A single tap should still leave a dot.
  const ctx = codeCtx();
  ctx.fillStyle = coder.colour;
  ctx.beginPath();
  ctx.arc(coder.points[0].x, coder.points[0].y, 7, 0, Math.PI * 2);
  ctx.fill();
}

function codeMove(event) {
  if (!coder.drawing) return;
  coder.points.push(codePoint(event));

  const pts = coder.points;
  if (pts.length < 2) return;

  const ctx = codeCtx();
  ctx.strokeStyle = coder.colour;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  /* The very first move needs a straight piece joining the starting dot to
     where the curves begin. Without it the curve starts at the midpoint of the
     first two points, and a quick stroke leaves its opening dot stranded in
     space - which looked like a bug and was one. */
  if (pts.length === 2) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
    ctx.stroke();
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
}

function codeUp() {
  if (!coder.drawing) return;
  coder.drawing = false;
  if (coder.points.length > 0) logEvent('feeling_draw', { points: coder.points.length });
  coder.points = [];
}

/* Undo keeps whole-canvas snapshots. A feeling code is a handful of strokes on
   a small canvas, so this is cheap and far simpler than replaying strokes. */
function pushCodeUndo() {
  const canvas = $('#m3-canvas');
  coder.undoStack.push(codeCtx().getImageData(0, 0, canvas.width, canvas.height));
  if (coder.undoStack.length > 20) coder.undoStack.shift();
}

function undoCode() {
  const previous = coder.undoStack.pop();
  if (!previous) return;
  codeCtx().putImageData(previous, 0, 0);
  logEvent('undo', { where: 'feeling_code' });
}

function clearCode() {
  pushCodeUndo();
  clearCodeCanvas();
  logEvent('clear', { where: 'feeling_code' });
}

function paintCodePalette() {
  const box = $('#m3-palette');
  box.innerHTML = '';
  CODE_COLOURS.forEach(colour => {
    const swatch = document.createElement('button');
    swatch.className = 'swatch' + (colour === coder.colour ? ' is-on' : '');
    swatch.style.background = colour;
    swatch.setAttribute('aria-label', 'Colour ' + colour);
    swatch.addEventListener('click', () => { coder.colour = colour; paintCodePalette(); });
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
  const canvas = $('#m3-canvas');
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

  coder.draft.png = $('#m3-canvas').toDataURL('image/png');

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
function wireMission3() {
  const canvas = $('#m3-canvas');
  canvas.addEventListener('pointerdown', codeDown);
  canvas.addEventListener('pointermove', codeMove);
  canvas.addEventListener('pointerup', codeUp);
  canvas.addEventListener('pointercancel', codeUp);

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
