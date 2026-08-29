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
| `portfolio.js` | **The drop-in section** — header, dark stage, carousel, auto-cycle. One `mount()` call. |
| `baya-radar.js` | The chart widget (single-product and multi-product modes). |
| `data.js` | **All the numbers.** One block per design; edit here, save, refresh. |
| `dashboard.html` | Thin host page showing exactly the embed snippet below. |
| `demo.html` | Single full-size chart example (for embedding one chart somewhere). |
| `serve.ps1` | Optional PowerShell static server for local preview. Not required — the pages open from a double-click. |

## Embedding on the website

Drop this anywhere on a white section of the page (script order matters):

```html
<div id="baya-portfolio"></div>
<script src="baya-radar.js"></script>
<script src="data.js"></script>
<script src="portfolio.js"></script>
<script>BayaPortfolio.mount('#baya-portfolio');</script>
```

That renders the full section: eyebrow + title (Poppins 44.8 px / 500, matching the
site's hero titles), the dark stage, the design carousel with arrows, and the idle
auto-cycle. Options:
`BayaPortfolio.mount(el, { eyebrow, title, data, idleMs, stepMs })` — pass `""` for
`eyebrow`/`title` if the surrounding page already provides its own heading. The call
returns `{ chart, show }` (`show(2)` jumps to Design 3, `show(null)` to All designs).
Styles are scoped (`.bp-*` / `.bradar-*`) and won't collide with the site's CSS.

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

- **Design carousel**: the header shows the current view ("All designs" or "Design N")
  with **arrow buttons on the right** (and ←/→ keys) to step through — All designs →
  Design 1 → … → Design 10. Isolating a design draws its lines on with a quick sweep
  and fades the other nine to ghosts.
- **All-designs stop**: every design's polygons thin and superimposed, colored by
  company — and the panel becomes **"Baya benefit by metric"**: one diverging bar per
  metric showing Baya's signed % edge vs the best alternative (blue = ahead, coral =
  behind), with a zero line and scale. Clicking a row opens that metric's side-by-side.
- **Idle auto-cycle**: leave the page untouched for 5 seconds and it walks the carousel
  every 3 seconds on its own; any mouse/keyboard/touch input pauses it, and it resumes
  after you've been idle again. (Disabled under the OS "reduce motion" setting.)
- **Click any corner** of the spider → the panel switches to that metric (the title
  shows the design on top, the metric underneath). Click the corner again — or "Back
  to overall average" — to return.
- **Legend and panel rows both**: click a company (top legend or its bar row on the
  right) to hide/show it everywhere; hover either to spotlight it on the chart.
- **Hover a data point** (isolated design) → tooltip with company, design, metric, value.
- Everything is keyboard-accessible.

## Using the widget standalone

```html
<div id="radar"></div>
<script src="baya-radar.js"></script>
<script>
  var chart = BayaRadar.create('#radar', {
    series: [
      { name: 'Baya Systems', color: '#0086ff', marker: 'circle',   values: [9, 8.5, 9, 8, 9.5] },
      { name: 'Competitor A', color: '#f1502f', marker: 'square',   values: [6, 5.5, 7, 5, 4]   },
      { name: 'Competitor B', color: '#0a9fae', marker: 'triangle', values: [5, 6.5, 5.5, 6.5, 5] },
      { name: 'In-house',     color: '#4a3aa7', marker: 'diamond',  values: [7, 6, 6.5, 7.5, 6.5] }
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
see `dashboard.html`; then `chart.setProduct(i)` isolates a product and
`chart.setProduct(null)` shows all.

Options: `title` / `subtitle` / `eyebrow` (set `""` to hide), `axes` (strings or
`{label, short, description}` — `short` is used by compact tiles), `maxValue` (10),
`rings` (5), `selected` (`null` = averages view), `products` / `product` (multi-product
mode), `compact` (small tile variant), `frameless` (no card chrome — the host page
provides it), `tweenMs` (morph duration, default 380), `editable` (opt-in on-page
editor, single mode only, off by default), `webFonts` (set `false` offline; falls back
to system fonts).

## Design notes

- Palette, type, and details are lifted from bayasystems.com: Poppins headings (500),
  Manrope text, the site's button blue `#0086ff`, its yellow tag `#ffce00` for the
  "Leads" badge, 4 px radii, cool gray hairlines, flat white cards.
- Series colors: Baya = brand blue `#0086ff`; competitors = the site's red-orange
  `#f1502f` and teal `#0a9fae` (deepened one step for contrast on white); In-house =
  violet `#4a3aa7`. The four pass colorblind-separation and 3:1 contrast checks together.
- Each company also has a fixed **marker shape** (circle / square / triangle /
  inverted triangle; `diamond` is also available) on the charts, legend, and bars, so
  identity never relies on color alone. Keep the markers if you change colors.
- Styles are scoped under `.bradar-` classes and injected once; the widget won't fight
  the host page's CSS, and many instances can share one page.
