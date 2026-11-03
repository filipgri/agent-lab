/* ============================================================================
   display.js - the big-screen display (v3 §9.5, P7)
   ============================================================================

   Listens to the relay's live feed (/events). For each bottle:

     for everyone   a chime; the bottle drops into the queue along the top;
                    when its turn comes it lands on the shore and the cork
                    pops; the agent walks on (or a ? for a mystery) with its
                    handshake pulsing as light; the items play one at a time
                    - a power travels across as a gift and does its display
                    effect, a drawing is pinned to the board, a voice plays,
                    a game or a can't-live-without appears as a card; then
                    the agent waves and leaves. Drawings stay pinned.
     for a friend   a sealed bottle, marked with who it is for, floats to the
     or a teacher   post shelf. It is never opened here.

   PREDICTABLE: one arrival at a time, a visible queue, a chime before every
   arrival, nothing flashing more than three times a second, capped volume,
   Full / Calm / Off motion. NO NUMBERS anywhere: the only text on screen is
   a signed agent's codename.

   THE DISPLAY KEEPS NOTHING. A reload starts empty, apart from what the
   relay replays from this run (pinned drawings and the post shelf, rebuilt
   silently, without chimes).

   SYNTAX NOTES FOR A BEGINNER
   - `async function` and `await`: the arrival is written as a story, one
     step after another ("land, then walk on, then each item…"), and each
     `await sleep(…)` waits for that step without freezing the page.
   - sleep() here can be PAUSED (P) and CANCELLED (H): it waits in small
     steps and checks each time whether the facilitator has stepped in.
   ========================================================================== */

(function () {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const VOLUME = 0.6;                  // §9.5: capped, never sudden or loud
  const AUTO_RELEASE_MS = 3000;        // §9.5: released after 3 s in auto mode
  const MINUTE_MS = 60000;             // real for a minute

  /* The powers, by door, in the iPad's order (v3 §7.2). The number keys
     demo the doors in this order. ★ are Filip's five, with full scenes. */
  const DOORS = [
    ['pow-slow-everybody', 'pow-pause', 'pow-hold-turn', 'pow-warn-me', 'pow-say-again'],
    ['pow-turn-down', 'pow-dim-lights', 'pow-quiet-bubble'],
    ['pow-translator', 'pow-my-way', 'pow-get-me'],
    ['pow-control-teachers', 'pow-question-swap', 'pow-pass', 'pow-invisible'],
    ['pow-control-displays', 'pow-control-devices', 'pow-see-points', 'pow-change-rule'],
    ['pow-speak-for-friends', 'pow-call-ally', 'pow-team-up']
  ];
  const STARS = ['pow-slow-everybody', 'pow-control-teachers', 'pow-control-displays',
                 'pow-control-devices', 'pow-speak-for-friends'];
  const POWERS = {
    'pow-slow-everybody': ['🐢', 'Slow everybody down'], 'pow-pause': ['⏸️', 'Pause the world'],
    'pow-hold-turn': ['🎟️', 'Hold my turn'], 'pow-warn-me': ['🔔', 'Warn me first'],
    'pow-say-again': ['🔁', 'Say it again'], 'pow-turn-down': ['🔉', 'Turn the room down'],
    'pow-dim-lights': ['🌙', 'Dim the lights'], 'pow-quiet-bubble': ['🫧', 'Quiet bubble'],
    'pow-translator': ['🔄', 'Translator'], 'pow-my-way': ['🌀', 'Everyone talks my way'],
    'pow-get-me': ['💡', 'Get-what-I-mean ray'], 'pow-control-teachers': ['🎮', 'Control teachers'],
    'pow-question-swap': ['🔀', 'Question swap'], 'pow-pass': ['🛑', 'Pass'],
    'pow-invisible': ['👻', 'Invisibility cloak'], 'pow-control-displays': ['📺', 'Control all displays'],
    'pow-control-devices': ['🎛️', 'Control devices'], 'pow-see-points': ['⭐', 'See my points'],
    'pow-change-rule': ['📜', 'Change a rule'], 'pow-speak-for-friends': ['💬', 'Speak for your friends'],
    'pow-call-ally': ['📣', 'Call an ally'], 'pow-team-up': ['🤝', 'Team up']
  };
  const ITEM_EMOJI = { 'item-game': '🎮', 'item-cant-live': '💎', 'item-safe': '📍',
                       'item-drawing': '✏️', 'item-voice': '🎤', 'item-handshake': '🤝' };

  const ui = {
    auto: true,          // A: automatic or held release
    paused: false,       // P
    muted: false,        // M
    hushedUntil: 0,      // "Turn the room down" mutes for a while
    queue: [],           // bottles waiting their turn
    playing: null,       // { bottle, token } on the shore now
    releaseTimer: null,
    warnNext: false,     // "Warn me first": lights before the next arrival
    last: null,          // the previous arrival, for "Say it again"
    real: new Set(),     // powers switched on for "real for a minute"
    minuteTimer: null,
    pictures: {}         // which of Filip's display pictures exist
  };
  const CANCELLED = new Error('hidden');

  /* ---- start: one click, so the browser allows sound ---- */
  let audioContext = null;
  function start() {
    if ($('#start').hidden) return;       // already started
    $('#start').hidden = true;
    $('#scene').hidden = false;
    try { audioContext = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (err) { audioContext = null; }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setMotion('calm');
    loadPictures();
    // Pins are added, hidden, cleared and replayed in several places, so
    // rather than remembering fitPins() in each, watch the board itself.
    new MutationObserver(fitPins).observe($('#pins'), { childList: true });
    new ResizeObserver(fitPins).observe($('#pins'));
    paintSettings();
    paintStatus();
    connect();
  }
  $('#start').addEventListener('click', start);

  /* Filip's pictures replace the drawn stand-ins as and when they exist. */
  function loadPictures() {
    tryImage('assets/img/display/disp-shore.jpg', () => {
      $('#scene').style.setProperty('--shore-img', 'url("assets/img/display/disp-shore.jpg")');
      $('#scene').classList.add('has-shore');
    });
    tryImage('assets/img/display/disp-board.png', fitBoard);
    tryImage('assets/img/display/disp-bottle.png', () => { ui.pictures.bottle = true; });
    tryImage('assets/img/display/disp-teacher.png', () => { ui.pictures.teacher = true; });
  }
  function tryImage(src, onLoad) {
    const img = new Image();
    img.onload = () => onLoad(img);
    img.src = src;
  }

  /* The board picture is a noticeboard on posts in a SQUARE picture with
     clear space round it, so stretching it to fill a wide box squashed it
     flat and the pins landed below the cork. Instead this measures the
     picture: where the board really is (its non-clear pixels), and where
     the cork is (walking out from the middle until the colour changes).
     The board then keeps its own shape and the pins go on the cork - for
     whichever board picture is in the folder, so a remade one fits too. */
  function fitBoard(img) {
    const board = $('#board');
    board.style.setProperty('--board-img', 'url("' + img.getAttribute('src') + '")');
    const box = measureBoard(img);
    if (box) {
      const pct = n => (n * 100).toFixed(2) + '%';
      board.style.setProperty('--board-ratio', String(box.w / box.h));
      // Scale the picture so its board fills the element exactly...
      board.style.setProperty('--board-size', pct(box.W / box.w) + ' ' + pct(box.H / box.h));
      // ...and shift it so the clear margin falls outside. (A background
      // position of p% lines up p% of the picture with p% of the box.)
      board.style.setProperty('--board-pos',
        pct(box.W > box.w ? box.x / (box.W - box.w) : 0) + ' ' +
        pct(box.H > box.h ? box.y / (box.H - box.h) : 0));
      if (box.cork) board.style.setProperty('--cork', box.cork.map(pct).join(' '));
    }
    board.classList.add('has-img');
  }

  /* Returns the board's box inside the picture, and the cork as insets
     (top, right, bottom, left) as fractions of that box. null if the
     picture cannot be read; cork is null if it does not look like a cork. */
  function measureBoard(img) {
    const W = img.naturalWidth, H = img.naturalHeight;
    let data;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      data = ctx.getImageData(0, 0, W, H).data;
    } catch (err) { return null; }

    // Every pixel has four numbers (red, green, blue, alpha), so pixel
    // (x, y) starts at (y * W + x) * 4 and its alpha is the fourth.
    const at = (x, y) => (y * W + x) * 4;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (data[at(x, y) + 3] > 24) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return null;                       // nothing but clear
    const w = x1 - x0 + 1, h = y1 - y0 + 1;

    // The cork: start a little above the middle (below it are the posts)
    // and walk outwards until the colour differs a lot - that is the frame.
    const cx = Math.round(x0 + w / 2), cy = Math.round(y0 + h * 0.4);
    const start = at(cx, cy);
    const differs = i => Math.abs(data[i] - data[start]) + Math.abs(data[i + 1] - data[start + 1]) +
                         Math.abs(data[i + 2] - data[start + 2]) > 150 || data[i + 3] < 200;
    let left = cx;   while (left > x0 && !differs(at(left - 1, cy))) left--;
    let right = cx;  while (right < x1 && !differs(at(right + 1, cy))) right++;
    let top = cy;    while (top > y0 && !differs(at(cx, top - 1))) top--;
    let bottom = cy; while (bottom < y1 && !differs(at(cx, bottom + 1))) bottom++;

    // A real cork is most of the board's width and a good part of its
    // height. Anything smaller means the walk hit a mark on the cork, so
    // the CSS keeps its own guess instead.
    const corkOk = (right - left) > w * 0.5 && (bottom - top) > h * 0.3;
    return {
      W, H, x: x0, y: y0, w, h,
      cork: corkOk ? [(top - y0) / h, (x1 - right) / w, (y1 - bottom) / h, (left - x0) / w] : null
    };
  }

  /* A picture, or its emoji if the picture is not there. */
  function picture(src, emoji, cls) {
    const holder = document.createElement('span');
    if (cls) holder.className = cls;
    if (!src) { holder.textContent = emoji; return holder; }
    const img = document.createElement('img');
    img.alt = '';
    img.onerror = () => { holder.textContent = emoji; };
    img.src = src;
    holder.appendChild(img);
    return holder;
  }
  const bottleArt = cls => picture(ui.pictures.bottle ? 'assets/img/display/disp-bottle.png' : null, '🍾', cls);
  const powerArt = (id, cls) => picture('assets/img/powers/' + id + '.png', (POWERS[id] || ['⚡'])[0], cls);

  /* ---- sound ---- */
  function quiet() { return ui.muted || Date.now() < ui.hushedUntil; }
  function sfx(id) {
    if (quiet()) return;
    const audio = new Audio('assets/audio/sfx/' + id + '.mp3');
    audio.volume = VOLUME;
    audio.play().catch(() => { if (id === 'sfx-bottle-arrive') madeChime(); });
  }
  function madeChime() {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    [[784, 0], [1047, 0.18]].forEach(([f, d]) => {
      const tone = audioContext.createOscillator();
      const level = audioContext.createGain();
      tone.frequency.value = f;
      level.gain.setValueAtTime(0, now + d);
      level.gain.linearRampToValueAtTime(0.25 * VOLUME, now + d + 0.02);
      level.gain.exponentialRampToValueAtTime(0.001, now + d + 0.8);
      tone.connect(level).connect(audioContext.destination);
      tone.start(now + d);
      tone.stop(now + d + 0.85);
    });
  }
  /* A voice or a spoken drawing: already disguised on the iPad, so it is
     played exactly as it came. Waits until it ends (or 15 s). */
  let speaking = null;
  function playClip(dataUrl, token) {
    if (!dataUrl || quiet()) return sleep(600, token);
    return new Promise(resolve => {
      const audio = new Audio(dataUrl);
      audio.volume = VOLUME;
      speaking = audio;
      const done = () => { clearTimeout(cap); speaking = null; resolve(); };
      const cap = setTimeout(done, 15000);
      audio.onended = done;
      audio.onerror = done;
      audio.play().catch(done);
    });
  }

  /* ---- a sleep that P pauses and H cancels ---- */
  function slowNow() { return Date.now() < (ui.slowUntil || 0); }
  async function sleep(ms, token) {
    let left = ms * (slowNow() ? 2 : 1);
    while (left > 0) {
      if (token && token.cancelled) throw CANCELLED;
      await new Promise(r => setTimeout(r, 100));
      if (!ui.paused) left -= 100;
    }
    if (token && token.cancelled) throw CANCELLED;
  }

  /* ---- the relay's feed ---- */
  function connect() {
    const feed = new EventSource('/events');
    feed.addEventListener('open', () => $('#link-dot').classList.add('is-on'));
    feed.addEventListener('error', () => $('#link-dot').classList.remove('is-on'));
    feed.addEventListener('bottle', event => {
      let message;
      try { message = JSON.parse(event.data); } catch (err) { return; }
      if (message.replay) rebuild(message.bottle);
      else arrive(message.bottle);
    });
  }

  /* A bottle from earlier in this run, after a reload: put back what it
     left behind, silently. */
  function rebuild(bottle) {
    if (bottle.to === 'who-everyone') pinItems(bottle, false);
    else addToPost(bottle, false);
  }

  /* ---- the queue ---- */
  function arrive(bottle) {
    sfx('sfx-bottle-arrive');          // a chime before EVERY arrival
    ui.queue.push(bottle);
    paintQueue(true);
    maybeRelease();
  }

  function paintQueue(newest) {
    const box = $('#queue');
    box.innerHTML = '';
    ui.queue.forEach((bottle, i) => {
      const el = bottleArt('queue-bottle' + (i === 0 ? ' is-next' : '') +
                           (newest && i === ui.queue.length - 1 ? ' is-new' : ''));
      box.appendChild(el);
    });
  }

  function maybeRelease() {
    if (ui.playing || ui.paused || !ui.queue.length || !ui.auto || ui.releaseTimer) return;
    ui.releaseTimer = setTimeout(() => { ui.releaseTimer = null; release(); }, AUTO_RELEASE_MS);
  }

  function release() {
    clearTimeout(ui.releaseTimer);
    ui.releaseTimer = null;
    if (ui.playing || ui.paused || !ui.queue.length) return;
    const bottle = ui.queue.shift();
    paintQueue(false);
    const token = { cancelled: false, pins: [] };
    ui.playing = { bottle: bottle, token: token };
    play(bottle, token)
      .catch(err => { if (err !== CANCELLED) console.error(err); })
      .then(() => {
        clearStage();
        if (!token.cancelled && bottle.to === 'who-everyone' && !bottle.again) ui.last = bottle;
        ui.playing = null;
        maybeRelease();
      });
  }

  /* ---- one arrival ---- */
  async function play(bottle, token) {
    if (ui.warnNext) { ui.warnNext = false; await warnLights(token); }

    if (bottle.to !== 'who-everyone') {
      // For a friend or a teacher: it floats to the post shelf, sealed.
      addToPost(bottle, true);
      await sleep(2600, token);
      return;
    }

    // It lands on the shore and the cork pops.
    const landing = $('#landing');
    landing.innerHTML = '';
    landing.appendChild(bottleArt(''));
    landing.classList.remove('is-landing');
    void landing.offsetWidth;
    landing.classList.add('is-landing');
    await sleep(1100, token);
    sfx('sfx-cork');
    await sleep(500, token);

    // The agent walks on - or a ? for a mystery.
    const sender = $('#sender');
    const pic = $('#sender-pic');
    pic.innerHTML = '';
    sender.classList.toggle('is-mystery', !bottle.from);
    if (bottle.from) {
      pic.appendChild(picture(bottle.from.picture, bottle.from.emblem || '🕵️', ''));
      $('#sender-name').textContent = bottle.from.codename || '';
    } else {
      pic.textContent = '?';
      $('#sender-name').textContent = '';
    }
    sender.className = 'sender' + (bottle.from ? '' : ' is-mystery') + ' is-walking-on';
    sender.hidden = false;
    await sleep(1400, token);
    if (bottle.from && bottle.from.handshake) await pulse(bottle.from.handshake, token);

    // The items, one at a time.
    for (const item of bottle.items || []) {
      await playItem(bottle, item, token);
      clearShow();
      await sleep(400, token);
    }

    // The agent waves and leaves.
    sender.classList.add('is-waving');
    await sleep(1500, token);
    sender.classList.add('is-leaving');
    await sleep(1400, token);
  }

  /* Its handshake, as light: the picture glows on each tap. */
  async function pulse(taps, token) {
    let at = 0;
    for (const t of taps) {
      await sleep(Math.max(0, t - at), token);
      at = t;
      $('#sender-pic').classList.add('is-pulse');
      setTimeout(() => $('#sender-pic').classList.remove('is-pulse'), 160);
    }
    await sleep(400, token);
  }

  function show(el) {
    el.classList.add('pop');
    $('#show').appendChild(el);
    return el;
  }
  function clearShow() { $('#show').innerHTML = ''; }
  function card(content) {
    const el = document.createElement('div');
    el.className = 'card';
    if (typeof content === 'string') el.textContent = content;
    else el.appendChild(content);
    return el;
  }

  async function playItem(bottle, item, token) {
    switch (item.type) {
      case 'item-power': {
        // The power travels across as a gift, then does its display effect.
        const gift = card(item.picture ? picture(item.picture, '⚡', '')
                                       : powerArt(item.power, ''));
        gift.classList.add('gift');
        $('#show').appendChild(gift);
        sfx('sfx-gift');
        await sleep(1500, token);
        clearShow();
        if (ui.real.has(item.power)) startMinute();
        await powerEffect(bottle, item, token);
        return;
      }
      case 'item-drawing': {
        show(card(picture(item.picture, '✏️', '')));
        await sleep(1500, token);
        if (item.audio) await playClip(item.audio, token);
        pin(item.picture, '✏️', bottle, token);
        return;
      }
      case 'item-voice': {
        show(card('🎤'));
        await playClip(item.audio, token);
        return;
      }
      case 'item-handshake': {
        show(card('🤝'));
        if ($('#sender').hidden) await sleep(800, token);
        else await pulse(item.taps || [], token);
        return;
      }
      case 'item-safe': {
        const src = item.picture || (item.place ? 'assets/img/hq/' + item.place + '.jpg' : null);
        show(card(picture(src, '📍', '')));
        await sleep(3000, token);
        return;
      }
      default: {
        // A game, or something I can't live without: a card.
        show(card(picture(item.picture, ITEM_EMOJI[item.type] || '🎁', '')));
        if (item.audio) await playClip(item.audio, token);
        await sleep(2500, token);
      }
    }
  }

  /* ---- the powers on the display (v3 §7.2, the right-hand column) ---- */
  async function powerEffect(bottle, item, token) {
    const id = item.power;
    const emblem = (bottle.from && bottle.from.emblem) || '✨';

    if (id === 'pow-slow-everybody') {
      // ★ The whole scene slows for 10 s, and a tortoise crosses the shore.
      ui.slowUntil = Date.now() + 10000;
      $('#scene').style.setProperty('--slow', '2.5');
      const turtle = prop('🐢', 0, 82);
      if (document.body.dataset.motion === 'full') {
        turtle.style.transition = 'left 10s linear';
        requestAnimationFrame(() => { turtle.style.left = '92%'; });
      } else turtle.style.left = '50%';
      sfx('sfx-slow');
      setTimeout(() => { $('#scene').style.setProperty('--slow', '1'); turtle.remove(); }, 10000);
      await sleep(2500, token);
    } else if (id === 'pow-control-teachers') {
      // ★ A grown-up appears and does what the child's "so that" shows.
      const teacher = $('#teacher');
      teacher.innerHTML = '';
      teacher.appendChild(picture(ui.pictures.teacher ? 'assets/img/display/disp-teacher.png' : null, '🧑‍🏫', ''));
      const bubble = document.createElement('div');
      bubble.className = 'bubble pop';
      bubble.appendChild(item.soThat ? picture(item.soThat, '🎮', '') : document.createTextNode('🎮'));
      teacher.appendChild(bubble);
      teacher.hidden = false;
      teacher.classList.remove('is-hop');
      void teacher.offsetWidth;
      teacher.classList.add('is-hop');
      sfx('sfx-lightning');
      await sleep(3800, token);
      teacher.hidden = true;
    } else if (id === 'pow-control-displays') {
      // ★ The sender's emblem and a colour wash across the whole screen.
      const wash = $('#wash');
      wash.innerHTML = '';
      for (let i = 0; i < 6; i++) {
        const span = document.createElement('span');
        span.textContent = emblem;
        wash.appendChild(span);
      }
      wash.hidden = false;
      sfx('sfx-lightning');
      setTimeout(() => { wash.hidden = true; }, 10000);
      await sleep(3000, token);
    } else if (id === 'pow-control-devices') {
      // ★ Lights, speakers and a whiteboard switch on and off.
      const props = [prop('💡', 6, 10, 'blink'), prop('🔊', 88, 10, 'blink'), prop('📋', 6, 52, 'blink')];
      sfx('sfx-lightning');
      await sleep(3400, token);
      props.forEach(p => p.remove());
    } else if (id === 'pow-speak-for-friends') {
      // ★ Two speech bubbles rise.
      const a = show(bubble('💬'));
      const b = show(bubble('💬'));
      a.classList.add('rise');
      b.classList.add('rise');
      sfx('sfx-thoughts');
      await sleep(2600, token);
    } else if (id === 'pow-pause') {
      show(card('⏸️'));
      $('#scene').classList.add('is-frozen');
      sfx('sfx-freeze');
      await sleep(5000, token);
      $('#scene').classList.remove('is-frozen');
    } else if (id === 'pow-dim-lights') {
      show(card('🌙'));
      $('#dim').hidden = false;
      setTimeout(() => { $('#dim').hidden = true; }, 15000);
      await sleep(2500, token);
    } else if (id === 'pow-turn-down') {
      show(card('🔉'));
      ui.hushedUntil = Date.now() + 15000;
      $('#scene').classList.add('is-soft');
      setTimeout(() => $('#scene').classList.remove('is-soft'), 15000);
      await sleep(2500, token);
    } else if (id === 'pow-warn-me') {
      show(card('🔔'));
      ui.warnNext = true;
      await sleep(2500, token);
    } else if (id === 'pow-say-again') {
      show(card('🔁'));
      // The previous arrival plays again, next.
      if (ui.last) ui.queue.unshift(Object.assign({}, ui.last, { again: true }));
      paintQueue(false);
      await sleep(2500, token);
    } else if (id === 'pow-hold-turn') {
      // The token stays pinned to the board.
      show(card(powerArt(id, '')));
      await sleep(1500, token);
      pin(null, '🎟️', bottle, token);
    } else if (id === 'pow-see-points') {
      // A star with an eye. NEVER a number.
      show(card('⭐'));
      show(bubble('👁️'));
      await sleep(2500, token);
    } else {
      // Every other power - and a child's own - pops up big for now.
      show(card(id === 'own' || id === 'v2' ? picture(item.picture, '✨', '') : powerArt(id, '')));
      sfx('sfx-powerup');
      await sleep(2800, token);
    }
  }

  function bubble(text) {
    const el = document.createElement('div');
    el.className = 'bubble';
    el.textContent = text;
    return el;
  }

  function prop(text, leftPct, topPct, cls) {
    const el = document.createElement('div');
    el.className = 'prop' + (cls ? ' ' + cls : '');
    el.textContent = text;
    el.style.left = leftPct + '%';
    el.style.top = topPct + '%';
    $('#scene').appendChild(el);
    return el;
  }

  /* "Warn me first": three lights go out, then the arrival. No digits. */
  async function warnLights(token) {
    const box = document.createElement('div');
    box.className = 'warn';
    box.innerHTML = '<span></span><span></span><span></span>';
    $('#scene').appendChild(box);
    try {
      for (const light of box.children) {
        sfx('sfx-pop');
        await sleep(1000, token);
        light.classList.add('is-out');
      }
    } finally {
      box.remove();
    }
  }

  /* ---- the board and the post shelf ---- */
  function pin(src, emoji, bottle, token) {
    const el = document.createElement('div');
    el.className = 'pin is-new';
    el.dataset.bottle = bottle.bottleId || '';
    if (src) el.appendChild(picture(src, emoji, ''));
    else { const e = document.createElement('div'); e.className = 'pin-emoji'; e.textContent = emoji; el.appendChild(e); }
    $('#pins').appendChild(el);
    if (token) token.pins.push(el);
  }

  function pinItems(bottle, animate) {
    (bottle.items || []).forEach(item => {
      if (item.type === 'item-drawing') pin(item.picture, '✏️', bottle, null);
      if (item.type === 'item-power' && item.power === 'pow-hold-turn') pin(null, '🎟️', bottle, null);
    });
    if (!animate) document.querySelectorAll('.pin.is-new').forEach(p => p.classList.remove('is-new'));
  }

  /* However many drawings arrive, they all stay on the cork: the pins get
     smaller rather than spilling off the bottom of the board. It tries
     every number of columns and keeps whichever gives the biggest pins,
     but never bigger than the size a few pins had before (15% of the
     cork's width). Runs whenever a pin comes or goes, and whenever the
     board changes size - see the two observers in start(). */
  const PIN_GAP = 12;                        // px, the same as .pins in display.css
  function fitPins() {
    const box = $('#pins');
    const count = box.children.length;
    if (!count) return;
    // getBoundingClientRect, not clientWidth: clientWidth rounds to whole
    // pixels, and half a pixel too many was enough to wrap the last pin.
    const style = getComputedStyle(box);
    const rect = box.getBoundingClientRect();
    const width = rect.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const height = rect.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    let best = 0;
    for (let cols = 1; cols <= count; cols++) {
      const rows = Math.ceil(count / cols);
      const size = Math.min((width - PIN_GAP * (cols - 1)) / cols,
                            (height - PIN_GAP * (rows - 1)) / rows);
      if (size > best) best = size;
    }
    box.style.setProperty('--pin-size', Math.floor(Math.min(best, width * 0.15)) + 'px');
  }

  function addToPost(bottle, animate) {
    const el = bottleArt('post-bottle' + (animate ? ' is-new' : ''));
    el.dataset.bottle = bottle.bottleId || '';
    const to = document.createElement('span');
    to.className = 'post-to';
    to.textContent = bottle.toEmblem || (bottle.to === 'who-teacher' ? '🧑‍🏫' : '👫');
    el.appendChild(to);
    $('#post').appendChild(el);
  }

  function clearStage() {
    clearShow();
    $('#landing').innerHTML = '';
    $('#sender').hidden = true;
    $('#teacher').hidden = true;
  }

  /* ---- real for a minute ---- */
  function startMinute() {
    if (ui.minuteTimer) return;
    const box = $('#minute');
    const ring = box.querySelector('.minute-ring');
    const began = Date.now();
    box.hidden = false;
    sfx('sfx-timer-ring');
    ui.minuteTimer = setInterval(() => {
      if (ui.paused) return;
      const left = Math.max(0, 1 - (Date.now() - began) / MINUTE_MS);
      ring.style.setProperty('--left', left.toFixed(3));
      if (left === 0) {
        clearInterval(ui.minuteTimer);
        ui.minuteTimer = null;
        box.hidden = true;
        sfx('sfx-timer-ring');
      }
    }, 250);
  }

  /* ---- the facilitator's keys ---- */
  document.addEventListener('keydown', event => {
    if (!$('#start').hidden) { start(); return; }
    const key = event.key.toLowerCase();
    if (key === ' ') { event.preventDefault(); release(); }
    else if (key === 'a') { ui.auto = !ui.auto; paintStatus(); maybeRelease(); }
    else if (key === 'p') { ui.paused = !ui.paused; $('#scene').classList.toggle('is-frozen', ui.paused); paintStatus(); maybeRelease(); }
    else if (key === 'h') hide();
    else if (key === 'c') { $('#pins').innerHTML = ''; }
    else if (key === 'm') { ui.muted = !ui.muted; if (ui.muted && speaking) speaking.pause(); paintStatus(); }
    else if (key === 'f') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); }
    else if (key === 'd') arrive(demoBottle(null));
    else if (/^[1-6]$/.test(key)) arrive(demoBottle(Number(key) - 1));
    else if (key === 's') { $('#settings').hidden = !$('#settings').hidden; $('#keys').hidden = true; }
    else if (key === '?' || key === '/') { $('#keys').hidden = !$('#keys').hidden; $('#settings').hidden = true; }
    else if (key === 'escape') { $('#keys').hidden = true; $('#settings').hidden = true; }
  });

  /* H (safeguarding): the bottle on screen goes - and everything it pinned -
     and the relay forgets it, so a reload cannot bring it back. With
     nothing playing, the most recently pinned thing goes instead. */
  function hide() {
    let id = null;
    if (ui.playing) {
      const { bottle, token } = ui.playing;
      token.cancelled = true;
      token.pins.forEach(p => p.remove());
      if (speaking) speaking.pause();
      id = bottle.bottleId;
      clearStage();
    } else {
      const pins = document.querySelectorAll('.pin');
      const lastPin = pins[pins.length - 1];
      if (!lastPin) return;
      id = lastPin.dataset.bottle;
      document.querySelectorAll('.pin').forEach(p => { if (p.dataset.bottle === id) p.remove(); });
    }
    if (id && id.indexOf('demo-') !== 0) {
      fetch('/hide', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({ bottleId: id }) }).catch(() => {});
    }
  }

  function paintStatus() {
    $('#status').textContent = (ui.auto ? '▶️' : '✋') + (ui.paused ? ' ⏸️' : '') + (ui.muted ? ' 🔇' : '');
  }

  /* ---- D: a demo bottle, made right here - it needs no network ---- */
  function demoBottle(door) {
    const powers = door === null ? STARS : DOORS[door];
    const power = door === null ? STARS[Math.floor(Math.random() * STARS.length)]
                                : (powers.find(p => STARS.indexOf(p) !== -1) || powers[0]);
    return {
      type: 'bottle',
      bottleId: 'demo-' + Date.now(),
      to: 'who-everyone',
      signed: true,
      from: { codename: 'Agent Demo', emblem: '🕵️', picture: null, handshake: [0, 250, 500, 1000] },
      items: [{ type: 'item-power', power: power, picture: null }, { type: 'item-drawing', picture: demoDrawing() }]
    };
  }
  function demoDrawing() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.lineWidth = 14; g.lineCap = 'round'; g.strokeStyle = '#ff9f1c';
    g.beginPath(); g.arc(128, 128, 54, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      g.beginPath();
      g.moveTo(128 + Math.cos(a) * 78, 128 + Math.sin(a) * 78);
      g.lineTo(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112);
      g.stroke();
    }
    return c.toDataURL('image/png');
  }

  /* ---- S: settings ---- */
  function setMotion(level) {
    document.body.dataset.motion = level;
    document.body.dataset.motionSet = '1';
    paintSettings();
  }
  function paintSettings() {
    const row = $('#motion-buttons');
    row.innerHTML = '';
    [['full', 'Full'], ['calm', 'Calm'], ['off', 'Off']].forEach(([id, label]) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.className = document.body.dataset.motion === id ? 'is-on' : '';
      b.addEventListener('click', () => setMotion(id));
      row.appendChild(b);
    });
    const list = $('#real-list');
    list.innerHTML = '';
    Object.keys(POWERS).forEach(id => {
      const b = document.createElement('button');
      b.textContent = POWERS[id][0] + ' ' + POWERS[id][1];
      b.className = ui.real.has(id) ? 'is-on' : '';
      b.addEventListener('click', () => {
        if (ui.real.has(id)) ui.real.delete(id); else ui.real.add(id);
        paintSettings();
      });
      list.appendChild(b);
    });
  }
})();
