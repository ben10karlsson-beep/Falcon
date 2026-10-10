/* Claude Code PostToolUse hook: after an edit to the engine, the range data or a test,
   run all tests. On failure, exit 2 so Claude sees the output and fixes it. */
const { spawnSync } = require("child_process"), path = require("path");
let input = "";
process.stdin.on("data", d => (input += d));
process.stdin.on("end", () => {
  let file = "";
  try { const j = JSON.parse(input); file = (j.tool_input && j.tool_input.file_path) || ""; } catch (e) { return; }
  if (!/(js[\\/](engine|ranges)\.js|tests[\\/][\w-]+\.js)$/.test(file)) return;
  const root = path.join(__dirname, "..", "..");
  const r = spawnSync(process.execPath, [path.join(root, "tests", "run-all.js")], { encoding: "utf8" });
  if (r.status !== 0) {
    process.stderr.write(`Tests failed after editing ${path.basename(file)}:\n${r.stdout}${r.stderr}`);
    process.exit(2);
  }
});
