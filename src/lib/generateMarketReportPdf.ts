import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { MarketRecord, Resolution } from "@/services/marketData";
import { normaliseForPdf, type NormalisedFixture } from "@/lib/fixtureNormaliser";
import logoJpg from "@/assets/logo-aq-maritime.jpg";

// ── Colours ───────────────────────────────────────────────────
const C = {
  navy:      [27, 58, 92]   as [number, number, number],   // #1B3A5C
  headerBg:  [232, 237, 242] as [number, number, number],  // #E8EDF2
  altRow:    [245, 247, 250] as [number, number, number],   // #F5F7FA
  white:     [255, 255, 255] as [number, number, number],
  fldRow:    [214, 228, 240] as [number, number, number],   // #D6E4F0
  border:    [200, 212, 224] as [number, number, number],   // #C8D4E0
  amber:     [184, 134, 11]  as [number, number, number],   // #B8860B
  grey66:    [102, 102, 102] as [number, number, number],
  grey88:    [136, 136, 136] as [number, number, number],
  greyAA:    [170, 170, 170] as [number, number, number],
  red:       [204, 0, 0]     as [number, number, number],   // #CC0000
  green:     [0, 100, 0]     as [number, number, number],   // #006400
  subHdrBg:  [240, 244, 248] as [number, number, number],   // #F0F4F8
  desc:      [85, 85, 85]    as [number, number, number],   // #555555
  txt44:     [68, 68, 68]    as [number, number, number],
};

// ── Status colour map ─────────────────────────────────────────
function statusStyle(s: string): { color: [number, number, number]; style: string } {
  switch (s) {
    case "FLD":  return { color: C.navy, style: "bold" };
    case "SUBS": return { color: C.amber, style: "bold" };
    case "HOLD": return { color: C.grey66, style: "normal" };
    case "RNR":  return { color: C.grey88, style: "normal" };
    case "CORR": return { color: C.grey88, style: "italic" };
    case "OLD":  return { color: C.greyAA, style: "italic" };
    case "WDRN": return { color: C.greyAA, style: "normal" };
    default:     return { color: C.greyAA, style: "normal" };
  }
}

// ── Segment order ─────────────────────────────────────────────
const DIRTY_SEGMENTS = ["VLCC", "ULCC", "Suezmax", "Aframax", "Panamax", "LR2", "LR1", "MR"];
const CLEAN_SEGMENTS = ["MR", "LR1", "LR2"];
const CLEAN_REGIONS = [
  "MEG - RSEA - INDIA",
  "SOUTHEAST-FAR EAST ASIA",
  "CROSS SINGAPORE",
  "MED-UKC-WAFR",
];

// ── Footer ────────────────────────────────────────────────────
const TEAM = [
  { name: "Kartik Yadav",       phone: "+91-8800265045",  ice: "KY0" },
  { name: "Shashank Mathur",    phone: "+91-78386 64065", ice: "SHMATHUR" },
  { name: "Capt Sachin Bhatia", phone: "+91-84689 87774", ice: "SABHATIA" },
];

// ── Interface ─────────────────────────────────────────────────
interface GenerateOptions {
  reportType: string;
  reportDate: string;
  records: MarketRecord[];
  resolutions?: Resolution[];
}

// ── Column widths (mm) ────────────────────────────────────────
const DIRTY_COLS = { ch: 28, qty: 10, cgo: 10, lc: 18, ld: 24, dis: 24, vsl: 34, rate: 22, st: 8 };
const CLEAN_COLS = { ch: 30, qty: 10, cgo: 10, lc: 18, ld: 26, dis: 26, vsl: 36, rate: 20, st: 10 };

// ══════════════════════════════════════════════════════════════
export async function generateMarketReportPdf({ reportType, reportDate, records, resolutions }: GenerateOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, H = 297, ML = 12, MR_ = 12, MT = 15;
  const CW = W - ML - MR_;
  const FOOTER_H = 24;
  const BOT = H - FOOTER_H;

  const isDirty = reportType === "DPP";
  const cols = isDirty ? DIRTY_COLS : CLEAN_COLS;

  const balticRecords = records.filter((r) => r.record_type === "BALTIC");
  const bunkerRecords = records.filter((r) => r.record_type === "BUNKER");
  const { fixtures: normFixtures, enquiries: normEnquiries } = normaliseForPdf(records, resolutions);

  const titleText = isDirty ? "DIRTY TANKER MARKET REPORT" : "CLEAN TANKER MARKET REPORT";
  const dateStr = format(new Date(reportDate + "T00:00:00"), "d MMMM yyyy");
  const getFinalY = (): number => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const needPage = (y: number, need: number): number => { if (y + need > BOT) { doc.addPage(); return MT; } return y; };

  // ── HEADER ──────────────────────────────────────────────
  const drawHeader = () => {
    try { doc.addImage(logoJpg, "JPEG", ML, 3, 24, 17); } catch { /* fallback */ }
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(...C.navy);
    doc.text(titleText, W / 2, 12, { align: "center" });
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(...C.navy);
    doc.text(dateStr, W - MR_, 12, { align: "right" });
    doc.setDrawColor(...C.border); doc.setLineWidth(0.18);
    doc.line(0, 22, W, 22);
  };

  drawHeader();
  let Y = 26;

  // ── Fixture table builder ───────────────────────────────
  const drawFixtureTable = (y: number, fixtures: NormalisedFixture[]): number => {
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: MR_ },
      head: [["Charterer", "Qty", "CGO", "LC", "Load", "Discharge", "Vessel", "Rate", "Status"]],
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
        fillColor: C.headerBg, textColor: C.navy, fontSize: 8, fontStyle: "bold",
        cellPadding: { top: 1, bottom: 1, left: 1.8, right: 1.8 }, minCellHeight: 5,
        lineColor: C.navy, lineWidth: { bottom: 0.35 },
      },
      bodyStyles: {
        fontSize: 8, textColor: [30, 30, 30],
        cellPadding: { top: 1, bottom: 1, left: 1.8, right: 1.8 }, minCellHeight: 5,
        overflow: "ellipsize",
      },
      alternateRowStyles: { fillColor: C.altRow },
      tableLineColor: C.border, tableLineWidth: 0.18,
      theme: "grid",
      columnStyles: {
        0: { fontStyle: "bold", textColor: C.navy as unknown as number[], cellWidth: cols.ch },
        1: { halign: "right", cellWidth: cols.qty },
        2: { halign: "center", cellWidth: cols.cgo },
        3: { halign: "center", cellWidth: cols.lc },
        4: { cellWidth: cols.ld },
        5: { cellWidth: cols.dis },
        6: { fontStyle: "italic", cellWidth: cols.vsl },
        7: { halign: "right", cellWidth: cols.rate },
        8: { halign: "center", cellWidth: cols.st },
      } as Record<number, object>,
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const status = String(data.row.raw?.[8] ?? "").toUpperCase();
        // FLD row: full row highlight
        if (status === "FLD") {
          data.cell.styles.fillColor = C.fldRow;
          data.cell.styles.textColor = C.navy;
          data.cell.styles.fontStyle = "bold";
        }
        // Status cell styling
        if (data.column.index === 8) {
          const ss = statusStyle(status);
          data.cell.styles.textColor = ss.color;
          data.cell.styles.fontStyle = ss.style;
        }
        // Vessel uppercase
        if (data.column.index === 6) {
          data.cell.text = [String(data.cell.raw ?? "").toUpperCase()];
        }
        // Charterer uppercase
        if (data.column.index === 0) {
          data.cell.text = [String(data.cell.raw ?? "").toUpperCase()];
          data.cell.styles.textColor = C.navy;
        }
        // Demurrage in smaller text (appended to rate)
        if (data.column.index === 7) {
          const raw = String(data.cell.raw ?? "");
          if (raw.includes("(DEM")) {
            data.cell.styles.fontSize = 7;
          }
        }
      },
    });
    return getFinalY();
  };

  // ── Section band ────────────────────────────────────────
  const drawBand = (y: number, text: string): number => {
    y = needPage(y, 10);
    doc.setFillColor(...C.navy);
    doc.rect(ML, y, CW, 5.6, "F");
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(...C.white);
    doc.text(text, ML + 1.8, y + 3.8);
    doc.setFont("helvetica", "normal");
    return y + 6.5;
  };

  // ── "No fresh" message ──────────────────────────────────
  const drawNoFresh = (y: number, msg: string): number => {
    y = needPage(y, 8);
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: MR_ },
      body: [[msg]],
      bodyStyles: { fontSize: 8, fontStyle: "italic", textColor: C.grey88, halign: "center", cellPadding: 2, minCellHeight: 4.5 },
      tableLineColor: C.border, tableLineWidth: 0.18,
      theme: "grid",
    });
    return getFinalY() + 2;
  };

  // ── Enquiries table ─────────────────────────────────────
  const drawEnquiriesTable = (y: number, enquiries: NormalisedFixture[]): number => {
    // Sub-header
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: MR_ },
      head: [["ENQUIRIES", "", "", "", "", ""]],
      body: enquiries.map((e) => [
        e.charterer.toUpperCase(),
        e.qty,
        e.cargo,
        e.laycan,
        `${e.load} / ${e.discharge}`,
        "",
      ]),
      headStyles: {
        fillColor: C.subHdrBg, textColor: C.navy, fontSize: 8, fontStyle: "bold",
        cellPadding: { top: 1, bottom: 1, left: 1.8, right: 1.8 },
      },
      bodyStyles: {
        fontSize: 8, cellPadding: { top: 1, bottom: 1, left: 1.8, right: 1.8 },
        overflow: "ellipsize", minCellHeight: 5,
      },
      alternateRowStyles: { fillColor: C.altRow },
      tableLineColor: C.border, tableLineWidth: 0.18,
      theme: "grid",
      columnStyles: {
        0: { fontStyle: "bold", textColor: C.navy as unknown as number[], cellWidth: cols.ch },
        1: { halign: "right", cellWidth: cols.qty },
        2: { halign: "center", cellWidth: cols.cgo },
        3: { halign: "center", cellWidth: cols.lc },
        4: { cellWidth: cols.ld + cols.dis }, // merged load+discharge
        5: { fontStyle: "italic", textColor: C.grey66 as unknown as number[] },
      } as Record<number, object>,
    });
    return getFinalY();
  };

  // ── BALTIC ROUTES (clean report only, at top) ───────────
  if (!isDirty && balticRecords.length > 0) {
    Y = needPage(Y, 30);
    autoTable(doc, {
      startY: Y,
      margin: { left: ML, right: MR_ },
      head: [["Route", "Description", "Size", "World Scale", "TC Earnings ($/day)"]],
      body: balticRecords.map((r) => [
        r.baltic_route ?? "",
        r.baltic_description ?? "",
        r.baltic_size ?? "",
        r.world_scale?.toFixed(2) ?? "",
        r.tc_earnings ? `$${r.tc_earnings.toLocaleString()}` : "",
      ]),
      headStyles: {
        fillColor: C.headerBg, textColor: C.navy, fontSize: 8, fontStyle: "bold",
        cellPadding: { top: 1.5, bottom: 1.5, left: 1.8, right: 1.8 },
        lineColor: C.navy, lineWidth: { bottom: 0.35 },
      },
      bodyStyles: {
        fontSize: 8, cellPadding: { top: 1.5, bottom: 1.5, left: 1.8, right: 1.8 }, minCellHeight: 6.3,
      },
      alternateRowStyles: { fillColor: C.altRow },
      tableLineColor: C.border, tableLineWidth: 0.18,
      theme: "grid",
      columnStyles: {
        0: { fontStyle: "bolditalic", textColor: C.navy as unknown as number[], cellWidth: 20 },
        1: { fontStyle: "italic", textColor: C.desc as unknown as number[], cellWidth: 72 },
        2: { halign: "center", textColor: C.txt44 as unknown as number[], cellWidth: 24 },
        3: { fontStyle: "bold", cellWidth: 36 },
        4: { fontStyle: "bold", cellWidth: 34 },
      } as Record<number, object>,
      didParseCell: (data) => {
        // Colour change portions in WS/TC columns
        if (data.section === "body" && (data.column.index === 3 || data.column.index === 4)) {
          data.cell.styles.textColor = C.navy;
        }
      },
    });
    Y = getFinalY() + 4;
  }

  // ── DIRTY REPORT: by segment ────────────────────────────
  if (isDirty) {
    for (const seg of DIRTY_SEGMENTS) {
      const fixtures = normFixtures.get(seg);
      if (!fixtures || fixtures.length === 0) continue;
      Y = drawBand(Y, `${seg} \u2014 FIXTURES`);
      Y = drawFixtureTable(Y, fixtures) + 3;
    }
    // Enquiries
    if (normEnquiries.length > 0) {
      Y = drawBand(Y, "ENQUIRIES");
      Y = drawEnquiriesTable(Y, normEnquiries) + 3;
    } else {
      Y = drawBand(Y, "ENQUIRIES");
      Y = drawNoFresh(Y, "NO FRESH ENQUIRY TO REPORT");
    }
  }

  // ── CLEAN REPORT: by region × segment ───────────────────
  if (!isDirty) {
    for (const region of CLEAN_REGIONS) {
      for (const seg of CLEAN_SEGMENTS) {
        const allFixtures = normFixtures.get(seg) ?? [];
        const regionFixtures = allFixtures.filter((f) => f.tradeRegion === region);
        const regionEnquiries = normEnquiries.filter((e) => e.segment === seg && e.tradeRegion === region);

        if (regionFixtures.length === 0 && regionEnquiries.length === 0) continue;

        Y = drawBand(Y, `${seg} \u2014 ${region}`);

        if (regionFixtures.length > 0) {
          Y = drawFixtureTable(Y, regionFixtures) + 1;
        } else {
          Y = drawNoFresh(Y, "NO FRESH FIXTURE TO REPORT");
        }

        // Enquiries for this region+segment
        if (regionEnquiries.length > 0) {
          Y = drawEnquiriesTable(Y, regionEnquiries) + 2;
        } else {
          Y = drawNoFresh(Y, "NO FRESH ENQUIRY TO REPORT");
        }

        Y += 2;
      }
    }

    // Any fixtures/enquiries not in known regions
    for (const seg of CLEAN_SEGMENTS) {
      const allFixtures = normFixtures.get(seg) ?? [];
      const other = allFixtures.filter((f) => f.tradeRegion === "OTHER");
      if (other.length > 0) {
        Y = drawBand(Y, `${seg} \u2014 OTHER`);
        Y = drawFixtureTable(Y, other) + 3;
      }
    }
  }

  // ── BUNKER PRICES ───────────────────────────────────────
  if (bunkerRecords.length > 0) {
    Y = needPage(Y, 35);
    // Title band
    doc.setFillColor(...C.navy);
    doc.rect(ML, Y, CW, 5.6, "F");
    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(...C.white);
    doc.text("BUNKER PRICE", W / 2, Y + 3.8, { align: "center" });
    doc.setFont("helvetica", "normal");
    Y += 6.5;

    autoTable(doc, {
      startY: Y,
      margin: { left: ML, right: MR_ },
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
        fillColor: C.headerBg, textColor: C.navy, fontSize: 8, fontStyle: "bold",
        cellPadding: { top: 1.2, bottom: 1.2, left: 1.8, right: 1.8 },
      },
      bodyStyles: { fontSize: 8, cellPadding: { top: 1.2, bottom: 1.2, left: 1.8, right: 1.8 } },
      alternateRowStyles: { fillColor: C.altRow },
      tableLineColor: C.border, tableLineWidth: 0.18,
      theme: "grid",
      columnStyles: {
        0: { fontStyle: "bold", textColor: C.navy as unknown as number[], cellWidth: 36 },
        1: { halign: "right", fontStyle: "bold", textColor: C.navy as unknown as number[], cellWidth: 25 },
        2: { halign: "right", cellWidth: 25 },
        3: { halign: "right", fontStyle: "bold", textColor: C.navy as unknown as number[], cellWidth: 25 },
        4: { halign: "right", cellWidth: 25 },
        5: { halign: "right", fontStyle: "bold", textColor: C.navy as unknown as number[], cellWidth: 25 },
        6: { halign: "right", cellWidth: 25 },
      } as Record<number, object>,
      didParseCell: (data) => {
        if (data.section === "body" && [2, 4, 6].includes(data.column.index)) {
          const raw = String(data.cell.raw ?? "").replace("+", "");
          const val = parseFloat(raw);
          if (!isNaN(val)) {
            data.cell.styles.textColor = val > 0 ? C.red : val < 0 ? C.green : C.grey66;
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
    doc.setDrawColor(...C.border); doc.setLineWidth(0.18);
    doc.line(ML, fy, W - MR_, fy);

    let ly = fy + 3;
    doc.setFontSize(7.5); doc.setTextColor(...C.txt44);

    for (const t of TEAM) {
      doc.setFont("helvetica", "normal");
      doc.text(t.name, ML + 2, ly);
      doc.text(`HP-WHATSAPP: ${t.phone}`, W / 2, ly, { align: "center" });
      doc.text(`ICE ID: ${t.ice}`, W - MR_ - 2, ly, { align: "right" });
      ly += 2.6;
    }

    doc.setFont("helvetica", "normal");
    doc.text(`Email: ${("chartering@aqmaritime.com")}`, W / 2, ly, { align: "center" });
    ly += 2.5;
    doc.setFont("helvetica", "italic");
    doc.text("PLEASE INCLUDE US IN YOUR CIRCULATION.", W / 2, ly, { align: "center" });
    ly += 2.3;
    doc.setFont("helvetica", "normal");
    doc.text("Thanks & Regards / AQ Maritime Private Limited", W / 2, ly, { align: "center" });
    ly += 2.5;

    doc.setFontSize(7); doc.setFont("helvetica", "italic"); doc.setTextColor(...C.grey88);
    doc.text("ALL FIGURES DETAILS/INFO IN GOOD FAITH BUT WITHOUT ANY GUARANTEE", W / 2, ly, { align: "center" });

    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...C.grey88);
    doc.text(`Page ${i} of ${totalPages}`, W - MR_, ly, { align: "right" });
  }

  // ── Save ────────────────────────────────────────────────
  const safeDate = reportDate.replace(/-/g, "");
  doc.save(`AQ_Maritime_${reportType}_Report_${safeDate}.pdf`);
}
