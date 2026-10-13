/* Summarize a TexasSolver flop dump: BTN's c-bet strategy after BB checks, weighted by range.
   Usage: node solver/summarize.js <result.json> */
const { btnRange } = require("./make-config.js");
const res = require(require("path").resolve(process.argv[2]));
const node = res.childrens.CHECK.strategy, acts = node.actions;
const rng = btnRange();
// "AhKd" -> hand class key like "AKo"
const R = "AKQJT98765432";
function handKey(c) {
  let [a, s1, b, s2] = c; if (R.indexOf(a) > R.indexOf(b)) [a, s1, b, s2] = [b, s2, a, s1];
  return a === b ? a + b : a + b + (s1 === s2 ? "s" : "o");
}
const tot = acts.map(() => 0); let w = 0;
for (const [c, p] of Object.entries(node.strategy)) {
  const f = rng[handKey(c)] || 0; w += f;
  p.forEach((x, i) => tot[i] += f * x);
}
const label = a => a.replace(/BET (\d+)\.0+/, (_, n) => `bet ${(n / 10).toFixed(1)}bb (${Math.round(n / 55 * 100)}% pot)`).toLowerCase();
acts.forEach((a, i) => console.log(label(a).padEnd(26), (tot[i] / w * 100).toFixed(1) + "%"));
console.log("combos weighted:", w.toFixed(1));
