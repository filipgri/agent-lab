/* ============================================================================
   audio.js - recording the voice password, and playing it through filters
   ============================================================================
   MILESTONE 3. Everything to do with sound lives here, so app.js stays about
   screens and state. It is loaded BEFORE app.js (see index.html) and hands the
   rest of the app one global object: `Voice`.

   THE TWO HALVES
     1. RECORDING. The microphone -> a MediaRecorder -> a Blob we hand to
        storage.js. Spec §7 gives it a 10-second limit with a filling ring.
     2. PLAYBACK. The Blob is decoded once into an AudioBuffer, and every play
        builds a small Web Audio "graph" that bends the sound on the way out.

   WHY THE ORIGINAL IS NEVER CHANGED (spec §7)
   The filters are built fresh on each play and thrown away afterwards. The
   recording itself is never rewritten, so a child can try Robot, hate it, and
   their real voice is still exactly as they said it.

   WHAT A "GRAPH" MEANS
   Web Audio works like plugging guitar pedals together: a source node, then
   boxes that change the sound, then the speakers (`ctx.destination`). You
   connect them with .connect(). Nothing is heard until the chain reaches the
   destination.

   iPAD SAFARI RULES THIS FILE OBEYS (spec §9)
   - The audio engine may only start inside a tap, so unlock() is called from a
     real button press, never on page load.
   - Safari records audio/mp4, not the audio/webm other browsers use, so the
     type is chosen by asking rather than assuming.
   - The microphone track is stopped the moment recording ends, so the red
     recording dot in the status bar goes away.
   ========================================================================== */

const Voice = (function () {

  const MAX_MS = 10000;          // spec §7: ten seconds, then it stops itself

  let ctx = null;                // the one AudioContext, made on first tap
  let recorder = null;           // the live MediaRecorder, while recording
  let micStream = null;          // the live microphone, so it can be released
  let tickTimer = null;          // drives the filling ring
  let stopTimer = null;          // the 10-second auto-stop
  let playing = null;            // { source, onEnded } for the current playback
  const decoded = new Map();     // audioId -> AudioBuffer, so we decode once


  /* ==========================================================================
     THE FILTERS (spec §7)
     Each one is just a recipe for wiring nodes together. `build` receives the
     source node and returns the node that should be connected to the speakers.
     ========================================================================== */
  const FILTERS = [
    {
      id: 'normal', icon: '🙂', label: 'Normal',
      build: (src) => src
    },
    {
      // playbackRate also raises the pitch, which is the chipmunk effect wanted.
      id: 'squeaky', icon: '🐭', label: 'Squeaky',
      build: (src) => { src.playbackRate.value = 1.5; return src; }
    },
    {
      id: 'deep', icon: '🐻', label: 'Deep',
      build: (src) => { src.playbackRate.value = 0.7; return src; }
    },
    {
      /* RING MODULATION. A GainNode is a volume knob. Normally you set it to a
         number, but a knob is an AudioParam, and an oscillator can be connected
         straight to it. So the volume is turned up and down 50 times a second,
         far too fast to hear as volume - it is heard as a robot rasp instead.
         gain.value starts at 0 so ONLY the oscillator moves the knob. */
      id: 'robot', icon: '🤖', label: 'Robot',
      build: (src) => {
        const ring = ctx.createGain();
        ring.gain.value = 0;
        const osc = ctx.createOscillator();
        osc.frequency.value = 50;
        osc.connect(ring.gain);
        osc.start();
        src._extras.push(osc);          // remembered so it can be stopped later
        src.connect(ring);
        return ring;
      }
    },
    {
      /* SPY RADIO. A walkie-talkie sounds thin because it throws away the deep
         and the bright parts of a voice: highpass keeps what is ABOVE 300Hz,
         lowpass keeps what is BELOW 3000Hz. The waveshaper then roughs it up
         slightly, the way a cheap speaker does. */
      id: 'radio', icon: '📻', label: 'Spy radio',
      build: (src) => {
        const high = ctx.createBiquadFilter();
        high.type = 'highpass';
        high.frequency.value = 300;

        const low = ctx.createBiquadFilter();
        low.type = 'lowpass';
        low.frequency.value = 3000;

        const shaper = ctx.createWaveShaper();
        shaper.curve = makeDistortionCurve(12);   // 12 = light, not a fuzz pedal

        src.connect(high);
        high.connect(low);
        low.connect(shaper);
        return shaper;
      }
    },
    {
      /* ECHO. The delay holds the sound for a quarter second, then plays it.
         Its output is fed back into its own input at 40% volume, so each repeat
         is quieter than the last and the echo dies away instead of screaming.
         The dry (untouched) signal is mixed in so the voice is still clear. */
      id: 'echo', icon: '🏔️', label: 'Echo',
      build: (src) => {
        const mix = ctx.createGain();

        const delay = ctx.createDelay(1.0);
        delay.delayTime.value = 0.25;

        const feedback = ctx.createGain();
        feedback.gain.value = 0.4;

        src.connect(mix);                 // dry
        src.connect(delay);               // wet
        delay.connect(feedback);
        feedback.connect(delay);          // the loop that makes it repeat
        delay.connect(mix);
        return mix;
      }
    }
  ];

  /* A WaveShaper needs a "curve": a lookup table saying what each incoming
     value becomes. This is the standard gentle-distortion curve - values near
     zero are left almost alone, loud ones get squashed. */
  function makeDistortionCurve(amount) {
    const samples = 1024;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;              // spread across -1 .. 1
      curve[i] = ((3 + amount) * x * 20 * Math.PI / 180) /
                 (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }


  /* ==========================================================================
     STARTING THE ENGINE (spec §9)
     Safari refuses to make noise until the person has tapped something. So this
     is called from inside a real button press, never when the page loads.
     ========================================================================== */
  function unlock() {
    if (!ctx) {
      // Older Safari calls it webkitAudioContext.
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      ctx = new Ctx();
    }
    // A context can go to sleep when the app is backgrounded; wake it up.
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Can this device record at all? Very old iPads cannot.
  function canRecord() {
    return Boolean(navigator.mediaDevices &&
                   navigator.mediaDevices.getUserMedia &&
                   window.MediaRecorder);
  }

  /* Which container does this browser record into? Safari says audio/mp4;
     Chrome and Firefox say audio/webm. Asking rather than assuming is what
     spec §9 calls for. Returning '' lets the browser pick for itself. */
  function pickMimeType() {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    const wanted = ['audio/mp4', 'audio/webm', 'audio/webm;codecs=opus'];
    for (const type of wanted) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  }


  /* ==========================================================================
     RECORDING
     record() hands back a Promise that settles when recording has finished -
     either because the child tapped stop, or because the 10 seconds ran out.
     `onTick` is called about 20 times a second with how far through we are
     (0 to 1), which is what fills the ring.
     ========================================================================== */
  function record(options) {
    const opts    = options || {};
    const maxMs   = opts.maxMs || MAX_MS;
    const onTick  = opts.onTick || function () {};

    return new Promise(function (resolve, reject) {
      if (!canRecord()) {
        reject(new Error('no-recorder'));
        return;
      }

      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        micStream = stream;

        const mimeType = pickMimeType();
        try {
          recorder = mimeType ? new MediaRecorder(stream, { mimeType: mimeType })
                              : new MediaRecorder(stream);
        } catch (err) {
          releaseMic();
          reject(err);
          return;
        }

        // The recorder hands us the sound in pieces; collect them all.
        const chunks = [];
        recorder.ondataavailable = function (event) {
          if (event.data && event.data.size > 0) chunks.push(event.data);
        };

        const startedAt = Date.now();

        recorder.onstop = function () {
          clearInterval(tickTimer);
          clearTimeout(stopTimer);
          releaseMic();                       // spec §9: let the red dot go away

          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/mp4' });
          const ms   = Date.now() - startedAt;
          recorder = null;
          onTick(1);
          resolve({ blob: blob, ms: ms });
        };

        recorder.onerror = function () {
          clearInterval(tickTimer);
          clearTimeout(stopTimer);
          releaseMic();
          recorder = null;
          reject(new Error('recorder-error'));
        };

        recorder.start();

        // Fill the ring, and stop ourselves at the limit (spec §7).
        tickTimer = setInterval(function () {
          onTick(Math.min(1, (Date.now() - startedAt) / maxMs));
        }, 50);
        stopTimer = setTimeout(stop, maxMs);

      }).catch(function (err) {
        // Most often this is the child (or the iPad) refusing the microphone.
        releaseMic();
        reject(err);
      });
    });
  }

  function stop() {
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();              // this triggers onstop above
    }
  }

  function isRecording() {
    return Boolean(recorder && recorder.state === 'recording');
  }

  /* Spec §9: stopping every track hands the microphone back to the iPad, which
     is what makes the red recording indicator disappear. Without this it stays
     lit and looks like the app is still listening. */
  function releaseMic() {
    if (!micStream) return;
    micStream.getTracks().forEach(function (track) { track.stop(); });
    micStream = null;
  }


  /* ==========================================================================
     PLAYBACK THROUGH A FILTER
     ========================================================================== */

  /* Turn a recorded Blob into an AudioBuffer - raw numbers Web Audio can work
     with. Decoding is slow-ish, so the result is kept against its audioId and
     every later play reuses it.

     decodeAudioData has two forms: the modern one returns a Promise, the old
     Safari one takes callbacks. Trying the Promise and falling back covers
     both without caring which iPad this is. */
  async function toBuffer(audioId, blob) {
    if (decoded.has(audioId)) return decoded.get(audioId);
    unlock();
    if (!ctx) throw new Error('no-audio-context');

    const bytes = await blob.arrayBuffer();     // spec §9

    const buffer = await new Promise(function (resolve, reject) {
      let settled = false;
      const maybe = ctx.decodeAudioData(
        bytes,
        function (b) { settled = true; resolve(b); },
        function (e) { settled = true; reject(e || new Error('decode-failed')); }
      );
      // Modern Safari also returns a Promise from the same call.
      if (maybe && typeof maybe.then === 'function' && !settled) {
        maybe.then(resolve, reject);
      }
    });

    decoded.set(audioId, buffer);
    return buffer;
  }

  /* Play a recording with one filter applied. Returns a Promise that resolves
     when the sound has finished (or was stopped). */
  async function play(audioId, blob, filterId, onEnded) {
    stopPlayback();                      // never two voices at once
    const buffer = await toBuffer(audioId, blob);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    /* Nodes that have to be stopped by hand (the robot's oscillator) are
       parked here by the filter recipe, so stopPlayback can find them. */
    source._extras = [];

    const filter = FILTERS.find(f => f.id === filterId) || FILTERS[0];
    const tail = filter.build(source);
    tail.connect(ctx.destination);
    // Spec §5a: the voice drives the body, so playback is tapped for loudness.
    attachAnalyser(tail);

    source.onended = function () {
      cleanUp(source);
      if (playing && playing.source === source) playing = null;
      if (onEnded) onEnded();
    };

    playing = { source: source };
    source.start();
    return source;
  }

  function stopPlayback() {
    if (!playing) return;
    const source = playing.source;
    playing = null;
    try { source.stop(); } catch (err) { /* already finished: harmless */ }
    cleanUp(source);
  }

  function cleanUp(source) {
    (source._extras || []).forEach(function (node) {
      try { node.stop(); } catch (err) { /* harmless */ }
      try { node.disconnect(); } catch (err) { /* harmless */ }
    });
    source._extras = [];
    try { source.disconnect(); } catch (err) { /* harmless */ }
  }

  // If a recording is replaced, its decoded copy must go too, or the old
  // sound would keep playing from memory.
  function forget(audioId) {
    decoded.delete(audioId);
  }

  /* How long is a clip, in seconds? Used to show "3s" under a slot. */
  async function durationOf(audioId, blob) {
    try {
      const buffer = await toBuffer(audioId, blob);
      return buffer.duration;
    } catch (err) {
      return 0;
    }
  }

  /* ==========================================================================
     SOUND EFFECTS (spec §5a, added in Milestone 8)
     ==========================================================================
     Every sound is MADE here rather than loaded, because spec §4 allows no
     files from anywhere and §3 allows no downloads. An oscillator with a
     falling volume is a surprisingly convincing thud or pop.

     Nothing plays while the app is muted; app.js passes that in.
     ========================================================================== */

  let muted = false;
  function setMuted(value) { muted = Boolean(value); }

  /* One note. `type` is the waveform, and the gain envelope is what turns a
     continuous tone into a short sound: up quickly, then down to silence. */
  function tone(opts) {
    if (muted) return;
    unlock();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.from, now);
    if (opts.to && opts.to !== opts.from) {
      // A falling pitch reads as a thud; a rising one reads as a success.
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), now + opts.length);
    }

    const peak = (opts.volume === undefined ? 0.25 : opts.volume);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + opts.length);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + opts.length + 0.02);
  }

  /* A short burst of noise, for anything that should sound like a thud or a
     rustle rather than a note. Random samples ARE noise. */
  function noise(length, volume, filterHz) {
    if (muted) return;
    unlock();
    if (!ctx) return;

    const frames = Math.floor(ctx.sampleRate * length);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      // Fade it out across its length, or it ends with an audible click.
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = filterHz || 900;

    const gain = ctx.createGain();
    gain.gain.value = volume === undefined ? 0.3 : volume;

    src.connect(low);
    low.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  // The named sounds the app asks for.
  const SFX = {
    pop:    () => tone({ type: 'sine',     from: 520, to: 900, length: 0.12, volume: 0.22 }),
    tap:    () => tone({ type: 'triangle', from: 420, to: 520, length: 0.07, volume: 0.14 }),
    stamp:  () => { noise(0.18, 0.35, 600);
                    tone({ type: 'sine', from: 180, to: 60, length: 0.22, volume: 0.3 }); },
    whoosh: () => noise(0.3, 0.12, 1800),
    power:  () => tone({ type: 'sawtooth', from: 160, to: 860, length: 0.5, volume: 0.18 }),
    sparkle:() => tone({ type: 'sine',     from: 1200, to: 1900, length: 0.18, volume: 0.12 }),
    error:  () => tone({ type: 'square',   from: 220, to: 160, length: 0.18, volume: 0.12 })
  };

  function sfx(name) {
    const play = SFX[name];
    if (play) play();
  }

  /* ==========================================================================
     LOUDNESS WHILE A RECORDING PLAYS (spec §5a item 2)
     An AnalyserNode is a tap on the audio: it hands back the waveform as it
     passes. RMS - root mean square - is the usual way of turning a block of
     samples into one "how loud is it right now" number.
     ========================================================================== */
  let analyser = null;

  function attachAnalyser(node) {
    if (!ctx) return null;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    node.connect(analyser);     // a tap, not a redirect: the sound still plays
    return analyser;
  }

  function loudness() {
    if (!analyser) return 0;
    const data = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    return Math.sqrt(sum / data.length);          // 0 = silence, ~1 = very loud
  }

  // Everything listed here becomes available as Voice.<name> in app.js.
  return {
    sfx: sfx,
    setMuted: setMuted,
    loudness: loudness,
    MAX_MS: MAX_MS,
    FILTERS: FILTERS,
    unlock: unlock,
    canRecord: canRecord,
    record: record,
    stop: stop,
    isRecording: isRecording,
    play: play,
    stopPlayback: stopPlayback,
    forget: forget,
    durationOf: durationOf
  };
})();
