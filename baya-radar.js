/*!
 * BayaRadar — interactive spider/radar comparison chart (vanilla JS + SVG, no dependencies)
 * Styled to match bayasystems.com (Poppins/Manrope, #0086ff blue, #ffce00 tags).
 *
 * Two modes:
 *
 * 1) SINGLE — one product, one polygon per company (values on each series):
 *      BayaRadar.create('#radar', {
 *        series: [
 *          { name: 'Baya Systems', color: '#0086ff', values: [9, 8.5, 9, 8, 9.5] },
 *          { name: 'Competitor A', color: '#f1502f', values: [6, 5.5, 7, 5, 4]   },
 *          { name: 'Competitor B', color: '#0a9fae', values: [5, 6.5, 5.5, 6.5, 5] },
 *          { name: 'In-house',     color: '#4a3aa7', values: [7, 6, 6.5, 7.5, 6.5] }
 *        ]
 *      });
 *
 * 2) MULTI-PRODUCT — every design's polygons superimposed, colored by company
 *    (dashboard.html uses this; series carry no values, products do):
 *      BayaRadar.create('#radar', {
 *        series: [{ name, color }, ...],                    // the companies
 *        products: [{ name: 'Design 1', values: [ [..], [..], [..], [..] ] }, ...],
 *        product: null                                      // null = all; 0..N-1 isolates one
 *      });
 *      chart.setProduct(3);     // isolate Design 4 (crossfades, dots + tooltips on)
 *      chart.setProduct(null);  // back to all designs
 *
 * theme: "light" (default) or "dark" — dark puts the radar on a glowing light plate
 * over a navy surface (chart colors are validated for the light plate they draw on).
 *
 * Values are scores 0..maxValue where HIGHER = BETTER (normalize inverted metrics
 * like latency/area into scores first). null / undefined / "" = no data — the outline
 * breaks at that metric (no chord is drawn across the chart) and the comparison bars
 * show "—".
 *
 * Interaction: with no metric selected the side panel compares AVERAGES (in multi
 * mode with no product isolated, averages span every product). Click an axis corner
 * for that metric's side-by-side; click it again to go back. Legend entries hide/show
 * a company; hovering one spotlights it.
 *
 * Instance API: update(cfg), setValue(si, ai, v), setValues(rows), select(ai|null),
 *   setProduct(pi|null), getProduct(), setVisible(si, bool), highlight(si, bool),
 *   getConfig(), destroy().  (setValue/setValues are single-mode only.)
 */
(function (global) {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var STYLE_ID = "baya-radar-styles";
  var FONTS_ID = "baya-radar-fonts";
  var UID = 0;
  var REDUCED = typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  var DEFAULTS = {
    eyebrow: "Competitive Landscape",
    title: "Baya vs its competitors",
    subtitle: "Scores 0–10, higher is better. Click a corner for one metric; click it again for the overall average.",
    axes: [
      { label: "Latency", short: "Latency", description: "Higher score = lower latency" },
      { label: "Power Efficiency", short: "Power", description: "Higher score = better perf/W" },
      { label: "Bandwidth", short: "B/W", description: "Higher score = higher sustained bandwidth" },
      { label: "Silicon Area", short: "Area", description: "Higher score = smaller area" },
      { label: "Physical Design Closure", short: "PD Closure", description: "Higher score = easier timing closure" }
    ],
    series: [
      { name: "Baya Systems", color: "#0086ff", values: [9, 8.5, 9, 8, 9.5] },
      { name: "Competitor A", color: "#f1502f", values: [6, 5.5, 7, 5, 4] },
      { name: "Competitor B", color: "#0a9fae", values: [5, 6.5, 5.5, 6.5, 5] },
      { name: "In-house", color: "#4a3aa7", values: [7, 6, 6.5, 7.5, 6.5] }
    ],
    products: null,   // array of {name, values:[rows per series]} switches on multi mode
    product: null,    // multi mode: isolated product index, or null for all
    maxValue: 10,
    rings: 5,
    selected: null,   // null = overall average view; 0..N-1 opens on that metric
    theme: "light",
    compact: false,
    frameless: false, // true = no card chrome (host page provides it)
    tweenMs: 380,     // duration of the morph when values change (single mode)
    editable: false,
    webFonts: true
  };

  var CSS = [
    ".bradar-root{--br-ink:#0a0a0b;--br-sub:#55595e;--br-mut:#8a9099;--br-line:#e4e9f0;",
    "  --br-seg:#e9edf3;--br-seg-border:#dbe1ea;--br-accent:#0086ff;--br-accent-deep:#0068c9;",
    "  --br-yellow:#ffce00;--br-surface:#ffffff;",
    "  --br-head:'Poppins',system-ui,-apple-system,'Segoe UI',sans-serif;",
    "  --br-body:'Manrope',system-ui,-apple-system,'Segoe UI',sans-serif;",
    "  position:relative;background:var(--br-surface);color:var(--br-ink);font-family:var(--br-body);",
    "  border:1px solid #e7ecf2;border-radius:8px;padding:26px 28px 24px;",
    "  box-sizing:border-box;max-width:960px;",
    "  box-shadow:0 1px 2px rgba(16,24,40,.04);}",
    ".bradar-root{--br-pos:#0068c9;--br-neg:#d63a20;--br-zero:rgba(10,10,11,.35);}",
    ".bradar-root.bradar-dark{--br-ink:#f2f5fa;--br-sub:#aab3c5;--br-mut:#7c8598;",
    "  --br-line:rgba(255,255,255,.09);--br-seg:#1b2233;--br-seg-border:#262f45;",
    "  --br-accent:#3f9dff;--br-accent-deep:#7cbcff;--br-surface:transparent;",
    "  --br-pos:#0086ff;--br-neg:#ff8d75;--br-zero:rgba(255,255,255,.4);",
    "  border:none;box-shadow:none;}",
    ".bradar-root.bradar-compact,.bradar-root.bradar-frameless{border:none;border-radius:0;",
    "  padding:0;box-shadow:none;max-width:none;}",
    ".bradar-root *{box-sizing:border-box;}",
    ".bradar-eyebrow{font-family:var(--br-head);font-size:17px;font-weight:500;",
    "  color:var(--br-accent);margin:0 0 7px;}",
    ".bradar-title{font-family:var(--br-head);font-size:27px;font-weight:500;margin:0 0 5px;}",
    ".bradar-subtitle{font-size:15px;font-weight:500;color:var(--br-sub);margin:0 0 16px;line-height:1.5;}",
    ".bradar-legend{display:flex;flex-wrap:wrap;gap:4px 26px;margin:0 0 6px;}",
    ".bradar-chip{display:inline-flex;align-items:center;gap:10px;font-family:var(--br-body);",
    "  font-size:17px;font-weight:600;color:var(--br-sub);background:none;",
    "  border:none;padding:5px 0;cursor:pointer;transition:color .15s,opacity .2s;}",
    ".bradar-chip:hover{color:var(--br-ink);}",
    ".bradar-chip:focus-visible{outline:2px solid var(--br-accent);outline-offset:2px;}",
    ".bradar-chip.bradar-off{opacity:.35;filter:grayscale(.6);text-decoration:line-through;}",
    ".bradar-dot{width:13px;height:13px;border-radius:50%;flex:0 0 13px;}",
    ".bradar-main{display:flex;flex-wrap:wrap;gap:6px 26px;align-items:flex-start;}",
    ".bradar-compact .bradar-main{display:block;}",
    ".bradar-chart-wrap{flex:1 1 430px;min-width:320px;position:relative;}",
    ".bradar-compact .bradar-chart-wrap{min-width:0;}",
    ".bradar-chart{width:100%;height:auto;display:block;}",
    ".bradar-series-layer{transition:opacity .25s;}",
    ".bradar-series-layer.bradar-dim{opacity:.16;}",
    ".bradar-series-layer.bradar-hidden{display:none;}",
    /* multi-product groups: thin superimposed lines; emphasis draws itself on */
    ".bradar-product{transition:opacity .28s;}",
    ".bradar-product .bradar-pl{fill:none;stroke-width:1.25;opacity:.45;stroke-linejoin:round;",
    "  transition:opacity .28s,stroke-width .2s;}",
    ".bradar-product .bradar-pf,.bradar-product .bradar-pm{display:none;}",
    ".bradar-product.bradar-em .bradar-pl{opacity:.95;stroke-width:2.6;",
    "  filter:drop-shadow(0 0 2.5px currentColor);stroke-dasharray:1;",
    "  animation:bradar-draw .45s cubic-bezier(.55,.05,.3,1) both;}",
    ".bradar-product.bradar-em .bradar-pf{display:block;animation:bradar-fade .4s .12s backwards;}",
    ".bradar-product.bradar-em .bradar-pm{display:block;transform-box:fill-box;",
    "  transform-origin:center;animation:bradar-pop .26s cubic-bezier(.3,1.25,.55,1) backwards;}",
    ".bradar-product.bradar-ghost{opacity:.015;}",
    ".bradar-product:not(.bradar-em) .bradar-ph{pointer-events:none;}",
    ".bradar-cdim{opacity:.08 !important;}",
    ".bradar-chidden{display:none !important;}",
    ".bradar-product.bradar-em .bradar-pl.bradar-pl0{stroke-width:3.2;}",
    "@keyframes bradar-draw{from{stroke-dashoffset:1;}to{stroke-dashoffset:0;}}",
    "@keyframes bradar-pop{0%{opacity:0;transform:scale(.4);}65%{opacity:1;transform:scale(1.12);}",
    "  100%{opacity:1;transform:scale(1);}}",
    "@keyframes bradar-fade{from{opacity:0;}to{opacity:1;}}",
    ".bradar-axis-label{font-family:var(--br-body);font-size:14px;font-weight:700;",
    "  fill:var(--br-sub);cursor:pointer;}",
    ".bradar-dark .bradar-axis-label{fill:var(--br-ink);}",
    ".bradar-compact .bradar-axis-label{font-size:12px;}",
    ".bradar-axis-label:hover{fill:var(--br-accent-deep);}",
    /* no box outlines on SVG text — they mis-wrap multi-line labels; focus shows as color */
    ".bradar-axis-label:focus{outline:none;}",
    ".bradar-axis-label:focus-visible{outline:none;fill:var(--br-accent);}",
    ".bradar-axis-label.bradar-sel{font-weight:800;fill:var(--br-accent);}",
    ".bradar-axis-sub{font-size:10.5px;font-weight:500;fill:var(--br-mut);}",
    ".bradar-wedge{fill:rgba(0,134,255,.08);pointer-events:none;}",
    ".bradar-tick{font-family:var(--br-body);font-size:10.5px;font-weight:600;fill:#8a9099;",
    "  paint-order:stroke;stroke:#ffffff;stroke-width:3px;}",
    ".bradar-dark .bradar-tick{fill:#6b768c;stroke:#0c0f17;}",
    ".bradar-halo{fill:rgba(0,134,255,.12);stroke:#0086ff;stroke-width:1.5;",
    "  filter:drop-shadow(0 0 5px rgba(0,134,255,.55));}",
    ".bradar-hit{cursor:pointer;}",
    ".bradar-tooltip{position:absolute;pointer-events:none;background:#0a0a0b;color:#fff;",
    "  padding:7px 11px;border-radius:6px;white-space:nowrap;z-index:5;opacity:0;",
    "  transform:translate(-50%,-124%) scale(.97);box-shadow:0 8px 22px rgba(16,24,40,.28);}",
    ".bradar-dark .bradar-tooltip{background:#ffffff;color:#0a0a0b;",
    "  box-shadow:0 8px 26px rgba(0,0,0,.5);}",
    ".bradar-tooltip.bradar-on{opacity:1;transform:translate(-50%,-124%) scale(1);}",
    ".bradar-tt-name{display:flex;align-items:center;gap:7px;font-size:13.5px;font-weight:700;margin:0 0 2px;}",
    ".bradar-tt-dot{width:9px;height:9px;border-radius:50%;flex:0 0 9px;}",
    ".bradar-tt-metric{font-size:12px;font-weight:500;color:#c6ccd4;}",
    ".bradar-dark .bradar-tt-metric{color:#55595e;}",
    ".bradar-tt-metric b{color:inherit;font-family:var(--br-body);font-size:14px;font-weight:800;margin-left:2px;}",
    ".bradar-panel{flex:0 1 300px;min-width:250px;background:none;",
    "  border-left:1px solid var(--br-line);padding:8px 0 4px 26px;margin-top:14px;}",
    ".bradar-dark .bradar-panel{border-left:none;background:rgba(255,255,255,.025);",
    "  border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:18px 20px 14px;margin-top:0;}",
    ".bradar-compact .bradar-panel{border:none;min-width:0;padding:10px 2px 0;margin-top:2px;}",
    /* overall-benefit card: Baya's average score vs the competitor average */
    ".bradar-overall{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.08);",
    "  border-radius:12px;padding:14px 20px 12px;}",
    ".bradar-ov-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;}",
    ".bradar-ov-val{font-family:var(--br-head);font-size:26px;font-weight:600;",
    "  line-height:1.1;font-variant-numeric:tabular-nums;}",
    ".bradar-ov-val.bradar-pos{color:var(--br-pos);}",
    ".bradar-ov-val.bradar-neg{color:var(--br-neg);}",
    ".bradar-panel-title{font-family:var(--br-head);font-size:20px;font-weight:600;margin:0 0 4px;}",
    ".bradar-compact .bradar-panel-title{font-size:12.5px;margin:0 0 8px;color:var(--br-sub);font-weight:600;}",
    ".bradar-panel-desc{font-size:13px;font-weight:500;color:var(--br-mut);margin:0 0 16px;line-height:1.45;}",
    ".bradar-bar-row{display:flex;align-items:center;gap:10px;margin:0 0 13px;transition:opacity .25s;",
    "  animation:bradar-row .38s cubic-bezier(.2,.9,.3,1.15) backwards;cursor:pointer;}",
    ".bradar-bar-row:hover .bradar-bar-name{color:var(--br-ink);}",
    ".bradar-bar-row:focus-visible{outline:2px solid var(--br-accent);outline-offset:2px;}",
    ".bradar-compact .bradar-bar-row{gap:7px;margin:0 0 8px;}",
    ".bradar-bar-row.bradar-off{opacity:.35;}",
    ".bradar-bar-name{flex:0 0 124px;font-size:15px;font-weight:600;color:var(--br-sub);display:flex;",
    "  align-items:center;gap:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
    ".bradar-compact .bradar-bar-name{flex:0 0 14px;}",
    /* continuous energy bars: gradient fill with a soft glow, springy width */
    ".bradar-bar-track{flex:1 1 auto;height:15px;background:var(--br-seg);",
    "  border-radius:999px;overflow:hidden;}",
    ".bradar-compact .bradar-bar-track{height:11px;}",
    ".bradar-bar-fill{height:100%;width:0;min-width:3px;border-radius:0 999px 999px 0;}",
    "@keyframes bradar-row{from{opacity:0;transform:translateX(-10px);}",
    "  to{opacity:1;transform:translateX(0);}}",
    ".bradar-bar-val{flex:0 0 44px;font-family:var(--br-body);font-size:17.5px;font-weight:800;",
    "  color:var(--br-ink);text-align:right;font-variant-numeric:tabular-nums;}",
    ".bradar-compact .bradar-bar-val{flex:0 0 26px;font-size:11.5px;}",
    /* Baya vs best alternative, per metric — signed diverging bars (panel default) */
    ".bradar-ben-row{display:flex;align-items:center;gap:12px;margin:0 0 13px;cursor:pointer;",
    "  animation:bradar-row .38s cubic-bezier(.2,.9,.3,1.15) backwards;}",
    ".bradar-ben-row:focus-visible{outline:2px solid var(--br-accent);outline-offset:2px;}",
    ".bradar-ben-main{flex:1 1 auto;min-width:0;}",
    ".bradar-ben-top{display:flex;justify-content:space-between;align-items:baseline;",
    "  gap:8px;margin:0 0 6px;}",
    ".bradar-ben-label{font-family:var(--br-head);font-size:15px;font-weight:500;color:var(--br-ink);",
    "  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
    ".bradar-ben-row:hover .bradar-ben-label{color:var(--br-accent);}",
    ".bradar-ben-vs{font-family:var(--br-head);font-size:12px;font-weight:500;",
    "  color:var(--br-mut);white-space:nowrap;}",
    ".bradar-ben-track{position:relative;height:12px;background:var(--br-seg);",
    "  border:1px solid var(--br-seg-border);border-radius:999px;}",
    ".bradar-ben-zero{position:absolute;top:-3px;bottom:-3px;width:2px;",
    "  background:var(--br-zero);border-radius:1px;transform:translateX(-1px);}",
    ".bradar-ben-fill{position:absolute;top:2px;bottom:2px;border-radius:999px;min-width:4px;}",
    ".bradar-ben-fill.bradar-pos{background:linear-gradient(90deg,#0079e6,#0086ff);",
    "  box-shadow:0 0 6px rgba(0,134,255,.3);}",
    ".bradar-ben-fill.bradar-neg{background:linear-gradient(90deg,#ff8d75,#f1502f);",
    "  box-shadow:0 0 6px rgba(241,80,47,.28);}",
    ".bradar-ben-val{flex:0 0 68px;text-align:right;font-family:var(--br-head);font-size:20px;",
    "  font-weight:600;font-variant-numeric:tabular-nums;}",
    ".bradar-ben-val.bradar-pos{color:var(--br-pos);}",
    ".bradar-ben-val.bradar-neg{color:var(--br-neg);}",
    ".bradar-ben-val.bradar-even{color:var(--br-sub);}",
    ".bradar-badge{display:inline-flex;align-items:center;gap:8px;font-size:14.5px;font-weight:700;",
    "  color:#0a0a0b;background:var(--br-yellow);border:none;border-radius:4px;padding:6px 13px 6px 11px;margin-top:8px;",
    "  animation:bradar-row .35s .22s cubic-bezier(.2,.9,.3,1.15) backwards;}",
    ".bradar-compact .bradar-badge{font-size:10.5px;padding:4px 9px 4px 8px;margin-top:4px;gap:6px;}",
    ".bradar-badge.bradar-tie{background:#eef1f5;}",
    ".bradar-dark .bradar-badge.bradar-tie{background:#232b40;color:#f2f5fa;}",
    ".bradar-badge-dot{width:8px;height:8px;border-radius:50%;flex:0 0 8px;",
    "  box-shadow:0 0 0 1.5px rgba(255,255,255,.85);}",
    ".bradar-badge small{color:rgba(10,10,11,.6);font-weight:600;}",
    ".bradar-back-wrap{margin:10px 0 0;}",
    ".bradar-compact .bradar-back-wrap{margin:6px 0 0;}",
    ".bradar-back{background:none;border:none;padding:0;font-family:var(--br-body);font-size:14.5px;",
    "  font-weight:700;color:var(--br-accent);cursor:pointer;}",
    ".bradar-compact .bradar-back{font-size:11px;}",
    ".bradar-back:hover{color:var(--br-accent-deep);}",
    ".bradar-back:focus-visible{outline:2px solid var(--br-accent);outline-offset:2px;}",
    ".bradar-editor{margin-top:18px;border-top:1px solid var(--br-line);padding-top:12px;}",
    ".bradar-editor-toggle{display:inline-flex;align-items:center;gap:6px;background:none;border:none;",
    "  padding:2px 0;font-family:var(--br-body);font-size:13px;font-weight:700;color:var(--br-accent);",
    "  cursor:pointer;}",
    ".bradar-editor-toggle:hover{color:var(--br-accent-deep);}",
    ".bradar-editor-toggle svg{transition:transform .25s;}",
    ".bradar-editor-toggle.bradar-open svg{transform:rotate(90deg);}",
    ".bradar-editor-body{overflow:hidden;transition:max-height .3s ease;}",
    ".bradar-editor-caption{font-size:11.5px;font-weight:500;color:var(--br-mut);margin:10px 0 8px;}",
    ".bradar-editor-scroll{overflow-x:auto;}",
    ".bradar-editor table{border-collapse:collapse;font-size:12.5px;}",
    ".bradar-editor th{font-size:11.5px;font-weight:600;",
    "  color:var(--br-mut);text-align:left;padding:4px 9px;white-space:nowrap;}",
    ".bradar-editor td{padding:4px 9px;}",
    ".bradar-editor tbody tr:hover{background:#f6f9fd;}",
    ".bradar-editor td:first-child{white-space:nowrap;color:var(--br-ink);font-weight:600;}",
    ".bradar-editor input{width:62px;padding:5px 7px;border:1px solid #d5dde8;border-radius:4px;",
    "  font-family:var(--br-body);font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;",
    "  color:var(--br-ink);background:#fff;transition:border-color .15s,box-shadow .15s;}",
    ".bradar-editor input:hover{border-color:#b3c0d1;}",
    ".bradar-editor input:focus{outline:none;border-color:var(--br-accent);",
    "  box-shadow:0 0 0 3px rgba(0,134,255,.15);}",
    "@media (prefers-reduced-motion: no-preference){",
    "  .bradar-bar-fill{transition:width .55s cubic-bezier(.22,.9,.3,1.06),box-shadow .3s;}",
    "  .bradar-tooltip{transition:opacity .12s,transform .12s;}",
    "  .bradar-halo{transition:cx .3s cubic-bezier(.22,.8,.36,1),cy .3s cubic-bezier(.22,.8,.36,1);}",
    /* fill 'backwards', never 'forwards': a finished fill-forward animation would pin
       opacity at 1 and silently defeat the ghost/dim fades above */
    "  .bradar-series-anim{animation:bradar-grow .55s cubic-bezier(.22,.8,.36,1) backwards;",
    "    transform-box:view-box;transform-origin:center;}",
    "}",
    "@keyframes bradar-grow{from{opacity:0;transform:scale(.86);}to{opacity:1;transform:scale(1);}}",
    "@media (prefers-reduced-motion: reduce){",
    "  .bradar-product,.bradar-product .bradar-pl,.bradar-bar-fill{transition:none;}",
    "  .bradar-product.bradar-em .bradar-pl,.bradar-product.bradar-em .bradar-pf,",
    "  .bradar-product.bradar-em .bradar-pm,.bradar-bar-row,.bradar-badge{animation:none;}",
    "}"
  ].join("\n");

  function injectStyles(webFonts) {
    if (webFonts && !document.getElementById(FONTS_ID)) {
      var l = document.createElement("link");
      l.id = FONTS_ID;
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@500;600&family=Manrope:wght@500;600;700;800&display=swap";
      document.head.appendChild(l);
    }
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function svgEl(name, attrs, parent) {
    var e = document.createElementNS(SVG_NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function htmlEl(tag, className, parent, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  function fmt(v) {
    var r = Math.round(v * 10) / 10;
    return r % 1 === 0 ? String(r) : r.toFixed(1);
  }

  // Identity is carried by color alone (the palette is colorblind-validated for the
  // light surface the lines draw on); legends and bars use plain color dots.
  function colorDot(color, size) {
    var d = htmlEl("span", "bradar-dot", null);
    if (size) { d.style.width = size + "px"; d.style.height = size + "px"; d.style.flexBasis = size + "px"; }
    d.style.background = color;
    return d;
  }

  function cleanRow(row, len, max) {
    var out = (row || []).slice(0, len);
    while (out.length < len) out.push(null);
    return out.map(function (v) {
      if (v === null || v === undefined || v === "") return null;
      var n = +v;
      return isNaN(n) ? null : Math.max(0, Math.min(max, n));
    });
  }

  function normalizeConfig(user) {
    var cfg = {};
    for (var k in DEFAULTS) cfg[k] = user && user[k] !== undefined ? user[k] : DEFAULTS[k];
    cfg.axes = cfg.axes.map(function (a) {
      return typeof a === "string"
        ? { label: a, short: a, description: "", sub: "" }
        : { label: a.label, short: a.short || a.label,
            description: a.description || "", sub: a.sub || "" };
    });
    cfg.series = cfg.series.map(function (s, i) {
      var d = DEFAULTS.series[i] || DEFAULTS.series[0];
      return {
        name: s.name || d.name,
        color: s.color || d.color,
        values: cleanRow(s.values, cfg.axes.length, cfg.maxValue)
      };
    });
    if (Array.isArray(cfg.products) && cfg.products.length) {
      cfg.products = cfg.products.map(function (p, i) {
        return {
          name: p.name || "Design " + (i + 1),
          values: cfg.series.map(function (_, si) {
            return cleanRow(p.values && p.values[si], cfg.axes.length, cfg.maxValue);
          })
        };
      });
    } else {
      cfg.products = null;
    }
    return cfg;
  }

  function create(target, userConfig) {
    var container = typeof target === "string" ? document.querySelector(target) : target;
    if (!container) throw new Error("BayaRadar: container element not found");

    var cfg = normalizeConfig(userConfig);
    injectStyles(cfg.webFonts);

    var uid = "br" + (++UID);
    var COMPACT = !!cfg.compact;
    var MULTI = !!cfg.products;
    var DARK = cfg.theme === "dark";
    var selected = cfg.selected == null ? null
      : Math.max(0, Math.min(cfg.axes.length - 1, cfg.selected));
    var productSel = (MULTI && cfg.product != null)
      ? Math.max(0, Math.min(cfg.products.length - 1, cfg.product)) : null;
    var visible = cfg.series.map(function () { return true; });
    var disp = cfg.series.map(function (s) { return s.values.slice(); }); // animated display values (single mode)
    var prevVals = cfg.series.map(function () { return null; }); // for the count-up numbers
    var tweenRaf = null;

    // chart chrome tokens — dark draws directly on the navy with faint blue rings
    // and a soft center glow (series colors are validated for the dark surface)
    var T = DARK ? {
      glowOn: true,
      ringMinor: "rgba(105,150,230,.14)", ringMajor: "rgba(130,170,240,.26)",
      spoke: "rgba(105,150,230,.14)",
      nodeFill: "#0c0f17", nodeStroke: "rgba(255,255,255,.55)",
      markerRing: "#0c0f17"
    } : {
      glowOn: false,
      ringMinor: "#eef1f6", ringMajor: "#e3e8ef",
      spoke: "#e3e8ef",
      nodeFill: "#ffffff", nodeStroke: "#9aa2ac",
      markerRing: "#ffffff"
    };

    var root = htmlEl("div", "bradar-root" + (COMPACT ? " bradar-compact" : "") +
      (cfg.frameless ? " bradar-frameless" : "") + (DARK ? " bradar-dark" : ""), null);
    container.appendChild(root);

    // geometry — compact tiles use a tighter frame and short single-line labels
    var W = COMPACT ? 350 : 580, H = COMPACT ? 272 : 424;
    var CX = W / 2, CY = COMPACT ? 142 : 216, R = COMPACT ? 94 : 172;

    function angle(i) { return (-90 + (i * 360) / cfg.axes.length) * Math.PI / 180; }
    function pt(i, r) { return [CX + r * Math.cos(angle(i)), CY + r * Math.sin(angle(i))]; }
    function rTo(v) { return (R * v) / cfg.maxValue; }

    // Outline + fill path for a row that may contain nulls. The outline BREAKS at a
    // missing metric — bridging the gap would draw a chord across the chart and read
    // as a star. Fill only exists for complete rows (a partial fill would lie).
    function pathFromRow(row) {
      var n = row.length;
      function P(i) {
        var p = pt(i, rTo(row[i]));
        return p[0].toFixed(1) + " " + p[1].toFixed(1);
      }
      var nonNull = row.filter(function (v) { return v != null; }).length;
      if (!nonNull) return { line: "", fill: "" };
      if (nonNull === n) {
        var d = "M" + P(0);
        for (var i = 1; i < n; i++) d += "L" + P(i);
        d += "Z";
        return { line: d, fill: d };
      }
      // walk cyclic runs of consecutive non-null axes; each run is its own open segment
      var d2 = "";
      for (var s = 0; s < n; s++) {
        if (row[s] == null || row[(s - 1 + n) % n] != null) continue; // not a run start
        var run = [s], j = (s + 1) % n;
        while (row[j] != null && j !== s) { run.push(j); j = (j + 1) % n; }
        if (run.length >= 2) {
          d2 += "M" + P(run[0]);
          for (var k = 1; k < run.length; k++) d2 += "L" + P(run[k]);
        }
      }
      return { line: d2, fill: "" };
    }

    // refs filled by mount()
    var refs = {};

    function mount() {
      root.textContent = "";
      if (!COMPACT) {
        if (cfg.eyebrow) htmlEl("p", "bradar-eyebrow", root, cfg.eyebrow);
        if (cfg.title) htmlEl("p", "bradar-title", root, cfg.title);
        if (cfg.subtitle) htmlEl("p", "bradar-subtitle", root, cfg.subtitle);
        refs.legend = htmlEl("div", "bradar-legend", root);
      } else {
        refs.legend = null;
      }
      var main = htmlEl("div", "bradar-main", root);
      refs.chartWrap = htmlEl("div", "bradar-chart-wrap", main);
      refs.tooltip = htmlEl("div", "bradar-tooltip", refs.chartWrap);
      refs.panel = htmlEl("div", "bradar-panel", main);
      refs.overall = MULTI ? buildOverall(main) : null;
      refs.editor = (cfg.editable && !COMPACT && !MULTI) ? htmlEl("div", "bradar-editor", root) : null;
      buildLegend();
      buildChart();
      if (!MULTI) setGeometry();
      applySelection();
      if (MULTI) applyProduct();
      renderPanel();
      buildEditor();
    }

    // ---- legend (entries toggle series; hovering spotlights one) ----
    function buildLegend() {
      refs.chips = null;
      if (!refs.legend) return;
      refs.chips = [];
      cfg.series.forEach(function (s, si) {
        var chip = htmlEl("button", "bradar-chip", refs.legend);
        chip.type = "button";
        chip.setAttribute("aria-pressed", "true");
        chip.title = "Click to hide/show " + s.name;
        chip.appendChild(colorDot(s.color));
        chip.appendChild(document.createTextNode(s.name));
        chip.addEventListener("click", function () { setVisible(si, !visible[si]); });
        chip.addEventListener("mouseenter", function () { spotlight(si, true); });
        chip.addEventListener("mouseleave", function () { spotlight(si, false); });
        refs.chips.push(chip);
      });
    }

    // every SVG element belonging to company si (multi mode collects across products)
    function companyEls(si) {
      if (!MULTI) return [refs.seriesLayers[si]];
      var els = [];
      refs.products.forEach(function (pr) {
        var c = pr.companies[si];
        els.push(c.line, c.fill);
        els = els.concat(c.markers, c.hits);
      });
      return els;
    }

    function setVisible(si, on) {
      if (visible[si] === !!on) return;
      visible[si] = !!on;
      companyEls(si).forEach(function (el) {
        el.classList.toggle(MULTI ? "bradar-chidden" : "bradar-hidden", !visible[si]);
      });
      if (refs.chips) {
        refs.chips[si].classList.toggle("bradar-off", !visible[si]);
        refs.chips[si].setAttribute("aria-pressed", String(visible[si]));
      }
      spotlight(si, false);
      renderPanel();
    }

    function spotlight(si, on) {
      cfg.series.forEach(function (_, i) {
        var dim = on && visible[si] && visible[i] && i !== si;
        companyEls(i).forEach(function (el) {
          el.classList.toggle(MULTI ? "bradar-cdim" : "bradar-dim", dim);
        });
      });
    }

    // ---- chart skeleton ----
    function buildChart() {
      var old = refs.chartWrap.querySelector("svg.bradar-chart");
      if (old) old.remove();
      var svg = svgEl("svg", { "class": "bradar-chart", viewBox: "0 0 " + W + " " + H,
        role: "img", "aria-label": cfg.title || "Competitive radar" });
      refs.chartWrap.insertBefore(svg, refs.tooltip);
      refs.svg = svg;

      var defs = svgEl("defs", {}, svg);
      cfg.series.forEach(function (s, si) {
        var g = svgEl("radialGradient", { id: uid + "-g" + si, gradientUnits: "userSpaceOnUse",
          cx: CX, cy: CY, r: R }, defs);
        svgEl("stop", { offset: "0", "stop-color": s.color, "stop-opacity": "0.03" }, g);
        svgEl("stop", { offset: "1", "stop-color": s.color, "stop-opacity": "0.17" }, g);
      });

      // soft bluish glow behind the chart center (dark theme)
      if (T.glowOn) {
        var gg = svgEl("radialGradient", { id: uid + "-bg", gradientUnits: "userSpaceOnUse",
          cx: CX, cy: CY, r: R + 30 }, defs);
        svgEl("stop", { offset: "0", "stop-color": "#2a7fff", "stop-opacity": "0.13" }, gg);
        svgEl("stop", { offset: "0.7", "stop-color": "#2a7fff", "stop-opacity": "0.05" }, gg);
        svgEl("stop", { offset: "1", "stop-color": "#2a7fff", "stop-opacity": "0" }, gg);
        svgEl("circle", { cx: CX, cy: CY, r: R + 30, fill: "url(#" + uid + "-bg)" }, svg);
      }

      // circular ring grid: thin minor rings with a stronger ring at each scale step
      var steps = cfg.rings * 2;
      for (var ri = 1; ri <= steps; ri++) {
        svgEl("circle", { cx: CX, cy: CY, r: (R * ri) / steps, fill: "none",
          stroke: ri % 2 === 0 ? T.ringMajor : T.ringMinor, "stroke-width": 1 }, svg);
      }
      refs.spokes = [];
      cfg.axes.forEach(function (_, i) {
        var v = pt(i, R);
        refs.spokes.push(svgEl("line", { x1: CX, y1: CY, x2: v[0], y2: v[1],
          stroke: T.spoke, "stroke-width": 1 }, svg));
      });

      var ring;
      if (!COMPACT) {
        for (ring = 0; ring <= cfg.rings; ring++) {
          svgEl("text", { x: CX + 6, y: CY - (R * ring) / cfg.rings + 3, "class": "bradar-tick" }, svg)
            .textContent = fmt((cfg.maxValue * ring) / cfg.rings);
        }
      }

      refs.wedge = svgEl("path", { "class": "bradar-wedge" }, svg);
      refs.halo = svgEl("circle", { r: COMPACT ? 10 : 14, "class": "bradar-halo" }, svg);

      if (MULTI) buildProducts(svg);
      else buildSingle(svg, defs);

      // axis endpoint nodes (drawn above the series so they always read)
      cfg.axes.forEach(function (_, i) {
        var v = pt(i, R);
        svgEl("circle", { cx: v[0].toFixed(1), cy: v[1].toFixed(1), r: COMPACT ? 3 : 4,
          fill: T.nodeFill, stroke: T.nodeStroke, "stroke-width": 1.5 }, svg);
      });

      // axis labels + corner hit zones
      refs.axisLabels = [];
      cfg.axes.forEach(function (ax, ai) {
        var a = angle(ai), cos = Math.cos(a), sin = Math.sin(a);
        var off = COMPACT ? 13 : 20;
        var lx = CX + (R + off) * cos, ly = CY + (R + off) * sin;
        var anchor = cos > 0.25 ? "start" : cos < -0.25 ? "end" : "middle";
        var lines;
        if (COMPACT) {
          lines = [ax.short];
        } else {
          var words = ax.label.split(" ");
          lines = (words.length >= 2 && ax.label.length > 12)
            ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")]
            : [ax.label];
        }
        var sub = COMPACT ? "" : ax.sub;
        var totalLines = lines.length + (sub ? 1 : 0);
        if (sin < -0.5) {                                       // top labels grow upward
          ly -= (totalLines - 1) * 16;
          if (ly < 21) ly = 21;                                 // but never past the frame edge
        }
        else if (sin < 0.5) ly -= (totalLines - 1) * 8;         // side labels center on the vertex
        var t = svgEl("text", { x: lx, y: ly + (sin > 0.5 ? 11 : 4), "text-anchor": anchor,
          "class": "bradar-axis-label", role: "button", tabindex: 0,
          "aria-label": "Compare " + ax.label }, svg);
        lines.forEach(function (line, li) {
          svgEl("tspan", { x: lx, dy: li === 0 ? 0 : 16 }, t).textContent = line;
        });
        if (sub) {
          svgEl("tspan", { x: lx, dy: 15, "class": "bradar-axis-sub" }, t).textContent = sub;
        }
        t.addEventListener("click", function () { select(ai); });
        t.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); select(ai); }
        });
        refs.axisLabels.push(t);
        var corner = pt(ai, R);
        svgEl("circle", { cx: corner[0], cy: corner[1], r: COMPACT ? 14 : 18, fill: "transparent",
          "class": "bradar-hit" }, svg).addEventListener("click", function () { select(ai); });
      });
    }

    // ---- single mode: one animated polygon set per company ----
    function buildSingle(svg, defs) {
      var f = svgEl("filter", { id: uid + "-glow", x: "-30%", y: "-30%", width: "160%", height: "160%" }, defs);
      svgEl("feDropShadow", { dx: 0, dy: 2, stdDeviation: COMPACT ? 3.5 : 5,
        "flood-color": cfg.series[0].color, "flood-opacity": 0.25 }, f);

      refs.seriesLayers = [];
      var order = cfg.series.map(function (_, idx) { return idx; }).reverse();
      order.forEach(function (si) {
        var s = cfg.series[si];
        var layer = svgEl("g", { "class": "bradar-series-layer bradar-series-anim" }, svg);
        if (si === 0) layer.setAttribute("filter", "url(#" + uid + "-glow)");
        var fill = svgEl("path", { fill: "url(#" + uid + "-g" + si + ")", stroke: "none" }, layer);
        var stroke = svgEl("path", { fill: "none", stroke: s.color,
          "stroke-width": si === 0 ? (COMPACT ? 2 : 2.5) : (COMPACT ? 1.5 : 2),
          "stroke-linejoin": "round", "stroke-linecap": "round" }, layer);
        var markers = s.values.map(function () {
          return svgEl("circle", { r: COMPACT ? 3.2 : 4, fill: s.color,
            stroke: T.markerRing, "stroke-width": 1.5 }, layer);
        });
        refs.seriesLayers[si] = layer;
        refs.seriesLayers[si]._fill = fill;
        refs.seriesLayers[si]._stroke = stroke;
        refs.seriesLayers[si]._markers = markers;
      });

      refs.hits = cfg.series.map(function (sr, si) {
        return sr.values.map(function (_, ai) {
          var hit = svgEl("circle", { r: COMPACT ? 10 : 13, fill: "transparent", "class": "bradar-hit" }, svg);
          hit.addEventListener("mousemove", function (ev) {
            if (!visible[si]) return;
            showTooltip(ev, si, ai, null);
          });
          hit.addEventListener("mouseleave", hideTooltip);
          hit.addEventListener("click", function () { select(ai); });
          return hit;
        });
      });
    }

    // ---- multi mode: every design's polygons superimposed, colored by company ----
    function buildProducts(svg) {
      refs.products = cfg.products.map(function (p, pi) {
        var group = svgEl("g", { "class": "bradar-product bradar-series-anim" }, svg);
        if (!REDUCED) group.style.animationDelay = (pi * 35) + "ms";
        var companies = [];
        var order = cfg.series.map(function (_, idx) { return idx; }).reverse();
        order.forEach(function (si) {
          var s = cfg.series[si];
          var d = pathFromRow(p.values[si]);
          var fill = svgEl("path", { "class": "bradar-pf", d: d.fill,
            fill: "url(#" + uid + "-g" + si + ")", stroke: "none" }, group);
          var line = svgEl("path", { "class": "bradar-pl" + (si === 0 ? " bradar-pl0" : ""),
            d: d.line, stroke: s.color, "stroke-linecap": "round", pathLength: 1 }, group);
          line.style.color = s.color; // lets the emphasis glow + draw-on use currentColor
          var markers = [], hits = [];
          p.values[si].forEach(function (v, ai) {
            if (v == null) return;
            var pos = pt(ai, rTo(v));
            var mk = svgEl("circle", { "class": "bradar-pm",
              cx: pos[0].toFixed(1), cy: pos[1].toFixed(1), r: 3.8,
              fill: s.color, stroke: T.markerRing, "stroke-width": 1.5 }, group);
            mk.style.animationDelay = (0.26 + markers.length * 0.035) + "s"; // dots settle in quietly
            markers.push(mk);
            var hit = svgEl("circle", { "class": "bradar-hit bradar-ph",
              cx: pos[0].toFixed(1), cy: pos[1].toFixed(1), r: 12, fill: "transparent" }, group);
            hit.addEventListener("mousemove", function (ev) {
              if (!visible[si]) return;
              showTooltip(ev, si, ai, pi);
            });
            hit.addEventListener("mouseleave", hideTooltip);
            hit.addEventListener("click", function () { select(ai); });
            hits.push(hit);
          });
          companies[si] = { line: line, fill: fill, markers: markers, hits: hits };
        });
        return { group: group, companies: companies };
      });
    }

    function applyProduct() {
      refs.products.forEach(function (pr, pi) {
        pr.group.classList.toggle("bradar-em", productSel === pi);
        pr.group.classList.toggle("bradar-ghost", productSel != null && productSel !== pi);
      });
    }

    // ---- geometry from animated display values (single mode only) ----
    function setGeometry() {
      cfg.series.forEach(function (_, si) {
        var layer = refs.seriesLayers[si];
        var d = pathFromRow(disp[si]);
        layer._fill.setAttribute("d", d.fill);
        layer._stroke.setAttribute("d", d.line);
        disp[si].forEach(function (v, ai) {
          var marker = layer._markers[ai], hit = refs.hits[si][ai];
          if (v == null) {
            marker.style.display = "none";
            hit.style.display = "none";
            return;
          }
          marker.style.display = "";
          hit.style.display = "";
          var p = pt(ai, rTo(v));
          marker.setAttribute("cx", p[0].toFixed(1));
          marker.setAttribute("cy", p[1].toFixed(1));
          hit.setAttribute("cx", p[0].toFixed(1));
          hit.setAttribute("cy", p[1].toFixed(1));
        });
      });
    }

    function tweenTo() {
      if (MULTI) return;
      if (tweenRaf) cancelAnimationFrame(tweenRaf);
      var from = disp.map(function (row) { return row.slice(); });
      var to = cfg.series.map(function (s) { return s.values.slice(); });
      updatePanelValues(); // bars animate via CSS in parallel with the radar tween
      if (REDUCED) {
        disp = to; setGeometry();
        return;
      }
      var t0 = null, DUR = +cfg.tweenMs || 380;
      function step(ts) {
        if (t0 === null) t0 = ts;
        var t = Math.min(1, (ts - t0) / DUR);
        var e = 1 - Math.pow(1 - t, 3); // cubic ease-out
        disp = from.map(function (row, si) {
          return row.map(function (v, ai) {
            var tv = to[si][ai];
            if (v == null || tv == null) return tv; // no tween into/out of "no data"
            return v + (tv - v) * e;
          });
        });
        setGeometry();
        if (t < 1) tweenRaf = requestAnimationFrame(step);
        else tweenRaf = null;
      }
      tweenRaf = requestAnimationFrame(step);
    }

    // ---- tooltip ----
    function showTooltip(ev, si, ai, pi) {
      var s = cfg.series[si];
      var box = refs.chartWrap.getBoundingClientRect();
      refs.tooltip.textContent = "";
      var nameRow = htmlEl("div", "bradar-tt-name", refs.tooltip);
      var dot = htmlEl("span", "bradar-tt-dot", nameRow);
      dot.style.background = s.color;
      nameRow.appendChild(document.createTextNode(s.name));
      var value = pi == null ? s.values[ai] : cfg.products[pi].values[si][ai];
      var label = (pi == null ? "" : cfg.products[pi].name + " · ") + cfg.axes[ai].label + " ";
      var metric = htmlEl("div", "bradar-tt-metric", refs.tooltip, label);
      htmlEl("b", "", metric, fmt(value));
      refs.tooltip.style.left = (ev.clientX - box.left) + "px";
      refs.tooltip.style.top = (ev.clientY - box.top) + "px";
      refs.tooltip.classList.add("bradar-on");
    }
    function hideTooltip() { refs.tooltip.classList.remove("bradar-on"); }

    // ---- selection (null = overall average view; clicking a selected corner clears it) ----
    function select(axisIdx) {
      selected = selected === axisIdx ? null : axisIdx;
      applySelection();
      renderPanel();
    }

    function applySelection() {
      refs.spokes.forEach(function (sp, i) {
        sp.setAttribute("stroke", i === selected ? "#0086ff" : T.spoke);
        sp.setAttribute("stroke-width", i === selected ? 2 : 1);
      });
      refs.axisLabels.forEach(function (t, i) {
        t.classList.toggle("bradar-sel", i === selected);
      });
      if (selected == null) {
        refs.halo.style.display = "none";
        refs.wedge.style.display = "none";
        return;
      }
      refs.halo.style.display = "";
      var v = pt(selected, R);
      refs.halo.setAttribute("cx", v[0].toFixed(1));
      refs.halo.setAttribute("cy", v[1].toFixed(1));
      // soft sector behind the selected slice (half-way to each neighboring axis)
      refs.wedge.style.display = "";
      var half = Math.PI / cfg.axes.length;
      var a = angle(selected);
      var x0 = (CX + R * Math.cos(a - half)).toFixed(1), y0 = (CY + R * Math.sin(a - half)).toFixed(1);
      var x1 = (CX + R * Math.cos(a + half)).toFixed(1), y1 = (CY + R * Math.sin(a + half)).toFixed(1);
      refs.wedge.setAttribute("d", "M" + CX + " " + CY + " L" + x0 + " " + y0 +
        " A" + R + " " + R + " 0 0 1 " + x1 + " " + y1 + " Z");
    }

    // effective per-axis values for company si given the current product context
    function seriesValues(si) {
      if (MULTI) {
        if (productSel != null) return cfg.products[productSel].values[si];
        // no product isolated: per-axis average across every product with data
        return cfg.axes.map(function (_, ai) {
          var vals = cfg.products.map(function (p) { return p.values[si][ai]; })
            .filter(function (v) { return v != null; });
          return vals.length
            ? vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : null;
        });
      }
      return cfg.series[si].values;
    }

    // value shown in the panel: the selected metric, or the mean of available scores
    function panelValue(si) {
      var row = seriesValues(si);
      if (selected != null) return row[selected];
      var have = row.filter(function (v) { return v != null; });
      if (!have.length) return null;
      return have.reduce(function (a, b) { return a + b; }, 0) / have.length;
    }

    // Baya's edge per metric vs the best visible alternative, as signed percents.
    // Uses the current context: the isolated design, or averages across all designs.
    function benefitRows() {
      if (!visible[0]) return [];
      var baya = seriesValues(0);
      var rows = [];
      cfg.axes.forEach(function (axis, ai) {
        var b = baya[ai];
        if (b == null) return;
        var bestSi = -1, bestV = -Infinity;
        for (var si = 1; si < cfg.series.length; si++) {
          if (!visible[si]) continue;
          var v = seriesValues(si)[ai];
          if (v != null && v > bestV) { bestV = v; bestSi = si; }
        }
        if (bestSi < 0 || bestV <= 0) return;
        rows.push({
          ai: ai,
          label: axis.label,
          vs: cfg.series[bestSi].name.replace(/^Competitor /, "Comp. "),
          pct: ((b - bestV) / bestV) * 100
        });
      });
      return rows;
    }

    // default panel view: Baya's performance vs the best alternative, row per metric
    function renderBenefit() {
      refs.barFills = null; // updatePanelValues no-ops in this view
      htmlEl("p", "bradar-panel-title", refs.panel, "Baya benefit by metric");
      var rows = benefitRows();
      if (!rows.length) {
        htmlEl("p", "bradar-panel-desc", refs.panel,
          "Show Baya Systems and at least one other company to compare.");
        return;
      }
      var maxPos = 0, maxNeg = 0;
      rows.forEach(function (r) {
        if (r.pct > maxPos) maxPos = r.pct;
        if (r.pct < maxNeg) maxNeg = r.pct;
      });
      // pad and round the scale out to a clean 5, keeping at least ±5 visible
      var posAxis = Math.max(5, Math.ceil((maxPos * 1.12) / 5) * 5);
      var negAxis = Math.max(5, Math.ceil((-maxNeg * 1.12) / 5) * 5);
      var span = posAxis + negAxis;
      var zeroPct = (negAxis / span) * 100;

      rows.forEach(function (r, i) {
        var row = htmlEl("div", "bradar-ben-row", refs.panel);
        row.style.animationDelay = (i * 45) + "ms";
        row.title = "Show " + r.label + " side by side";
        row.setAttribute("role", "button");
        row.tabIndex = 0;
        row.addEventListener("click", function () { select(r.ai); });
        row.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); select(r.ai); }
        });
        var main = htmlEl("div", "bradar-ben-main", row);
        var top = htmlEl("div", "bradar-ben-top", main);
        htmlEl("span", "bradar-ben-label", top, r.label);
        htmlEl("span", "bradar-ben-vs", top, "vs " + r.vs);
        var track = htmlEl("div", "bradar-ben-track", main);
        var zero = htmlEl("span", "bradar-ben-zero", track);
        zero.style.left = zeroPct.toFixed(2) + "%";
        var fill = htmlEl("span", "bradar-ben-fill " +
          (r.pct >= 0 ? "bradar-pos" : "bradar-neg"), track);
        var w = (Math.abs(r.pct) / span) * 100;
        fill.style.width = w.toFixed(2) + "%";
        fill.style.left = (r.pct >= 0 ? zeroPct : zeroPct - w).toFixed(2) + "%";
        var rounded = Math.round(r.pct);
        htmlEl("span", "bradar-ben-val " +
          (rounded > 0 ? "bradar-pos" : rounded < 0 ? "bradar-neg" : "bradar-even"), row,
          (rounded > 0 ? "+" : rounded < 0 ? "−" : "") + Math.abs(rounded) + "%");
      });
    }

    // ---- overall-benefit card (Baya vs the competitor average, one number) ----
    function buildOverall(parent) {
      var card = htmlEl("div", "bradar-overall", parent);
      var head = htmlEl("div", "bradar-ov-head", card);
      htmlEl("p", "bradar-panel-title", head, "Average Baya benefit");
      refs.ovVal = htmlEl("span", "bradar-ov-val", head);
      return card;
    }

    function updateOverall() {
      if (!refs.overall) return;
      function meanOf(row) {
        var have = row.filter(function (v) { return v != null; });
        return have.length ? have.reduce(function (a, b) { return a + b; }, 0) / have.length : null;
      }
      var show = selected == null && visible[0];
      var baya = show ? meanOf(seriesValues(0)) : null;
      var rivals = [];
      if (show) {
        for (var si = 1; si < cfg.series.length; si++) {
          if (!visible[si]) continue;
          var m = meanOf(seriesValues(si));
          if (m != null) rivals.push(m);
        }
      }
      if (baya == null || !rivals.length) {
        refs.overall.style.display = "none";
        return;
      }
      var rivalAvg = rivals.reduce(function (a, b) { return a + b; }, 0) / rivals.length;
      if (rivalAvg <= 0) { refs.overall.style.display = "none"; return; }
      refs.overall.style.display = "";
      var pct = ((baya - rivalAvg) / rivalAvg) * 100;
      var rounded = Math.round(pct);
      refs.ovVal.textContent = (rounded > 0 ? "+" : rounded < 0 ? "−" : "") + Math.abs(rounded) + "%";
      refs.ovVal.className = "bradar-ov-val " + (rounded >= 0 ? "bradar-pos" : "bradar-neg");
    }

    // ---- side-by-side panel ----
    function renderPanel() {
      refs.panel.textContent = "";
      var ax = selected != null ? cfg.axes[selected] : null;
      if (MULTI && selected == null) {
        renderBenefit();
        updateOverall();
        return;
      }
      if (MULTI) {
        // the carousel header names the design; here just the metric, nothing else
        htmlEl("p", "bradar-panel-title", refs.panel, ax ? ax.label : "All metrics");
      } else if (ax) {
        htmlEl("p", "bradar-panel-title", refs.panel,
          COMPACT ? ax.label : ax.label + " — side by side");
        if (!COMPACT) htmlEl("p", "bradar-panel-desc", refs.panel,
          (ax.description ? ax.description + ". " : "") + "Score 0–" + fmt(cfg.maxValue) + ".");
      } else {
        htmlEl("p", "bradar-panel-title", refs.panel,
          COMPACT ? "Overall average" : "Overall — all metrics");
        if (!COMPACT) htmlEl("p", "bradar-panel-desc", refs.panel,
          "Average of available scores. Click a corner of the spider for a single metric.");
      }
      refs.barFills = []; refs.barVals = [];
      cfg.series.forEach(function (s, si) {
        var row = htmlEl("div", "bradar-bar-row" + (visible[si] ? "" : " bradar-off"), refs.panel);
        row.style.animationDelay = (si * 45) + "ms"; // rows cascade in
        // panel rows mirror the legend: hover spotlights, click hides/shows
        row.title = "Click to hide/show " + s.name;
        row.setAttribute("role", "button");
        row.tabIndex = 0;
        row.addEventListener("click", function () { setVisible(si, !visible[si]); });
        row.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); setVisible(si, !visible[si]); }
        });
        row.addEventListener("mouseenter", function () { spotlight(si, true); });
        row.addEventListener("mouseleave", function () { spotlight(si, false); });
        var name = htmlEl("span", "bradar-bar-name", row);
        name.appendChild(colorDot(s.color, 10));
        if (!COMPACT) name.appendChild(document.createTextNode(s.name));
        var track = htmlEl("div", "bradar-bar-track", row);
        var fill = htmlEl("div", "bradar-bar-fill", track);
        fill.style.transitionDelay = (si * 45) + "ms"; // fills sweep in with their rows
        fill.style.background = "linear-gradient(90deg, color-mix(in srgb, " + s.color +
          " 68%, #ffffff), " + s.color + " 82%)";
        refs.barFills.push(fill);
        refs.barVals.push(htmlEl("span", "bradar-bar-val", row));
      });
      refs.badge = htmlEl("div", "bradar-badge", refs.panel);
      var backWrap = htmlEl("p", "bradar-back-wrap", refs.panel);
      var back = htmlEl("button", "bradar-back", backWrap, "← All metrics");
      back.type = "button";
      back.addEventListener("click", function () { select(selected); }); // toggles off
      refs.backWrap = backWrap;
      void refs.panel.offsetWidth; // commit the empty state so the segments transition in
      updatePanelValues();
      updateOverall();
    }

    function countTo(el, from, to) {
      if (el._raf) cancelAnimationFrame(el._raf);
      if (REDUCED || document.hidden || from == null || from === to) {
        el.textContent = fmt(to);
        return;
      }
      var t0 = null, DUR = 450;
      (function tick(ts) {
        if (t0 === null) t0 = ts;
        var t = Math.min(1, (ts - t0) / DUR);
        var e = 1 - Math.pow(1 - t, 3);
        el.textContent = fmt(from + (to - from) * e);
        if (t < 1) el._raf = requestAnimationFrame(tick);
        else el._raf = null;
      })(performance.now());
    }

    function updatePanelValues() {
      if (!refs.barFills) return;
      cfg.series.forEach(function (s, si) {
        var v = panelValue(si);
        var fill = refs.barFills[si];
        if (v == null) {
          refs.barVals[si].textContent = "—";
          fill.style.width = "0";
          fill.style.boxShadow = "";
        } else {
          countTo(refs.barVals[si], prevVals[si], v);
          fill.style.width = ((v / cfg.maxValue) * 100).toFixed(1) + "%";
          fill.style.boxShadow = "0 0 6px " + s.color + "44";
        }
        prevVals[si] = v;
      });
      refs.backWrap.style.display = selected == null ? "none" : "";
      var idxs = cfg.series.map(function (_, si) { return si; })
        .filter(function (si) { return visible[si] && panelValue(si) != null; });
      var badge = refs.badge;
      if (idxs.length < 2) { badge.style.display = "none"; return; }
      badge.style.display = "";
      badge.textContent = "";
      idxs.sort(function (a, b) { return panelValue(b) - panelValue(a); });
      var best = idxs[0], next = idxs[1];
      var suffix = selected == null ? " avg" : "";
      if (panelValue(best) === panelValue(next)) {
        badge.className = "bradar-badge bradar-tie";
        htmlEl("span", "", badge, selected == null ? "Tied overall" : "Tied on this metric");
        return;
      }
      badge.className = "bradar-badge";
      var dot = htmlEl("span", "bradar-badge-dot", badge);
      dot.style.background = cfg.series[best].color;
      badge.appendChild(document.createTextNode(
        "Leads — " + cfg.series[best].name + " " + fmt(panelValue(best)) + suffix + " "));
      var small = document.createElement("small");
      small.textContent = "(+" + fmt(panelValue(best) - panelValue(next)) + " vs next)";
      badge.appendChild(small);
    }

    // ---- optional on-page value editor (single mode only, off by default) ----
    function buildEditor() {
      if (!refs.editor) return;
      refs.editor.textContent = "";
      var toggle = htmlEl("button", "bradar-editor-toggle bradar-open", refs.editor);
      toggle.type = "button";
      var chev = document.createElementNS(SVG_NS, "svg");
      chev.setAttribute("width", "10"); chev.setAttribute("height", "10"); chev.setAttribute("viewBox", "0 0 10 10");
      svgEl("path", { d: "M3 1.5L7 5L3 8.5", fill: "none", stroke: "currentColor",
        "stroke-width": 1.8, "stroke-linecap": "round", "stroke-linejoin": "round" }, chev);
      toggle.appendChild(chev);
      toggle.appendChild(document.createTextNode("Adjust values"));
      var body = htmlEl("div", "bradar-editor-body", refs.editor);
      htmlEl("p", "bradar-editor-caption", body,
        "Plug in your own values (0–" + fmt(cfg.maxValue) + ", higher is better) — the chart animates live. " +
        "Leave a cell blank for “no data”; that point is skipped.");
      var scroll = htmlEl("div", "bradar-editor-scroll", body);
      var table = htmlEl("table", "", scroll);
      var hr = htmlEl("tr", "", htmlEl("thead", "", table));
      htmlEl("th", "", hr, "");
      cfg.axes.forEach(function (ax) { htmlEl("th", "", hr, ax.label); });
      var tbody = htmlEl("tbody", "", table);
      refs.inputs = [];
      cfg.series.forEach(function (s, si) {
        var tr = htmlEl("tr", "", tbody);
        var td0 = htmlEl("td", "", tr);
        td0.appendChild(colorDot(s.color, 10));
        td0.appendChild(document.createTextNode(" " + s.name));
        refs.inputs.push(s.values.map(function (val, ai) {
          var td = htmlEl("td", "", tr);
          var input = document.createElement("input");
          input.type = "number";
          input.min = "0"; input.max = String(cfg.maxValue); input.step = "0.5";
          input.value = val == null ? "" : fmt(val);
          input.placeholder = "—";
          input.setAttribute("aria-label", s.name + " " + cfg.axes[ai].label);
          input.addEventListener("input", function () {
            if (input.value === "") {
              cfg.series[si].values[ai] = null; // blank = no data
              tweenTo();
              return;
            }
            var v = Math.max(0, Math.min(cfg.maxValue, parseFloat(input.value)));
            if (isNaN(v)) return;
            cfg.series[si].values[ai] = v;
            tweenTo();
          });
          td.appendChild(input);
          return input;
        }));
      });
      var open = true;
      function setOpen(o) {
        open = o;
        toggle.classList.toggle("bradar-open", open);
        body.style.maxHeight = open ? body.scrollHeight + "px" : "0";
      }
      toggle.addEventListener("click", function () { setOpen(!open); });
      body.style.maxHeight = body.scrollHeight + "px";
    }

    function syncEditor() {
      if (!refs.inputs) return;
      cfg.series.forEach(function (s, si) {
        s.values.forEach(function (v, ai) { refs.inputs[si][ai].value = v == null ? "" : fmt(v); });
      });
    }

    mount();

    return {
      update: function (partial) {
        var merged = {};
        for (var k in cfg) merged[k] = cfg[k];
        for (var k2 in partial) merged[k2] = partial[k2];
        cfg = normalizeConfig(merged);
        MULTI = !!cfg.products;
        selected = selected == null ? null : Math.max(0, Math.min(cfg.axes.length - 1, selected));
        productSel = (MULTI && productSel != null)
          ? Math.min(cfg.products.length - 1, productSel) : (MULTI ? productSel : null);
        visible = cfg.series.map(function () { return true; });
        disp = cfg.series.map(function (s) { return s.values.slice(); });
        prevVals = cfg.series.map(function () { return null; });
        mount();
      },
      setValue: function (seriesIdx, axisIdx, value) {
        if (MULTI) return;
        var v = (value === null || value === undefined || value === "") ? null
          : Math.max(0, Math.min(cfg.maxValue, +value || 0));
        cfg.series[seriesIdx].values[axisIdx] = v;
        syncEditor();
        tweenTo();
      },
      // Replace every series' values at once and morph to them (single mode).
      setValues: function (rows) {
        if (MULTI) return;
        cfg.series.forEach(function (s, si) {
          s.values = cleanRow(rows && rows[si], cfg.axes.length, cfg.maxValue);
        });
        syncEditor();
        tweenTo();
      },
      // Multi mode: isolate one design (crossfade) or null for all.
      setProduct: function (pi) {
        if (!MULTI) return;
        productSel = pi == null ? null
          : Math.max(0, Math.min(cfg.products.length - 1, pi));
        applyProduct();
        renderPanel();
      },
      getProduct: function () { return productSel; },
      select: select,
      setVisible: setVisible,
      highlight: function (si, on) { spotlight(si, !!on); },
      getConfig: function () { return JSON.parse(JSON.stringify(cfg)); },
      destroy: function () {
        if (tweenRaf) cancelAnimationFrame(tweenRaf);
        root.remove();
      }
    };
  }

  global.BayaRadar = { create: create, defaults: DEFAULTS, colorDot: colorDot };
})(typeof window !== "undefined" ? window : this);
