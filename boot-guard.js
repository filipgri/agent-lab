/* boot-guard.js - the app's black box recorder
   =============================================
   Added 6 October 2026, after an iPad showed a half-built start screen with
   no explanation, on two iOS versions and in both browsers.

   WHY THIS IS A SEPARATE FILE, LOADED FIRST
   The error reporter used to live inside app.js. That cannot report the two
   failures that matter most: app.js failing to load at all, and app.js
   failing to PARSE - in both cases the handler inside it never exists. A
   handler can only catch what happens after it is installed, so it has to be
   installed by a file that loads first and is small enough to be obviously
   correct.

   WHY IT IS WRITTEN IN OLD-FASHIONED JAVASCRIPT
   No arrow functions, no const, no template strings. If the fault ever turns
   out to be a browser that cannot parse something, this file must not be the
   next casualty. It is deliberately boring.

   WHAT IT DOES
   1. Catches errors and failed promises, and shows them on screen.
   2. Builds its own banner, so it does not depend on index.html being the
      version it expects.
   3. Watches for SUCCESS. app.js sets window.__agentLabReady at the end of
      boot; if that has not happened a few seconds in, the guard reports what
      it can see. That is what catches "nothing happened at all".
   4. Adding ?diag=1 to the address shows the same report on a working app,
      which is how we tell WHICH version an iPad is actually running.
*/
(function () {
  'use strict';

  var problems = [];
  var READY_MS = 6000;

  /* Our own URL, captured now. document.currentScript is only us while this
     file is still executing, and this file loads FIRST - which is the whole
     point of it, and also why it cannot read app.js's ?v=: that tag has not
     been parsed yet. Ours carries the same number. */
  var MY_SRC = (document.currentScript && document.currentScript.getAttribute('src')) || '';

  function el(id) { return document.getElementById(id); }

  function banner() {
    var box = el('guard-banner');
    if (box) return box;

    box = document.createElement('div');
    box.id = 'guard-banner';
    box.setAttribute('style', [
      'position:fixed', 'left:0', 'right:0', 'bottom:0', 'z-index:9999',
      'background:#4a1116', 'color:#fff', 'border-top:4px solid #ff5f56',
      'padding:12px 14px', 'font:13px -apple-system,BlinkMacSystemFont,sans-serif',
      'line-height:1.45', 'max-height:60vh', 'overflow:auto',
      '-webkit-user-select:text', 'user-select:text'
    ].join(';'));

    var title = document.createElement('strong');
    title.textContent = 'Agent Lab diagnostics';
    box.appendChild(title);

    var pre = document.createElement('pre');
    pre.id = 'guard-text';
    pre.setAttribute('style',
      'white-space:pre-wrap;word-break:break-word;margin:8px 0;font:12px ui-monospace,Menlo,monospace');
    box.appendChild(pre);

    var hide = document.createElement('button');
    hide.textContent = 'Hide';
    hide.setAttribute('style',
      'min-height:44px;padding:0 18px;font-size:15px;border:0;border-radius:10px;background:#2b3b55;color:#fff');
    hide.onclick = function () { box.parentNode.removeChild(box); };
    box.appendChild(hide);

    (document.body || document.documentElement).appendChild(box);
    return box;
  }

  /* Which of the app's files actually arrived. A script that 404s or fails to
     parse leaves its global undefined, which is the quickest way to see which
     one is missing without a console. */
  function globalsReport() {
    /* Each one is checked by NAME with typeof, not by looking it up on
       `window`. A top-level `const Voice = ...` in a classic script makes a
       script-scoped binding, not a property of window - so window.Voice is
       undefined even when the file loaded perfectly. Checking the wrong way
       made this report claim five files were missing when all six were fine,
       which would have sent us hunting the wrong fault. */
    var out = [];
    out.push((typeof Storage  === 'undefined' ? '✗ ' : '✓ ') + 'Storage');
    out.push((typeof Voice    === 'undefined' ? '✗ ' : '✓ ') + 'Voice');
    out.push((typeof Effects  === 'undefined' ? '✗ ' : '✓ ') + 'Effects');
    out.push((typeof Assets   === 'undefined' ? '✗ ' : '✓ ') + 'Assets');
    out.push((typeof Stickers === 'undefined' ? '✗ ' : '✓ ') + 'Stickers');
    out.push((typeof Parts    === 'undefined' ? '✗ ' : '✓ ') + 'Parts');
    out.push((typeof MISSIONS === 'undefined' ? '✗ ' : '✓ ') + 'app');
    return out.join('  ');
  }

  function versionSeen() {
    var tags = document.getElementsByTagName('script');
    for (var i = 0; i < tags.length; i++) {
      var src = tags[i].getAttribute('src') || '';
      if (src.indexOf('app.js') !== -1) return src;
    }
    return '(no app.js script tag)';
  }

  function report(why) {
    var lines = [];
    lines.push(why);
    lines.push('');
    lines.push('app.js tag : ' + versionSeen());
    lines.push('files      : ' + globalsReport());
    lines.push('boot ready : ' + (window.__agentLabReady ? 'yes' : 'NO'));
    /* How many agents this DEVICE holds. Agents live in the browser's own
       storage on the iPad they were made on, so a device that has been
       cleared shows none - which looks exactly like a broken gallery. */
    lines.push('agents here: ' +
      (typeof window.__agentLabAgents === 'number' ? window.__agentLabAgents : '?'));
    lines.push('url        : ' + location.href);
    lines.push('secure     : ' + (window.isSecureContext ? 'yes' : 'no'));
    lines.push('standalone : ' + (window.navigator.standalone ? 'home screen' : 'browser'));
    lines.push('screen     : ' + window.innerWidth + 'x' + window.innerHeight);
    lines.push('device     : ' + navigator.userAgent);

    if (problems.length) {
      lines.push('');
      lines.push('errors:');
      for (var i = 0; i < problems.length; i++) lines.push('  ' + problems[i]);
    }

    try {
      banner();
      el('guard-text').textContent = lines.join('\n');
    } catch (ignored) { /* a reporter must never throw */ }
  }

  /* SILENT BY DEFAULT.

     Faults are recorded, and shown to an adult on request - never to a child.
     A red block across a child's screen is its own kind of failure: §12 rules
     out text-heavy UI, and a nine-year-old can do nothing with a stack trace
     except feel they broke it.

     To see the report, add ?diag=1 to the address. */
  function wanted() { return location.search.indexOf('diag=1') !== -1; }

  window.addEventListener('error', function (event) {
    var where = (event.filename || '?') + ':' + (event.lineno || '?');
    problems.push(where + ' — ' + (event.message || 'error'));
    if (wanted()) report('Something went wrong.');
  }, true);

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    problems.push('promise — ' + ((reason && reason.message) || String(reason)));
    if (wanted()) report('Something went wrong.');
  });

  /* Nothing threw, but startup never finished - still only shown on request. */
  window.setTimeout(function () {
    if (!wanted()) return;
    report(window.__agentLabReady ? 'All good — diagnostics.'
                                  : 'Agent Lab did not finish starting up.');
  }, READY_MS);

  /* ---------------------------------------------------------------------
     SELF-HEALING: notice when this device is stuck on an old version.

     index.html carries the ?v= numbers but has none of its own, so a cached
     copy pins the whole app to an old release. A browser tab can be forced
     past it with a junk query; a HOME-SCREEN app cannot, because it always
     launches its own start_url and never sees what you type. Two iPads sat
     several releases behind for most of a day because of this.

     So: ask the server what the current version is, compare it with the one
     this page actually loaded, and if they differ, throw away the service
     worker and every cache and reload once. version.json is tiny, is never
     cached, and is the only thing that has to get through.

     Guarded by sessionStorage so it can reload at most once per launch - a
     reload loop would be far worse than a stale app.
     ------------------------------------------------------------------- */
  function loadedVersion() {
    var m = MY_SRC.match(/[?&]v=(\d+)/);     // e.g. "./boot-guard.js?v=59"
    return m ? Number(m[1]) : null;
  }

  function healIfStale() {
    var mine = loadedVersion();
    if (!mine) return;

    var tried;
    try { tried = sessionStorage.getItem('agentLabHealed'); } catch (e) { tried = '1'; }
    if (tried) return;

    fetch('./version.json?cb=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || typeof data.version !== 'number') return;
        if (data.version <= mine) return;

        problems.push('was running v' + mine + ', server has v' + data.version +
                      ' — clearing and reloading');
        try { sessionStorage.setItem('agentLabHealed', '1'); } catch (e) {}

        var jobs = [];
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
          jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) {
            return Promise.all(rs.map(function (r) { return r.unregister(); }));
          }));
        }
        if (window.caches && caches.keys) {
          jobs.push(caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (k) { return caches.delete(k); }));
          }));
        }
        Promise.all(jobs)['catch'](function () {})
          .then(function () { location.reload(); });
      })['catch'](function () { /* offline: keep what we have, which works */ });
  }

  healIfStale();

  window.__agentLabGuard = { report: report, problems: problems };
})();
