---
name: 169 Poker (Op Field)
description: A poker study app drawn as a living Vasarely field, where the area of each disc is how often a hand is played.
colors:
  op-white: "#eef0f5"
  plate-white: "#fbfbfd"
  rail-grey: "#e3e6ee"
  hairline: "#c9cdd8"
  ink: "#15161d"
  ink-soft: "#343846"
  muted: "#565c6d"
  dim: "#7a8091"
  ultramarine: "#2430d8"
  magenta: "#d8226a"
  magenta-light: "#f07aa6"
  fold-square: "#dfe2ea"
  pair-square: "#f2f3f8"
  grade-good: "#0e8f63"
  grade-warn: "#c96a00"
  card-stock: "#ffffff"
typography:
  display:
    fontFamily: "Anybody, Hanken Grotesk, system-ui, sans-serif"
    fontSize: "clamp(34px, 4.6vw, 64px)"
    fontWeight: 850
    lineHeight: 0.92
    letterSpacing: "-0.025em"
    fontVariation: "'wdth' 118"
  headline:
    fontFamily: "Anybody, Hanken Grotesk, system-ui, sans-serif"
    fontSize: "clamp(30px, 3.6vw, 44px)"
    fontWeight: 800
    lineHeight: 1.06
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 118"
  title:
    fontFamily: "Anybody, Hanken Grotesk, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 750
    lineHeight: 1.1
    fontVariation: "'wdth' 118"
  body:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'tnum'"
  body-long:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    letterSpacing: "normal"
rounded:
  none: "0px"
  disc: "50%"
spacing:
  grid-gap: "3px"
  grid-gap-phone: "2px"
  control-gap: "6px"
  plate-padding: "20px"
  column-gap: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.plate-white}"
    rounded: "{rounded.none}"
    padding: "9px 18px"
  button-primary-hover:
    backgroundColor: "{colors.ultramarine}"
    textColor: "{colors.plate-white}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "9px 18px"
  segment-option:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.none}"
    padding: "6px 14px"
  segment-option-struck:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.plate-white}"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.none}"
    padding: "6px 12px"
  chip-struck:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.plate-white}"
  action-call:
    backgroundColor: "{colors.ultramarine}"
    textColor: "#ffffff"
    rounded: "{rounded.none}"
    padding: "14px 12px"
  action-raise:
    backgroundColor: "{colors.magenta}"
    textColor: "#ffffff"
    rounded: "{rounded.none}"
    padding: "14px 12px"
  action-fold:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "14px 12px"
  plate:
    backgroundColor: "{colors.plate-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "20px"
  input:
    backgroundColor: "{colors.plate-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "9px 10px"
  grid-unit:
    backgroundColor: "{colors.plate-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
---

# Design System: 169 Poker (Op Field)

## Overview

**Creative North Star: "The Living Vasarely Field"**

The 169 starting hands already form an op-art field; 169 Poker draws them as one. Every hand is a plastic unit: a sharp square holding a disc whose area is the frequency the hand is played. The visitor sees the range as a pattern first and reads it second. Colour lives in the fields (the discs, the action blocks, the bars); text sits on calm, achromatic plates of white or op-white, so reading never fights the pattern.

The world is light, cool and exact. Every corner is square; circles are the only curves, and they always carry meaning (a frequency, a grade, a card back, a chapter number). Controls show every option at once as a ghost, and the chosen one is struck in solid ink. Motion belongs to the field: discs swell under the pointer like a lens, the page gutters breathe as a slow dot field, and a graded answer sends a ring through that field in the grade's colour. Under reduced motion, all of it holds still.

The world rejects the dark poker-felt study tool it replaces: no felt, no wood, no glow, no rounded casino chrome.

**Key Characteristics:**
- Cool op-white ground, white reading plates, near-black ink.
- Two field colours with fixed meaning: ultramarine calls, magenta raises.
- Selection is marked in ink: an inset frame on the chosen grid unit, an outline on the picked action, a 2px ink border on the active card slot. (Orange was used for this at first and dropped: it read as unintentional.)
- All corners sharp; circles are the only curves.
- Ghost-and-struck controls: options outlined or bare, the chosen one solid ink.
- Wide, heavy Anybody display over Hanken Grotesk reading text.
- Flat plates separated by tone and hairlines, never by shadow.
- A living ground: lens, breathing gutter dots, grade ripples; still under reduced motion.

## Colors

A cool, near-achromatic paper world with two saturated field colours and one rare highlight.

### Primary
- **Ultramarine**: the call colour and the structural accent. Call discs and the call action block, the formula and link underlines, focus rings, the hover state of the primary button, the square of the logo mark, and the base ink of the gutter dot field.

### Secondary
- **Op Magenta**: the raise colour. Raise discs, the raise action block, the hero seat, the band of op discs over trainer plates, the current Theory chapter disc, emphasised words in the trainer prompt, the "Mistake" grade outline and ripple. **Light Magenta** is only the small-bet segment in board explorer bars, where its label is set in ink, not white.

### Tertiary

### Neutral
- **Op-White**: the page ground, the background of stat tiles, info boxes and the read-ranges grid.
- **Plate White**: reading plates, the app bar, inputs, grid units and the primary button's text.
- **Rail Grey**: secondary fills (Theory chapter number discs, tracks).
- **Hairline**: quiet dividers and unchosen chip borders.
- **Ink**: all primary text, every rule and outline, the struck state of every control.
- **Ink Soft**: secondary body copy. **Muted**: labels, unchosen options, captions. **Dim**: non-essential hints only.
- **Fold Square** and **Pair Square**: the bare fill of the fold part of bars and the slightly cooler square behind pocket pairs.
- **Grade Good** and **Grade Warn**: grading only (feedback outline, ripple colour). "Bad" grades use magenta.

### Named Rules
**The Field Colour Rule.** Ultramarine means call, magenta means raise, everywhere they appear as fills. A button, bar or disc in either colour is making that claim.

**The Ink Selection Rule.** Selection is always ink, drawn inside the element (an inset frame) so a scroll box can never clip it.

**The Achromatic Plate Rule.** Text plates are white or op-white. Colour belongs to the fields and to thin rules; it does not tint reading surfaces.

## Typography

**Display Font:** Anybody (with Hanken Grotesk, system-ui), variable width 50-150 and weight 300-900
**Body Font:** Hanken Grotesk (with system-ui), weight 400-700
**Label/Mono Font:** Hanken Grotesk with tabular figures (`--mono` points at it)

**Character:** Anybody set wide (width 112-135%) and very heavy (750-900), tight leading and negative tracking, gives headings the mass of a printed op poster. Hanken Grotesk is calm and legible for the explanations, and its tabular figures keep equities and combos aligned.

### Hierarchy
- **Display** (850, clamp(34px, 4.6vw, 64px), 0.92): the view title over the field ("BTN open-raise"). Theory chapter titles go larger (clamp(40px, 6vw, 76px), width 125%, 0.96).
- **Headline** (800, clamp(30px, 3.6vw, 44px), 1.06): Theory section headings. The hand name in the hand plate (900, clamp(44px, 4.2vw, 56px), width 112%) and the grade head in feedback (800, 28px) sit at this level.
- **Title** (750, 22px): Theory sub-headings; stat figures in tiles (800) and action block labels (750, 17px, width 115%) also use Anybody.
- **Body** (400, 15px, 1.5): UI copy on plates, capped near 62ch. Long-form Theory paragraphs run 16px at 1.7, capped near 66ch.
- **Label** (600, 13px, no letter-spacing, sentence case): control group labels, plate labels ("This spot", "This session"), captions.

### Named Rules
**The Wide Ink Rule.** Display type is Anybody, wide and heavy, and only for titles, hand names, grades and figures. Never set reading copy in it.

**The Sentence Case Rule.** Labels are sentence case with normal tracking. No all-caps, no letter-spaced labels.

## Layout

One grid module runs through the app. The range field is a 13 x 13 grid of square units with a 3px gap (2px at 420px and below, where columns become `minmax(0, 1fr)` so the field fits a 390px phone). The Preflop and Trainer views use a two-column wrap (max 1180px: the field column plus a 340px sticky plate, 24px gap), collapsing to one column at 900px. Theory uses a 190px chapter path beside a 720px article column, also stacking at 900px. The wide display title sits directly over the field; controls stack above it in rows with 6px gaps and 14px between groups.

The page gutters outside the 1200px content band carry the dot field (20px pitch). On screens without gutters (less than 24px each side) the field draws nothing.

## Elevation & Depth

The system is flat. Depth comes from tone (op-white ground, white plates) and from ink rules, never from cast shadow. The only "shadows" in the build are box-shadow rings used as borders.

### Shadow Vocabulary
- **Plate hairline** (`box-shadow: 0 0 0 1px rgba(21,22,29,.07)`): edge of plates, trainer tables, worked examples, steps.
- **Ink rule** (`box-shadow: inset 0 0 0 1.5px #15161d`, via `var(--ink)`): segmented rails, ghost buttons, playing cards, formula boxes, the hovered resource item.
- **App bar rule** (`box-shadow: inset 0 -2px 0 #15161d`): the single heavy ink line under the app bar.

### Named Rules
**The No-Cast-Shadow Rule.** Nothing floats. Plates sit on the ground and are separated from it by tone and a hairline.

## Shapes

All corners are square (0px) on plates, controls, inputs, bars, tags, seats and playing cards. Circles (50%) are the only curves and each one carries meaning: the frequency disc inside a grid unit, the feedback grade marker, Theory chapter numbers, the trainer's band of op discs, the concentric rings on card backs, and the dots of the gutter field. Outlines are ink at 1.5px (2px on the fold action block and feedback plates); dashed ink marks something to do (the "Practice this" box, missing hands in Read ranges).

**The Only-Circles Rule.** A shape is either a square-cornered rectangle or a true circle. No pills, no rounded rectangles.

## Components

### Buttons
Ruled rectangles, decisive and printed.
- **Shape:** square corners (0px).
- **Primary:** solid ink with plate-white text; hover turns it ultramarine. Transition 0.2s on background and colour; no lift, no press offset.
- **Ghost:** transparent with a 1.5px inset ink rule and ink text; hover lays a 7% ink wash.
- **Focus:** 2px ultramarine outline, 2px offset.

### Segmented rails (signature control)
Every option is visible as a ghost; the chosen one is struck in ink.
- **Rail:** transparent with a 1.5px inset ink rule and 3px padding.
- **Options:** muted text, ink on hover.
- **Struck:** with JavaScript, one ink thumb slides along the rail to the selected option (transform, width and height over 0.34s, cubic-bezier(.16,1,.3,1)), and the selected label turns plate white. Without JavaScript the selected option is filled in ink directly.

### Chips
- **Style:** transparent, 1px hairline border, ink-soft text.
- **State:** hover gives a white fill and ink border; selected is struck in solid ink with plate-white text. App bar tabs follow the same grammar: bare muted text, the current tab struck in ink.

### Action blocks
Enamel blocks in the field colours: call is solid ultramarine, raise is solid magenta (both with white Anybody labels), fold is a transparent block with a 2px ink rule. Disabled blocks drop to 22% opacity. The block the player picked carries a 3px ink outline.

### Cards / Containers (plates)
- **Corner Style:** square (0px).
- **Background:** plate white; stat tiles, info boxes and log rows sit inside in op-white.
- **Shadow Strategy:** plate hairline only (see Elevation & Depth).
- **Internal Padding:** 20px on the main plate, 18px gaps between its blocks.

### Trainer table
The trainer plate carries a band of magenta op discs along its top edge (14px pitch, repeated across). Seats are op-white squares; the hero seat is solid magenta with white text, the villain seat is ruled in ink, folded seats are struck through.

### Feedback
A white plate ruled 2px in the grade colour (good green, warn amber, magenta for a mistake), headed in Anybody 800 at 28px. Its marker is a grade-coloured disc with concentric white rings (an op target). Appearing, it sends a ripple through the gutter field in the same colour.

### Inputs / Fields
- **Style:** plate-white fill, 1.5px ink border, square corners.
- **Focus:** 2px ultramarine outline.
- **Error:** border turns to the raise accent.

### Playing cards
White stock with a 1.5px inset ink rule, square corners; red suits in magenta. The card back is a concentric-ring target: ultramarine and plate-white rings at a 6px period, inside a white margin and an ink edge.

### Navigation
App bar: a plate-white strip closed by a 2px ink rule. The brand is Anybody 900 at width 135% beside the op mark (an ultramarine square, a magenta disc, an op-white core; the disc shrinks to 72% on hover). Tabs are ghost-and-struck. The Theory path numbers chapters in rail-grey discs; the current chapter's disc is magenta.

### Range field units (signature component)
Each of the 169 hands is a square plate-white unit (pairs a touch cooler) holding a centred disc. The disc's area equals the frequency: radius is the square root of the share, so a hand played half the time fills half the disc area, not half the radius. A mixed hand shows two concentric fills (inner share in one field colour, outer ring in the other). The label is drawn twice: ink underneath, and a white copy clipped to the disc's exact radius, so the text inverts precisely at the disc edge; a disc of 90% or more carries the whole white label. Never-played hands keep a muted label on the bare square.

On pointer hover, units near the cursor swell (up to 1.42x, Gaussian falloff) like a lens over the field. When a range loads, discs sweep in diagonally from the top-left (0.6s each, 20ms stagger per row plus column).

### Living ground
A canvas behind the page draws a 20px dot field in ultramarine at 42% opacity, only in the gutters outside the content band. Dot radii breathe on two slow crossing sine waves and swell near the pointer. A graded answer sends a ring out from the feedback plate (about 0.62px per ms, fading over 2.6s) that enlarges and recolours the dots it passes.

### Reduced motion
Under `prefers-reduced-motion: reduce`, the ground field draws a single still frame and never ripples, the lens does not respond, the disc sweep and clip transitions are removed, the logo disc does not scale, and the feedback marker does not animate in. The animation loop also stops whenever the page is hidden.

## Do's and Don'ts

### Do:
- **Do** encode frequency as disc area (radius = square root of the share) in any range or frequency view.
- **Do** use ultramarine for call and magenta for raise on every fill that means an action.
- **Do** strike the chosen option in solid ink and leave the others visible as ghosts.
- **Do** keep reading text on plate white or op-white, in ink, ink soft or muted.
- **Do** keep every corner square and reserve circles for things that mean something.
- **Do** mark the current selection in ink, inside the element.
- **Do** give every new animation a still state under reduced motion.

### Don't:
- **Don't** use pills or rounded rectangles; corners are 0px, curves are full circles.
- **Don't** cast shadows or lift elements on hover; depth is tone plus hairline.
- **Don't** tint text plates with the field colours.
- **Don't** set body copy in Anybody, or labels in all caps or letter-spacing.
- **Don't** use dim for anything a player needs to read.
- **Don't** let the gutter field enter the content band.

## Themes

Two themes share every rule above; only the tokens change. The switch sits at the right of the app bar (two small plastic units, the active one struck in ink) and the choice is saved in localStorage (`falcon-theme`). A first visit follows the system's `prefers-color-scheme`; an inline script in `<head>` sets `data-theme` on `<html>` before first paint.

- **Light (default world):** the tokens at the top of this file.
- **Dark ("Op Field at night"):** ground `#0f1120`, plates `#171a2c`, surface-2 `#22263b`, line `#30354f`, ink and text `#eceef6`, text-2 `#c4c8da`, muted `#9ba1b9`, ultramarine lifted to `#5361ff`, magenta to `#e8357f`, fold square `#262a40`, good `#3cc58f`, warn `#f0a03a`. Playing cards stay white with their ink edge. The gutter dot field reads its colour and alpha from the theme.

Because `--ink` is the strongest foreground in both themes, "struck" controls (ink fill, surface-coloured text) invert correctly in dark without extra rules.

## Lens

The lens swells a unit's disc toward the pointer but caps each disc at the size where it touches its square's sides (`1 / (0.88 x b)`), so full discs never get clipped into squares.

## Effects switch

A "Pause effects" switch sits left of the theme switch (a two-bar pause glyph in an ink frame that becomes a play triangle). It is saved as `falcon-fx` and set on `<html>` as `data-fx` before first paint. Paused (or under reduced motion): the gutter field holds a still frame, the lens, ripples, range sweep and grading toss stop. On phones both switches show icons only.

## Gutter field and the pointer

The pointer only affects the field while it is in a gutter: its weight eases from 0 at the content edge to 1 about 120px into the gutter, and its position is eased each frame, so moving between the page and the margin never makes the dots jump. Dots are drawn only where the gutter is visible and never grow beyond 46% of their spacing, so neighbours cannot merge.

## Dots switch

A "Hide dots" switch sits left of the effects switch (four dots in an ink frame; hidden shows them as ghost rings). Saved as `falcon-dots`, set on `<html>` as `data-dots` before first paint. Hidden removes the gutter field and its ripples entirely; the grid lens and other effects follow the effects switch on their own.

## Right-answer celebration

When a trainer grades an answer as correct (a `.fb.good` appears), the button that was pressed (`.act.picked`, or the last clicked button in that trainer, else the feedback marker) hops (lift, slight scale, settle, 560ms), a green ring flashes off it, and 18 small shapes (discs, squares and rings in good green, magenta, ultramarine and ink) pop from its edge outward and fall away over about a second. It plays alongside the green ripple in the gutter field, runs on a fixed pointer-free layer, and is skipped when effects are paused or reduced motion is on. Only fully correct answers get it; "inaccurate" and "close" do not.

## Trainer table band

Each trainer table (`.felt`) has a plain, still checkerboard along its top edge: two rows of 11px ink squares (a 22px conic-gradient tile repeated across), inverting with the theme. No animation. It replaced a static magenta dot strip and two animated experiments that read as generic tech effects.

## Welcome page

Shown on a first visit (no address hash and no `falcon-welcomed` in localStorage) and whenever the logo is clicked (`#welcome`). Left: a large Anybody headline, a one-sentence lede, three starting paths and three plain facts. The paths are full-width rows ruled in ink, each with an outlined disc marker (magenta, ultramarine, ink) that fills and inverts the row to solid ink on hover. They are not a row of cards. Right: the button's real opening range as a live unit field (lens included); picking a hand opens it in the preflop charts. Stacks to one column under 900px.
