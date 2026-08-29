/* ============================================================================
   BayaRadar portfolio data — the single source of truth for dashboard.html
   ============================================================================
   All numbers on the dashboard come from this file. Nothing is edited on the
   page itself: change the values here (or ask Claude Code to change them),
   save, and refresh the page.

   Values are percentage scores (higher = better) from internal benchmarking.
   Metrics that are naturally "lower is better" (latency, silicon area) are
   already inverted before being entered here (1/Latency, 1/Area), so every
   axis reads the same way: a bigger percentage is a better result.

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

  maxValue: 250,
  unit: "%",

  axes: [
    { label: "1 / Latency",           short: "1/Latency",  benefit: "lower latency",           description: "Higher score = lower latency" },
    { label: "Power Efficiency",      short: "Power",      benefit: "higher power efficiency", description: "Higher score = better perf/W" },
    { label: "Bandwidth",             short: "B/W",        benefit: "higher bandwidth",        description: "Higher score = higher sustained bandwidth" },
    { label: "Silicon Area",          short: "Area",       benefit: "better area efficiency",  description: "Higher score = smaller area" },
    { label: "Physical Design Speed", short: "PD Speed",   benefit: "faster design closure",   description: "Higher score = faster design closure" }
  ],

  // colors are tuned for the dark chart surface (contrast + colorblind checks)
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
        [90.3, 97.7, 183.0, 79.3, 167.1],    // Baya Systems
        [null, null, null, null, null],      // Competitor A
        [null, null, null, null, null],      // Competitor B
        [86.9, 105.2, 63.5, 60.1, 66.9]       // In-house
      ]
    },
    {
      name: "Design 2",
      values: [
        [120.0, 58.6, 92.5, 157.6, 162.6],
        [null, null, null, null, null],
        [null, null, null, null, null],
        [91.1, 60.7, 92.5, 45.5, 57.8]
      ]
    },
    {
      name: "Design 3",
      values: [
        [93.0, 93.0, 71.5, 124.7, 168.8],
        [72.4, 102.3, 69.5, 137.2, 58.7],
        [null, null, null, null, null],
        [66.5, 138.0, 115.4, 71.5, 20.0]
      ]
    },
    {
      name: "Design 4",
      values: [
        [103.0, 105.5, 144.8, 191.1, 152.8],
        [92.9, 63.4, 84.0, 123.3, 73.3],
        [75.9, 50.0, 84.0, 44.7, 78.6],
        [null, null, null, null, null]
      ]
    },
    {
      name: "Design 5",
      values: [
        [132.5, 185.6, 139.2, 121.9, 192.2],
        [119.3, 167.0, 54.3, 135.2, 63.6],
        [106.0, 167.0, 139.2, 108.7, 211.4],
        [66.3, 43.7, 72.9, 58.3, 67.6]
      ]
    },
    {
      name: "Design 6",
      values: [
        [124.3, 144.1, 98.3, 98.2, 150.5],
        [149.2, 158.5, 86.1, 111.8, 56.6],
        [null, null, null, null, 165.6],
        [90.3, 91.5, 101.0, 80.8, 35.0]
      ]
    },
    {
      name: "Design 7",
      values: [
        [81.0, 149.6, 180.5, 84.1, 188.8],
        [92.5, 157.1, 46.7, 115.6, 82.0],
        [74.3, 41.0, 94.4, 50.6, 68.6],
        [null, null, null, null, null]
      ]
    },
    {
      name: "Design 8",
      values: [
        [144.9, 122.3, 154.9, 147.8, 95.1],
        [null, null, null, null, null],
        [41.0, 51.8, 64.2, 77.4, 48.8],
        [null, null, null, null, null]
      ]
    },
    {
      name: "Design 9",
      values: [
        [97.3, 186.1, 145.2, 124.1, 143.8],
        [107.0, 176.8, 74.7, 119.8, 49.3],
        [null, null, null, null, null],
        [87.4, 43.7, 90.2, 86.0, 67.7]
      ]
    },
    {
      name: "Design 10",
      values: [
        [61.0, 122.0, 141.7, 77.5, 156.8],
        [76.7, 97.6, 70.9, 106.4, 73.2],
        [null, null, null, null, null],
        [null, null, null, null, null]
      ]
    }
  ]
};
