/* ============================================================================
   effects.js - particles and screen shake (spec §5a)
   ============================================================================
   MILESTONE 8. Spec §5a asks for particle bursts drawn on ONE small canvas,
   with no libraries. This file is that canvas and the little physics engine
   that moves the sparkles around. It is loaded before app.js and hands the
   rest of the app one global object: `Effects`.

   HOW A PARTICLE SYSTEM WORKS
   Each sparkle is a plain object with a position, a speed, and a life. Sixty
   times a second we move every sparkle by its speed, pull it downwards a
   little (gravity), take some life away, and draw it. When its life reaches
   zero it is forgotten. That is the whole idea.

   THE GUARDRAILS FROM SPEC §5a
   - Never more than 80 particles at once, however many bursts are asked for.
   - Nothing is drawn at all when the motion level is Calm or Off.
   - The loop stops when every sparkle has gone, and when the app is hidden,
     so a backgrounded iPad is not quietly burning battery.
   - No flashing: sparkles fade out smoothly rather than blinking.
   ========================================================================== */

const Effects = (function () {

  const MAX_PARTICLES = 80;        // spec §5a
  const GRAVITY = 0.35;

  let canvas = null;
  let ctx = null;
  let particles = [];
  let running = false;

  /* The canvas covers the screen, sits above everything, and ignores taps
     entirely - a sparkle must never swallow a child's finger. */
  function ensureCanvas() {
    if (canvas) return canvas;
    canvas = document.createElement('canvas');
    canvas.className = 'fx-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    return canvas;
  }

  /* A canvas has two sizes: how big it looks (CSS) and how many pixels it
     actually has. On a Retina iPad those differ, and ignoring that gives a
     blurry result, so the backing store is scaled by devicePixelRatio. */
  function resize() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);   // 2 is plenty
    canvas.width  = Math.floor(window.innerWidth  * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Is animation allowed right now? Set by the adult panel (spec §5a).
  function motionAllowed() {
    const level = document.body.dataset.motion || 'full';
    return level === 'full';
  }

  /* Throw a handful of sparkles out from one point.
     x and y are in CSS pixels from the top left of the window. */
  function burst(x, y, options) {
    if (!motionAllowed()) return;
    const opts = options || {};
    const count = opts.count || 30;
    const colours = opts.colours || ['#ffd23f', '#ff6b63', '#4cc9f0', '#ffffff'];
    const spread = opts.spread || 7;

    ensureCanvas();

    for (let i = 0; i < count; i++) {
      // Stop adding once the cap is reached rather than letting it creep up.
      if (particles.length >= MAX_PARTICLES) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = (0.3 + Math.random()) * spread;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,     // a nudge upwards, so it arcs
        size: 3 + Math.random() * 4,
        life: 1,
        // Fades over roughly 1.2s, as spec §5a asks.
        decay: 0.012 + Math.random() * 0.01,
        spin: (Math.random() - 0.5) * 0.3,
        angle: Math.random() * Math.PI,
        colour: colours[Math.floor(Math.random() * colours.length)]
      });
    }
    start();
  }

  // A burst centred on an element, which is how it is usually wanted.
  function burstAt(element, options) {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.top + rect.height / 2, options);
  }

  function start() {
    if (running) return;
    running = true;
    requestAnimationFrame(tick);
  }

  function tick() {
    if (!running) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Walk backwards so removing one does not skip the next.
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vy += GRAVITY;
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.spin;
      p.life -= p.decay;

      if (p.life <= 0) { particles.splice(i, 1); continue; }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.colour;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }

    if (particles.length === 0) {
      running = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    requestAnimationFrame(tick);
  }

  function clear() {
    particles = [];
    running = false;
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /* Spec §5a: a small screen shake, 6px at most and 200ms at most. Done by
     moving the whole app a few pixels, which is a transform and therefore
     cheap. Never used on its own - it goes with the stamp landing. */
  function shake(element, strength) {
    if (!motionAllowed() || !element) return;
    const power = Math.min(strength || 6, 6);          // the spec's ceiling
    const frames = [];
    for (let i = 0; i < 6; i++) {
      frames.push({
        transform: 'translate(' + ((Math.random() - 0.5) * power).toFixed(1) + 'px,' +
                                  ((Math.random() - 0.5) * power).toFixed(1) + 'px)'
      });
    }
    frames.push({ transform: 'translate(0,0)' });

    if (element.animate) {
      element.animate(frames, { duration: 200, easing: 'ease-out' });
    }
  }

  /* Spec §5a: stop animation loops when the screen is hidden, so a
     backgrounded iPad is not left running a loop it cannot show. */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') clear();
  });

  return { burst, burstAt, shake, clear, MAX_PARTICLES };
})();
