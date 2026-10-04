/* ============================================================================
   stickers.js - the sticker library, and searching it by word
   ============================================================================
   v2 spec §5.3.2. Loaded before app.js; hands the rest of the app `Stickers`.

   WHY THIS EXISTS AT V1 RATHER THAN V2
   The full library of about 180 stickers is V2's job. But V1's Type screen
   has to search keywords to offer a child an emblem for the name they typed
   ("ninja" -> 🥷), so the searchable shape is needed now. V2 widens the list;
   nothing here has to be rewritten to do it.

   EVERY STICKER IS
     { emoji | asset, label, tab, keywords: [...] }
   with exactly one of `emoji` and `asset` set (v2 §5.3.2). An `asset` sticker
   is a picture from assets/manifest.json; they are merged in at load, so a
   file Filip adds this week appears in the tray next week with no code change.

   WHAT IS DELIBERATELY LEFT OUT (v2 §5.3.2)
   Alcohol, tobacco, weapons (🔫 included), rude gestures, 🍆 🍑 and syringes -
   anything a school would object to. 💩 only appears when the adult panel's
   "Silly stickers" switch is on.
   ========================================================================== */

const Stickers = (function () {

  /* The tabs, in tray order. ★ Me comes first because the child's own emblem
     lives there (v2 §5.1). 🔍 Search is a tab in the tray, handled by app.js. */
  const TABS = [
    { id: 'me',        icon: '★',  label: 'Me' },
    { id: 'heads',     icon: '🎩', label: 'Heads' },
    { id: 'eyes',      icon: '👓', label: 'Eyes' },
    { id: 'ears',      icon: '👂', label: 'Ears' },
    { id: 'moving',    icon: '🦽', label: 'Moving' },
    { id: 'gadgets',   icon: '🧰', label: 'Gadgets' },
    { id: 'fidgets',   icon: '🪀', label: 'Fidgets' },
    { id: 'creatures', icon: '🐾', label: 'Creatures' },
    { id: 'clothes',   icon: '🧣', label: 'Clothes' },
    { id: 'hobbies',   icon: '⚽', label: 'Hobbies' },
    { id: 'food',      icon: '🍕', label: 'Food' },
    { id: 'nature',    icon: '⭐', label: 'Nature' },
    { id: 'symbols',   icon: '💥', label: 'Symbols' },
    { id: 'search',    icon: '🔍', label: 'Search' }
  ];

  /* The emoji stickers. V2 grows this to about 180; the shape stays the same.
     Keywords are lower case, and are what a child's typed word is matched
     against, so they include the words a child would actually use. */
  const EMOJI = [
    // --- heads ---
    { emoji: '🎩', tab: 'heads', label: 'Top hat',   keywords: ['hat', 'top hat', 'magic', 'posh'] },
    { emoji: '🧢', tab: 'heads', label: 'Cap',       keywords: ['cap', 'hat', 'baseball'] },
    { emoji: '👑', tab: 'heads', label: 'Crown',     keywords: ['crown', 'king', 'queen', 'royal', 'princess'] },
    { emoji: '⛑️', tab: 'heads', label: 'Helmet',    keywords: ['helmet', 'safety', 'builder', 'rescue'] },
    { emoji: '🎀', tab: 'heads', label: 'Bow',       keywords: ['bow', 'ribbon', 'pretty'] },
    { emoji: '🪖', tab: 'heads', label: 'Army hat',  keywords: ['army', 'helmet', 'soldier'] },
    { emoji: '🧕', tab: 'heads', label: 'Headscarf', keywords: ['headscarf', 'hijab', 'scarf'] },
    { emoji: '👳', tab: 'heads', label: 'Turban',    keywords: ['turban', 'dastar'] },

    // --- eyes ---
    { emoji: '👓', tab: 'eyes', label: 'Glasses',  keywords: ['glasses', 'specs', 'see'] },
    { emoji: '🕶️', tab: 'eyes', label: 'Shades',   keywords: ['sunglasses', 'shades', 'cool', 'spy'] },
    { emoji: '🥸', tab: 'eyes', label: 'Disguise', keywords: ['disguise', 'moustache', 'funny', 'spy'] },
    { emoji: '😷', tab: 'eyes', label: 'Mask',     keywords: ['mask', 'face mask', 'poorly'] },
    { emoji: '🥽', tab: 'eyes', label: 'Goggles',  keywords: ['goggles', 'swim', 'science'] },

    // --- ears ---
    { emoji: '🎧', tab: 'ears', label: 'Headphones',  keywords: ['headphones', 'music', 'quiet', 'ear defenders'] },
    { emoji: '🦻', tab: 'ears', label: 'Hearing aid', keywords: ['hearing aid', 'hear', 'ear', 'deaf'] },

    // --- moving ---
    { emoji: '🦽', tab: 'moving', label: 'Wheelchair', keywords: ['wheelchair', 'wheels', 'chair'] },
    { emoji: '🦼', tab: 'moving', label: 'Power chair', keywords: ['power chair', 'wheelchair', 'electric'] },
    { emoji: '🦯', tab: 'moving', label: 'Cane',        keywords: ['cane', 'stick', 'blind', 'white cane'] },
    { emoji: '🦾', tab: 'moving', label: 'Robot arm',   keywords: ['robot arm', 'bionic', 'arm', 'strong'] },
    { emoji: '🦿', tab: 'moving', label: 'Robot leg',   keywords: ['robot leg', 'bionic', 'leg', 'run'] },
    { emoji: '🛴', tab: 'moving', label: 'Scooter',     keywords: ['scooter', 'ride'] },
    { emoji: '🛹', tab: 'moving', label: 'Skateboard',  keywords: ['skateboard', 'skate', 'board'] },
    { emoji: '🚲', tab: 'moving', label: 'Bike',        keywords: ['bike', 'bicycle', 'cycle', 'ride'] },

    // --- gadgets ---
    { emoji: '🔦', tab: 'gadgets', label: 'Torch',     keywords: ['torch', 'light', 'dark', 'flashlight'] },
    { emoji: '📱', tab: 'gadgets', label: 'Phone',     keywords: ['phone', 'mobile', 'talker', 'tablet'] },
    { emoji: '📻', tab: 'gadgets', label: 'Radio',     keywords: ['radio', 'walkie talkie', 'spy'] },
    { emoji: '⌚', tab: 'gadgets', label: 'Watch',     keywords: ['watch', 'time', 'gadget'] },
    { emoji: '🔍', tab: 'gadgets', label: 'Magnifier', keywords: ['magnifying glass', 'look', 'detective', 'spy', 'clue'] },
    { emoji: '🧰', tab: 'gadgets', label: 'Toolbox',   keywords: ['toolbox', 'tools', 'fix', 'gadget'] },
    { emoji: '🚀', tab: 'gadgets', label: 'Rocket',    keywords: ['rocket', 'jetpack', 'space', 'fly', 'fast'] },
    { emoji: '🔑', tab: 'gadgets', label: 'Key',       keywords: ['key', 'secret', 'lock', 'unlock'] },

    // --- fidgets ---
    { emoji: '🪀', tab: 'fidgets', label: 'Yo-yo',    keywords: ['yoyo', 'yo yo', 'toy', 'fidget'] },
    { emoji: '🧸', tab: 'fidgets', label: 'Teddy',    keywords: ['teddy', 'bear', 'toy', 'cuddly', 'soft'] },
    { emoji: '🫧', tab: 'fidgets', label: 'Bubbles',  keywords: ['bubbles', 'pop it', 'fidget', 'pop'] },
    { emoji: '🧩', tab: 'fidgets', label: 'Puzzle',   keywords: ['puzzle', 'jigsaw', 'piece'] },
    { emoji: '🎲', tab: 'fidgets', label: 'Dice',     keywords: ['dice', 'game', 'roll', 'luck'] },

    // --- creatures ---
    { emoji: '🐱', tab: 'creatures', label: 'Cat',     keywords: ['cat', 'kitten', 'kitty', 'pet'] },
    { emoji: '🐶', tab: 'creatures', label: 'Dog',     keywords: ['dog', 'puppy', 'pet'] },
    { emoji: '🐉', tab: 'creatures', label: 'Dragon',  keywords: ['dragon', 'fire', 'fly', 'monster'] },
    { emoji: '🦊', tab: 'creatures', label: 'Fox',     keywords: ['fox', 'clever'] },
    { emoji: '🐸', tab: 'creatures', label: 'Frog',    keywords: ['frog', 'jump', 'green'] },
    { emoji: '🦜', tab: 'creatures', label: 'Parrot',  keywords: ['parrot', 'bird', 'talk'] },
    { emoji: '🦖', tab: 'creatures', label: 'Dinosaur',keywords: ['dinosaur', 'dino', 't rex', 'roar'] },
    { emoji: '🦄', tab: 'creatures', label: 'Unicorn', keywords: ['unicorn', 'magic', 'horse', 'rainbow'] },
    { emoji: '🐙', tab: 'creatures', label: 'Octopus', keywords: ['octopus', 'sea', 'arms'] },
    { emoji: '🦈', tab: 'creatures', label: 'Shark',   keywords: ['shark', 'sea', 'teeth'] },
    { emoji: '🐺', tab: 'creatures', label: 'Wolf',    keywords: ['wolf', 'howl', 'pack'] },
    { emoji: '🦉', tab: 'creatures', label: 'Owl',     keywords: ['owl', 'bird', 'night', 'wise'] },
    { emoji: '🐯', tab: 'creatures', label: 'Tiger',   keywords: ['tiger', 'stripes', 'roar'] },
    { emoji: '🐻', tab: 'creatures', label: 'Bear',    keywords: ['bear', 'strong'] },
    { emoji: '🐧', tab: 'creatures', label: 'Penguin', keywords: ['penguin', 'ice', 'bird'] },
    { emoji: '🦋', tab: 'creatures', label: 'Butterfly', keywords: ['butterfly', 'wings', 'moth'] },

    // --- clothes ---
    { emoji: '🧣', tab: 'clothes', label: 'Scarf',  keywords: ['scarf', 'cape', 'warm'] },
    { emoji: '🧥', tab: 'clothes', label: 'Coat',   keywords: ['coat', 'jacket', 'spy'] },
    { emoji: '👕', tab: 'clothes', label: 'T-shirt',keywords: ['tshirt', 't shirt', 'top', 'shirt'] },
    { emoji: '🎭', tab: 'clothes', label: 'Mask',   keywords: ['mask', 'hero mask', 'disguise', 'drama'] },
    { emoji: '🥼', tab: 'clothes', label: 'Lab coat', keywords: ['lab coat', 'science', 'scientist'] },
    { emoji: '👟', tab: 'clothes', label: 'Trainers', keywords: ['trainers', 'shoes', 'run', 'fast'] },

    // --- hobbies ---
    { emoji: '⚽', tab: 'hobbies', label: 'Football', keywords: ['football', 'ball', 'soccer', 'play'] },
    { emoji: '🎮', tab: 'hobbies', label: 'Gaming',   keywords: ['gaming', 'game', 'controller', 'console'] },
    { emoji: '🎨', tab: 'hobbies', label: 'Painting', keywords: ['painting', 'art', 'paint', 'draw'] },
    { emoji: '📚', tab: 'hobbies', label: 'Books',    keywords: ['books', 'reading', 'read', 'story'] },
    { emoji: '🎵', tab: 'hobbies', label: 'Music',    keywords: ['music', 'song', 'sing', 'note'] },
    { emoji: '🎸', tab: 'hobbies', label: 'Guitar',   keywords: ['guitar', 'music', 'band', 'rock'] },
    { emoji: '🏊', tab: 'hobbies', label: 'Swimming', keywords: ['swimming', 'swim', 'pool', 'water'] },
    { emoji: '🧗', tab: 'hobbies', label: 'Climbing', keywords: ['climbing', 'climb', 'rock'] },
    { emoji: '🏀', tab: 'hobbies', label: 'Basketball', keywords: ['basketball', 'ball', 'hoop'] },
    { emoji: '🥋', tab: 'hobbies', label: 'Karate',   keywords: ['karate', 'judo', 'ninja', 'martial arts', 'belt'] },

    // --- food ---
    { emoji: '🍕', tab: 'food', label: 'Pizza',    keywords: ['pizza', 'food', 'cheese'] },
    { emoji: '🍎', tab: 'food', label: 'Apple',    keywords: ['apple', 'fruit', 'food'] },
    { emoji: '🍪', tab: 'food', label: 'Biscuit',  keywords: ['biscuit', 'cookie', 'food', 'treat'] },
    { emoji: '🧃', tab: 'food', label: 'Juice',    keywords: ['juice', 'drink', 'carton'] },
    { emoji: '🍟', tab: 'food', label: 'Chips',    keywords: ['chips', 'fries', 'food'] },
    { emoji: '🍦', tab: 'food', label: 'Ice cream',keywords: ['ice cream', 'cold', 'treat'] },

    // --- nature ---
    { emoji: '⭐', tab: 'nature', label: 'Star',    keywords: ['star', 'shine', 'night'] },
    { emoji: '🌈', tab: 'nature', label: 'Rainbow', keywords: ['rainbow', 'colours', 'colors', 'sky'] },
    { emoji: '🌙', tab: 'nature', label: 'Moon',    keywords: ['moon', 'night', 'sleep'] },
    { emoji: '🌞', tab: 'nature', label: 'Sun',     keywords: ['sun', 'sunny', 'hot', 'day'] },
    { emoji: '🌊', tab: 'nature', label: 'Wave',    keywords: ['wave', 'sea', 'water', 'ocean'] },
    { emoji: '🌴', tab: 'nature', label: 'Palm tree', keywords: ['palm tree', 'tree', 'jungle', 'island'] },
    { emoji: '❄️', tab: 'nature', label: 'Snow',    keywords: ['snow', 'ice', 'cold', 'freeze', 'winter'] },
    { emoji: '🔥', tab: 'nature', label: 'Fire',    keywords: ['fire', 'flame', 'hot', 'burn'] },
    { emoji: '🪐', tab: 'nature', label: 'Planet',  keywords: ['planet', 'space', 'saturn'] },
    { emoji: '🌵', tab: 'nature', label: 'Cactus',  keywords: ['cactus', 'desert', 'spiky'] },

    // --- symbols ---
    { emoji: '⚡', tab: 'symbols', label: 'Lightning', keywords: ['lightning', 'bolt', 'power', 'fast', 'electric'] },
    { emoji: '💥', tab: 'symbols', label: 'Bang',      keywords: ['bang', 'boom', 'explosion', 'crash'] },
    { emoji: '🛡️', tab: 'symbols', label: 'Shield',    keywords: ['shield', 'protect', 'safe', 'guard'] },
    { emoji: '🧲', tab: 'symbols', label: 'Magnet',    keywords: ['magnet', 'pull', 'attract'] },
    { emoji: '🌀', tab: 'symbols', label: 'Swirl',     keywords: ['swirl', 'spiral', 'spin', 'teleport', 'portal'] },
    { emoji: '🪽', tab: 'symbols', label: 'Wing',      keywords: ['wing', 'fly', 'angel', 'feather'] },
    { emoji: '❤️', tab: 'symbols', label: 'Heart',     keywords: ['heart', 'love', 'like'] },
    { emoji: '💛', tab: 'symbols', label: 'Yellow heart', keywords: ['heart', 'yellow', 'friend'] },
    { emoji: '👻', tab: 'symbols', label: 'Ghost',     keywords: ['ghost', 'invisible', 'spooky', 'boo'] },
    { emoji: '🥷', tab: 'symbols', label: 'Ninja',     keywords: ['ninja', 'sneaky', 'quiet', 'hidden', 'spy'] },
    { emoji: '🤖', tab: 'symbols', label: 'Robot',     keywords: ['robot', 'machine', 'beep', 'android'] },
    { emoji: '🕵️', tab: 'symbols', label: 'Spy',       keywords: ['spy', 'detective', 'agent', 'secret'] },
    { emoji: '💤', tab: 'symbols', label: 'Sleepy',    keywords: ['sleepy', 'tired', 'sleep', 'rest'] },
    { emoji: '🔇', tab: 'symbols', label: 'Quiet',     keywords: ['quiet', 'mute', 'silent', 'shh'] }
  ];

  // Only shown when the adult panel's "Silly stickers" switch is on (§5.3.2).
  const SILLY = [
    { emoji: '💩', tab: 'symbols', label: 'Poo', keywords: ['poo', 'poop', 'silly'], silly: true }
  ];

  let imageStickers = [];     // merged in from assets/manifest.json

  /* Pull the picture stickers out of the asset manifest. They sit in the tab
     the manifest gives them, so a file Filip adds appears in the right tray
     without anyone touching this file (v2 §5.3.2). */
  function loadImageStickers() {
    if (typeof Assets === 'undefined') return Promise.resolve([]);
    return Assets.ready.then(function () {
      imageStickers = Assets.list('stickers').map(function (entry) {
        return {
          asset: entry.id,
          emoji: null,
          tab: entry.tab || 'gadgets',
          label: entry.label || entry.id,
          keywords: entry.keywords || [],
          isNew: Boolean(entry.isNew),
          fallback: entry.fallback || '🧩'
        };
      });
      return imageStickers;
    });
  }

  // Everything that should be offered right now.
  function all(options) {
    const opts = options || {};
    const base = EMOJI.concat(opts.silly ? SILLY : []);
    return base.concat(imageStickers);
  }

  function inTab(tabId, options) {
    return all(options).filter(function (s) { return s.tab === tabId; });
  }


  /* --------------------------------------------------------------------------
     SEARCHING (v2 §5.3.2)
     "Be forgiving: allow prefixes, plurals, and one wrong letter in words of
     four or more letters." A child hunting for a sticker should not be beaten
     by a typo, and they certainly should not have to spell it correctly.
     ----------------------------------------------------------------------- */

  function tidy(word) {
    return String(word || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  }

  /* Levenshtein distance: the number of single-letter edits (add, remove or
     change) needed to turn one word into the other. "ninja" and "ninjaa" are
     1 apart. Capped at `limit` so it gives up early rather than doing the
     full table for words that are obviously unalike. */
  function editDistance(a, b, limit) {
    if (Math.abs(a.length - b.length) > limit) return limit + 1;
    let previous = [];
    for (let j = 0; j <= b.length; j++) previous[j] = j;

    for (let i = 1; i <= a.length; i++) {
      const current = [i];
      let best = i;
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        current[j] = Math.min(current[j - 1] + 1,      // an extra letter
                              previous[j] + 1,          // a missing letter
                              previous[j - 1] + cost);  // a different letter
        if (current[j] < best) best = current[j];
      }
      if (best > limit) return limit + 1;              // no point going on
      previous = current;
    }
    return previous[b.length];
  }

  /* How well does `term` match this one keyword?

     The number matters as much as the yes/no. Typing "cape" used to put a
     CAP first - it matches by prefix - and pushed the actual cape to the
     bottom of the list. A child does not scroll past three wrong answers to
     find the thing they asked for, so an exact match now outranks a prefix,
     and a prefix outranks a guess at a typo.

       3  the word exactly
       2  a prefix or a plural
       1  one letter out
       0  no match
  */
  function scoreWord(term, keyword) {
    if (!term || !keyword) return 0;
    if (keyword === term) return 3;
    if (keyword.indexOf(term) === 0 || term.indexOf(keyword) === 0) return 2;
    // plurals, both ways round
    if (keyword + 's' === term || term + 's' === keyword) return 2;
    if (keyword + 'es' === term || term + 'es' === keyword) return 2;
    if (term.length >= 4 && keyword.length >= 4 && editDistance(term, keyword, 1) <= 1) return 1;
    return 0;
  }

  // The best score any of a sticker's words manages for this term.
  function scoreTerm(term, sticker) {
    const words = (sticker.keywords || []).concat(tidy(sticker.label).split(' '));
    let best = 0;
    words.forEach(function (keyword) {
      const tidied = tidy(keyword);
      let score;
      if (tidied.indexOf(' ') !== -1) {
        // A multi-word keyword ("hearing aid") matches as a whole, or on
        // either word alone.
        if (tidied === term) score = 3;
        else if (tidied.indexOf(term) !== -1) score = 2;
        else {
          score = 0;
          tidied.split(' ').forEach(function (piece) {
            score = Math.max(score, scoreWord(term, piece));
          });
        }
      } else {
        score = scoreWord(term, tidied);
      }
      if (score > best) best = score;
    });
    return best;
  }

  function matches(term, sticker) {
    return scoreTerm(term, sticker) > 0;
  }

  /* Search for a phrase. Every word in it is tried, and a sticker matching
     more of them sorts higher, so "flying dragon" puts 🐉 at the front. */
  function search(query, options) {
    const terms = tidy(query).split(' ').filter(Boolean);
    if (terms.length === 0) return [];

    const scored = [];
    all(options).forEach(function (sticker) {
      let score = 0;
      let matched = 0;
      terms.forEach(function (term) {
        const got = scoreTerm(term, sticker);
        if (got > 0) {
          matched++;
          score += got;
          /* The thing actually CALLED that wins. Karate lists "ninja" as a
             keyword, so without this a child typing "ninja" was offered a
             karate belt before the ninja. */
          if (tidy(sticker.label) === term) score += 3;
        }
      });
      // Matching MORE of the typed words beats matching one of them well, so
      // "flying dragon" puts the dragon above anything that only flies.
      if (score > 0) scored.push({ sticker: sticker, score: matched * 10 + score });
    });

    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.map(function (entry) { return entry.sticker; });
  }

  /* Which words in a phrase found nothing? Those become requests - "📡 Request
     sent to HQ" - which is Filip's sticker to-do list for next week (§7). */
  function unmatchedWords(query, options) {
    const terms = tidy(query).split(' ').filter(Boolean);
    return terms.filter(function (term) {
      if (term.length < 2) return false;
      return !all(options).some(function (sticker) { return matches(term, sticker); });
    });
  }

  return {
    TABS: TABS,
    all: all,
    inTab: inTab,
    search: search,
    unmatchedWords: unmatchedWords,
    loadImageStickers: loadImageStickers,
    imageStickers: function () { return imageStickers.slice(); }
  };
})();
