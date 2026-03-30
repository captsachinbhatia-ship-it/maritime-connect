/**
 * Shared PDF colour tokens and column width configs.
 * Single source of truth for both DPP and CPP generators.
 */

// ── DPP (Dirty) Theme — Claude orange (same as CPP) ──────────
export const DPP = {
  accent:     [218, 119, 86]  as [number, number, number],  // #DA7756
  dark:       [26, 26, 46]    as [number, number, number],   // #1A1A2E
  headerBg:   [251, 240, 236] as [number, number, number],  // #FBF0EC
  headerTxt:  [160, 68, 42]   as [number, number, number],   // #A0442A
  fldRow:     [250, 229, 221] as [number, number, number],  // #FAE5DD
  fldTxt:     [160, 68, 42]   as [number, number, number],   // #A0442A
  border:     [237, 203, 191] as [number, number, number],  // #EDCBBF
  altRow:     [253, 248, 245] as [number, number, number],  // #FDF8F5
};

// ── CPP (Clean) Theme — Claude logo orange ───────────────────
export const CPP = {
  accent:     [218, 119, 86]  as [number, number, number],  // #DA7756
  dark:       [26, 26, 46]    as [number, number, number],   // #1A1A2E
  headerBg:   [251, 240, 236] as [number, number, number],  // #FBF0EC
  headerTxt:  [160, 68, 42]   as [number, number, number],   // #A0442A
  fldRow:     [250, 229, 221] as [number, number, number],  // #FAE5DD
  fldTxt:     [160, 68, 42]   as [number, number, number],   // #A0442A
  border:     [237, 203, 191] as [number, number, number],  // #EDCBBF
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
  segBandBg:  [245, 213, 200] as [number, number, number],  // #F5D5C8 light orange tint for sub-sections
};

// ── Column widths (mm) — A4 portrait, 186mm usable ────────────
export const COL_WIDTHS = {
  ch: 28, qty: 14, cgo: 11, lc: 15, ld: 22, dis: 22, vsl: 28, rate: 20, st: 12,
  // Total: 172mm (14mm breathing room)
};

export const ENQ_COL_WIDTHS = {
  ch: 28, qty: 8, cgo: 11, lc: 15, route: 52, comments: 58,
  // Total: 172mm
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
