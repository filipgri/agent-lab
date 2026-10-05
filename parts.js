/* ============================================================================
   parts.js - the parts kit: faces and bodies, drawn in code
   ============================================================================
   v2 spec §5.3.1. Loaded before app.js; hands the rest of the app `Parts`.

   WHY THESE ARE DRAWN RATHER THAN GENERATED
   v2 §2 found the real problem with v1: emoji are whole things, so a child
   could decorate an agent but never build a face. A part has to do three
   things a generated picture cannot: be recoloured (every skin and hair
   tone), line up with other parts on a head, and stay crisp on a 320x240
   badge. So every part here is flat SVG.

   THE FORMAT (v2 §5.3.1)
     - each part is an SVG fragment in a 100x100 box, centred on 50,50;
     - elements with class="tint" take the colour the child picks;
     - everything else keeps its own fill - eye whites stay white;
     - one outline everywhere: 2.5 units, #1b1b2f, round joins and caps,
       applied by CSS to the whole group rather than per shape.

   EACH PART CARRIES
     id       'eyes-stars'
     cat      which tray it lives in
     palette  which colours are offered first: skin, hair, eyes or any
     anchor   where it lands when tapped. For face parts this is relative to
              the HEAD (0-1 across the head's box); for heads and bodies it
              is relative to the stage.
     size     its default width. Face parts: a fraction of the head's width.
              Heads and bodies: a fraction of the stage.

   NO GENDERED WORDS ANYWHERE (v2 §5.3.1, §12). Bodies are "Body 1", "Body 2".
   Nothing here is a boy or a girl, and nothing is named for one.

   NON-HUMAN OPTIONS COME FIRST in every tray (v2 §5.3.1), so a child who
   wants to be a robot or a monster does not have to scroll past six human
   faces to find out they are allowed to.
   ========================================================================== */

const Parts = (function () {

  /* --------------------------------------------------------------------------
     PALETTES (v2 §5.3.1)
     The part's own palette is shown first and everything else sits behind
     "More", so a child colouring hair is offered hair colours - including
     four that no hair has ever been, because this is a spy agent.
     ----------------------------------------------------------------------- */
  const PALETTES = {
    // Ten tones from very light to very dark, then six fantasy colours.
    skin: ['#ffe0c4', '#ffd1a8', '#f3bd8f', '#e0a372', '#c98a5b',
           '#a96f42', '#8a5631', '#6b4226', '#4e2f1b', '#331e11',
           '#8fd5c0', '#9bb7ff', '#d7a7ff', '#ffa7c9', '#a7e88f', '#9fe4ff'],

    hair: ['#1b1b1f', '#33231a', '#5a3b26', '#8a4b2a', '#c98f3f',
           '#e2b45e', '#b14b2a', '#9aa0a6', '#e8e8e8',
           '#ff5fa2', '#5fd6ff', '#9b5fff', '#5fe08a'],

    eyes: ['#4a2f1b', '#7a4a22', '#2f6b4f', '#2f5f9e', '#6d7f93', '#1b1b2f',
           '#ff5fa2', '#5fd6ff', '#9b5fff', '#ffd23f'],

    // The sixteen the Pixel door already uses.
    any: ['#3d2314', '#6b4226', '#8d5524', '#c68642',
          '#e0ac69', '#ffdbac', '#ffffff', '#000000',
          '#8c9bab', '#e63946', '#f77f00', '#ffd23f',
          '#43aa8b', '#4cc9f0', '#4361ee', '#b5179e']
  };

  /* The trays, in order. v2 §5.3.1 also fixes the LAYER order, which is the
     same list: a body is behind a head, a head behind ears, and hair over the
     lot. ⬆️ ⬇️ let a child override it. */
  const CATEGORIES = [
    { id: 'bodies',   label: 'Bodies',  icon: '🧍' },
    { id: 'heads',    label: 'Heads',   icon: '⭕' },
    { id: 'ears',     label: 'Ears',    icon: '👂' },
    { id: 'noses',    label: 'Noses',   icon: '👃' },
    { id: 'eyes',     label: 'Eyes',    icon: '👀' },
    { id: 'brows',    label: 'Brows',   icon: '🤨' },
    { id: 'mouths',   label: 'Mouths',  icon: '👄' },
    { id: 'hair',     label: 'Hair',    icon: '💇' },
    { id: 'headwear', label: 'Hats',    icon: '🧢' },
    { id: 'extras',   label: 'Extras',  icon: '✨' },
    { id: 'shapes',   label: 'Shapes',  icon: '🔺' }   // the seven v1 shapes
  ];

  // Which parts sit on a head rather than on the stage.
  const FACE_CATS = ['eyes', 'brows', 'mouths', 'noses', 'ears', 'hair',
                     'headwear', 'extras'];

  // --- small helpers, so the fragments below stay readable ---

  // A pair of anything, mirrored left and right of the centre line.
  function pair(fragment, dx) {
    const offset = dx === undefined ? 18 : dx;
    return '<g transform="translate(' + (-offset) + ',0)">' + fragment + '</g>' +
           '<g transform="translate(' + offset + ',0)">' + fragment + '</g>';
  }

  function star(cx, cy, outer, inner) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      pts.push((cx + Math.cos(a) * r).toFixed(1) + ',' + (cy + Math.sin(a) * r).toFixed(1));
    }
    return '<polygon points="' + pts.join(' ') + '"/>';
  }

  const HEART = 'M0,6 C-7,0 -7,-6 -3.2,-6 C-1.2,-6 0,-4.4 0,-3.2 ' +
                'C0,-4.4 1.2,-6 3.2,-6 C7,-6 7,0 0,6 Z';


  /* ==========================================================================
     THE PARTS
     ========================================================================== */
  const PARTS = [

    /* --- BODIES (8) ------------------------------------------------------ */
    { id: 'body-robot', cat: 'bodies', palette: 'any', label: 'Robot body',
      anchor: { x: 0.5, y: 0.62 }, size: 0.46,
      svg: '<rect class="tint" x="24" y="24" width="52" height="58" rx="8"/>' +
           '<rect fill="#1b1b2f" x="36" y="38" width="28" height="16" rx="3"/>' +
           '<circle fill="#ffd23f" cx="44" cy="46" r="3"/>' +
           '<circle fill="#ffd23f" cx="56" cy="46" r="3"/>' +
           '<rect class="tint" x="10" y="32" width="12" height="34" rx="6"/>' +
           '<rect class="tint" x="78" y="32" width="12" height="34" rx="6"/>' },

    { id: 'body-blob', cat: 'bodies', palette: 'any', label: 'Blob body',
      anchor: { x: 0.5, y: 0.62 }, size: 0.46,
      svg: '<path class="tint" d="M50,18 C76,18 88,40 86,58 C84,76 68,84 50,84 ' +
           'C32,84 16,76 14,58 C12,40 24,18 50,18 Z"/>' },

    { id: 'body-furry', cat: 'bodies', palette: 'any', label: 'Furry body',
      anchor: { x: 0.5, y: 0.62 }, size: 0.46,
      svg: '<path class="tint" d="M50,16 L58,26 L68,20 L72,32 L84,32 L80,44 ' +
           'L90,52 L80,60 L84,74 L70,72 L64,84 L50,78 L36,84 L30,72 L16,74 ' +
           'L20,60 L10,52 L20,44 L16,32 L28,32 L32,20 L42,26 Z"/>' },

    { id: 'body-hoodie', cat: 'bodies', palette: 'any', label: 'Hoodie',
      anchor: { x: 0.5, y: 0.62 }, size: 0.46,
      svg: '<path class="tint" d="M28,28 L50,22 L72,28 L80,40 L72,46 L72,84 ' +
           'L28,84 L28,46 L20,40 Z"/>' +
           '<path fill="none" stroke="#1b1b2f" stroke-width="2.5" d="M50,22 L50,46"/>' +
           '<circle fill="#1b1b2f" cx="44" cy="54" r="2"/>' +
           '<circle fill="#1b1b2f" cx="56" cy="54" r="2"/>' },

    { id: 'body-super', cat: 'bodies', palette: 'any', label: 'Super suit',
      anchor: { x: 0.5, y: 0.62 }, size: 0.46,
      svg: '<path class="tint" d="M30,26 L50,20 L70,26 L78,42 L68,46 L70,84 ' +
           'L30,84 L32,46 L22,42 Z"/>' +
           star(50, 52, 13, 5.5) },

    { id: 'body-1', cat: 'bodies', palette: 'skin', label: 'Body 1',
      anchor: { x: 0.5, y: 0.62 }, size: 0.44,
      svg: '<path class="tint" d="M34,30 L50,24 L66,30 L74,48 L66,52 L68,84 ' +
           'L32,84 L34,52 L26,48 Z"/>' },

    { id: 'body-2', cat: 'bodies', palette: 'skin', label: 'Body 2',
      anchor: { x: 0.5, y: 0.62 }, size: 0.44,
      svg: '<path class="tint" d="M30,30 C40,22 60,22 70,30 C80,40 82,66 78,84 ' +
           'L22,84 C18,66 20,40 30,30 Z"/>' },

    { id: 'body-3', cat: 'bodies', palette: 'skin', label: 'Body 3',
      anchor: { x: 0.5, y: 0.62 }, size: 0.44,
      svg: '<rect class="tint" x="32" y="26" width="36" height="58" rx="14"/>' +
           '<rect class="tint" x="16" y="34" width="12" height="30" rx="6"/>' +
           '<rect class="tint" x="72" y="34" width="12" height="30" rx="6"/>' },

    /* --- HEADS (8). Non-human first. ------------------------------------- */
    { id: 'head-robot', cat: 'heads', palette: 'any', label: 'Robot screen',
      anchor: { x: 0.5, y: 0.4 }, size: 0.42,
      svg: '<rect class="tint" x="16" y="20" width="68" height="60" rx="10"/>' +
           '<rect fill="#10233f" x="24" y="28" width="52" height="40" rx="6"/>' +
           '<rect class="tint" x="46" y="8" width="8" height="12" rx="4"/>' +
           '<circle class="tint" cx="50" cy="6" r="5"/>' },

    { id: 'head-monster', cat: 'heads', palette: 'any', label: 'Monster',
      anchor: { x: 0.5, y: 0.4 }, size: 0.44,
      svg: '<path class="tint" d="M50,12 C72,12 86,28 86,48 C86,70 70,84 50,84 ' +
           'C30,84 14,70 14,48 C14,28 28,12 50,12 Z"/>' +
           '<path class="tint" d="M26,18 L18,2 L40,12 Z"/>' +
           '<path class="tint" d="M74,18 L82,2 L60,12 Z"/>' },

    { id: 'head-animal', cat: 'heads', palette: 'any', label: 'Animal',
      anchor: { x: 0.5, y: 0.4 }, size: 0.42,
      svg: '<circle class="tint" cx="50" cy="52" r="32"/>' +
           '<path class="tint" d="M26,28 L20,6 L42,18 Z"/>' +
           '<path class="tint" d="M74,28 L80,6 L58,18 Z"/>' },

    { id: 'head-round', cat: 'heads', palette: 'skin', label: 'Round',
      anchor: { x: 0.5, y: 0.4 }, size: 0.4,
      svg: '<circle class="tint" cx="50" cy="50" r="34"/>' },

    { id: 'head-oval', cat: 'heads', palette: 'skin', label: 'Oval',
      anchor: { x: 0.5, y: 0.4 }, size: 0.4,
      svg: '<ellipse class="tint" cx="50" cy="50" rx="30" ry="36"/>' },

    { id: 'head-square', cat: 'heads', palette: 'skin', label: 'Square',
      anchor: { x: 0.5, y: 0.4 }, size: 0.4,
      svg: '<rect class="tint" x="17" y="16" width="66" height="68" rx="14"/>' },

    { id: 'head-long', cat: 'heads', palette: 'skin', label: 'Long',
      anchor: { x: 0.5, y: 0.4 }, size: 0.38,
      svg: '<ellipse class="tint" cx="50" cy="50" rx="25" ry="40"/>' },

    { id: 'head-bean', cat: 'heads', palette: 'skin', label: 'Bean',
      anchor: { x: 0.5, y: 0.4 }, size: 0.42,
      svg: '<path class="tint" d="M50,14 C70,14 84,30 84,50 C84,72 68,86 50,86 ' +
           'C34,86 18,74 18,54 C18,32 30,14 50,14 Z"/>' },

    /* --- EARS (8). Non-human first; assistive options are ordinary options. */
    { id: 'ears-antenna', cat: 'ears', palette: 'any', label: 'Antennae',
      anchor: { x: 0.5, y: 0.32 }, size: 1.05,
      svg: '<g class="tint" transform="translate(50,50)">' +
           pair('<rect x="-2" y="-28" width="4" height="26" rx="2"/>' +
                '<circle cx="0" cy="-32" r="6"/>', 22) + '</g>' },

    { id: 'ears-animal', cat: 'ears', palette: 'any', label: 'Animal ears',
      anchor: { x: 0.5, y: 0.34 }, size: 1.1,
      svg: '<g class="tint" transform="translate(50,50)">' +
           pair('<path d="M0,-26 L12,2 L-12,2 Z"/>', 26) + '</g>' },

    { id: 'ears-pointy', cat: 'ears', palette: 'skin', label: 'Pointy',
      anchor: { x: 0.5, y: 0.5 }, size: 1.05,
      svg: '<g class="tint" transform="translate(50,50)">' +
           pair('<path d="M-4,-14 C8,-12 10,0 2,12 C-4,10 -8,0 -4,-14 Z"/>', 34) + '</g>' },

    { id: 'ears-round', cat: 'ears', palette: 'skin', label: 'Round ears',
      anchor: { x: 0.5, y: 0.52 }, size: 1.0,
      svg: '<g class="tint" transform="translate(50,50)">' +
           pair('<circle cx="0" cy="0" r="9"/>', 33) + '</g>' },

    { id: 'ears-big', cat: 'ears', palette: 'skin', label: 'Big ears',
      anchor: { x: 0.5, y: 0.5 }, size: 1.15,
      svg: '<g class="tint" transform="translate(50,50)">' +
           pair('<ellipse cx="0" cy="0" rx="11" ry="15"/>', 36) + '</g>' },

    { id: 'ears-hearing-aid', cat: 'ears', palette: 'any', label: 'Hearing aid',
      anchor: { x: 0.5, y: 0.5 }, size: 1.05,
      svg: '<g class="tint tint-stroke" transform="translate(50,50)">' +
           pair('<path d="M-3,-11 C5,-11 8,-4 6,3 C5,8 1,11 -2,10" ' +
                'fill="none" stroke-width="6" stroke-linecap="round"/>' +
                '<circle cx="-3" cy="-12" r="4.5"/>', 34) + '</g>' },

    { id: 'ears-cochlear', cat: 'ears', palette: 'any', label: 'Cochlear implant',
      anchor: { x: 0.5, y: 0.46 }, size: 1.1,
      svg: '<g class="tint tint-stroke" transform="translate(50,50)">' +
           pair('<path d="M-2,-10 C6,-10 9,-3 7,4" fill="none" ' +
                'stroke-width="6" stroke-linecap="round"/>' +
                '<circle cx="-2" cy="-11" r="4"/>' +
                '<path d="M2,-13 L12,-18" fill="none" stroke-width="3"/>' +
                '<circle cx="15" cy="-20" r="7"/>' +
                '<circle fill="#10233f" cx="15" cy="-20" r="3"/>', 32) + '</g>' },

    { id: 'ears-defenders', cat: 'ears', palette: 'any', label: 'Ear defenders',
      anchor: { x: 0.5, y: 0.44 }, size: 1.2,
      svg: '<g class="tint tint-stroke" transform="translate(50,50)">' +
           '<path d="M-30,-6 C-30,-30 30,-30 30,-6" fill="none" stroke-width="7" ' +
           'stroke-linecap="round"/>' +
           pair('<rect x="-11" y="-14" width="22" height="30" rx="10"/>', 32) + '</g>' },

    /* --- NOSES (5). Non-human first. ------------------------------------- */
    { id: 'nose-beak', cat: 'noses', palette: 'any', label: 'Beak',
      anchor: { x: 0.5, y: 0.56 }, size: 0.3,
      svg: '<path class="tint" d="M50,32 L68,52 L50,70 L44,52 Z"/>' },

    { id: 'nose-snout', cat: 'noses', palette: 'skin', label: 'Snout',
      anchor: { x: 0.5, y: 0.58 }, size: 0.34,
      svg: '<ellipse class="tint" cx="50" cy="50" rx="22" ry="15"/>' +
           '<ellipse fill="#1b1b2f" cx="42" cy="48" rx="3.5" ry="5"/>' +
           '<ellipse fill="#1b1b2f" cx="58" cy="48" rx="3.5" ry="5"/>' },

    { id: 'nose-dot', cat: 'noses', palette: 'skin', label: 'Dot',
      anchor: { x: 0.5, y: 0.56 }, size: 0.14,
      svg: '<circle class="tint" cx="50" cy="50" r="22"/>' },

    { id: 'nose-button', cat: 'noses', palette: 'skin', label: 'Button',
      anchor: { x: 0.5, y: 0.56 }, size: 0.2,
      svg: '<ellipse class="tint" cx="50" cy="50" rx="26" ry="20"/>' },

    { id: 'nose-triangle', cat: 'noses', palette: 'skin', label: 'Triangle',
      anchor: { x: 0.5, y: 0.56 }, size: 0.22,
      svg: '<path class="tint" d="M50,28 L72,68 L28,68 Z"/>' },

    /* --- EYES (10). Non-human first. ------------------------------------- */
    { id: 'eyes-robot', cat: 'eyes', palette: 'eyes', label: 'Visor',
      anchor: { x: 0.5, y: 0.44 }, size: 0.72,
      svg: '<rect class="tint" x="8" y="38" width="84" height="24" rx="12"/>' +
           '<rect fill="#ffffff" opacity=".35" x="16" y="43" width="28" height="7" rx="3.5"/>' },

    { id: 'eyes-stars', cat: 'eyes', palette: 'eyes', label: 'Stars',
      anchor: { x: 0.5, y: 0.44 }, size: 0.62,
      svg: '<g class="tint">' + pair(star(0, 0, 15, 6), 24) + '</g>' },

    { id: 'eyes-hearts', cat: 'eyes', palette: 'eyes', label: 'Hearts',
      anchor: { x: 0.5, y: 0.44 }, size: 0.6,
      svg: '<g class="tint" transform="translate(50,50) scale(2)">' +
           pair('<path d="' + HEART + '"/>', 12) + '</g>' },

    { id: 'eyes-dots', cat: 'eyes', palette: 'eyes', label: 'Dots',
      anchor: { x: 0.5, y: 0.44 }, size: 0.52,
      svg: '<g class="tint" transform="translate(50,50)">' +
           pair('<circle cx="0" cy="0" r="9"/>', 22) + '</g>' },

    { id: 'eyes-round', cat: 'eyes', palette: 'eyes', label: 'Round',
      anchor: { x: 0.5, y: 0.44 }, size: 0.62,
      svg: '<g transform="translate(50,50)">' +
           pair('<circle fill="#ffffff" cx="0" cy="0" r="15"/>' +
                '<circle class="tint" cx="0" cy="0" r="8"/>' +
                '<circle fill="#1b1b2f" cx="0" cy="0" r="4"/>', 24) + '</g>' },

    { id: 'eyes-wide', cat: 'eyes', palette: 'eyes', label: 'Wide',
      anchor: { x: 0.5, y: 0.43 }, size: 0.7,
      svg: '<g transform="translate(50,50)">' +
           pair('<circle fill="#ffffff" cx="0" cy="0" r="19"/>' +
                '<circle class="tint" cx="0" cy="2" r="8"/>' +
                '<circle fill="#1b1b2f" cx="0" cy="2" r="4"/>', 26) + '</g>' },

    { id: 'eyes-sleepy', cat: 'eyes', palette: 'eyes', label: 'Sleepy',
      anchor: { x: 0.5, y: 0.45 }, size: 0.62,
      svg: '<g class="tint-stroke" fill="none" stroke-width="6" stroke-linecap="round" ' +
           'transform="translate(50,50)">' +
           pair('<path d="M-14,-2 C-7,8 7,8 14,-2"/>', 24) + '</g>' },

    { id: 'eyes-happy', cat: 'eyes', palette: 'eyes', label: 'Happy',
      anchor: { x: 0.5, y: 0.45 }, size: 0.62,
      svg: '<g class="tint-stroke" fill="none" stroke-width="6" stroke-linecap="round" ' +
           'transform="translate(50,50)">' +
           pair('<path d="M-14,4 C-7,-8 7,-8 14,4"/>', 24) + '</g>' },

    { id: 'eyes-wink', cat: 'eyes', palette: 'eyes', label: 'Wink',
      anchor: { x: 0.5, y: 0.44 }, size: 0.62,
      svg: '<g transform="translate(50,50)">' +
           '<g transform="translate(-24,0)">' +
           '<circle fill="#ffffff" cx="0" cy="0" r="15"/>' +
           '<circle class="tint" cx="0" cy="0" r="8"/>' +
           '<circle fill="#1b1b2f" cx="0" cy="0" r="4"/></g>' +
           '<g transform="translate(24,0)" class="tint-stroke" fill="none" ' +
           'stroke-width="6" stroke-linecap="round">' +
           '<path d="M-14,2 C-7,-8 7,-8 14,2"/></g></g>' },

    { id: 'eyes-determined', cat: 'eyes', palette: 'eyes', label: 'Determined',
      anchor: { x: 0.5, y: 0.44 }, size: 0.66,
      svg: '<g transform="translate(50,50)">' +
           pair('<circle fill="#ffffff" cx="0" cy="2" r="14"/>' +
                '<circle class="tint" cx="0" cy="3" r="7"/>' +
                '<circle fill="#1b1b2f" cx="0" cy="3" r="3.5"/>', 24) +
           '<path fill="#1b1b2f" d="M-38,-12 L-10,-4 L-10,2 L-38,-6 Z"/>' +
           '<path fill="#1b1b2f" d="M38,-12 L10,-4 L10,2 L38,-6 Z"/></g>' },

    /* --- BROWS (5) ------------------------------------------------------- */
    { id: 'brows-neutral', cat: 'brows', palette: 'hair', label: 'Neutral',
      anchor: { x: 0.5, y: 0.33 }, size: 0.6,
      svg: '<g class="tint" transform="translate(50,50)">' +
           pair('<rect x="-13" y="-4" width="26" height="8" rx="4"/>', 24) + '</g>' },

    { id: 'brows-raised', cat: 'brows', palette: 'hair', label: 'Raised',
      anchor: { x: 0.5, y: 0.32 }, size: 0.6,
      svg: '<g class="tint" transform="translate(50,50)">' +
           '<rect x="-37" y="-10" width="26" height="8" rx="4"/>' +
           '<rect x="11" y="0" width="26" height="8" rx="4"/></g>' },

    { id: 'brows-cross', cat: 'brows', palette: 'hair', label: 'Cross',
      anchor: { x: 0.5, y: 0.33 }, size: 0.62,
      svg: '<g class="tint" transform="translate(50,50)">' +
           '<rect x="-38" y="-10" width="28" height="8" rx="4" transform="rotate(16 -24 -6)"/>' +
           '<rect x="10" y="-10" width="28" height="8" rx="4" transform="rotate(-16 24 -6)"/></g>' },

    { id: 'brows-worried', cat: 'brows', palette: 'hair', label: 'Worried',
      anchor: { x: 0.5, y: 0.33 }, size: 0.62,
      svg: '<g class="tint" transform="translate(50,50)">' +
           '<rect x="-38" y="-8" width="28" height="8" rx="4" transform="rotate(-16 -24 -4)"/>' +
           '<rect x="10" y="-8" width="28" height="8" rx="4" transform="rotate(16 24 -4)"/></g>' },

    { id: 'brows-wiggly', cat: 'brows', palette: 'hair', label: 'Wiggly',
      anchor: { x: 0.5, y: 0.33 }, size: 0.62,
      svg: '<g class="tint-stroke" fill="none" stroke-width="7" stroke-linecap="round" ' +
           'transform="translate(50,50)">' +
           pair('<path d="M-13,0 C-8,-8 -3,6 2,-2 C5,-6 9,0 13,-3"/>', 24) + '</g>' },

    /* --- MOUTHS (10). Non-human first. ----------------------------------- */
    { id: 'mouth-grille', cat: 'mouths', palette: 'any', label: 'Robot grille',
      anchor: { x: 0.5, y: 0.68 }, size: 0.44,
      svg: '<rect class="tint" x="22" y="38" width="56" height="24" rx="6"/>' +
           '<rect fill="#10233f" x="30" y="44" width="5" height="12" rx="2"/>' +
           '<rect fill="#10233f" x="41" y="44" width="5" height="12" rx="2"/>' +
           '<rect fill="#10233f" x="52" y="44" width="5" height="12" rx="2"/>' +
           '<rect fill="#10233f" x="63" y="44" width="5" height="12" rx="2"/>' },

    { id: 'mouth-smile', cat: 'mouths', palette: 'any', label: 'Smile',
      anchor: { x: 0.5, y: 0.68 }, size: 0.42,
      svg: '<path class="tint-stroke" fill="none" stroke-width="7" stroke-linecap="round" ' +
           'd="M24,42 C36,64 64,64 76,42"/>' },

    { id: 'mouth-grin', cat: 'mouths', palette: 'any', label: 'Grin',
      anchor: { x: 0.5, y: 0.68 }, size: 0.46,
      svg: '<path class="tint" d="M20,40 C34,68 66,68 80,40 Z"/>' +
           '<rect fill="#ffffff" x="26" y="40" width="48" height="10" rx="3"/>' },

    { id: 'mouth-laugh', cat: 'mouths', palette: 'any', label: 'Laugh',
      anchor: { x: 0.5, y: 0.68 }, size: 0.46,
      svg: '<path class="tint" d="M20,38 C34,74 66,74 80,38 Z"/>' +
           '<path fill="#ff7a8a" d="M34,60 C42,70 58,70 66,60 Z"/>' },

    { id: 'mouth-flat', cat: 'mouths', palette: 'any', label: 'Flat',
      anchor: { x: 0.5, y: 0.68 }, size: 0.36,
      svg: '<rect class="tint" x="24" y="46" width="52" height="8" rx="4"/>' },

    { id: 'mouth-o', cat: 'mouths', palette: 'any', label: 'Oh',
      anchor: { x: 0.5, y: 0.68 }, size: 0.26,
      svg: '<ellipse class="tint" cx="50" cy="50" rx="20" ry="26"/>' },

    { id: 'mouth-frown', cat: 'mouths', palette: 'any', label: 'Frown',
      anchor: { x: 0.5, y: 0.7 }, size: 0.42,
      svg: '<path class="tint-stroke" fill="none" stroke-width="7" stroke-linecap="round" ' +
           'd="M24,60 C36,38 64,38 76,60"/>' },

    { id: 'mouth-wobbly', cat: 'mouths', palette: 'any', label: 'Wobbly',
      anchor: { x: 0.5, y: 0.69 }, size: 0.44,
      svg: '<path class="tint-stroke" fill="none" stroke-width="7" stroke-linecap="round" ' +
           'd="M22,50 C30,38 38,62 46,50 C54,38 62,62 70,50 C74,44 76,48 78,50"/>' },

    { id: 'mouth-tongue', cat: 'mouths', palette: 'any', label: 'Tongue out',
      anchor: { x: 0.5, y: 0.69 }, size: 0.44,
      svg: '<path class="tint-stroke" fill="none" stroke-width="7" stroke-linecap="round" ' +
           'd="M24,40 C36,60 64,60 76,40"/>' +
           '<path fill="#ff7a8a" d="M40,52 C40,76 64,76 64,52 Z"/>' },

    { id: 'mouth-zipped', cat: 'mouths', palette: 'any', label: 'Zipped',
      anchor: { x: 0.5, y: 0.68 }, size: 0.42,
      svg: '<rect class="tint" x="22" y="46" width="56" height="7" rx="3.5"/>' +
           '<rect fill="#1b1b2f" x="30" y="40" width="4" height="19" rx="2"/>' +
           '<rect fill="#1b1b2f" x="42" y="40" width="4" height="19" rx="2"/>' +
           '<rect fill="#1b1b2f" x="54" y="40" width="4" height="19" rx="2"/>' +
           '<rect fill="#1b1b2f" x="66" y="40" width="4" height="19" rx="2"/>' },

    /* --- HAIR (16). The spec names all sixteen; all sixteen are here. ----- */
    { id: 'hair-crop', cat: 'hair', palette: 'hair', label: 'Short crop',
      anchor: { x: 0.5, y: 0.26 }, size: 1.02,
      svg: '<path class="tint" d="M14,52 C14,24 30,10 50,10 C70,10 86,24 86,52 ' +
           'C86,40 74,32 50,32 C26,32 14,40 14,52 Z"/>' },

    { id: 'hair-buzz', cat: 'hair', palette: 'hair', label: 'Buzz cut',
      anchor: { x: 0.5, y: 0.27 }, size: 1.0,
      svg: '<path class="tint" d="M16,48 C16,24 32,12 50,12 C68,12 84,24 84,48 ' +
           'C84,42 72,38 50,38 C28,38 16,42 16,48 Z" opacity=".92"/>' },

    { id: 'hair-curls', cat: 'hair', palette: 'hair', label: 'Short curls',
      anchor: { x: 0.5, y: 0.25 }, size: 1.1,
      // A crown of curls across the top only, so the face stays clear.
      svg: '<g class="tint"><circle cx="22" cy="52" r="13"/><circle cx="34" cy="36" r="15"/>' +
           '<circle cx="50" cy="30" r="16"/><circle cx="66" cy="36" r="15"/>' +
           '<circle cx="78" cy="52" r="13"/></g>' },

    /* Voluminous hair is drawn as a RING, not a disc: an outer silhouette
       with the face cut out of it using fill-rule="evenodd". Drawn solid, an
       afro simply covered the child's whole face - eyes, nose and mouth all
       hidden underneath it. */
    { id: 'hair-afro', cat: 'hair', palette: 'hair', label: 'Afro',
      anchor: { x: 0.5, y: 0.3 }, size: 1.3,
      svg: '<path class="tint" fill-rule="evenodd" ' +
           'd="M8,46 A42,42 0 1,0 92,46 A42,42 0 1,0 8,46 Z ' +
           'M24,60 A26,27 0 1,0 76,60 A26,27 0 1,0 24,60 Z"/>' },

    { id: 'hair-afro-puffs', cat: 'hair', palette: 'hair', label: 'Afro puffs',
      anchor: { x: 0.5, y: 0.24 }, size: 1.3,
      svg: '<path class="tint" d="M18,52 C18,26 32,14 50,14 C68,14 82,26 82,52 ' +
           'C82,40 70,34 50,34 C30,34 18,40 18,52 Z"/>' +
           '<circle class="tint" cx="14" cy="30" r="17"/>' +
           '<circle class="tint" cx="86" cy="30" r="17"/>' },

    { id: 'hair-cornrows', cat: 'hair', palette: 'hair', label: 'Cornrows',
      anchor: { x: 0.5, y: 0.26 }, size: 1.04,
      svg: '<path class="tint" d="M16,52 C16,24 32,12 50,12 C68,12 84,24 84,52 ' +
           'C84,44 72,38 50,38 C28,38 16,44 16,52 Z"/>' +
           '<g fill="none" class="tint-stroke" stroke-width="4" stroke-linecap="round">' +
           '<path d="M24,46 C28,26 34,16 42,12"/><path d="M36,48 C38,28 42,16 48,11"/>' +
           '<path d="M50,49 L50,11"/><path d="M64,48 C62,28 58,16 52,11"/>' +
           '<path d="M76,46 C72,26 66,16 58,12"/></g>' },

    { id: 'hair-box-braids', cat: 'hair', palette: 'hair', label: 'Box braids',
      anchor: { x: 0.5, y: 0.34 }, size: 1.18,
      svg: '<path class="tint" d="M16,46 C16,22 32,10 50,10 C68,10 84,22 84,46 ' +
           'C84,38 72,32 50,32 C28,32 16,38 16,46 Z"/>' +
           '<g class="tint">' +
           '<rect x="10" y="40" width="9" height="46" rx="4.5"/>' +
           '<rect x="22" y="44" width="9" height="42" rx="4.5"/>' +
           '<rect x="69" y="44" width="9" height="42" rx="4.5"/>' +
           '<rect x="81" y="40" width="9" height="46" rx="4.5"/></g>' },

    { id: 'hair-locs', cat: 'hair', palette: 'hair', label: 'Locs',
      anchor: { x: 0.5, y: 0.33 }, size: 1.18,
      svg: '<path class="tint" d="M16,48 C16,22 32,10 50,10 C68,10 84,22 84,48 ' +
           'C84,40 72,34 50,34 C28,34 16,40 16,48 Z"/>' +
           '<g class="tint-stroke" fill="none" stroke-width="9" stroke-linecap="round">' +
           '<path d="M14,44 C10,58 12,72 16,84"/><path d="M26,48 C22,62 24,74 28,86"/>' +
           '<path d="M74,48 C78,62 76,74 72,86"/><path d="M86,44 C90,58 88,72 84,84"/></g>' },

    { id: 'hair-twists', cat: 'hair', palette: 'hair', label: 'Twists',
      anchor: { x: 0.5, y: 0.28 }, size: 1.14,
      svg: '<path class="tint" d="M16,50 C16,24 32,12 50,12 C68,12 84,24 84,50 ' +
           'C84,40 72,34 50,34 C28,34 16,40 16,50 Z"/>' +
           '<g class="tint"><circle cx="16" cy="54" r="8"/><circle cx="14" cy="68" r="7"/>' +
           '<circle cx="84" cy="54" r="8"/><circle cx="86" cy="68" r="7"/>' +
           '<circle cx="30" cy="22" r="8"/><circle cx="70" cy="22" r="8"/></g>' },

    { id: 'hair-bun', cat: 'hair', palette: 'hair', label: 'Top bun',
      anchor: { x: 0.5, y: 0.24 }, size: 1.08,
      svg: '<circle class="tint" cx="50" cy="8" r="15"/>' +
           '<path class="tint" d="M16,52 C16,26 32,14 50,14 C68,14 84,26 84,52 ' +
           'C84,42 72,36 50,36 C28,36 16,42 16,52 Z"/>' },

    { id: 'hair-ponytail', cat: 'hair', palette: 'hair', label: 'Ponytail',
      anchor: { x: 0.5, y: 0.3 }, size: 1.2,
      svg: '<path class="tint" d="M18,50 C18,24 34,12 50,12 C66,12 82,24 82,50 ' +
           'C82,40 70,34 50,34 C30,34 18,40 18,50 Z"/>' +
           '<path class="tint" d="M80,38 C94,46 96,68 86,84 C80,74 78,56 76,46 Z"/>' },

    { id: 'hair-long', cat: 'hair', palette: 'hair', label: 'Long straight',
      anchor: { x: 0.5, y: 0.36 }, size: 1.16,
      svg: '<path class="tint" d="M16,46 C16,20 32,8 50,8 C68,8 84,20 84,46 ' +
           'L84,88 L70,88 L70,40 C70,32 60,30 50,30 C40,30 30,32 30,40 ' +
           'L30,88 L16,88 Z"/>' },

    { id: 'hair-bob', cat: 'hair', palette: 'hair', label: 'Bob',
      anchor: { x: 0.5, y: 0.3 }, size: 1.12,
      svg: '<path class="tint" d="M16,46 C16,20 32,8 50,8 C68,8 84,20 84,46 ' +
           'L84,66 L70,66 L70,38 C70,30 60,28 50,28 C40,28 30,30 30,38 ' +
           'L30,66 L16,66 Z"/>' },

    { id: 'hair-wavy', cat: 'hair', palette: 'hair', label: 'Wavy',
      anchor: { x: 0.5, y: 0.34 }, size: 1.18,
      svg: '<path class="tint" d="M16,46 C16,20 32,8 50,8 C68,8 84,20 84,46 ' +
           'C88,56 82,62 86,74 C78,70 76,78 70,74 L70,38 C70,30 60,28 50,28 ' +
           'C40,28 30,30 30,38 L30,74 C24,78 22,70 14,74 C18,62 12,56 16,46 Z"/>' },

    { id: 'hair-spiky', cat: 'hair', palette: 'hair', label: 'Spiky',
      anchor: { x: 0.5, y: 0.22 }, size: 1.1,
      svg: '<path class="tint" d="M14,52 L22,22 L30,40 L38,10 L46,36 L54,8 ' +
           'L62,36 L70,12 L78,40 L86,24 L86,52 C86,40 74,34 50,34 C26,34 14,40 14,52 Z"/>' },

    { id: 'hair-mohawk', cat: 'hair', palette: 'hair', label: 'Mohawk',
      anchor: { x: 0.5, y: 0.2 }, size: 1.0,
      svg: '<path class="tint" d="M38,54 C38,30 44,10 50,2 C56,10 62,30 62,54 ' +
           'C58,44 42,44 38,54 Z"/>' },

    /* --- HEADWEAR (7). All seven the spec names. ------------------------- */
    { id: 'wear-hijab', cat: 'headwear', palette: 'any', label: 'Hijab',
      anchor: { x: 0.5, y: 0.36 }, size: 1.3,
      svg: '<path class="tint" d="M50,4 C74,4 90,22 90,48 C90,66 84,80 78,90 ' +
           'L66,90 C72,76 74,62 72,50 C70,34 62,26 50,26 C38,26 30,34 28,50 ' +
           'C26,62 28,76 34,90 L22,90 C16,80 10,66 10,48 C10,22 26,4 50,4 Z"/>' },

    { id: 'wear-turban', cat: 'headwear', palette: 'any', label: 'Turban',
      anchor: { x: 0.5, y: 0.26 }, size: 1.18,
      svg: '<path class="tint" d="M12,50 C12,22 30,6 50,6 C70,6 88,22 88,50 ' +
           'C88,42 76,36 50,36 C24,36 12,42 12,50 Z"/>' +
           '<path class="tint-stroke" fill="none" stroke-width="5" stroke-linecap="round" ' +
           'd="M16,44 C32,26 68,26 84,44"/>' +
           '<path class="tint" d="M46,6 L54,6 L58,20 L42,20 Z"/>' },

    { id: 'wear-headscarf', cat: 'headwear', palette: 'any', label: 'Headscarf',
      anchor: { x: 0.5, y: 0.3 }, size: 1.22,
      svg: '<path class="tint" d="M12,52 C12,24 30,8 50,8 C70,8 88,24 88,52 ' +
           'C88,42 76,36 50,36 C24,36 12,42 12,52 Z"/>' +
           '<path class="tint" d="M78,44 C92,52 94,70 86,82 C80,72 76,58 74,50 Z"/>' },

    { id: 'wear-beanie', cat: 'headwear', palette: 'any', label: 'Beanie',
      anchor: { x: 0.5, y: 0.26 }, size: 1.12,
      svg: '<path class="tint" d="M14,48 C14,22 30,10 50,10 C70,10 86,22 86,48 Z"/>' +
           '<rect class="tint" x="10" y="44" width="80" height="16" rx="8"/>' +
           '<circle class="tint" cx="50" cy="6" r="8"/>' },

    { id: 'wear-cap', cat: 'headwear', palette: 'any', label: 'Cap',
      anchor: { x: 0.5, y: 0.28 }, size: 1.2,
      svg: '<path class="tint" d="M16,50 C16,24 32,12 50,12 C68,12 84,24 84,50 Z"/>' +
           '<path class="tint" d="M84,44 C96,44 98,54 96,58 L50,58 L50,44 Z"/>' +
           '<circle class="tint" cx="50" cy="12" r="6"/>' },

    { id: 'wear-hood', cat: 'headwear', palette: 'any', label: 'Hood',
      anchor: { x: 0.5, y: 0.34 }, size: 1.3,
      svg: '<path class="tint" d="M50,4 C76,4 92,24 92,52 C92,70 86,84 80,92 ' +
           'L68,92 C74,78 76,62 74,50 C72,32 64,24 50,24 C36,24 28,32 26,50 ' +
           'C24,62 26,78 32,92 L20,92 C14,84 8,70 8,52 C8,24 24,4 50,4 Z"/>' },

    { id: 'wear-headband', cat: 'headwear', palette: 'any', label: 'Headband',
      anchor: { x: 0.5, y: 0.31 }, size: 1.08,
      svg: '<path class="tint" d="M10,48 C10,32 28,22 50,22 C72,22 90,32 90,48 ' +
           'C90,40 72,34 50,34 C28,34 10,40 10,48 Z"/>' },

    /* --- EXTRAS (8). Non-human first. ------------------------------------ */
    { id: 'extra-horns', cat: 'extras', palette: 'any', label: 'Horns',
      anchor: { x: 0.5, y: 0.22 }, size: 1.1,
      svg: '<path class="tint" d="M24,46 C14,30 16,12 28,6 C30,20 34,34 40,44 Z"/>' +
           '<path class="tint" d="M76,46 C86,30 84,12 72,6 C70,20 66,34 60,44 Z"/>' },

    { id: 'extra-tail', cat: 'extras', palette: 'any', label: 'Tail',
      anchor: { x: 0.78, y: 0.76 }, size: 0.34,
      svg: '<path class="tint-stroke" fill="none" stroke-width="12" stroke-linecap="round" ' +
           'd="M20,84 C52,84 76,62 74,30 C73,18 62,14 56,22"/>' },

    { id: 'extra-glasses-round', cat: 'extras', palette: 'any', label: 'Round glasses',
      anchor: { x: 0.5, y: 0.44 }, size: 0.78,
      svg: '<g class="tint-stroke" fill="none" stroke-width="5">' +
           '<circle cx="28" cy="50" r="18"/><circle cx="72" cy="50" r="18"/>' +
           '<path d="M46,50 L54,50"/><path d="M10,46 L4,42"/><path d="M90,46 L96,42"/></g>' },

    { id: 'extra-glasses-square', cat: 'extras', palette: 'any', label: 'Square glasses',
      anchor: { x: 0.5, y: 0.44 }, size: 0.8,
      svg: '<g class="tint-stroke" fill="none" stroke-width="5">' +
           '<rect x="8" y="36" width="34" height="28" rx="6"/>' +
           '<rect x="58" y="36" width="34" height="28" rx="6"/>' +
           '<path d="M42,50 L58,50"/></g>' },

    { id: 'extra-glasses-shades', cat: 'extras', palette: 'any', label: 'Shades',
      anchor: { x: 0.5, y: 0.44 }, size: 0.82,
      svg: '<path class="tint" d="M6,38 L44,38 L42,62 C42,66 20,68 14,60 Z"/>' +
           '<path class="tint" d="M94,38 L56,38 L58,62 C58,66 80,68 86,60 Z"/>' +
           '<rect class="tint" x="42" y="40" width="16" height="6" rx="3"/>' },

    { id: 'extra-goggles', cat: 'extras', palette: 'any', label: 'Goggles',
      anchor: { x: 0.5, y: 0.42 }, size: 0.88,
      svg: '<rect class="tint" x="2" y="40" width="96" height="10" rx="5"/>' +
           '<g class="tint"><circle cx="28" cy="50" r="19"/><circle cx="72" cy="50" r="19"/></g>' +
           '<circle fill="#bfe9ff" cx="28" cy="50" r="12"/>' +
           '<circle fill="#bfe9ff" cx="72" cy="50" r="12"/>' },

    { id: 'extra-freckles', cat: 'extras', palette: 'skin', label: 'Freckles',
      anchor: { x: 0.5, y: 0.56 }, size: 0.72,
      svg: '<g class="tint" opacity=".75">' +
           '<circle cx="18" cy="44" r="3.5"/><circle cx="30" cy="52" r="3.5"/>' +
           '<circle cx="24" cy="60" r="3.5"/><circle cx="82" cy="44" r="3.5"/>' +
           '<circle cx="70" cy="52" r="3.5"/><circle cx="76" cy="60" r="3.5"/></g>' },

    { id: 'extra-blush', cat: 'extras', palette: 'any', label: 'Blush',
      anchor: { x: 0.5, y: 0.6 }, size: 0.8,
      svg: '<g class="tint" opacity=".55">' +
           '<ellipse cx="16" cy="50" rx="14" ry="9"/>' +
           '<ellipse cx="84" cy="50" rx="14" ry="9"/></g>' }
  ];

  // Fast lookup, and the layer each category sits on.
  const BY_ID = new Map();
  PARTS.forEach(function (part) { BY_ID.set(part.id, part); });

  const LAYER = {};
  CATEGORIES.forEach(function (cat, i) { LAYER[cat.id] = i; });

  function get(id) { return BY_ID.get(id) || null; }
  function inCategory(id) { return PARTS.filter(function (p) { return p.cat === id; }); }
  function isPart(id) { return BY_ID.has(id); }

  /* Which layer does this shape belong on? The seven v1 shapes have no part
     entry, so they sit with the extras and keep their own front/back order. */
  function layerOf(type) {
    const part = get(type);
    if (!part) return LAYER.extras;
    return LAYER[part.cat] === undefined ? LAYER.extras : LAYER[part.cat];
  }

  function paletteFor(part) {
    if (!part) return PALETTES.any;
    return PALETTES[part.palette] || PALETTES.any;
  }

  /* The colour a part starts in. A tapped part must never land invisible, and
     it should not land silly either: the default mouth used to arrive bright
     cyan, which is a choice a child can make but not one to make for them. */
  const CAT_DEFAULT = {
    mouths: '#a8392c',      // a warm dark, so a smile reads as a mouth
    noses:  '#c98a5b',
    bodies: '#4cc9f0',
    extras: '#2b2b3a',
    shapes: '#e63946'
  };

  function defaultColour(part) {
    const palette = paletteFor(part);
    if (!part) return '#e63946';
    if (part.palette === 'skin') return palette[4];
    if (part.palette === 'hair') return palette[0];
    if (part.palette === 'eyes') return palette[3];
    return CAT_DEFAULT[part.cat] || '#4cc9f0';
  }

  return {
    PALETTES: PALETTES,
    CATEGORIES: CATEGORIES,
    FACE_CATS: FACE_CATS,
    all: function () { return PARTS.slice(); },
    get: get,
    isPart: isPart,
    inCategory: inCategory,
    layerOf: layerOf,
    paletteFor: paletteFor,
    defaultColour: defaultColour,
    count: PARTS.length
  };
})();
