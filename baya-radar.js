/*!
 * BayaRadar — interactive spider/radar comparison chart (vanilla JS + SVG, no dependencies)
 *
 * Integration:
 *   <div id="radar"></div>
 *   <script src="baya-radar.js"></script>
 *   <script>
 *     var chart = BayaRadar.create('#radar', {
 *       series: [
 *         { name: 'Baya Systems', color: '#0086FF', marker: 'circle',   values: [9, 8.5, 9, 8, 9.5] },
 *         { name: 'Competitor A', color: '#EE5023', marker: 'square',   values: [6, 5.5, 7, 5, 4]   },
 *         { name: 'Competitor B', color: '#09DEAB', marker: 'triangle', values: [5, 6.5, 5.5, 6.5, 5] },
 *         { name: 'In-house',     color: '#0000AD', marker: 'diamond',  values: [7, 6, null, 7.5, 6.5] }
 *       ]
 *     });
 *     // Later: chart.update({ series: [...] })  or  chart.setValue(seriesIndex, axisIndex, value)
 *   </script>
 *
 * Values are scores 0..maxValue where HIGHER = BETTER. For metrics where a lower
 * raw number is better (latency, silicon area), normalize to a score first.
 * A value of null (or undefined / "") means "no data" — that point is skipped on
 * the radar and shown as "—" in the comparison panel.
 *
 * Interaction: with nothing selected the panel compares each company's AVERAGE
 * across all metrics; click an axis corner (or its label, or any data point) for
 * that metric's side-by-side; click the same corner again (or "Back") to return
 * to the averages. Click legend chips to hide/show a company; hover a chip to
 * spotlight it on the chart; set `editable: true` for the live value editor.
 *
 * Styled to the Baya / Chiplet Design System v1.2 — Cyber Blue #0086FF, Poppins +
 * Manrope, 4px radii, hairline-bordered flat surfaces (no drop shadows). Uses
 * Google Fonts (Poppins + Manrope) when online; falls back to Century Gothic /
 * the system stack. Set `webFonts: false` to skip loading it.
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
    title: "Interconnect IP — competitive positioning",
    subtitle: "Scores 0–10, higher is better. Click a corner for one metric; click it again for the overall average.",
    axes: [
      { label: "Latency", description: "Higher score = lower latency" },
      { label: "Power Efficiency", description: "Higher score = better perf/W" },
      { label: "Bandwidth", description: "Higher score = higher sustained bandwidth" },
      { label: "Silicon Area", description: "Higher score = smaller area" },
      { label: "Physical Design Closure", description: "Higher score = easier timing closure" }
    ],
    series: [
      { name: "Baya Systems", color: "#0086FF", marker: "circle", values: [9, 8.5, 9, 8, 9.5] },
      { name: "Competitor A", color: "#EE5023", marker: "square", values: [6, 5.5, 7, 5, 4] },
      { name: "Competitor B", color: "#09DEAB", marker: "triangle", values: [5, 6.5, 5.5, 6.5, 5] },
      { name: "In-house", color: "#0000AD", marker: "diamond", values: [7, 6, null, 7.5, 6.5] }
    ],
    maxValue: 10,
    rings: 5,
    selected: null,   // null = overall average view; 0..N-1 opens on that metric
    editable: false,
    webFonts: true
  };

  var CSS = [
    ".bradar-root{--br-ink:#0a0a0b;--br-sub:#4b4f56;--br-mut:#84898f;--br-line:#e5e5e7;",
    "  --br-track:#ffffff;--br-accent:#0086ff;--br-accent-deep:#006ed6;",
    "  --br-link:#07a37e;--br-link-deep:#058a68;",
    "  --br-head:'Poppins','Century Gothic',system-ui,-apple-system,'Segoe UI',sans-serif;",
    "  --br-body:'Manrope','Century Gothic',system-ui,-apple-system,'Segoe UI',sans-serif;",
    "  position:relative;background:#ffffff;color:var(--br-ink);font-family:var(--br-body);",
    "  border:1px solid var(--br-line);border-radius:4px;padding:26px 28px 24px;",
    "  box-sizing:border-box;width:100%;}",
    ".bradar-root *{box-sizing:border-box;}",
    ".bradar-eyebrow{font-family:var(--br-body);font-size:14px;font-weight:700;",
    "  text-transform:uppercase;letter-spacing:.12em;color:var(--br-accent);margin:0 0 8px;}",
    ".bradar-title{font-family:var(--br-head);font-size:23px;font-weight:600;margin:0 0 4px;}",
    ".bradar-subtitle{font-size:13.5px;font-weight:500;color:var(--br-sub);margin:0 0 16px;line-height:1.5;}",
    ".bradar-legend{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 8px;}",
    ".bradar-chip{display:inline-flex;align-items:center;gap:7px;font-family:var(--br-body);",
    "  font-size:12.5px;font-weight:600;color:var(--br-ink);background:#f4f4f4;",
    "  border:none;border-radius:4px;padding:7px 14px 7px 11px;cursor:pointer;transition:background .15s;}",
    ".bradar-chip:hover{background:#e5e5e7;}",
    ".bradar-chip:focus-visible{outline:2px solid var(--br-accent);outline-offset:1px;}",
    ".bradar-chip.bradar-off{opacity:.4;filter:grayscale(.5);}",
    ".bradar-main{display:flex;flex-wrap:wrap;gap:6px 26px;align-items:flex-start;}",
    ".bradar-chart-wrap{flex:1 1 430px;min-width:320px;position:relative;}",
    ".bradar-chart{width:100%;height:auto;display:block;}",
    ".bradar-series-layer{transition:opacity .25s;}",
    ".bradar-series-layer.bradar-dim{opacity:.16;}",
    ".bradar-series-layer.bradar-hidden{display:none;}",
    ".bradar-axis-label{font-family:var(--br-body);font-size:12.5px;font-weight:600;",
    "  fill:var(--br-sub);cursor:pointer;}",
    ".bradar-axis-label:hover{fill:var(--br-ink);}",
    ".bradar-axis-label:focus-visible{outline:2px solid var(--br-accent);outline-offset:3px;}",
    ".bradar-axis-label.bradar-sel{font-weight:700;fill:var(--br-ink);}",
    ".bradar-tick{font-family:var(--br-head);font-size:9.5px;font-weight:600;fill:var(--br-mut);",
    "  paint-order:stroke;stroke:#ffffff;stroke-width:3px;}",
    ".bradar-halo{fill:rgba(10,10,11,.05);stroke:rgba(10,10,11,.2);stroke-width:1;}",
    ".bradar-hit{cursor:pointer;}",
    ".bradar-tooltip{position:absolute;pointer-events:none;background:#0a0a0b;color:#fff;",
    "  padding:7px 11px;border-radius:4px;white-space:nowrap;z-index:5;opacity:0;",
    "  transform:translate(-50%,-124%) scale(.97);box-shadow:0 8px 22px rgba(16,24,40,.28);}",
    ".bradar-tooltip.bradar-on{opacity:1;transform:translate(-50%,-124%) scale(1);}",
    ".bradar-tt-name{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;margin:0 0 2px;}",
    ".bradar-tt-dot{width:8px;height:8px;border-radius:2px;flex:0 0 8px;}",
    ".bradar-tt-metric{font-size:11px;font-weight:500;color:#c6ccd4;}",
    ".bradar-tt-metric b{color:#fff;font-family:var(--br-head);font-size:12.5px;font-weight:700;margin-left:2px;}",
    ".bradar-panel{flex:0 1 310px;min-width:255px;background:#f4f4f4;border:1px solid var(--br-line);",
    "  border-radius:4px;padding:18px 18px 16px;margin-top:10px;}",
    ".bradar-panel-title{font-family:var(--br-head);font-size:15.5px;font-weight:600;margin:0 0 2px;}",
    ".bradar-panel-desc{font-size:11.5px;font-weight:500;color:var(--br-mut);margin:0 0 14px;line-height:1.4;}",
    ".bradar-bar-row{display:flex;align-items:center;gap:9px;margin:0 0 11px;transition:opacity .25s;}",
    ".bradar-bar-row.bradar-off{opacity:.35;}",
    ".bradar-bar-name{flex:0 0 96px;font-size:12px;font-weight:600;color:var(--br-sub);display:flex;",
    "  align-items:center;gap:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
    ".bradar-bar-track{flex:1 1 auto;background:var(--br-track);border-radius:4px;height:22px;overflow:hidden;}",
    ".bradar-bar-fill{height:100%;border-radius:0 4px 4px 0;min-width:3px;width:0;}",
    ".bradar-bar-val{flex:0 0 34px;font-family:var(--br-head);font-size:13.5px;font-weight:700;",
    "  color:var(--br-ink);text-align:right;font-variant-numeric:tabular-nums;}",
    ".bradar-badge{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:600;",
    "  color:#0a0a0b;background:#ffce00;border:none;border-radius:4px;padding:5px 12px 5px 10px;margin-top:7px;}",
    ".bradar-badge.bradar-tie{background:#e5e5e7;}",
    ".bradar-badge-dot{width:8px;height:8px;border-radius:2px;flex:0 0 8px;",
    "  box-shadow:0 0 0 1.5px rgba(255,255,255,.85);}",
    ".bradar-badge small{color:rgba(10,10,11,.62);font-weight:500;}",
    ".bradar-back-wrap{margin:10px 0 0;}",
    ".bradar-back{background:none;border:none;padding:0;font-family:var(--br-body);font-size:12px;",
    "  font-weight:600;color:var(--br-link);cursor:pointer;}",
    ".bradar-back:hover{color:var(--br-link-deep);}",
    ".bradar-back:focus-visible{outline:2px solid var(--br-accent);outline-offset:2px;}",
    ".bradar-editor{margin-top:18px;border-top:1px solid var(--br-line);padding-top:12px;}",
    ".bradar-editor-toggle{display:inline-flex;align-items:center;gap:6px;background:none;border:none;",
    "  padding:2px 0;font-family:var(--br-body);font-size:13px;font-weight:600;color:var(--br-link);",
    "  cursor:pointer;}",
    ".bradar-editor-toggle:hover{color:var(--br-link-deep);}",
    ".bradar-editor-toggle svg{transition:transform .25s;}",
    ".bradar-editor-toggle.bradar-open svg{transform:rotate(90deg);}",
    ".bradar-editor-body{overflow:hidden;transition:max-height .3s ease;}",
    ".bradar-editor-caption{font-size:11.5px;font-weight:500;color:var(--br-mut);margin:10px 0 8px;}",
    ".bradar-editor-scroll{overflow-x:auto;}",
    ".bradar-editor table{border-collapse:collapse;font-size:12.5px;}",
    ".bradar-editor th{font-size:11.5px;font-weight:600;",
    "  color:var(--br-mut);text-align:left;padding:4px 9px;white-space:nowrap;}",
    ".bradar-editor td{padding:4px 9px;}",
    ".bradar-editor tbody tr:hover{background:#f4f4f4;}",
    ".bradar-editor td:first-child{white-space:nowrap;color:var(--br-ink);font-weight:600;}",
    ".bradar-editor input{width:62px;padding:5px 7px;border:1px solid var(--br-line);border-radius:4px;",
    "  font-family:var(--br-head);font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;",
    "  color:var(--br-ink);background:#fff;transition:border-color .15s,box-shadow .15s;}",
    ".bradar-editor input:hover{border-color:#c9ccd1;}",
    ".bradar-editor input:focus{outline:none;border-color:var(--br-accent);",
    "  box-shadow:0 0 0 3px rgba(0,134,255,.16);}",
    "@media (max-width:1024px){",
    "  .bradar-root{padding:22px 20px 20px;}",
    "  .bradar-main{gap:20px;}",
    "}",
    "@media (max-width:767px){",
    "  .bradar-root{padding:18px 16px 16px;}",
    "  .bradar-title{font-size:19px;}",
    "  .bradar-subtitle{font-size:12.5px;margin:0 0 14px;}",
    "  .bradar-main{gap:16px;}",
    "  .bradar-chart-wrap{min-width:0;flex-basis:100%;}",
    "  .bradar-panel{min-width:0;flex-basis:100%;margin-top:0;}",
    "  .bradar-legend{gap:6px;}",
    "  .bradar-chip{font-size:12px;padding:6px 12px 6px 9px;}",
    "  .bradar-panel-title{font-size:14.5px;}",
    "}",
    "@media (max-width:420px){",
    "  .bradar-bar-name{flex-basis:66px;font-size:11px;}",
    "  .bradar-bar-val{flex-basis:30px;font-size:12.5px;}",
    "  .bradar-editor th,.bradar-editor td{padding:4px 6px;}",
    "}",
    "@media (prefers-reduced-motion: no-preference){",
    "  .bradar-bar-fill{transition:width .5s cubic-bezier(.22,.8,.36,1);}",
    "  .bradar-tooltip{transition:opacity .12s,transform .12s;}",
    "  .bradar-halo{transition:cx .3s cubic-bezier(.22,.8,.36,1),cy .3s cubic-bezier(.22,.8,.36,1);}",
    "  .bradar-series-anim{animation:bradar-grow .55s cubic-bezier(.22,.8,.36,1) both;",
    "    transform-box:view-box;transform-origin:center;}",
    "}",
    "@keyframes bradar-grow{from{opacity:0;transform:scale(.86);}to{opacity:1;transform:scale(1);}}"
  ].join("\n");

  function injectStyles(webFonts) {
    if (webFonts && !document.getElementById(FONTS_ID)) {
      var l = document.createElement("link");
      l.id = FONTS_ID;
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap";
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
      case "diamond": return "M0," + -1.3 * s + "L" + 1.3 * s + ",0L0," + 1.3 * s + "L" + -1.3 * s + ",0Z";
      default: /* circle */
        return "M" + -s + ",0a" + s + "," + s + " 0 1,0 " + 2 * s + ",0a" + s + "," + s + " 0 1,0 " + -2 * s + ",0Z";
    }
  }

  function normalizeConfig(user) {
    var cfg = {};
    for (var k in DEFAULTS) cfg[k] = user && user[k] !== undefined ? user[k] : DEFAULTS[k];
    cfg.axes = cfg.axes.map(function (a) {
      return typeof a === "string" ? { label: a, description: "" } : { label: a.label, description: a.description || "" };
    });
    cfg.series = cfg.series.map(function (s, i) {
      var d = DEFAULTS.series[i] || DEFAULTS.series[0];
      var values = (s.values || []).slice(0, cfg.axes.length);
      while (values.length < cfg.axes.length) values.push(null);
      return {
        name: s.name || d.name,
        color: s.color || d.color,
        marker: s.marker || ["circle", "square", "triangle", "diamond"][i % 4],
        // null / undefined / "" = no data for that metric; the point is skipped
        values: values.map(function (v) {
          if (v === null || v === undefined || v === "") return null;
          var n = +v;
          return isNaN(n) ? null : Math.max(0, Math.min(cfg.maxValue, n));
        })
      };
    });
    return cfg;
  }

  function create(target, userConfig) {
    var container = typeof target === "string" ? document.querySelector(target) : target;
    if (!container) throw new Error("BayaRadar: container element not found");

    var cfg = normalizeConfig(userConfig);
    injectStyles(cfg.webFonts);

    var uid = "br" + (++UID);
    var selected = cfg.selected == null ? null
      : Math.max(0, Math.min(cfg.axes.length - 1, cfg.selected));
    var visible = cfg.series.map(function () { return true; });
    var disp = cfg.series.map(function (s) { return s.values.slice(); }); // animated display values
    var tweenRaf = null;

    var root = htmlEl("div", "bradar-root", null);
    container.appendChild(root);

    var W = 540, H = 420, CX = W / 2, CY = H / 2 + 6, R = 150;

    function angle(i) { return (-90 + (i * 360) / cfg.axes.length) * Math.PI / 180; }
    function pt(i, r) { return [CX + r * Math.cos(angle(i)), CY + r * Math.sin(angle(i))]; }
    function poly(radii) {
      return radii.map(function (r, i) { return pt(i, r).map(function (n) { return n.toFixed(1); }).join(","); }).join(" ");
    }
    function rTo(v) { return (R * v) / cfg.maxValue; }

    function legendMarkerSvg(s, size) {
      var svg = document.createElementNS(SVG_NS, "svg");
      var d = size || 14;
      svg.setAttribute("width", d); svg.setAttribute("height", d); svg.setAttribute("viewBox", "-7 -7 14 14");
      svgEl("path", { d: markerPath(s.marker, 4.6), fill: s.color }, svg);
      return svg;
    }

    // refs filled by mount()
    var refs = {};

    function mount() {
      root.textContent = "";
      if (cfg.eyebrow) htmlEl("p", "bradar-eyebrow", root, cfg.eyebrow);
      htmlEl("p", "bradar-title", root, cfg.title);
      htmlEl("p", "bradar-subtitle", root, cfg.subtitle);
      refs.legend = htmlEl("div", "bradar-legend", root);
      var main = htmlEl("div", "bradar-main", root);
      refs.chartWrap = htmlEl("div", "bradar-chart-wrap", main);
      refs.tooltip = htmlEl("div", "bradar-tooltip", refs.chartWrap);
      refs.panel = htmlEl("div", "bradar-panel", main);
      refs.editor = cfg.editable ? htmlEl("div", "bradar-editor", root) : null;
      buildLegend();
      buildChart();
      setGeometry();
      applySelection();
      renderPanel();
      buildEditor();
    }

    // ---- legend (chips toggle series; hovering spotlights one) ----
    function buildLegend() {
      refs.chips = [];
      cfg.series.forEach(function (s, si) {
        var chip = htmlEl("button", "bradar-chip", refs.legend);
        chip.type = "button";
        chip.setAttribute("aria-pressed", "true");
        chip.title = "Click to hide/show " + s.name;
        chip.appendChild(legendMarkerSvg(s));
        chip.appendChild(document.createTextNode(s.name));
        chip.addEventListener("click", function () { toggleSeries(si); });
        chip.addEventListener("mouseenter", function () { spotlight(si, true); });
        chip.addEventListener("mouseleave", function () { spotlight(si, false); });
        refs.chips.push(chip);
      });
    }

    function toggleSeries(si) {
      visible[si] = !visible[si];
      refs.chips[si].classList.toggle("bradar-off", !visible[si]);
      refs.chips[si].setAttribute("aria-pressed", String(visible[si]));
      refs.seriesLayers[si].classList.toggle("bradar-hidden", !visible[si]);
      spotlight(si, false);
      renderPanel();
    }

    function spotlight(si, on) {
      cfg.series.forEach(function (_, i) {
        refs.seriesLayers[i].classList.toggle("bradar-dim", on && visible[si] && visible[i] && i !== si);
      });
    }

    // ---- chart skeleton (built once; geometry updated in place) ----
    function buildChart() {
      var old = refs.chartWrap.querySelector("svg.bradar-chart");
      if (old) old.remove();
      var svg = svgEl("svg", { "class": "bradar-chart", viewBox: "0 0 " + W + " " + H,
        role: "img", "aria-label": cfg.title });
      refs.chartWrap.insertBefore(svg, refs.tooltip);
      refs.svg = svg;

      var defs = svgEl("defs", {}, svg);
      cfg.series.forEach(function (s, si) {
        var g = svgEl("radialGradient", { id: uid + "-g" + si, gradientUnits: "userSpaceOnUse",
          cx: CX, cy: CY, r: R }, defs);
        svgEl("stop", { offset: "0", "stop-color": s.color, "stop-opacity": "0.03" }, g);
        svgEl("stop", { offset: "1", "stop-color": s.color, "stop-opacity": "0.17" }, g);
      });
      var f = svgEl("filter", { id: uid + "-glow", x: "-30%", y: "-30%", width: "160%", height: "160%" }, defs);
      svgEl("feDropShadow", { dx: 0, dy: 2, stdDeviation: 5,
        "flood-color": cfg.series[0].color, "flood-opacity": 0.28 }, f);

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
      for (ring = 1; ring <= cfg.rings; ring++) {
        svgEl("text", { x: CX + 6, y: CY - (R * ring) / cfg.rings + 3, "class": "bradar-tick" }, svg)
          .textContent = fmt((cfg.maxValue * ring) / cfg.rings);
      }

      refs.halo = svgEl("circle", { r: 14, "class": "bradar-halo" }, svg);

      // series layers — competitors first, Baya (series 0) drawn last, on top
      refs.seriesLayers = [];
      var order = cfg.series.map(function (_, idx) { return idx; }).reverse();
      order.forEach(function (si) {
        var s = cfg.series[si];
        var layer = svgEl("g", { "class": "bradar-series-layer bradar-series-anim" }, svg);
        if (si === 0) layer.setAttribute("filter", "url(#" + uid + "-glow)");
        var fill = svgEl("polygon", { fill: "url(#" + uid + "-g" + si + ")", stroke: "none" }, layer);
        var stroke = svgEl("polygon", { fill: "none", stroke: s.color,
          "stroke-width": si === 0 ? 2.5 : 2, "stroke-linejoin": "round" }, layer);
        var markers = s.values.map(function () {
          return svgEl("path", { d: markerPath(s.marker, 4.6), fill: s.color,
            stroke: "#ffffff", "stroke-width": 1.5 }, layer);
        });
        refs.seriesLayers[si] = layer;
        refs.seriesLayers[si]._fill = fill;
        refs.seriesLayers[si]._stroke = stroke;
        refs.seriesLayers[si]._markers = markers;
      });

      // hover/click targets for every data point (bigger than the mark)
      refs.hits = cfg.series.map(function (sr, si) {
        return sr.values.map(function (_, ai) {
          var hit = svgEl("circle", { r: 13, fill: "transparent", "class": "bradar-hit" }, svg);
          hit.addEventListener("mousemove", function (ev) {
            if (!visible[si]) return;
            var box = refs.chartWrap.getBoundingClientRect();
            showTooltip(ev.clientX - box.left, ev.clientY - box.top, si, ai);
          });
          hit.addEventListener("mouseleave", hideTooltip);
          hit.addEventListener("click", function () { select(ai); });
          return hit;
        });
      });

      // axis labels + corner hit zones
      refs.axisLabels = [];
      cfg.axes.forEach(function (ax, ai) {
        var a = angle(ai), cos = Math.cos(a), sin = Math.sin(a);
        var lx = CX + (R + 19) * cos, ly = CY + (R + 19) * sin;
        var anchor = cos > 0.25 ? "start" : cos < -0.25 ? "end" : "middle";
        var words = ax.label.split(" ");
        var lines = words.length >= 2
          ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")]
          : [ax.label];
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
        svgEl("circle", { cx: corner[0], cy: corner[1], r: 18, fill: "transparent",
          "class": "bradar-hit" }, svg).addEventListener("click", function () { select(ai); });
      });
    }

    // ---- geometry from animated display values (null = no data, vertex skipped) ----
    function setGeometry() {
      cfg.series.forEach(function (_, si) {
        var layer = refs.seriesLayers[si];
        var ptsArr = [];
        disp[si].forEach(function (v, ai) {
          if (v == null) return;
          ptsArr.push(pt(ai, rTo(v)).map(function (n) { return n.toFixed(1); }).join(","));
        });
        var points = ptsArr.join(" ");
        layer._fill.setAttribute("points", ptsArr.length >= 3 ? points : "");
        layer._stroke.setAttribute("points", points); // 2 points renders as a line, 1 as nothing
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
      if (tweenRaf) cancelAnimationFrame(tweenRaf);
      var from = disp.map(function (row) { return row.slice(); });
      var to = cfg.series.map(function (s) { return s.values.slice(); });
      updatePanelValues(); // bars animate via CSS in parallel with the radar tween
      if (REDUCED) {
        disp = to; setGeometry();
        return;
      }
      var t0 = null, DUR = 380;
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
        else { tweenRaf = null; updatePanelValues(); }
      }
      tweenRaf = requestAnimationFrame(step);
    }

    // ---- tooltip ----
    function showTooltip(x, y, si, ai) {
      var s = cfg.series[si];
      refs.tooltip.textContent = "";
      var nameRow = htmlEl("div", "bradar-tt-name", refs.tooltip);
      var dot = htmlEl("span", "bradar-tt-dot", nameRow);
      dot.style.background = s.color;
      nameRow.appendChild(document.createTextNode(s.name));
      var metric = htmlEl("div", "bradar-tt-metric", refs.tooltip, cfg.axes[ai].label + " ");
      htmlEl("b", "", metric, fmt(s.values[ai]));
      refs.tooltip.style.left = x + "px";
      refs.tooltip.style.top = y + "px";
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
        sp.setAttribute("stroke", i === selected ? "#84898f" : "#e5e5e7");
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

    // value shown in the panel: the selected metric, or the mean of available scores
    function panelValue(s) {
      if (selected != null) return s.values[selected];
      var have = s.values.filter(function (v) { return v != null; });
      if (!have.length) return null;
      return have.reduce(function (a, b) { return a + b; }, 0) / have.length;
    }

    // ---- side-by-side panel (a metric, or the overall average when nothing is selected) ----
    function renderPanel() {
      refs.panel.textContent = "";
      if (selected != null) {
        var ax = cfg.axes[selected];
        htmlEl("p", "bradar-panel-title", refs.panel, ax.label + " — side by side");
        htmlEl("p", "bradar-panel-desc", refs.panel,
          (ax.description ? ax.description + ". " : "") + "Score 0–" + fmt(cfg.maxValue) + ".");
      } else {
        htmlEl("p", "bradar-panel-title", refs.panel, "Overall — all metrics");
        htmlEl("p", "bradar-panel-desc", refs.panel,
          "Average of available scores. Click a corner of the spider for a single metric.");
      }
      refs.barFills = []; refs.barVals = [];
      cfg.series.forEach(function (s, si) {
        var row = htmlEl("div", "bradar-bar-row" + (visible[si] ? "" : " bradar-off"), refs.panel);
        var name = htmlEl("span", "bradar-bar-name", row);
        name.appendChild(legendMarkerSvg(s, 13));
        name.appendChild(document.createTextNode(s.name));
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
      var back = htmlEl("button", "bradar-back", backWrap, "← Back to overall average");
      back.type = "button";
      back.addEventListener("click", function () { select(selected); }); // toggles off
      refs.backWrap = backWrap;
      void refs.panel.offsetWidth; // commit the 0-width start so the fills transition in
      updatePanelValues();
    }

    function updatePanelValues() {
      if (!refs.barFills) return;
      cfg.series.forEach(function (s, si) {
        var v = panelValue(s);
        if (v == null) {
          refs.barFills[si].style.width = "0";
          refs.barVals[si].textContent = "—"; // no data
        } else {
          refs.barFills[si].style.width = ((v / cfg.maxValue) * 100).toFixed(1) + "%";
          refs.barVals[si].textContent = fmt(v);
        }
      });
      refs.backWrap.style.display = selected == null ? "none" : "";
      var contenders = cfg.series.filter(function (s, si) { return visible[si] && panelValue(s) != null; });
      var badge = refs.badge;
      if (contenders.length < 2) { badge.style.display = "none"; return; }
      badge.style.display = "";
      badge.textContent = "";
      var sorted = contenders.slice().sort(function (a, b) { return panelValue(b) - panelValue(a); });
      var best = sorted[0], next = sorted[1];
      var suffix = selected == null ? " avg" : "";
      if (panelValue(best) === panelValue(next)) {
        badge.className = "bradar-badge bradar-tie";
        htmlEl("span", "", badge, selected == null ? "Tied overall" : "Tied on this metric");
        return;
      }
      badge.className = "bradar-badge";
      var dot = htmlEl("span", "bradar-badge-dot", badge);
      dot.style.background = best.color;
      badge.appendChild(document.createTextNode("Leads — " + best.name + " " + fmt(panelValue(best)) + suffix + " "));
      var small = document.createElement("small");
      small.textContent = "(+" + fmt(panelValue(best) - panelValue(next)) + " vs next)";
      badge.appendChild(small);
    }

    // ---- live value editor ----
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
        td0.appendChild(legendMarkerSvg(s, 13));
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
        selected = selected == null ? null : Math.max(0, Math.min(cfg.axes.length - 1, selected));
        visible = cfg.series.map(function () { return true; });
        disp = cfg.series.map(function (s) { return s.values.slice(); });
        mount();
      },
      setValue: function (seriesIdx, axisIdx, value) {
        var v = (value === null || value === undefined || value === "") ? null
          : Math.max(0, Math.min(cfg.maxValue, +value || 0));
        cfg.series[seriesIdx].values[axisIdx] = v;
        syncEditor();
        tweenTo();
      },
      select: select,
      getConfig: function () { return JSON.parse(JSON.stringify(cfg)); },
      destroy: function () {
        if (tweenRaf) cancelAnimationFrame(tweenRaf);
        root.remove();
      }
    };
  }

  global.BayaRadar = { create: create, defaults: DEFAULTS };
})(typeof window !== "undefined" ? window : this);
