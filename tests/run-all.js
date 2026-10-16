/* Run every test file: node tests/run-all.js
   Exits non-zero if any file fails. Used by the git pre-commit hook and the Claude Code hook. */
const { spawnSync } = require("child_process"), path = require("path");
let failed = false;
for (const file of ["engine.test.js", "ranges.test.js", "solved.test.js", "play.test.js"]) {
  const r = spawnSync(process.execPath, [path.join(__dirname, file)], { encoding: "utf8" });
  process.stdout.write(`${file}: ${r.stdout}${r.stderr}`);
  if (r.status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
