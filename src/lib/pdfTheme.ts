/**
 * Shared PDF colour tokens and column width configs.
 * Single source of truth for both DPP and CPP generators.
 */

// ── DPP (Dirty) Theme — navy ─────────────────────────────────
export const DPP = {
  accent:     [27, 58, 92]    as [number, number, number],  // #1B3A5C
  dark:       [27, 58, 92]    as [number, number, number],
  headerBg:   [232, 237, 242] as [number, number, number],  // #E8EDF2
  headerTxt:  [27, 58, 92]    as [number, number, number],
  fldRow:     [214, 228, 240] as [number, number, number],  // #D6E4F0
  fldTxt:     [27, 58, 92]    as [number, number, number],
  border:     [200, 212, 224] as [number, number, number],  // #C8D4E0
  altRow:     [245, 247, 250] as [number, number, number],  // #F5F7FA
};

// ── CPP (Clean) Theme — burnt orange ─────────────────────────
export const CPP = {
  accent:     [212, 80, 10]   as [number, number, number],  // #D4500A
  dark:       [26, 26, 46]    as [number, number, number],   // #1A1A2E
  headerBg:   [253, 240, 232] as [number, number, number],  // #FDF0E8
  headerTxt:  [139, 48, 8]    as [number, number, number],   // #8B3008
  fldRow:     [254, 232, 214] as [number, number, number],  // #FEE8D6
  fldTxt:     [139, 48, 8]    as [number, number, number],   // #8B3008
  border:     [232, 196, 168] as [number, number, number],  // #E8C4A8
  altRow:     [253, 248, 245] as [number, number, number],  // #FDF8F5
};

// ── Common colours ────────────────────────────────────────────
export const COMMON = {
  white:      [255, 255, 255] as [number, number, number],
  amber:      [184, 134, 11]  as [number, number, number],  // #B8860B
  grey66:     [102, 102, 102] as [number, number, number],
  grey88:     [136, 136, 136] as [number, number, number],
  grey99:     [153, 153, 153] as [number, number, number],
  greyAA:     [170, 170, 170] as [number, number, number],
  greyBB:     [187, 187, 187] as [number, number, number],
  red:        [204, 0, 0]     as [number, number, number],  // #CC0000
  green:      [45, 122, 45]   as [number, number, number],  // #2D7A2D
  desc55:     [85, 85, 85]    as [number, number, number],
  txt44:      [68, 68, 68]    as [number, number, number],
  subHdrBg:   [240, 244, 248] as [number, number, number],  // #F0F4F8
  commentBg:  [254, 249, 245] as [number, number, number],  // #FEF9F5
};

// ── Column widths (mm) — A4 portrait, 186mm usable ────────────
export const COL_WIDTHS = {
  ch: 32, qty: 9, cgo: 14, lc: 16, ld: 24, dis: 24, vsl: 36, rate: 19, st: 12,
  // Total: 186mm
};

export const ENQ_COL_WIDTHS = {
  ch: 32, qty: 9, cgo: 14, lc: 16, route: 55, comments: 60,
  // Total: 186mm
};

// ── Status styling ────────────────────────────────────────────
export function getStatusStyle(s: string, theme: typeof DPP | typeof CPP): {
  color: [number, number, number]; style: string;
} {
  switch (s.toUpperCase()) {
    case "FLD":  return { color: theme.fldTxt, style: "bold" };
    case "SUBS": return { color: COMMON.amber, style: "bold" };
    case "HOLD": return { color: COMMON.grey66, style: "normal" };
    case "RNR":  return { color: COMMON.grey99, style: "normal" };
    case "CORR": return { color: COMMON.grey88, style: "italic" };
    case "OLD":  return { color: COMMON.greyAA, style: "italic" };
    case "-":    return { color: COMMON.greyBB, style: "normal" };
    default:     return { color: COMMON.greyBB, style: "normal" };
  }
}
