import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { MarketRecord } from "@/services/marketData";
import { normaliseForPdf } from "@/lib/fixtureNormaliser";

const SEGMENT_ORDER = ["VLCC", "ULCC", "Suezmax", "Aframax", "Panamax", "LR2", "LR1", "MR", "Handy", "Chemical", "VLGC"];

const HEADER_BLUE: [number, number, number] = [41, 98, 166];
const LIGHT_GRAY: [number, number, number] = [240, 240, 240];
const ALT_ROW: [number, number, number] = [248, 248, 248];
const WHITE: [number, number, number] = [255, 255, 255];
const STATUS_COLORS: Record<string, [number, number, number]> = {
  FLD: [34, 139, 34],   // green
  SUBS: [200, 150, 0],  // amber
  WDRN: [180, 80, 80],  // red-ish
};

const CONTACTS = [
  "Kartik Yadav — HP-WHATSAPP: +91-8800265045 — ICE ID: KY0",
  "Shashank Mathur — HP-WHATSAPP: +91-78386 64065 — ICE ID: SHMATHUR",
  "Capt Sachin Bhatia — HP-WHATSAPP: +91-84689 87774 — ICE ID: SABHATIA",
  "Email: chartering@aqmaritime.com",
];
const DISCLAIMER = "ALL FIGURES DETAILS/INFO IN GOOD FAITH BUT WITHOUT ANY GUARANTEE";

interface GenerateOptions {
  reportType: string;
  reportDate: string;
  records: MarketRecord[];
}

export function generateMarketReportPdf({ reportType, reportDate, records }: GenerateOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentBottom = pageH - 22; // reserve space for footer

  const balticRecords = records.filter((r) => r.record_type === "BALTIC");
  const bunkerRecords = records.filter((r) => r.record_type === "BUNKER");

  // Normalise fixtures (dedup, rate resolution, alias application)
  const { fixtures: normFixtures } = normaliseForPdf(records);

  const title = reportType === "CPP"
    ? "AQ MARITIME CLEAN TANKER MARKET REPORT"
    : reportType === "DPP"
      ? "AQ MARITIME DIRTY TANKER MARKET REPORT"
      : `AQ MARITIME ${reportType} MARKET REPORT`;

  const dateStr = format(new Date(reportDate + "T00:00:00"), "EEEE, d MMMM yyyy");

  // ---------- Footer on all pages ----------
  const addFooter = () => {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const y = pageH - 20;
      doc.setDrawColor(200);
      doc.line(margin, y, pageW - margin, y);
      doc.setFontSize(5.5);
      doc.setTextColor(80);
      CONTACTS.forEach((c, idx) => {
        doc.text(c, pageW / 2, y + 2.5 + idx * 2.3, { align: "center" });
      });
      doc.setFontSize(4.5);
      doc.setTextColor(130);
      doc.text(DISCLAIMER, pageW / 2, y + 14, { align: "center" });
      doc.text(`Page ${i} of ${totalPages}`, pageW - margin, y + 14, { align: "right" });
    }
  };

  // ---------- Header ----------
  doc.setFillColor(...HEADER_BLUE);
  doc.rect(0, 0, pageW, 16, "F");
  doc.setFontSize(7);
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.text("AQ MARITIME", margin + 1, 7);
  doc.setFontSize(11);
  doc.text(title, pageW / 2, 7, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(dateStr, pageW - margin - 1, 7, { align: "right" });
  // Thin divider
  doc.setDrawColor(180);
  doc.line(0, 16.5, pageW, 16.5);

  let startY = 20;

  // ---------- Helper: get finalY from autoTable ----------
  const getFinalY = (): number =>
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // ---------- Baltic Routes ----------
  if (balticRecords.length > 0) {
    doc.setFontSize(8);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("BALTIC EXCHANGE — TANKER ROUTES", margin, startY);
    doc.setFont("helvetica", "normal");
    startY += 2;

    autoTable(doc, {
      startY,
      margin: { left: margin, right: margin },
      head: [["Route", "Description", "Size", "World Scale", "TC Earnings ($/day)"]],
      body: balticRecords.map((r) => [
        r.baltic_route ?? "",
        r.baltic_description ?? "",
        r.baltic_size ?? "",
        r.world_scale?.toFixed(2) ?? "",
        r.tc_earnings ? `$${r.tc_earnings.toLocaleString()}` : "",
      ]),
      headStyles: { fillColor: LIGHT_GRAY, textColor: [0, 0, 0], fontSize: 6, fontStyle: "bold", cellPadding: 1.2 },
      bodyStyles: { fontSize: 5.5, cellPadding: 1 },
      alternateRowStyles: { fillColor: ALT_ROW },
      theme: "grid",
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0.1,
    });
    startY = getFinalY() + 5;
  }

  // ---------- Fixtures by segment ----------
  for (const seg of SEGMENT_ORDER) {
    const fixtures = normFixtures.get(seg);
    if (!fixtures || fixtures.length === 0) continue;

    // New page if not enough room
    if (startY > contentBottom - 20) {
      doc.addPage();
      startY = 12;
    }

    // Segment header band
    doc.setFillColor(230, 230, 230);
    doc.rect(margin, startY - 2.5, pageW - margin * 2, 5.5, "F");
    doc.setFontSize(7);
    doc.setTextColor(30);
    doc.setFont("helvetica", "bold");
    doc.text(`${seg} — FIXTURES`, margin + 2, startY + 1);
    doc.setFont("helvetica", "normal");
    startY += 5;

    autoTable(doc, {
      startY,
      margin: { left: margin, right: margin },
      head: [["Charterer", "Qty", "Cargo", "Laycan", "Load", "Discharge", "Vessel", "Rate", "Status"]],
      body: fixtures.map((f) => [
        f.charterer,
        f.qty,
        f.cargo,
        f.laycan,
        f.load,
        f.discharge,
        f.vessel,
        f.rate,
        f.status,
      ]),
      headStyles: {
        fillColor: LIGHT_GRAY,
        textColor: [0, 0, 0],
        fontSize: 5.5,
        fontStyle: "bold",
        cellPadding: 1,
      },
      bodyStyles: { fontSize: 5.5, cellPadding: 1 },
      alternateRowStyles: { fillColor: ALT_ROW },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 22 }, // Charterer
        1: { halign: "right", cellWidth: 10 },   // Qty
        2: { cellWidth: 14 },                     // Cargo
        3: { cellWidth: 18 },                     // Laycan
        4: { cellWidth: 22 },                     // Load
        5: { cellWidth: 22 },                     // Discharge
        6: { cellWidth: 28 },                     // Vessel
        7: { cellWidth: 20 },                     // Rate
        8: { halign: "right", cellWidth: 12 },    // Status
      },
      didParseCell: (data) => {
        // Color-code status column
        if (data.section === "body" && data.column.index === 8) {
          const val = String(data.cell.raw ?? "").toUpperCase();
          const color = STATUS_COLORS[val];
          if (color) {
            data.cell.styles.textColor = color;
            data.cell.styles.fontStyle = "bold";
          } else {
            data.cell.styles.textColor = [160, 160, 160];
          }
        }
        // Uppercase charterer
        if (data.section === "body" && data.column.index === 0) {
          data.cell.text = [String(data.cell.raw ?? "").toUpperCase()];
        }
      },
      theme: "grid",
      tableLineColor: [210, 210, 210],
      tableLineWidth: 0.1,
    });
    startY = getFinalY() + 4;
  }

  // ---------- Bunker Prices ----------
  if (bunkerRecords.length > 0) {
    if (startY > contentBottom - 25) {
      doc.addPage();
      startY = 12;
    }

    doc.setFontSize(8);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("BUNKER PRICES (USD/MT)", margin, startY);
    doc.setFont("helvetica", "normal");
    startY += 2;

    autoTable(doc, {
      startY,
      margin: { left: margin, right: margin },
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
      headStyles: { fillColor: LIGHT_GRAY, textColor: [0, 0, 0], fontSize: 6, fontStyle: "bold", cellPadding: 1.2 },
      bodyStyles: { fontSize: 5.5, cellPadding: 1 },
      alternateRowStyles: { fillColor: ALT_ROW },
      didParseCell: (data) => {
        // Color-code +/- columns
        if (data.section === "body" && [2, 4, 6].includes(data.column.index)) {
          const val = parseFloat(String(data.cell.raw ?? "0").replace("+", ""));
          if (val > 0) data.cell.styles.textColor = [180, 40, 40];
          else if (val < 0) data.cell.styles.textColor = [34, 139, 34];
        }
      },
      theme: "grid",
      tableLineColor: [210, 210, 210],
      tableLineWidth: 0.1,
    });
  }

  // ---------- Footer ----------
  addFooter();

  // ---------- Save ----------
  const safeDate = reportDate.replace(/-/g, "");
  doc.save(`AQ_Maritime_${reportType}_Report_${safeDate}.pdf`);
}
