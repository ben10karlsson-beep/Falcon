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
  // Keep the address in sync so a reload lands on the same view (and chapter)
  const hash = { ranges: "", train: "#trainer", theory: "#theory/" + Theory.current() }[v] ?? "#" + v;
  history.replaceState(null, "", hash || location.pathname + location.search);
}
for (const [k, [, tid]] of Object.entries(VIEWS)) {
  document.getElementById(tid).onclick = () => { show(k); window.scrollTo({ top: 0 }); };
}

/* "Practice this" buttons: data-go="view[:postflop sub-tab[:mode]]", e.g. "postflop:quiz:cf" */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-go]");
  if (!b) return;
  const [v, sub, mode] = b.dataset.go.split(":");
  show(v);
  if (sub) Postflop.open(sub, mode);
  window.scrollTo({ top: 0 });
});

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
/* Open the view (and theory chapter) named in the address, e.g. #theory/combos */
function route() {
  const [hashView, chapter] = location.hash.split("/");
  const v = { "#trainer": "train", "#postflop": "postflop", "#theory": "theory", "#resources": "resources" }[hashView];
  if (v === "theory" && chapter) Theory.show(chapter, false);
  if (v) show(v);
}
route();
window.addEventListener("hashchange", route);
