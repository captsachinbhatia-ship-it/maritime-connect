import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { VesselPosition } from "@/services/vesselPositions";
import logoJpg from "@/assets/logo-aq-maritime.jpg";

const ACCENT: [number, number, number] = [218, 119, 86];
const HEADER_BG: [number, number, number] = [251, 240, 236];
const HEADER_TXT: [number, number, number] = [160, 68, 42];
const ALT_ROW: [number, number, number] = [253, 248, 245];
const BORDER: [number, number, number] = [237, 203, 191];
const WHITE: [number, number, number] = [255, 255, 255];
const GREY55: [number, number, number] = [85, 85, 85];
const GREYAA: [number, number, number] = [170, 170, 170];
const SEG_BG: [number, number, number] = [245, 213, 200];

const CLASS_ORDER = ["VLCC", "Suezmax", "Aframax", "LR2", "LR1", "MR", "Handy", "Specialized", "Other"];

const TEAM = [
  { name: "Kartik Yadav", phone: "+91-8800265045" },
  { name: "Shashank Mathur", phone: "+91-78386 64065" },
  { name: "Capt Sachin Bhatia", phone: "+91-84689 87774" },
  { name: "Ishan", phone: "" },
  { name: "Muskan", phone: "" },
  { name: "Manasvi", phone: "" },
  { name: "Bhavya", phone: "" },
];

export function generatePositionPdf(positions: VesselPosition[], reportDate?: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297, H = 210, ML = 10, MR_ = 10;
  const CW = W - ML - MR_;
  const FOOTER_H = 24;
  const TABLE_MARGIN = { left: ML, right: MR_, bottom: FOOTER_H + 2 };

  const dateStr = reportDate
    ? format(new Date(reportDate + "T00:00:00"), "d MMMM yyyy")
    : format(new Date(), "d MMMM yyyy");

  const getFinalY = (): number =>
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  const needPage = (y: number, need: number): number => {
    if (y + need > H - FOOTER_H) { doc.addPage(); return 12; }
    return y;
  };

  // ── HEADER ──────────────────────────────────────────────
  try { doc.addImage(logoJpg, "JPEG", ML, 2, 22, 16); } catch { /* */ }

  doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(...ACCENT);
  doc.text("VESSEL POSITION LIST", W / 2, 9, { align: "center" });
  doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(...GREYAA);
  doc.text("Market Intelligence by AQ Maritime", W / 2, 14, { align: "center" });

  doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(...ACCENT);
  doc.text(dateStr, W - MR_, 9, { align: "right" });
  doc.setFontSize(7); doc.setFont("helvetica", "italic"); doc.setTextColor(...GREYAA);
  doc.text(`${positions.length} vessels from owner/operator lists`, W - MR_, 14, { align: "right" });

  doc.setDrawColor(...ACCENT); doc.setLineWidth(0.7);
  doc.line(0, 19, W, 19);

  let Y = 22;

  // ── Group by vessel class ──────────────────────────────
  const grouped = new Map<string, VesselPosition[]>();
  for (const p of positions) {
    const cls = p.vessel_class ?? "Other";
    if (!grouped.has(cls)) grouped.set(cls, []);
    grouped.get(cls)!.push(p);
  }

  for (const cls of CLASS_ORDER) {
    const group = grouped.get(cls);
    if (!group || group.length === 0) continue;

    // Section band
    Y = needPage(Y, 14);
    doc.setFillColor(...SEG_BG);
    doc.rect(ML, Y, CW, 5, "F");
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(...HEADER_TXT);
    doc.text(`${cls}  (${group.length})`, ML + 2, Y + 3.5);
    doc.setFont("helvetica", "normal");
    Y += 6;

    // Table
    autoTable(doc, {
      startY: Y,
      margin: TABLE_MARGIN,
      head: [["Vessel", "DWT", "Built", "Owner / Operator", "Open Port", "Region", "Open Date", "L3C", "Coating", "Status", "Source", "Comments"]],
      body: group.map((p) => [
        p.vessel_name,
        p.dwt ? p.dwt.toLocaleString() : "",
        p.built_year ? String(p.built_year) : "",
        [p.owner, p.operator].filter(Boolean).join(" / "),
        p.open_port ?? "",
        p.open_region ?? "",
        p.open_date_text ?? (p.open_date ? format(new Date(p.open_date + "T00:00:00"), "dd-MMM") : ""),
        p.cargo_history ?? "",
        p.coating ?? "",
        (p.status ?? "open").toUpperCase(),
        p.source_name ?? "",
        (p.comments ?? "").slice(0, 40),
      ]),
      headStyles: {
        fillColor: HEADER_BG, textColor: HEADER_TXT, fontSize: 7, fontStyle: "bold",
        cellPadding: { top: 1, bottom: 1, left: 1.5, right: 1.5 }, minCellHeight: 5,
        lineColor: ACCENT, lineWidth: { bottom: 0.35 },
      },
      bodyStyles: {
        fontSize: 7, textColor: [30, 30, 30],
        cellPadding: { top: 0.8, bottom: 0.8, left: 1.5, right: 1.5 }, minCellHeight: 4.5,
        overflow: "linebreak",
      },
      alternateRowStyles: { fillColor: ALT_ROW },
      tableLineColor: BORDER, tableLineWidth: 0.18,
      theme: "grid",
      columnStyles: {
        0: { fontStyle: "bold", textColor: ACCENT as unknown as number[], cellWidth: 30 },
        1: { halign: "right", cellWidth: 16 },
        2: { halign: "center", cellWidth: 12 },
        3: { cellWidth: 38 },
        4: { cellWidth: 24 },
        5: { cellWidth: 18 },
        6: { halign: "center", cellWidth: 18 },
        7: { halign: "center", cellWidth: 22, overflow: "linebreak" },
        8: { cellWidth: 18 },
        9: { halign: "center", cellWidth: 14 },
        10: { cellWidth: 24, textColor: GREY55 as unknown as number[] },
        11: { cellWidth: 38, fontStyle: "italic", textColor: GREYAA as unknown as number[] },
      } as Record<number, object>,
      didParseCell: (data) => {
        if (data.section !== "body") return;
        if (data.column.index === 9) {
          const s = String(data.cell.raw ?? "").toUpperCase();
          if (s === "OPEN") { data.cell.styles.textColor = [45, 122, 45]; data.cell.styles.fontStyle = "bold"; }
          else if (s === "ON_SUBS") { data.cell.styles.textColor = [184, 134, 11]; data.cell.styles.fontStyle = "bold"; }
          else if (s === "FIXED") { data.cell.styles.textColor = [0, 100, 200]; data.cell.styles.fontStyle = "bold"; }
          else if (s === "BALLASTING") { data.cell.styles.textColor = [200, 120, 0]; }
        }
      },
    });
    Y = getFinalY() + 4;
  }

  // ── FOOTER (every page) ─────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const fy = H - FOOTER_H;

    // Team grid (4 columns)
    doc.setFillColor(...HEADER_BG);
    doc.rect(ML, fy, CW, 8, "F");
    doc.setFontSize(7); doc.setTextColor(...HEADER_TXT);

    const colW = CW / 4;
    TEAM.forEach((t, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const x = ML + col * colW + 2;
      const y = fy + 3 + row * 4;
      doc.setFont("helvetica", "bold");
      doc.text(t.phone ? `${t.name} | ${t.phone}` : t.name, x, y);
    });

    // Info bar
    const z2y = fy + 9;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7); doc.setTextColor(...GREY55);
    doc.text("chartering@aqmaritime.com | Please include us in your circulation", ML + 2, z2y + 3);
    doc.text(`Page ${i} of ${totalPages}`, W - MR_ - 2, z2y + 3, { align: "right" });

    // Disclaimer
    doc.setFontSize(6.5); doc.setFont("helvetica", "italic"); doc.setTextColor(...GREYAA);
    doc.text("All figures/details provided in good faith without guarantee", W / 2, z2y + 7, { align: "center" });
  }

  // ── Save ────────────────────────────────────────────────
  const safeDate = (reportDate ?? new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  doc.save(`AQ_Maritime_Position_List_${safeDate}.pdf`);
}
