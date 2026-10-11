/* Run with: node tests/ranges.test.js
   Audits the preflop range data against the rules in CLAUDE.md. */
const fs = require("fs"), path = require("path"), vm = require("vm");
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/ranges.js"), "utf8") +
  ";Object.assign(this,{R,RFI,VS,parse,getRange,freqs,ALL_HANDS,rangeSize,rangeOverlap,handGroup});", ctx);
const { R, RFI, VS, parse, getRange, freqs, ALL_HANDS, rangeSize, rangeOverlap, handGroup } = ctx;

let pass = 0, fail = 0;
function check(name, cond, info) {
  if (cond) pass++; else { fail++; console.log("FAIL:", name, info !== undefined ? info : ""); }
}
const pctOf = x => (x * 100).toFixed(1) + "%";

// Range-string parser
{
  const m = parse("55+, A2s+, KTs-K8s, AJo:0.5");
  check("55+ covers 55 to AA", m["55"] === 1 && m["AA"] === 1 && m["44"] === undefined);
  check("A2s+ covers A2s to AKs", m["A2s"] === 1 && m["AKs"] === 1 && m["AKo"] === undefined);
  check("KTs-K8s range", m["KTs"] === 1 && m["K9s"] === 1 && m["K8s"] === 1 && m["K7s"] === undefined && m["KJs"] === undefined);
  check("frequency suffix", m["AJo"] === 0.5);
  const n = parse("AK");
  check("no suffix means suited and offsuit", n["AKs"] === 1 && n["AKo"] === 1);
}

// Every range string parses to real hands with frequencies in 0..1
const allRanges = [
  ...Object.entries(RFI).map(([s, r]) => [`${s} open`, r.raise]),
  ...VS.flatMap(v => [[`${v.id} 3-bet`, v.raise], [`${v.id} call`, v.call]])
];
for (const [name, str] of allRanges) {
  const m = parse(str), bad = Object.keys(m).filter(h => !ALL_HANDS.includes(h) || !(m[h] >= 0 && m[h] <= 1));
  check(`${name} parses cleanly`, bad.length === 0, bad.join(" "));
}

// Opening sizes near published benchmarks (CLAUDE.md), within 2 points
const OPEN = { UTG: 0.17, HJ: 0.21, CO: 0.29, BTN: 0.45, SB: 0.41 };
for (const [seat, target] of Object.entries(OPEN)) {
  const size = rangeSize(parse(RFI[seat].raise));
  check(`${seat} opens about ${pctOf(target)}`, Math.abs(size - target) <= 0.02, pctOf(size));
}

// BB defends about 52% vs a BTN open (3-bets + calls), within 3 points
{
  const i = VS.findIndex(v => v.id === "BB vs BTN"), rng = getRange({ mode: "vs", vs: i });
  let c = 0;
  for (const h of ALL_HANDS) { const f = freqs(rng, h); c += (f.raise + f.call) * (h.length === 2 ? 6 : h[2] === "s" ? 4 : 12); }
  check("BB defends about 52% vs BTN", Math.abs(c / 1326 - 0.52) <= 0.03, pctOf(c / 1326));
}

// Later seats open everything earlier seats open, at least as often
const RFI_MAP = Object.fromEntries(Object.keys(RFI).map(s => [s, parse(RFI[s].raise)]));
const f = (seat, h) => RFI_MAP[seat][h] || 0;
for (const [early, late] of [["UTG", "HJ"], ["HJ", "CO"], ["CO", "BTN"], ["CO", "SB"]]) {
  const missing = ALL_HANDS.filter(h => f(late, h) < f(early, h));
  check(`${late} opens everything ${early} opens`, missing.length === 0, missing.join(" "));
}

// Monotonic order: a better kicker or bigger pair is never opened less often.
// Exception: A5 may beat A6–A9 (wheel straights and a blocker), as solvers often prefer it.
for (const seat of Object.keys(RFI)) {
  const bad = [];
  for (let a = 0; a < 13; a++) for (const t of ["s", "o"]) for (let b = a + 2; b < 13; b++) {
    const better = R[a] + R[b - 1] + t, worse = R[a] + R[b] + t;
    if (f(seat, worse) > f(seat, better) && !(R[a] === "A" && R[b] === "5")) bad.push(`${worse}>${better}`);
  }
  for (let a = 1; a < 13; a++) if (f(seat, R[a] + R[a]) > f(seat, R[a - 1] + R[a - 1])) bad.push(`${R[a]}${R[a]}>${R[a - 1]}${R[a - 1]}`);
  check(`${seat} kickers and pairs in order`, bad.length === 0, bad.join(" "));
}

// Range reading: overlap score in combos, half credit on mixed hands
{
  const utg = parse(RFI.UTG.raise);
  check("identical range scores 1", rangeOverlap(utg, utg).score === 1);
  check("empty guess scores 0", rangeOverlap({}, utg).score === 0);
  const half = Object.fromEntries(ALL_HANDS.map(h => [h, 0.5])), all = Object.fromEntries(ALL_HANDS.map(h => [h, 1]));
  check("painting every half-played hand scores 0.5", Math.abs(rangeOverlap(all, half).score - 0.5) < 1e-9);
  const o = rangeOverlap(parse("QQ+"), parse("TT+"));
  check("QQ+ vs TT+ is 18 of 30 combos", o.hit === 18 && o.missed === 12 && o.extra === 0 && Math.abs(o.score - 0.6) < 1e-9, o);
  check("extra combos count against you", rangeOverlap(parse("TT+, AKo"), parse("TT+")).score === 30 / 42);
  const groups = { "77": "Pairs", "A5s": "Suited aces", "KJs": "Suited broadways", "76s": "Suited connectors and gappers",
    "K6s": "Other suited", "Q9s": "Other suited", "J9s": "Suited connectors and gappers", "A9o": "Offsuit aces", "KQo": "Offsuit broadways", "T8o": "Other offsuit" };
  for (const h in groups) check("handGroup " + h, handGroup(h) === groups[h], handGroup(h));
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
