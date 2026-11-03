/* ============================================================================
   display.js - the big-screen display (v3 §9.5), P1's bare version
   ============================================================================

   Listens to the relay's live feed (/events) and, for each bottle that
   arrives, plays a chime and shows who sent it: the sender's symbol and
   codename, or a ? for a mystery bottle. One at a time, in the order they
   came. P7 turns this into the shore, the board and the queue.

   SYNTAX NOTES FOR A BEGINNER
   - `new EventSource('/events')` opens the relay's never-ending reply. Each
     time the relay writes a bottle into it, the 'bottle' listener runs. If the
     Wi-Fi drops, EventSource reconnects by itself and tells the relay the
     last bottle it saw, so nothing is missed and nothing comes twice.
   - The display works as a little queue (an array): arrivals are pushed on
     the end and shown from the front, so two bottles sent at once never
     overlap on screen (§9.5: "one arrival at a time").
   ========================================================================== */

(function () {
  'use strict';

  const SHOW_MS = 5000;            // how long each arrival stays on screen
  const LEAVE_MS = 700;            // must match .is-leaving in display.css
  const CHIME_FILE = 'assets/audio/sfx/sfx-bottle-arrive.mp3';
  const VOLUME = 0.6;              // §9.5: capped, never sudden or loud

  const queue = [];
  let showing = false;
  let muted = false;
  let audioContext = null;

  const $ = selector => document.querySelector(selector);

  /* ---- 1. Start: one click, so the browser will allow sound ---- */
  function start() {
    $('#start').hidden = true;
    $('#stage').hidden = false;
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (err) { audioContext = null; }
    connect();
  }
  $('#start').addEventListener('click', start);
  document.addEventListener('keydown', event => {
    if (!$('#start').hidden) { start(); return; }
    // P1 has only two keys; P7 adds the facilitator's full set (§9.5).
    if (event.key === 'm' || event.key === 'M') muted = !muted;
    if (event.key === 'f' || event.key === 'F') toggleFullScreen();
  });

  function toggleFullScreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  }

  /* ---- 2. The live feed from the relay ---- */
  function connect() {
    const feed = new EventSource('/events');
    feed.addEventListener('open', () => $('#link-dot').classList.add('is-on'));
    feed.addEventListener('error', () => $('#link-dot').classList.remove('is-on'));
    feed.addEventListener('bottle', event => {
      let message;
      try { message = JSON.parse(event.data); } catch (err) { return; }
      // A replay is a bottle from earlier in this run, sent so a reloaded
      // display can rebuild its board (P7). It is not a new arrival, so it
      // gets no chime and no moment on screen.
      if (message.replay) return;
      queue.push(message.bottle);
      showNext();
    });
  }

  /* ---- 3. One arrival at a time ---- */
  function showNext() {
    if (showing || queue.length === 0) return;
    showing = true;
    const bottle = queue.shift();

    chime();

    const box = $('#arrival');
    const signed = bottle.signed && bottle.from;
    box.classList.toggle('is-mystery', !signed);
    box.classList.remove('is-leaving');
    // textContent, never innerHTML: a codename is shown as plain text, so
    // nothing a child typed can ever be read as code.
    $('#arrival-emblem').textContent = signed ? (bottle.from.emblem || '🕵️') : '?';
    $('#arrival-name').textContent = signed ? (bottle.from.codename || '') : '';
    box.hidden = false;
    // Restart the arrival animation even if the box was already visible.
    box.style.animation = 'none';
    void box.offsetWidth;
    box.style.animation = '';

    setTimeout(() => {
      box.classList.add('is-leaving');
      setTimeout(() => {
        box.hidden = true;
        showing = false;
        showNext();
      }, LEAVE_MS);
    }, SHOW_MS);
  }

  /* ---- 4. The chime: Filip's file if it is there, a made one if not ---- */
  function chime() {
    if (muted) return;
    const audio = new Audio(CHIME_FILE);
    audio.volume = VOLUME;
    audio.play().catch(madeChime);
  }

  /* Two soft notes, like a doorbell, if the sound file has not been made. */
  function madeChime() {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    [[784, 0], [1047, 0.18]].forEach(([frequency, delay]) => {
      const tone = audioContext.createOscillator();
      const level = audioContext.createGain();
      tone.type = 'sine';
      tone.frequency.value = frequency;
      level.gain.setValueAtTime(0, now + delay);
      level.gain.linearRampToValueAtTime(0.25 * VOLUME, now + delay + 0.02);
      level.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.8);
      tone.connect(level).connect(audioContext.destination);
      tone.start(now + delay);
      tone.stop(now + delay + 0.85);
    });
  }
})();
