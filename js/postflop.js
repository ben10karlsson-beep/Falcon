/* Falcon postflop: equity calculator, board explorer, equity quiz.
   Depends on Engine (engine.js) and range data/helpers (ranges.js). */
(function () {
  "use strict";
  const E = window.Engine;
  const $ = id => document.getElementById(id);
  const P = c => E.parseCard(c);
  const fmt = x => (Math.round(x * 1000) / 10).toFixed(1) + "%";

  /* ---------- Card rendering ---------- */
  function cardHTML(c, size) {
    if (c === null || c === undefined) return "";
    const s = E.suitOf(c), r = E.RANKS[E.rankOf(c)];
    const red = s === 1 || s === 2;
    return `<span class="mc ${size || ""} ${red ? "red" : ""}" aria-label="${r === "T" ? "10" : r}${E.SUIT_SYMBOL[s]}"><b>${r === "T" ? "10" : r}</b><i>${E.SUIT_SYMBOL[s]}</i></span>`;
  }
  /* Card picker: 4 suit rows × 13 ranks */
  function renderPicker(el, used, onPick) {
    const u = new Set(used.filter(c => c !== null && c !== undefined));
    let html = "";
    for (const s of [0, 1, 2, 3]) {
      html += `<div class="prow">`;
      for (let r = 12; r >= 0; r--) {
        const c = E.card(r, s), red = s === 1 || s === 2;
        html += `<button class="pk ${red ? "red" : ""}" data-c="${c}" ${u.has(c) ? "disabled" : ""} aria-label="${E.RANKS[r]}${E.SUIT_SYMBOL[s]}">${E.RANKS[r] === "T" ? "10" : E.RANKS[r]}<i>${E.SUIT_SYMBOL[s]}</i></button>`;
      }
      html += `</div>`;
    }
    el.innerHTML = html;
    el.querySelectorAll(".pk").forEach(b => b.onclick = () => onPick(+b.dataset.c));
  }
  function slotHTML(key, c, label, active) {
    return `<button class="slot ${active ? "active" : ""} ${c !== null && c !== undefined ? "filled" : ""}" data-slot="${key}" aria-label="${label}${c !== null && c !== undefined ? ": " + E.cardName(c) + ", click to clear" : ""}">${c !== null && c !== undefined ? cardHTML(c) : `<span class="ph">${label}</span>`}</button>`;
  }
  function shuffledDeck(exclude) {
    const d = E.remainingDeck(exclude || []);
    for (let i = d.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [d[i], d[j]] = [d[j], d[i]]; }
    return d;
  }

  /* ---------- Range options built from the preflop charts (ranges.js) ---------- */
  const RANGES = rangeOptions();
  const rangeByKey = k => RANGES.find(r => r.key === k);

  function handDescription(hole, board) {
    if (board.length < 3) return null;
    const v = E.evaluate(hole.concat(board));
    let made = E.CATEGORY[E.category(v)];
    if (E.category(v) === 1 && board.length >= 3) {
      const b = E.classifyFlop(hole, board);
      made = b === 1 ? (E.rankOf(hole[0]) === E.rankOf(hole[1]) ? "Overpair" : "Top pair") : b === 2 ? "Weaker pair" : made;
      const br = board.map(E.rankOf), hr = hole.map(E.rankOf);
      if (!br.includes(hr[0]) && !br.includes(hr[1]) && hr[0] !== hr[1]) made = "Pair on the board only";
    }
    const draws = [];
    if (board.length < 5) {
      const d = E.drawInfo(hole, board);
      if (d.flushDraw && E.category(v) < 5) draws.push("a flush draw");
      if (d.oesd && E.category(v) < 4) draws.push("an open-ended straight draw");
      else if (d.gutshot && E.category(v) < 4) draws.push("a gutshot");
    }
    return { made, draws };
  }

  /* ================= 1. EQUITY CALCULATOR ================= */
  const calc = {
    hero: [P("Jh"), P("Th")], vil: [P("As"), P("Ac")], board: [P("9h"), P("8c"), P("2h"), null, null],
    mode: "hand", rangeKey: "rfi:UTG", active: "b3", job: 0
  };
  const SLOT_ORDER = ["h0", "h1", "v0", "v1", "b0", "b1", "b2", "b3", "b4"];
  function getSlot(k) { return k[0] === "h" ? calc.hero[+k[1]] : k[0] === "v" ? calc.vil[+k[1]] : calc.board[+k[1]]; }
  function setSlot(k, c) { if (k[0] === "h") calc.hero[+k[1]] = c; else if (k[0] === "v") calc.vil[+k[1]] = c; else calc.board[+k[1]] = c; }
  const usedCards = () => [...calc.hero, ...(calc.mode === "hand" ? calc.vil : []), ...calc.board].filter(c => c !== null);
  function nextEmpty(from) {
    const order = SLOT_ORDER.filter(k => calc.mode === "hand" || k[0] !== "v");
    const start = Math.max(0, order.indexOf(from));
    for (let i = 0; i < order.length; i++) { const k = order[(start + i) % order.length]; if (getSlot(k) === null) return k; }
    return null;
  }

  function renderCalcInputs() {
    $("pc-hero").innerHTML = ["h0", "h1"].map((k, i) => slotHTML(k, getSlot(k), `Card ${i + 1}`, calc.active === k)).join("");
    $("pc-vil").innerHTML = ["v0", "v1"].map((k, i) => slotHTML(k, getSlot(k), `Card ${i + 1}`, calc.active === k)).join("");
    $("pc-board").innerHTML = ["Flop", "Flop", "Flop", "Turn", "River"].map((l, i) => slotHTML("b" + i, calc.board[i], l, calc.active === "b" + i)).join("");
    $("pc-vil").hidden = calc.mode !== "hand";
    $("pc-range-wrap").hidden = calc.mode !== "range";
    document.querySelectorAll("[data-opp]").forEach(b => b.setAttribute("aria-pressed", b.dataset.opp === calc.mode));
    document.querySelectorAll("#pf-calc .slot").forEach(b => b.onclick = () => {
      const k = b.dataset.slot;
      if (getSlot(k) !== null) { setSlot(k, null); calc.active = k; } else calc.active = k;
      renderCalcInputs(); computeCalc();
    });
    renderPicker($("pc-picker"), usedCards(), c => {
      const k = calc.active || nextEmpty("h0");
      if (!k) return;
      setSlot(k, c);
      calc.active = nextEmpty(k);
      renderCalcInputs(); computeCalc();
    });
  }

  function computeCalc() {
    const out = $("pc-result");
    const hero = calc.hero, board = calc.board;
    if (hero.includes(null)) { out.innerHTML = `<div class="empty">Pick your two cards to see your equity.</div>`; return; }
    const filled = board.map(c => c !== null);
    const n = filled.filter(Boolean).length;
    const contiguous = filled.indexOf(false) === -1 ? n === 5 : filled.slice(filled.indexOf(false)).every(x => !x);
    if (!contiguous || n === 1 || n === 2) { out.innerHTML = `<div class="empty">Fill the whole flop (3 cards) before the turn and river, or clear the board for a preflop result.</div>`; return; }
    if (calc.mode === "hand" && calc.vil.includes(null)) { out.innerHTML = `<div class="empty">Pick your opponent's two cards, or switch to a range.</div>`; return; }
    const b = board.filter(c => c !== null);
    const job = ++calc.job;
    out.classList.add("busy");
    setTimeout(() => {
      if (job !== calc.job) return;
      let res, nxt = null, label;
      if (calc.mode === "hand") {
        res = E.equityHandVsHand(hero, calc.vil, b, 50000);
        if (b.length === 3 || b.length === 4) nxt = E.nextCardEquities(hero, calc.vil, b);
        label = calc.vil.map(c => cardHTML(c, "sm")).join("");
      } else {
        const r = rangeByKey(calc.rangeKey);
        res = E.equityHandVsRange(hero, r.map, b, 30000);
        label = `<span class="rl">${r.label}</span>`;
      }
      out.classList.remove("busy");
      if (!res) { out.innerHTML = `<div class="empty">Every hand in that range is blocked by the cards shown.</div>`; return; }
      renderCalcResult(res, nxt, b, label);
    }, 10);
  }

  function renderCalcResult(res, nxt, b, label) {
    const hero = calc.hero;
    const desc = handDescription(hero, b);
    const exact = b.length >= 3 && (calc.mode === "hand" || b.length >= 4);
    let html = `
      <div class="eqhead">
        <div><div class="label">Your equity</div><div class="eqbig">${fmt(res.equity)}</div></div>
        <div class="vs">${hero.map(c => cardHTML(c, "sm")).join("")}<span>vs</span>${label}</div>
      </div>
      <div class="split" role="img" aria-label="Win ${fmt(res.win)}, tie ${fmt(res.tie)}, lose ${fmt(res.lose)}">
        <span style="width:${res.win * 100}%;background:var(--red)"></span><span style="width:${res.tie * 100}%;background:var(--call)"></span><span style="width:${res.lose * 100}%;background:var(--fold)"></span>
      </div>
      <div class="stats"><span><i class="sw" style="background:var(--red)"></i>Win <b>${fmt(res.win)}</b></span><span><i class="sw" style="background:var(--call)"></i>Tie <b>${fmt(res.tie)}</b></span><span><i class="sw" style="background:var(--fold);outline:1px solid var(--line)"></i>Lose <b>${fmt(res.lose)}</b></span></div>
      <div class="note" style="border:0;padding:0">${exact ? "Exact: every remaining card combination was counted." : `Estimated from ${res.samples.toLocaleString("en")} random run-outs (accurate to about ±0.5%).`}</div>`;
    if (desc) html += `<div class="infobox"><div class="label">Your hand now</div><p><strong>${desc.made}</strong>${desc.draws.length ? ` with ${desc.draws.join(" and ")}` : ""}</p></div>`;
    if (nxt) {
      const turnNow = b.length === 4;
      const base = res.equity;
      if (turnNow) {
        const wins = nxt.filter(x => x.win === 1), ties = nxt.filter(x => x.tie === 1);
        if (base < 0.5) {
          html += `<div class="infobox"><div class="label">Your outs on the river</div><p>${wins.length} card${wins.length === 1 ? "" : "s"} win${wins.length === 1 ? "s" : ""} it for you${ties.length ? ` and ${ties.length} give${ties.length === 1 ? "s" : ""} a split` : ""}. ${wins.length}/44 = ${fmt(wins.length / 44)}. The rule of 2 says about ${wins.length * 2}%.</p><div class="chips">${wins.map(x => cardHTML(x.card, "xs")).join("")}</div></div>`;
        } else {
          const lose = nxt.filter(x => x.lose === 1);
          html += `<div class="infobox"><div class="label">Cards that beat you on the river</div><p>You are ahead. ${lose.length} of 44 river cards would lose you the pot.</p><div class="chips">${lose.map(x => cardHTML(x.card, "xs")).join("")}</div></div>`;
        }
      } else {
        const good = nxt.filter(x => x.equity >= 0.5).sort((a, c) => c.equity - a.equity);
        const bad = nxt.filter(x => x.equity < 0.5);
        if (base < 0.5) html += `<div class="infobox"><div class="label">Turn cards that put you ahead</div><p>${good.length} of 45 turn cards make you the favourite. The rule of 4 with ${good.length} outs estimates ${good.length * 4}% by the river.</p><div class="chips">${good.map(x => cardHTML(x.card, "xs")).join("")}</div></div>`;
        else html += `<div class="infobox"><div class="label">Turn cards that put you behind</div><p>You are the favourite now. ${bad.length} of 45 turn cards would make you an underdog.</p><div class="chips">${bad.map(x => cardHTML(x.card, "xs")).join("")}</div></div>`;
      }
    }
    if (calc.mode === "range" && b.length >= 3) {
      const prof = E.rangeProfile(rangeByKey(calc.rangeKey).map, [...b, ...hero]);
      html += `<div class="infobox"><div class="label">What their range has on this board</div>${profileBars([{ name: "Their range", prof }])}</div>`;
    }
    $("pc-result").innerHTML = html;
  }

  const BUCKET_COLORS = ["var(--red)", "#f08a8c", "#c9c7ca", "#7d7e87", "#34343a"];
  function profileBars(rows) {
    return `<div class="profile">${rows.map(r => `
        <div class="prof-row"><span class="pn">${r.name}</span><span class="pbar">${r.prof.buckets.map((x, i) => `<span style="width:${x * 100}%;background:${BUCKET_COLORS[i]}" title="${E.BUCKETS[i]}: ${fmt(x)}"></span>`).join("")}</span></div>`).join("")}
      <table class="ptable"><thead><tr><th></th>${rows.map(r => `<th>${r.name}</th>`).join("")}</tr></thead><tbody>
      ${E.BUCKETS.map((bn, i) => `<tr><td><i class="sw" style="background:${BUCKET_COLORS[i]}"></i>${bn}</td>${rows.map(r => `<td>${fmt(r.prof.buckets[i])}</td>`).join("")}</tr>`).join("")}
      </tbody></table></div>`;
  }

  function initCalc() {
    const sel = $("pc-range");
    sel.innerHTML = RANGES.map(r => `<option value="${r.key}">${r.label} (${fmt(rangeSize(r.map))})</option>`).join("");
    sel.value = calc.rangeKey;
    sel.onchange = () => { calc.rangeKey = sel.value; computeCalc(); };
    document.querySelectorAll("[data-opp]").forEach(b => b.onclick = () => {
      calc.mode = b.dataset.opp; calc.active = nextEmpty("h0"); renderCalcInputs(); computeCalc();
    });
    $("pc-rand-hand").onclick = () => {
      const d = shuffledDeck(calc.board.filter(c => c !== null));
      calc.hero = [d[0], d[1]]; if (calc.mode === "hand") calc.vil = [d[2], d[3]];
      calc.active = nextEmpty("b0"); renderCalcInputs(); computeCalc();
    };
    $("pc-rand-flop").onclick = () => {
      const d = shuffledDeck([...calc.hero, ...(calc.mode === "hand" ? calc.vil : [])].filter(c => c !== null));
      calc.board = [d[0], d[1], d[2], null, null]; calc.active = "b3"; renderCalcInputs(); computeCalc();
    };
    $("pc-clear-board").onclick = () => { calc.board = [null, null, null, null, null]; calc.active = "b0"; renderCalcInputs(); computeCalc(); };
    $("pc-clear").onclick = () => { calc.hero = [null, null]; calc.vil = [null, null]; calc.board = [null, null, null, null, null]; calc.active = "h0"; renderCalcInputs(); computeCalc(); };
    renderCalcInputs(); computeCalc();
  }

  /* ================= 2. BOARD EXPLORER ================= */
  const MATCHES = [
    { label: "BTN opens, BB calls", opener: "BTN", caller: "BB", rfi: "BTN", vs: "BB vs BTN" },
    { label: "CO opens, BTN calls", opener: "CO", caller: "BTN", rfi: "CO", vs: "BTN vs CO" },
    { label: "UTG opens, BB calls", opener: "UTG", caller: "BB", rfi: "UTG", vs: "BB vs UTG" },
    { label: "UTG opens, CO calls", opener: "UTG", caller: "CO", rfi: "UTG", vs: "CO vs UTG" }
  ];
  const PRESETS = [
    ["A-high dry", "As 8d 3c"], ["K-high dry", "Kd 7s 2c"], ["Broadway wet", "Jh Th 9c"],
    ["Low connected", "6h 5h 4c"], ["Paired", "Ts Td 4c"], ["Monotone", "Qs 8s 4s"]
  ];
  const bx = { match: 0, flop: E.parseCards("Kd 7s 2c"), active: null, job: 0 };

  function renderBx() {
    $("bx-match").innerHTML = MATCHES.map((m, i) => `<button class="chip" aria-pressed="${i === bx.match}" data-m="${i}">${m.label}</button>`).join("");
    $("bx-match").querySelectorAll("[data-m]").forEach(b => b.onclick = () => { bx.match = +b.dataset.m; renderBx(); computeBx(); });
    $("bx-presets").innerHTML = PRESETS.map(([l, cs]) => `<button class="chip" data-p="${cs}">${l}</button>`).join("") + `<button class="chip" id="bx-rand">Random flop</button>`;
    $("bx-presets").querySelectorAll("[data-p]").forEach(b => b.onclick = () => { bx.flop = E.parseCards(b.dataset.p); bx.active = null; renderBx(); computeBx(); });
    $("bx-rand").onclick = () => { const d = shuffledDeck([]); bx.flop = [d[0], d[1], d[2]]; bx.active = null; renderBx(); computeBx(); };
    $("bx-flop").innerHTML = [0, 1, 2].map(i => slotHTML("f" + i, bx.flop[i] ?? null, "Flop", bx.active === i)).join("");
    $("bx-flop").querySelectorAll(".slot").forEach(b => b.onclick = () => {
      const i = +b.dataset.slot[1];
      bx.flop[i] = null; bx.active = i; renderBx(); computeBx();
    });
    $("bx-picker-wrap").hidden = !bx.flop.some(c => c === null || c === undefined);
    renderPicker($("bx-picker"), bx.flop, c => {
      let i = bx.active; if (i === null || bx.flop[i] != null) i = [0, 1, 2].find(j => bx.flop[j] == null);
      if (i === undefined) return;
      bx.flop[i] = c; bx.active = [0, 1, 2].find(j => bx.flop[j] == null) ?? null; renderBx(); computeBx();
    });
  }

  function computeBx() {
    const out = $("bx-result");
    if (bx.flop.length < 3 || bx.flop.some(c => c === null || c === undefined)) { out.innerHTML = `<div class="empty">Pick three flop cards, or choose a preset above.</div>`; return; }
    const m = MATCHES[bx.match];
    const vsIdx = VS.findIndex(v => v.id === m.vs);
    const openMap = parse(RFI[m.rfi].raise);
    const rng = getRange({ mode: "vs", vs: vsIdx }), callMap = {};
    ALL_HANDS.forEach(h => { const f = freqs(rng, h); if (f.call > 0) callMap[h] = f.call; });
    const job = ++bx.job;
    out.classList.add("busy");
    setTimeout(() => {
      if (job !== bx.job) return;
      const board = bx.flop.slice();
      const eq = E.equityRangeVsRange(openMap, callMap, board, 30000);
      const pa = E.rangeProfile(openMap, board), pb = E.rangeProfile(callMap, board);
      const t = E.texture(board);
      out.classList.remove("busy");
      const eA = eq.equity, strongA = pa.buckets[0], strongB = pb.buckets[0];
      const nut = strongA - strongB;
      const rangeAdv = eA >= 0.56 ? `${m.opener} has a clear range advantage` : eA >= 0.52 ? `${m.opener} has a small range advantage` : eA > 0.48 ? "Neither player has a real range advantage" : `${m.caller} has the range advantage`;
      const nutAdv = nut >= 0.03 ? `${m.opener} has more strong hands` : nut <= -0.03 ? `${m.caller} has more strong hands` : "Both ranges have a similar share of strong hands";
      const tips = [];
      if (t.paired) tips.push("Paired boards are hard to connect with, so the preflop raiser can usually bet small and often.");
      if (t.maxSuit === 3) tips.push("Monotone boards shrink everyone's edge. Bets tend to be smaller and less frequent, and holding the ace of the suit matters a lot.");
      if (eA >= 0.52 && nut > -0.02 && t.wetness === "Dry" && !t.paired) tips.push(`This is a good board for ${m.opener} to continuation-bet very often with a small size, around a third of the pot.`);
      if (nut >= 0.03 && t.wetness !== "Dry") tips.push(`With more strong hands on a board where the next cards change a lot, ${m.opener} can use bigger bets (two-thirds pot or more) with a more selective range.`);
      if (eA < 0.52 || nut <= -0.03) tips.push(`${m.caller} connects well here. Expect ${m.opener} to check much more often and ${m.caller} to fight back with check-raises.`);
      if (!tips.length) tips.push(`A mixed board. ${m.opener} usually bets part of the range and checks the rest, often with a medium size.`);
      out.innerHTML = `
        <div class="tags">${[t.highText + " card", t.suitText, t.conn, t.wetness].map(x => `<span class="tag2">${x}</span>`).join("")}</div>
        <div>
          <div class="label" style="margin-bottom:6px">Range equity</div>
          <div class="split tall"><span style="width:${eA * 100}%;background:var(--red)">${m.opener} ${fmt(eA)}</span><span style="width:${(1 - eA) * 100}%;background:var(--call);justify-content:flex-end">${fmt(1 - eA)} ${m.caller}</span></div>
        </div>
        <div><div class="label" style="margin-bottom:6px">How each range hits this flop</div>
        ${profileBars([{ name: `${m.opener} (opener)`, prof: pa }, { name: `${m.caller} (caller)`, prof: pb }])}</div>
        <div class="infobox">
          <div class="label">What this means</div>
          <p><strong>${rangeAdv}</strong> (${fmt(eA)} equity). <strong>${nutAdv}</strong>: ${fmt(strongA)} vs ${fmt(strongB)} two pair or better.</p>
          <ul class="tips">${tips.map(x => `<li>${x}</li>`).join("")}</ul>
          <p class="note" style="border:0;padding:0">The numbers are calculated from Falcon's preflop ranges. The tips are general tendencies from solver studies, not a solved strategy for this exact flop. The opener's range includes hands that would have 4-bet, which slightly overstates it.</p>
        </div>`;
    }, 10);
  }

  /* ================= 3. EQUITY QUIZ ================= */
  const qz = { mode: "eq", cur: null, answered: false, n: 0, err: 0, good: 0 };
  function dealQuiz() {
    let tries = 0, cur;
    do {
      tries++;
      const d = shuffledDeck([]);
      const turn = qz.mode === "cf" ? true : Math.random() < 0.5;
      cur = { hero: [d[0], d[1]], vil: [d[2], d[3]], board: d.slice(4, turn ? 8 : 7) };
      cur.res = E.equityHandVsHand(cur.hero, cur.vil, cur.board);
      const e = cur.res.equity;
      const ok = e > 0.06 && e < 0.94 && (e < 0.5 || Math.random() < 0.45);
      if (ok) break;
    } while (tries < 80);
    if (qz.mode === "cf") {
      const sizes = [0.33, 0.5, 0.75, 1, 1.5];
      cur.pot = [20, 30, 40, 60, 80, 100, 120][(Math.random() * 7) | 0];
      cur.bet = Math.round(cur.pot * sizes[(Math.random() * sizes.length) | 0]);
    }
    qz.cur = cur; qz.answered = false; renderQuiz();
  }
  function renderQuiz() {
    const c = qz.cur;
    document.querySelectorAll("[data-qm]").forEach(b => b.setAttribute("aria-pressed", b.dataset.qm === qz.mode));
    const street = c.board.length === 3 ? "flop" : "turn";
    $("qz-table").innerHTML = `
      <div class="qhands">
        <div><div class="label">You</div><div class="cardrow">${c.hero.map(x => cardHTML(x)).join("")}</div></div>
        <div><div class="label">Opponent (shown)</div><div class="cardrow">${c.vil.map(x => cardHTML(x)).join("")}</div></div>
      </div>
      <div><div class="label">Board · ${street}</div><div class="cardrow">${c.board.map(x => cardHTML(x)).join("")}</div></div>`;
    if (qz.mode === "eq") {
      $("qz-ask").innerHTML = `
        <p class="sit">What is your equity, the chance you win by the river?</p>
        <div class="calc" style="width:100%">
          <div class="ctrl"><label for="qz-guess">Your guess <b id="qz-gv">40%</b></label>
          <input type="range" id="qz-guess" min="0" max="100" step="1" value="40"></div>
          <button class="btn primary" id="qz-lock">Lock in guess</button>
        </div>`;
      const g = $("qz-guess");
      g.oninput = () => { $("qz-gv").textContent = g.value + "%"; };
      $("qz-lock").onclick = () => answerQuiz(+g.value / 100);
    } else {
      $("qz-ask").innerHTML = `
        <p class="sit">The pot is <b>${c.pot}</b>. Your opponent bets <b>${c.bet}</b> on the turn. Assume nobody bets the river. Call or fold?</p>
        <div class="acts"><button class="act fold" id="qz-fold">Fold<kbd>F</kbd></button><button class="act call" id="qz-call">Call ${c.bet}<kbd>C</kbd></button></div>`;
      $("qz-fold").onclick = () => answerQuiz("fold");
      $("qz-call").onclick = () => answerQuiz("call");
    }
    $("qz-fb").innerHTML = "";
  }
  function answerQuiz(ans) {
    if (qz.answered) return;
    qz.answered = true;
    const c = qz.cur, eq = c.res.equity;
    const nxt = E.nextCardEquities(c.hero, c.vil, c.board);
    let outsHTML = "";
    if (c.board.length === 4) {
      const wins = nxt.filter(x => x.win === 1);
      if (eq < 0.5) outsHTML = `<p>You have <strong>${wins.length} outs</strong> on the river: ${wins.length}/44 = ${fmt(wins.length / 44)}. The rule of 2 says ${wins.length * 2}%.</p><div class="chips">${wins.map(x => cardHTML(x.card, "xs")).join("")}</div>`;
      else { const lose = nxt.filter(x => x.lose === 1); outsHTML = `<p>You are ahead. Your opponent has ${lose.length} outs.</p><div class="chips">${lose.map(x => cardHTML(x.card, "xs")).join("")}</div>`; }
    } else {
      const good = nxt.filter(x => x.equity >= 0.5);
      outsHTML = eq < 0.5
        ? `<p>${good.length} turn cards put you ahead. The rule of 4 with ${good.length} outs estimates ${good.length * 4}%.</p><div class="chips">${good.map(x => cardHTML(x.card, "xs")).join("")}</div>`
        : `<p>You are the favourite. ${45 - good.length} turn cards would put you behind.</p>`;
    }
    let head, grade, body;
    qz.n++;
    if (qz.mode === "eq") {
      const err = Math.abs(ans - eq) * 100;
      qz.err += err;
      grade = err <= 5 ? "good" : err <= 12 ? "ok" : "bad";
      if (grade === "good") qz.good++;
      head = grade === "good" ? "Spot on" : grade === "ok" ? "Close" : "Off";
      body = `<p>You guessed ${Math.round(ans * 100)}%. Your real equity is <strong>${fmt(eq)}</strong>, so you were ${err.toFixed(1)} points away.</p>`;
    } else {
      const need = c.bet / (c.pot + 2 * c.bet);
      const ev = eq * (c.pot + 2 * c.bet) - c.bet;
      const right = Math.abs(ev) < 0.05 ? true : (ev > 0 ? "call" : "fold") === ans;
      grade = right ? "good" : "bad";
      if (right) qz.good++;
      head = right ? "Correct" : "Mistake";
      body = `<p>You need <strong>${fmt(need)}</strong> equity to call ${c.bet} into a final pot of ${c.pot + 2 * c.bet}. You have <strong>${fmt(eq)}</strong>.</p>
        <p>Calling is worth <strong>${ev >= 0 ? "+" : ""}${ev.toFixed(1)} chips</strong> on average compared to folding, so the right play is to <strong>${ev >= 0 ? "call" : "fold"}</strong>.</p>`;
    }
    const color = { good: "var(--good)", ok: "var(--warn)", bad: "var(--red)" }[grade];
    $("qz-fb").innerHTML = `
      <div class="fb ${grade}">
        <div class="head"><span class="dot" style="background:${color}"></span>${head}</div>
        ${body}${outsHTML}
        <div class="btns"><button class="btn primary" id="qz-next">Next spot <span style="opacity:.6;font-weight:500">(Enter)</span></button>
        <button class="btn" id="qz-open">Open in calculator</button></div>
      </div>`;
    if ($("qz-lock")) $("qz-lock").disabled = true;
    document.querySelectorAll("#qz-ask .act").forEach(b => b.disabled = true);
    $("qz-next").onclick = dealQuiz;
    $("qz-open").onclick = () => {
      calc.hero = c.hero.slice(); calc.vil = c.vil.slice(); calc.mode = "hand";
      calc.board = [...c.board, null, null].slice(0, 5); calc.active = nextEmpty("b0");
      setSub("calc"); renderCalcInputs(); computeCalc(); window.scrollTo({ top: 0 });
    };
    $("qz-next").focus({ preventScroll: true });
    $("qz-n").textContent = qz.n;
    $("qz-acc").textContent = Math.round(qz.good / qz.n * 100) + "%";
    $("qz-err").textContent = qz.mode === "eq" && qz.n ? (qz.err / Math.max(1, qz.n)).toFixed(1) : "–";
  }

  /* ---------- Sub-tabs ---------- */
  let sub = "calc";
  function setSub(s) {
    sub = s;
    ["calc", "board", "quiz"].forEach(k => {
      $("pf-" + k).hidden = k !== s;
      document.querySelector(`[data-sub="${k}"]`).setAttribute("aria-pressed", k === s);
    });
    if (s === "board" && !$("bx-result").innerHTML) { renderBx(); computeBx(); }
    if (s === "quiz" && !qz.cur) dealQuiz();
  }

  window.Postflop = {
    init() {
      document.querySelectorAll("[data-sub]").forEach(b => b.onclick = () => setSub(b.dataset.sub));
      document.querySelectorAll("[data-qm]").forEach(b => b.onclick = () => {
        qz.mode = b.dataset.qm; qz.n = 0; qz.err = 0; qz.good = 0;
        $("qz-n").textContent = "0"; $("qz-acc").textContent = "–"; $("qz-err").textContent = "–";
        dealQuiz();
      });
      initCalc();
      setSub("calc");
    },
    key(e) {
      if (sub !== "quiz") return false;
      const k = e.key.toLowerCase();
      if (qz.answered && (k === "enter" || k === " " || k === "n")) { dealQuiz(); return true; }
      if (!qz.answered && qz.mode === "cf" && (k === "f" || k === "c")) { answerQuiz(k === "c" ? "call" : "fold"); return true; }
      if (!qz.answered && qz.mode === "eq" && k === "enter") { answerQuiz(+$("qz-guess").value / 100); return true; }
      return false;
    }
  };
})();
