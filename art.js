// ── Terminal art: palette + drawings ──────────────────────────────────────────
//
//   HOW TO DRAW
//   ───────────
//   1. Add a named export below (e.g. MY_SHAPE).
//   2. Fill a 2-D array with PAL indices — each cell = 2 terminal columns.
//   3. Use 0 for transparent (empty space).
//   4. Align columns with spaces so the source reads like a pixel canvas.
//   5. Call renderRows(MY_SHAPE) to get an array of colored strings.
//
//   PALETTE INDEX REFERENCE
//   ────────────────────────────────────────────────────────────
//    0   ·  transparent     (two spaces, no color)
//    1   █  trunk           dark brown  rgb( 80,  45,  20)
//    2   █  bunker_wall     dark orange rgb(136,  34,   0)
//    3   █  concrete        slate grey  rgb( 90,  90,  85)
//    4   █  eye             pale cream  rgb(255, 238, 204)
//    5   █  military        dark olive  rgb( 75, 110,  55)
//    6   █  leaves          forest green rgb( 46,  95,  50)
//    7   █  ground          mid green   rgb(109, 179, 122)
//    8   █  floor           near-black  rgb( 42,  42,  42)
//    9   █  amber           warm gold   rgb(232, 184,  75)
//   10   █  sky_day         clear blue  rgb( 96, 165, 210)
//   11   █  sky_night       deep navy   rgb( 10,  15,  40)
//   12   █  mid_orange      mid flame   rgb(204,  85,  34)
//   13   █  bright          off-white   rgb(240, 236, 224)
//   14   █  muted           dim grey    rgb( 85,  85,  85)
// ─────────────────────────────────────────────────────────────────────────────

const bgRgb = (r, g, b) => `\x1b[48;2;${r};${g};${b}m`;
export const RESET = '\x1b[0m';

export const PAL = [
  /* 0  transparent  */  null,
  /* 1  trunk        */  bgRgb( 80,  45,  20),
  /* 2  bunker_wall  */  bgRgb(136,  34,   0),
  /* 3  concrete     */  bgRgb( 90,  90,  85),
  /* 4  eye          */  bgRgb(255, 238, 204),
  /* 5  military     */  bgRgb( 75, 110,  55),
  /* 6  leaves       */  bgRgb( 46,  95,  50),
  /* 7  ground       */  bgRgb(109, 179, 122),
  /* 8  floor        */  bgRgb( 42,  42,  42),
  /* 9  amber        */  bgRgb(232, 184,  75),
  /* 10 sky_day      */  bgRgb( 96, 165, 210),
  /* 11 sky_night    */  bgRgb( 10,  15,  40),
  /* 12 mid_orange   */  bgRgb(204,  85,  34),
  /* 13 bright       */  bgRgb(240, 236, 224),
  /* 14 muted        */  bgRgb( 85,  85,  85),
];

// ── Render helper ──────────────────────────────────────────────────────────────
//   Each cell → 2 terminal columns wide (keeps pixels square-ish).
export function renderRows(rows) {
  return rows.map(row => {
    let s = '';
    for (const v of row) {
      s += PAL[v] ? PAL[v] + '  ' + RESET : '  ';
    }
    return s;
  });
}

// ═════════════════════════════════════════════════════════════════════════════
//  DRAWINGS  (13 cells wide = 26 terminal columns, top-to-bottom)
// ═════════════════════════════════════════════════════════════════════════════

//                    col→  0  1  2  3  4  5  6  7  8  9 10 11 12
export const TREE_ROWS = [
  /* canopy top-L  */    [  0, 0, 0, 6, 0, 0, 0, 0, 0, 6, 0, 0, 0 ],
  /* canopy mid-L  */    [  0, 0, 6, 6, 6, 0, 0, 0, 6, 6, 6, 0, 0 ],
  /* canopy wide   */    [  0, 6, 6, 6, 6, 6, 0, 6, 6, 6, 6, 6, 0 ],
  /* canopy base   */    [  0, 0, 6, 1, 6, 0, 0, 0, 6, 1, 6, 0, 0 ],
  /* ground strip  */    [  7, 7, 7, 1, 7, 7, 7, 7, 7, 1, 7, 7, 7 ],
];

//                    col→  0  1  2  3  4  5  6  7  8  9 10 11 12
export const BUNKER_ROWS = [
  /* roof          */    [  2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4, 4, 4 ],
  /* upper interior*/    [  2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2 ],
  /* open interior */    [  2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 2 ],
];

export const BUNKER_FLOOR = [ 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2 ];

// Walking figure — 2 animation frames (4 rows × 5 cols each)
//                    col→  0  1  2  3  4
export const FIGURE_FRAMES = [
  /* frame A */  [
    /* head  */  [  0, 0, 4, 0, 0 ],
    /* torso */  [  0, 5, 5, 5, 0 ],
    /* waist */  [  0, 0, 4, 0, 0 ],
    /* legs-A*/  [  0, 5, 0, 5, 0 ],
  ],
  /* frame B */  [
    /* head  */  [  0, 0, 4, 0, 0 ],
    /* torso */  [  0, 5, 5, 5, 0 ],
    /* waist */  [  0, 0, 4, 0, 0 ],
    /* legs-B*/  [  0, 0, 5, 5, 0 ],
  ],
];
