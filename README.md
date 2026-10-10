# Falcon

A poker study app for understanding the math and strategy of poker, pre and post flop.

## Running it

Open `index.html` in any browser. There is no build step and nothing to install.

## What's in it

- **Preflop ranges** – 13×13 range grids for 6-max cash games (100bb): opening ranges for every seat and five common spots facing a raise. Click any hand to see how it is played and why.
- **Trainer** – deals random hands and seats and grades your decisions against the charts. "My leaks" deals more of the spots you get wrong and replays hands you missed.
- **Postflop**
  - *Equity calculator* – exact equity for your hand against a specific hand or any range from the charts, with your outs and the cards that help or hurt you.
  - *Board explorer* – how two preflop ranges hit a flop: range equity, strength breakdown and what it usually means for betting.
  - *Equity quiz* – estimate your equity or make call/fold decisions with pot odds, graded with exact math.
- **Theory** – pot odds, outs, combinations and blockers, preflop matchups, position and GTO basics.
- **Resources** – a study plan plus the best books, tools, courses and communities.

## Project layout

```
index.html          page shell and markup for every view
css/falcon.css      all styles
js/engine.js        card evaluator and equity calculations (also runs in Node)
js/ranges.js        preflop range data and shared helpers
js/preflop.js       range viewer and trainer
js/postflop.js      equity calculator, board explorer, equity quiz
js/theory.js        theory page calculators
js/app.js           tab routing and keyboard shortcuts
tests/              engine tests: node tests/engine.test.js
```

## Notes

The preflop ranges are simplified approximations, hand-built to match the shape of solver strategies and checked against published benchmarks. They are not exact solver output. All equity numbers are calculated exactly, or by Monte Carlo simulation where noted.
