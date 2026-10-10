/* Falcon app shell: tab routing and keyboard shortcuts. Loaded last. */
let view = "ranges";
const VIEWS = {
  ranges: ["view-ranges", "t-ranges"],
  train: ["view-train", "t-train"],
  postflop: ["view-postflop", "t-postflop"],
  theory: ["view-theory", "t-theory"],
  resources: ["view-resources", "t-resources"]
};
let postflopReady = false;
function show(v) {
  view = v;
  for (const [k, [vid, tid]] of Object.entries(VIEWS)) {
    document.getElementById(vid).hidden = k !== v;
    const t = document.getElementById(tid);
    if (k === v) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current");
  }
  if (v === "train" && !tr.cur) { deal(); renderLeaks(); }
  if (v === "postflop" && !postflopReady) { postflopReady = true; Postflop.init(); }
}
for (const [k, [, tid]] of Object.entries(VIEWS)) {
  document.getElementById(tid).onclick = () => { show(k); window.scrollTo({ top: 0 }); };
}

document.addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = (e.target.tagName || "").toLowerCase();
  if (tag === "select" || tag === "textarea" || (tag === "input" && e.target.type !== "range")) return;
  if (view === "postflop") { if (Postflop.key(e)) e.preventDefault(); return; }
  if (view !== "train") return;
  const k = e.key.toLowerCase();
  const map = { f: "fold", c: "call", r: "raise" };
  if (!tr.answered && map[k]) { answer(map[k]); e.preventDefault(); }
  else if (tr.answered && (k === " " || k === "enter" || k === "n")) { deal(); e.preventDefault(); }
});

render();
const START = { "#trainer": "train", "#postflop": "postflop", "#theory": "theory", "#resources": "resources" }[location.hash];
if (START) show(START);
