/*!
 * BayaPortfolio (light edition) — drop-in "Baya vs its competitors" section for
 * bayasystems.com. Renders the header, the light stage, the design carousel (with
 * auto-cycle), and the radar into any container. Typography matches the site
 * (Poppins 44.8px/500 hero titles, 16px eyebrows, Manrope text). Colors follow the
 * Baya Systems 3.2 brand system's light ("section-light") chapter tokens — see the
 * dark edition one level up for a dark ("section-dark") chapter instead.
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

  var STYLE_ID = "baya-portfolio-styles-light";

  // Colors follow the Baya Systems 3.2 brand system's light ("section-light") chapter
  // tokens: canvas #ffffff, raised card #f4f4f4, ink #0a0a0b, border #e5e5e7.
  var CSS = [
    ".bp-root{max-width:1240px;margin:0 auto;font-family:'Manrope',system-ui,-apple-system,'Segoe UI',sans-serif;}",
    ".bp-eyebrow{font-family:'Poppins',system-ui,sans-serif;font-size:18px;font-weight:500;",
    "  color:#0086ff;margin:0 0 6px;}",
    ".bp-title{font-family:'Poppins',system-ui,sans-serif;font-size:44.8px;font-weight:500;",
    "  line-height:1.2;color:#0a0a0b;margin:0 0 20px;}",
    ".bp-stage{background:#f4f4f4;border-radius:4px;padding:28px;",
    "  border:1px solid #e5e5e7;",
    "  background-image:",
    "    radial-gradient(ellipse 75% 65% at 50% 42%,transparent 0%,transparent 35%,#f4f4f4 82%),",
    "    radial-gradient(rgba(10,10,11,.12) 0,rgba(10,10,11,0) 1.1px);",
    "  background-repeat:no-repeat,repeat;",
    "  background-size:100% 100%,4px 4px;}",
    /* design name + count ("Design 3/10") sits between the two arrow buttons,
       centered above the metrics list */
    ".bp-arrows{display:flex;align-items:center;gap:14px;}",
    ".bp-name{font-family:'Poppins',system-ui,sans-serif;font-size:18px;font-weight:500;",
    "  color:#0a0a0b;margin:0;min-width:132px;text-align:center;transition:opacity .16s;",
    "  font-variant-numeric:tabular-nums;}",
    ".bp-arrow{width:38px;height:38px;border-radius:6px;background:#ffffff;",
    "  border:1px solid #e5e5e7;color:rgba(10,10,11,.6);cursor:pointer;flex:0 0 auto;",
    "  display:flex;align-items:center;justify-content:center;",
    "  transition:border-color .15s,background .15s,color .15s;}",
    ".bp-arrow:hover{border-color:#0086ff;background:#eaf4ff;color:#0a0a0b;}",
    ".bp-arrow:active{background:#0086ff;border-color:#0086ff;color:#ffffff;}",
    ".bp-arrow:focus-visible{outline:2px solid #0086ff;outline-offset:1px;}",
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
    ".bp-disclaimer{font-size:11.5px;font-weight:500;color:rgba(10,10,11,.6);text-align:center;",
    "  margin:16px 0 0;padding-top:16px;border-top:1px solid #e5e5e7;}",
    "@media (max-width:900px){",
    "  .bp-title{font-size:32px;}",
    "  .bp-stage{padding:20px;}",
    "  .bp-name{font-size:15px;min-width:0;}",
    "  .bp-arrows{gap:10px;}",
    "  .bp-stage .bradar-chart-wrap{min-width:280px;}",
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
      theme: "light",
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
