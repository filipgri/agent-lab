/* layout-audit.js - finds buttons and cards that are cut off (v85)
   ================================================================
   A tool for checking layouts before a session; the app never loads it.
   With the app running on http://localhost:8000/, open the page you want
   to check, then in the browser's console:

     await new Promise(r => { const s = document.createElement('script');
       s.src = 'tools/layout-audit.js'; s.onload = r; document.head.appendChild(s); });
     document.body.dataset.motion = 'off';   // measure without animations
     __audit('bottle to')                    // → a list of problems, or []

   For every visible button and picture card it checks whether any part of
   it - with 6px for its drop shadow, and 6px all round for a chosen card's
   outline - is hidden by a box that clips (overflow not visible), or sits
   under the bottom bar.
     CLIPPED       cut off by a box that does not scroll: always a bug
     scroll-list   in a list that scrolls; "(faded)" when the list shows the
                   fade that says "more below" - fine for a long list
     UNDER BAR     hidden behind Pass / Stamp it
     SPILLS        its own words or icon reach outside it (v94: "Other
                   doors" at 44px ran far out of its button on the iPad,
                   and nothing above looks inside a button)
   Check every screen at 1180×734 AND 820×1180 (CLAUDE.md). */

window.__audit = function (label) {
  const out = [];
  const bar = document.querySelector('.screen.is-visible .bottombar');
  const barTop = bar ? bar.getBoundingClientRect().top : innerHeight;
  const vis = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; return getComputedStyle(e).visibility !== 'hidden' && e.closest('[hidden]') === null; };
  const els = [...document.querySelectorAll('.screen.is-visible button, .screen.is-visible .pic-card, .overlay:not([hidden]) button, .overlay:not([hidden]) .pic-card')].filter(vis);
  for (const e of els) {
    const r = e.getBoundingClientRect();
    const sel = e.matches('.is-on, .is-in, .is-here');
    const a = { t: sel ? 6 : 0, b: 6, l: sel ? 6 : 0, r: sel ? 6 : 0 };
    const name = (e.id ? '#' + e.id : '') + ' "' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 22) + '"';
    let p = e.parentElement, inScroller = false;
    while (p && p !== document.body) {
      const cs = getComputedStyle(p);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        const pr = p.getBoundingClientRect();
        const top = pr.top + parseFloat(cs.borderTopWidth), bottom = pr.bottom - parseFloat(cs.borderBottomWidth);
        const scrollsY = p.scrollHeight > p.clientHeight + 1 && cs.overflowY !== 'hidden';
        inScroller = scrollsY;
        const sides = [];
        if (r.bottom + a.b > bottom + 0.5) sides.push('bottom ' + Math.round(r.bottom + a.b - bottom) + 'px');
        if (r.top - a.t < top - 0.5) sides.push('top ' + Math.round(top - (r.top - a.t)) + 'px');
        if (r.right + a.r > pr.right + 0.5) sides.push('right ' + Math.round(r.right + a.r - pr.right) + 'px');
        if (r.left - a.l < pr.left - 0.5) sides.push('left ' + Math.round(pr.left - (r.left - a.l)) + 'px');
        if (sides.length) out.push(label + ': ' + (scrollsY ? 'scroll-list' + (p.classList.contains('has-more') ? '(faded) ' : ' ') : 'CLIPPED ') + name + ' by ' + (p.id ? '#' + p.id : '.' + [...p.classList].join('.')) + ' (' + sides.join(', ') + ')');
        break;
      }
      p = p.parentElement;
    }
    if (!inScroller && !e.closest('.bottombar, .topbar, .overlay') && r.bottom > barTop + 1) out.push(label + ': UNDER BAR ' + name + ' ' + Math.round(r.bottom) + '>' + Math.round(barTop));
    // Its words and icons (text nodes - emoji are text too). Badges placed
    // on a corner on purpose (position: absolute, like the ✓ on a stamped
    // mission or a pile) are skipped; everything else must stay inside.
    const c = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity, width: 0 }, k = 2;
    const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent.trim()) continue;
      let placed = false;
      for (let el = node.parentElement; el && el !== e; el = el.parentElement) {
        if (/absolute|fixed/.test(getComputedStyle(el).position)) { placed = true; break; }
      }
      if (placed) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const tr = range.getBoundingClientRect();
      if (!tr.width) continue;
      c.left = Math.min(c.left, tr.left); c.right = Math.max(c.right, tr.right);
      c.top = Math.min(c.top, tr.top); c.bottom = Math.max(c.bottom, tr.bottom); c.width = 1;
    }
    if (c.width && (c.left < r.left - k || c.right > r.right + k || c.top < r.top - k || c.bottom > r.bottom + k)) {
      out.push(label + ': SPILLS ' + name + ' (' + [c.left < r.left - k && 'left ' + Math.round(r.left - c.left) + 'px',
        c.right > r.right + k && 'right ' + Math.round(c.right - r.right) + 'px',
        c.top < r.top - k && 'top ' + Math.round(r.top - c.top) + 'px',
        c.bottom > r.bottom + k && 'bottom ' + Math.round(c.bottom - r.bottom) + 'px'].filter(Boolean).join(', ') + ')');
    }
  }
  return out;
};
