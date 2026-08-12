# BayaRadar — "Baya vs its competitors"

A self-contained, dependency-free set of files (vanilla JS + SVG). One radar/spider
chart carries **every product line at once** — ten thin polygons per company,
colored by company (Baya Systems, two competitors, and an in-house option across
five metrics). Product buttons on the right isolate one product with a crossfade;
left idle for five seconds, the page cycles through the portfolio on its own.
Styled to sit naturally next to bayasystems.com (Poppins/Manrope, the site's
`#0086ff` blue, `#ffce00` tags, flat white surfaces).

## Files

| File | Purpose |
|---|---|
| `index.html` | **The main page** — the superimposed chart, product buttons, idle auto-cycle. This is what's live at the site root. |
| `data.js` | **All the numbers.** One block per product; edit here, save, refresh. |
| `baya-radar.js` | The chart widget (single-product and multi-product modes). |
| `demo.html` | Single full-size chart example (for embedding one chart somewhere). |
| `serve.ps1` | Optional PowerShell static server for local preview. Not required — the pages open from a double-click. |

## Changing the numbers (no on-page editing)

Data entry is deliberately not part of the page. All scores live in
[`data.js`](data.js) as one commented block per product:

```js
{
  name: "Product 3",
  values: [
    [9.5, 8, 9.5, 7.5, 9],   // Baya Systems
    [5.5, 6.5, 6, 6.5, 5],   // Competitor A
    [7, 5.5, 7.5, 5, 5.5],   // Competitor B
    [null, 6, 6.5, 6, 6]     // In-house
  ]
}
```

- Column order: **[Latency, Power Efficiency, Bandwidth, Silicon Area, PD Closure]**.
- Scores are 0–10, **higher = better** — for metrics where a lower raw number is better
  (latency, area), enter a score, not the raw number.
- **`null` = no data**: the outline breaks at that metric (drawing a chord across the
  chart would read as a star) and the bars show "—". Missing metrics are excluded from
  that company's average.
- Product names ("Product 1"…) and company names/colors are at the top of the same file.
- Each product may carry an optional `note: "…"` field (currently unused by the
  dashboard, reserved for captions).

Two ways to edit: open `data.js` in any editor, or ask Claude Code, e.g.
*"set Product 4's Competitor A latency to 7"* — then refresh the page.

## Interaction

- **All-products view (default)**: every product's polygons drawn thin and superimposed,
  colored by company — the portfolio's shape at a glance. The side panel averages each
  company **across all ten products**.
- **Product buttons (right)**: click one to isolate that product — its four polygons come
  forward (markers and tooltips switch on) while the rest fade to ghosts. "All products"
  brings everything back.
- **Idle auto-cycle**: leave the page untouched for 5 seconds and it steps through the
  products every 3 seconds on its own; any mouse/keyboard/touch input pauses it, and it
  resumes after you've been idle again. (Disabled automatically for users with the OS
  "reduce motion" setting.)
- **Click any corner** of the spider → the bars switch to that metric (averaged across
  products in the all-view, or that product's scores when one is isolated). Click the
  corner again — or "Back to overall average" — to return.
- **Legend chips**: click a company to hide/show it everywhere; hover to spotlight it.
- **Hover a data point** (isolated product) → tooltip with company, product, metric, value.
- Everything is keyboard-accessible.

## Using the widget standalone

```html
<div id="radar"></div>
<script src="baya-radar.js"></script>
<script>
  var chart = BayaRadar.create('#radar', {
    series: [
      { name: 'Baya Systems', color: '#0086ff', marker: 'circle',   values: [9, 8.5, 9, 8, 9.5] },
      { name: 'Competitor A', color: '#ee5023', marker: 'square',   values: [6, 5.5, 7, 5, 4]   },
      { name: 'Competitor B', color: '#07a37e', marker: 'triangle', values: [5, 6.5, 5.5, 6.5, 5] },
      { name: 'In-house',     color: '#3d4148', marker: 'diamond',  values: [7, 6, null, 7.5, 6.5] }
    ]
  });
  // chart.setValue(seriesIdx, axisIdx, value)   — change one number from code
  // chart.setValues([[...], [...], ...])        — swap all values and morph
  // chart.update({ series: [...] })             — replace everything
  // chart.setVisible(seriesIdx, bool)           — hide/show a company
  // chart.select(axisIdx)                       — open a metric (null = averages)
</script>
```

For the superimposed multi-product mode, pass `products` (and series without values) —
see `index.html`; then `chart.setProduct(i)` isolates a product and
`chart.setProduct(null)` shows all.

Options: `title` / `subtitle` / `eyebrow` (set `""` to hide), `axes` (strings or
`{label, short, description}` — `short` is used by compact tiles), `maxValue` (10),
`rings` (5), `selected` (`null` = averages view), `products` / `product` (multi-product
mode), `compact` (small tile variant), `frameless` (no card chrome — the host page
provides it), `tweenMs` (morph duration, default 380), `editable` (opt-in on-page
editor, single mode only, off by default), `webFonts` (set `false` offline; falls back
to system fonts).

## Design notes

Styled to the **Baya / Chiplet Design System v1.2**:

- **Type** — Poppins for headings/eyebrows-as-labels, Manrope for body, UI, and data
  (eyebrows use Manrope 700, uppercase, `0.08em` tracking, per the system's `.c-type-eye`
  spec). No text renders below the 12px platform floor, including chart tick labels.
- **Color** — Baya = Cyber Blue `#0086ff` (brand.primary); Competitor A = Signal Orange
  `#ee5023` (brand.accent); Competitor B = `#07a37e`, the AA-safe on-light text tint of
  Quantum Teal (brand.secondary); In-house = a neutral ink-grey `#3d4148`, deliberately
  outside the brand hue set to read as "internal baseline" rather than a market competitor.
  Series colors never carry body text (chip/legend names stay neutral ink) — only markers,
  dots, and bar fills, which is where the system allows vivid accents. The "Leads" badge
  keeps Neon Yellow `#ffce00` with black text (16.1:1, AAA). Hairlines are the system's
  `border.onLight` token `#e5e5e7`.
- **Elevation** — no drop shadows at rest; per the system, light-surface elevation comes
  from a hairline border only. The hover-only tooltip is the one floating element and
  keeps a soft shadow for that reason.
- **Radius** — 4px everywhere (cards, inputs, tooltip, badge, bars) — the system's
  standard component radius, decoupled from the spacing grid.
- **Spacing** — padding/margin/gap values snap to the 8px grid (8·16·24·32…); the product
  rail is marked up as a proper tab list (`role="tablist"`/`"tab"`, `aria-selected`, 44px
  touch targets) with the system's active/inactive tab treatment.
- **Links & tertiary actions** — "Back to overall average" and the value-editor toggle
  are tertiary text actions per the system's button tiers: Quantum Teal text color, an
  underline plus arrow-nudge on hover, not the brand blue (which is reserved for the
  eyebrow, primary actions, and hyperlinks proper).
- Each company also has a fixed **marker shape** (circle / square / triangle /
  inverted triangle; `diamond` is also available) on the charts, legend, and bars, so
  identity never relies on color alone. Keep the markers if you change colors.
- Styles are scoped under `.bradar-` classes and injected once; the widget won't fight
  the host page's CSS, and many instances can share one page.
