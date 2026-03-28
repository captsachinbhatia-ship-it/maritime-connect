import jsPDF from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";
import { format } from "date-fns";
import type { MarketRecord, Resolution } from "@/services/marketData";
import { normaliseForPdf, type NormalisedFixture } from "@/lib/fixtureNormaliser";
import logoJpg from "@/assets/logo-aq-maritime.jpg";

// ── Colours (RGB tuples) ──────────────────────────────────────
const NAVY: [number, number, number]      = [27, 58, 92];    // #1B3A5C
const HEADER_BG: [number, number, number] = [232, 237, 242];  // #E8EDF2
const ALT_ROW: [number, number, number]   = [245, 247, 250];  // #F5F7FA
const WHITE: [number, number, number]     = [255, 255, 255];
const FLD_ROW: [number, number, number]   = [214, 228, 240];  // #D6E4F0
const BORDER: [number, number, number]    = [200, 212, 224];  // #C8D4E0
const AMBER: [number, number, number]     = [184, 134, 11];   // #B8860B
const GREY: [number, number, number]      = [102, 102, 102];  // #666666
const LIGHT_GREY: [number, number, number]= [153, 153, 153];  // #999999
const RED: [number, number, number]       = [204, 0, 0];      // #CC0000
const GREEN: [number, number, number]     = [0, 100, 0];      // #006400

// ── Segment order ─────────────────────────────────────────────
const DIRTY_ORDER = ["VLCC", "ULCC", "Suezmax", "Aframax", "Panamax", "LR2", "LR1", "MR"];
const CLEAN_ORDER = ["MR", "LR1", "LR2", "Aframax", "Suezmax", "VLCC"];

// ── Footer data ───────────────────────────────────────────────
const TEAM = [
  { name: "Kartik Yadav",      phone: "+91-8800265045",  ice: "KY0" },
  { name: "Shashank Mathur",   phone: "+91-78386 64065", ice: "SHMATHUR" },
  { name: "Capt Sachin Bhatia",phone: "+91-84689 87774", ice: "SABHATIA" },
];
const EMAIL = "chartering@aqmaritime.com";
const CIRCULATION = "PLEASE INCLUDE US IN YOUR CIRCULATION.";
const REGARDS = "Thanks & Regards / AQ Maritime Private Limited";
const DISCLAIMER = "ALL FIGURES DETAILS/INFO IN GOOD FAITH BUT WITHOUT ANY GUARANTEE";

// ── Interface ─────────────────────────────────────────────────
interface GenerateOptions {
  reportType: string;
  reportDate: string;
  records: MarketRecord[];
  resolutions?: Resolution[];
}

// ── Logo loader ───────────────────────────────────────────────
let logoDataUrl: string | null = null;
async function getLogoDataUrl(): Promise<string> {
  if (logoDataUrl) return logoDataUrl;
  const res = await fetch(logoJpg);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => { logoDataUrl = reader.result as string; resolve(logoDataUrl); };
    reader.readAsDataURL(blob);
  });
}

// ── Main ──────────────────────────────────────────────────────
export async function generateMarketReportPdf({ reportType, reportDate, records, resolutions }: GenerateOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();   // 210
  const H = doc.internal.pageSize.getHeight();  // 297
  const ML = 12, MR = 12, MT = 15;
  const CW = W - ML - MR;                       // content width
  const FOOTER_H = 24;
  const BOT = H - FOOTER_H;

  const balticRecords = records.filter((r) => r.record_type === "BALTIC");
  const bunkerRecords = records.filter((r) => r.record_type === "BUNKER");
  const { fixtures: normFixtures } = normaliseForPdf(records, resolutions);

  const isDirty = reportType === "DPP";
  const segOrder = isDirty ? DIRTY_ORDER : CLEAN_ORDER;
  const titleText = isDirty
    ? "DIRTY TANKER MARKET REPORT"
    : reportType === "CPP" ? "CLEAN TANKER MARKET REPORT" : `${reportType} MARKET REPORT`;
  const dateStr = format(new Date(reportDate + "T00:00:00"), "d MMMM yyyy");

  const getFinalY = (): number =>
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  const needPage = (y: number, need: number) => {
    if (y + need > BOT) { doc.addPage(); return MT; }
    return y;
  };

  // ── HEADER ────────────────────────────────────────────────
  const drawHeader = () => {
    // Logo
    try {
      doc.addImage(logoJpg, "JPEG", ML, 4, 22, 15.5); // ~32pt high
    } catch {
      doc.setFontSize(8); doc.setTextColor(...NAVY);
      doc.text("AQ MARITIME", ML, 12);
    }
    // Title
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(...NAVY);
    doc.text(titleText, W / 2, 12, { align: "center" });
    // Date
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(...NAVY);
    doc.text(dateStr, W - MR, 12, { align: "right" });
    // Divider
    doc.setDrawColor(...BORDER); doc.setLineWidth(0.18);
    doc.line(ML, 21, W - MR, 21);
  };

  drawHeader();
  let Y = 25;

  // ── SECTION BAND ──────────────────────────────────────────
  const drawSectionBand = (y: number, text: string): number => {
    y = needPage(y, 8);
    doc.setFillColor(...NAVY);
    doc.rect(ML, y, CW, 5.6, "F");
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(...WHITE);
    doc.text(text, ML + 1.5, y + 3.8);
    doc.setFont("helvetica", "normal");
    return y + 6.5;
  };

  // ── BALTIC ROUTES (Clean only, before fixtures) ───────────
  if (!isDirty && balticRecords.length > 0) {
    Y = needPage(Y, 30);
    autoTable(doc, {
      startY: Y,
      margin: { left: ML, right: MR },
      head: [["Route", "Description", "Size", "World Scale", "TC Earnings ($/day)"]],
      body: balticRecords.map((r) => [
        r.baltic_route ?? "",
        r.baltic_description ?? "",
        r.baltic_size ?? "",
        r.world_scale != null
          ? r.world_scale.toFixed(2)
          : "",
        r.tc_earnings != null
          ? `$${r.tc_earnings.toLocaleString()}`
          : "",
      ]),
      headStyles: {
        fillColor: HEADER_BG, textColor: NAVY, fontSize: 8, fontStyle: "bold",
        cellPadding: { top: 1, bottom: 1, left: 1.8, right: 1.8 },
      },
      bodyStyles: { fontSize: 8, cellPadding: { top: 1, bottom: 1, left: 1.8, right: 1.8 } },
      alternateRowStyles: { fillColor: ALT_ROW },
      tableLineColor: BORDER, tableLineWidth: 0.18,
      theme: "grid",
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 0) {
          data.cell.styles.fontStyle = "bolditalic";
          data.cell.styles.textColor = NAVY;
        }
        if (data.section === "body" && data.column.index === 1) {
          data.cell.styles.fontStyle = "italic";
          data.cell.styles.textColor = [85, 85, 85];
        }
        if (data.section === "body" && (data.column.index === 3 || data.column.index === 4)) {
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
    Y = getFinalY() + 5;
  }

  // ── FIXTURE TABLES BY SEGMENT ─────────────────────────────
  const fixtureHead = isDirty
    ? [["Charterer", "Qty", "CGO", "LC", "Load", "Discharge", "Vessel", "Rate", "Status"]]
    : [["Charterer", "Qty", "CGO", "LC", "Load", "Discharge", "Vessel", "Rate", "Status", "Comments"]];

  const colStylesDirty: Record<number, Partial<{ halign: string; fontStyle: string; cellWidth: number; textColor: number[] }>> = {
    0: { fontStyle: "bold", cellWidth: CW * 0.12 },
    1: { halign: "right", cellWidth: CW * 0.05 },
    2: { halign: "center", cellWidth: CW * 0.06 },
    3: { halign: "center", cellWidth: CW * 0.08 },
    4: { cellWidth: CW * 0.13 },
    5: { cellWidth: CW * 0.15 },
    6: { fontStyle: "italic", cellWidth: CW * 0.20 },
    7: { cellWidth: CW * 0.13 },
    8: { halign: "right", cellWidth: CW * 0.08 },
  };

  const colStylesClean: Record<number, Partial<{ halign: string; fontStyle: string; cellWidth: number; textColor: number[] }>> = {
    0: { fontStyle: "bold", cellWidth: CW * 0.12 },
    1: { halign: "right", cellWidth: CW * 0.05 },
    2: { halign: "center", cellWidth: CW * 0.06 },
    3: { halign: "center", cellWidth: CW * 0.08 },
    4: { cellWidth: CW * 0.12 },
    5: { cellWidth: CW * 0.14 },
    6: { fontStyle: "italic", cellWidth: CW * 0.18 },
    7: { cellWidth: CW * 0.10 },
    8: { halign: "right", cellWidth: CW * 0.06 },
    9: { fontStyle: "italic", textColor: [...GREY] as unknown as number[] },
  };

  const colStyles = isDirty ? colStylesDirty : colStylesClean;

  for (const seg of segOrder) {
    const fixtures = normFixtures.get(seg);
    if (!fixtures || fixtures.length === 0) continue;

    Y = drawSectionBand(Y, `${seg} — FIXTURES`);

    const body = fixtures.map((f) => {
      const row: string[] = [
        f.charterer.toUpperCase(),
        f.qty,
        f.cargo,
        f.laycan,
        f.load,
        f.discharge,
        f.vessel,
        f.rate,
        f.status,
      ];
      if (!isDirty) row.push(""); // Comments column
      return row;
    });

    autoTable(doc, {
      startY: Y,
      margin: { left: ML, right: MR },
      head: fixtureHead,
      body,
      headStyles: {
        fillColor: HEADER_BG, textColor: NAVY, fontSize: 8, fontStyle: "bold",
        cellPadding: { top: 1, bottom: 1, left: 1.8, right: 1.8 },
        minCellHeight: 5,
      },
      bodyStyles: {
        fontSize: 8, textColor: [30, 30, 30],
        cellPadding: { top: 1, bottom: 1, left: 1.8, right: 1.8 },
        minCellHeight: 5,
      },
      alternateRowStyles: { fillColor: ALT_ROW },
      tableLineColor: BORDER, tableLineWidth: 0.18,
      theme: "grid",
      columnStyles: colStyles as Record<number, object>,
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const statusIdx = isDirty ? 8 : 8;
        const status = String(data.row.raw?.[statusIdx] ?? "").toUpperCase();

        // FLD row: entire row background + bold
        if (status === "FLD") {
          data.cell.styles.fillColor = FLD_ROW;
          data.cell.styles.textColor = NAVY;
          data.cell.styles.fontStyle = "bold";
        }
        // Status cell colours
        if (data.column.index === statusIdx) {
          if (status === "SUBS") {
            data.cell.styles.textColor = AMBER;
            data.cell.styles.fontStyle = "bold";
          } else if (status === "FLD" || status === "FXD") {
            data.cell.styles.textColor = NAVY;
            data.cell.styles.fontStyle = "bold";
          } else if (status === "RNR" || status === "CORR") {
            data.cell.styles.textColor = GREY;
          } else if (status === "OLD") {
            data.cell.styles.textColor = LIGHT_GREY;
            data.cell.styles.fontStyle = "italic";
          } else if (status === "-") {
            data.cell.styles.textColor = GREY;
          }
        }
        // Charterer: uppercase bold navy
        if (data.column.index === 0) {
          data.cell.styles.textColor = NAVY;
          data.cell.text = [String(data.cell.raw ?? "").toUpperCase()];
        }
      },
    });
    Y = getFinalY() + 3;
  }

  // ── ENQUIRIES ─────────────────────────────────────────────
  const enquiryRecords = records.filter((r) => r.record_type === "ENQUIRY");
  if (enquiryRecords.length > 0) {
    Y = drawSectionBand(Y, "ENQUIRIES");
    autoTable(doc, {
      startY: Y,
      margin: { left: ML, right: MR },
      head: [["Charterer", "Qty", "CGO", "LC", "Route", "Comments"]],
      body: enquiryRecords.map((e) => [
        (e.charterer ?? "").toUpperCase(),
        e.quantity_mt ? (e.quantity_mt / 1000).toFixed(0) : "",
        e.cargo_grade ?? e.cargo_type ?? "",
        e.raw_text ?? "",
        `${e.load_port ?? ""} / ${e.discharge_port ?? ""}`,
        "",
      ]),
      headStyles: {
        fillColor: HEADER_BG, textColor: NAVY, fontSize: 8, fontStyle: "bold",
        cellPadding: { top: 1, bottom: 1, left: 1.8, right: 1.8 },
      },
      bodyStyles: { fontSize: 8, cellPadding: { top: 1, bottom: 1, left: 1.8, right: 1.8 } },
      alternateRowStyles: { fillColor: ALT_ROW },
      tableLineColor: BORDER, tableLineWidth: 0.18,
      theme: "grid",
      columnStyles: {
        0: { fontStyle: "bold", textColor: NAVY as unknown as number[] },
      } as Record<number, object>,
    });
    Y = getFinalY() + 4;
  } else {
    // "No fresh enquiry" message
    Y = drawSectionBand(Y, "ENQUIRIES");
    Y = needPage(Y, 8);
    doc.setFontSize(10); doc.setFont("helvetica", "italic"); doc.setTextColor(...GREY);
    doc.text("NO FRESH ENQUIRY TO REPORT", W / 2, Y + 3, { align: "center" });
    doc.setFont("helvetica", "normal");
    Y += 8;
  }

  // ── BUNKER PRICES ─────────────────────────────────────────
  if (bunkerRecords.length > 0) {
    Y = needPage(Y, 35);
    // Title bar
    doc.setFillColor(...NAVY);
    doc.rect(ML, Y, CW, 5.6, "F");
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(...WHITE);
    doc.text("BUNKER PRICE", W / 2, Y + 3.8, { align: "center" });
    doc.setFont("helvetica", "normal");
    Y += 6.5;

    autoTable(doc, {
      startY: Y,
      margin: { left: ML, right: MR },
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
        fillColor: HEADER_BG, textColor: NAVY, fontSize: 8, fontStyle: "bold",
        cellPadding: { top: 1, bottom: 1, left: 1.8, right: 1.8 },
      },
      bodyStyles: { fontSize: 8, cellPadding: { top: 1, bottom: 1, left: 1.8, right: 1.8 } },
      alternateRowStyles: { fillColor: ALT_ROW },
      tableLineColor: BORDER, tableLineWidth: 0.18,
      theme: "grid",
      columnStyles: {
        0: { fontStyle: "bold" },
      } as Record<number, object>,
      didParseCell: (data) => {
        if (data.section === "body" && [2, 4, 6].includes(data.column.index)) {
          const raw = String(data.cell.raw ?? "").replace("+", "");
          const val = parseFloat(raw);
          if (!isNaN(val)) {
            data.cell.styles.textColor = val > 0 ? RED : val < 0 ? GREEN : GREY;
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
  }

  // ── FOOTER (every page) ───────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const fy = H - FOOTER_H;

    // Divider
    doc.setDrawColor(...BORDER); doc.setLineWidth(0.18);
    doc.line(ML, fy, W - MR, fy);

    let ly = fy + 3;
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(60);

    // Two-column: names left, contacts right
    for (const t of TEAM) {
      doc.text(t.name, ML + 2, ly);
      doc.text(`HP-WHATSAPP: ${t.phone}  |  ICE ID: ${t.ice}`, W - MR - 2, ly, { align: "right" });
      ly += 2.8;
    }

    doc.text(`Email: ${EMAIL}`, W / 2, ly, { align: "center" });
    ly += 2.8;
    doc.setFont("helvetica", "italic");
    doc.text(CIRCULATION, W / 2, ly, { align: "center" });
    ly += 2.5;
    doc.setFont("helvetica", "normal");
    doc.text(REGARDS, W / 2, ly, { align: "center" });
    ly += 2.8;

    doc.setFontSize(7); doc.setFont("helvetica", "italic"); doc.setTextColor(130);
    doc.text(DISCLAIMER, W / 2, ly, { align: "center" });

    // Page number
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(130);
    doc.text(`Page ${i} of ${totalPages}`, W - MR, ly, { align: "right" });
  }

  // ── Save ──────────────────────────────────────────────────
  const safeDate = reportDate.replace(/-/g, "");
  doc.save(`AQ_Maritime_${reportType}_Report_${safeDate}.pdf`);
}
