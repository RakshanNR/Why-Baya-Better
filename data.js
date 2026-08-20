/* ============================================================================
   BayaRadar portfolio data — the single source of truth for dashboard.html
   ============================================================================
   All numbers on the dashboard come from this file. Nothing is edited on the
   page itself: change the values here (or ask Claude Code to change them),
   save, and refresh the page.

   Scores are 0–10 where HIGHER = BETTER. For metrics where a lower raw number
   is better (latency, silicon area), enter a score, not the raw number
   (e.g. 10 = best-in-class latency).

   Use null where there is no data — that point is skipped on the radar and
   shown as "—" in the comparison bars.

   Each values row is ordered: [Latency, Power, Bandwidth, Area, PD Closure]
   and the rows are ordered to match `companies` below:
       row 0 = Baya Systems, row 1 = Competitor A,
       row 2 = Competitor B, row 3 = In-house

   Each product may also carry an optional note, shown under its name in the
   scroll story (otherwise a line is generated from the data):
       { name: "Design 1", note: "One sentence about this product.", values: [...] }
   ============================================================================ */

var BAYA_PORTFOLIO = {

  maxValue: 10,

  axes: [
    { label: "1 / Latency",           short: "1/Latency",  description: "Higher score = lower latency" },
    { label: "Power Efficiency",      short: "Power",      description: "Higher score = better perf/W" },
    { label: "Bandwidth",             short: "B/W",        description: "Higher score = higher sustained bandwidth" },
    { label: "Silicon Area",          short: "Area",       description: "Higher score = smaller area" },
    { label: "Physical Design Speed", short: "PD Speed",   description: "Higher score = faster design closure" }
  ],

  // colors are tuned for the dark chart surface (contrast + colorblind checks)
  companies: [
    { name: "Baya Systems", color: "#0086ff" },
    { name: "Competitor A", color: "#d63a20" },
    { name: "Competitor B", color: "#22a765" },
    { name: "In-house",     color: "#e26a9f" }
  ],

  products: [
    {
      name: "Design 1",
      values: [
        [9, 8.5, 9, 8, 9.5],     // Baya Systems
        [6, 5.5, 7, 5, 4],       // Competitor A
        [5, 6.5, 5.5, 6.5, 5],   // Competitor B
        [7, 6, 6.5, 7.5, 6.5]   // In-house
      ]
    },
    {
      name: "Design 2",
      values: [
        [8.5, 9, 8, 8.5, 9],
        [8.5, 6, 6.5, 6, 5.5],   // ties Baya on latency
        [6, 7, 6, 5.5, 6],
        [6.5, 5.5, 6, 7, 6]
      ]
    },
    {
      name: "Design 3",
      values: [
        [9.5, 8, 9.5, 7.5, 9],
        [5.5, 6.5, 6, 6.5, 5],
        [7, 5.5, 7.5, 5, 5.5],
        [6.5, 6, 6.5, 6, 6]
      ]
    },
    {
      name: "Design 4",
      values: [
        [8, 9.5, 8.5, 9, 8.5],
        [6.5, 5, 7.5, 5.5, 6],
        [5.5, 6, 5, 7, 6.5],
        [6, 7, 5.5, 6, 7]
      ]
    },
    {
      name: "Design 5",
      values: [
        [9, 8, 9, 8.5, 9.5],
        [7.5, 7, 6, 6, 5.5],
        [6.5, 5.5, 7, 6, 5],
        [5.5, 6.5, 6, 6.5, 6]
      ]
    },
    {
      name: "Design 6",
      values: [
        [8.5, 9, 9.5, 8, 9],
        [6, 6.5, 5.5, 7, 5.5],
        [7, 6, 6.5, 5.5, 6],
        [6.5, 6, 7, 6, 6.5]
      ]
    },
    {
      name: "Design 7",
      values: [
        [9.5, 8.5, 8, 9, 8.5],
        [5, 7, 6.5, 5.5, 6.5],
        [6, 5, 7, 6.5, 5.5],
        [7, 6.5, 6, 5.5, 6]
      ]
    },
    {
      name: "Design 8",
      values: [
        [8, 8.5, 9, 9.5, 9],
        [7, 6, 5.5, 6.5, 5],
        [5.5, 9, 6, 5, 6.5],     // Competitor B leads on power here
        [6, 5.5, 6.5, 7, 6.5]
      ]
    },
    {
      name: "Design 9",
      values: [
        [9, 9.5, 8.5, 8, 8.5],
        [6.5, 5.5, 7, 6, 6],
        [7.5, 6, 5.5, 6.5, 5.5],
        [6, 7, 6, 6.5, 7]
      ]
    },
    {
      name: "Design 10",
      values: [
        [8.5, 8, 9.5, 9, 9.5],
        [6, 7.5, 6, 5, 5.5],
        [6.5, 6, 7, 6, 6],
        [7, 6, 5.5, 6, 6.5]
      ]
    }
  ]
};
