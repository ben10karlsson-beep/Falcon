/* Run with: node tests/play.test.js
   Play mode (js/play-core.js): hand rules, pot sizes, all-ins and showdowns, and the bots' strategies. */
const fs = require("fs"), path = require("path"), vm = require("vm");
const ctx = {};
vm.createContext(ctx);
for (const f of ["engine", "ranges", "solved", "solved-combos", "play-core"])
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../js", f + ".js"), "utf8"), ctx, { filename: f + ".js" });
vm.runInContext("this.R_=({RFI,parse,combos,rangeSize})", ctx);
const P = ctx.PlayCore, E = ctx.Engine, { RFI, parse, rangeSize } = ctx.R_;

let pass = 0, fail = 0;
function check(name, cond, info) {
  if (cond) pass++; else { fail++; console.log("FAIL:", name, info !== undefined ? info : ""); }
}
/* A deck with these cards first (BTN's two, BB's two, then the board), the rest after */
function deck(str) {
  const top = E.parseCards(str);
  return [...top, ...E.remainingDeck(top)];
}
const opt = (st, type) => P.legal(st).find(o => o.type === type);
const play = (st, ...types) => { for (const t of types) { const o = opt(st, t); if (!o) throw new Error("no " + t + " at " + JSON.stringify(P.legal(st))); P.act(st, o); } return st; };
const chips = st => st.stacks[0] + st.stacks[1] + (st.done ? 0 : P.potTotal(st));

// Blinds and the single-raised pot the solver uses: 5.5bb in the pot, 97.5bb behind
{
  const st = P.newHand([1000, 1000], deck("AsKs QhQd 7c 4d 2s 9h 3c"));
  check("BB posts 1bb, 0.5bb dead from the small blind", st.put[1] === 10 && st.pot === 5 && P.potTotal(st) === 15);
  check("BTN opens or folds, no limp", P.legal(st).map(o => o.type).join() === "fold,raise" && opt(st, "raise").to === 25);
  play(st, "raise", "call");
  check("open + call: pot 5.5bb", st.pot === 55 && st.stacks[0] === 975 && st.stacks[1] === 975, st);
  check("the flop is dealt and BB acts first", st.street === 1 && st.board.length === 3 && st.toAct === 1 && st.potType === "srp");
  const bets = P.legal(st).filter(o => o.type === "bet").map(o => o.to);
  check("flop sizes 33% and 75% of 5.5bb", bets.join() === "18,41", bets);
  play(st, "check");
  play(st, "bet");
  const raise = opt(st, "raise");
  check("raise to 3x the bet", raise && raise.to === 54, raise);
  play(st, "call");
  check("turn after bet-call: pot 9.1bb", st.street === 2 && st.pot === 91 && st.board.length === 4);
  const turn = P.legal(st).map(o => o.type + o.to).join();
  check("turn sizes half pot, pot, all-in", turn === "check0,bet46,bet91,allin957", turn);
  play(st, "check", "check", "check", "check");
  check("river checked down: showdown, QQ wins", st.done && st.result.showdown && st.result.winner === 1 && st.stacks[1] === 957 + 91, st.stacks);
}

// Folds and what isn't called goes back
{
  const st = play(P.newHand([1000, 1000], deck("7c2d AsAh")), "fold");
  check("BTN folds: BB wins the dead 0.5bb", st.done && !st.result.showdown && st.stacks[1] === 1005 && st.stacks[0] === 1000);
  const st2 = play(P.newHand([1000, 1000], deck("AsKs 7c2d Jh 8d 3c 4c 5c")), "raise", "call", "check", "bet", "fold");
  check("c-bet, fold: BTN wins the 5.5bb pot and keeps its bet", st2.stacks[0] === 1030 && st2.stacks[1] === 975, st2.stacks);
  const st3 = play(P.newHand([1000, 1000], deck("AsKs 7c2d")), "raise", "fold");
  check("open, fold: BTN nets the blinds", st3.stacks[0] === 1015 && st3.stacks[1] === 990, st3.stacks);
}

// 3-bets, 4-bets and all-ins
{
  const st = play(P.newHand([1000, 1000], deck("AsKs QhQd")), "raise");
  check("BB vs open: fold, call, 3-bet to 11bb", P.legal(st).map(o => o.type + o.to).join() === "fold10,call25,raise110");
  play(st, "raise");
  check("BTN vs 3-bet: 4-bet to 25bb", opt(st, "raise").to === 250);
  play(st, "call");
  check("3-bet pot: 22.5bb in the pot, 89bb behind", st.pot === 225 && st.stacks[0] === 890 && st.potType === "3bp");
  const st2 = play(P.newHand([1000, 1000], deck("AsKs QhQd 7c 4d 2s 9h 3c")), "raise", "raise", "raise");
  check("BB vs 4-bet: fold, call, all-in", P.legal(st2).map(o => o.type).join() === "fold,call,allin");
  play(st2, "allin", "call");
  check("all-in and call: the board runs out to showdown", st2.done && st2.board.length === 5 && st2.result.showdown);
  check("all-in: chips add up", chips(st2) === 2005 && (st2.stacks[0] === 2005 || st2.stacks[1] === 2005), st2.stacks);
}

// Uneven stacks: the shorter one caps the bets, and the rest goes back
{
  const st = play(P.newHand([150, 1000], deck("AsAh KsKh 7c 4d 2s 9h 3c")), "raise", "raise");
  const four = P.legal(st);
  check("short BTN: the 4-bet is the all-in", four.some(o => o.type === "allin" && o.to === 150) && !four.some(o => o.type === "raise"), four);
  play(st, "allin", "call");
  check("short all-in: BB only puts in 15bb, AA wins 30.5bb", st.done && st.stacks[0] === 305 && st.stacks[1] === 850, st.stacks);
  const st2 = play(P.newHand([1000, 120], deck("AsAh KsKh 7c 4d 2s 9h 3c")), "raise", "raise", "raise");
  check("BB with 12bb facing a 4-bet: calling is the all-in", P.legal(st2).map(o => o.type + o.to).join() === "fold110,call120", P.legal(st2));
  play(st2, "call");
  check("uncalled part of the 4-bet goes back", st2.done && st2.stacks[0] + st2.stacks[1] === 1125 && st2.stacks[0] === 1125, st2.stacks);
}

// Split pot: the board plays; the odd tenth goes to BB
{
  const st = play(P.newHand([1000, 1000], deck("2c3d 2h3s As Ks Qd Jc Th")), "raise", "call", "check", "check", "check", "check", "check", "check");
  check("split pot", st.result.winner === -1 && st.stacks[0] === 975 + 27 && st.stacks[1] === 975 + 28, st.stacks);
}

// Ranges narrow by the chart: after an open, BTN's range is the opening chart
{
  const st = P.newHand([1000, 1000], deck("AsKs QhQd")), ranges = [P.fullRange(), P.fullRange()];
  const dec = P.decide(st, ranges, null), i = dec.opts.findIndex(o => o.type === "raise");
  P.narrow(ranges[0], dec, i, []);
  const open = parse(RFI.BTN.raise), w = hc => ranges[0].find(x => x.hc === hc).w;
  check("after the open, AA weighs 1, 72o 0", w("AA") === 1 && w("72o") === 0);
  const half = Object.keys(open).find(h => open[h] === 0.5);
  check("a hand the chart opens half the time weighs 0.5", Math.abs(w(half) - 0.5) < 1e-9, half);
  const size = ranges[0].reduce((t, x) => t + x.w, 0) / 1326;
  check("range size matches the chart", Math.abs(size - rangeSize(open)) < 1e-9, size);
}

// The bots' preflop play follows the charts
{
  let opens = 0, n = 4000;
  for (let k = 0; k < n; k++) {
    const d = E.remainingDeck([]);
    for (let i = d.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [d[i], d[j]] = [d[j], d[i]]; }
    const st = P.newHand([1000, 1000], d), dec = P.decide(st, [P.fullRange(), P.fullRange()], null);
    if (dec.opts[P.sample(dec.dist.get(P.comboKey(d[0], d[1])))].type === "raise") opens++;
  }
  const want = rangeSize(parse(RFI.BTN.raise));
  check("bot BTN opens at the chart's rate", Math.abs(opens / n - want) < 0.035, `${opens / n} vs ${want}`);
}

// Solved flops: an exact match up to suits gives the solver's own per-combo strategy
{
  const f = P.SOLVED_FLOPS[0], perm = [2, 0, 3, 1], board = f.cards.map(c => P.relabel(c, perm));
  const sv = P.solvedFor(board);
  check("relabelled solved flop matches exactly", sv.exact && sv.fi === 0);
  const raw = ctx.SolvedCombos[f.board], c = [E.parseCard(raw.slice(0, 2)), E.parseCard(raw.slice(2, 4))];
  const mix = P.solvedMix(sv, c.map(x => P.relabel(x, perm)));
  check("per-combo mix found through the suit relabelling", mix && Math.abs(mix.reduce((a, b) => a + b, 0) - 1) < 1e-9, mix);
  check("a flop that isn't solved borrows the closest", P.solvedFor(E.parseCards("Kd 8h 3s")).exact === false);
}

// BB vs a c-bet on a solved flop folds the solver's overall share of its range
{
  const f = P.SOLVED_FLOPS[1];
  const top = E.remainingDeck(f.cards).slice(0, 4);
  const st = P.newHand([1000, 1000], [...top, ...f.cards, ...E.remainingDeck([...top, ...f.cards])]);
  const ranges = [P.fullRange(), P.fullRange()];
  for (const t of ["raise", "call"]) { const d = P.decide(st, ranges, null), i = d.opts.findIndex(o => o.type === t); P.narrow(ranges[st.toAct], d, i, st.board); P.act(st, d.opts[i]); }
  const sv = P.solvedFor(st.board);
  let d = P.decide(st, ranges, sv);
  check("BB checks the flop, as in the solves", d.kind === "check" && d.opts[d.dist.values().next().value.indexOf(1)].type === "check");
  P.narrow(ranges[1], d, 0, st.board); P.act(st, d.opts[0]);
  d = P.decide(st, ranges, sv);
  check("BTN plays the solver's strategy", d.kind === "solver");
  const small = d.opts.findIndex(o => o.tags.includes("small"));
  P.narrow(ranges[0], d, small, st.board); P.act(st, d.opts[small]);
  d = P.decide(st, ranges, sv);
  const mine = P.live(ranges[1], st.board), total = mine.reduce((t, x) => t + x.w, 0);
  const fold = mine.reduce((t, x) => t + x.w * d.dist.get(x.k)[d.opts.findIndex(o => o.type === "fold")], 0) / total;
  check("BB folds the solver's share vs the small bet", d.kind === "split" && Math.abs(fold - f.vsSmall[0]) < 0.005, `${fold} vs ${f.vsSmall[0]}`);
}

// Equity shown to the player: exact on the river
{
  const board = E.parseCards("2c 7d 9h Js 3c"), range = P.fullRange().filter(x => x.hc === "KK" || x.hc === "QQ");
  check("AA vs KK and QQ on a dry river: 100%", P.equityVs(E.parseCards("As Ah"), range, board) === 1);
  const mixed = P.fullRange().filter(x => x.hc === "AA" || x.hc === "QQ");
  const eq = P.equityVs(E.parseCards("Ks Kh"), mixed, board);
  check("KK vs AA (6 combos) and QQ (6): 50%", Math.abs(eq - 0.5) < 1e-9, eq);
}

// What a bet would do: the bluff's break-even, folds against the bot's real strategy, and nothing changed by asking
{
  const st = play(P.newHand([1000, 1000], deck("AsAh 7d6d Ad 9c 2h 5s Kd")), "raise", "call", "check", "check", "check", "check", "check");
  const ranges = [P.fullRange(), P.fullRange()], sv = P.solvedFor(st.board.slice(0, 3));
  const dec = P.decide(st, ranges, sv), i = dec.opts.findIndex(o => o.type === "bet" && o.frac === 1);
  const before = JSON.stringify(st), w = ranges.map(r => r.reduce((t, x) => t + x.w, 0));
  const out = P.betOutcome(st, ranges, sv, dec, i, st.hole[0]);
  check("pot-size river bet: risks 5.5bb to win 5.5bb, a bluff needs 50%", out && out.risk === 55 && out.pot === 55 && out.need === 0.5, out);
  check("fold and raise shares are shares", out.fold >= 0 && out.fold <= 1 && out.raise >= 0 && out.fold + out.raise <= 1 + 1e-9, out);
  check("the bot defends at least the minimum defence frequency", 1 - out.fold >= 0.5 - 0.03, out.fold);
  check("top set vs the hands that continue: ahead", out.eq > 0.9, out.eq);
  check("asking changes neither the hand nor the ranges", JSON.stringify(st) === before && ranges.every((r, s) => r.reduce((t, x) => t + x.w, 0) === w[s]));
  const k = dec.opts.findIndex(o => o.type === "check");
  check("a check isn't a bet: no outcome", P.betOutcome(st, ranges, sv, dec, k, st.hole[0]) === null || dec.opts[k].to <= st.put[1]);
}

// Bot vs bot: every hand ends, chips are conserved, and each bot always has a strategy for its own cards
{
  let ok = true, info = "";
  for (let h = 0; h < 150 && ok; h++) {
    const d = E.remainingDeck([]);
    for (let i = d.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [d[i], d[j]] = [d[j], d[i]]; }
    const st = P.newHand([1000, 1000], d), ranges = [P.fullRange(), P.fullRange()];
    let sv = null, guard = 0;
    while (!st.done && guard++ < 40) {
      const dec = P.decide(st, ranges, sv), me = st.toAct, dist = dec.dist.get(P.comboKey(st.hole[me][0], st.hole[me][1]));
      if (!dist || !(dist.reduce((a, b) => a + b, 0) > 0.99)) { ok = false; info = dec.kind + " street " + st.street; break; }
      const i = P.sample(dist);
      P.narrow(ranges[me], dec, i, st.board); P.act(st, dec.opts[i]);
      if (st.board.length >= 3 && !sv) sv = P.solvedFor(st.board.slice(0, 3));
    }
    if (ok && (!st.done || chips(st) !== 2005)) { ok = false; info = "hand " + h + " " + st.stacks; }
  }
  check("150 bot hands: complete, chips conserved, a strategy for every own hand", ok, info);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
