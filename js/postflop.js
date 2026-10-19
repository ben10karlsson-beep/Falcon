/* 169 Poker postflop: equity calculator and board explorer (Postflop tab), plus the Hand vs hand quiz, range trainer and c-bet trainer (Trainer tab).
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
        <span style="width:${res.win * 100}%;background:var(--win)"></span><span style="width:${res.tie * 100}%;background:var(--tie)"></span><span style="width:${res.lose * 100}%;background:var(--fold)"></span>
      </div>
      <div class="stats"><span><i class="sw" style="background:var(--win)"></i>Win <b>${fmt(res.win)}</b></span><span><i class="sw" style="background:var(--tie)"></i>Tie <b>${fmt(res.tie)}</b></span><span><i class="sw" style="background:var(--fold);outline:1px solid var(--line)"></i>Lose <b>${fmt(res.lose)}</b></span></div>
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

  // Strong to nothing: raise colour, its pale tint, pale call colour, call colour, bare grey
  const BUCKET_COLORS = ["var(--magenta)", "var(--bet-small)", "#a8c1ff", "var(--ultra)", "var(--nothing)"];
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
  /* Board explorer spots: the preflop aggressor's range against the caller's.
     Single-raised pots use the charts above; 3-bet pots use the 3-bet charts and the opener's facing-a-3-bet calls.
     Pot = both players' bets plus any blind that folded; 100bb stacks. */
  const BX = [
    ...MATCHES.map(m => {
      const pot = 5 + (m.caller === "BB" ? 0.5 : 1.5);
      return { group: "Single-raised pot", label: m.label, agg: m.opener, caller: m.caller, aggRole: "opener", callRole: "caller",
        aggKey: "rfi:" + m.rfi, callKey: "call:" + m.vs, pot, behind: 97.5 };
    }),
    ...V3.map(v => {
      const b3 = threeBetSize(v.vil), dead = (v.vil === "BB" ? 0 : 1) + (v.vil === "SB" ? 0 : 0.5);
      return { group: "3-bet pot", label: `${v.vil} 3-bets ${v.hero}, ${v.hero} calls`, agg: v.vil, caller: v.hero, aggRole: "3-bettor", callRole: "opener",
        aggKey: "3bet:" + v.vs, callKey: "call3:" + v.id, pot: 2 * b3 + dead, behind: 100 - b3 };
    })
  ];
  const bx = { match: 0, board: [...E.parseCards("Kd 7s 2c"), null, null], active: null, job: 0 };

  /* Solved flops (solved.js, from TexasSolver) for BTN opens, BB calls. A flop matches a solved one if it is
     the same up to relabelling suits; any other flop borrows the closest solved flop by texture. */
  const SOLVED = window.Solved || null;
  const isSolvedSpot = m => SOLVED && m.group === "Single-raised pot" && m.agg === "BTN" && m.caller === "BB";
  const { SUIT_PERMS, flopKey, SOLVED_FLOPS, solvedFor } = window.PlayCore; // shared with play mode (play-core.js)
  const flopText = cards => cards.map(c => { const r = E.RANKS[E.rankOf(c)]; return (r === "T" ? "10" : r) + E.SUIT_SYMBOL[E.suitOf(c)]; }).join(" ");
  const ACT_COLORS = ["var(--call)", "var(--bet-small)", "var(--raise)"];
  const ACT_NAMES = ["Check", "Bet 33%", "Bet 75%"];
  function actSplit(mix, names) {
    return `<div class="split tall">${mix.map((x, i) => x > 0.005 ? `<span style="width:${x * 100}%;background:${ACT_COLORS[i]}${i === 1 ? ";color:var(--card-ink)" : ""}" title="${names[i]}: ${fmt(x)}">${x >= 0.14 ? fmt(x) : ""}</span>` : "").join("")}</div>`;
  }

  // The "why" text must describe the flop the strategy came from, so a borrowed flop gets its own equity and strong-hand gap
  function solvedAdvantage(sv, openMap, callMap, eA, nut) {
    if (sv.exact) return [eA, nut];
    const b = sv.flop.cards;
    return [E.equityRangeVsRange(openMap, callMap, b, 30000).equity, E.rangeProfile(openMap, b).buckets[0] - E.rangeProfile(callMap, b).buckets[0]];
  }

  /* The solver section for BTN vs BB: BTN's c-bet mix, the mix by hand type, BB's answers, and why */
  function solvedHTML(sv, eA, nut) {
    const f = sv.flop, [chk, sm, bg] = f.btn, bet = sm + bg;
    const legend = `<div class="legend">${ACT_NAMES.map((n, i) => `<span><i class="sw" style="background:${ACT_COLORS[i]}"></i>${n} ${fmt(f.btn[i])}</span>`).join("")}</div>`;
    const rows = f.byHand.map((r, i) => ({ name: E.BUCKETS[i], share: r[0], mix: r.slice(1) })).filter(r => r.share >= 0.005);
    const table = `<table class="ptable"><thead><tr><th>Hand type</th><th>Of range</th>${ACT_NAMES.map(n => `<th>${n}</th>`).join("")}</tr></thead><tbody>
      ${rows.map(r => `<tr><td>${r.name}</td><td>${fmt(r.share)}</td>${r.mix.map(x => `<td>${fmt(x)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    // A pure bluff of size b (fraction of the pot) breaks even when the opponent folds b / (1 + b) of the time
    const need = b => b / (1 + b);
    const resp = (label, r, b) => `<tr><td>${label}</td><td>${fmt(r[0])}</td><td>${fmt(r[1])}</td><td>${fmt(r[2])}</td><td>${fmt(need(b))}</td></tr>`;
    const bbTable = `<table class="ptable"><thead><tr><th>BB facing</th><th>Fold</th><th>Call</th><th>Raise</th><th>Bluff needs</th></tr></thead><tbody>
      ${resp("Bet 33%", f.vsSmall, 0.33)}${resp("Bet 75%", f.vsBig, 0.75)}</tbody></table>`;

    const why = [];
    const strong = f.byHand[0], weak = f.byHand[2];
    const edge = eA >= 0.52 ? `BTN has the range advantage (${fmt(eA)} equity)` : `BB's range connects well with this flop (BTN has only ${fmt(eA)} equity)`;
    if (bet >= 0.6 && sm >= 2 * bg) why.push(`<strong>Small and often.</strong> BTN bets ${fmt(bet)} of the time, mostly a third of the pot. ${eA >= 0.52 ? edge : "BTN's range holds up well here"}${nut > -0.02 ? " and BB doesn't have more strong hands" : ""}, so a cheap bet works with almost the whole range: BB's many weak hands have to fold or call with little equity, and BTN risks little when it is behind.`);
    else if (bg >= 1.5 * sm && bg >= 0.25) why.push(`<strong>Bet big or check.</strong> BTN bets three quarters of the pot ${fmt(bg)} of the time and checks ${fmt(chk)}. ${edge}. ${strong[0] >= 0.005 ? `Strong hands bet big ${fmt(strong[3])} of the time` : "The best hands bet big"}, balanced by draws and some air. Medium hands${weak[0] >= 0.005 ? ` (weaker pairs check ${fmt(weak[1])})` : ""} mostly check, because a big bet gets called mainly by better hands and folds out the worse ones.`);
    else if (chk >= 0.5) why.push(`<strong>Check a lot.</strong> BTN checks ${fmt(chk)} of the time. ${eA < 0.52 ? `${edge}${nut <= -0.02 ? " and BB has more strong hands" : ""}, so betting the whole range would get check-raised often.` : "Neither player has many strong hands here, so most of BTN's hands gain little from betting and are happy to see a free turn."} BTN keeps some strong hands in the checking range, so BB cannot attack the check freely.`);
    else if (sm >= 2 * bg) why.push(`<strong>Bet small with part of the range.</strong> BTN bets ${fmt(bet)} of the time, mostly a third of the pot, and checks ${fmt(chk)}. ${edge}, which is enough to bet often but not with everything. The table above shows which hand types bet and which check.`);
    else why.push(`<strong>A mixed strategy.</strong> BTN bets ${fmt(bet)} of the time (${fmt(sm)} small, ${fmt(bg)} big) and checks ${fmt(chk)}. ${edge}. No single size fits the whole range here, so BTN splits it: the table above shows which hand types bet small, bet big or check.`);
    if (sm > 0.1 && bg > 0.1) why.push(`Both sizes are used. When the solver mixes sizes, the two options are often close in value, so how often BTN bets matters more than which size it picks.`);
    why.push(f.vsSmall[0] >= need(0.33)
      ? `BB folds ${fmt(f.vsSmall[0])} against the small bet. A pure bluff of a third of the pot only needs to work ${fmt(need(0.33))} of the time (bet ÷ (pot + bet)), so a small bet makes money from folds alone, even with BTN's worst hands.`
      : `BB folds only ${fmt(f.vsSmall[0])} against the small bet, less than the ${fmt(need(0.33))} a pure bluff of a third of the pot needs (bet ÷ (pot + bet)). So BTN's bets here lean on hands with some equity, not pure air.`);

    return `<div>
        <div class="label" style="margin-bottom:6px">Solver: BTN after BB checks</div>
        ${sv.exact ? "" : `<p class="hint" style="margin-bottom:6px">This exact flop isn't solved. Showing the closest solved flop, <strong>${flopText(f.cards)}</strong> (${f.family.toLowerCase()}), as a guide. <button class="linkbtn" id="bx-go-solved">Open that flop</button></p>`}
        ${actSplit(f.btn, ACT_NAMES)}${legend}
      </div>
      <div><div class="label" style="margin-bottom:6px">BTN's strategy by hand type</div>${table}</div>
      <div><div class="label" style="margin-bottom:6px">How BB answers each bet</div>${bbTable}</div>
      <div class="infobox">
        <div class="label">Why</div>
        <ul class="tips">${why.map(x => `<li>${x}</li>`).join("")}</ul>
        <p class="note" style="border:0;padding:0">Solved with TexasSolver using 169 Poker's BTN opening and BB calling charts, 97.5bb behind, to within about 0.5% of the pot. BTN could check or bet 33% or 75% of the pot, BB could call, check-raise or fold. A different preflop chart or other bet sizes would change the numbers somewhat. Range equity and the hand bars above are for the flop you picked.</p>
      </div>`;
  }

  /* Turn and river: what kind of card arrived, and what it did to each range */
  function straightPossible(cards) {
    const rs = new Set(cards.map(E.rankOf));
    for (let lo = -1; lo <= 8; lo++) {
      let n = 0;
      for (let r = lo; r < lo + 5; r++) if (rs.has(r === -1 ? 12 : r)) n++;
      if (n >= 3) return true;
    }
    return false;
  }
  // How many two-card rank holdings (like KT) make a straight with this board: more means more straights are out there
  function straightHoldings(cards) {
    const base = cards.reduce((m, c) => m | 1 << E.rankOf(c), 0);
    let n = 0;
    for (let a = 0; a < 13; a++) for (let b = a; b < 13; b++) {
      let m = base | 1 << a | 1 << b;
      m = m << 1 | (m >> 12 & 1); // bit 0 = ace low
      for (let lo = 0; lo <= 9; lo++) if ((m >> lo & 31) === 31) { n++; break; }
    }
    return n;
  }
  const suitCounts = cards => cards.reduce((n, c) => (n[E.suitOf(c)]++, n), [0, 0, 0, 0]);
  function laterTags(cards) {
    const ranks = cards.map(E.rankOf), top = Math.max(...ranks), maxSuit = Math.max(...suitCounts(cards));
    const pairs = ranks.length - new Set(ranks).size;
    return [
      (top >= 10 ? "High" : top >= 7 ? "Middling" : "Low") + " card",
      maxSuit >= 4 ? "Four to a flush" : maxSuit === 3 ? "Flush possible" : maxSuit === 2 && cards.length === 4 ? "Flush draw possible" : "No flush",
      straightPossible(cards) ? "Straight possible" : "No straight",
      ranks.some(r => ranks.filter(x => x === r).length >= 3) ? "Trips on board" : pairs >= 2 ? "Double paired" : pairs === 1 ? "Paired" : "Unpaired"
    ];
  }
  // Plain facts about the newest card compared with the board before it
  function cardFacts(card, prev) {
    const r = E.rankOf(card), pr = prev.map(E.rankOf), ps = suitCounts(prev)[E.suitOf(card)], facts = [];
    if (r > Math.max(...pr)) facts.push("is an overcard to the board");
    if (pr.includes(r)) facts.push("pairs the board");
    if (ps === 2) facts.push("makes a flush possible (three of a suit)");
    else if (ps >= 3) facts.push("puts four of a suit on the board");
    else if (ps === 1 && prev.length === 3) facts.push("brings a flush draw");
    const sNow = straightHoldings(prev.concat(card)), sPrev = straightHoldings(prev);
    if (sNow > sPrev) facts.push(sPrev ? "adds new straights" : "makes a straight possible");
    return facts.length ? facts : ["doesn't go over the board, pair it or complete a draw"];
  }
  const signed = x => (x >= 0 ? "+" : "−") + Math.abs(x * 100).toFixed(1);
  const STREET = ["flop", "turn", "river"];

  /* Next-card map: the aggressor's range equity after each possible turn (or river), as a 4 × 13 grid like the card picker.
     Computed in small chunks after the main result so the page stays responsive. */
  function nextCardMap(job, m, openMap, callMap, cards, base) {
    const deck = E.remainingDeck(cards), res = new Map(), next = STREET[cards.length - 2];
    let i = 0;
    const step = () => {
      const el = $("bx-next");
      if (job !== bx.job || !el) return;
      for (const end = Math.min(deck.length, i + 7); i < end; i++) res.set(deck[i], E.equityRangeVsRange(openMap, callMap, cards.concat(deck[i]), 15000).equity);
      if (i < deck.length) { el.querySelector(".hint").textContent = `Working out every ${next} card… ${Math.round(i / deck.length * 100)}%`; setTimeout(step, 0); return; }
      renderNextMap(el, m, cards, base, res);
    };
    setTimeout(step, 0);
  }
  function renderNextMap(el, m, cards, base, res) {
    const next = STREET[cards.length - 2];
    let grid = "";
    for (const s of [0, 1, 2, 3]) {
      grid += `<div class="prow">`;
      for (let r = 12; r >= 0; r--) {
        const c = E.card(r, s), eq = res.get(c);
        if (eq === undefined) { grid += `<span class="pk nm-gone" aria-hidden="true"></span>`; continue; }
        const d = eq - base, a = Math.round(Math.min(1, Math.abs(d) / 0.05) * 85);
        const bg = Math.abs(d) < 0.012 ? "var(--surface)" : `color-mix(in srgb,${d > 0 ? "var(--red)" : "var(--call)"} ${a}%,var(--surface))`;
        const name = flopText([c]);
        grid += `<button class="pk ${s === 1 || s === 2 ? "red" : ""} ${a >= 72 ? "on" : ""}" data-c="${c}" style="background:${bg}" title="${name}: ${m.agg} ${fmt(eq)} (${signed(d)})" aria-label="${name}: ${m.agg} equity ${fmt(eq)}, ${signed(d)} points">${E.RANKS[r] === "T" ? "10" : E.RANKS[r]}<i>${E.SUIT_SYMBOL[s]}</i></button>`;
      }
      grid += `</div>`;
    }
    // Summary by rank (averaging the suits takes out most of the sampling noise), plus the flush suit if there is one
    const avg = xs => xs.reduce((t, x) => t + x, 0) / xs.length;
    const byRank = [];
    for (let r = 12; r >= 0; r--) {
      const xs = [0, 1, 2, 3].map(s => res.get(E.card(r, s))).filter(x => x !== undefined);
      if (xs.length) byRank.push({ r, d: avg(xs) - base });
    }
    const rankName = r => ({ 12: "aces", 11: "kings", 10: "queens", 9: "jacks", 8: "10s" }[r] || E.RANKS[r] + "s");
    const sorted = byRank.slice().sort((a, b) => b.d - a.d);
    const best = sorted.filter(x => x.d >= 0.01).slice(0, 2), worst = sorted.filter(x => x.d <= -0.01).reverse().slice(0, 2);
    const say = xs => `<strong>${xs.map(x => rankName(x.r)).join(" and ")}</strong> (${xs.map(x => signed(x.d)).join(" and ")} points for ${m.agg})`;
    const lines = [];
    if (best.length) lines.push(`Best for ${m.agg}: ${say(best)}.`);
    if (worst.length) lines.push(`Best for ${m.caller}: ${say(worst)}.`);
    if (!best.length && !worst.length) lines.push(`No ${next} rank moves range equity by a full point on average.`);
    const sc = suitCounts(cards), fs = sc.findIndex(n => n >= 2);
    if (fs >= 0) {
      const on = [], off = [];
      for (const [c, eq] of res) (E.suitOf(c) === fs ? on : off).push(eq);
      const d = avg(on) - avg(off);
      if (Math.abs(d) >= 0.01) lines.push(`${E.SUIT_SYMBOL[fs]} cards, which ${sc[fs] === 2 ? "make a flush possible" : "add to the flush"}, are ${signed(d)} points for ${m.agg} compared with the other suits.`);
    }
    el.innerHTML = `
      <div class="label" style="margin-bottom:6px">Which ${next} cards help whom</div>
      <p class="hint" style="margin:0 0 8px">${m.agg}'s range equity after each ${next} card, compared with ${fmt(base)} now. Orange cards help ${m.agg}, blue cards help ${m.caller}, and the stronger the colour, the bigger the swing. Click a card to deal it.</p>
      <div class="picker nextmap">${grid}</div>
      <ul class="tips" style="margin-top:10px">${lines.map(x => `<li>${x}</li>`).join("")}</ul>
      <p class="note" style="border:0;padding:0">Each card is estimated from 15,000 random deals, so a single card can be off by up to a point. The rank averages are steadier.</p>`;
    el.querySelectorAll("[data-c]").forEach(b => b.onclick = () => {
      bx.board[cards.length] = +b.dataset.c; bx.active = null; renderBx(); computeBx();
      $("bx-flop").scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }

  function renderBx() {
    const setFlop = cs => { bx.board = [...cs, null, null]; bx.active = null; renderBx(); computeBx(); };
    $("bx-match").innerHTML = ["Single-raised pot", "3-bet pot"].map(g => `<div class="bx-group"><span class="hint">${g}</span><div class="row">${BX.map((m, i) => m.group === g ? `<button class="chip" aria-pressed="${i === bx.match}" data-m="${i}">${m.label}</button>` : "").join("")}</div></div>`).join("");
    $("bx-match").querySelectorAll("[data-m]").forEach(b => b.onclick = () => { bx.match = +b.dataset.m; renderBx(); computeBx(); });
    $("bx-presets").innerHTML = PRESETS.map(([l, cs]) => `<button class="chip" data-p="${cs}">${l}</button>`).join("") + `<button class="chip" id="bx-rand">Random flop</button>`;
    $("bx-presets").querySelectorAll("[data-p]").forEach(b => b.onclick = () => setFlop(E.parseCards(b.dataset.p)));
    $("bx-rand").onclick = () => setFlop(shuffledDeck([]).slice(0, 3));
    const flopFull = bx.board.slice(0, 3).every(c => c != null);
    const solvedSpot = isSolvedSpot(BX[bx.match]);
    $("bx-solved-wrap").hidden = !solvedSpot;
    if (solvedSpot) {
      const cur = flopFull ? flopKey(bx.board.slice(0, 3)) : null;
      $("bx-solved").innerHTML = `<option value="">Pick one of the ${SOLVED_FLOPS.length} solved flops</option>` +
        SOLVED_FLOPS.map((f, i) => `<option value="${i}" ${f.key === cur ? "selected" : ""}>${flopText(f.cards)} · ${f.family}</option>`).join("");
      $("bx-solved").onchange = e => { if (e.target.value !== "") setFlop(SOLVED_FLOPS[+e.target.value].cards.slice()); };
    }
    $("bx-flop").innerHTML = ["Flop", "Flop", "Flop", "Turn", "River"].map((l, i) => slotHTML("f" + i, bx.board[i], l, bx.active === i)).join("");
    $("bx-flop").querySelectorAll(".slot").forEach(b => b.onclick = () => {
      const i = +b.dataset.slot[1];
      // Clearing the turn also clears the river
      if (bx.board[i] != null) { bx.board[i] = null; if (i === 3) bx.board[4] = null; }
      bx.active = i; renderBx(); computeBx();
    });
    // Deal the next street at random, or step back a street
    const hasTurn = bx.board[3] != null, hasRiver = bx.board[4] != null;
    $("bx-streets").innerHTML = !flopFull ? "" :
      (!hasRiver ? `<button class="chip" data-st="deal">Deal a ${hasTurn ? "river" : "turn"}</button>` : "") +
      (hasTurn ? `<button class="chip" data-st="back">Back to the ${hasRiver ? "turn" : "flop"}</button>` : "");
    $("bx-streets").hidden = !flopFull;
    $("bx-streets").querySelectorAll("[data-st]").forEach(b => b.onclick = () => {
      if (b.dataset.st === "deal") bx.board[hasTurn ? 4 : 3] = shuffledDeck(bx.board.filter(c => c != null))[0];
      else bx.board[hasRiver ? 4 : 3] = null;
      bx.active = null; renderBx(); computeBx();
    });
    const target = bx.active != null && bx.board[bx.active] == null ? bx.active : [0, 1, 2].find(j => bx.board[j] == null);
    $("bx-picker-wrap").hidden = target === undefined;
    $("bx-picker-label").textContent = target === 3 ? "Pick the turn" : target === 4 ? "Pick the river" : "Pick a flop card";
    renderPicker($("bx-picker"), bx.board, c => {
      if (target === undefined) return;
      bx.board[target] = c; bx.active = [0, 1, 2].find(j => bx.board[j] == null) ?? null; renderBx(); computeBx();
    });
  }

  /* Flop: range equity, how each range hits, general tips or the solver section. Turn and river: the same plus what the new
     card changed. Flop and turn also get the next-card map. */
  function flopTips(m, board, eA, nut) {
    const t = E.texture(board), tips = [];
    if (t.paired) tips.push("Paired boards are hard to connect with, so the preflop raiser can usually bet small and often.");
    if (t.maxSuit === 3) tips.push("Monotone boards shrink everyone's edge. Bets tend to be smaller and less frequent, and holding the ace of the suit matters a lot.");
    if (eA >= 0.52 && nut > -0.02 && t.wetness === "Dry" && !t.paired) tips.push(`This is a good board for ${m.agg} to continuation-bet very often with a small size, around a third of the pot.`);
    if (nut >= 0.03 && t.wetness !== "Dry") tips.push(`With more strong hands on a board where the next cards change a lot, ${m.agg} can use bigger bets (two-thirds pot or more) with a more selective range.`);
    if (eA < 0.52 || nut <= -0.03) tips.push(`${m.caller} connects well here. Expect ${m.agg} to check much more often and ${m.caller} to fight back with check-raises.`);
    if (m.group === "3-bet pot") tips.push(`In 3-bet pots the stacks are short compared with the pot (SPR ${(m.behind / m.pot).toFixed(1)}), so top pair is often good enough to get all in, and bets tend to be smaller, around a third of the pot.`);
    if (!tips.length) tips.push(`A mixed board. ${m.agg} usually bets part of the range and checks the rest, often with a medium size.`);
    return `<ul class="tips">${tips.map(x => `<li>${x}</li>`).join("")}</ul>
      <p class="note" style="border:0;padding:0">The numbers are calculated from 169 Poker's preflop ranges. The tips are general tendencies from solver studies, not a solved strategy for this exact flop. ${m.group === "3-bet pot" ? "In 3-bet pots the opener's range is the facing-a-3-bet calling chart, and the 3-bettor's range includes hands that would 5-bet." : "The opener's range includes hands that would have 4-bet, which slightly overstates it."}</p>`;
  }
  // What the newest card did, measured against the board one street earlier
  function changeHTML(m, board, openMap, callMap, eA, pa, pb) {
    const street = board.length - 3, prev = board.slice(0, -1), card = board[board.length - 1];
    const eP = E.equityRangeVsRange(openMap, callMap, prev, 30000).equity;
    const paP = E.rangeProfile(openMap, prev), pbP = E.rangeProfile(callMap, prev);
    const d = eA - eP, tp = p => p.buckets[0] + p.buckets[1];
    const who = Math.abs(d) < 0.01 ? `It barely moves range equity: ${m.agg} goes from ${fmt(eP)} to ${fmt(eA)}.`
      : `It helps <strong>${d > 0 ? m.agg : m.caller}</strong>: ${m.agg}'s range equity goes from ${fmt(eP)} to ${fmt(eA)} (${signed(d)} points).`;
    const items = [
      `<strong>The ${flopText([card])} ${cardFacts(card, prev).join(" and ")}.</strong> ${who}`,
      `Top pair or better: ${m.agg} ${fmt(tp(paP))} → ${fmt(tp(pa))}, ${m.caller} ${fmt(tp(pbP))} → ${fmt(tp(pb))}. Two pair or better: ${m.agg} ${fmt(paP.buckets[0])} → ${fmt(pa.buckets[0])}, ${m.caller} ${fmt(pbP.buckets[0])} → ${fmt(pb.buckets[0])}.`,
      d >= 0.01 ? `A ${STREET[street]} that helps the preflop aggressor's range is a good card to keep betting on: ${m.agg}'s range got stronger relative to ${m.caller}'s.`
        : d <= -0.01 ? `A ${STREET[street]} that helps ${m.caller} is a card for ${m.agg} to slow down on: check more, bet a more selective range, and expect ${m.caller} to bet or raise more.`
        : pa.buckets[0] - paP.buckets[0] >= 0.05 && pb.buckets[0] - pbP.buckets[0] >= 0.05
          ? `It hits both ranges about equally. The edge stays where it was, but many more hands are now two pair or better on both sides, so both players have more hands that are happy to play a big pot.`
          : `A card that changes little keeps the ${STREET[street - 1]}'s story going: whoever had the edge before still has it.`
    ];
    if (street === 2) items.push(`On the river nothing is left to draw to: every hand is either made or missed. That is why river bets tend to be strong hands or bluffs, and medium hands check.`);
    return `<ul class="tips">${items.map(x => `<li>${x}</li>`).join("")}</ul>
      <p class="note" style="border:0;padding:0">These are both players' full preflop ranges, as if nobody bet on the ${street === 1 ? "flop" : "flop or turn"}. After a bet and a call both ranges are narrower, so treat the numbers as a starting point.${isSolvedSpot(m) ? " The solver results cover the flop only: go back to the flop to see them." : ""}</p>`;
  }

  function computeBx() {
    const out = $("bx-result");
    $("bx-next").hidden = true;
    if (bx.board.slice(0, 3).some(c => c == null)) { out.innerHTML = `<div class="empty">Pick three flop cards, or choose a preset above.</div>`; return; }
    if (bx.board[4] != null && bx.board[3] == null) { out.innerHTML = `<div class="empty">Pick the turn before the river.</div>`; return; }
    const m = BX[bx.match];
    const openMap = rangeByKey(m.aggKey).map, callMap = rangeByKey(m.callKey).map;
    const job = ++bx.job;
    out.classList.add("busy");
    setTimeout(() => {
      if (job !== bx.job) return;
      const board = bx.board.filter(c => c != null), street = board.length - 3;
      const eA = E.equityRangeVsRange(openMap, callMap, board, 30000).equity;
      const pa = E.rangeProfile(openMap, board), pb = E.rangeProfile(callMap, board);
      out.classList.remove("busy");
      const strongA = pa.buckets[0], strongB = pb.buckets[0], nut = strongA - strongB;
      const rangeAdv = eA >= 0.56 ? `${m.agg} has a clear range advantage` : eA >= 0.52 ? `${m.agg} has a small range advantage` : eA > 0.48 ? "Neither player has a real range advantage" : `${m.caller} has the range advantage`;
      const nutAdv = nut >= 0.03 ? `${m.agg} has more strong hands` : nut <= -0.03 ? `${m.caller} has more strong hands` : "Both ranges have a similar share of strong hands";
      const sv = isSolvedSpot(m) && !street ? solvedFor(board) : null;
      const t = E.texture(board.slice(0, 3));
      const tags = street ? laterTags(board) : [t.highText + " card", t.suitText, t.conn, t.wetness];
      out.innerHTML = `
        <p class="hint bx-pot">${m.group}: pot ${m.pot}bb${street ? " on the flop" : ""}, ${m.behind}bb behind, SPR ${(m.behind / m.pot).toFixed(1)}</p>
        <div class="tags">${tags.map(x => `<span class="tag2">${x}</span>`).join("")}</div>
        <div>
          <div class="label" style="margin-bottom:6px">Range equity on the ${STREET[street]}</div>
          <div class="split tall"><span style="width:${eA * 100}%;background:var(--red)">${m.agg} ${fmt(eA)}</span><span style="width:${(1 - eA) * 100}%;background:var(--call);justify-content:flex-end">${fmt(1 - eA)} ${m.caller}</span></div>
        </div>
        <div><div class="label" style="margin-bottom:6px">How each range hits this ${street ? "board" : "flop"}</div>
        ${profileBars([{ name: `${m.agg} (${m.aggRole})`, prof: pa }, { name: `${m.caller} (${m.callRole})`, prof: pb }])}</div>
        <div class="infobox">
          <div class="label">${street ? `What the ${STREET[street]} changed` : "What this means"}</div>
          <p><strong>${rangeAdv}</strong> (${fmt(eA)} equity). <strong>${nutAdv}</strong>: ${fmt(strongA)} vs ${fmt(strongB)} two pair or better.</p>
          ${street ? changeHTML(m, board, openMap, callMap, eA, pa, pb) : sv ? "" : flopTips(m, board, eA, nut)}
        </div>
        ${sv ? solvedHTML(sv, ...solvedAdvantage(sv, openMap, callMap, eA, nut)) : ""}
`;
      $("bx-next").hidden = street >= 2;
      if (street < 2) $("bx-next").innerHTML = `<p class="hint">Working out every ${STREET[street + 1]} card…</p>`;
      const go = $("bx-go-solved");
      if (go) go.onclick = () => { bx.board = [...sv.flop.cards, null, null]; bx.active = null; renderBx(); computeBx(); };
      if (street < 2) nextCardMap(job, m, openMap, callMap, board, eA);
    }, 10);
  }

  /* ================= 3. HAND VS HAND (equity quiz, lives in the Trainer tab) ================= */
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
      body = `<p>With their bet the pot is ${c.pot + c.bet}, so you need ${c.bet} ÷ (${c.pot + c.bet} + ${c.bet}) = <strong>${fmt(need)}</strong> equity to call. You have <strong>${fmt(eq)}</strong>.</p>
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
      show("postflop");
      calc.hero = c.hero.slice(); calc.vil = c.vil.slice(); calc.mode = "hand";
      calc.board = [...c.board, null, null].slice(0, 5); calc.active = nextEmpty("b0");
      setSub("calc"); renderCalcInputs(); computeCalc(); window.scrollTo({ top: 0 });
    };
    $("qz-next").focus({ preventScroll: true });
    $("qz-n").textContent = qz.n;
    $("qz-acc").textContent = Math.round(qz.good / qz.n * 100) + "%";
    $("qz-err").textContent = qz.mode === "eq" && qz.n ? (qz.err / Math.max(1, qz.n)).toFixed(1) : "–";
  }

  /* ================= 4. RANGE TRAINER (lives in the Trainer tab) ================= */
  /* A real spot from the charts: you hold a hand from your range, the opponent holds their whole range.
     "eq": guess your equity. "cf": you called preflop, the opener bets the flop, call or fold. */
  const rq = { mode: "eq", cur: null, answered: false, n: 0, err: 0, good: 0 };
  const CBET_SIZES = [0.5, 0.75, 1, 1.5];
  function dealRange() {
    const cf = rq.mode === "cf";
    let cur, best = null, tries = 0;
    do {
      tries++;
      const m = MATCHES[(Math.random() * MATCHES.length) | 0], heroOpens = cf ? false : Math.random() < 0.5;
      const openKey = "rfi:" + m.rfi, callKey = "call:" + m.vs;
      const heroMap = rangeByKey(heroOpens ? openKey : callKey).map;
      const vilKey = heroOpens ? callKey : openKey;
      const pool = E.rangeCombos(heroMap, []);
      let r = Math.random() * pool.reduce((s, x) => s + x.w, 0), pick = pool[0];
      for (const x of pool) { r -= x.w; if (r <= 0) { pick = x; break; } }
      const hero = pick.c.slice(), d = shuffledDeck(hero), board = d.slice(0, 3);
      cur = { m, heroOpens, hero, board, vilKey,
        heroSeat: heroOpens ? m.opener : m.caller, vilSeat: heroOpens ? m.caller : m.opener };
      cur.res = E.equityByCombo(hero, rangeByKey(vilKey).map, board);
      const e = cur.res.equity;
      if (!cf) { if (e > 0.12 && e < 0.9 && (e < 0.75 || Math.random() < 0.5)) break; continue; }
      // Both opens are 2.5bb; the small blind's 0.5bb is always dead, and the big blind's 1bb too unless it called
      cur.pot = m.caller === "BB" ? 5.5 : 6.5;
      const sized = CBET_SIZES.map(s => { const bet = Math.round(cur.pot * s * 2) / 2; return { bet, need: bet / (cur.pot + 2 * bet) }; });
      // Prefer bet sizes that put the decision close enough to need some thought
      const near = sized.filter(x => Math.abs(e - x.need) <= 0.12);
      if (near.length) { Object.assign(cur, near[(Math.random() * near.length) | 0]); best = null; break; }
      const closest = sized.reduce((a, x) => Math.abs(e - x.need) < Math.abs(e - a.need) ? x : a);
      const gap = Math.abs(e - closest.need);
      if (!best || gap < best.gap) best = { cur: Object.assign(cur, closest), gap };
    } while (tries < (cf ? 6 : 20));
    rq.cur = best ? best.cur : cur; rq.answered = false; renderRange();
  }
  function renderRange() {
    const c = rq.cur;
    document.querySelectorAll("[data-rm]").forEach(b => b.setAttribute("aria-pressed", b.dataset.rm === rq.mode));
    $("rq-tol").hidden = rq.mode !== "eq";
    const vilDesc = c.heroOpens ? `${c.vilSeat}'s calling range` : `${c.vilSeat}'s opening range`;
    $("rq-table").innerHTML = `
      <div class="qhands">
        <div><div class="label">You · ${c.heroSeat}</div><div class="cardrow">${c.hero.map(x => cardHTML(x)).join("")}</div></div>
        <div><div class="label">Opponent · ${c.vilSeat}</div><div class="cardrow"><span class="mc back" aria-label="unknown card"></span><span class="mc back" aria-label="unknown card"></span></div></div>
      </div>
      <div><div class="label">Flop${rq.mode === "cf" ? ` · pot ${c.pot}bb` : ""}</div><div class="cardrow">${c.board.map(x => cardHTML(x)).join("")}</div></div>`;
    if (rq.mode === "eq") {
      $("rq-ask").innerHTML = `
        <p class="sit">${c.m.opener} opens to 2.5bb and ${c.m.caller} calls. You don't know their cards, so you play against <b>${vilDesc}</b>. Before any flop betting, what is your equity against it?</p>
        <div class="calc" style="width:100%">
          <div class="ctrl"><label for="rq-guess">Your guess <b id="rq-gv">50%</b></label>
          <input type="range" id="rq-guess" min="0" max="100" step="1" value="50"></div>
          <button class="btn primary" id="rq-lock">Lock in guess</button>
        </div>`;
      const g = $("rq-guess");
      g.oninput = () => { $("rq-gv").textContent = g.value + "%"; };
      $("rq-lock").onclick = () => answerRange(+g.value / 100);
    } else {
      $("rq-ask").innerHTML = `
        <p class="sit">${c.m.opener} opens to 2.5bb and you call. The pot is <b>${c.pot}bb</b>, and ${c.m.opener} bets <b>${c.bet}bb</b> on the flop.
        Assume they bet this with <b>${vilDesc}</b> and nobody bets again after you call. Call or fold?</p>
        <div class="acts"><button class="act fold" id="rq-fold">Fold<kbd>F</kbd></button><button class="act call" id="rq-call">Call ${c.bet}bb<kbd>C</kbd></button></div>`;
      $("rq-fold").onclick = () => answerRange("fold");
      $("rq-call").onclick = () => answerRange("call");
    }
    $("rq-fb").innerHTML = "";
  }
  /* Their range split by how it hit the flop: share, your equity against each group, and what each adds */
  function rangeBreakdownHTML(res) {
    const rowsHTML = res.groups.filter(g => g.combos > 0).map(g => {
      const byHc = {};
      res.rows.filter(r => r.bucket === g.bucket).forEach(r => { byHc[r.hc] = (byHc[r.hc] || 0) + r.w; });
      const top = Object.entries(byHc).sort((a, b) => b[1] - a[1]).slice(0, 4).map(x => x[0]).join(", ");
      const share = g.combos / res.combos;
      return `<tr><td class="grp"><i class="sw" style="background:${BUCKET_COLORS[g.bucket]}"></i>${E.BUCKETS[g.bucket]}<span class="sub">${top}</span></td>
        <td>${fmt(share)}<span class="sub">${+g.combos.toFixed(1)} combos</span></td><td>${fmt(g.equity)}</td><td>${fmt(share * g.equity)}</td></tr>`;
    }).join("");
    const bar = res.groups.filter(g => g.combos > 0).map(g => `<span style="width:${g.combos / res.combos * 100}%;background:${BUCKET_COLORS[g.bucket]}" title="${E.BUCKETS[g.bucket]}"></span>`).join("");
    const ahead = res.rows.filter(r => r.equity > 0.5).reduce((t, r) => t + r.w, 0) / res.combos;
    return `
        <div><div class="label" style="margin-bottom:6px">How their range hit this flop (${+res.combos.toFixed(1)} combos after your blockers)</div>
          <span class="pbar">${bar}</span></div>
        <div class="mtable fit"><table>
          <thead><tr><th>They have</th><th>Share</th><th>Your equity</th><th>Adds</th></tr></thead>
          <tbody>${rowsHTML}<tr><td class="grp">Total</td><td>100%</td><td></td><td><strong>${fmt(res.equity)}</strong></td></tr></tbody>
        </table></div>
        <p>Each group's share × your equity against it gives the "Adds" column, and the column sums to your total. You are the favourite against <strong>${fmt(ahead)}</strong> of their combos and the underdog against the rest.</p>`;
  }
  function answerRange(ans) {
    if (rq.answered) return;
    rq.answered = true;
    const c = rq.cur, eq = c.res.equity;
    const you = handDescription(c.hero, c.board);
    const youText = you.made + (you.draws.length ? " with " + you.draws.join(" and ") : "");
    let grade, head, body;
    rq.n++;
    if (rq.mode === "eq") {
      const err = Math.abs(ans - eq) * 100;
      rq.err += err;
      grade = err <= 5 ? "good" : err <= 12 ? "ok" : "bad";
      if (grade === "good") rq.good++;
      head = grade === "good" ? "Spot on" : grade === "ok" ? "Close" : "Off";
      body = `<p>You guessed ${Math.round(ans * 100)}%. Your real equity against ${c.vilSeat}'s range is <strong>${fmt(eq)}</strong>, so you were ${err.toFixed(1)} points away. You have: <strong>${youText}</strong>.</p>`;
    } else {
      const ev = eq * (c.pot + 2 * c.bet) - c.bet, best = ev >= 0 ? "call" : "fold";
      // Within 2 points of the price, the assumptions matter more than the math, so both answers count
      const close = Math.abs(eq - c.need) < 0.02;
      grade = close ? "ok" : ans === best ? "good" : "bad";
      if (grade !== "bad") rq.good++;
      head = close ? "Close either way" : grade === "good" ? "Correct" : "Mistake";
      body = `<p>You have <strong>${youText}</strong>. With their bet the pot is ${c.pot + c.bet}bb, so you need ${c.bet} ÷ (${c.pot + c.bet} + ${c.bet}) = <strong>${fmt(c.need)}</strong> equity to call. Against ${c.vilSeat}'s whole range you have <strong>${fmt(eq)}</strong>.</p>
        <p>Calling is worth <strong>${ev >= 0 ? "+" : "−"}${Math.abs(ev).toFixed(2)}bb</strong> on average compared with folding, so the better play is to <strong>${best}</strong>.${close ? " The gap is under 2 points, so both answers count. In a real game, what you know about this player decides it." : ""}</p>`;
    }
    const color = { good: "var(--good)", ok: "var(--warn)", bad: "var(--red)" }[grade];
    $("rq-fb").innerHTML = `
      <div class="fb ${grade}">
        <div class="head"><span class="dot" style="background:${color}"></span>${head}</div>
        ${body}${rangeBreakdownHTML(c.res)}
        <div class="btns"><button class="btn primary" id="rq-next">Next spot <span style="opacity:.6;font-weight:500">(Enter)</span></button>
        <button class="btn" id="rq-open">Open in calculator</button></div>
      </div>`;
    if ($("rq-lock")) $("rq-lock").disabled = true;
    document.querySelectorAll("#rq-ask .act").forEach(b => b.disabled = true);
    $("rq-next").onclick = dealRange;
    $("rq-open").onclick = () => {
      show("postflop");
      calc.hero = c.hero.slice(); calc.mode = "range"; calc.rangeKey = c.vilKey; $("pc-range").value = c.vilKey;
      calc.board = [...c.board, null, null]; calc.active = "b3";
      setSub("calc"); renderCalcInputs(); computeCalc(); window.scrollTo({ top: 0 });
    };
    $("rq-next").focus({ preventScroll: true });
    $("rq-n").textContent = rq.n;
    $("rq-acc").textContent = Math.round(rq.good / rq.n * 100) + "%";
    $("rq-err").textContent = rq.mode === "eq" ? (rq.err / rq.n).toFixed(1) : "–";
  }

  /* ================= 5. C-BET TRAINER (lives in the Trainer tab) ================= */
  /* BTN opens, BB calls, BB checks the flop: bet or check? Graded per combo against the solver (js/solved-combos.js,
     loaded on first use). Only bet vs check is graded; the solver's two sizes are often close in value, so the size
     is only mentioned when it clearly prefers one. Flops are the 48 solved ones with their suits relabelled at random. */
  const ALPHA = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const cb = { cur: null, answered: false, n: 0, good: 0, streak: 0, loading: false };
  const CB_NEED_SMALL = 0.33 / 1.33;
  let cbEntries = null;
  // Each solved flop's combos as { c: [card, card], mix: [check, small, big], w: BTN's preflop frequency }
  function cbData() {
    if (cbEntries) return cbEntries;
    const open = rangeByKey("rfi:BTN").map;
    cbEntries = SOLVED_FLOPS.map(f => {
      const s = window.SolvedCombos[f.board], list = [];
      for (let i = 0; i < s.length; i += 6) {
        const c = [P(s.slice(i, i + 2)), P(s.slice(i + 2, i + 4))];
        const sm = ALPHA.indexOf(s[i + 4]) / 50, bg = ALPHA.indexOf(s[i + 5]) / 50;
        list.push({ c, mix: [Math.max(0, 1 - sm - bg), sm, bg], w: open[E.handClass(c[0], c[1])] || 0 });
      }
      return list;
    });
    return cbEntries;
  }
  function loadCombos(then) {
    if (window.SolvedCombos) return then();
    if (cb.loading) return;
    cb.loading = true;
    $("cb-ask").innerHTML = `<p class="hint">Loading the solver data…</p>`;
    const s = document.createElement("script");
    s.src = "js/solved-combos.js";
    s.onload = () => { cb.loading = false; then(); };
    s.onerror = () => { cb.loading = false; $("cb-ask").innerHTML = `<p class="hint">Couldn't load the solver data. Check your connection and reload the page.</p>`; };
    document.head.appendChild(s);
  }
  function dealCbet() {
    loadCombos(() => {
      const data = cbData(), fi = (Math.random() * SOLVED_FLOPS.length) | 0, list = data[fi];
      let r = Math.random() * list.reduce((s, x) => s + x.w, 0), pick = list[0];
      for (const x of list) { r -= x.w; if (r <= 0) { pick = x; break; } }
      // Relabel suits at random so the same 48 flops don't always look the same
      const perm = SUIT_PERMS[(Math.random() * SUIT_PERMS.length) | 0], relabel = c => E.card(E.rankOf(c), perm[E.suitOf(c)]);
      const board = SOLVED_FLOPS[fi].cards.map(relabel).sort((a, b) => b - a);
      cb.cur = { fi, flop: SOLVED_FLOPS[fi], board, hero: pick.c.map(relabel), mix: pick.mix, list };
      cb.answered = false; renderCbet();
    });
  }
  function renderCbet() {
    const c = cb.cur;
    $("cb-table").innerHTML = `
      <div class="qhands">
        <div><div class="label">You · BTN</div><div class="cardrow">${c.hero.map(x => cardHTML(x)).join("")}</div></div>
        <div><div class="label">Opponent · BB</div><div class="cardrow"><span class="mc back" aria-label="unknown card"></span><span class="mc back" aria-label="unknown card"></span></div></div>
      </div>
      <div><div class="label">Flop · pot 5.5bb</div><div class="cardrow">${c.board.map(x => cardHTML(x)).join("")}</div></div>`;
    $("cb-ask").innerHTML = `
      <p class="sit">You open the button to 2.5bb and the big blind calls. On the flop, BB checks to you. Bet or check?</p>
      <div class="acts"><button class="act call" id="cb-check">Check<kbd>K</kbd></button><button class="act raise" id="cb-bet">Bet<kbd>B</kbd></button></div>`;
    $("cb-check").onclick = () => answerCbet("check");
    $("cb-bet").onclick = () => answerCbet("bet");
    $("cb-fb").innerHTML = "";
  }
  /* Why the solver plays this hand the way it does, from its equity, its draws and the numbers on this flop */
  function cbetWhy(c, eq, desc) {
    const [chk, sm, bg] = c.mix, bet = sm + bg, f = c.flop, why = [];
    const fold = f.vsSmall[0];
    if (bet >= 0.25 && chk >= 0.25) why.push(`<strong>A close spot.</strong> The solver mixes, which means betting and checking earn about the same with this hand. Either answer is fine here.`);
    if (bet >= 0.5) {
      if (eq >= 0.6) why.push(`<strong>Betting for value.</strong> You have ${fmt(eq)} equity against BB's checking range, so you are ahead of most of it. A bet builds the pot while BB's worse pairs and draws can still call.`);
      else if (desc.draws.length) why.push(`<strong>A semi-bluff.</strong> You have ${fmt(eq)} equity: behind for now, but your draw can improve. Betting can win the pot straight away, and when BB calls you still have outs.`);
      else if (eq >= 0.4) why.push(`<strong>Betting for thin value and protection.</strong> You have ${fmt(eq)} equity, ahead of a good part of BB's range but not most of it. A bet makes BB's overcards and weak draws pay or fold instead of seeing a free card.`);
      else why.push(`<strong>Betting as a bluff.</strong> With ${fmt(eq)} equity this hand rarely wins at showdown, so checking would give up most of the pot. ${fold >= CB_NEED_SMALL
        ? `BB folds ${fmt(fold)} to the small bet, more than the ${fmt(CB_NEED_SMALL)} a third-pot bluff needs to break even, so the bet makes money from folds alone.`
        : `BB folds ${fmt(fold)} to the small bet, a bit less than the ${fmt(CB_NEED_SMALL)} a third-pot bluff needs, but the bet still picks up the hands BB folds and keeps BTN's betting range from being only strong hands.`}`);
    } else if (chk >= 0.5) {
      if (eq >= 0.65) why.push(`<strong>Checking a strong hand.</strong> You have ${fmt(eq)} equity, so a free card rarely hurts you. Checking some strong hands means BTN's checks aren't all weak, so BB can't bet freely on the turn.`);
      else if (desc.draws.length) why.push(`<strong>Taking a free card.</strong> You have ${fmt(eq)} equity and a draw, and checking lets you see the turn for free. BTN can't bet everything on this flop, and checking some draws means its checks aren't only give-ups.`);
      else if (eq >= 0.4) why.push(`<strong>A medium hand checks.</strong> With ${fmt(eq)} equity you win at showdown fairly often, but a bet would mostly get called by better hands and fold out worse ones. Checking keeps the pot small and takes a free look at the turn.`);
      else why.push(`<strong>Giving up for now.</strong> You have ${fmt(eq)} equity and few ways to improve. BTN can't bet everything on this flop, and it picks its bluffs from hands with more backup, like draws. Checking sees a free turn card.`);
    }
    const bucket = E.classifyFlop(c.hero, c.board), row = f.byHand[bucket], rb = row[2] + row[3];
    why.push(`On this flop BTN bets ${fmt(f.btn[1] + f.btn[2])} of its whole range. Hands like yours (${E.BUCKETS[bucket].toLowerCase()}) bet ${fmt(rb)} of the time.`);
    // Same hand class, different suits: point out when the exact suits change the answer
    const hc = E.handClass(c.hero[0], c.hero[1]), heroClassCombos = c.list.filter(x => E.handClass(x.c[0], x.c[1]) === hc);
    if (heroClassCombos.length > 1) {
      const avg = heroClassCombos.reduce((s, x) => s + x.mix[1] + x.mix[2], 0) / heroClassCombos.length;
      if (Math.abs(avg - bet) >= 0.2) why.push(`Your exact suits matter here: across all ${heroClassCombos.length} ${hc} combos on this flop the solver bets ${fmt(avg)}, but with these suits it bets ${fmt(bet)}. Flush draws and holding (or blocking) a card of the board's suit change the answer.`);
    }
    return why;
  }
  function answerCbet(ans) {
    if (cb.answered || !cb.cur) return;
    cb.answered = true;
    const c = cb.cur, [chk, sm, bg] = c.mix, bet = sm + bg;
    document.querySelectorAll("#cb-ask .act").forEach(b => { b.disabled = true; if (b.id === "cb-" + ans) b.classList.add("picked"); });
    const took = ans === "bet" ? bet : chk;
    const grade = took >= 0.25 ? "good" : took >= 0.05 ? "ok" : "bad";
    cb.n++;
    if (grade === "good") { cb.good++; cb.streak++; } else cb.streak = 0;
    const head = grade === "good" ? (Math.min(bet, chk) >= 0.25 ? "Correct, a mixed spot" : "Correct") : grade === "ok" ? "Inaccurate" : "Mistake";
    const desc = handDescription(c.hero, c.board), youText = desc.made + (desc.draws.length ? " with " + desc.draws.join(" and ") : "");
    let size = "";
    if (bet >= 0.25) {
      if (sm >= 0.8 * bet) size = `When it bets, it almost always picks the small size, a third of the pot (${(5.5 * 0.33).toFixed(1)}bb).`;
      else if (bg >= 0.8 * bet) size = `When it bets, it almost always picks the big size, three quarters of the pot (${(5.5 * 0.75).toFixed(1)}bb).`;
      else size = `It uses both sizes, a third and three quarters of the pot. They are close in value, so whether you bet matters more than the size.`;
    }
    // The head goes up at once; the body follows when the equity is worked out
    $("cb-fb").innerHTML = `<div class="fb ${grade}"><div class="head"><span class="dot" style="background:${{ good: "var(--good)", ok: "var(--warn)", bad: "var(--red)" }[grade]}"></span>${head}</div><div id="cb-body" style="display:grid;gap:12px"><p>Working out your equity…</p></div></div>`;
    setTimeout(() => {
      if (cb.cur !== c) return;
      const eq = E.equityHandVsRange(c.hero, rangeByKey("call:BB vs BTN").map, c.board, 20000).equity;
      const why = cbetWhy(c, eq, desc);
      $("cb-body").innerHTML = `
          <p>You have <strong>${youText}</strong>. The solver ${bet >= 0.995 ? "always bets this hand" : chk >= 0.995 ? "always checks this hand" : `bets this hand <strong>${fmt(bet)}</strong> of the time and checks <strong>${fmt(chk)}</strong>`}.${size ? " " + size : ""}</p>
          <div>${actSplit(c.mix, ACT_NAMES)}<div class="legend">${ACT_NAMES.map((n, i) => `<span><i class="sw" style="background:${ACT_COLORS[i]}"></i>${n} ${fmt(c.mix[i])}</span>`).join("")}</div></div>
          <ul class="tips">${why.map(x => `<li>${x}</li>`).join("")}</ul>
          <div class="btns"><button class="btn primary" id="cb-next">Next spot <span style="opacity:.6;font-weight:500">(Enter)</span></button>
          <button class="btn" id="cb-open">See this flop in the board explorer</button></div>`;
      $("cb-next").onclick = dealCbet;
      $("cb-open").onclick = () => {
        show("postflop");
        bx.match = 0; bx.board = [...c.board, null, null]; bx.active = null;
        setSub("board"); renderBx(); computeBx(); window.scrollTo({ top: 0 });
      };
      $("cb-next").focus({ preventScroll: true });
    }, 10);
    $("cb-n").textContent = cb.n;
    $("cb-acc").textContent = Math.round(cb.good / cb.n * 100) + "%";
    $("cb-streak").textContent = cb.streak;
  }

  /* Switching mode starts a fresh session score */
  function setQuizMode(m) {
    qz.mode = m; qz.n = 0; qz.err = 0; qz.good = 0;
    $("qz-n").textContent = "0"; $("qz-acc").textContent = "–"; $("qz-err").textContent = "–";
  }
  function setRangeMode(m) {
    rq.mode = m; rq.n = 0; rq.err = 0; rq.good = 0;
    $("rq-n").textContent = "0"; $("rq-acc").textContent = "–"; $("rq-err").textContent = "–";
  }

  /* ---------- Sub-tabs ---------- */
  let sub = "calc", trainersReady = false;
  function setSub(s) {
    sub = s;
    ["calc", "board"].forEach(k => {
      $("pf-" + k).hidden = k !== s;
      document.querySelector(`[data-sub="${k}"]`).setAttribute("aria-pressed", k === s);
    });
    if (s === "board" && !$("bx-result").innerHTML) { renderBx(); computeBx(); }
  }

  window.Postflop = {
    cardHTML, handDescription, // also used by play mode (play.js)
    init() {
      document.querySelectorAll("[data-sub]").forEach(b => b.onclick = () => setSub(b.dataset.sub));
      initCalc();
      setSub("calc");
    },
    /* Postflop tab: open a tool ("calc" or "board") */
    open(s) { setSub(s); },
    /* Trainer tab: Hand vs hand ("quiz"), the Range trainer ("range", optionally in a given mode) and the C-bet trainer ("cbet") */
    initTrainers() {
      if (trainersReady) return;
      trainersReady = true;
      document.querySelectorAll("[data-qm]").forEach(b => b.onclick = () => { setQuizMode(b.dataset.qm); dealQuiz(); });
      document.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { setRangeMode(b.dataset.rm); dealRange(); });
    },
    openTrainer(kind, mode) {
      this.initTrainers();
      if (kind === "quiz") { if (mode && mode !== qz.mode) { setQuizMode(mode); qz.cur = null; } if (!qz.cur) dealQuiz(); }
      if (kind === "range") { if (mode && mode !== rq.mode) { setRangeMode(mode); rq.cur = null; } if (!rq.cur) dealRange(); }
      if (kind === "cbet" && !cb.cur) dealCbet();
    },
    key(e, kind) {
      const k = e.key.toLowerCase();
      if (kind === "range") {
        if (rq.answered && (k === "enter" || k === " " || k === "n")) { dealRange(); return true; }
        if (!rq.answered && rq.mode === "cf" && (k === "f" || k === "c")) { answerRange(k === "c" ? "call" : "fold"); return true; }
        if (!rq.answered && rq.mode === "eq" && k === "enter") { answerRange(+$("rq-guess").value / 100); return true; }
        return false;
      }
      if (kind === "cbet") {
        if (cb.answered && (k === "enter" || k === " " || k === "n")) { dealCbet(); return true; }
        if (!cb.answered && cb.cur && (k === "k" || k === "b")) { answerCbet(k === "b" ? "bet" : "check"); return true; }
        return false;
      }
      if (kind !== "quiz") return false;
      if (qz.answered && (k === "enter" || k === " " || k === "n")) { dealQuiz(); return true; }
      if (!qz.answered && qz.mode === "cf" && (k === "f" || k === "c")) { answerQuiz(k === "c" ? "call" : "fold"); return true; }
      if (!qz.answered && qz.mode === "eq" && k === "enter") { answerQuiz(+$("qz-guess").value / 100); return true; }
      return false;
    }
  };
})();
