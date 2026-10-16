/* Falcon play mode (Trainer tab): whole hands heads-up against a bot, BTN vs BB at 100bb, seats switching each hand.
   Graded where Falcon has data (the preflop charts, BTN's c-bet on the solved flops); everywhere else your equity against
   the bot's range and the equity a call needs. Rules, ranges and bots are in play-core.js (window.PlayCore). */
(function () {
  "use strict";
  const E = window.Engine, C = window.PlayCore;
  const $ = id => document.getElementById(id);
  const { cardHTML, handDescription } = window.Postflop;
  const bb = t => (Math.round(t) / 10).toFixed(1).replace(".0", "");
  const pc = x => Math.round(x * 100) + "%";
  const STREETS = ["Preflop", "Flop", "Turn", "River"];
  const SEAT_NAMES = ["BTN", "BB"];
  const GRADE_COLORS = { good: "var(--good)", ok: "var(--warn)", bad: "var(--red)" };
  const GRADE_HEADS = { good: "Correct", ok: "Inaccurate", bad: "Mistake" };
  const flopText = cards => cards.map(c => { const r = E.RANKS[E.rankOf(c)]; return (r === "T" ? "10" : r) + E.SUIT_SYMBOL[E.suitOf(c)]; }).join(" ");

  const pl = {
    opts: { seat: "switch", deal: "study", stacks: "reset" },
    chips: { hero: 1000, bot: 1000 }, heroSeat: 1, st: null, ranges: null, sv: null, decs: [], snaps: [], start: 0,
    rebuy: null, botTurn: false, ready: false, loading: false,
    stats: { hands: 0, graded: 0, good: 0, net: 0 }
  };
  try { Object.assign(pl.opts, JSON.parse(localStorage.getItem("falcon-play-opts") || "{}")); } catch (e) {}
  try { Object.assign(pl.stats, JSON.parse(localStorage.getItem("falcon-play-stats") || "{}")); } catch (e) {}
  const save = () => { try { localStorage.setItem("falcon-play-opts", JSON.stringify(pl.opts)); localStorage.setItem("falcon-play-stats", JSON.stringify(pl.stats)); } catch (e) {} };
  const botSeat = () => 1 - pl.heroSeat;

  /* ---------- Dealing ---------- */
  function shuffle(d) { for (let i = d.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [d[i], d[j]] = [d[j], d[i]]; } return d; }
  // Study deal: the flop is one of the 30 solved flops with its suits shuffled; everything else is random
  function makeDeck() {
    if (pl.opts.deal !== "study") return shuffle(E.remainingDeck([]));
    const f = C.SOLVED_FLOPS[(Math.random() * C.SOLVED_FLOPS.length) | 0], p = C.SUIT_PERMS[(Math.random() * 24) | 0];
    const flop = f.cards.map(c => C.relabel(c, p)), rest = shuffle(E.remainingDeck(flop));
    return [...rest.slice(0, 4), ...flop, ...rest.slice(4)];
  }
  function newHand() {
    const o = pl.opts;
    pl.rebuy = null;
    if (o.stacks === "reset") pl.chips = { hero: 1000, bot: 1000 };
    else for (const k of ["hero", "bot"]) if (pl.chips[k] < 200) { pl.chips[k] = 1000; pl.rebuy = (pl.rebuy ? "Both stacks were" : k === "hero" ? "Your stack was" : "The bot's stack was") + " topped back up to 100bb."; }
    pl.heroSeat = o.seat === "btn" ? 0 : o.seat === "bb" ? 1 : 1 - pl.heroSeat;
    const stacks = pl.heroSeat === 0 ? [pl.chips.hero, pl.chips.bot] : [pl.chips.bot, pl.chips.hero];
    pl.st = C.newHand(stacks, makeDeck());
    pl.ranges = [C.fullRange(), C.fullRange()];
    pl.sv = null; pl.decs = []; pl.snaps = []; pl.start = pl.chips.hero;
    $("pl-fb").innerHTML = "";
    render();
    step();
  }

  /* ---------- The hand loop ---------- */
  function step() {
    const st = pl.st;
    if (st.done) return endHand();
    if (st.toAct === pl.heroSeat) { pl.botTurn = false; renderActs(); return; }
    pl.botTurn = true; renderActs();
    setTimeout(() => {
      if (pl.st !== st) return;
      const dec = C.decide(st, pl.ranges, pl.sv), h = st.hole[st.toAct];
      const i = C.sample(dec.dist.get(C.comboKey(h[0], h[1])));
      apply(dec, i);
    }, 650);
  }
  function apply(dec, i) {
    const st = pl.st, seat = st.toAct, street = st.street, board = st.board.slice();
    C.narrow(pl.ranges[seat], dec, i, board);
    pl.snaps[street] = rangeSnap(board);
    C.act(st, dec.opts[i]);
    if (st.board.length >= 3 && !pl.sv) pl.sv = C.solvedFor(st.board.slice(0, 3));
    render();
    step();
  }
  function rangeSnap(board) {
    const r = C.live(pl.ranges[botSeat()], board);
    return { shares: C.classShares(pl.ranges[botSeat()], board), combos: r.reduce((t, x) => t + x.w, 0) };
  }
  function heroAct(i) {
    const st = pl.st;
    if (!st || st.done || pl.botTurn || st.toAct !== pl.heroSeat) return;
    pl.botTurn = true;
    document.querySelectorAll("#pl-acts .act").forEach(b => { b.disabled = true; if (+b.dataset.i === i) b.classList.add("picked"); });
    const dec = C.decide(st, pl.ranges, pl.sv), opt = dec.opts[i];
    const fb = feedback(dec, opt);
    pl.decs.push({ street: st.street, label: optLabel(opt, st).text, ...fb });
    if (fb.grade) { pl.stats.graded++; if (fb.grade === "good") pl.stats.good++; save(); }
    $("pl-fb").innerHTML = fbHTML(fb, pl.decs[pl.decs.length - 1]);
    apply(dec, i);
  }

  /* ---------- Feedback on your decision ---------- */
  const tookShare = (mix, opt) => opt.tags.reduce((t, k) => t + (mix[k] || 0), 0);
  const gradeOf = (took, okAt) => took >= 0.25 ? "good" : took >= okAt ? "ok" : "bad";
  const CHART_NAMES = ["The button's opening chart", "The big blind's chart against a button open", "The button's chart against a big blind 3-bet"];
  const CHART_WORDS = [{ raise: "open", fold: "fold" }, { raise: "3-bet", call: "call", fold: "fold" }, { raise: "4-bet", call: "call", fold: "fold" }];
  function feedback(dec, opt) {
    const st = pl.st, seat = pl.heroSeat, hole = st.hole[seat], hc = E.handClass(hole[0], hole[1]);
    if (st.street === 0) {
      const mix = C.chartMix(st, hc);
      if (!mix) return { head: "Not graded", body: [`Falcon has no chart for this spot, so it isn't graded. The bot answers ${st.raises === 3 ? "4-bets" : "all-ins"} with a simple rule: it continues with ${st.raises === 3 ? "QQ+, AK and AQs (all-in with KK+ and AKs)" : "QQ+ and AK"}.`] };
      if (mix.unopened) return { head: "Not graded", body: [`The button's chart doesn't open ${hc}, so there is no chart for it facing a 3-bet. Open it less often and this spot won't come up.`] };
      const words = CHART_WORDS[st.raises], took = tookShare(mix, opt), grade = gradeOf(took, 1e-9);
      const parts = Object.keys(words).filter(k => mix[k] > 0.001).map(k => `${words[k]} ${pct(mix[k])}`);
      const top = Object.keys(words).filter(k => mix[k] >= 0.25).length > 1;
      return { grade, head: grade === "good" && top ? "Correct, a mixed spot" : GRADE_HEADS[grade],
        body: [`${CHART_NAMES[st.raises]} plays <strong>${hc}</strong>: ${parts.join(", ")}.${top ? " The chart mixes here, so either of its main actions is fine." : ""}`] };
    }
    const board = st.board, theirs = C.live(pl.ranges[1 - seat], board), eq = C.equityVs(hole, theirs, board);
    const owed = st.put[1 - seat] - st.put[seat], pot = C.potTotal(st), desc = handDescription(hole, board);
    const you = `You have <strong>${desc.made.toLowerCase()}${desc.draws.length ? " with " + desc.draws.join(" and ") : ""}</strong>`;
    const srpFlop = st.street === 1 && st.potType === "srp";
    // BTN's c-bet on a solved flop is graded like the c-bet trainer: bet vs check, correct at 25%+, inaccurate at 5%+
    if (srpFlop && seat === C.BTN && !owed) {
      const m = C.solvedMix(pl.sv, hole);
      if (m) {
        const took = opt.type === "check" ? m[0] : m[1] + m[2], grade = gradeOf(took, 0.05), bet = m[1] + m[2];
        return { grade, head: grade === "good" && Math.min(bet, m[0]) >= 0.25 ? "Correct, a mixed spot" : GRADE_HEADS[grade], body: [
          `${you}. On this flop the solver ${bet >= 0.995 ? "always bets it" : m[0] >= 0.995 ? "always checks it" : `bets it <strong>${pc(bet)}</strong> of the time (${pc(m[1])} a third of the pot, ${pc(m[2])} three quarters) and checks <strong>${pc(m[0])}</strong>`}.`,
          `Your equity against the big blind's checking range is ${eq === null ? "–" : pc(eq)}. The C-bet trainer explains the reasons hand by hand.`], table: betTable(dec, opt, hole, null) };
      }
    }
    const fb = { head: eq === null ? "Not graded" : owed ? `Equity ${pc(eq)} · need ${pc(owed / (pot + owed))}` : `Equity ${pc(eq)}`, body: [] };
    const outs = [];
    fb.table = betTable(dec, opt, hole, outs);
    const mine = outs.find(o => o.opt === opt);
    if (mine) {
      const o = mine.out, word = owed ? "raise" : "bet";
      fb.head = `Bot folds ${pc(o.fold)} · a bluff needs ${pc(o.need)}`;
      fb.body.push(`${you}. Your ${word} risks ${bb(o.risk)}bb to win the ${bb(o.pot)}bb pot. As a pure bluff it needs the bot to fold ${bb(o.risk)} ÷ (${bb(o.risk)} + ${bb(o.pot)}) = <strong>${pc(o.need)}</strong> of the time.`);
      const cont = o.eq === null ? "" : ` Against the hands that continue${o.raise >= 0.005 ? ` (it raises back ${pc(o.raise)} of the time)` : ""}, you have <strong>${pc(o.eq)}</strong> equity.`;
      fb.body.push(`Against your range as it looks after this ${word}, the bot folds <strong>${pc(o.fold)}</strong>.${cont} ${o.fold >= o.need
        ? "It folds more often than a bluff needs, so the " + word + " makes money right away, before counting the times you're called."
        : o.eq !== null && o.eq >= 0.5 ? "It folds less often than a bluff needs, but you're ahead of the hands that continue, so the " + word + " works for value."
        : "It folds less often than a bluff needs and you're behind the hands that continue, so the " + word + " has to win the rest on later cards and later bets."}`);
      if (eq !== null) fb.body.push(`Before the ${word}, your equity against its whole range was ${pc(eq)}.`);
    } else if (owed) {
      const need = owed / (pot + owed);
      fb.body.push(`${you}. Calling costs ${bb(owed)}bb. The pot is ${bb(pot)}bb with the bet, so you need ${bb(owed)} ÷ (${bb(pot)} + ${bb(owed)}) = <strong>${pc(need)}</strong> equity.`);
      if (eq !== null) fb.body.push(`Against the bot's range as it has played this hand, you have <strong>${pc(eq)}</strong>. ${eq >= need
        ? "That's more than you need, so a call pays at these odds before counting any later betting."
        : "That's less than you need, so a call loses at these odds unless you win extra on later streets."}`);
    } else if (eq !== null) {
      fb.body.push(`${you}. Against the bot's range as it has played this hand, you have <strong>${pc(eq)}</strong> equity. ${eq >= 0.65
        ? "You're ahead of most of its range, so betting gets value from the worse hands that call."
        : eq <= 0.35 ? "You're behind most of its range: a bet works only as a bluff, best with a draw for backup." : "A middling hand: betting tends to fold out worse hands and get called by better ones, so checking is often fine."}`);
    }
    if (srpFlop && pl.sv) {
      const near = pl.sv.exact ? "" : ` (from the closest solved flop, ${flopText(pl.sv.flop.cards)})`;
      if (seat === C.BB && !owed) fb.body.push(`In the solves the big blind always checks the flop to the preflop raiser, and the bot does the same.`);
      else if (seat === C.BTN && !owed) fb.body.push(pl.sv.exact ? `The button's chart doesn't open ${hc}, so the solver has no strategy for it and the c-bet isn't graded.`
        : `This flop isn't one of the 30 solved ones, so the c-bet isn't graded. The bot plays the closest solved flop (${flopText(pl.sv.flop.cards)}) by hand type.`);
      else if (seat === C.BB && st.streetBets === 1) {
        const last = st.history[st.history.length - 1], r = last.tags.includes("small") ? pl.sv.flop.vsSmall : last.tags.includes("big") ? pl.sv.flop.vsBig : null;
        if (r) fb.body.push(`Against this bet the solver's big blind folds ${pc(r[0])}, calls ${pc(r[1])} and raises ${pc(r[2])} of its range${near}. Your exact hand isn't graded: Falcon has the big blind's overall split, not its strategy per hand.`);
      }
    }
    return fb;
  }
  /* Every bet or raise you could have made here, against the bot's strategy (play-core betOutcome); outs collects the results */
  function betTable(dec, opt, hole, outs) {
    const st = pl.st, rows = [];
    dec.opts.forEach((o, i) => {
      if (o.to <= st.put[1 - st.toAct]) return;
      const out = C.betOutcome(st, pl.ranges, pl.sv, dec, i, hole);
      if (!out) return;
      if (outs) outs.push({ opt: o, out });
      const l = optLabel(o, st);
      rows.push(`<tr${o === opt ? ' class="pl-chosen"' : ""}><td>${l.text}${l.sub ? ` <span class="pl-sub">${l.sub}</span>` : ""}</td><td>${pc(out.fold)}</td><td>${pc(out.need)}</td><td>${out.eq === null ? "–" : pc(out.eq)}</td></tr>`);
    });
    if (!rows.length) return "";
    const facing = st.put[1 - st.toAct] > st.put[st.toAct];
    return `<div class="pl-bets"><div class="label">What each ${facing ? "raise" : "bet"} would do against the bot</div>
      <table class="ptable"><thead><tr><th></th><th>Bot folds</th><th>A bluff needs</th><th>Your equity if it continues</th></tr></thead><tbody>${rows.join("")}</tbody></table>
      <p class="hint">A bet that gets more folds than a bluff needs makes money even when it's never good. Equity counts the cards to come, not later betting.</p></div>`;
  }
  // Stays in view while the hand goes on, so it names the decision it is about
  function fbHTML(fb, d) {
    return `<div class="fb ${fb.grade || "pl-num"}"><div class="label">Your ${STREETS[d.street].toLowerCase()} decision: ${d.label.toLowerCase()}</div><div class="head">${fb.grade ? `<span class="dot" style="background:${GRADE_COLORS[fb.grade]}"></span>` : ""}${fb.head}</div>${fb.body.map(p => `<p>${p}</p>`).join("")}${fb.table || ""}</div>`;
  }

  /* ---------- Rendering ---------- */
  function optLabel(o, st) {
    if (o.type === "fold") return { text: "Fold", cls: "fold" };
    if (o.type === "check") return { text: "Check", cls: "call" };
    if (o.type === "call") return { text: `Call ${bb(o.to - st.put[st.toAct])}${o.to - st.put[st.toAct] === st.stacks[st.toAct] ? " all-in" : ""}`, cls: "call" };
    if (o.type === "allin") return { text: `All-in ${bb(o.to)}`, cls: "raise" };
    if (o.type === "bet") return { text: `Bet ${bb(o.to)}`, sub: Math.round(o.frac * 100) + "% pot", cls: "raise" };
    const name = st.street ? "Raise" : ["Raise", "3-bet", "4-bet"][st.raises] || "Raise";
    return { text: `${name} to ${bb(o.to)}`, cls: "raise" };
  }
  const backs = `<span class="mc back" aria-label="unknown card"></span><span class="mc back" aria-label="unknown card"></span>`;
  function seatHTML(seat) {
    const st = pl.st, hero = seat === pl.heroSeat, show = hero || st.done;
    const put = st.put[seat] ? `<span class="pl-put">${seat === C.BB && st.street === 0 && st.put[seat] === 10 && !st.history.some(h => h.seat === C.BB) ? "Big blind" : "In"} ${bb(st.put[seat])}</span>` : "";
    return `<div class="pl-seat${hero ? " hero" : ""}${st.toAct === seat && !st.done ? " turn" : ""}">
      <div class="pl-who"><span class="label">${hero ? "You" : "Bot"} · ${SEAT_NAMES[seat]}</span><span class="pl-stack">${bb(st.stacks[seat])}bb</span>${put}</div>
      <div class="cardrow">${show ? st.hole[seat].map(c => cardHTML(c)).join("") : backs}</div></div>`;
  }
  function render() {
    const st = pl.st, b = st.board;
    const slots = [0, 1, 2, 3, 4].map(i => b[i] !== undefined ? cardHTML(b[i]) : `<span class="mc pl-slot" aria-hidden="true"></span>`).join("");
    $("pl-table").innerHTML = `${seatHTML(botSeat())}
      <div class="pl-mid"><div class="cardrow pl-board" aria-label="Board">${slots}</div><div class="pl-pot">Pot <b>${bb(C.potTotal(st))}bb</b></div></div>
      ${seatHTML(pl.heroSeat)}`;
    $("pl-log").innerHTML = STREETS.map((name, s) => {
      const acts = st.history.filter(h => h.street === s);
      if (!acts.length) return "";
      return `<li><b>${name}${s ? " " + flopText(streetCards(st.board, s)) : ""}</b> ${acts.map(logText).join(" · ")}</li>`;
    }).join("");
    $("pl-sit").innerHTML = sitText();
    document.querySelector(".pl-felt").classList.toggle("done", st.done);
  }
  // The cards a street added: three on the flop, one on the turn and river
  const streetCards = (board, s) => s === 1 ? board.slice(0, 3) : board.slice(s + 1, s + 2);
  function logText(h) {
    const bot = h.seat !== pl.heroSeat, W = bot ? "Bot" : "You", v = (a, b) => bot ? b : a;
    if (h.type === "fold") return `${W} ${v("fold", "folds")}`;
    if (h.type === "check") return `${W} ${v("check", "checks")}`;
    if (h.type === "call") return `${W} ${v("call", "calls")} ${bb(h.paid)}`;
    if (h.type === "allin") return `${W} ${v("go", "goes")} all-in for ${bb(h.to)}`;
    if (h.type === "bet") return `${W} ${v("bet", "bets")} ${bb(h.to)}`;
    return `${W} ${v("raise", "raises")} to ${bb(h.to)}`;
  }
  function sitText() {
    const st = pl.st, hs = pl.heroSeat, last = st.history[st.history.length - 1];
    if (st.done) return "";
    if (!last) return hs === C.BTN
      ? `You're on the button with ${bb(st.stacks[0])}bb. Everyone before you folds, the small blind too. Open to 2.5bb or fold?`
      : `You're in the big blind with ${bb(st.stacks[1] + st.put[1])}bb. Everyone folds to the button. The bot is thinking…`;
    if (st.toAct !== hs) return "The bot is thinking…";
    const fresh = st.street && !st.history.some(h => h.street === st.street);
    const what = fresh ? `${STREETS[st.street]}: ${flopText(streetCards(st.board, st.street))}.` : last.seat !== hs ? logText(last).replace(/^Bot/, "The bot") + "." : "";
    const ask = st.put[1 - hs] > st.put[hs] ? "Your move." : "Check or bet?";
    return `${what} ${ask}`.trim();
  }
  function renderActs() {
    const st = pl.st;
    if (st.done || st.toAct !== pl.heroSeat) { $("pl-acts").innerHTML = ""; return; }
    $("pl-acts").innerHTML = C.legal(st).map((o, i) => {
      const l = optLabel(o, st);
      return `<button class="act ${l.cls}" data-i="${i}">${l.text}<kbd>${l.sub ? l.sub + " · " : ""}${i + 1}</kbd></button>`;
    }).join("");
    $("pl-acts").querySelectorAll(".act").forEach(b => b.onclick = () => heroAct(+b.dataset.i));
  }

  /* ---------- End of the hand: the result, your decisions and the bot's range ---------- */
  function endHand() {
    const st = pl.st, hs = pl.heroSeat, r = st.result;
    pl.botTurn = false;
    pl.chips.hero = st.stacks[hs]; pl.chips.bot = st.stacks[1 - hs];
    const net = pl.chips.hero - pl.start;
    pl.stats.hands++; pl.stats.net += net; save();
    renderActs(); render(); renderStats();
    const lastFold = st.history[st.history.length - 1];
    const desc = s => E.CATEGORY[E.category(r.values[s])].toLowerCase();
    let how;
    if (!r.showdown) how = lastFold.seat === hs ? `You fold. The bot had ${flopText(st.hole[1 - hs])}.` : `The bot folds ${flopText(st.hole[1 - hs])}.`;
    else how = `Showdown: you have ${desc(hs)}, the bot shows ${flopText(st.hole[1 - hs])} for ${desc(1 - hs)}.${r.winner === -1 ? " The pot is split." : ""}`;
    const head = net > 0 ? `You win ${bb(net)}bb` : net < 0 ? `You lose ${bb(-net)}bb` : r.winner === -1 ? "Split pot" : "You break even";
    const decs = pl.decs.length ? `<ol class="pl-review">${pl.decs.map(d => `<li><span class="pl-dot" style="${d.grade ? `background:${GRADE_COLORS[d.grade]}` : ""}"></span><span><b>${STREETS[d.street]}:</b> ${d.label}. ${d.head}</span></li>`).join("")}</ol>` : "";
    const streets = pl.snaps.map((s, i) => s ? i : -1).filter(i => i >= 0);
    // Added under the feedback on your last decision, which stays in view
    $("pl-fb").insertAdjacentHTML("beforeend", `<div class="fb pl-end"><div class="head">${head}</div><p>${how}${pl.rebuy ? " " + pl.rebuy : ""}</p>${decs}
      ${streets.length ? `<div class="pl-range"><div class="label">The bot's range as it played the hand</div>
        <div class="chips" role="group" aria-label="Street">${streets.map(i => `<button class="chip" data-snap="${i}" aria-pressed="${i === streets[streets.length - 1]}">${STREETS[i]}</button>`).join("")}</div>
        <div class="gridbox"><div class="grid pl-grid" id="pl-grid" role="img"></div></div><p class="hint" id="pl-range-cap"></p></div>` : ""}
      <div class="btns"><button class="btn primary" id="pl-next">Next hand <span style="opacity:.6;font-weight:500">(Enter)</span></button></div></div>`);
    if (streets.length) {
      document.querySelectorAll("[data-snap]").forEach(b => b.onclick = () => {
        document.querySelectorAll("[data-snap]").forEach(x => x.setAttribute("aria-pressed", x === b));
        drawRange(+b.dataset.snap);
      });
      drawRange(streets[streets.length - 1]);
    }
    $("pl-next").onclick = newHand;
    $("pl-next").focus({ preventScroll: true });
  }
  function drawRange(street) {
    const snap = pl.snaps[street], g = $("pl-grid"), bh = pl.st.hole[botSeat()], own = E.handClass(bh[0], bh[1]);
    g.innerHTML = "";
    for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++) {
      // Shares under 2% would be specks; they are left bare so the hands the bot really holds stand out
      const h = handAt(i, j), raw = Math.min(1, snap.shares[h] || 0), f = raw < 0.02 ? 0 : raw, d = document.createElement("div");
      d.className = "cell" + (f < 0.005 ? " zero" : "") + (i === j ? " pair" : "");
      d.innerHTML = unitHTML(h);
      setUnit(d, f, f, "var(--ultra)");
      if (h === own) d.setAttribute("aria-pressed", "true");
      g.appendChild(d);
    }
    g.setAttribute("aria-label", `The bot's range after its ${STREETS[street].toLowerCase()} action`);
    $("pl-range-cap").innerHTML = `${STREETS[street]}: about ${Math.round(snap.combos)} combos (${pct(snap.combos / 1326)} of all hands). A full disc is a hand it still holds every way it can (shares under 2% are left bare); the framed square is the hand it had, ${flopText(bh)}.`;
  }
  function renderStats() {
    const s = pl.stats;
    $("pl-hands").textContent = s.hands;
    $("pl-acc").textContent = s.graded ? Math.round(s.good / s.graded * 100) + "%" : "–";
    $("pl-acc-of").textContent = s.graded ? `of ${s.graded} graded decisions correct` : "graded decisions correct";
    $("pl-net").textContent = (s.net > 0 ? "+" : "") + bb(s.net);
    $("pl-rate").textContent = s.hands >= 20 ? (s.net >= 0 ? "+" : "") + (s.net / 10 / s.hands * 100).toFixed(0) : "–";
  }
  function renderOpts() {
    for (const k of ["seat", "deal", "stacks"]) document.querySelectorAll(`[data-pl-${k}]`).forEach(b => b.setAttribute("aria-pressed", b.dataset["pl" + k[0].toUpperCase() + k.slice(1)] === pl.opts[k]));
    $("pl-deal-hint").textContent = pl.opts.deal === "study"
      ? "Flops come only from the 30 solved ones (suits shuffled), so the button's c-bet can always be graded. Takes effect next hand."
      : "Fully random. Only about 2 flops in 100 match a solved one, so the c-bet is rarely graded; the bot uses the closest solved flop. Takes effect next hand.";
    $("pl-stacks-hint").textContent = pl.opts.stacks === "reset"
      ? "Both players start every hand with 100bb, the depth the charts and solves assume."
      : "Stacks carry over from hand to hand; one below 20bb is topped back up to 100bb. The charts assume 100bb, so the advice is rougher when the shorter stack drifts far from that.";
  }

  /* Loads the per-combo solver data (solved-combos.js) once, then deals */
  function ensureCombos(then) {
    if (window.SolvedCombos) return then();
    if (pl.loading) return;
    pl.loading = true;
    $("pl-sit").textContent = "Loading the solver data…";
    const s = document.createElement("script");
    s.src = "js/solved-combos.js";
    s.onload = () => { pl.loading = false; then(); };
    s.onerror = () => { pl.loading = false; $("pl-sit").textContent = "Couldn't load the solver data. Check your connection and reload the page."; };
    document.head.appendChild(s);
  }

  window.Play = {
    show() {
      if (!pl.ready) {
        pl.ready = true;
        for (const k of ["seat", "deal", "stacks"]) document.querySelectorAll(`[data-pl-${k}]`).forEach(b => b.onclick = () => {
          pl.opts[k] = b.dataset["pl" + k[0].toUpperCase() + k.slice(1)];
          if (k === "stacks" && pl.opts.stacks === "reset") pl.chips = { hero: 1000, bot: 1000 };
          save(); renderOpts();
        });
        $("pl-reset").onclick = () => { pl.stats = { hands: 0, graded: 0, good: 0, net: 0 }; save(); renderStats(); };
        renderOpts(); renderStats();
      }
      if (!pl.st) ensureCombos(newHand);
    },
    key(e) {
      const st = pl.st, k = e.key.toLowerCase();
      if (!st) return false;
      if (st.done) { if (k === "enter" || k === " " || k === "n") { newHand(); return true; } return false; }
      if (pl.botTurn || st.toAct !== pl.heroSeat) return false;
      const opts = C.legal(st);
      let i = /^[1-9]$/.test(k) ? +k - 1 : -1;
      if (k === "f") i = opts.findIndex(o => o.type === "fold");
      if (k === "c" || k === "k") i = opts.findIndex(o => o.type === "check" || o.type === "call");
      if (i < 0 || i >= opts.length) return false;
      heroAct(i);
      return true;
    }
  };
})();
