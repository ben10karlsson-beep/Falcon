# 169 Poker

A poker study app for understanding the math and strategy of No-Limit Hold'em, pre and post flop. Every tool explains *why*, in plain language.

## Running it

Open `index.html` in any browser. There is no build step and nothing to install. The site is plain static files, so it can be hosted as-is (for example on GitHub Pages).

## What's in it

- **Preflop ranges**: 13×13 range grids for 6-max cash games at 100bb. Opening ranges for every seat, common spots facing a raise, and facing a 3-bet. Click any hand to see how it is played and why.
- **Trainer**: every graded trainer in one place.
  - *Preflop hands*: deals random hands and seats and grades your decisions against the charts. "My leaks" deals more of the spots you get wrong.
  - *Read ranges*: paint a range on the grid, get graded against the chart in combos, then see what a misread costs on a flop.
  - *Hand vs hand*: estimate equity or make call/fold decisions with pot odds, graded with exact math.
  - *Range trainer*: guess your flop equity against a chart range, or decide whether to call a flop bet.
- **Postflop**
  - *Equity calculator*: exact equity for your hand against a specific hand or any range from the charts, with clean and tainted outs.
  - *Board explorer*: how two preflop ranges hit a flop, in single-raised and 3-bet pots: range equity, strength breakdown, pot size and SPR.
- **Theory**: a seven-chapter learning path, from equity and outs through pot odds, combos and blockers, equity against a range, and ranges and strategy. Plus a glossary.
- **Resources**: a study plan and the best outside books, tools, courses and communities.

## Project layout

```
index.html          page shell and markup for every view
css/falcon.css      all styles
js/engine.js        card evaluator and equity calculations (also runs in Node)
js/ranges.js        preflop range data and shared helpers
js/preflop.js       range viewer and preflop hands trainer
js/reading.js       Read ranges trainer
js/postflop.js      equity calculator, board explorer, hand vs hand quiz, range trainer
js/theory.js        theory chapters and calculators
js/app.js           tab routing and keyboard shortcuts
tests/              engine and range tests: node tests/run-all.js
```

## Notes

The preflop ranges are simplified approximations, hand-built to match the shape of solver strategies and checked against published benchmarks. They are not exact solver output. All equity numbers are calculated exactly, or by Monte Carlo simulation where noted.
