/* ============================================================================
   assets.js - pictures, narration and sounds, with a stand-in for every one
   ============================================================================
   V0 of the v2 spec (§5.0). Loaded before app.js; hands the rest of the app
   one global object: `Assets`.

   THE ONE RULE THIS FILE EXISTS TO KEEP
   **The app must work fully with an empty assets/ folder.** Filip is making
   the pictures and the narration at the same time as this is being built, and
   neither track waits for the other. So nothing here ever throws, and every
   missing thing has a stand-in:

     a missing picture  -> a card with a gradient, a big emoji and a label
     missing narration  -> the iPad reads the line out (speechSynthesis)
     a missing sound    -> the generated sound in audio.js (Voice.sfx)

   That is also why `Assets.ready` resolves when the manifest is MISSING just
   as happily as when it loads. "No assets" is a normal state, not an error.

   WHAT USES WHAT
     Assets.ready      a Promise: the manifest has been read, or found absent
     Assets.image(id)  resolves to a loaded <img>, or null
     Assets.say(id)    plays the narrator file, or speaks its text
     Assets.sfx(id)    plays the sound file, or the generated stand-in
     Assets.card(id)   builds a picture card, falling back to emoji + label
   ========================================================================== */

const Assets = (function () {

  // Several children are sound-sensitive, so narration leads and effects sit
  // under it (v2 §5.0). Named rather than sprinkled through the code.
  const NARRATOR_VOLUME = 1.0;
  const SFX_VOLUME = 0.5;

  /* HOW FAST THE NARRATOR SPEAKS (v2 §7)

     An adult setting, 0.8x / 0.9x / 1.0x, default 0.9x. Children with
     language disorders process speech more slowly (Zapparrata, Brooks & Ober,
     2023), and ElevenLabs' newest model has no speed setting of its own, so
     the app slows the playback itself.

     preservesPitch keeps the voice sounding like a person rather than a
     record played at the wrong speed. Safari needs the webkit- spelling too.
     The speechSynthesis stand-in takes the same number as utterance.rate, so
     a line without a recording is read at the same pace as one with. */
  const DEFAULT_SPEED = 0.9;
  let narrationSpeed = DEFAULT_SPEED;

  function setSpeed(value) {
    const speed = Number(value);
    narrationSpeed = (speed >= 0.5 && speed <= 2) ? speed : DEFAULT_SPEED;
    // The line playing now follows immediately.
    applySpeed(narrator);
  }

  function getSpeed() { return narrationSpeed; }

  function applySpeed(audio) {
    // Loading a new file resets playbackRate to defaultPlaybackRate, and the
    // one narration player loads a new file for every line: set both.
    audio.defaultPlaybackRate = narrationSpeed;
    audio.playbackRate = narrationSpeed;
    audio.preservesPitch = true;
    audio.webkitPreservesPitch = true;      // Safari
    audio.mozPreservesPitch = true;
  }

  const BASE = './assets/';

  let manifest = { version: 0, hq: [], situations: [], stickers: [], narrator: [], sfx: [] };
  let byId = new Map();          // every item from every list, by its id
  const imageCache = new Map();  // id -> Promise<img|null>
  const missing = new Set();     // sound and narration files found not to exist
  let speaking = null;           // the iPad's own voice's line, if that is speaking

  /* --------------------------------------------------------------------------
     THE PLAYERS (v101)
     iPad Safari lets a sound player start ON ITS OWN only if that same player
     has been started by a tap before. The app used to make a new player for
     every line - so a line whose first play came after a wait (the next
     Talking Mat card, after "Yes!" had finished) was refused, the refusal
     was taken for an interruption, and nothing was heard (Filip, 4 November:
     "the rest no sound"). Now there is ONE narration player and a few effect
     players, made once, and the child's first tap starts each of them with
     a moment of silence. From then on every line and every sound plays
     through them, whenever it comes. The same first tap wakes the Web Audio
     engine in audio.js (recordings, generated sounds), and every tap wakes
     it again in case the iPad put it to sleep.
     ----------------------------------------------------------------------- */
  const SILENCE = silentWav();
  const narrator = new Audio();
  let narratorHolds = null;      // the id of the line the narration player has loaded
  let lineToken = 0;             // goes up whenever a line starts or is stopped
  let lineDone = null;           // ends sayAndWait() for the line playing now
  narrator.addEventListener('ended', function () { finishLine(); });
  const SFX_PLAYERS = 4;         // effects may overlap: up to four at once
  const sfxPlayers = [];
  for (let i = 0; i < SFX_PLAYERS; i++) {
    const player = new Audio();
    player._holds = null;        // the id of the sound it has loaded
    sfxPlayers.push(player);
  }
  let sfxTurn = 0;
  let unlocked = false;

  /* A tenth of a second of silence, as a data: address (the CSP allows
     media-src data:) - so unlocking needs no file. 8-bit, 8 kHz, mono. */
  function silentWav() {
    const n = 800;
    const bytes = new Uint8Array(44 + n);
    const view = new DataView(bytes.buffer);
    const text = function (at, s) { for (let i = 0; i < s.length; i++) bytes[at + i] = s.charCodeAt(i); };
    text(0, 'RIFF'); view.setUint32(4, 36 + n, true); text(8, 'WAVE');
    text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);   // PCM
    view.setUint16(22, 1, true); view.setUint32(24, 8000, true);                    // mono, 8 kHz
    view.setUint32(28, 8000, true); view.setUint16(32, 1, true); view.setUint16(34, 8, true);
    text(36, 'data'); view.setUint32(40, n, true);
    bytes.fill(128, 44);                                                            // 8-bit silence
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return 'data:audio/wav;base64,' + btoa(s);
  }

  function unlockPlayers() {
    if (typeof Voice !== 'undefined' && Voice.unlock) Voice.unlock();
    if (unlocked) return;
    unlocked = true;
    [narrator].concat(sfxPlayers).forEach(function (player) {
      if (!player.paused) return;               // already playing: already allowed
      try {
        player.src = SILENCE;
        if (player === narrator) narratorHolds = null; else player._holds = null;
        const started = player.play();
        if (started && started.catch) {
          started.catch(function (err) {
            // Not a tap Safari counts: try again on the next one.
            if (err && err.name === 'NotAllowedError') unlocked = false;
          });
        }
      } catch (err) { /* harmless */ }
    });
  }
  // Capture phase, so it runs before the tap's own handler starts a line.
  ['touchend', 'pointerup', 'click', 'keydown'].forEach(function (type) {
    document.addEventListener(type, unlockPlayers, { capture: true, passive: true });
  });

  /* --------------------------------------------------------------------------
     LOADING THE MANIFEST
     A missing or broken manifest leaves the empty one above in place, which
     means every lookup politely returns nothing and every stand-in appears.
     ----------------------------------------------------------------------- */
  /* The list is asked for under THIS release's number (v98): ?v= from this
     file's own address. A new release is then a new address, which no old
     saved copy can answer. Without it, the offline copy still running from
     the last release answered with ITS list - which had never heard of the
     new lines - and every new line was read in the iPad's own voice until
     the new version finished installing (Filip, 4 November: "it's a robotic
     voice now"). */
  const RELEASE = (document.currentScript && /[?&]v=([^&]+)/.exec(document.currentScript.src) || [])[1] || '';
  const ready = fetch(BASE + 'manifest.json' + (RELEASE ? '?v=' + RELEASE : ''), { cache: 'no-cache' })
    .then(function (response) {
      if (!response.ok) throw new Error('no manifest');
      return response.json();
    })
    .then(function (data) {
      manifest = data || manifest;
      // v3 §11.1 adds four picture groups: powers, doors, display, cards.
      ['hq', 'situations', 'stickers', 'narrator', 'sfx',
       'powers', 'doors', 'display', 'cards'].forEach(function (group) {
        (manifest[group] || []).forEach(function (item) {
          item.group = group;
          byId.set(item.id, item);
        });
      });
      return manifest;
    })
    .catch(function () {
      // No manifest at all. Entirely normal before any assets are made.
      return manifest;
    });

  function item(id) { return byId.get(id) || null; }
  function list(group) { return (manifest[group] || []).slice(); }
  /* The file's address, with its fingerprint (`rev`, from sync-assets.py)
     when it has one: a remade file is a new address, so no browser and no
     iPad goes on playing the old one it had saved. sw.js caches the same
     address. */
  function url(entry) { return BASE + entry.file + (entry.rev ? '?r=' + entry.rev : ''); }


  /* --------------------------------------------------------------------------
     PICTURES
     image() resolves to a loaded <img> or to null - never a rejected Promise,
     so callers never need a try/catch to draw a card.
     ----------------------------------------------------------------------- */
  function image(id) {
    if (imageCache.has(id)) return imageCache.get(id);

    const promise = ready.then(function () {
      const entry = item(id);
      if (!entry || !entry.file) return null;
      return new Promise(function (resolve) {
        const img = new Image();
        img.onload = function () { resolve(img); };
        img.onerror = function () { resolve(null); };   // missing: use a stand-in
        img.src = url(entry);
      });
    });

    imageCache.set(id, promise);
    return promise;
  }

  /* Has this picture actually arrived?

     This deliberately does NOT go through image(), which caches its answer.
     The Asset check is pressed straight after dropping new files in, and a
     remembered "no" would tell Filip the file is missing when it is sitting
     right there. It asks the server fresh, exactly as hasAudio does. */
  function hasImage(id) {
    return exists(id);
  }

  /* Does this item's file exist? One request, no caching, never throws. */
  function exists(id) {
    return ready.then(function () {
      const entry = item(id);
      if (!entry || !entry.file) return false;
      return fetch(url(entry), { method: 'HEAD', cache: 'no-store' })
        .then(function (response) { return response.ok; })
        .catch(function () { return false; });
    });
  }

  /* Build a picture card for `id`: the photo if it exists, otherwise a soft
     gradient with the fallback emoji large in the middle (v2 §5.0). The label
     goes underneath either way, so the card reads the same to a child whether
     or not the picture has been made yet. */
  function card(id, options) {
    const opts = options || {};
    const entry = item(id);

    const button = document.createElement('button');
    button.className = 'pic-card' + (opts.className ? ' ' + opts.className : '');
    button.dataset.assetId = id;

    const art = document.createElement('span');
    art.className = 'pic-card-art';

    const fallback = document.createElement('span');
    fallback.className = 'pic-card-emoji';
    fallback.textContent = (entry && entry.fallback) || opts.fallback || '🖼️';
    art.appendChild(fallback);

    const label = document.createElement('span');
    label.className = 'pic-card-label';
    label.textContent = (entry && entry.label) || opts.label || id;

    button.appendChild(art);
    button.appendChild(label);
    button.setAttribute('aria-label', label.textContent);

    // Swap the emoji for the real picture once (and if) it loads.
    image(id).then(function (img) {
      if (!img) return;
      const picture = document.createElement('img');
      // A photograph (JPEG) fills its card edge to edge; a cut-out (PNG,
      // with a clear background) is shown whole, or a square picture in a
      // 4:3 card loses its top and bottom - a power's speech bubble did.
      const cutout = /\.png$/i.test((entry && entry.file) || '');
      picture.className = 'pic-card-img' + (cutout ? ' is-cutout' : '');
      picture.alt = '';
      picture.src = img.src;
      art.insertBefore(picture, art.firstChild);
      button.classList.add('has-image');
    });

    return button;
  }


  /* --------------------------------------------------------------------------
     NARRATION (v2 §7)
     A recorded line if Filip has made it, otherwise the iPad's own voice
     reading the same words. The child hears the same sentence either way.
     ----------------------------------------------------------------------- */
  function stopSaying() {
    lineToken++;
    try { narrator.pause(); } catch (err) { /* harmless */ }
    finishLine();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  // The line playing now has ended (or been stopped): its sayAndWait() is over.
  function finishLine() {
    const done = lineDone;
    lineDone = null;
    if (done) done();
  }

  function say(id, options) {
    return sayLine(id, options).then(function (result) { return result.how; });
  }

  /* say(), also telling sayAndWait() WHICH line it started (`token`), so it
     never waits on a line that has already been replaced. */
  function sayLine(id, options) {
    const opts = options || {};
    if (opts.muted) return Promise.resolve({ how: 'muted' });

    return ready.then(function () {
      const entry = item(id);
      const text = (entry && entry.text) || opts.text || '';

      // Never let two lines talk over each other.
      stopSaying();
      const token = lineToken;

      if (entry && entry.file && !missing.has(id)) {
        // The one narration player loads this line - or, if it already
        // holds it (a card tapped again), starts it from the beginning.
        if (narratorHolds !== id) {
          narrator.src = url(entry);
          narratorHolds = id;
        } else {
          try { narrator.currentTime = 0; } catch (err) { /* harmless */ }
        }
        narrator.volume = NARRATOR_VOLUME;
        applySpeed(narrator);               // v2 §7
        return narrator.play()
          .then(function () {
            return { how: token === lineToken ? 'file' : 'interrupted', token: token };
          })
          .catch(function (err) {
            /* INTERRUPTED is not MISSING. When the next line starts before
               this one has, play() rejects with an AbortError; before the
               first tap, with a NotAllowedError. Treating either as a
               missing file spoke the line in the iPad's voice OVER the next
               one (Filip, 4 November: "not vocalised"). */
            if (interrupted(err) || token !== lineToken) return { how: 'interrupted', token: token };
            // The file is not there after all; remember that and speak.
            missing.add(id);
            narratorHolds = null;
            return { how: speak(text), token: token };
          });
      }
      return { how: speak(text), token: token };
    });
  }

  /* Say a line and resolve when it has FINISHED - not when it starts, as
     say() does - so a list of lines can be read out one after another
     (v3 §7.3: a power's sentence reads itself back, card by card).

     It never waits for ever: `maxMs` (6 s unless given) is a ceiling, for a
     line that never reports its end. Like everything here, it never throws. */
  function sayAndWait(id, options) {
    const opts = options || {};
    const maxMs = opts.maxMs || 6000;
    return new Promise(function (resolve) {
      let done = false;
      const finish = function () { if (!done) { done = true; resolve(); } };
      setTimeout(finish, maxMs);
      sayLine(id, opts).then(function (result) {
        const how = result.how;
        if (how === 'file') {
          // Over when it ends, or when anything else is said or stopped
          // (stopSaying) - unless it was replaced before we got here.
          if (result.token !== lineToken || narrator.ended) finish();
          else lineDone = finish;
        } else if (how === 'speech' && 'speechSynthesis' in window) {
          /* The utterance says when it ends. As a back-up, ask the voice
             every 150 ms - but count a line that is still QUEUED as talking
             (`pending`): the iPad's voice can take a moment to start, and
             checking only `speaking` decided the line was over before it
             began, so the next line cut it off ("My agent likes…" was
             never heard - Filip, 4 November). */
          if (speaking) {
            speaking.addEventListener('end', finish, { once: true });
            speaking.addEventListener('error', finish, { once: true });
          }
          let started = false;
          const poll = setInterval(function () {
            if (speechSynthesis.speaking) started = true;
            if (started && !speechSynthesis.speaking && !speechSynthesis.pending) {
              clearInterval(poll);
              finish();
            }
            if (done) clearInterval(poll);
          }, 150);
        } else {
          finish();
        }
      }, finish);
    });
  }

  /* The stand-in for narration. `[whispers]` is a tag for the voice service,
     not something to read out, so it is stripped before speaking. */
  function speak(text) {
    if (!text || !('speechSynthesis' in window)) return 'none';
    const spoken = text.replace(/^\[[^\]]*\]\s*/, '');
    const utterance = new SpeechSynthesisUtterance(spoken);
    // v2 §7: the same pace as a recorded line, so the two are consistent.
    utterance.rate = narrationSpeed;
    utterance.pitch = 1.05;
    utterance.volume = NARRATOR_VOLUME;
    speaking = utterance;
    speechSynthesis.speak(utterance);
    return 'speech';
  }


  /* --------------------------------------------------------------------------
     SOUND EFFECTS
     The file if it exists, otherwise the generated sound named in the
     manifest's `fallback` - which is why audio.js still makes its own sounds.
     ----------------------------------------------------------------------- */
  function sfx(id, options) {
    const opts = options || {};
    if (opts.muted) return;

    const entry = item(id);
    if (entry && entry.file && !missing.has(id)) {
      // A free player that already holds this sound; else a free one; else
      // the next in turn (cutting short the oldest sound still playing).
      const free = function (player) { return player.paused || player.ended; };
      let player = sfxPlayers.find(function (p) { return p._holds === id && free(p); });
      if (!player) {
        player = sfxPlayers.find(free) || sfxPlayers[sfxTurn++ % SFX_PLAYERS];
        player.src = url(entry);
        player._holds = id;
      } else {
        try { player.currentTime = 0; } catch (err) { /* harmless */ }
      }
      player.volume = SFX_VOLUME;
      const played = player.play();
      if (played && played.catch) {
        played.catch(function (err) {
          // Before the first tap: the generated sound, rather than nothing.
          if (err && err.name === 'NotAllowedError') { generated(entry, id); return; }
          if (interrupted(err)) return;       // cut short, not missing
          missing.add(id);
          player._holds = null;
          generated(entry, id);
        });
      }
      return;
    }
    generated(entry, id);
  }

  /* A play() that was cut short (AbortError: paused or reloaded before it
     began) or not allowed yet (NotAllowedError: no tap so far) says
     nothing about whether the FILE exists. Only other errors do. */
  function interrupted(err) {
    return Boolean(err && (err.name === 'AbortError' || err.name === 'NotAllowedError'));
  }

  // Fall back to the sound audio.js builds from oscillators.
  function generated(entry, id) {
    if (typeof Voice === 'undefined' || !Voice.sfx) return;
    const name = (entry && entry.fallback) || id.replace(/^sfx-/, '');
    Voice.sfx(name);
  }

  /* Start loading a narration line before it is said (v97). A line used to
     load only when it was due, so the second of two lines in a row waited
     for its file - on the iPad, a pause long enough for Filip to notice.
     Harmless if the file is missing or the browser ignores load(). */
  const warmed = new Set();
  function warm(id) {
    ready.then(function () {
      const entry = item(id);
      if (!entry || !entry.file || missing.has(id) || warmed.has(id)) return;
      warmed.add(id);
      // Only the file is fetched (into the offline copy's cache); the player
      // is not touched, so a warm-up can never mark a line as missing.
      fetch(url(entry)).catch(function () { /* harmless */ });
    });
  }

  /* Does this sound or narration file actually exist? The adult panel's Asset
     check asks, so it must not play anything to find out. */
  function hasAudio(id) {
    return exists(id);
  }

  /* Forget what we have learned about missing files. Called when the Asset
     check runs, so a file that has just arrived is picked up without the
     adult having to close and reopen the whole app. */
  function refresh() {
    imageCache.clear();
    missing.clear();
  }

  // Play a file the adult panel is previewing, whatever the mute setting.
  function preview(id) {
    const entry = item(id);
    if (!entry) return;
    if (entry.group === 'narrator') say(id);
    else sfx(id);
  }

  return {
    ready: ready,
    NARRATOR_VOLUME: NARRATOR_VOLUME,
    SFX_VOLUME: SFX_VOLUME,
    DEFAULT_SPEED: DEFAULT_SPEED,
    setSpeed: setSpeed,
    getSpeed: getSpeed,
    item: item,
    list: list,
    url: url,
    image: image,
    hasImage: hasImage,
    hasAudio: hasAudio,
    exists: exists,
    refresh: refresh,
    card: card,
    say: say,
    sayAndWait: sayAndWait,
    stopSaying: stopSaying,
    warm: warm,
    sfx: sfx,
    preview: preview,
    manifest: function () { return manifest; }
  };
})();
