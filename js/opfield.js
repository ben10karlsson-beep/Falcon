/* Falcon Op Field: the living layer. Loaded after app.js; nothing else depends on it.
   1. Lens: on the range grids, each unit's disc swells with closeness to the pointer, like a lens over the field.
   2. Ground: a dot field in the page gutters, its dots breathing on two slow interfering waves and swelling near the pointer.
   3. Ripple: when a trainer grades an answer, a ring runs out through the ground field in the grade's colour.
   Everything stops when the page is hidden, and collapses to a still frame under prefers-reduced-motion. */
(function () {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  // Effects can be paused with the switch in the app bar (saved as falcon-fx); reduced motion pauses them too
  let paused = false;
  try { paused = localStorage.getItem("falcon-fx") === "off"; } catch (e) {}
  // The margin dots can also be hidden altogether (saved as falcon-dots)
  let dotsOff = false;
  try { dotsOff = localStorage.getItem("falcon-dots") === "off"; } catch (e) {}
  const still = () => paused || reduce.matches;
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  /* ---------- 1. Lens over the range grids ---------- */
  function lens(grid) {
    let units = null, raf = 0, px = 0, py = 0;
    const measure = () => {
      units = [...grid.querySelectorAll(".cell")].map(c => {
        const r = c.getBoundingClientRect();
        // The disc may swell at most until it touches the square's sides (radius = b x 88% of the half-side)
        const b = parseFloat(c.style.getPropertyValue("--b")) || 0;
        return [c, r.left + r.width / 2, r.top + r.height / 2, r.width, b ? Math.min(1.42, 1 / (0.88 * b)) : 1];
      });
    };
    const apply = () => {
      raf = 0;
      if (still() || !units) return;
      if (units.length && !units[0][0].isConnected) measure(); // the grid re-renders on every click
      for (const [c, x, y, w, cap] of units) {
        const d = Math.hypot(x - px, y - py) / w;
        c.style.setProperty("--lens", (1 + (cap - 1) * Math.exp(-d * d / 4.5)).toFixed(3));
      }
    };
    grid.addEventListener("pointerenter", () => { measure(); grid.classList.add("lensing"); });
    grid.addEventListener("pointermove", e => {
      px = e.clientX; py = e.clientY;
      if (!units) measure();
      if (!raf) raf = requestAnimationFrame(apply);
    });
    grid.addEventListener("pointerleave", () => {
      cancelAnimationFrame(raf); raf = 0; units = null;
      grid.classList.remove("lensing");
      grid.querySelectorAll(".cell").forEach(c => c.style.removeProperty("--lens"));
    });
    // Positions move when the page scrolls; measure again on the next pointer move
    addEventListener("scroll", () => { units = null; }, { passive: true });
  }
  ["grid", "rd-grid"].forEach(id => { const g = document.getElementById(id); if (g) lens(g); });

  /* ---------- 2 and 3. The ground field and its ripples ---------- */
  const canvas = document.createElement("canvas");
  canvas.id = "opfield";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d");
  const STEP = 20, CONTENT = 1200, FADE = 60;
  // Pointer: the target (tx, ty) and an eased position (mx, my) that follows it, so the swell glides instead of jumping.
  // pw is how much the pointer counts: 1 deep in a gutter, easing to 0 toward the content, so hovering the page never disturbs the field.
  let W = 0, H = 0, dpr = 1, running = false, tx = -9999, ty = -9999, mx = -9999, my = -9999, pw = 0, tpw = 0;
  const ripples = [];
  let ink = css("--ultra") || "#2430d8", baseAlpha = parseFloat(css("--field-alpha")) || 0.42;

  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  // The field only shows where the page has gutters; on narrow screens there is nothing to draw
  const gutter = () => (W - CONTENT) / 2;

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    if (dotsOff) return;
    const g = gutter();
    if (g < 24) return;
    // Only draw where the gutter is visible (the CSS mask fades the last FADE pixels before the content)
    const edgeL = g, edgeR = W - g;
    mx += (tx - mx) * 0.18; my += (ty - my) * 0.18; pw += (tpw - pw) * 0.12;
    if (tx < -9000) { mx = tx; my = ty; }
    for (let i = ripples.length - 1; i >= 0; i--) if (t - ripples[i].t0 > 2600) ripples.splice(i, 1);
    for (let y = STEP / 2; y < H; y += STEP) {
      for (let x = STEP / 2; x < W; x += STEP) {
        if (x > edgeL && x < edgeR) { x += Math.floor((edgeR - x) / STEP) * STEP; continue; }
        // Two slow waves crossing: the moiré breath of the field
        const wave = 0.5 + 0.28 * Math.sin(x * 0.021 - t * 0.0007) + 0.22 * Math.sin(y * 0.027 + x * 0.006 + t * 0.0005);
        let r = 0.5 + 3.4 * wave;
        if (pw > 0.01) {
          const dm = Math.hypot(x - mx, y - my);
          r *= 1 + 0.7 * pw * Math.exp(-(dm * dm) / (110 * 110));
        }
        let color = ink, alpha = baseAlpha;
        for (const rp of ripples) {
          const age = t - rp.t0, R = age * 0.62, fade = 1 - age / 2600;
          const k = Math.exp(-Math.pow((Math.hypot(x - rp.x, y - rp.y) - R) / 26, 2)) * fade;
          if (k > 0.05) { r *= 1 + 1.6 * k; if (k > 0.25) { color = rp.color; alpha = baseAlpha + 0.45 * k; } }
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        // Never larger than half the spacing, so neighbouring dots can't merge
        ctx.beginPath(); ctx.arc(x, y, Math.min(r, STEP * 0.46), 0, 6.2832); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function frame(t) {
    if (!running) return;
    lastT = t;
    draw(t);
    requestAnimationFrame(frame);
  }
  let lastT = 0;
  function start() {
    if (dotsOff) { running = false; draw(lastT); return; }
    if (still()) { running = false; tpw = pw = 0; draw(lastT); return; }
    if (running || document.hidden) return;
    running = true; requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  resize(); start();
  addEventListener("resize", () => { resize(); if (!running) draw(lastT); });
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());
  reduce.addEventListener("change", () => { stop(); start(); });
  addEventListener("pointermove", e => {
    tx = e.clientX; ty = e.clientY;
    if (mx < -9000) { mx = tx; my = ty; }
    const g = gutter(), inner = Math.min(tx - (g - FADE), (W - g + FADE) - tx); // distance into the content zone
    tpw = Math.max(0, Math.min(1, -inner / 120));
  }, { passive: true });
  document.addEventListener("pointerleave", () => { tpw = 0; });

  // The field takes its ink from the theme; re-read it when the theme switches
  new MutationObserver(() => { ink = css("--ultra") || ink; baseAlpha = parseFloat(css("--field-alpha")) || 0.42; if (!running) draw(lastT); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  // A graded answer sends a ring out through the field from the feedback's position
  const GRADE = { good: "--good", ok: "--warn", bad: "--magenta" };
  new MutationObserver(list => {
    for (const m of list) for (const n of m.addedNodes) {
      if (n.nodeType !== 1) continue;
      const fb = n.matches(".fb") ? n : n.querySelector(".fb");
      if (!fb) continue;
      const grade = Object.keys(GRADE).find(k => fb.classList.contains(k));
      if (!grade || still()) continue;
      const r = fb.getBoundingClientRect();
      ripples.push({ x: r.left + r.width / 2, y: r.top + 24, t0: performance.now(), color: css(GRADE[grade]) });
      if (grade === "good") celebrate(fb);
      ink = css("--ultra") || ink;
    }
  }).observe(document.body, { childList: true, subtree: true });

  /* A right answer: the button you pressed gives a little hop, a green ring flashes off it, and a burst of op shapes
     (discs, squares and rings in the field colours) pops out around it. Skipped when effects are paused. */
  let lastBtn = null, lastBtnT = 0;
  document.addEventListener("click", e => { const b = e.target.closest("button"); if (b) { lastBtn = b; lastBtnT = performance.now(); } }, true);
  const layer = document.createElement("div");
  layer.className = "fx-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);
  function celebrate(fb) {
    const sec = fb.closest(".pf-grid") || document.body;
    let btn = sec.querySelector(".act.picked");
    if (!btn && lastBtn && sec.contains(lastBtn) && performance.now() - lastBtnT < 4000) btn = lastBtn;
    if (!btn || !btn.isConnected) btn = fb.querySelector(".dot") || fb;
    const r = btn.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const ease = "cubic-bezier(.16,1,.3,1)";
    btn.animate([{ transform: "translateY(0) scale(1)" }, { transform: "translateY(-6px) scale(1.06)", offset: 0.35 }, { transform: "translateY(1px) scale(.99)", offset: 0.7 }, { transform: "none" }], { duration: 560, easing: ease });
    const ring = document.createElement("span");
    ring.className = "fx-ring";
    Object.assign(ring.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
    layer.appendChild(ring);
    ring.animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(1.35)", opacity: 0 }], { duration: 700, easing: ease }).onfinish = () => ring.remove();
    const colors = [css("--good"), css("--magenta"), css("--ultra"), css("--good"), css("--ink")];
    const N = 18;
    for (let i = 0; i < N; i++) {
      const p = document.createElement("span"), kind = i % 3, size = 7 + Math.random() * 7;
      // Spread all round, a little more upward, like a small pop. Each shape starts on the button's edge, so the label stays clear
      const a = (i / N) * Math.PI * 2 + Math.random() * 0.4, dist = 40 + Math.random() * 60;
      const sx = cx + Math.cos(a) * r.width / 2, sy = cy + Math.sin(a) * r.height / 2;
      p.className = "fx-bit " + ["disc", "square", "ring"][kind];
      p.style.cssText = `left:${sx - size / 2}px;top:${sy - size / 2}px;width:${size}px;height:${size}px;--c:${colors[i % colors.length]}`;
      layer.appendChild(p);
      const dx = Math.cos(a) * dist, dy = Math.sin(a) * dist * 0.8 - 18;
      p.animate([
        { transform: "translate(0,0) scale(.4) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx}px,${dy}px) scale(1) rotate(${(Math.random() - 0.5) * 240}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx * 1.08}px,${dy + 22}px) scale(.7) rotate(${(Math.random() - 0.5) * 300}deg)`, opacity: 0 }
      ], { duration: 820 + Math.random() * 320, easing: "cubic-bezier(.2,.8,.3,1)" }).onfinish = () => p.remove();
    }
  }

  /* The effects switch: pauses the field, the lens, the range sweep and the grading toss */
  const fxBtn = document.getElementById("fx-switch");
  function setFx(off) {
    paused = off;
    document.documentElement.dataset.fx = off ? "off" : "on";
    if (fxBtn) {
      fxBtn.setAttribute("aria-pressed", off);
      fxBtn.querySelector(".fx-label").textContent = off ? "Play effects" : "Pause effects";
    }
    if (off) {
      stop(); tpw = pw = 0; ripples.length = 0; draw(lastT);
      document.querySelectorAll(".cell").forEach(c => c.style.removeProperty("--lens"));
    } else start();
  }
  setFx(paused);
  if (fxBtn) fxBtn.onclick = () => {
    setFx(!paused);
    try { localStorage.setItem("falcon-fx", paused ? "off" : "on"); } catch (e) {}
  };

  /* The dots switch: hides the margin field entirely (and its ripples); the grid lens is unaffected */
  const dotsBtn = document.getElementById("dots-switch");
  function setDots(off) {
    dotsOff = off;
    document.documentElement.dataset.dots = off ? "off" : "on";
    if (dotsBtn) {
      dotsBtn.setAttribute("aria-pressed", off);
      dotsBtn.querySelector(".dots-label").textContent = off ? "Show dots" : "Hide dots";
    }
    if (off) { stop(); ripples.length = 0; draw(lastT); } else start();
  }
  setDots(dotsOff);
  if (dotsBtn) dotsBtn.onclick = () => {
    setDots(!dotsOff);
    try { localStorage.setItem("falcon-dots", dotsOff ? "off" : "on"); } catch (e) {}
  };
})();
