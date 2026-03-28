/**
 * Shared vessel class and cargo type constants used across
 * Market Reports, Enquiries, and the fixture extraction engine.
 */

export const VESSEL_CLASSES = [
  // Crude Tankers
  "VLCC",
  "ULCC",
  "Suezmax",
  "Aframax",
  "Panamax",
  // Clean Product Tankers
  "LR2",
  "LR1",
  "MR",
  // Small / Coastal
  "Small Tanker",
  "GP",
  "Handy",
  "Coaster",
  // Gas Carriers
  "VLGC",
  "LGC",
  "MGC",
  "SGC",
  // Chemical
  "Chemical",
  // Dry Bulk (for mixed reports)
  "Capesize",
  "Kamsarmax",
  "Supramax",
  "Handymax",
  "Handysize",
] as const;

export type VesselClass = (typeof VESSEL_CLASSES)[number];

export const VESSEL_CLASS_GROUPS: Record<string, VesselClass[]> = {
  "Crude Tankers": ["VLCC", "ULCC", "Suezmax", "Aframax", "Panamax"],
  "Clean Product": ["LR2", "LR1", "MR"],
  "Small / Coastal": ["Small Tanker", "GP", "Handy", "Coaster"],
  "Gas Carriers": ["VLGC", "LGC", "MGC", "SGC"],
  Chemical: ["Chemical"],
  "Dry Bulk": ["Capesize", "Kamsarmax", "Supramax", "Handymax", "Handysize"],
};

export const CARGO_TYPES = [
  "Crude",
  "CPP",
  "DPP",
  "Chemical",
  "LPG",
  "LNG",
  "Vegetable Oil",
  "Dry Bulk",
] as const;

export type CargoType = (typeof CARGO_TYPES)[number];

export const COATING_TYPES = [
  "Epoxy",
  "Phenolic Epoxy",
  "Zinc",
  "Stainless Steel",
  "Marineline",
  "None",
] as const;

export type CoatingType = (typeof COATING_TYPES)[number];

/** Dropdown options for filters (with "all" default) */
export const VESSEL_CLASS_FILTER_OPTIONS = [
  { value: "all", label: "All Vessel Types" },
  ...VESSEL_CLASSES.map((c) => ({ value: c, label: c })),
];

export const CARGO_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All Cargo Types" },
  ...CARGO_TYPES.map((c) => ({ value: c, label: c })),
];

export const COATING_FILTER_OPTIONS = [
  { value: "all", label: "All Coatings" },
  ...COATING_TYPES.map((c) => ({ value: c, label: c })),
];
