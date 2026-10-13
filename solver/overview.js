/* One line per solved flop: BTN's c-bet mix after BB checks, and how BB answers each size.
   Usage: node solver/overview.js */
const fs = require("fs"), path = require("path");
const { btnRange, bbCallRange } = require("./make-config.js");
const flops = require("./flops.js");
const R = "AKQJT98765432";
function handKey(c) {
  let [a, s1, b, s2] = c; if (R.indexOf(a) > R.indexOf(b)) [a, s1, b, s2] = [b, s2, a, s1];
  return a === b ? a + b : a + b + (s1 === s2 ? "s" : "o");
}
// Range-weighted action frequencies at a node; weights = the player's preflop frequency for each combo
function mix(node, rng) {
  const s = node.strategy, t = s.actions.map(() => 0); let w = 0;
  for (const [c, p] of Object.entries(s.strategy)) { const f = rng[handKey(c)] || 0; w += f; p.forEach((x, i) => t[i] += f * x); }
  return Object.fromEntries(s.actions.map((a, i) => [a, t[i] / w]));
}
const pc = x => (x * 100).toFixed(0).padStart(3) + "%";
const btn = btnRange(), bb = bbCallRange();
console.log("flop        family                     check  b33  b75  | vs 33: fold  raise | vs 75: fold  raise");
for (const f of flops) {
  const file = path.join(__dirname, "work", f.board.replace(/,/g, "") + ".json");
  if (!fs.existsSync(file)) { console.log(f.board.padEnd(11), f.family.padEnd(26), "  (not solved)"); continue; }
  const res = JSON.parse(fs.readFileSync(file, "utf8")), ip = res.childrens.CHECK;
  const m = mix(ip, btn), small = Object.keys(m).find(a => a.startsWith("BET 18")), big = Object.keys(m).find(a => a.startsWith("BET 41"));
  const vs = a => { const r = mix(ip.childrens[a], bb), raise = Object.keys(r).filter(k => k.startsWith("RAISE")).reduce((s, k) => s + r[k], 0); return pc(r.FOLD) + "  " + pc(raise); };
  console.log(f.board.padEnd(11), f.family.padEnd(26), pc(m.CHECK), " ", pc(m[small]), pc(m[big]), " |      ", vs(small), " |      ", vs(big));
}
