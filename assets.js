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
    // Anything already loaded follows immediately.
    audioCache.forEach(function (audio) {
      if (audio && audio !== false && audio._isNarration) applySpeed(audio);
    });
  }

  function getSpeed() { return narrationSpeed; }

  function applySpeed(audio) {
    audio.playbackRate = narrationSpeed;
    audio.preservesPitch = true;
    audio.webkitPreservesPitch = true;      // Safari
    audio.mozPreservesPitch = true;
  }

  const BASE = './assets/';

  let manifest = { version: 0, hq: [], situations: [], stickers: [], narrator: [], sfx: [] };
  let byId = new Map();          // every item from every list, by its id
  const imageCache = new Map();  // id -> Promise<img|null>
  const audioCache = new Map();  // id -> HTMLAudioElement, or false if missing
  let narrating = null;          // the narration playing right now

  /* --------------------------------------------------------------------------
     LOADING THE MANIFEST
     A missing or broken manifest leaves the empty one above in place, which
     means every lookup politely returns nothing and every stand-in appears.
     ----------------------------------------------------------------------- */
  const ready = fetch(BASE + 'manifest.json', { cache: 'no-cache' })
    .then(function (response) {
      if (!response.ok) throw new Error('no manifest');
      return response.json();
    })
    .then(function (data) {
      manifest = data || manifest;
      ['hq', 'situations', 'stickers', 'narrator', 'sfx'].forEach(function (group) {
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
  function url(entry) { return BASE + entry.file; }


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
      picture.className = 'pic-card-img';
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
    if (narrating) { try { narrating.pause(); } catch (err) { /* harmless */ } }
    narrating = null;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  function say(id, options) {
    const opts = options || {};
    if (opts.muted) return Promise.resolve('muted');

    return ready.then(function () {
      const entry = item(id);
      const text = (entry && entry.text) || opts.text || '';

      // Never let two lines talk over each other.
      stopSaying();

      if (entry && audioCache.get(id) !== false) {
        const audio = getAudio(id, entry, NARRATOR_VOLUME, true);
        if (audio) {
          narrating = audio;
          audio.currentTime = 0;
          applySpeed(audio);                // v2 §7
          return audio.play()
            .then(function () { return 'file'; })
            .catch(function () {
              // The file is not there after all; remember that and speak.
              audioCache.set(id, false);
              return speak(text);
            });
        }
      }
      return speak(text);
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
    if (entry && audioCache.get(id) !== false) {
      const audio = getAudio(id, entry, SFX_VOLUME);
      if (audio) {
        audio.currentTime = 0;
        const played = audio.play();
        if (played && played.catch) {
          played.catch(function () {
            audioCache.set(id, false);
            generated(entry, id);
          });
        }
        return;
      }
    }
    generated(entry, id);
  }

  // Fall back to the sound audio.js builds from oscillators.
  function generated(entry, id) {
    if (typeof Voice === 'undefined' || !Voice.sfx) return;
    const name = (entry && entry.fallback) || id.replace(/^sfx-/, '');
    Voice.sfx(name);
  }

  function getAudio(id, entry, volume, isNarration) {
    if (audioCache.has(id)) {
      const held = audioCache.get(id);
      return held === false ? null : held;
    }
    const audio = new Audio(url(entry));
    audio.volume = volume;
    audio.preload = 'auto';
    audio._isNarration = Boolean(isNarration);
    if (isNarration) applySpeed(audio);
    // A file that turns out to be missing is remembered, so the stand-in is
    // used immediately next time rather than after another failed request.
    audio.addEventListener('error', function () { audioCache.set(id, false); });
    audioCache.set(id, audio);
    return audio;
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
    audioCache.forEach(function (value, key) {
      if (value === false) audioCache.delete(key);
    });
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
    stopSaying: stopSaying,
    sfx: sfx,
    preview: preview,
    manifest: function () { return manifest; }
  };
})();
