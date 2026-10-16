/* Falcon app shell: tab routing, trainer modes and keyboard shortcuts. Loaded last. */
let view = "ranges";
const VIEWS = {
  welcome: ["view-welcome", null],
  ranges: ["view-ranges", "t-ranges"],
  train: ["view-train", "t-train"],
  postflop: ["view-postflop", "t-postflop"],
  theory: ["view-theory", "t-theory"],
  resources: ["view-resources", "t-resources"]
};
let postflopReady = false;

/* Trainer tab: every graded trainer, one at a time.
   hands = preflop trainer (preflop.js), read = range reading (reading.js),
   quiz = Hand vs hand, range = Range trainer and cbet = C-bet trainer (all in postflop.js), play = whole hands against a bot (play.js) */
const TRAIN_MODES = { hands: "tr-hands", read: "tr-read", quiz: "pf-quiz", range: "pf-range", cbet: "pf-cbet", play: "tr-play" };
let trainMode = "hands", trainSub = null;
function setTrainMode(m, sub) {
  if (!TRAIN_MODES[m]) m = "hands";
  trainMode = m;
  for (const [k, id] of Object.entries(TRAIN_MODES)) document.getElementById(id).hidden = k !== m;
  document.querySelectorAll("[data-tm]").forEach(b => b.setAttribute("aria-pressed", b.dataset.tm === m));
  if (m === "hands" && !tr.cur) { deal(); renderLeaks(); }
  if (m === "read") Reading.show();
  if (m === "play") Play.show();
  if (m === "quiz" || m === "range" || m === "cbet") Postflop.openTrainer(m, sub);
  if (view === "train") syncHash();
}
document.querySelectorAll("[data-tm]").forEach(b => b.onclick = () => setTrainMode(b.dataset.tm));

/* Keep the address in sync so a reload lands on the same view, trainer and chapter */
function syncHash() {
  const hash = {
    ranges: "",
    train: "#trainer" + (trainMode === "hands" ? "" : "/" + trainMode),
    theory: "#theory/" + Theory.current(),
    welcome: "#welcome"
  }[view] ?? "#" + view;
  history.replaceState(null, "", hash || location.pathname + location.search);
}

function show(v) {
  view = v;
  for (const [k, [vid, tid]] of Object.entries(VIEWS)) {
    document.getElementById(vid).hidden = k !== v;
    const t = tid && document.getElementById(tid);
    if (!t) continue;
    if (k === v) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current");
  }
  if (v === "train") { setTrainMode(trainMode, trainSub); trainSub = null; }
  if (v === "postflop" && !postflopReady) { postflopReady = true; Postflop.init(); }
  syncHash();
}
for (const [k, [, tid]] of Object.entries(VIEWS)) {
  if (!tid) continue;
  document.getElementById(tid).onclick = () => { show(k); window.scrollTo({ top: 0 }); };
}

/* "Practice this" buttons: data-go="train:<mode>[:<sub>]" (e.g. "train:quiz:cf"), "postflop:<calc|board>" or a plain view */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-go]");
  if (!b) return;
  const [v, sub, mode] = b.dataset.go.split(":");
  if (v === "train") { trainMode = sub || "hands"; trainSub = mode || null; }
  if (v === "theory" && sub) Theory.show(sub, false);
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
  if (trainMode === "play") { if (Play.key(e)) e.preventDefault(); return; }
  if (trainMode === "quiz" || trainMode === "range" || trainMode === "cbet") { if (Postflop.key(e, trainMode)) e.preventDefault(); return; }
  const k = e.key.toLowerCase();
  const map = { f: "fold", c: "call", r: "raise" };
  if (!tr.answered && map[k]) { answer(map[k]); e.preventDefault(); }
  else if (tr.answered && (k === " " || k === "enter" || k === "n")) { deal(); e.preventDefault(); }
});

/* Recessed rails (.seg): one raised plaque slides to whichever option is pressed.
   Re-placed when the selection changes and when the rail's size changes (fonts loading, a hidden view being shown). */
document.querySelectorAll(".seg").forEach(seg => {
  const thumb = document.createElement("span");
  thumb.className = "seg-thumb instant";
  thumb.setAttribute("aria-hidden", "true");
  seg.prepend(thumb);
  seg.classList.add("slides");
  const place = () => {
    const b = seg.querySelector('button[aria-pressed="true"]');
    // Hidden rails measure 0; the next placement after they appear jumps straight there instead of sliding in
    if (!b || !seg.offsetWidth) { thumb.classList.add("instant"); thumb.style.opacity = 0; return; }
    thumb.style.opacity = 1;
    thumb.style.width = b.offsetWidth + "px";
    thumb.style.height = b.offsetHeight + "px";
    thumb.style.transform = `translate(${b.offsetLeft}px,${b.offsetTop}px)`;
    if (thumb.classList.contains("instant")) { void thumb.offsetWidth; thumb.classList.remove("instant"); }
  };
  new MutationObserver(place).observe(seg, { subtree: true, attributes: true, attributeFilter: ["aria-pressed"] });
  new ResizeObserver(place).observe(seg);
  place();
});

/* Light / dark switch. The choice is saved; the first visit follows the system setting (set in <head> before paint) */
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]').content = t === "dark" ? "#0f1120" : "#eef0f5";
  const b = document.getElementById("theme-switch");
  b.setAttribute("aria-pressed", t === "dark");
  b.querySelectorAll("[data-t]").forEach(i => i.classList.toggle("on", i.dataset.t === t));
  document.getElementById("theme-label").textContent = t === "dark" ? "Light" : "Dark";
  b.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
}
setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
document.getElementById("theme-switch").onclick = () => {
  const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(t);
  try { localStorage.setItem("falcon-theme", t); } catch (e) {}
};

render();
/* Open the view named in the address, e.g. #theory/combos or #trainer/read */
function route() {
  const [hashView, part] = location.hash.split("/");
  const v = { "#welcome": "welcome", "#trainer": "train", "#postflop": "postflop", "#theory": "theory", "#resources": "resources" }[hashView];
  if (v === "theory" && part) Theory.show(part, false);
  if (v === "train") trainMode = TRAIN_MODES[part] ? part : "hands";
  if (v) show(v);
}
/* Welcome page: the button's opening range as a live field; picking a hand opens it in the charts */
(function () {
  const g = document.getElementById("welcome-field"), rng = getRange({ mode: "rfi", seat: "BTN" });
  for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++) {
    const h = handAt(i, j), f = freqs(rng, h), b = document.createElement("button");
    b.type = "button";
    b.className = "cell" + (f.fold >= 0.999 ? " zero" : "") + (i === j ? " pair" : "");
    b.innerHTML = unitHTML(h);
    b.style.setProperty("--i", i); b.style.setProperty("--j", j);
    setUnit(b, f.raise, f.raise, "var(--raise)");
    b.setAttribute("aria-label", `${h}: raise ${pct(f.raise)}, open it in the charts`);
    b.onclick = () => { state = { mode: "rfi", seat: "BTN", vs: 0, v3: 0, sel: h }; render(); show("ranges"); window.scrollTo({ top: 0 }); };
    g.appendChild(b);
  }
  g.classList.add("sweep");
})();

route();
// First visit: nothing in the address and no record of a visit opens the welcome page
try {
  if (!location.hash && !localStorage.getItem("falcon-welcomed")) show("welcome");
  localStorage.setItem("falcon-welcomed", "1");
} catch (e) {}
window.addEventListener("hashchange", route);
