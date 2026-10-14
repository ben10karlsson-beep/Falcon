# Warm charcoal (archived design)

Falcon's design before Op Field: warm brown-tinted darks, warm white text, soft rounded panels, "card room" plaque buttons that press, recessed rails with a sliding selection, the clay-chip edge motif, felt grain and cream card stock. It was live on `main` up to commit `0bb7781` (2026-10-14).

## What's here

- `falcon.css`: the complete stylesheet as it was (copy of `css/falcon.css` at that commit). It is not loaded by the site.

## Swapping back

The stylesheet alone is not enough, because the markup and grid rendering changed with Op Field (brand mark, fonts link, the switches in the app bar, and the grid squares became disc units in `js/ranges.js`). The git tag `design-warm-charcoal` holds the whole site in this design:

```
git checkout design-warm-charcoal -- index.html css js
```

That restores the old look but also rolls back any feature work done in those files since, so for anything beyond a quick look, port the pieces you want instead:

- **Tokens:** the `:root` block at the top of `falcon.css` (`--bg #1d1914`, `--surface #27211b`, `--text #f4eadb`, `--red #de6752`, radii 8/14/20px, plaque and rail tokens).
- **Fonts:** Bricolage Grotesque (display) and Figtree (body), loaded from Google Fonts.
- **Grid colours:** raise `#e23b3f`, call `#6e6f78`, fold `#26262a`, drawn as a left-to-right fill per square (the old `bg()` in `js/ranges.js`).
- **Brand mark:** a red clay chip with six cream edge inserts and a cream inner ring (inline SVG, class `chipmark`).
