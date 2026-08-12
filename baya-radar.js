/*!
 * BayaRadar — interactive spider/radar comparison chart (vanilla JS + SVG, no dependencies)
 * Styled to match bayasystems.com (Poppins/Manrope, #0086ff blue, #ffce00 tags).
 *
 * Two modes:
 *
 * 1) SINGLE — one product, one polygon per company (values on each series):
 *      BayaRadar.create('#radar', {
 *        series: [
 *          { name: 'Baya Systems', color: '#0086ff', marker: 'circle',   values: [9, 8.5, 9, 8, 9.5] },
 *          { name: 'Alternative A', color: '#ee5023', marker: 'square',   values: [6, 5.5, 7, 5, 4]   },
 *          { name: 'Alternative B', color: '#07a37e', marker: 'triangle', values: [5, 6.5, 5.5, 6.5, 5] },
 *          { name: 'In-house',     color: '#3d4148', marker: 'triangle-down', values: [7, 6, null, 7.5, 6.5] }
 *        ]
 *      });
 *
 * 2) MULTI-PRODUCT — every product's polygons superimposed, colored by company
 *    (index.html uses this; series carry no values, products do):
 *      BayaRadar.create('#radar', {
 *        series: [{ name, color, marker }, ...],           // the companies
 *        products: [{ name: 'Product 1', values: [ [..], [..], [..], [..] ] }, ...],
 *        product: null                                     // null = all; 0..N-1 isolates one
 *      });
 *      chart.setProduct(3);     // isolate Product 4 (crossfades, markers + tooltips on)
 *      chart.setProduct(null);  // back to all products
 *
 * Values are scores 0..maxValue where HIGHER = BETTER (normalize inverted metrics
 * like latency/area into scores first). null / undefined / "" = no data — the outline
 * breaks at that metric (no chord is drawn across the chart) and the comparison bars
 * show "—".
 *
 * Interaction: with no metric selected the side panel compares AVERAGES (in multi
 * mode with no product isolated, averages span every product). Click an axis corner
 * for that metric's side-by-side; click it again to go back. Legend chips hide/show
 * a company; hovering a chip spotlights it.
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
      { name: "Baya Systems", color: "#0086ff", marker: "circle", values: [9, 8.5, 9, 8, 9.5] },
      { name: "Alternative A", color: "#ee5023", marker: "square", values: [6, 5.5, 7, 5, 4] },
      { name: "Alternative B", color: "#07a37e", marker: "triangle", values: [5, 6.5, 5.5, 6.5, 5] },
      { name: "In-house", color: "#3d4148", marker: "triangle-down", values: [7, 6, null, 7.5, 6.5] }
    ],
    products: null,   // array of {name, values:[rows per series]} switches on multi mode
    product: null,    // multi mode: isolated product index, or null for all
    maxValue: 10,
    rings: 5,
    selected: null,   // null = overall average view; 0..N-1 opens on that metric
    compact: false,
    frameless: false, // true = no card chrome (host page provides it)
    tweenMs: 380,     // duration of the morph when values change (single mode)
    editable: false,
    webFonts: true
  };

  var CSS = [
    /* Baya / Chiplet Design System v1.2 tokens — brand.primary, brand.secondary (teal),
       neutral ink/surface, border.onLight, 4px component radius, 8px spacing grid. */
    ".bradar-root{--br-ink:#0a0a0b;--br-sub:#55595e;--br-mut:#8a9099;--br-line:#e5e5e7;",
    "  --br-track:#f4f4f4;--br-accent:#0086ff;--br-accent-deep:#0068c9;",
    "  --br-teal:#07a37e;--br-teal-deep:#058a6a;--br-yellow:#ffce00;",
    "  --br-head:'Poppins',system-ui,-apple-system,'Segoe UI',sans-serif;",
    "  --br-body:'Manrope',system-ui,-apple-system,'Segoe UI',sans-serif;",
    "  position:relative;background:#ffffff;color:var(--br-ink);font-family:var(--br-body);",
    "  border:1px solid var(--br-line);border-radius:4px;padding:24px 32px;",
    "  box-sizing:border-box;max-width:960px;}",
    ".bradar-root.bradar-compact,.bradar-root.bradar-frameless{border:none;border-radius:0;",
    "  padding:0;max-width:none;}",
    ".bradar-root *{box-sizing:border-box;}",
    ".bradar-eyebrow{font-family:var(--br-body);font-size:0.875rem;font-weight:700;",
    "  letter-spacing:.08em;text-transform:uppercase;color:var(--br-accent);margin:0 0 8px;}",
    ".bradar-title{font-family:var(--br-head);font-size:22px;font-weight:500;margin:0 0 8px;}",
    ".bradar-subtitle{font-size:14px;font-weight:400;color:var(--br-sub);margin:0 0 16px;line-height:1.5;}",
    ".bradar-legend{display:flex;flex-wrap:wrap;gap:8px 24px;margin:0 0 8px;}",
    ".bradar-chip{display:inline-flex;align-items:center;gap:8px;font-family:var(--br-body);",
    "  font-size:14px;font-weight:600;color:var(--br-sub);background:none;",
    "  border:none;padding:8px 0;cursor:pointer;transition:color .15s,opacity .2s;}",
    ".bradar-chip:hover{color:var(--br-ink);}",
    ".bradar-chip:focus-visible{outline:2px solid var(--br-accent);outline-offset:2px;}",
    ".bradar-chip.bradar-off{opacity:.35;filter:grayscale(.6);text-decoration:line-through;}",
    ".bradar-main{display:flex;flex-wrap:wrap;gap:8px 24px;align-items:flex-start;}",
    ".bradar-compact .bradar-main{display:block;}",
    ".bradar-chart-wrap{flex:1 1 430px;min-width:320px;position:relative;}",
    ".bradar-compact .bradar-chart-wrap{min-width:0;}",
    ".bradar-chart{width:100%;height:auto;display:block;}",
    ".bradar-series-layer{transition:opacity .25s;}",
    ".bradar-series-layer.bradar-dim{opacity:.16;}",
    ".bradar-series-layer.bradar-hidden{display:none;}",
    /* multi-product groups: thin superimposed lines; emphasis via crossfade */
    ".bradar-product{transition:opacity .4s;}",
    ".bradar-product .bradar-pl{fill:none;stroke-width:1.3;opacity:.5;stroke-linejoin:round;",
    "  transition:opacity .4s,stroke-width .25s;}",
    ".bradar-product .bradar-pf,.bradar-product .bradar-pm{display:none;}",
    ".bradar-product.bradar-em .bradar-pl{opacity:1;stroke-width:2.5;}",
    ".bradar-product.bradar-em .bradar-pf,.bradar-product.bradar-em .bradar-pm{display:block;}",
    ".bradar-product.bradar-ghost{opacity:.015;}",
    ".bradar-product:not(.bradar-em) .bradar-ph{pointer-events:none;}",
    ".bradar-cdim{opacity:.08 !important;}",
    ".bradar-chidden{display:none !important;}",
    ".bradar-axis-label{font-family:var(--br-body);font-size:12px;font-weight:600;",
    "  fill:var(--br-sub);cursor:pointer;}",
    ".bradar-axis-label:hover{fill:var(--br-ink);}",
    ".bradar-axis-label:focus-visible{outline:2px solid var(--br-accent);outline-offset:3px;}",
    ".bradar-axis-label.bradar-sel{font-weight:700;fill:var(--br-ink);}",
    ".bradar-tick{font-family:var(--br-body);font-size:12px;font-weight:600;fill:var(--br-mut);",
    "  paint-order:stroke;stroke:#ffffff;stroke-width:3px;}",
    ".bradar-halo{fill:rgba(10,10,11,.05);stroke:rgba(10,10,11,.2);stroke-width:1;}",
    ".bradar-hit{cursor:pointer;}",
    ".bradar-tooltip{position:absolute;pointer-events:none;background:#0a0a0b;color:#f4f4f4;",
    "  padding:8px 16px;border-radius:4px;white-space:nowrap;z-index:5;opacity:0;",
    "  transform:translate(-50%,-124%) scale(.97);box-shadow:0 8px 20px rgba(10,10,11,.35);}",
    ".bradar-tooltip.bradar-on{opacity:1;transform:translate(-50%,-124%) scale(1);}",
    ".bradar-tt-name{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;margin:0 0 4px;}",
    ".bradar-tt-dot{width:8px;height:8px;border-radius:2px;flex:0 0 8px;}",
    ".bradar-tt-metric{font-size:12px;font-weight:500;color:rgba(244,244,244,.6);}",
    ".bradar-tt-metric b{color:#f4f4f4;font-family:var(--br-body);font-size:12.5px;font-weight:700;margin-left:2px;}",
    ".bradar-panel{flex:0 1 300px;min-width:250px;background:none;",
    "  border-left:1px solid var(--br-line);padding:8px 0 8px 32px;margin-top:16px;}",
    ".bradar-compact .bradar-panel{border:none;min-width:0;padding:8px 0 0;margin-top:0;}",
    ".bradar-panel-title{font-family:var(--br-head);font-size:16px;font-weight:600;margin:0 0 8px;}",
    ".bradar-compact .bradar-panel-title{font-size:12px;margin:0 0 8px;color:var(--br-sub);font-weight:600;}",
    ".bradar-panel-desc{font-size:12px;font-weight:400;color:var(--br-mut);margin:0 0 16px;line-height:1.4;}",
    ".bradar-bar-row{display:flex;align-items:center;gap:8px;margin:0 0 8px;transition:opacity .25s;}",
    ".bradar-compact .bradar-bar-row{gap:8px;margin:0 0 8px;}",
    ".bradar-bar-row.bradar-off{opacity:.35;}",
    ".bradar-bar-name{flex:0 0 96px;font-size:12px;font-weight:600;color:var(--br-sub);display:flex;",
    "  align-items:center;gap:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
    ".bradar-compact .bradar-bar-name{flex:0 0 16px;}",
    ".bradar-bar-track{flex:1 1 auto;background:var(--br-track);border-radius:4px;height:24px;overflow:hidden;}",
    ".bradar-compact .bradar-bar-track{height:16px;}",
    ".bradar-bar-fill{height:100%;border-radius:0 4px 4px 0;min-width:3px;width:0;}",
    ".bradar-bar-val{flex:0 0 40px;font-family:var(--br-body);font-size:14px;font-weight:700;",
    "  color:var(--br-ink);text-align:right;font-variant-numeric:tabular-nums;}",
    ".bradar-compact .bradar-bar-val{flex:0 0 32px;font-size:12px;}",
    ".bradar-badge{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:700;",
    "  color:#0a0a0b;background:var(--br-yellow);border:none;border-radius:4px;padding:8px 16px;margin-top:8px;}",
    ".bradar-compact .bradar-badge{font-size:11px;padding:8px 12px;margin-top:8px;gap:8px;}",
    ".bradar-badge.bradar-tie{background:#f4f4f4;}",
    ".bradar-badge-dot{width:8px;height:8px;border-radius:2px;flex:0 0 8px;",
    "  box-shadow:0 0 0 1.5px rgba(255,255,255,.85);}",
    ".bradar-badge small{color:rgba(10,10,11,.6);font-weight:600;}",
    ".bradar-back-wrap{margin:16px 0 0;}",
    ".bradar-compact .bradar-back-wrap{margin:8px 0 0;}",
    ".bradar-back{display:inline-flex;align-items:center;background:none;border:none;padding:0;",
    "  font-family:var(--br-body);font-size:12px;font-weight:700;color:var(--br-teal);",
    "  cursor:pointer;text-decoration:none;}",
    ".bradar-back-arrow{display:inline-block;transition:transform .15s;margin-right:6px;}",
    ".bradar-compact .bradar-back{font-size:11px;}",
    ".bradar-back:hover{color:var(--br-teal-deep);text-decoration:underline;}",
    ".bradar-back:hover .bradar-back-arrow{transform:translateX(-3px);}",
    ".bradar-back:focus-visible{outline:2px solid var(--br-accent);outline-offset:2px;}",
    ".bradar-editor{margin-top:16px;border-top:1px solid var(--br-line);padding-top:16px;}",
    ".bradar-editor-toggle{display:inline-flex;align-items:center;gap:8px;background:none;border:none;",
    "  padding:0;font-family:var(--br-body);font-size:14px;font-weight:700;color:var(--br-teal);",
    "  cursor:pointer;}",
    ".bradar-editor-toggle:hover{color:var(--br-teal-deep);}",
    ".bradar-editor-toggle svg{transition:transform .25s;}",
    ".bradar-editor-toggle.bradar-open svg{transform:rotate(90deg);}",
    ".bradar-editor-body{overflow:hidden;transition:max-height .3s ease;}",
    ".bradar-editor-caption{font-size:12px;font-weight:400;color:var(--br-mut);margin:8px 0 8px;}",
    ".bradar-editor-scroll{overflow-x:auto;}",
    ".bradar-editor table{border-collapse:collapse;font-size:12px;}",
    ".bradar-editor th{font-size:12px;font-weight:600;",
    "  color:var(--br-mut);text-align:left;padding:8px;white-space:nowrap;}",
    ".bradar-editor td{padding:8px;}",
    ".bradar-editor tbody tr:hover{background:#f4f4f4;}",
    ".bradar-editor td:first-child{white-space:nowrap;color:var(--br-ink);font-weight:600;}",
    ".bradar-editor input{width:64px;padding:8px;border:1px solid #d5dde8;border-radius:4px;",
    "  font-family:var(--br-body);font-size:14px;font-weight:600;font-variant-numeric:tabular-nums;",
    "  color:var(--br-ink);background:#fff;transition:border-color .15s,box-shadow .15s;}",
    ".bradar-editor input:hover{border-color:#b3c0d1;}",
    ".bradar-editor input:focus{outline:none;border-color:var(--br-accent);",
    "  box-shadow:0 0 0 3px rgba(0,134,255,.15);}",
    "@media (prefers-reduced-motion: no-preference){",
    "  .bradar-bar-fill{transition:width .5s cubic-bezier(.22,.8,.36,1);}",
    "  .bradar-tooltip{transition:opacity .12s,transform .12s;}",
    "  .bradar-halo{transition:cx .3s cubic-bezier(.22,.8,.36,1),cy .3s cubic-bezier(.22,.8,.36,1);}",
    /* fill 'backwards', never 'forwards': a finished fill-forward animation would pin
       opacity at 1 and silently defeat the ghost/dim fades below */
    "  .bradar-series-anim{animation:bradar-grow .55s cubic-bezier(.22,.8,.36,1) backwards;",
    "    transform-box:view-box;transform-origin:center;}",
    "}",
    "@keyframes bradar-grow{from{opacity:0;transform:scale(.86);}to{opacity:1;transform:scale(1);}}",
    "@media (prefers-reduced-motion: reduce){",
    "  .bradar-product,.bradar-product .bradar-pl{transition:none;}",
    "}"
  ].join("\n");

  function injectStyles(webFonts) {
    if (webFonts && !document.getElementById(FONTS_ID)) {
      var l = document.createElement("link");
      l.id = FONTS_ID;
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@500;600&family=Manrope:wght@400;500;600;700&display=swap";
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

  // Marker path centered on (0,0); s = half-size. Shapes give each company an
  // identity that survives without color (colorblind viewers, greyscale print).
  function markerPath(shape, s) {
    switch (shape) {
      case "square": return "M" + -s + "," + -s + "h" + 2 * s + "v" + 2 * s + "h" + -2 * s + "Z";
      case "triangle": return "M0," + -1.25 * s + "L" + 1.15 * s + "," + s + "H" + -1.15 * s + "Z";
      case "triangle-down": return "M0," + 1.25 * s + "L" + 1.15 * s + "," + -s + "H" + -1.15 * s + "Z";
      case "diamond": return "M0," + -1.3 * s + "L" + 1.3 * s + ",0L0," + 1.3 * s + "L" + -1.3 * s + ",0Z";
      default: /* circle */
        return "M" + -s + ",0a" + s + "," + s + " 0 1,0 " + 2 * s + ",0a" + s + "," + s + " 0 1,0 " + -2 * s + ",0Z";
    }
  }

  // Small standalone marker glyph (used for legends inside and outside the widget).
  function markerSvg(s, size) {
    var svg = document.createElementNS(SVG_NS, "svg");
    var d = size || 14;
    svg.setAttribute("width", d); svg.setAttribute("height", d); svg.setAttribute("viewBox", "-7 -7 14 14");
    svgEl("path", { d: markerPath(s.marker, 4.6), fill: s.color }, svg);
    return svg;
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
        ? { label: a, short: a, description: "" }
        : { label: a.label, short: a.short || a.label, description: a.description || "" };
    });
    cfg.series = cfg.series.map(function (s, i) {
      var d = DEFAULTS.series[i] || DEFAULTS.series[0];
      return {
        name: s.name || d.name,
        color: s.color || d.color,
        marker: s.marker || ["circle", "square", "triangle", "diamond"][i % 4],
        values: cleanRow(s.values, cfg.axes.length, cfg.maxValue)
      };
    });
    if (Array.isArray(cfg.products) && cfg.products.length) {
      cfg.products = cfg.products.map(function (p, i) {
        return {
          name: p.name || "Product " + (i + 1),
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
    var selected = cfg.selected == null ? null
      : Math.max(0, Math.min(cfg.axes.length - 1, cfg.selected));
    var productSel = (MULTI && cfg.product != null)
      ? Math.max(0, Math.min(cfg.products.length - 1, cfg.product)) : null;
    var visible = cfg.series.map(function () { return true; });
    var disp = cfg.series.map(function (s) { return s.values.slice(); }); // animated display values (single mode)
    var tweenRaf = null;

    var root = htmlEl("div", "bradar-root" + (COMPACT ? " bradar-compact" : "") +
      (cfg.frameless ? " bradar-frameless" : ""), null);
    container.appendChild(root);

    // geometry — compact tiles use a tighter frame and short single-line labels
    var W = COMPACT ? 350 : 540, H = COMPACT ? 272 : 420;
    var CX = W / 2, CY = COMPACT ? 142 : 216, R = COMPACT ? 94 : 150;

    function angle(i) { return (-90 + (i * 360) / cfg.axes.length) * Math.PI / 180; }
    function pt(i, r) { return [CX + r * Math.cos(angle(i)), CY + r * Math.sin(angle(i))]; }
    function poly(radii) {
      return radii.map(function (r, i) { return pt(i, r).map(function (n) { return n.toFixed(1); }).join(","); }).join(" ");
    }
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
      refs.editor = (cfg.editable && !COMPACT && !MULTI) ? htmlEl("div", "bradar-editor", root) : null;
      buildLegend();
      buildChart();
      if (!MULTI) setGeometry();
      applySelection();
      if (MULTI) applyProduct();
      renderPanel();
      buildEditor();
    }

    // ---- legend (chips toggle series; hovering spotlights one) ----
    function buildLegend() {
      refs.chips = null;
      if (!refs.legend) return;
      refs.chips = [];
      cfg.series.forEach(function (s, si) {
        var chip = htmlEl("button", "bradar-chip", refs.legend);
        chip.type = "button";
        chip.setAttribute("aria-pressed", "true");
        chip.title = "Click to hide/show " + s.name;
        chip.appendChild(markerSvg(s, 16));
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

      // alternating ring bands, outer → inner, then hairline ring strokes
      var ring;
      for (ring = cfg.rings; ring >= 1; ring--) {
        svgEl("polygon", { points: poly(cfg.axes.map(function () { return (R * ring) / cfg.rings; })),
          fill: ring % 2 === 0 ? "#fafafa" : "#ffffff", stroke: "none" }, svg);
      }
      for (ring = 1; ring <= cfg.rings; ring++) {
        svgEl("polygon", { points: poly(cfg.axes.map(function () { return (R * ring) / cfg.rings; })),
          fill: "none", stroke: "#e5e5e7", "stroke-width": 1 }, svg);
      }
      refs.spokes = [];
      cfg.axes.forEach(function (_, i) {
        var v = pt(i, R);
        refs.spokes.push(svgEl("line", { x1: CX, y1: CY, x2: v[0], y2: v[1],
          stroke: "#e5e5e7", "stroke-width": 1 }, svg));
      });
      if (!COMPACT) {
        for (ring = 1; ring <= cfg.rings; ring++) {
          svgEl("text", { x: CX + 8, y: CY - (R * ring) / cfg.rings + 3, "class": "bradar-tick" }, svg)
            .textContent = fmt((cfg.maxValue * ring) / cfg.rings);
        }
      }

      refs.halo = svgEl("circle", { r: COMPACT ? 10 : 14, "class": "bradar-halo" }, svg);

      if (MULTI) buildProducts(svg);
      else buildSingle(svg, defs);

      // axis labels + corner hit zones
      refs.axisLabels = [];
      cfg.axes.forEach(function (ax, ai) {
        var a = angle(ai), cos = Math.cos(a), sin = Math.sin(a);
        var off = COMPACT ? 13 : 19;
        var lx = CX + (R + off) * cos, ly = CY + (R + off) * sin;
        var anchor = cos > 0.25 ? "start" : cos < -0.25 ? "end" : "middle";
        var lines;
        if (COMPACT) {
          lines = [ax.short];
        } else {
          var words = ax.label.split(" ");
          lines = words.length >= 2
            ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")]
            : [ax.label];
        }
        if (sin < -0.5) ly -= (lines.length - 1) * 14;          // top labels grow upward
        else if (sin < 0.5) ly -= (lines.length - 1) * 7;       // side labels center on the vertex
        var t = svgEl("text", { x: lx, y: ly + (sin > 0.5 ? 10 : 4), "text-anchor": anchor,
          "class": "bradar-axis-label", role: "button", tabindex: 0,
          "aria-label": "Compare " + ax.label }, svg);
        lines.forEach(function (line, li) {
          svgEl("tspan", { x: lx, dy: li === 0 ? 0 : 14 }, t).textContent = line;
        });
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
          return svgEl("path", { d: markerPath(s.marker, COMPACT ? 3.8 : 4.6), fill: s.color,
            stroke: "#ffffff", "stroke-width": 1.5 }, layer);
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

    // ---- multi mode: every product's polygons superimposed, colored by company ----
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
          var line = svgEl("path", { "class": "bradar-pl", d: d.line,
            stroke: s.color, "stroke-linecap": "round" }, group);
          var markers = [], hits = [];
          p.values[si].forEach(function (v, ai) {
            if (v == null) return;
            var pos = pt(ai, rTo(v));
            markers.push(svgEl("path", { "class": "bradar-pm",
              d: markerPath(s.marker, 4.4), fill: s.color, stroke: "#ffffff", "stroke-width": 1.5,
              transform: "translate(" + pos[0].toFixed(1) + "," + pos[1].toFixed(1) + ")" }, group));
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
          marker.setAttribute("transform",
            "translate(" + p[0].toFixed(1) + "," + p[1].toFixed(1) + ")");
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
        sp.setAttribute("stroke", i === selected ? "#9aa2ac" : "#e5e5e7");
        sp.setAttribute("stroke-width", i === selected ? 1.5 : 1);
      });
      refs.axisLabels.forEach(function (t, i) {
        t.classList.toggle("bradar-sel", i === selected);
      });
      if (selected == null) {
        refs.halo.style.display = "none";
        return;
      }
      refs.halo.style.display = "";
      var v = pt(selected, R);
      refs.halo.setAttribute("cx", v[0].toFixed(1));
      refs.halo.setAttribute("cy", v[1].toFixed(1));
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

    // ---- side-by-side panel ----
    function renderPanel() {
      refs.panel.textContent = "";
      var context = MULTI
        ? (productSel != null ? cfg.products[productSel].name : "All " + cfg.products.length + " products, averaged")
        : "";
      var titlePrefix = (MULTI && productSel != null)
        ? cfg.products[productSel].name : "Overall";
      if (selected != null) {
        var ax = cfg.axes[selected];
        htmlEl("p", "bradar-panel-title", refs.panel,
          COMPACT ? ax.label : titlePrefix + " — " + ax.label);
        if (!COMPACT) htmlEl("p", "bradar-panel-desc", refs.panel,
          (context ? context + ". " : "") +
          (ax.description ? ax.description + ". " : "") + "Score 0–" + fmt(cfg.maxValue) + ".");
      } else {
        htmlEl("p", "bradar-panel-title", refs.panel,
          COMPACT ? "Overall average" : titlePrefix + " — all metrics");
        if (!COMPACT) htmlEl("p", "bradar-panel-desc", refs.panel,
          (context ? context + ". " : "") +
          "Average of available scores. Click a corner of the spider for a single metric.");
      }
      refs.barFills = []; refs.barVals = [];
      cfg.series.forEach(function (s, si) {
        var row = htmlEl("div", "bradar-bar-row" + (visible[si] ? "" : " bradar-off"), refs.panel);
        var name = htmlEl("span", "bradar-bar-name", row);
        name.appendChild(markerSvg(s, 13));
        if (!COMPACT) name.appendChild(document.createTextNode(s.name));
        name.title = s.name;
        var track = htmlEl("div", "bradar-bar-track", row);
        var fill = htmlEl("div", "bradar-bar-fill", track);
        fill.style.background = "linear-gradient(90deg, color-mix(in srgb, " + s.color +
          " 72%, #ffffff), " + s.color + " 85%)";
        refs.barFills.push(fill);
        refs.barVals.push(htmlEl("span", "bradar-bar-val", row));
      });
      refs.badge = htmlEl("div", "bradar-badge", refs.panel);
      var backWrap = htmlEl("p", "bradar-back-wrap", refs.panel);
      var back = htmlEl("button", "bradar-back", backWrap);
      back.type = "button";
      htmlEl("span", "bradar-back-arrow", back, "←");
      back.appendChild(document.createTextNode("Back to overall average"));
      back.addEventListener("click", function () { select(selected); }); // toggles off
      refs.backWrap = backWrap;
      void refs.panel.offsetWidth; // commit the 0-width start so the fills transition in
      updatePanelValues();
    }

    function updatePanelValues() {
      if (!refs.barFills) return;
      cfg.series.forEach(function (_, si) {
        var v = panelValue(si);
        if (v == null) {
          refs.barFills[si].style.width = "0";
          refs.barVals[si].textContent = "—"; // no data
        } else {
          refs.barFills[si].style.width = ((v / cfg.maxValue) * 100).toFixed(1) + "%";
          refs.barVals[si].textContent = fmt(v);
        }
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
        td0.appendChild(markerSvg(s, 13));
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
      // Multi mode: isolate one product (crossfade) or null for all.
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

  global.BayaRadar = { create: create, defaults: DEFAULTS, markerSvg: markerSvg };
})(typeof window !== "undefined" ? window : this);
