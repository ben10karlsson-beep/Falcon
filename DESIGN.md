---
name: 169 Poker (Field Kit)
description: A poker study app built like a piece of Teenage Engineering hardware. Every choice is a key, and orange and blue mean raise and call.
colors:
  aluminium-ground: "#e3e3df"
  plate-white: "#f5f5f2"
  rail-grey: "#d6d6d1"
  key-cap: "#ecece8"
  key-edge: "#b4b4ae"
  line: "#b9b9b3"
  ink: "#121211"
  ink-soft: "#2f2f2c"
  muted: "#585853"
  dim: "#75756e"
  knob-orange: "#ff5a1f"
  knob-orange-deep: "#c43f0b"
  knob-orange-light: "#ffab85"
  knob-blue: "#4a82ff"
  knob-green: "#14b26b"
  on-knob: "#121211"
  grade-good: "#0f9a5c"
  grade-warn: "#b97a00"
  fold-square: "#d0d0cb"
  pair-square: "#ececE8"
  card-stock: "#ffffff"
  card-red: "#d13d00"
  night-ground: "#141414"
  night-plate: "#1d1d1c"
  night-ink: "#f0f0ec"
  night-orange: "#ff6a2b"
  night-blue: "#5f8fff"
  night-green: "#2fcf86"
typography:
  display:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(36px, 4.6vw, 62px)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 112"
  headline:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(30px, 3.4vw, 46px)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontVariation: "'wdth' 112"
  title:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(26px, 2.8vw, 34px)"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 112"
  body:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
    letterSpacing: "0"
  readout:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "52px"
    fontWeight: 500
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 87.5"
  grid-label:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontWeight: 500
    letterSpacing: "-0.04em"
    fontVariation: "'wdth' 75"
  card-rank:
    fontFamily: "Unbounded, Archivo, sans-serif"
    fontSize: "42px"
    fontWeight: 800
    letterSpacing: "-0.05em"
rounded:
  cell: "2px"
  key: "3px"
  well: "4px"
  card: "5px"
  plate: "6px"
  disc: "50%"
spacing:
  grid-gap: "3px"
  grid-gap-phone: "2px"
  key-gap: "6px"
  rail-inset: "3px"
  plate-padding: "20px"
  column-gap: "24px"
components:
  key:
    backgroundColor: "{colors.key-cap}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.key}"
    padding: "7px 14px 7px 24px"
  key-chosen:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.plate-white}"
    rounded: "{rounded.key}"
  button:
    backgroundColor: "{colors.key-cap}"
    textColor: "{colors.ink}"
    rounded: "{rounded.key}"
    padding: "9px 18px"
  button-primary:
    backgroundColor: "{colors.knob-orange}"
    textColor: "{colors.on-knob}"
    rounded: "{rounded.key}"
    padding: "9px 18px"
  chip:
    backgroundColor: "{colors.key-cap}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.key}"
    padding: "6px 10px 6px 21px"
  chip-chosen:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.plate-white}"
  rail:
    backgroundColor: "{colors.rail-grey}"
    rounded: "6px"
    padding: "3px"
  action-raise:
    backgroundColor: "{colors.knob-orange}"
    textColor: "{colors.on-knob}"
    rounded: "{rounded.key}"
    padding: "14px 12px"
  action-call:
    backgroundColor: "{colors.knob-blue}"
    textColor: "{colors.on-knob}"
    rounded: "{rounded.key}"
    padding: "14px 12px"
  action-fold:
    backgroundColor: "{colors.key-cap}"
    textColor: "{colors.ink}"
    rounded: "{rounded.key}"
    padding: "14px 12px"
  plate:
    backgroundColor: "{colors.plate-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.plate}"
    padding: "20px"
  readout-well:
    backgroundColor: "{colors.aluminium-ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.well}"
  input:
    backgroundColor: "{colors.plate-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.key}"
  range-cell:
    backgroundColor: "{colors.plate-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.cell}"
---

# Design System: 169 Poker (Field Kit)

## Overview

**Creative North Star: "The Field Kit"**

169 Poker is operated like a Teenage Engineering instrument (OP-1, TP-7): an aluminium-grey ground, off-white plates, black ink, and colour only where it carries meaning, the way the OP-1's four knobs do. Orange raises, blue calls, green is a right answer. Every control is a hardware key with a small lip and an LED; the chosen key is pressed down in ink and its LED is lit. Numbers read like device readouts in a condensed mono.

The layout is the incumbent app's, unchanged: the same views, grid, hand plate and trainers, reskinned as a precise instrument. Density is high but calm; the 13x13 range grid is 169 key caps, which is where the name comes from. The world refuses both the dark poker-felt app and the op-art poster it replaces.

Motion is tactile, not decorative: keys travel down fast and spring back, LEDs flicker on, cards are dealt with weight. All of it stops when effects are paused or motion is reduced.

**Key Characteristics:**
- Grey ground, off-white plates with a hairline, ink text; colour reserved for the knob meanings.
- Every choice is a key (3px corner, LED dot, small lip); chosen means pressed in ink with a flat orange LED.
- Archivo medium, slightly wide, for words; Martian Mono condensed for numbers, readouts and grid labels; Unbounded heavy for card ranks.
- Disc area is frequency on the range grid.
- Speaker-grille perforations as the secondary texture: gutter dot field, trainer table strip, card backs.
- Two themes: light aluminium and OP-1 black.

## Colors

A neutral hardware palette (grey, off-white, ink) with three knob colours that each mean one thing.

### Primary
- **Knob Orange** (light #ff5a1f, dark #ff6a2b): the raise colour (raise discs, raise action key, raise bars, the aggressor's side of an equity split). Also the instrument's signal colour: the LED of a chosen key (`--led`), focus outlines, text caret, range-slider accent, the active card slot, and the single primary button. As text on a plate it drops to Deep Orange (#c43f0b light, #ff8a5c dark) for contrast. Light Orange (#ffab85) marks the small bet size in bars.

### Secondary
- **Knob Blue** (light #4a82ff, dark #5f8fff): the call colour only (call rings on the grid, call action key, call bars, the caller's side of an equity split).

### Tertiary
- **Knob Green** (light #14b26b, dark #2fcf86): the third logo knob. For grading, text and borders use Grade Good (#0f9a5c light, #2fcf86 dark); Grade Warn (#b97a00 light, #f0b033 dark) marks inaccurate answers.

### Neutral
- **Aluminium Ground** (#e3e3df; night #141414): the page and readout wells.
- **Plate White** (#f5f5f2; night #1d1d1c): plates, the app bar, input wells, grid squares.
- **Rail Grey** (#d6d6d1): the recessed bed of segmented rails, unlit LEDs.
- **Key Cap** (#ecece8, edge #b4b4ae; night #2a2a28, edge #3f3f3c): the face and rim of every unchosen key.
- **Ink** (#121211; night #f0f0ec): all strong text, chosen keys, rules, grille dots, the selected-hand frame, win in equity bars (`--win`).
- **Ink Soft** (#2f2f2c), **Muted** (#585853, also `--tie`), **Dim** (#75756e, hints only).
- **On Knob** (#121211 in both themes): the text colour on every knob colour. Orange, blue and green all carry near-black at 5:1 or better, so labels on knob colours are never white.
- **Fold Square** (#d0d0cb), **Pair Square** (#ececE8), **Card Stock** (#ffffff) with **Card Red** (#d13d00) for red suits.

### Named Rules
**The Knob Meaning Rule.** Orange is raise and blue is call (and aggressor vs caller in an equity split). Win and tie are ink and muted grey, the hero seat is ink, chapter markers are ink. Do not use blue for anything but calling; orange's only other job is the instrument signal (LED, focus, the primary key).

**The Black-On-Knob Rule.** Text on orange, blue or green is `--on-knob` near-black in both themes.

**The Token Rule.** Every colour goes through a token so light and OP-1 black both work; `--ink` is the strongest foreground in both. Text keeps 4.5:1 on ground and plate; `--dim` is for non-essential hints only.

## Typography

**Display Font:** Archivo (with Helvetica Neue, Arial), width 112%
**Body Font:** Archivo at normal width
**Label/Mono Font:** Martian Mono, condensed (87.5% for readouts, 75% for grid labels)
**Card Font:** Unbounded (playing-card ranks and the card picker)

**Character:** A grotesque at medium weight, set slightly wide and small, like the printing on a device face; numbers in a condensed mono like an LCD readout.

### Hierarchy
- **Display** (500, clamp(36px, 4.6vw, 62px), line-height 1, -0.03em): Welcome title and Theory chapter titles.
- **Headline** (500, clamp(30px, 3.4vw, 46px), 1): view titles. The feedback grade head (24px) sits between headline and title.
- **Title** (500, clamp(26px, 2.8vw, 34px), 1.08): Theory section headings; sub-headings at 19px.
- **Body** (400, 15px, 1.5): all UI copy and theory text.
- **Label** (500, 12.5px, muted): plate and control labels.
- **Readout** (Martian Mono 500, 87.5% width, -0.03em; 52px for big equity, 22px scores, 16px facts): every figure, stat, bar value, formula and seat tag. Chips with words stay in Archivo 13px.
- **Grid label** (Martian Mono, 75% width, 500 rank / 400 suit, -0.04em): hand labels in the range grid.
- **Card rank** (Unbounded 800, 42px on the table, 24px picked cards, -0.05em): playing cards; the card picker uses Unbounded 700 at 12px.
- **Wordmark** (Archivo 700, 22px, 112% width, -0.04em): "169" beside the knob logo.

### Named Rules
**The Readout Rule.** If it is a number the player reads, it is Martian Mono condensed. Words stay in Archivo.

**The Sentence Case Rule.** Labels and controls are sentence case with no positive letter-spacing and no all-caps. Display sizes tighten slightly; nothing is tracked out.

## Layout

The incumbent layout, unchanged by this world: a centred column up to 1180px with a 340px side column for the hand plate (one column below 900px), 24px between columns, plates padded 20px. The range grid is 13 columns with a 3px gap (2px and fluid columns at 420px and below, so phones near 390px never scroll sideways). Keys sit 6px apart. Below 640px the app bar puts the switches on the brand row and the tabs wrap onto full-width rows beneath; the card picker and next-card map shrink to 13 fitting columns below 480px.

## Elevation & Depth

Flat plates on a flat ground: plates separate by tone and a hairline (`0 0 0 1px var(--hair)`), never by a cast shadow. The only depth is mechanical: keys carry a small lip under their rim, which grows a pixel on hover and disappears when pressed, replaced by a shallow inner shadow. Inputs are recessed wells.

### Shadow Vocabulary
- **Plate hairline** (`box-shadow: 0 0 0 1px var(--hair)`): plates, examples, steps, trainer tables. A border, not a shadow.
- **Key lip** (`inset 0 0 0 1px var(--key-edge), 0 1px 0 #a9a9a2, 0 2px 3px rgba(18,18,17,.12)`; night `0 1px 0 #050505, 0 2px 3px rgba(0,0,0,.4)`): the rest state of every key.
- **Key lip, hover** (`inset 0 0 0 1px var(--key-edge), 0 2px 0 #a9a9a2, 0 4px 6px rgba(18,18,17,.14)`): the cap lifts 1px.
- **Key pressed** (`inset 0 0 0 1px var(--key-edge), inset 0 2px 3px rgba(0,0,0,.18)`): travel down, lip gone.
- **Action key lip** (`inset 0 0 0 1px rgba(0,0,0,.28), 0 2px 0 rgba(0,0,0,.28), 0 3px 6px rgba(18,18,17,.14)`): the big raise / call / fold keys.
- **Input well** (`inset 0 1px 2px rgba(18,18,17,.12)` with a 1px ink border).

### Named Rules
**The No-Glow Rule.** LEDs are flat discs of colour. No glow, no halo, no gradient on any light.

**The Lip-Is-Travel Rule.** A key's lip exists only to show travel: it grows on hover, vanishes on press. Plates never get one.

## Shapes

Slightly rounded like a device face: plates 6px, playing cards 5px, readout wells and seats 4px, keys 3px, grid squares and bars 2px. Circles are the knobs, the LEDs, the frequency discs and the grille perforations. The logo is four OP-1 knobs in a row (blue, green, plate-white, orange, each with an ink rim and a tick that turns on hover); the favicon is the same four knobs in a 2x2 square.

## Components

### Keys (tabs, segmented rails, chips, buttons)
Hardware keys, pressed with intent.
- **Shape:** 3px corner, key-cap face, 1px key-edge rim, the key lip below.
- **LED:** a 6px dot (5px on chips and small rails) left of the label, unlit in rail grey.
- **Chosen:** pressed in solid ink with plate-white text, 1px lower, and the LED lit flat orange. Selection is always ink; there is no separate highlight colour.
- **Rails:** keys sit in a recessed rail-grey bed (6px corner, 3px inset); one ink block slides to the choice like a fader cap with a slight overshoot.
- **Primary button:** the one orange key, near-black label; at most one per context.
- **Focus:** 2px orange outline, 2px offset.

### Action keys (fold, call, raise)
Big keys in the knob colours: raise orange, call blue, both with near-black Archivo labels at 16px and a mono key hint; fold is a plain key cap. They travel 4px on press; the picked key stays down with a 2px ink outline.

### Plates
Plate White, 6px corner, plate hairline, 20px padding. Score, fact and outs boxes inside plates are 4px wells in the ground colour. Practice blocks use a 1px dashed ink border. Formulas sit in a plate with an inset ink rule in mono.

### Feedback plate
A plate with a 1.5px border in the grade colour (good green, warn amber) and a grade LED dot that blinks on; it slides up on arrival.

### Inputs
Recessed wells: plate white, 1px ink border, 3px corner, inner shadow; orange focus outline and orange border when invalid.

### Navigation
The app bar is a plate-white strip closed by one ink rule, holding the knob logo and "169", the tab keys, and three small square switch keys (theme, effects, dots). The current tab is a chosen key. Theory chapters are numbered on small square keys; the current chapter is pressed in ink.

### Range grid (signature)
169 key caps (2px corner, plate-white, hairline). Each holds a disc whose area is the frequency: orange core for raise, blue ring for call, a bare square for fold. Labels on discs below 60% stay one ink colour on a halo of the square's own colour, so the disc shows around them; only lit discs (60% or more) invert the label to near-black-on-knob. The selected hand gets an ink frame inside its square. The grid lens swells discs toward the pointer.

### Playing cards
White card stock, 5px corner, ranks in Unbounded 800; red suits in Card Red. Card backs are a grille of ink perforations inside an ink rule. Cards are dealt in at an angle, overshoot and settle; cards placed in a slot snap in.

### Speaker grille (signature texture)
Ink perforations: the gutter dot field in the page margins (drawn by the living layer from `--field-ink` at 16% light, 13% dark), a two-row strip along the top of trainer tables, and card backs.

### Motion
- Keys: hover lifts 1px; press travels 2px with a slight squash in 50ms (`--snap`), then springs back over 320ms with overshoot (`--spring`). Every press is held at least 90ms (`.pressing`, set by the living layer) so a quick click still shows travel, with a 5ms buzz on phones.
- A key that becomes chosen latches down with a bounce; its LED flickers on over 380ms.
- Feedback plates slide in; big readouts roll up 6px when they change; the grade ripple and right-answer pop come from the living layer.
- Everything above stops under `data-fx="off"` and `prefers-reduced-motion`.

## Do's and Don'ts

### Do:
- **Do** make every choice a key: 3px corner, LED, lip; chosen means pressed in ink with a flat orange LED.
- **Do** keep orange for raise and blue for call, and put near-black `--on-knob` text on every knob colour.
- **Do** set every number in Martian Mono condensed, and words in Archivo at medium weight.
- **Do** keep the disc area equal to frequency, and invert a grid label only when its disc is lit (60% or more).
- **Do** route every colour through tokens so light and OP-1 black both work.
- **Do** give every new motion an off state under `data-fx="off"` and reduced motion.

### Don't:
- **Don't** use orange or blue for win, tie, "you", chapter markers or decoration; those are ink and grey.
- **Don't** put white text on a knob colour.
- **Don't** give LEDs a glow or plates a cast shadow; depth is the key lip only.
- **Don't** use ALL-CAPS labels or positive letter-spacing.
- **Don't** bring back the poker-felt green table or the op-art poster.

## Previous design

Op Field (the living op-art field) is preserved as git tag `design-op-field` and lives on as the base layer in `css/falcon.css`, which `css/te.css` overrides. Warm charcoal is git tag `design-warm-charcoal` and `archive/warm-charcoal/`.
