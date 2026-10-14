/* Falcon engine: card encoding, 5–7 card hand evaluator, equity calculations.
   Card = rank*4 + suit. rank 0..12 = 2..A, suit 0..3 = s,h,d,c.
   Works in the browser (window.Engine) and in Node (module.exports). */
(function (root) {
  "use strict";
  const RANKS = "23456789TJQKA";
  const SUITS = "shdc";
  const SUIT_SYMBOL = ["♠", "♥", "♦", "♣"];
  const CATEGORY = ["High card", "Pair", "Two pair", "Three of a kind", "Straight", "Flush", "Full house", "Four of a kind", "Straight flush"];

  const card = (r, s) => r * 4 + s;
  const rankOf = c => c >> 2;
  const suitOf = c => c & 3;
  const cardName = c => RANKS[rankOf(c)] + SUITS[suitOf(c)];
  function parseCard(str) {
    const r = RANKS.indexOf(str[0].toUpperCase()), s = SUITS.indexOf(str[1].toLowerCase());
    if (r < 0 || s < 0) throw new Error("Bad card: " + str);
    return card(r, s);
  }
  const parseCards = str => (str.match(/[2-9TJQKA][shdc]/gi) || []).map(parseCard);

  function straightHigh(mask) {
    for (let h = 12; h >= 4; h--) if (((mask >> (h - 4)) & 31) === 31) return h;
    const wheel = (1 << 12) | 15;
    return (mask & wheel) === wheel ? 3 : -1;
  }
  function topBits(mask, n, exclude) {
    const out = [];
    for (let r = 12; r >= 0 && out.length < n; r--) if ((mask >> r) & 1 && r !== exclude) out.push(r);
    return out;
  }
  const pack = arr => arr.reduce((a, r) => (a << 4) | r, 0);

  /* Returns a comparable integer: higher is better. Category is value >> 20. */
  function evaluate(cs) {
    const cnt = new Int8Array(13), sm = [0, 0, 0, 0], sc = [0, 0, 0, 0];
    let rm = 0;
    for (let i = 0; i < cs.length; i++) {
      const r = cs[i] >> 2, s = cs[i] & 3;
      cnt[r]++; sm[s] |= 1 << r; sc[s]++; rm |= 1 << r;
    }
    for (let s = 0; s < 4; s++) if (sc[s] >= 5) {
      const sf = straightHigh(sm[s]);
      if (sf >= 0) return (8 << 20) | sf;
      return (5 << 20) | pack(topBits(sm[s], 5));
    }
    let quad = -1; const trips = [], pairs = [];
    for (let r = 12; r >= 0; r--) {
      if (cnt[r] === 4) quad = r; else if (cnt[r] === 3) trips.push(r); else if (cnt[r] === 2) pairs.push(r);
    }
    if (quad >= 0) return (7 << 20) | (quad << 4) | topBits(rm, 1, quad)[0];
    if (trips.length && (trips.length > 1 || pairs.length)) {
      const p = Math.max(trips.length > 1 ? trips[1] : -1, pairs.length ? pairs[0] : -1);
      return (6 << 20) | (trips[0] << 4) | p;
    }
    const st = straightHigh(rm);
    if (st >= 0) return (4 << 20) | st;
    if (trips.length) {
      const k = topBits(rm, 2, trips[0]);
      return (3 << 20) | (trips[0] << 8) | (k[0] << 4) | k[1];
    }
    if (pairs.length >= 2) {
      const p1 = pairs[0], p2 = pairs[1];
      let k = -1;
      for (let r = 12; r >= 0; r--) if (cnt[r] && r !== p1 && r !== p2) { k = r; break; }
      return (2 << 20) | (p1 << 8) | (p2 << 4) | k;
    }
    if (pairs.length === 1) {
      const k = topBits(rm, 3, pairs[0]);
      return (1 << 20) | (pairs[0] << 12) | pack(k);
    }
    return pack(topBits(rm, 5));
  }
  const category = v => v >> 20;

  /* ---------- Combos ---------- */
  /* handClass like "AKs", "AKo", "TT" → array of [c1,c2] */
  function combosOf(hc) {
    const a = RANKS.indexOf(hc[0]), b = RANKS.indexOf(hc[1]), out = [];
    if (hc.length === 2) {
      for (let s1 = 0; s1 < 4; s1++) for (let s2 = s1 + 1; s2 < 4; s2++) out.push([card(a, s1), card(a, s2)]);
    } else if (hc[2] === "s") {
      for (let s = 0; s < 4; s++) out.push([card(a, s), card(b, s)]);
    } else {
      for (let s1 = 0; s1 < 4; s1++) for (let s2 = 0; s2 < 4; s2++) if (s1 !== s2) out.push([card(a, s1), card(b, s2)]);
    }
    return out;
  }
  function handClass(c1, c2) {
    let a = rankOf(c1), b = rankOf(c2);
    if (a < b) [a, b] = [b, a];
    if (a === b) return RANKS[a] + RANKS[a];
    return RANKS[a] + RANKS[b] + (suitOf(c1) === suitOf(c2) ? "s" : "o");
  }
  /* rangeMap: {handClass: weight 0..1} → [{c:[c1,c2], w}] excluding dead cards */
  function rangeCombos(rangeMap, dead) {
    const d = new Set(dead || []), out = [];
    for (const hc in rangeMap) {
      const w = rangeMap[hc];
      if (w <= 0) continue;
      for (const c of combosOf(hc)) if (!d.has(c[0]) && !d.has(c[1])) out.push({ c, w });
    }
    return out;
  }

  /* ---------- Helpers ---------- */
  function remainingDeck(dead) {
    const d = new Set(dead), out = [];
    for (let c = 0; c < 52; c++) if (!d.has(c)) out.push(c);
    return out;
  }
  function forEachCombo(arr, k, fn) {
    const n = arr.length, idx = [];
    for (let i = 0; i < k; i++) idx.push(i);
    if (k === 0) { fn([]); return; }
    const pick = new Array(k);
    while (true) {
      for (let i = 0; i < k; i++) pick[i] = arr[idx[i]];
      fn(pick);
      let i = k - 1;
      while (i >= 0 && idx[i] === n - k + i) i--;
      if (i < 0) return;
      idx[i]++;
      for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
    }
  }
  function sampleInto(deck, k, out, used) {
    let n = 0;
    while (n < k) {
      const c = deck[(Math.random() * deck.length) | 0];
      if (used.has(c)) continue;
      used.add(c); out.push(c); n++;
    }
  }
  function weightedPicker(combos) {
    const cum = new Float64Array(combos.length);
    let t = 0;
    combos.forEach((x, i) => { t += x.w; cum[i] = t; });
    return () => {
      const r = Math.random() * t;
      let lo = 0, hi = cum.length - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m; }
      return combos[lo];
    };
  }
  const result = (win, tie, total) => ({ win: win / total, tie: tie / total, lose: 1 - (win + tie) / total, equity: (win + tie / 2) / total, samples: total });

  /* ---------- Equity: hand vs hand ---------- */
  function equityHandVsHand(h, v, board, iters) {
    board = board || [];
    const dead = [...h, ...v, ...board];
    const deck = remainingDeck(dead);
    const need = 5 - board.length;
    let win = 0, tie = 0, total = 0;
    const score = run => {
      const b = board.concat(run);
      const a = evaluate(h.concat(b)), c = evaluate(v.concat(b));
      if (a > c) win++; else if (a === c) tie++;
      total++;
    };
    if (need <= 2) forEachCombo(deck, need, score);
    else {
      const n = iters || 40000;
      for (let i = 0; i < n; i++) {
        const used = new Set(), run = [];
        sampleInto(deck, need, run, used);
        score(run);
      }
    }
    return result(win, tie, total);
  }

  /* ---------- Equity: hand vs range ---------- */
  function equityHandVsRange(h, rangeMap, board, iters) {
    board = board || [];
    const dead = [...h, ...board];
    const combos = rangeCombos(rangeMap, dead);
    if (!combos.length) return null;
    const need = 5 - board.length;
    let win = 0, tie = 0, total = 0;
    if (need <= 1) {
      for (const { c, w } of combos) {
        const deck = remainingDeck([...dead, ...c]);
        forEachCombo(deck, need, run => {
          const b = board.concat(run);
          const a = evaluate(h.concat(b)), x = evaluate(c.concat(b));
          if (a > x) win += w; else if (a === x) tie += w;
          total += w;
        });
      }
      return result(win, tie, total);
    }
    const pick = weightedPicker(combos), deck = remainingDeck(dead);
    const n = iters || 30000;
    for (let i = 0; i < n; i++) {
      const { c } = pick();
      const used = new Set(c), run = [];
      sampleInto(deck, need, run, used);
      const b = board.concat(run);
      const a = evaluate(h.concat(b)), x = evaluate(c.concat(b));
      if (a > x) win++; else if (a === x) tie++;
      total++;
    }
    return result(win, tie, total);
  }

  /* ---------- Equity: range vs range (Monte Carlo) ---------- */
  function equityRangeVsRange(mapA, mapB, board, iters) {
    board = board || [];
    const A = rangeCombos(mapA, board), B = rangeCombos(mapB, board);
    if (!A.length || !B.length) return null;
    const pa = weightedPicker(A), pb = weightedPicker(B), deck = remainingDeck(board);
    const need = 5 - board.length, n = iters || 20000;
    let win = 0, tie = 0, total = 0, guard = 0;
    while (total < n && guard < n * 20) {
      guard++;
      const a = pa().c, b = pb().c;
      if (a[0] === b[0] || a[0] === b[1] || a[1] === b[0] || a[1] === b[1]) continue;
      const used = new Set([...a, ...b]), run = [];
      sampleInto(deck, need, run, used);
      const bd = board.concat(run);
      const x = evaluate(a.concat(bd)), y = evaluate(b.concat(bd));
      if (x > y) win++; else if (x === y) tie++;
      total++;
    }
    return result(win, tie, total);
  }

  /* ---------- Equity: hand vs range, broken down by hand class ----------
     Runs the same number of runouts against every class, then weights each class
     by its live combos. The total is the combo-weighted average of the rows. */
  function equityByClass(h, rangeMap, board, perClass) {
    board = board || [];
    const dead = [...h, ...board], d = new Set(dead);
    const need = 5 - board.length, n = perClass || 1000;
    const deck = remainingDeck(dead);
    const rows = [];
    let blocked = 0;
    for (const hc in rangeMap) {
      const w = rangeMap[hc];
      if (w <= 0) continue;
      const all = combosOf(hc), live = all.filter(c => !d.has(c[0]) && !d.has(c[1]));
      blocked += (all.length - live.length) * w;
      if (!live.length) continue;
      let win = 0, tie = 0;
      for (let i = 0; i < n; i++) {
        const c = live[i % live.length], used = new Set(c), run = [];
        sampleInto(deck, need, run, used);
        const b = board.concat(run);
        const a = evaluate(h.concat(b)), x = evaluate(c.concat(b));
        if (a > x) win++; else if (a === x) tie++;
      }
      rows.push({ hc, combos: live.length * w, equity: (win + tie / 2) / n });
    }
    if (!rows.length) return null;
    const combos = rows.reduce((s, r) => s + r.combos, 0);
    const equity = rows.reduce((s, r) => s + r.combos * r.equity, 0) / combos;
    return { rows, equity, combos, blocked };
  }

  /* ---------- Equity vs every combo of a range on a flop or turn, grouped by how the combo hit ---------- */
  /* Exact (all runouts). Returns { rows: [{c, hc, w, bucket, equity}], groups: [{bucket, combos, equity}], equity, combos } */
  function equityByCombo(h, rangeMap, board) {
    const live = rangeCombos(rangeMap, [...h, ...board]);
    if (!live.length || board.length < 3) return null;
    const need = 5 - board.length, rows = [];
    for (const { c, w } of live) {
      const deck = remainingDeck([...h, ...board, ...c]);
      let win = 0, tie = 0, total = 0;
      forEachCombo(deck, need, run => {
        const b = board.concat(run);
        const a = evaluate(h.concat(b)), x = evaluate(c.concat(b));
        if (a > x) win++; else if (a === x) tie++;
        total++;
      });
      rows.push({ c, hc: handClass(c[0], c[1]), w, bucket: classifyFlop(c, board), equity: (win + tie / 2) / total });
    }
    const groups = BUCKETS.map((_, bucket) => {
      const rs = rows.filter(r => r.bucket === bucket), combos = rs.reduce((s, r) => s + r.w, 0);
      return { bucket, combos, equity: combos ? rs.reduce((s, r) => s + r.w * r.equity, 0) / combos : null };
    });
    const combos = rows.reduce((s, r) => s + r.w, 0);
    return { rows, groups, equity: rows.reduce((s, r) => s + r.w * r.equity, 0) / combos, combos };
  }

  /* ---------- Next-card breakdown (vs a known hand) ---------- */
  function nextCardEquities(h, v, board) {
    const deck = remainingDeck([...h, ...v, ...board]);
    return deck.map(c => ({ card: c, ...equityHandVsHand(h, v, board.concat([c])) }));
  }

  /* ---------- Flop hand classification for range analysis ---------- */
  function drawInfo(hole, board) {
    const all = hole.concat(board);
    const sc = [0, 0, 0, 0];
    all.forEach(c => sc[suitOf(c)]++);
    let flushDraw = false;
    for (let s = 0; s < 4; s++) if (sc[s] === 4 && hole.some(c => suitOf(c) === s)) flushDraw = true;
    let mask = 0;
    all.forEach(c => { mask |= 1 << rankOf(c); });
    let straightOuts = 0;
    if (straightHigh(mask) < 0) for (let r = 0; r < 13; r++) if (!((mask >> r) & 1) && straightHigh(mask | (1 << r)) >= 0) straightOuts++;
    return { flushDraw, oesd: straightOuts >= 2, gutshot: straightOuts === 1 };
  }
  /* Buckets: 0 Strong (two pair+ using hole cards), 1 Top pair or overpair, 2 Weaker pair, 3 Draw, 4 Nothing.
     Works on the turn and river too; on the river nothing is left to draw to, so draws count as nothing. */
  const BUCKETS = ["Strong hands", "Top pair / overpair", "Weaker pair", "Draws", "Nothing"];
  function classifyFlop(hole, board) {
    const v = evaluate(hole.concat(board)), cat = category(v);
    const br = board.map(rankOf), r1 = rankOf(hole[0]), r2 = rankOf(hole[1]);
    const top = Math.max(...br);
    const hits = r => br.filter(x => x === r).length;
    const pocket = r1 === r2;
    if (cat >= 4) return 0;
    if (cat === 3 && (pocket ? hits(r1) >= 1 : hits(r1) >= 1 || hits(r2) >= 1)) return 0;
    if (!pocket && hits(r1) && hits(r2) && r1 !== r2) return 0;
    const pairedHole = pocket ? r1 : (hits(r1) ? r1 : hits(r2) ? r2 : -1);
    if (pocket && r1 > top) return 1;
    if (!pocket && pairedHole === top) return 1;
    if (pairedHole >= 0) return 2;
    if (board.length >= 5) return 4;
    const d = drawInfo(hole, board);
    if (d.flushDraw || d.oesd) return 3;
    return 4;
  }
  function rangeProfile(rangeMap, board) {
    const combos = rangeCombos(rangeMap, board);
    const tot = [0, 0, 0, 0, 0];
    let w = 0;
    for (const { c, w: wt } of combos) { tot[classifyFlop(c, board)] += wt; w += wt; }
    return { buckets: tot.map(x => x / w), combos: w };
  }

  /* ---------- Board texture ---------- */
  function texture(board) {
    const br = board.map(rankOf).sort((a, b) => b - a);
    const suits = board.map(suitOf);
    const suitCounts = [0, 0, 0, 0];
    suits.forEach(s => suitCounts[s]++);
    const maxSuit = Math.max(...suitCounts);
    const paired = new Set(br).size < br.length;
    const uniq = [...new Set(br)];
    let mask = 0;
    uniq.forEach(r => { mask |= 1 << r; });
    if (mask & (1 << 12)) mask |= 1 << 13; // ace low helper (bit 13 unused for counting)
    // Count 5-rank windows that contain all board ranks (how many straights the board allows)
    let windows = 0;
    for (let lo = -1; lo <= 8; lo++) {
      let ok = true;
      for (const r of uniq) {
        const rr = r === 12 && lo === -1 ? -1 : r;
        if (rr < lo || rr > lo + 4) { ok = false; break; }
      }
      if (ok && uniq.length >= 3) windows++;
    }
    const suitText = maxSuit === 3 ? "Monotone" : maxSuit === 2 ? "Two-tone" : "Rainbow";
    const highText = br[0] >= 10 ? "High" : br[0] >= 7 ? "Middling" : "Low";
    const conn = paired ? "Paired" : windows >= 3 ? "Very connected" : windows >= 1 ? "Connected" : "Disconnected";
    const wet = (maxSuit >= 2 ? 1 : 0) + (windows >= 1 ? 1 : 0) + (windows >= 3 ? 1 : 0) + (maxSuit === 3 ? 1 : 0);
    return { suitText, highText, conn, paired, maxSuit, windows, wetness: paired && maxSuit < 2 ? "Dry" : wet >= 2 ? "Wet" : wet === 1 ? "Semi-wet" : "Dry" };
  }

  const api = {
    RANKS, SUITS, SUIT_SYMBOL, CATEGORY, BUCKETS,
    card, rankOf, suitOf, cardName, parseCard, parseCards,
    evaluate, category, combosOf, handClass, rangeCombos, remainingDeck,
    equityHandVsHand, equityHandVsRange, equityRangeVsRange, equityByClass, equityByCombo, nextCardEquities,
    drawInfo, classifyFlop, rangeProfile, texture
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Engine = api;
})(typeof window !== "undefined" ? window : globalThis);
