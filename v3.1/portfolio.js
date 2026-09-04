/*!
 * BayaPortfolio — drop-in "Baya vs its competitors" section for bayasystems.com.
 * Renders the header, the dark stage, the design carousel (with auto-cycle), and
 * the radar into any container. Typography matches the site (Poppins 44.8px/500
 * hero titles, 16px eyebrows, Manrope text).
 *
 * Embed (order matters):
 *   <div id="baya-portfolio"></div>
 *   <script src="baya-radar.js"></script>
 *   <script src="data.js"></script>
 *   <script src="portfolio.js"></script>
 *   <script>BayaPortfolio.mount('#baya-portfolio');</script>
 *
 * Options: BayaPortfolio.mount(target, {
 *   eyebrow: "Product Portfolio",          // "" hides it
 *   title:   "Baya vs its competitors",    // "" hides it
 *   data:    BAYA_PORTFOLIO,               // defaults to the global from data.js
 *   idleMs:  5000, stepMs: 3000            // auto-cycle timing
 * });
 * Returns { chart, show(index|null) } — show(2) jumps to Design 3, show(null) to All.
 */
(function (global) {
  "use strict";

  var STYLE_ID = "baya-portfolio-styles-v31";

  var CSS = [
    ".bp-root{max-width:1240px;margin:0 auto;font-family:'Manrope',system-ui,-apple-system,'Segoe UI',sans-serif;}",
    ".bp-eyebrow{font-family:'Poppins',system-ui,sans-serif;font-size:18px;font-weight:500;",
    "  color:#0086ff;margin:0 0 6px;}",
    ".bp-title{font-family:'Poppins',system-ui,sans-serif;font-size:44.8px;font-weight:500;",
    "  line-height:1.2;color:#ffffff;margin:0 0 20px;}",
    ".bp-stage{background:#16171b;border-radius:4px;padding:28px;",
    "  border:1px solid rgba(255,255,255,.10);",
    "  background-image:",
    "    radial-gradient(ellipse 75% 65% at 50% 42%,transparent 0%,transparent 35%,#16171b 82%),",
    "    radial-gradient(rgba(244,244,244,.14) 0,rgba(244,244,244,0) 1.1px);",
    "  background-repeat:no-repeat,repeat;",
    "  background-size:100% 100%,4px 4px;}",
    /* design name + count ("Design 3/10") sits between the two arrow buttons,
       centered above the metrics list */
    ".bp-arrows{display:flex;align-items:center;gap:14px;}",
    ".bp-name{font-family:'Poppins',system-ui,sans-serif;font-size:18px;font-weight:500;",
    "  color:#ffffff;margin:0;min-width:132px;text-align:center;transition:opacity .16s;",
    "  font-variant-numeric:tabular-nums;}",
    ".bp-arrow{width:38px;height:38px;border-radius:6px;background:#202128;",
    "  border:1px solid rgba(255,255,255,.13);color:#c7cede;cursor:pointer;flex:0 0 auto;",
    "  display:flex;align-items:center;justify-content:center;",
    "  transition:border-color .15s,background .15s,color .15s;}",
    ".bp-arrow:hover{border-color:#0086ff;background:#14203a;color:#ffffff;}",
    ".bp-arrow:active{background:#0086ff;color:#ffffff;}",
    ".bp-arrow:focus-visible{outline:2px solid #3f9dff;outline-offset:1px;}",
    ".bp-arrow svg{display:block;}",
    /* radar on the left; on the right a centered [prev, name/count, next] row above
       the metrics list — the whole pair centered as a block and vertically aligned
       against each other; the legend sits directly under the top padding now that
       there is no full-width header bar above it */
    ".bp-stage .bradar-main{justify-content:center;align-items:center;}",
    ".bp-stage .bradar-legend{justify-content:center;margin:0 0 20px;}",
    ".bp-stage .bradar-chart-wrap{flex:1 1 520px;min-width:340px;max-width:730px;}",
    ".bp-side{display:flex;flex-direction:column;align-items:stretch;gap:14px;",
    "  flex:0 1 320px;min-width:265px;}",
    ".bp-side .bp-arrows{align-self:center;}",
    ".bp-stage .bradar-panel{flex:none;width:100%;min-width:0;margin-top:0;}",
    ".bp-stage .bradar-overall{width:100%;}",
    ".bp-disclaimer{font-size:11.5px;font-weight:500;color:#5b6577;text-align:center;",
    "  margin:16px 0 0;padding-top:16px;border-top:1px solid rgba(255,255,255,.10);}",
    /* KPI stat row below the stage — averaged across all 10 designs, so it stays
       fixed regardless of which design the carousel above is currently isolating */
    ".bp-stats{display:flex;flex-wrap:wrap;justify-content:center;gap:32px 40px;",
    "  margin:28px 0 0;padding:28px 0 0;border-top:1px solid rgba(255,255,255,.10);}",
    ".bp-stat{flex:1 1 160px;max-width:200px;text-align:center;}",
    ".bp-stat-value{font-family:'Poppins',system-ui,sans-serif;",
    "  font-size:clamp(1.75rem,1.4rem + 1.5vw,2.5rem);font-weight:700;line-height:1.1;",
    "  letter-spacing:-0.01em;color:#0086ff;margin:0 0 6px;font-variant-numeric:tabular-nums;}",
    ".bp-stat-label{font-family:'Poppins',system-ui,sans-serif;font-size:15px;",
    "  font-weight:600;color:#ffffff;margin:0 0 4px;}",
    ".bp-stat-sub{font-size:12.5px;font-weight:500;color:#7c8598;margin:0;}",
    "@media (max-width:900px){",
    "  .bp-title{font-size:32px;}",
    "  .bp-stage{padding:20px;}",
    "  .bp-name{font-size:15px;min-width:0;}",
    "  .bp-arrows{gap:10px;}",
    "  .bp-stage .bradar-chart-wrap{min-width:280px;}",
    "  .bp-stats{gap:22px 20px;margin-top:20px;padding-top:20px;}",
    "  .bp-stat{flex:1 1 130px;}",
    "}"
  ].join("\n");

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function el(tag, className, parent, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  // ── KPI stat row: Baya's edge per metric, averaged across every design ──
  // Same method as the chart's own "Baya benefit by metric" panel in its default
  // (all-designs, unselected) view: average each metric across the 10 designs per
  // company (skipping designs with no data), then compare Baya's average to the
  // average of the other companies' averages. Computed straight from data.js so it
  // never drifts out of sync with the chart above it.
  var STAT_LABELS = ["Lower Latency", "Better Efficiency", "More Bandwidth", "Less Silicon Area", "Faster PD Closure"];

  function axisAvg(data, ci, ai) {
    var sum = 0, n = 0;
    data.products.forEach(function (p) {
      var v = p.values[ci][ai];
      if (v != null) { sum += v; n++; }
    });
    return n ? sum / n : null;
  }

  function computeMetricStats(data) {
    var nCo = data.companies.length;
    var stats = [];
    data.axes.forEach(function (axis, ai) {
      var baya = axisAvg(data, 0, ai);
      if (baya == null) return;
      var sum = 0, n = 0;
      for (var ci = 1; ci < nCo; ci++) {
        var v = axisAvg(data, ci, ai);
        if (v != null) { sum += v; n++; }
      }
      if (!n) return;
      var altAvg = sum / n;
      if (altAvg <= 0) return;
      var pct = ((baya - altAvg) / altAvg) * 100;
      // a lead of 100%+ (Baya at 2x+ the alternative average) reads better as a
      // multiplier than a three-digit percentage
      var display = pct >= 100
        ? "~" + (1 + pct / 100).toFixed(1) + "x"
        : (pct >= 0 ? "+" : "−") + Math.round(Math.abs(pct)) + "%";
      stats.push({ label: STAT_LABELS[ai] || axis.short, sub: "vs Alternative Average", display: display });
    });
    return stats;
  }

  function arrowSvg(dir) {
    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", "18"); svg.setAttribute("height", "18"); svg.setAttribute("viewBox", "0 0 18 18");
    var p = document.createElementNS(NS, "path");
    p.setAttribute("d", dir < 0 ? "M11.5 3.5L6 9l5.5 5.5" : "M6.5 3.5L12 9l-5.5 5.5");
    p.setAttribute("fill", "none"); p.setAttribute("stroke", "currentColor");
    p.setAttribute("stroke-width", "2.2"); p.setAttribute("stroke-linecap", "round");
    p.setAttribute("stroke-linejoin", "round");
    svg.appendChild(p);
    return svg;
  }

  function mount(target, opts) {
    opts = opts || {};
    var container = typeof target === "string" ? document.querySelector(target) : target;
    if (!container) throw new Error("BayaPortfolio: container element not found");
    if (!global.BayaRadar) throw new Error("BayaPortfolio: load baya-radar.js first");
    var data = opts.data || global.BAYA_PORTFOLIO;
    if (!data) throw new Error("BayaPortfolio: load data.js first (or pass options.data)");
    injectStyles();

    var REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var products = data.products;

    var root = el("div", "bp-root", null);
    var eyebrow = opts.eyebrow !== undefined ? opts.eyebrow : "";
    var title = opts.title !== undefined ? opts.title : "Benefits of Baya's solutions";
    if (eyebrow) el("p", "bp-eyebrow", root, eyebrow);
    if (title) el("h2", "bp-title", root, title);

    var stage = el("div", "bp-stage", root);
    // arrows row: [prev] [design name + count] [next] — sits above the metrics panel below
    var arrows = el("div", "bp-arrows", null);
    var prevBtn = el("button", "bp-arrow", arrows);
    prevBtn.type = "button"; prevBtn.setAttribute("aria-label", "Previous design");
    prevBtn.appendChild(arrowSvg(-1));
    var nameEl = el("p", "bp-name", arrows, "All designs");
    var nextBtn = el("button", "bp-arrow", arrows);
    nextBtn.type = "button"; nextBtn.setAttribute("aria-label", "Next design");
    nextBtn.appendChild(arrowSvg(1));
    var chartMount = el("div", "", stage);
    container.appendChild(root);

    var chart = global.BayaRadar.create(chartMount, {
      theme: "dark",
      frameless: true,
      eyebrow: "", title: "", subtitle: "",
      maxValue: data.maxValue,
      unit: data.unit || "",
      axes: data.axes,
      series: data.companies,
      products: products,
      product: null
    });

    // move the arrows (with the design name + count between them) into a right-hand
    // column, centered above the metrics panel, with the overall-benefit gauge card
    // at the bottom
    var main = chartMount.querySelector(".bradar-main");
    var panel = chartMount.querySelector(".bradar-panel");
    var overall = chartMount.querySelector(".bradar-overall");
    var side = el("div", "bp-side", main);
    side.appendChild(arrows);
    side.appendChild(panel);
    if (overall) side.appendChild(overall);

    el("p", "bp-disclaimer", stage,
      "Figures shown are internal benchmark results from Baya Systems’ internal audit, provided for illustrative comparison only.");

    var stats = computeMetricStats(data);
    if (stats.length) {
      var statsRow = el("div", "bp-stats", root);
      stats.forEach(function (s) {
        var tile = el("div", "bp-stat", statsRow);
        el("p", "bp-stat-value", tile, s.display);
        el("p", "bp-stat-label", tile, s.label);
        el("p", "bp-stat-sub", tile, s.sub);
      });
    }

    // ── design carousel: All designs → Design 1 → … → Design N → back ──
    var seq = [null].concat(products.map(function (_, i) { return i; }));
    var pos = 0;

    function show(pi) {
      pos = seq.indexOf(pi === undefined ? null : pi);
      if (pos < 0) pos = 0;
      applyPos();
    }
    function stepTo(p) {
      pos = ((p % seq.length) + seq.length) % seq.length;
      applyPos();
    }
    function applyPos() {
      var pi = seq[pos];
      chart.setProduct(pi);
      var label = pi == null ? "All designs" : products[pi].name + "/" + products.length;
      if (REDUCED) {
        nameEl.textContent = label;
      } else {
        nameEl.style.opacity = "0";
        setTimeout(function () {
          nameEl.textContent = label;
          nameEl.style.opacity = "1";
        }, 140);
      }
    }
    prevBtn.addEventListener("click", function () { stepTo(pos - 1); });
    nextBtn.addEventListener("click", function () { stepTo(pos + 1); });
    window.addEventListener("keydown", function (ev) {
      if (/input|textarea|select/i.test(ev.target.tagName)) return;
      if (ev.key === "ArrowLeft") stepTo(pos - 1);
      else if (ev.key === "ArrowRight") stepTo(pos + 1);
    });
    stepTo(0);

    // ── idle auto-cycle: after idleMs without interaction, walk the carousel ──
    var IDLE_MS = opts.idleMs || 5000, STEP_MS = opts.stepMs || 3000;
    var idleTimer = null, cycleTimer = null, cycling = false;

    function startCycle() {
      if (cycling) return;
      cycling = true;
      stepTo(pos + 1);
      cycleTimer = setInterval(function () { stepTo(pos + 1); }, STEP_MS);
    }
    function stopCycle() {
      if (!cycling) return;
      cycling = false;
      clearInterval(cycleTimer);
    }
    function resetIdle() {
      stopCycle();
      clearTimeout(idleTimer);
      idleTimer = setTimeout(startCycle, IDLE_MS);
    }
    ["pointerdown", "pointermove", "wheel", "keydown", "touchstart"].forEach(function (ev) {
      window.addEventListener(ev, resetIdle, { passive: true });
    });
    idleTimer = setTimeout(startCycle, IDLE_MS);

    return { chart: chart, show: show };
  }

  global.BayaPortfolio = { mount: mount };
})(typeof window !== "undefined" ? window : this);
