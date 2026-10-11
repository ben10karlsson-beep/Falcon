# Falcon

A poker study app for understanding the math and strategy of No-Limit Hold'em, pre and post flop. Built for the owner to learn with, and possibly shared with others later. The goal is understanding, not just memorizing: every tool should explain *why*, in plain language.

## How to run

- Open `index.html` in a browser. No build step, no dependencies, no framework. Keep it that way unless there is a strong reason.
- All tests: `node tests/run-all.js` (must stay green). It runs `tests/engine.test.js` (evaluator, equity) and `tests/ranges.test.js` (range parser plus the range audit below).
- Hooks run the tests automatically: a Claude Code PostToolUse hook (`.claude/settings.json` → `.claude/hooks/test-on-edit.js`) after edits to `js/engine.js`, `js/ranges.js` or `tests/`, and a git pre-commit hook in `.githooks/`. Enable the git hook once per clone: `git config core.hooksPath .githooks`.

## Layout

```
index.html        page shell + markup for every view (tabs: Preflop ranges, Trainer, Postflop, Theory, Resources)
css/falcon.css    all styles; colors are CSS variables on :root
js/engine.js      card encoding, 5–7 card evaluator, equity (exact + Monte Carlo), flop classification, board texture. UMD: window.Engine in browser, module.exports in Node
js/ranges.js      preflop range data (RFI, VS), range-string parser, shared helpers (getRange, freqs, handAt, pct, combos, rangeOptions, rangeSize)
js/preflop.js     range grid view + preflop hands trainer (incl. "My leaks" mode, stats in localStorage)
js/reading.js     Read ranges trainer: paint a range on the grid, graded against the chart in combos (window.Reading)
js/postflop.js    equity calculator + board explorer (Postflop tab); Hand vs hand quiz + range trainer (Trainer tab) (window.Postflop)
js/theory.js      theory chapter routing (window.Theory) + calculators (pot odds, outs, matchups, combo drill, hand vs range, EV, seat bars)
js/app.js         tab routing + Trainer modes (address hash: #trainer[/read|quiz|range], #postflop, #theory/<chapter>), data-go practice buttons, keyboard shortcuts; loaded last
tests/            engine + range tests; run-all.js runs both
```

Scripts are plain globals loaded in order: engine → ranges → preflop → reading → theory → postflop → app.

Tabs: **Trainer** holds every graded trainer (Preflop hands, Read ranges, Hand vs hand, Range trainer); **Postflop** holds the tools (equity calculator, board explorer). Theory "Practice this" buttons use `data-go="train:<mode>[:<sub>]"` or `"postflop:<calc|board>"`.

## Design language

- "Warm charcoal": minimal and homey, not sharp. Warm brown-tinted darks, warm white text, soft rounded shapes.
- Tokens: `--bg #1d1914`, `--surface #27211b`, `--surface-2 #322a22`, `--line #3f352b`, `--text #f4eadb`, `--text-2 #ddd0bd` (body copy), `--muted #ae9f8c`, `--red #de6752` (UI accent, brick), `--good/--warn` for grading only. Radii: `--r-sm 8px`, `--r 14px`, `--r-lg 20px`, pills 999px.
- The range grid colours are a player convention and stay exact: `--raise #e23b3f`, `--call #6e6f78`, `--fold #26262a`. Use `--raise` for anything meaning "raise" (grid, raise button, raise verdict); use `--red` for accents.
- Panels are tonal (a shade lighter than what they sit on), not outlined. Borders only where they mean something: inputs, tables, the grading outline on feedback, the dashed "Practice this" box.
- Labels are sentence case, no letter-spacing, no ALL-CAPS.
- Fonts: Bricolage Grotesque (display), Figtree (body, and numbers/hands via tabular figures; `--mono` points at Figtree).
- Text colours must keep ≥ 4.5:1 contrast on `--bg` and `--surface`; `--dim` is for non-essential hints only.
- Must work at phone width (~390px) with no horizontal page scroll.
- GTO Wizard is the visual reference for the range grid; Falcon differs by explaining reasoning.

## Poker conventions and decisions

- Format: 6-max cash, 100bb, opens 2.5bb (SB 3bb), 3-bets ~11bb OOP / 7.5bb IP.
- Preflop ranges are hand-built approximations shaped like solver output, NOT exact solver data, and the UI says so. They were audited for: later seats ⊇ earlier seats, monotonic kicker/pair order, and sizes near published benchmarks (open ≈ UTG 17%, HJ 21%, CO 29%, BTN 45%, SB 41%; BB defends ~52% vs BTN). `tests/ranges.test.js` checks all of this automatically (one deliberate exception: A5 may be opened more than A6–A9, as solvers often do).
- Range strings: `"55+, A2s+, KTs-K8s, AJo:0.5"` — `:x` is a frequency 0..1.
- Read ranges grading: overlap = combos in both ÷ combos in either (`rangeOverlap` in ranges.js); a hand the chart plays at frequency f counts f in and 1−f out, so mixed hands give partial credit. 85%+ is "spot on".
- Trainer grading: action is "correct" if the chart takes it ≥25% of the time, "inaccurate" if >0%, else "mistake".
- Outs shown to the user are clean outs only; cards that improve hero but still lose are shown separately as "tainted outs".
- Board explorer tips are general solver tendencies, labelled as such — never present them as a solved strategy.

## Theory page structure

The Theory tab is a learning path of chapters, one on screen at a time: 1 Equity → 2 Outs → 3 Pot odds and EV (against one hand), then 4 Combos and blockers → 5 Equity vs a range → 6 Calling vs a range (the same ideas against a range), then 7 Ranges and strategy, plus a Glossary. Each chapter is a `<section class="chapter" data-ch="...">` with a "Builds on" line, a Recap, a "Practice this" block (`data-go="view:sub:mode"` buttons into the trainers) and a pager filled by theory.js.

- A chapter may only rely on ideas from earlier chapters. Put new theory content in the first chapter where its prerequisites are covered, and link back with `data-ch` links instead of "above/below".
- One pot odds notation everywhere: "the pot" includes the bet you face, and equity needed = call ÷ (pot + call). The bet ÷ (pot before the bet + 2 × bet) form is only shown as a shortcut.

## Writing style for UI copy

Plain, direct sentences. Name things the way players do (3-bet, c-bet, outs). Explain the reason behind every recommendation. No hype.

Every number in UI copy (equities, combo counts, pot odds, range sizes) must be computed with the engine or worked out step by step, never written from memory. Hardcoded figures in theory examples come from running `js/engine.js` with a high sample count, and should match what the in-page calculators show.

## Ideas / roadmap

- Board explorer: 3-bet pots, turn and river.
- Real solver data import (e.g. TexasSolver output) to replace approximated ranges.
- More formats: other stack depths, tournaments.
- Postflop trainer (c-bet decisions by texture).
- Range trainer, next steps (live: guess flop equity vs the chart range; call-or-fold vs a flop bet; Read ranges, paint a range and compare it in combos): after a Read ranges spot, deal a flop and compare your equity against your painted range vs the real one, to show what a misread costs; add flop betting so ranges narrow (c-bet / call), which would also make call-or-fold more realistic.
