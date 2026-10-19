/* 169 Poker play mode, the parts without a page: heads-up BTN vs BB hand rules (blinds, betting, all-ins, showdown),
   ranges that narrow with every action, and the bots' strategies. Also the solved-flop helpers shared with postflop.js.
   Amounts are tenths of a bb, as in solver/ (an open to 2.5bb is 25). The small blind has folded: its 0.5bb is dead money.
   Uses Engine and the range helpers of ranges.js (plain globals). Browser: window.PlayCore. Node: load engine.js, ranges.js,
   solved.js and solved-combos.js into one vm context, then this file (see tests/play.test.js). */
(function (root) {
  "use strict";
  const E = root.Engine;

  /* ---------- Solved flops (solved.js): BTN opens, BB calls. A flop matches a solved one if it is the same up to
     relabelling suits; any other flop borrows the closest solved flop by texture. ---------- */
  const SOLVED = root.Solved || null;
  const SUIT_PERMS = [];
  (function perms(a, rest) { if (!rest.length) SUIT_PERMS.push(a); rest.forEach((x, i) => perms(a.concat(x), rest.filter((_, j) => j !== i))); })([], [0, 1, 2, 3]);
  const relabel = (c, p) => E.card(E.rankOf(c), p[E.suitOf(c)]);
  const sortedKey = cards => cards.slice().sort((a, b) => b - a).join(",");
  function flopKey(cards) {
    let best = null;
    for (const p of SUIT_PERMS) {
      const k = sortedKey(cards.map(c => relabel(c, p)));
      if (best === null || k < best) best = k;
    }
    return best;
  }
  function flopFeatures(cards) {
    const t = E.texture(cards), r = cards.map(E.rankOf).sort((a, b) => b - a);
    return { r, paired: t.paired, maxSuit: t.maxSuit, windows: t.windows };
  }
  const SOLVED_FLOPS = SOLVED ? SOLVED.flops.map(f => {
    const cards = E.parseCards(f.board.match(/../g).join(" "));
    return { ...f, cards, key: flopKey(cards), feat: flopFeatures(cards) };
  }) : [];
  // Texture distance: pairing and suits matter most, then the high card, then the rest
  function flopDistance(a, b) {
    return (a.paired !== b.paired ? 6 : 0) + Math.abs(a.maxSuit - b.maxSuit) * 3 + Math.abs(a.windows - b.windows) * 0.5 +
      Math.abs(a.r[0] - b.r[0]) * 0.7 + Math.abs(a.r[1] - b.r[1]) * 0.35 + Math.abs(a.r[2] - b.r[2]) * 0.2;
  }
  /* { flop, fi, exact, perm }: perm relabels these cards' suits onto the solved flop's (exact matches only) */
  function solvedFor(cards) {
    const key = flopKey(cards), fi = SOLVED_FLOPS.findIndex(f => f.key === key);
    if (fi >= 0) {
      const target = sortedKey(SOLVED_FLOPS[fi].cards);
      const perm = SUIT_PERMS.find(p => sortedKey(cards.map(c => relabel(c, p))) === target);
      return { flop: SOLVED_FLOPS[fi], fi, exact: true, perm };
    }
    const feat = flopFeatures(cards);
    const flop = SOLVED_FLOPS.reduce((best, f) => flopDistance(feat, f.feat) < flopDistance(feat, best.feat) ? f : best);
    return { flop, fi: SOLVED_FLOPS.indexOf(flop), exact: false, perm: null };
  }
  /* BTN's per-combo strategy on a solved flop (solved-combos.js, loaded on first use): combo key → [check, bet 33%, bet 75%] */
  const ALPHA = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const comboKey = (a, b) => a < b ? a * 52 + b : b * 52 + a;
  const comboCache = {};
  function solvedCombos(fi) {
    if (comboCache[fi]) return comboCache[fi];
    const s = root.SolvedCombos[SOLVED_FLOPS[fi].board], m = new Map();
    for (let i = 0; i < s.length; i += 6) {
      const sm = ALPHA.indexOf(s[i + 4]) / 50, bg = ALPHA.indexOf(s[i + 5]) / 50;
      m.set(comboKey(E.parseCard(s.slice(i, i + 2)), E.parseCard(s.slice(i + 2, i + 4))), [Math.max(0, 1 - sm - bg), sm, bg]);
    }
    return (comboCache[fi] = m);
  }
  /* The solver's mix for one BTN combo on this flop, or null when the flop isn't an exact match or the combo isn't in its range */
  function solvedMix(sv, c) {
    if (!sv || !sv.exact || !root.SolvedCombos) return null;
    return solvedCombos(sv.fi).get(comboKey(relabel(c[0], sv.perm), relabel(c[1], sv.perm))) || null;
  }

  /* ---------- Hand rules ---------- */
  const BTN = 0, BB = 1;
  const OPEN = 25, THREE = threeBetSize("BB") * 10, FOUR = fourBetSize("BB") * 10; // 2.5bb open, 11bb 3-bet, 25bb 4-bet (ranges.js)
  const SIZES = [null, [0.33, 0.75], [0.5, 1], [0.5, 1]]; // flop: the solver's two sizes; turn and river: half pot and pot

  /* deck: shuffled cards. BTN gets deck[0..1], BB deck[2..3], the board comes from deck[4..8] in order */
  function newHand(stacks, deck) {
    const st = { stacks: stacks.slice(), put: [0, 0], pot: 5, deck: deck.slice(), hole: [deck.slice(0, 2), deck.slice(2, 4)], board: [],
      street: 0, toAct: BTN, acted: [false, false], raises: 0, streetBets: 0, potType: null, done: false, result: null, history: [] };
    const bb = Math.min(10, st.stacks[BB]);
    st.stacks[BB] -= bb; st.put[BB] = bb;
    return st;
  }
  const potTotal = st => st.pot + st.put[0] + st.put[1];

  /* The options for the player to act: { type: fold|check|call|bet|raise|allin, to: their total put this street, tags }.
     Tags name the strategy actions an option stands for; when a bet would cost the whole stack it becomes the all-in
     and keeps both tags. Preflop follows the chart sizes; BTN opens or folds (the chart never limps). */
  function legal(st) {
    if (st.done) return [];
    const me = st.toAct, op = 1 - me, max = st.put[me] + st.stacks[me], out = [];
    const add = (type, to, tag, frac) => {
      if (type !== "fold" && type !== "check" && to >= max) { to = max; if (type !== "call") type = "allin"; }
      const same = out.find(o => o.to === to && o.type !== "fold");
      if (same) { same.tags.push(tag); return; }
      out.push({ type, to, tags: [tag], frac });
    };
    const facing = st.put[op] > st.put[me];
    if (st.street === 0) {
      if (st.raises === 0) { add("fold", st.put[me], "fold"); add("raise", OPEN, "raise"); return out; }
      add("fold", st.put[me], "fold"); add("call", Math.min(st.put[op], max), "call");
      if (st.stacks[op] > 0 && max > st.put[op]) {
        if (st.raises === 1) add("raise", THREE, "raise");
        else if (st.raises === 2) add("raise", FOUR, "raise");
        else if (st.raises === 3) add("allin", max, "raise");
      }
      return out;
    }
    if (!facing) {
      const pot = potTotal(st), [s, b] = SIZES[st.street];
      add("check", st.put[me], "check");
      add("bet", Math.round(pot * s), "small", s);
      add("bet", Math.round(pot * b), "big", b);
      if (st.street > 1) add("allin", max, "allin");
      return out;
    }
    add("fold", st.put[me], "fold"); add("call", Math.min(st.put[op], max), "call");
    if (st.stacks[op] > 0 && max > st.put[op]) add(st.streetBets === 1 ? "raise" : "allin", st.streetBets === 1 ? 3 * st.put[op] : max, "raise");
    return out;
  }

  function act(st, opt) {
    const me = st.toAct, op = 1 - me;
    st.history.push({ street: st.street, seat: me, type: opt.type, to: opt.to, paid: opt.type === "fold" ? 0 : opt.to - st.put[me], tags: opt.tags.slice() });
    if (opt.type === "fold") return finish(st, op);
    st.stacks[me] -= opt.to - st.put[me];
    st.put[me] = opt.to;
    if (opt.to > st.put[op]) { // a bet or a raise reopens the action
      if (st.street === 0) st.raises++; else st.streetBets++;
      st.acted = [false, false];
    }
    st.acted[me] = true;
    const settled = s => st.acted[s] || st.stacks[s] === 0, lo = st.put[0] <= st.put[1] ? 0 : 1;
    if (settled(0) && settled(1) && (st.put[0] === st.put[1] || st.stacks[lo] === 0)) closeStreet(st);
    else st.toAct = op;
    return st;
  }
  function dealStreet(st) {
    const n = st.street === 1 ? 3 : 1, from = 4 + st.board.length;
    st.board.push(...st.deck.slice(from, from + n));
  }
  function closeStreet(st) {
    // Whatever wasn't called goes back
    const hi = st.put[0] >= st.put[1] ? 0 : 1, extra = st.put[hi] - st.put[1 - hi];
    st.stacks[hi] += extra; st.put[hi] -= extra;
    st.pot += st.put[0] + st.put[1]; st.put = [0, 0];
    if (st.street === 0) st.potType = st.raises === 1 ? "srp" : st.raises === 2 ? "3bp" : "4bp";
    if (st.street === 3) return showdown(st);
    st.street++; dealStreet(st);
    st.acted = [false, false]; st.streetBets = 0; st.toAct = BB; // BB is first to act after the flop
    if (st.stacks[0] === 0 || st.stacks[1] === 0) {
      while (st.street < 3) { st.street++; dealStreet(st); }
      return showdown(st);
    }
    return st;
  }
  /* When the hand ends, pot keeps its final size for display; the chips are already in the stacks */
  function finish(st, winner) {
    st.pot = potTotal(st);
    st.stacks[winner] += st.pot;
    st.put = [0, 0]; st.done = true;
    st.result = { winner, showdown: false };
    return st;
  }
  function showdown(st) {
    const v = st.hole.map(h => E.evaluate(h.concat(st.board)));
    const winner = v[0] > v[1] ? 0 : v[1] > v[0] ? 1 : -1;
    if (winner >= 0) st.stacks[winner] += st.pot;
    else { const half = Math.floor(st.pot / 2); st.stacks[BTN] += half; st.stacks[BB] += st.pot - half; } // an odd tenth goes to BB
    st.done = true;
    st.result = { winner, showdown: true, values: v };
    return st;
  }

  /* ---------- Ranges: every combo with a weight, narrowed by each action ---------- */
  const ALL_COMBOS = [];
  for (let a = 0; a < 52; a++) for (let b = a + 1; b < 52; b++) ALL_COMBOS.push([b, a]);
  const fullRange = () => ALL_COMBOS.map(c => ({ c, k: comboKey(c[0], c[1]), hc: E.handClass(c[0], c[1]), w: 1 }));
  const live = (range, board) => range.filter(x => x.w > 1e-9 && !board.includes(x.c[0]) && !board.includes(x.c[1]));
  const clash = (a, b) => a[0] === b[0] || a[0] === b[1] || a[1] === b[0] || a[1] === b[1];
  /* Weighted picker over a combo list */
  function picker(list) {
    const cum = new Float64Array(list.length);
    let t = 0;
    list.forEach((x, i) => { t += x.w; cum[i] = t; });
    return () => {
      const r = Math.random() * t;
      let lo = 0, hi = cum.length - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m; }
      return lo;
    };
  }
  function randomRuns(board, n) {
    const deck = E.remainingDeck(board), need = 5 - board.length, runs = [];
    if (need === 1) return deck.map(c => [c]);
    for (let i = 0; i < n; i++) {
      const a = deck[(Math.random() * deck.length) | 0];
      let b;
      do b = deck[(Math.random() * deck.length) | 0]; while (b === a);
      runs.push([a, b]);
    }
    return runs;
  }
  /* Equity of every combo in A against the weighted range B. Exact on the river; on the turn every river with sampled
     opponents; on the flop a fixed sample of turn and river cards. Used by the bots, so a little noise is fine. */
  function strengths(A, B, board, samples) {
    const out = new Float64Array(A.length).fill(0.5);
    if (!A.length || !B.length) return out;
    if (board.length === 5) {
      const va = A.map(x => E.evaluate(x.c.concat(board))), vb = B.map(x => E.evaluate(x.c.concat(board)));
      for (let i = 0; i < A.length; i++) {
        let win = 0, tot = 0;
        for (let j = 0; j < B.length; j++) {
          if (clash(A[i].c, B[j].c)) continue;
          tot += B[j].w;
          if (va[i] > vb[j]) win += B[j].w; else if (va[i] === vb[j]) win += B[j].w / 2;
        }
        if (tot) out[i] = win / tot;
      }
      return out;
    }
    const runs = randomRuns(board, 60), n = samples || 150;
    const val = (list, run) => { const bd = board.concat(run); return list.map(x => x.c.includes(run[0]) || x.c.includes(run[1]) ? -1 : E.evaluate(x.c.concat(bd))); };
    const vA = runs.map(r => val(A, r)), vB = runs.map(r => val(B, r)), pick = picker(B);
    for (let i = 0; i < A.length; i++) {
      let win = 0, cnt = 0;
      for (let t = 0; cnt < n && t < n * 6; t++) {
        const r = (Math.random() * runs.length) | 0, a = vA[r][i];
        if (a < 0) continue;
        const j = pick(), b = vB[r][j];
        if (b < 0 || clash(A[i].c, B[j].c)) continue;
        cnt++;
        if (a > b) win++; else if (a === b) win += 0.5;
      }
      if (cnt) out[i] = win / cnt;
    }
    return out;
  }
  /* One hand's equity against a weighted range, for the numbers shown to the player: exact on the turn and river */
  function equityVs(hole, B, board) {
    const opp = B.filter(x => !clash(x.c, hole));
    if (!opp.length) return null;
    if (board.length >= 4) {
      const runs = board.length === 5 ? [[]] : E.remainingDeck([...board, ...hole]).map(c => [c]);
      let win = 0, tot = 0;
      for (const run of runs) {
        const bd = board.concat(run), h = E.evaluate(hole.concat(bd));
        for (const x of opp) {
          if (run.length && x.c.includes(run[0])) continue;
          const v = E.evaluate(x.c.concat(bd));
          tot += x.w;
          if (h > v) win += x.w; else if (h === v) win += x.w / 2;
        }
      }
      return win / tot;
    }
    const pick = picker(opp), deck = E.remainingDeck([...board, ...hole]);
    let win = 0, cnt = 0;
    for (let t = 0; cnt < 6000 && t < 30000; t++) { // the flop: sampled opponents and turn and river cards
      const x = opp[pick()].c, a = deck[(Math.random() * deck.length) | 0], b = deck[(Math.random() * deck.length) | 0];
      if (a === b || x.includes(a) || x.includes(b)) continue;
      const bd = board.concat([a, b]), h = E.evaluate(hole.concat(bd)), v = E.evaluate(x.concat(bd));
      cnt++;
      if (h > v) win++; else if (h === v) win += 0.5;
    }
    return cnt ? win / cnt : null;
  }

  /* ---------- The bots ----------
     Preflop: the charts (BTN open, BB vs BTN, BTN vs a BB 3-bet), then a simple rule for 4-bets and all-ins.
     Flop of a single-raised pot: BB checks (as in the solves); BTN plays the solver's strategy (exact per combo on a solved
     flop, by hand type from the closest solved flop otherwise); BB facing that first bet folds, calls and raises the
     solver's overall shares, choosing hands by equity. Everything else: a rule built on equity against the other range. */
  const RFI_BTN = getRange({ mode: "rfi", seat: "BTN" });
  const VS_BB = getRange({ mode: "vs", vs: VS.findIndex(v => v.id === "BB vs BTN") });
  const V3_BTN = getRange({ mode: "v3", v3: V3.findIndex(v => v.id === "BTN vs BB 3-bet") });
  const JAM_VS_4BET = parse("KK+, AKs"), CALL_4BET = parse("QQ, JJ, AKo, AQs"), CALL_JAM = parse("QQ+, AK");
  const FALLBACK = { raise: ["allin", "call"], allin: ["raise", "big", "call"], small: ["big", "allin", "check"], big: ["small", "allin", "check"], call: ["check"], check: ["call"], fold: ["check"] };

  /* Chart frequencies for the player to act preflop, as tag → share, or null where no chart covers the spot.
     unopened: facing a 3-bet with a hand the BTN chart never opens (the 3-bet chart is conditional on opening) */
  function chartMix(st, hc) {
    if (st.street !== 0 || st.raises > 2) return null;
    if (st.raises === 0) { const f = freqs(RFI_BTN, hc); return { fold: f.fold, raise: f.raise }; }
    if (st.raises === 1) { const f = freqs(VS_BB, hc); return { fold: f.fold, call: f.call, raise: f.raise }; }
    const f = freqs(V3_BTN, hc);
    return { fold: f.fold, call: f.call, raise: f.raise, unopened: !V3_BTN.open[hc] };
  }
  function ruleMix(s, draw, c) {
    if (!c.facing) {
      let bet = 0, big = 0;
      if (s >= 0.8) { bet = 0.85; big = 0.7; }
      else if (s >= 0.65) { bet = 0.6; big = 0.25; }
      else if (draw) { bet = 0.45; big = 0.3; }
      else if (c.river && s < 0.25) { bet = 0.35; big = 1; } // river bluffs come from the weakest hands
      if (c.oop) bet *= 0.6;
      return { check: 1 - bet, small: bet * (1 - big), big: bet * big };
    }
    const call = Math.min(1, Math.max(0, (s - c.need + 0.05 + (draw ? 0.06 : 0)) / 0.1));
    let raise = 0;
    if (c.canRaise) raise = s >= 0.85 ? 0.6 : draw && s >= c.need ? 0.15 : 0;
    raise = Math.min(raise, call);
    return { fold: 1 - call, call: call - raise, raise };
  }

  /* What the player to act does with every combo of its range: { opts, kind, dist: Map(combo key → share per option) }.
     kind: chart, rule, solver (BTN's c-bet), split (BB vs that c-bet), check (BB's flop check in the solves) */
  function decide(st, ranges, sv) {
    const seat = st.toAct, opts = legal(st), board = st.board, mine = live(ranges[seat], board);
    const optFor = tag => {
      let i = opts.findIndex(o => o.tags.includes(tag));
      for (const alt of FALLBACK[tag] || []) { if (i >= 0) break; i = opts.findIndex(o => o.tags.includes(alt)); }
      return i;
    };
    const dist = new Map(), set = (k, mix) => {
      const arr = new Float64Array(opts.length);
      for (const t in mix) { if (t === "unopened" || !(mix[t] > 0)) continue; const i = optFor(t); if (i >= 0) arr[i] += mix[t]; }
      dist.set(k, arr);
    };
    let kind = "rule";
    const last = st.history[st.history.length - 1], facing = st.put[1 - seat] > st.put[seat];
    const srpFlop = st.street === 1 && st.potType === "srp" && sv;
    if (st.street === 0) {
      const byClass = {};
      for (const x of mine) {
        let m = byClass[x.hc];
        if (!m) {
          m = chartMix(st, x.hc);
          if (!m) { // 4-bets and all-ins: a simple rule
            if (st.raises === 3) m = JAM_VS_4BET[x.hc] ? { raise: 1 } : CALL_4BET[x.hc] ? { call: 1 } : { fold: 1 };
            else m = CALL_JAM[x.hc] ? { call: 1 } : { fold: 1 };
          }
          byClass[x.hc] = m;
        }
        set(x.k, m);
      }
      return { opts, dist, kind: st.raises <= 2 ? "chart" : "rule" };
    }
    if (srpFlop && seat === BB && !facing) {
      mine.forEach(x => set(x.k, { check: 1 }));
      return { opts, dist, kind: "check" };
    }
    if (srpFlop && seat === BTN && !facing) {
      const f = sv.flop;
      for (const x of mine) {
        let m = solvedMix(sv, x.c);
        if (!m) { const row = f.byHand[E.classifyFlop(x.c, board)]; m = row[0] >= 0.005 ? row.slice(1) : f.btn; }
        set(x.k, { check: m[0], small: m[1], big: m[2] });
      }
      return { opts, dist, kind: "solver" };
    }
    const theirs = live(ranges[1 - seat], board), s = strengths(mine, theirs, board);
    const firstBet = srpFlop && seat === BB && facing && st.streetBets === 1 && last && last.seat === BTN;
    if (firstBet && (last.tags.includes("small") || last.tags.includes("big"))) {
      // BB vs BTN's c-bet: fold the weakest hands and raise the strongest, in the solver's overall shares
      const [fold, , raise] = last.tags.includes("small") ? sv.flop.vsSmall : sv.flop.vsBig;
      const order = mine.map((x, i) => i).sort((a, b) => s[b] - s[a]);
      const total = mine.reduce((t, x) => t + x.w, 0);
      let at = 0;
      for (const i of order) {
        const w = mine[i].w, lo = at / total, hi = (at + w) / total, span = hi - lo || 1;
        const r = Math.max(0, Math.min(hi, raise) - lo) / span, f = Math.max(0, hi - Math.max(lo, 1 - fold)) / span;
        set(mine[i].k, { raise: r, fold: f, call: Math.max(0, 1 - r - f) });
        at += w;
      }
      return { opts, dist, kind: "split" };
    }
    const owed = st.put[1 - seat] - st.put[seat], pot = potTotal(st);
    const c = { facing, need: owed / (pot + owed), canRaise: opts.some(o => o.type === "raise" || o.type === "allin"), oop: seat === BB, river: st.street === 3 };
    // Facing a bet, the best hands keep going regardless, so bluffing every street doesn't simply work: the bot
    // continues with at least the minimum defence frequency (1 − the bet's share of the pot it makes), so a pure bluff at best breaks even
    const keep = new Float64Array(mine.length);
    if (facing) {
      const floor = 1 - owed / pot, total = mine.reduce((t, x) => t + x.w, 0);
      let at = 0;
      for (const i of mine.map((x, i) => i).sort((a, b) => s[b] - s[a])) {
        const lo = at / total, hi = (at + mine[i].w) / total;
        keep[i] = Math.max(0, Math.min(hi, floor) - lo) / (hi - lo || 1);
        at += mine[i].w;
      }
    }
    mine.forEach((x, i) => {
      const d = st.street < 3 && E.classifyFlop(x.c, board) === 3, m = ruleMix(s[i], d, c);
      if (facing && m.fold > 1 - keep[i]) { m.call += m.fold - (1 - keep[i]); m.fold = 1 - keep[i]; }
      set(x.k, m);
    });
    return { opts, dist, kind };
  }
  /* After an action: each combo keeps the share of its weight that takes this action. An action the strategy never takes
     tells the other player nothing, so the range stays as it was (returns false). */
  function narrow(range, dec, i, board) {
    let kept = 0;
    for (const x of live(range, board)) { const d = dec.dist.get(x.k); kept += x.w * (d ? d[i] : 0); }
    if (kept <= 1e-9) return false;
    for (const x of range) { const d = dec.dist.get(x.k); x.w = d ? x.w * d[i] : 0; }
    return true;
  }
  /* What a bet or raise (option i of dec, the decision of the player to act) would do against the other player's strategy:
     fold: the share of their range that folds to it, without the combos the hole cards block; need: the share a pure
     bluff needs, risk ÷ (risk + pot); raise: the share that raises back; eq: the hole cards' equity against the hands that
     continue. The acting range is first narrowed by the action, as it would be in the hand. Null if they can't answer. */
  function betOutcome(st, ranges, sv, dec, i, hole) {
    const me = st.toAct, op = 1 - me, opt = dec.opts[i], risk = opt.to - st.put[me], pot = potTotal(st);
    const next = act(JSON.parse(JSON.stringify(st)), opt);
    if (next.done || next.toAct !== op) return null;
    const r2 = [null, null];
    r2[me] = ranges[me].map(x => ({ ...x })); r2[op] = ranges[op];
    narrow(r2[me], dec, i, st.board);
    const d2 = decide(next, r2, sv), fi = d2.opts.findIndex(o => o.type === "fold"), ri = d2.opts.findIndex(o => o.to > next.put[me]);
    let fold = 0, raise = 0, tot = 0;
    const cont = [];
    for (const x of live(ranges[op], next.board)) {
      const d = d2.dist.get(x.k);
      if (!d || clash(x.c, hole)) continue;
      const sum = d.reduce((t, v) => t + v, 0) || 1, f = fi >= 0 ? d[fi] / sum : 0;
      tot += x.w; fold += x.w * f; if (ri >= 0) raise += x.w * d[ri] / sum;
      if (f < 1) cont.push({ ...x, w: x.w * (1 - f) });
    }
    if (!tot) return null;
    return { risk, pot, need: risk / (risk + pot), fold: fold / tot, raise: raise / tot, eq: cont.length ? equityVs(hole, cont, next.board) : null };
  }
  function sample(arr) {
    let r = Math.random() * arr.reduce((t, x) => t + x, 0);
    for (let i = 0; i < arr.length; i++) { r -= arr[i]; if (r <= 0 && arr[i] > 0) return i; }
    return arr.findIndex(x => x > 0);
  }
  /* A range as hand class → share of that class's combos, for drawing it on the grid */
  function classShares(range, board) {
    const out = {};
    for (const x of live(range, board)) out[x.hc] = (out[x.hc] || 0) + x.w;
    for (const hc in out) out[hc] /= E.combosOf(hc).length;
    return out;
  }

  const api = {
    SUIT_PERMS, SOLVED_FLOPS, flopKey, flopFeatures, flopDistance, solvedFor, solvedMix, comboKey, relabel,
    BTN, BB, SIZES, newHand, legal, act, potTotal,
    fullRange, live, strengths, equityVs, chartMix, decide, narrow, betOutcome, sample, classShares
  };
  if (typeof module === "object" && module.exports) module.exports = api; else root.PlayCore = api;
})(this);
