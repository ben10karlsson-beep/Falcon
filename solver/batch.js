/* Solve every flop in flops.js, one after another. Resumable: flops with a dump in solver/work/ are skipped.
   Usage: node solver/batch.js   (progress goes to stdout and solver/work/batch.log) */
const fs = require("fs"), path = require("path"), { spawnSync } = require("child_process");
const { config } = require("./make-config.js");
const flops = require("./flops.js");
const dir = path.join(__dirname, "TexasSolver"), work = path.join(__dirname, "work");
fs.mkdirSync(work, { recursive: true });
const logFile = path.join(work, "batch.log");
const log = msg => { const line = `[${new Date().toLocaleTimeString()}] ${msg}`; console.log(line); fs.appendFileSync(logFile, line + "\n"); };

const name = b => b.replace(/,/g, "");
flops.forEach((f, i) => {
  const dump = path.join(work, name(f.board) + ".json");
  if (fs.existsSync(dump)) { log(`${i + 1}/${flops.length} ${f.board} already solved, skipping`); return; }
  const cfg = path.join(work, name(f.board) + ".txt");
  // Dump to a temp name first so an interrupted run never leaves a half-written file that looks finished
  const tmp = dump + ".part";
  fs.writeFileSync(cfg, config(f.board, path.relative(dir, tmp).split(path.sep).join("/")));
  log(`${i + 1}/${flops.length} ${f.board} (${f.family}) solving...`);
  const t = Date.now();
  // TexasSolver occasionally crashes at startup (access violation within seconds); the same config then
  // solves fine on a retry, so try up to 3 times
  let r;
  for (let attempt = 1; attempt <= 3; attempt++) {
    r = solve();
    if (r.status === 0 && fs.existsSync(tmp)) break;
    log(`  attempt ${attempt} failed (exit ${r.status})${attempt < 3 ? ", retrying" : ""}`);
  }
  function solve() { return spawnSync(path.join(dir, "console_solver.exe"),
    ["--input_file", cfg, "--resource_dir", "./resources", "--mode", "holdem"],
    { cwd: dir, encoding: "utf8", maxBuffer: 1 << 28 }); }
  const expl = [...(r.stdout || "").matchAll(/Total exploitability ([\d.]+)/g)].pop();
  if (r.status !== 0 || !fs.existsSync(tmp)) { log(`  FAILED (exit ${r.status}) ${(r.stderr || "").slice(-300)}`); return; }
  fs.renameSync(tmp, dump);
  log(`  done in ${((Date.now() - t) / 60000).toFixed(1)} min, exploitability ${expl ? (+expl[1]).toFixed(2) : "?"}% of pot`);
});
log("batch finished");
