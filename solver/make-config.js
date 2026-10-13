/* Build a TexasSolver console config for BTN vs BB single-raised pots from Falcon's own charts.
   Usage: node solver/make-config.js <board, e.g. Qs,Jh,2h> [out.txt] [result.json]
   Then, from solver/TexasSolver: ./console_solver.exe --input_file ../work/config.txt --resource_dir ./resources --mode holdem
   Units are tenths of a big blind: pot 5.5bb (2.5 + 2.5 + 0.5 SB dead), effective stack 97.5bb. */
const fs = require("fs"), path = require("path"), vm = require("vm");
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/ranges.js"), "utf8") +
  ";Object.assign(this,{RFI,VS,parse,getRange,freqs,ALL_HANDS});", ctx);
const { RFI, VS, parse, getRange, freqs, ALL_HANDS } = ctx;

// IP = BTN's whole opening range (BB flatted, so nothing was removed); OOP = the hands BB flats with
function btnRange() { return parse(RFI.BTN.raise); }
function bbCallRange() {
  const rng = getRange({ mode: "vs", vs: VS.findIndex(v => v.id === "BB vs BTN") }), m = {};
  ALL_HANDS.forEach(h => { const c = freqs(rng, h).call; if (c > 0) m[h] = c; });
  return m;
}
const fmt = m => Object.entries(m).map(([h, f]) => f >= 1 ? h : `${h}:${+f.toFixed(3)}`).join(",");

function config(board, dump) {
  return [
    "set_pot 55",
    "set_effective_stack 975",
    `set_board ${board}`,
    `set_range_oop ${fmt(bbCallRange())}`,
    `set_range_ip ${fmt(btnRange())}`,
    // Flop: BTN c-bets small or big, BB check-raises; no donk bets or flop shoves (both ~0% here, and they bloat the tree)
    "set_bet_sizes ip,flop,bet,33,75",
    "set_bet_sizes ip,flop,raise,60",
    "set_bet_sizes oop,flop,raise,60",
    // Turn and river: one size each, so later streets are realistic enough without blowing up the tree
    "set_bet_sizes oop,turn,bet,66",
    "set_bet_sizes oop,turn,raise,60",
    "set_bet_sizes oop,turn,allin",
    "set_bet_sizes ip,turn,bet,66",
    "set_bet_sizes ip,turn,raise,60",
    "set_bet_sizes ip,turn,allin",
    "set_bet_sizes oop,river,bet,66",
    "set_bet_sizes oop,river,raise,60",
    "set_bet_sizes oop,river,allin",
    "set_bet_sizes ip,river,bet,66",
    "set_bet_sizes ip,river,raise,60",
    "set_bet_sizes ip,river,allin",
    "set_allin_threshold 0.67",
    "set_raise_limit 3",
    "build_tree",
    "set_thread_num 12",
    "set_accuracy 0.5",
    "set_max_iteration 300",
    "set_print_interval 20",
    "set_use_isomorphism 1",
    "start_solve",
    "set_dump_rounds 1",
    `dump_result ${dump}`,
    ""
  ].join("\n");
}

if (require.main === module) {
  const board = process.argv[2];
  if (!board) { console.error("Usage: node solver/make-config.js <board> [out.txt] [result.json]"); process.exit(1); }
  const out = process.argv[3] || path.join(__dirname, "work", "config.txt");
  // The solver runs from solver/TexasSolver, so write the dump path relative to that folder
  const dump = path.relative(path.join(__dirname, "TexasSolver"), path.resolve(process.argv[4] || path.join(__dirname, "work", "result.json"))).split(path.sep).join("/");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, config(board, dump));
  console.log("wrote", out);
}
module.exports = { config, btnRange, bbCallRange };
