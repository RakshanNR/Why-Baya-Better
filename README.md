# BayaRadar — interactive competitive spider chart

A self-contained, dependency-free JavaScript widget (vanilla JS + SVG) that renders an
interactive radar/spider chart comparing Baya Systems against competitors across five
metrics, with a click-through side-by-side bar comparison per metric.

Styled to the **Baya / Chiplet Design System v1.2** — Cyber Blue accents, Poppins +
Manrope type, 4px component radii, flat hairline-bordered surfaces — and built to be
dropped into WordPress via an `<iframe>` while staying fully responsive on any device.

## Files

| File | Purpose |
|---|---|
| `baya-radar.js` | The widget. This is the only file you need to integrate. |
| `demo.html` | Working example / the page you host and point a WordPress `<iframe>` at. Serve over HTTP or double-click; it has no network dependencies besides the optional Google Fonts. |
| `serve.ps1` | Optional — tiny PowerShell static server for local preview (`http://localhost:8321`). Not needed for integration. |

## Integration (3 steps)

```html
<div id="radar"></div>
<script src="baya-radar.js"></script>
<script>
  var chart = BayaRadar.create('#radar', {
    series: [
      { name: 'Baya Systems', color: '#0086FF', marker: 'circle',   values: [9, 8.5, 9, 8, 9.5] },
      { name: 'Competitor A', color: '#EE5023', marker: 'square',   values: [6, 5.5, 7, 5, 4]   },
      { name: 'Competitor B', color: '#09DEAB', marker: 'triangle', values: [5, 6.5, 5.5, 6.5, 5] },
      { name: 'In-house',     color: '#0000AD', marker: 'diamond',  values: [7, 6, null, 7.5, 6.5] }
    ]
  });
</script>
```

Use `null` (or leave the editor cell blank) for a metric with **no data** — that point
is skipped on the radar (the outline connects the neighboring metrics directly) and the
comparison panel shows "—" for it.

Every option has a default, so `BayaRadar.create('#radar')` alone also works.

## Plugging in values

Values are **scores from 0 to `maxValue` (default 10) where higher = better**.
For metrics where a lower raw number is better (latency, silicon area), convert to a
score first — e.g. 10 = best-in-class, 5 = mid-pack.

Three ways to change values:

1. **Config** — pass `values: [...]` per series (order matches the `axes` array).
2. **Live editor** — set `editable: true` to render a table of number inputs under the
   chart; edits update the chart immediately (good for workshopping numbers in a meeting).
3. **From code** — `chart.setValue(seriesIndex, axisIndex, value)` or
   `chart.update({ series: [...] })`.

## Interaction

- **Default view (nothing selected)**: the right-hand panel compares each company's
  **average across all metrics** (metrics without data are left out of that company's
  average).
- **Click any corner** of the spider (the vertex, its label, or any data point on that
  spoke) → the panel switches to a side-by-side bar comparison for that metric,
  with a "Leads" badge showing who's ahead and by how much. Click the same corner
  again — or the "Back to overall average" link — to return to the averages.
- **Legend chips**: click to hide/show a company, hover to spotlight it on the chart.
- **Hover a data point** → tooltip with company, metric, and value.
- Value changes animate smoothly (radar morphs, bars glide). Animations respect the
  OS "reduce motion" setting.
- Labels and chips are keyboard-accessible (Tab + Enter).

## Options reference

| Option | Default | Notes |
|---|---|---|
| `title`, `subtitle` | Baya defaults | Header text. |
| `axes` | the 5 Baya metrics | Array of strings or `{label, description}`. Any count ≥ 3 works. |
| `series` | Baya + 2 competitors + In-house | `{name, color, marker, values}`. `marker`: `circle`, `square`, `triangle`, `diamond`. `null` in `values` = no data (point skipped). |
| `maxValue` | `10` | Top of the score scale. |
| `rings` | `5` | Number of grid rings. |
| `selected` | `null` | Axis whose comparison opens first; `null` opens on the overall-average view. |
| `editable` | `false` | Show the live value editor (collapsible "Adjust values" section). |
| `eyebrow` | Baya default | Uppercase label above the title; set `""` to hide. |
| `webFonts` | `true` | Loads Poppins + Manrope (the Design System typefaces) from Google Fonts. Set `false` for offline/air-gapped use — falls back to Century Gothic / the system stack. |

## Design notes

- Styled to the **Baya / Chiplet Design System v1.2**: Poppins for the title/panel
  headers, Manrope for body/UI/data text, Cyber Blue `#0086FF` as the single primary
  accent (focus rings, selected axis, halo), Quantum Teal (`#07a37e` text-safe tint) for
  tertiary text links ("Back to overall average", "Adjust values"), and Neon Yellow
  `#FFCE00` on ink for the "Leads" badge (16.1:1 contrast, AAA).
- Flat, hairline-bordered surfaces per the system's light-elevation rule (tinted grey +
  1px border, never a drop shadow): the widget card sits on white with an `#E5E5E7`
  border, and the comparison panel is a `#F4F4F4` "data tile" per the component spec.
- 4px corner radius everywhere — card, chips, panel, bars, badge, inputs — matching the
  system's "4px is the standard radius across cards, buttons, inputs, and panels" rule.
- Series colors come from the palette's brand set: Baya is Cyber Blue `#0086FF`,
  Competitor A takes Signal Orange `#EE5023`, Competitor B takes Quantum Teal `#09DEAB`,
  and In-house wears Matrix Blue `#0000AD`. All four pass colorblind-separation checks
  with wide margins.
- Each company also has a distinct **marker shape** (circle/square/triangle) used on the
  chart, in the legend, and in the comparison panel — identity never relies on color
  alone. Keep the markers if you change colors.
- Styles are scoped under `.bradar-` class names and injected once, so the widget won't
  fight the host page's CSS. Multiple instances on one page are fine.
- Responsive from wide desktop down to phone widths: the chart and panel sit side by
  side above 767px and stack full-width below it; the value editor's table scrolls
  horizontally instead of overflowing the page. See "Device responsiveness" below.

## WordPress / iframe embedding

This is built to live in its own repo (e.g. GitHub Pages) and be pulled into a WordPress
page via `<iframe>`, since WordPress can't run arbitrary `<script>` widgets in most
page builders without a plugin.

1. **Host the files.** Push `baya-radar.js` and `demo.html` (edit its `series`/`axes` to
   your real data first) to a public GitHub repo, then enable **GitHub Pages** for it
   (Settings → Pages → Deploy from branch). You'll get a URL like
   `https://<user>.github.io/<repo>/demo.html`.
2. **Embed on WordPress.** Add a **Custom HTML** block (or an HTML widget/shortcode in
   your page builder) with:

   ```html
   <iframe
     id="baya-radar-frame"
     src="https://<user>.github.io/<repo>/demo.html"
     style="width:100%;display:block;border:0;"
     scrolling="no"
     loading="lazy"
     title="Baya Systems competitive radar chart">
   </iframe>
   <script>
     window.addEventListener('message', function (e) {
       if (e.data && e.data.source === 'baya-radar' && typeof e.data.height === 'number') {
         var f = document.getElementById('baya-radar-frame');
         if (f) f.style.height = e.data.height + 'px';
       }
     });
   </script>
   ```

   `demo.html` already posts its rendered height to the parent window on load and on
   any resize (via `ResizeObserver`), so the listener above grows/shrinks the iframe to
   fit the chart exactly — no fixed height, no scrollbars, no cut-off content as the
   visitor's screen width changes. This works whether the iframe is full-width, in a
   column, or in a sidebar.
3. **No cross-origin issues:** `postMessage` with `'*'` works across the GitHub Pages ↔
   WordPress origin boundary; only the message's own JSON payload (`source`, `height`)
   crosses over, nothing else.

### Device responsiveness

- The chart's SVG uses a `viewBox` and scales fluidly with its container — no fixed
  pixel width, so it looks correct from a 4K monitor down to a 320px phone.
- Below **1024px** the card padding tightens; below **767px** the chart and comparison
  panel stack vertically (full width each) instead of sitting side by side, and legend
  chips/panel type shrink slightly; below **420px** the comparison bar labels/values
  compress further so nothing clips on the smallest phones.
- The live-editor table is wrapped in a horizontally-scrolling container, so adding many
  metrics never breaks the page layout on narrow viewports.
