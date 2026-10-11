/* Falcon app shell: tab routing, trainer modes and keyboard shortcuts. Loaded last. */
let view = "ranges";
const VIEWS = {
  ranges: ["view-ranges", "t-ranges"],
  train: ["view-train", "t-train"],
  postflop: ["view-postflop", "t-postflop"],
  theory: ["view-theory", "t-theory"],
  resources: ["view-resources", "t-resources"]
};
let postflopReady = false;

/* Trainer tab: every graded trainer, one at a time.
   hands = preflop trainer (preflop.js), read = range reading (reading.js),
   quiz = Hand vs hand and range = Range trainer (both in postflop.js) */
const TRAIN_MODES = { hands: "tr-hands", read: "tr-read", quiz: "pf-quiz", range: "pf-range" };
let trainMode = "hands", trainSub = null;
function setTrainMode(m, sub) {
  if (!TRAIN_MODES[m]) m = "hands";
  trainMode = m;
  for (const [k, id] of Object.entries(TRAIN_MODES)) document.getElementById(id).hidden = k !== m;
  document.querySelectorAll("[data-tm]").forEach(b => b.setAttribute("aria-pressed", b.dataset.tm === m));
  if (m === "hands" && !tr.cur) { deal(); renderLeaks(); }
  if (m === "read") Reading.show();
  if (m === "quiz" || m === "range") Postflop.openTrainer(m, sub);
  if (view === "train") syncHash();
}
document.querySelectorAll("[data-tm]").forEach(b => b.onclick = () => setTrainMode(b.dataset.tm));

/* Keep the address in sync so a reload lands on the same view, trainer and chapter */
function syncHash() {
  const hash = {
    ranges: "",
    train: "#trainer" + (trainMode === "hands" ? "" : "/" + trainMode),
    theory: "#theory/" + Theory.current()
  }[view] ?? "#" + view;
  history.replaceState(null, "", hash || location.pathname + location.search);
}

function show(v) {
  view = v;
  for (const [k, [vid, tid]] of Object.entries(VIEWS)) {
    document.getElementById(vid).hidden = k !== v;
    const t = document.getElementById(tid);
    if (k === v) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current");
  }
  if (v === "train") { setTrainMode(trainMode, trainSub); trainSub = null; }
  if (v === "postflop" && !postflopReady) { postflopReady = true; Postflop.init(); }
  syncHash();
}
for (const [k, [, tid]] of Object.entries(VIEWS)) {
  document.getElementById(tid).onclick = () => { show(k); window.scrollTo({ top: 0 }); };
}

/* "Practice this" buttons: data-go="train:<mode>[:<sub>]" (e.g. "train:quiz:cf"), "postflop:<calc|board>" or a plain view */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-go]");
  if (!b) return;
  const [v, sub, mode] = b.dataset.go.split(":");
  if (v === "train") { trainMode = sub || "hands"; trainSub = mode || null; }
  show(v);
  if (v === "postflop" && sub) Postflop.open(sub);
  window.scrollTo({ top: 0 });
});

document.addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = (e.target.tagName || "").toLowerCase();
  if (tag === "select" || tag === "textarea" || (tag === "input" && e.target.type !== "range")) return;
  if (view !== "train") return;
  if (trainMode === "read") { if (Reading.key(e)) e.preventDefault(); return; }
  if (trainMode === "quiz" || trainMode === "range") { if (Postflop.key(e, trainMode)) e.preventDefault(); return; }
  const k = e.key.toLowerCase();
  const map = { f: "fold", c: "call", r: "raise" };
  if (!tr.answered && map[k]) { answer(map[k]); e.preventDefault(); }
  else if (tr.answered && (k === " " || k === "enter" || k === "n")) { deal(); e.preventDefault(); }
});

render();
/* Open the view named in the address, e.g. #theory/combos or #trainer/read */
function route() {
  const [hashView, part] = location.hash.split("/");
  const v = { "#trainer": "train", "#postflop": "postflop", "#theory": "theory", "#resources": "resources" }[hashView];
  if (v === "theory" && part) Theory.show(part, false);
  if (v === "train") trainMode = TRAIN_MODES[part] ? part : "hands";
  if (v) show(v);
}
route();
window.addEventListener("hashchange", route);
