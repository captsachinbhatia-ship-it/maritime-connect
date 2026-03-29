import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { MarketRecord, Resolution } from "@/services/marketData";
import { normaliseForPdf, type NormalisedFixture } from "@/lib/fixtureNormaliser";
import { DPP, CPP, COMMON, COL_WIDTHS, ENQ_COL_WIDTHS, getStatusStyle } from "@/lib/pdfTheme";
import { getCommentaryForSections } from "@/lib/sectionCommentary";
import { supabase } from "@/lib/supabaseClient";
import logoJpg from "@/assets/logo-aq-maritime.jpg";

// ── Segment / region order ────────────────────────────────────
const DIRTY_SEGMENTS = ["VLCC", "ULCC", "Suezmax", "Aframax", "Panamax", "LR2", "LR1", "MR"];
const CLEAN_SEGMENTS = ["MR", "LR1", "LR2"];
const CLEAN_REGIONS = ["MEG - RSEA - INDIA", "SOUTHEAST-FAR EAST ASIA", "CROSS SINGAPORE", "MED-UKC-WAFR"];

// ── Footer contacts ───────────────────────────────────────────
const TEAM = [
  { name: "Kartik Yadav", ice: "KY0", phone: "+91-8800265045" },
  { name: "Shashank Mathur", ice: "SHMATHUR", phone: "+91-78386 64065" },
  { name: "Capt Sachin Bhatia", ice: "SABHATIA", phone: "+91-84689 87774" },
];

const c = COL_WIDTHS;

interface GenerateOptions {
  reportType: string;
  reportDate: string;
  records: MarketRecord[];
  resolutions?: Resolution[];
}

// ══════════════════════════════════════════════════════════════
export async function generateMarketReportPdf({ reportType, reportDate, records, resolutions }: GenerateOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, H = 297, ML = 12, MR_ = 12;
  const CW = W - ML - MR_;
  const FOOTER_H = 32;  // ~72pt — exceeds 56pt footer + 16pt buffer
  const BOT = H - FOOTER_H;
  const TABLE_MARGIN = { left: ML, right: MR_, bottom: FOOTER_H + 2 };

  const isDirty = reportType === "DPP";
  const theme = isDirty ? DPP : CPP;

  // Normalise
  const { fixtures: normFixtures, enquiries: normEnquiries } = normaliseForPdf(records, resolutions);

  // Fetch baltic routes from dedicated table
  const { data: balticData } = await supabase
    .from("baltic_routes")
    .select("*")
    .eq("report_date", reportDate)
    .order("route");
  const balticRoutes = balticData ?? [];

  // Fallback: use market_data BALTIC records if dedicated table empty
  const balticFromMd = records.filter((r) => r.record_type === "BALTIC");

  const bunkerRecords = records.filter((r) => r.record_type === "BUNKER");

  const titleText = isDirty ? "DIRTY TANKER MARKET REPORT" : "CLEAN TANKER MARKET REPORT";
  const dateStr = format(new Date(reportDate + "T00:00:00"), "d MMMM yyyy");

  // Fetch commentary
  const commentaryMap = await getCommentaryForSections(reportDate, reportType, normFixtures);

  const getFinalY = (): number => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const needPage = (y: number, need: number): number => { if (y + need > BOT) { doc.addPage(); return 15; } return y; };

  // ── HEADER ──────────────────────────────────────────────
  try { doc.addImage(logoJpg, "JPEG", ML, 2, 25, 18); } catch { /* */ }

  // Title (two lines)
  doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(...theme.accent);
  doc.text(titleText, W / 2, 10, { align: "center" });
  doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(...COMMON.grey88);
  doc.text("Market Intelligence by AQ Maritime", W / 2, 15, { align: "center" });

  // Date (two lines)
  doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(...(isDirty ? theme.accent : CPP.dark));
  doc.text(dateStr, W - MR_, 10, { align: "right" });
  doc.setFontSize(7); doc.setFont("helvetica", "italic"); doc.setTextColor(...COMMON.greyAA);
  doc.text("Issue compiled from market sources", W - MR_, 15, { align: "right" });

  // Divider
  doc.setDrawColor(...theme.accent); doc.setLineWidth(0.7);
  doc.line(0, 22, W, 22);

  let Y = 26;

  // ── Section band ────────────────────────────────────────
  const drawBand = (y: number, text: string): number => {
    y = needPage(y, 12);
    doc.setFillColor(...theme.accent);
    doc.rect(ML, y, CW, 5.6, "F");
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(...COMMON.white);
    doc.text(text, ML + 1.8, y + 3.8);
    doc.setFont("helvetica", "normal");
    return y + 6.5;
  };

  // ── Commentary line ─────────────────────────────────────
  const drawCommentary = (y: number, sectionKey: string): number => {
    const text = commentaryMap.get(sectionKey);
    if (!text) return y;
    y = needPage(y, 6);
    doc.setFillColor(...COMMON.commentBg);
    doc.rect(ML, y - 1, CW, 4.5, "F");
    doc.setDrawColor(...theme.border); doc.setLineWidth(0.15);
    doc.line(ML, y + 3.5, ML + CW, y + 3.5);
    doc.setFontSize(7.5); doc.setFont("helvetica", "italic"); doc.setTextColor(...COMMON.desc55);
    doc.text(text, ML + 1.5, y + 2);
    doc.setFont("helvetica", "normal");
    return y + 5;
  };

  // ── Fixture table (separate Load + Discharge columns) ───
  const drawFixtureTable = (y: number, fixtures: NormalisedFixture[]): number => {
    autoTable(doc, {
      startY: y,
      margin: TABLE_MARGIN,
      head: [["Charterer", "Qty", "CGO", "LC", "Load", "Discharge", "Vessel", "Rate", "Status"].slice()],
      body: fixtures.map((f) => [
        f.charterer.toUpperCase(),
        f.qty,
        f.cargo,
        f.laycan,
        f.load,
        f.discharge,
        f.vessel.toUpperCase(),
        f.demurrage ? `${f.rate} (${f.demurrage})` : f.rate,
        f.status,
      ]),
      headStyles: {
        fillColor: theme.headerBg, textColor: theme.headerTxt, fontSize: 8, fontStyle: "bold",
        cellPadding: { top: 1, bottom: 1, left: 1.8, right: 1.8 }, minCellHeight: 5,
        lineColor: theme.accent, lineWidth: { bottom: 0.35 },
      },
      bodyStyles: {
        fontSize: 8, textColor: [30, 30, 30],
        cellPadding: { top: 1, bottom: 1, left: 1.8, right: 1.8 }, minCellHeight: 5,
        overflow: "ellipsize",
      },
      alternateRowStyles: { fillColor: theme.altRow },
      tableLineColor: theme.border, tableLineWidth: 0.18,
      theme: "grid",
      columnStyles: {
        0: { fontStyle: "bold", textColor: (isDirty ? theme.accent : CPP.dark) as unknown as number[], cellWidth: c.ch },
        1: { halign: "right", cellWidth: c.qty },
        2: { halign: "center", cellWidth: c.cgo, overflow: "visible" },
        3: { halign: "center", cellWidth: c.lc },
        4: { cellWidth: c.ld },
        5: { cellWidth: c.dis },
        6: { cellWidth: c.vsl },
        7: { halign: "right", cellWidth: c.rate },
        8: { halign: "center", cellWidth: c.st, overflow: "visible" },
      } as Record<number, object>,
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const status = String(data.row.raw?.[8] ?? "");
        if (status === "FLD") {
          data.cell.styles.fillColor = theme.fldRow;
          data.cell.styles.textColor = theme.fldTxt;
          data.cell.styles.fontStyle = "bold";
        }
        if (data.column.index === 8) {
          const ss = getStatusStyle(status, theme);
          data.cell.styles.textColor = ss.color;
          data.cell.styles.fontStyle = ss.style as "bold" | "italic" | "bolditalic" | "normal";
        }
        if (data.column.index === 6) data.cell.text = [String(data.cell.raw ?? "").toUpperCase()];
        if (data.column.index === 0) {
          data.cell.text = [String(data.cell.raw ?? "").toUpperCase()];
          data.cell.styles.textColor = isDirty ? theme.accent : CPP.dark;
        }
        if (data.column.index === 7 && String(data.cell.raw ?? "").includes("(DEM")) {
          data.cell.styles.fontSize = 7;
        }
      },
    });
    return getFinalY();
  };

  // ── No-fresh message ────────────────────────────────────
  const drawNoFresh = (y: number, msg: string): number => {
    y = needPage(y, 7);
    autoTable(doc, {
      startY: y,
      margin: TABLE_MARGIN,
      body: [[{ content: msg, colSpan: 6, styles: { halign: "center", fontStyle: "italic", textColor: COMMON.grey99, fontSize: 8, cellPadding: 2, minCellHeight: 5 } }]],
      tableLineColor: theme.border, tableLineWidth: 0.18,
      theme: "grid",
    });
    return getFinalY() + 2;
  };

  // ── Enquiries table ─────────────────────────────────────
  const drawEnquiries = (y: number, enquiries: NormalisedFixture[]): number => {
    const ec = ENQ_COL_WIDTHS;
    if (enquiries.length === 0) {
      // Smaller, indented "no enquiries" message
      y = needPage(y, 6);
      doc.setFontSize(7.5); doc.setFont("helvetica", "italic"); doc.setTextColor(...COMMON.grey99);
      doc.text("No enquiries to report", ML + 6, y + 3);
      doc.setFont("helvetica", "normal");
      return y + 5;
    }

    autoTable(doc, {
      startY: y,
      margin: TABLE_MARGIN,
      head: [["Charterer", "Qty", "CGO", "LC", "Route", "Comments"].slice()],
      body: enquiries.map((e) => [
        e.charterer.toUpperCase(),
        e.qty,
        e.cargo,
        e.laycan,
        e.load && e.discharge ? `${e.load} \u2192 ${e.discharge}` : e.load || e.discharge || "",
        "",
      ]),
      headStyles: {
        fillColor: COMMON.subHdrBg, textColor: theme.headerTxt, fontSize: 8, fontStyle: "bold",
        cellPadding: { top: 1, bottom: 1, left: 1.8, right: 1.8 },
      },
      bodyStyles: {
        fontSize: 8, cellPadding: { top: 1, bottom: 1, left: 1.8, right: 1.8 },
        overflow: "ellipsize", minCellHeight: 5,
      },
      alternateRowStyles: { fillColor: theme.altRow },
      tableLineColor: theme.border, tableLineWidth: 0.18, theme: "grid",
      columnStyles: {
        0: { fontStyle: "bold", textColor: (isDirty ? theme.accent : CPP.dark) as unknown as number[], cellWidth: ec.ch },
        1: { halign: "right", cellWidth: ec.qty },
        2: { halign: "center", cellWidth: ec.cgo },
        3: { halign: "center", cellWidth: ec.lc },
        4: { cellWidth: ec.route },
        5: { fontStyle: "italic", textColor: COMMON.grey66 as unknown as number[] },
      } as Record<number, object>,
    });
    return getFinalY();
  };

  // ── BALTIC ROUTES (always shown for clean report) ───────
  if (!isDirty) {
    const bRoutes = balticRoutes.length > 0 ? balticRoutes : balticFromMd;
    Y = needPage(Y, 35);

    // Empty placeholder rows if no data
    const balticBody = bRoutes.length > 0
      ? bRoutes.map((r: Record<string, unknown>) => {
          const ws = Number(r.worldscale ?? r.world_scale ?? 0);
          const wsC = Number(r.ws_change ?? 0);
          const tc = Number(r.tc_earnings_usd ?? r.tc_earnings ?? 0);
          const tcC = Number(r.tc_change ?? 0);
          const wsStr = ws ? `W${ws.toFixed(2)}` + (wsC ? ` (${wsC > 0 ? "+" : ""}${wsC.toFixed(2)})` : "") : "";
          const tcStr = tc ? `$${tc.toLocaleString()}` + (tcC ? ` (${tcC > 0 ? "+" : ""}${tcC.toLocaleString()})` : "") : "";
          return [
            String(r.route ?? r.baltic_route ?? ""),
            String(r.description ?? r.baltic_description ?? ""),
            String(r.size_mt ?? r.baltic_size ?? ""),
            wsStr,
            tcStr,
          ];
        })
      : [["TC5", "", "", "", ""], ["TC8", "", "", "", ""], ["TC12", "", "", "", ""], ["TC17", "", "", "", ""]];

    autoTable(doc, {
      startY: Y,
      margin: TABLE_MARGIN,
      head: [["Route", "Description", "Size", "World Scale", "TC Earnings ($/day)"].slice()],
      body: balticBody,
      headStyles: {
        fillColor: CPP.headerBg, textColor: CPP.headerTxt, fontSize: 8, fontStyle: "bold",
        cellPadding: { top: 1.5, bottom: 1.5, left: 1.8, right: 1.8 },
        lineColor: CPP.accent, lineWidth: { bottom: 0.35 },
      },
      bodyStyles: {
        fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 1.8, right: 1.8 }, minCellHeight: 7,
      },
      alternateRowStyles: { fillColor: CPP.altRow },
      tableLineColor: CPP.border, tableLineWidth: 0.18, theme: "grid",
      columnStyles: {
        0: { fontStyle: "bolditalic", textColor: CPP.accent as unknown as number[], cellWidth: 18 },
        1: { fontStyle: "italic", textColor: COMMON.desc55 as unknown as number[], cellWidth: 68 },
        2: { halign: "center", textColor: COMMON.txt44 as unknown as number[], cellWidth: 24 },
        3: { fontStyle: "bold", cellWidth: 38 },
        4: { fontStyle: "bold", cellWidth: 38 },
      } as Record<number, object>,
      didParseCell: (data) => {
        if (data.section === "body" && (data.column.index === 3 || data.column.index === 4)) {
          const raw = String(data.cell.raw ?? "");
          if (raw.includes("(+")) data.cell.styles.textColor = COMMON.green;
          else if (raw.includes("(-")) data.cell.styles.textColor = COMMON.red;
          else data.cell.styles.textColor = CPP.dark;
        }
      },
    });
    Y = getFinalY() + 5;
  }

  // ── DIRTY REPORT: by segment ────────────────────────────
  if (isDirty) {
    for (const seg of DIRTY_SEGMENTS) {
      const fixtures = normFixtures.get(seg);
      if (!fixtures || fixtures.length === 0) continue;
      const sKey = `${seg} \u2013 FIXTURES`;
      Y = drawBand(Y, sKey);
      Y = drawCommentary(Y, sKey);
      Y = drawFixtureTable(Y, fixtures) + 4;
      // Enquiries for this segment
      const segEnq = normEnquiries.filter((e) => e.segment === seg);
      Y = drawEnquiries(Y, segEnq) + 3;
    }
  }

  // ── Segment sub-header (lighter bar under region band) ──
  const drawSegmentHeader = (y: number, text: string): number => {
    y = needPage(y, 8);
    doc.setFillColor(...COMMON.segBandBg);
    doc.rect(ML, y, CW, 4.8, "F");
    doc.setDrawColor(...theme.border); doc.setLineWidth(0.15);
    doc.line(ML, y + 4.8, ML + CW, y + 4.8);
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(...theme.headerTxt);
    doc.text(text, ML + 1.8, y + 3.3);
    doc.setFont("helvetica", "normal");
    return y + 5.5;
  };

  // ── CLEAN REPORT: region band → segments underneath ─────
  if (!isDirty) {
    for (const region of CLEAN_REGIONS) {
      // Check if any segment has data in this region
      let regionHasData = false;
      for (const seg of CLEAN_SEGMENTS) {
        const allFix = normFixtures.get(seg) ?? [];
        const regionFix = allFix.filter((f) => f.tradeRegion === region);
        const regionEnq = normEnquiries.filter((e) => e.segment === seg && e.tradeRegion === region);
        if (regionFix.length > 0 || regionEnq.length > 0) { regionHasData = true; break; }
      }
      if (!regionHasData) continue;

      // Region band (bold, full accent colour)
      Y = drawBand(Y, region);

      // Each segment under this region
      for (const seg of CLEAN_SEGMENTS) {
        const allFix = normFixtures.get(seg) ?? [];
        const regionFix = allFix.filter((f) => f.tradeRegion === region);
        const regionEnq = normEnquiries.filter((e) => e.segment === seg && e.tradeRegion === region);

        // Segment sub-header (always shown)
        Y = drawSegmentHeader(Y, seg);

        const sKey = `${seg} \u2013 ${region}`;
        Y = drawCommentary(Y, sKey);

        // Fixtures + Enquiries
        if (regionFix.length === 0 && regionEnq.length === 0) {
          // Single message when both empty
          Y = drawNoFresh(Y, "NOTHING FRESH TO REPORT");
        } else {
          if (regionFix.length > 0) {
            Y = drawFixtureTable(Y, regionFix) + 2;
          } else {
            Y = drawNoFresh(Y, "NO FRESH FIXTURE TO REPORT");
          }
          Y = drawEnquiries(Y, regionEnq) + 3;
        }
      }
    }

    // Other region
    let otherHasData = false;
    for (const seg of CLEAN_SEGMENTS) {
      const other = (normFixtures.get(seg) ?? []).filter((f) => f.tradeRegion === "OTHER");
      if (other.length > 0) { otherHasData = true; break; }
    }
    if (otherHasData) {
      Y = drawBand(Y, "OTHER");
      for (const seg of CLEAN_SEGMENTS) {
        const other = (normFixtures.get(seg) ?? []).filter((f) => f.tradeRegion === "OTHER");
        const otherEnq = normEnquiries.filter((e) => e.segment === seg && e.tradeRegion === "OTHER");
        Y = drawSegmentHeader(Y, seg);
        if (other.length === 0 && otherEnq.length === 0) {
          Y = drawNoFresh(Y, "NOTHING FRESH TO REPORT");
        } else {
          if (other.length > 0) {
            Y = drawFixtureTable(Y, other) + 2;
          } else {
            Y = drawNoFresh(Y, "NO FRESH FIXTURE TO REPORT");
          }
          Y = drawEnquiries(Y, otherEnq) + 3;
        }
      }
    }
  }

  // ── BUNKER PRICES ───────────────────────────────────────
  if (bunkerRecords.length > 0) {
    Y = needPage(Y, 40);
    doc.setFillColor(...theme.accent);
    doc.rect(ML, Y, CW, 5.6, "F");
    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(...COMMON.white);
    doc.text("BUNKER PRICE", W / 2, Y + 3.8, { align: "center" });
    doc.setFont("helvetica", "normal");
    Y += 6.5;

    autoTable(doc, {
      startY: Y,
      margin: TABLE_MARGIN,
      head: [["Region", "VLSFO", "+/-", "IFO 380", "+/-", "MGO", "+/-"]],
      body: bunkerRecords.map((r) => [
        r.bunker_region ?? "",
        r.vlsfo_price?.toFixed(2) ?? "",
        r.vlsfo_change != null ? (r.vlsfo_change > 0 ? "+" : "") + r.vlsfo_change.toFixed(2) : "",
        r.ifo380_price?.toFixed(2) ?? "",
        r.ifo380_change != null ? (r.ifo380_change > 0 ? "+" : "") + r.ifo380_change.toFixed(2) : "",
        r.mgo_price?.toFixed(2) ?? "",
        r.mgo_change != null ? (r.mgo_change > 0 ? "+" : "") + r.mgo_change.toFixed(2) : "",
      ]),
      headStyles: {
        fillColor: theme.headerBg, textColor: theme.headerTxt, fontSize: 8, fontStyle: "bold",
        cellPadding: { top: 1.2, bottom: 1.2, left: 1.8, right: 1.8 },
      },
      bodyStyles: { fontSize: 8, cellPadding: { top: 1.2, bottom: 1.2, left: 1.8, right: 1.8 } },
      alternateRowStyles: { fillColor: theme.altRow },
      tableLineColor: theme.border, tableLineWidth: 0.18, theme: "grid",
      columnStyles: {
        0: { fontStyle: "bold", textColor: (isDirty ? theme.accent : CPP.dark) as unknown as number[], cellWidth: 36 },
        1: { halign: "right", fontStyle: "bold", textColor: (isDirty ? theme.accent : CPP.dark) as unknown as number[], cellWidth: 25 },
        2: { halign: "right", cellWidth: 25 },
        3: { halign: "right", fontStyle: "bold", textColor: (isDirty ? theme.accent : CPP.dark) as unknown as number[], cellWidth: 25 },
        4: { halign: "right", cellWidth: 25 },
        5: { halign: "right", fontStyle: "bold", textColor: (isDirty ? theme.accent : CPP.dark) as unknown as number[], cellWidth: 25 },
        6: { halign: "right", cellWidth: 25 },
      } as Record<number, object>,
      didParseCell: (data) => {
        if (data.section === "body" && [2, 4, 6].includes(data.column.index)) {
          const val = parseFloat(String(data.cell.raw ?? "0").replace("+", ""));
          if (!isNaN(val)) {
            data.cell.styles.textColor = val > 0 ? COMMON.red : val < 0 ? COMMON.green : COMMON.grey66;
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
  }

  // ── FOOTER (every page) ─────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const fy = H - FOOTER_H;

    // Zone 1: Contact bar (light tint background)
    doc.setFillColor(...theme.headerBg);
    doc.rect(ML, fy, CW, 10, "F");

    doc.setFontSize(8); doc.setTextColor(...theme.headerTxt);
    const colW = CW / 3;
    const aligns: ("left" | "center" | "right")[] = ["left", "center", "right"];
    TEAM.forEach((t, idx) => {
      const x = idx === 0 ? ML + 2 : idx === 1 ? W / 2 : W - MR_ - 2;
      doc.setFont("helvetica", "bold");
      doc.text(`${t.name}  \u2022  ${t.ice}`, x, fy + 3.5, { align: aligns[idx] });
      doc.setFont("helvetica", "normal");
      doc.text(t.phone, x, fy + 6.5, { align: aligns[idx] });
    });

    // Zone 2: Info bar
    const z2y = fy + 11;
    doc.setFontSize(7.5); doc.setTextColor(...COMMON.desc55);
    doc.setFont("helvetica", "normal");
    doc.text("Email: chartering@aqmaritime.com  |  Please include us in your circulation.", ML + 2, z2y + 3);
    doc.text(`Page ${i} of ${totalPages}`, W - MR_ - 2, z2y + 3, { align: "right" });

    // Disclaimer
    doc.setFontSize(7); doc.setFont("helvetica", "italic"); doc.setTextColor(...COMMON.greyAA);
    doc.text("All figures details/info in good faith but without any guarantee", W / 2, z2y + 7, { align: "center" });
  }

  // ── Save ────────────────────────────────────────────────
  const safeDate = reportDate.replace(/-/g, "");
  doc.save(`AQ_Maritime_${reportType}_Report_${safeDate}.pdf`);
}
