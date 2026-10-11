/* Run with: node tests/engine.test.js */
const E = require("../js/engine.js");
let pass = 0, fail = 0;
function check(name, cond, info) {
  if (cond) pass++; else { fail++; console.log("FAIL:", name, info !== undefined ? info : ""); }
}
const ev = s => E.evaluate(E.parseCards(s));
const cat = s => E.CATEGORY[E.category(ev(s))];

// Categories
check("high card", cat("As Kd 9c 7h 3s") === "High card");
check("pair", cat("As Ad 9c 7h 3s") === "Pair");
check("two pair", cat("As Ad 9c 9h 3s") === "Two pair");
check("trips", cat("As Ad Ac 7h 3s") === "Three of a kind");
check("wheel straight", cat("As 2d 3c 4h 5s") === "Straight");
check("broadway straight", cat("As Kd Qc Jh Ts") === "Straight");
check("flush", cat("As Ks 9s 7s 3s") === "Flush");
check("full house", cat("As Ad Ac 7h 7s") === "Full house");
check("quads", cat("As Ad Ac Ah 7s") === "Four of a kind");
check("straight flush", cat("9h Th Jh Qh Kh") === "Straight flush");
check("steel wheel", cat("Ah 2h 3h 4h 5h") === "Straight flush");

// Ordering
check("wheel < six-high straight", ev("As 2d 3c 4h 5s") < ev("2d 3c 4h 5s 6h"));
check("flush > straight", ev("As Ks 9s 7s 3s") > ev("As Kd Qc Jh Ts"));
check("kicker matters", ev("As Ad Kc 7h 3s") > ev("Ah Ac Qc 7d 3h"));
check("split board", ev("Ks Qd Jc Th 9s 2c 3d") === ev("Ks Qd Jc Th 9s 4c 5d"));
check("two pair best kicker from third pair", ev("Ks Kd Qc Qh 2s 2c Ad") > ev("Ks Kd Qc Qh 2s 2c Jd"));
check("two trips → full house uses higher trips", cat("Ks Kd Kc Qh Qs Qc 2d") === "Full house" && ev("Ks Kd Kc Qh Qs Qc 2d") > ev("Qh Qs Qc Ks Kd 2c 2d"));
check("7-card flush picks best 5", ev("As Ks 9s 7s 3s 2s Qd") === ev("As Ks 9s 7s 3s"));
check("straight flush beats quads", ev("5h 6h 7h 8h 9h") > ev("As Ad Ac Ah Ks"));
check("ace-high straight over wheel in 7 cards", E.category(ev("As 2d 3c 4h 5s Kd Qd")) === 4);

// Combos
check("pair combos", E.combosOf("AA").length === 6);
check("suited combos", E.combosOf("AKs").length === 4);
check("offsuit combos", E.combosOf("AKo").length === 12);
check("handClass", E.handClass(E.parseCard("Kh"), E.parseCard("As")) === "AKo" && E.handClass(E.parseCard("7d"), E.parseCard("8d")) === "87s");

// Exact equity: 9 hearts left, 2h and 3h fill villain up → 7 clean outs = 7/44
{
  const r = E.equityHandVsHand(E.parseCards("Ah Kh"), E.parseCards("Qs Qd"), E.parseCards("Qh 7h 2c 3s"));
  check("turn flush draw vs set = 7/44", Math.abs(r.equity - 7 / 44) < 1e-9, r.equity);
}
// River: exact result
{
  const r = E.equityHandVsHand(E.parseCards("Ah Kh"), E.parseCards("Qs Qd"), E.parseCards("Qh 7h 2c 3s 9h"));
  check("river made flush wins", r.equity === 1, r.equity);
}
// Preflop Monte Carlo vs known values (±1.2%)
const mc = (a, b, expected) => {
  const r = E.equityHandVsHand(E.parseCards(a), E.parseCards(b), [], 60000);
  check(`${a} vs ${b} ≈ ${expected}`, Math.abs(r.equity - expected) < 0.012, r.equity.toFixed(4));
};
mc("As Ad", "Ks Kd", 0.819);
mc("Ah Kh", "Qs Qd", 0.462);
mc("2s 2d", "Ah Kc", 0.524);
mc("As Kc", "Ad Qh", 0.735);

// Flop: equities sum to 1 and flop symmetry
{
  const h = E.parseCards("Jh Th"), v = E.parseCards("As Ac"), b = E.parseCards("9h 8c 2h");
  const a = E.equityHandVsHand(h, v, b), c = E.equityHandVsHand(v, h, b);
  check("flop symmetric", Math.abs(a.equity + c.equity - 1) < 1e-9);
  check("big combo draw is a favourite vs AA", a.equity > 0.5, a.equity);
}
// Hand vs range: AA vs a range of only KK equals AA vs KK
{
  const r = E.equityHandVsRange(E.parseCards("As Ad"), { KK: 1 }, E.parseCards("2c 7d 9h Js"));
  check("hand vs single-class range on turn", r.equity > 0.95 && r.equity < 1, r.equity);
}
// Classification
{
  const b = E.parseCards("Kd 7s 2c");
  check("set is strong", E.classifyFlop(E.parseCards("7h 7c"), b) === 0);
  check("top pair", E.classifyFlop(E.parseCards("Ks Qs"), b) === 1);
  check("overpair", E.classifyFlop(E.parseCards("As Ah"), b) === 1);
  check("weaker pair", E.classifyFlop(E.parseCards("8s 8h"), b) === 2);
  check("nothing", E.classifyFlop(E.parseCards("Qh Jh"), b) === 4);
  check("flush draw", E.classifyFlop(E.parseCards("Ah 5h"), E.parseCards("Kh 7h 2c")) === 3);
  check("oesd", E.classifyFlop(E.parseCards("9s 8s"), E.parseCards("Td 7c 2h")) === 3);
}
// Texture
{
  const t = E.texture(E.parseCards("Kd 7s 2c"));
  check("K72r rainbow dry", t.suitText === "Rainbow" && t.wetness === "Dry" && t.highText === "High", JSON.stringify(t));
  const w = E.texture(E.parseCards("Jh Th 9c"));
  check("JT9 two-tone wet", w.suitText === "Two-tone" && w.wetness === "Wet", JSON.stringify(w));
}
// Equity by class (hand vs range, weighted average of rows)
{
  const aq = E.parseCards("As Qh");
  const q = E.equityByClass(aq, { QQ: 1 });
  check("AQo blocks half of QQ", q.combos === 3 && q.blocked === 3, JSON.stringify(q));
  const r = E.equityByClass(E.parseCards("As Ah"), { KK: 1 }, [], 4000);
  check("AA vs KK row ~82%", Math.abs(r.rows[0].equity - 0.82) < 0.02, r.rows[0].equity);
  const m = { QQ: 1, KK: 1, AA: 1, AKs: 1, AKo: 1, JJ: 0.5 };
  const byClass = E.equityByClass(aq, m, [], 3000), direct = E.equityHandVsRange(aq, m, [], 60000);
  check("weighted rows match hand vs range", Math.abs(byClass.equity - direct.equity) < 0.02, byClass.equity + " vs " + direct.equity);
  check("frequency halves combos", byClass.rows.find(x => x.hc === "JJ").combos === 3);
  check("empty range → null", E.equityByClass(aq, {}) === null);
  check("fully blocked range → null", E.equityByClass(E.parseCards("As Ah"), { AA: 0 }) === null && E.equityByClass(E.parseCards("Ks Kh"), { KK: 1 }) !== null);
  const flop = E.equityByClass(aq, { KK: 1 }, E.parseCards("Qd 7c 2s"), 2000);
  check("works with a board (top pair vs overpair)", flop.equity > 0.12 && flop.equity < 0.3, flop.equity);
}

// equityByCombo: exact equity vs each combo of a range on a flop/turn, grouped by bucket
{
  const aq = E.parseCards("Ah Qd"), qflop = E.parseCards("Qs 7c 2h");
  const one = E.equityByCombo(aq, { KK: 1 }, qflop);
  const exact = E.equityHandVsHand(aq, E.parseCards("Ks Kc"), qflop);
  check("one combo matches exact hand vs hand", Math.abs(one.rows.find(r => r.c.includes(E.parseCard("Ks")) && r.c.includes(E.parseCard("Kc"))).equity - exact.equity) < 1e-9);
  check("KK is 6 live combos, all overpairs", one.combos === 6 && one.groups[1].combos === 6);
  const m = { QQ: 1, AKs: 1, "87s": 0.5, "65o": 1 };
  const g = E.equityByCombo(aq, m, qflop);
  check("blockers and frequency: QQ 1, AKs 3, 87s 3×0.5 (board 7c blocks one), 65o 12", g.combos === 1 + 3 + 1.5 + 12, g.combos);
  check("set goes in the strong group", g.groups[0].combos === 1 && g.groups[0].equity < 0.1, JSON.stringify(g.groups[0]));
  check("group sizes add up", Math.abs(g.groups.reduce((s, x) => s + x.combos, 0) - g.combos) < 1e-9);
  const avg = g.groups.reduce((s, x) => s + (x.combos ? x.combos * x.equity : 0), 0) / g.combos;
  check("weighted groups equal the total", Math.abs(avg - g.equity) < 1e-9);
  const mc = E.equityHandVsRange(aq, m, qflop, 80000);
  check("total matches Monte Carlo hand vs range", Math.abs(g.equity - mc.equity) < 0.015, g.equity + " vs " + mc.equity);
  check("turn works", E.equityByCombo(aq, m, qflop.concat([E.parseCard("3d")])).equity > 0.5);
  check("preflop or empty range → null", E.equityByCombo(aq, m, []) === null && E.equityByCombo(aq, {}, qflop) === null);
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
