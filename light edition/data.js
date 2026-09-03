/* ============================================================================
   BayaRadar portfolio data — the single source of truth for dashboard.html
   ============================================================================
   All numbers on the dashboard come from this file. Nothing is edited on the
   page itself: change the values here (or ask Claude Code to change them),
   save, and refresh the page.

   Values are percentages normalized to the best result per metric: for each
   metric, the single largest raw value across every design and company = 100,
   and everything else is proportional to it (so 100% = best-in-class, not an
   absolute target). Metrics that are naturally "lower is better" (latency,
   silicon area) are already inverted before being entered here (1/Latency,
   1/Area), so every axis reads the same way: a bigger percentage is better.

   Use null where there is no data — that point is skipped on the radar and
   shown as "—" in the comparison bars.

   Each values row is ordered: [1/Latency, Power, Bandwidth, Area, PD Closure]
   and the rows are ordered to match `companies` below:
       row 0 = Baya Systems, row 1 = Competitor A,
       row 2 = Competitor B, row 3 = In-house

   Each product may also carry an optional note, shown under its name in the
   scroll story (otherwise a line is generated from the data):
       { name: "Design 1", note: "One sentence about this product.", values: [...] }
   ============================================================================ */

var BAYA_PORTFOLIO = {

  maxValue: 100,
  unit: "%",

  axes: [
    { label: "1 / Latency",           short: "1/Latency",  benefit: "lower latency",           description: "Higher score = lower latency" },
    { label: "Power Efficiency",      short: "Power",      benefit: "higher power efficiency", description: "Higher score = better perf/W" },
    { label: "Bandwidth",             short: "B/W",        benefit: "higher bandwidth",        description: "Higher score = higher sustained bandwidth" },
    { label: "Silicon Area",          short: "Area",       benefit: "better area efficiency",  description: "Higher score = smaller area" },
    { label: "Physical Design Speed", short: "PD Speed",   benefit: "faster design closure",   description: "Higher score = faster design closure" }
  ],

  // same company colors as the dark edition (checked for contrast + colorblind
  // separation on the light #f4f4f4/#ffffff card surface too)
  companies: [
    { name: "Baya Systems",  color: "#0086ff" },
    { name: "Alternative A", color: "#d63a20" },
    { name: "Alternative B", color: "#22a765" },
    { name: "In-house",      color: "#e26a9f" }
  ],

  products: [
    {
      name: "Design 1",
      values: [
        [60.5, 52.5, 100, 41.5, 79],          // Baya Systems
        [null, null, null, null, null],       // Competitor A
        [null, null, null, null, null],       // Competitor B
        [58.2, 56.5, 34.7, 31.4, 31.6]         // In-house
      ]
    },
    {
      name: "Design 2",
      values: [
        [80.4, 31.5, 50.5, 82.5, 76.9],
        [null, null, null, null, null],
        [null, null, null, null, null],
        [61.1, 32.6, 50.5, 23.8, 27.3]
      ]
    },
    {
      name: "Design 3",
      values: [
        [62.3, 50, 39.1, 65.3, 79.8],
        [48.5, 55, 38, 71.8, 27.8],
        [null, null, null, null, null],
        [44.6, 74.2, 63.1, 37.4, 9.5]
      ]
    },
    {
      name: "Design 4",
      values: [
        [69, 56.7, 79.1, 100, 72.3],
        [62.3, 34.1, 45.9, 64.5, 34.7],
        [50.9, 26.9, 45.9, 23.4, 37.2],
        [null, null, null, null, null]
      ]
    },
    {
      name: "Design 5",
      values: [
        [88.8, 99.7, 76.1, 63.8, 90.9],
        [80, 89.7, 29.7, 70.7, 30.1],
        [71, 89.7, 76.1, 56.9, 100],
        [44.4, 23.5, 39.8, 30.5, 32]
      ]
    },
    {
      name: "Design 6",
      values: [
        [83.3, 77.4, 53.7, 51.4, 71.2],
        [100, 85.2, 47, 58.5, 26.8],
        [null, null, null, null, 78.3],
        [60.5, 49.2, 55.2, 42.3, 16.6]
      ]
    },
    {
      name: "Design 7",
      values: [
        [54.3, 80.4, 98.6, 44, 89.3],
        [62, 84.4, 25.5, 60.5, 38.8],
        [49.8, 22, 51.6, 26.5, 32.5],
        [null, null, null, null, null]
      ]
    },
    {
      name: "Design 8",
      values: [
        [97.1, 65.7, 84.6, 77.3, 45],
        [null, null, null, null, null],
        [27.5, 27.8, 35.1, 40.5, 23.1],
        [null, null, null, null, null]
      ]
    },
    {
      name: "Design 9",
      values: [
        [65.2, 100, 79.3, 64.9, 68],
        [71.7, 95, 40.8, 62.7, 23.3],
        [null, null, null, null, null],
        [58.6, 23.5, 49.3, 45, 32]
      ]
    },
    {
      name: "Design 10",
      values: [
        [40.9, 65.6, 77.4, 40.6, 74.2],
        [51.4, 52.4, 38.7, 55.7, 34.6],
        [null, null, null, null, null],
        [null, null, null, null, null]
      ]
    }
  ]
};
