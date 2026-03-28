import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { MarketRecord } from "@/services/marketData";
import { VESSEL_CLASSES } from "@/lib/marketConstants";

const SEGMENT_ORDER = [...VESSEL_CLASSES, "Other"];

const HEADER_BLUE = [41, 98, 166]; // #2962A6
const LIGHT_BLUE = [220, 235, 252]; // #DCEBFC
const GRAY_BG = [245, 245, 245];

const CONTACTS = [
  "Kartik Yadav — HP-WHATSAPP: +91-8800265045 — ICE ID: KY0",
  "Shashank Mathur — HP-WHATSAPP: +91-78386 64065 — ICE ID: SHMATHUR",
  "Capt Sachin Bhatia — HP-WHATSAPP: +91-84689 87774 — ICE ID: SABHATIA",
  "Email: chartering@aqmaritime.com",
];
const DISCLAIMER = "ALL FIGURES DETAILS/INFO IN GOOD FAITH BUT WITHOUT ANY GUARANTEE";

interface GenerateOptions {
  reportType: string; // CPP / DPP
  reportDate: string;
  records: MarketRecord[];
}

export function generateMarketReportPdf({ reportType, reportDate, records }: GenerateOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;

  const balticRecords = records.filter((r) => r.record_type === "BALTIC");
  const fixtureRecords = records.filter((r) => r.record_type === "FIXTURE");
  const enquiryRecords = records.filter((r) => r.record_type === "ENQUIRY");
  const bunkerRecords = records.filter((r) => r.record_type === "BUNKER");

  const title = reportType === "CPP"
    ? "CLEAN TANKER MARKET REPORT"
    : reportType === "DPP"
      ? "DIRTY TANKER MARKET REPORT"
      : `${reportType} MARKET REPORT`;

  const dateStr = format(new Date(reportDate + "T00:00:00"), "EEEE, d MMMM yyyy");

  // ---------- Helper: add footer to every page ----------
  const addFooter = () => {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const footerY = pageH - 18;
      doc.setDrawColor(180);
      doc.line(margin, footerY, pageW - margin, footerY);

      doc.setFontSize(6);
      doc.setTextColor(80);
      CONTACTS.forEach((c, idx) => {
        doc.text(c, pageW / 2, footerY + 3 + idx * 2.5, { align: "center" });
      });
      doc.setFontSize(5);
      doc.setTextColor(120);
      doc.text(DISCLAIMER, pageW / 2, footerY + 15, { align: "center" });
      doc.text(`Page ${i} of ${totalPages}`, pageW - margin, footerY + 15, { align: "right" });
    }
  };

  // ---------- Header ----------
  doc.setFillColor(...HEADER_BLUE);
  doc.rect(0, 0, pageW, 18, "F");
  doc.setFontSize(8);
  doc.setTextColor(255);
  doc.text("AQ MARITIME", margin, 8);
  doc.setFontSize(12);
  doc.text(title, pageW / 2, 8, { align: "center" });
  doc.setFontSize(8);
  doc.text(dateStr, pageW - margin, 8, { align: "right" });

  let startY = 24;

  // ---------- Baltic Routes ----------
  if (balticRecords.length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.text("BALTIC EXCHANGE — DIRTY/CLEAN TANKER ROUTES", margin, startY);
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
        r.tc_earnings?.toLocaleString() ?? "",
      ]),
      headStyles: { fillColor: LIGHT_BLUE as [number, number, number], textColor: [0, 0, 0], fontSize: 7, fontStyle: "bold" },
      bodyStyles: { fontSize: 6.5, cellPadding: 1.5 },
      alternateRowStyles: { fillColor: GRAY_BG as [number, number, number] },
      theme: "grid",
    });

    startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // ---------- Fixtures & Enquiries by segment ----------
  const fixturesBySegment = new Map<string, MarketRecord[]>();
  const enquiriesBySegment = new Map<string, MarketRecord[]>();

  for (const f of fixtureRecords) {
    const seg = f.vessel_class ?? "Other";
    if (!fixturesBySegment.has(seg)) fixturesBySegment.set(seg, []);
    fixturesBySegment.get(seg)!.push(f);
  }
  for (const e of enquiryRecords) {
    const seg = e.vessel_class ?? "Other";
    if (!enquiriesBySegment.has(seg)) enquiriesBySegment.set(seg, []);
    enquiriesBySegment.get(seg)!.push(e);
  }

  for (const seg of SEGMENT_ORDER) {
    const fixtures = fixturesBySegment.get(seg) ?? [];
    const enquiries = enquiriesBySegment.get(seg) ?? [];
    if (fixtures.length === 0 && enquiries.length === 0) continue;

    // Check if we need a new page
    if (startY > pageH - 50) {
      doc.addPage();
      startY = 14;
    }

    // Segment header
    doc.setFillColor(...HEADER_BLUE);
    doc.rect(margin, startY - 3, pageW - margin * 2, 6, "F");
    doc.setFontSize(8);
    doc.setTextColor(255);
    doc.text(`${seg} — FIXTURES`, margin + 2, startY + 1);
    startY += 6;

    if (fixtures.length > 0) {
      autoTable(doc, {
        startY,
        margin: { left: margin, right: margin },
        head: [["Charterer", "Qty", "Cargo", "Laycan", "Load", "Discharge", "Vessel", "Rate", "Status"]],
        body: fixtures.map((f) => [
          f.charterer ?? "",
          f.quantity_mt ? (f.quantity_mt / 1000).toFixed(0) : "",
          f.cargo_grade ?? f.cargo_type ?? "",
          f.raw_text ?? "",
          f.load_port ?? "",
          f.discharge_port ?? "",
          f.vessel_name ?? "TBN",
          f.rate_value ?? "",
          f.fixture_status ?? "",
        ]),
        headStyles: { fillColor: LIGHT_BLUE as [number, number, number], textColor: [0, 0, 0], fontSize: 6.5, fontStyle: "bold" },
        bodyStyles: { fontSize: 6, cellPadding: 1.2 },
        alternateRowStyles: { fillColor: GRAY_BG as [number, number, number] },
        theme: "grid",
      });
      startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2;
    }

    if (enquiries.length > 0) {
      // Check if we need a new page
      if (startY > pageH - 40) {
        doc.addPage();
        startY = 14;
      }

      doc.setFontSize(7);
      doc.setTextColor(80);
      doc.text(`${seg} — ENQUIRIES`, margin + 2, startY + 2);
      startY += 4;

      autoTable(doc, {
        startY,
        margin: { left: margin, right: margin },
        head: [["Charterer", "Qty", "Cargo", "Laycan", "Load", "Discharge"]],
        body: enquiries.map((e) => [
          e.charterer ?? "",
          e.quantity_mt ? (e.quantity_mt / 1000).toFixed(0) : "",
          e.cargo_grade ?? e.cargo_type ?? "",
          e.raw_text ?? "",
          e.load_port ?? "",
          e.discharge_port ?? "",
        ]),
        headStyles: { fillColor: [240, 240, 240], textColor: [60, 60, 60], fontSize: 6.5, fontStyle: "bold" },
        bodyStyles: { fontSize: 6, cellPadding: 1.2 },
        theme: "grid",
      });
      startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
    }
  }

  // ---------- Bunker Prices ----------
  if (bunkerRecords.length > 0) {
    if (startY > pageH - 40) {
      doc.addPage();
      startY = 14;
    }

    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.text("BUNKER PRICES (USD/MT)", margin, startY);
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
      headStyles: { fillColor: LIGHT_BLUE as [number, number, number], textColor: [0, 0, 0], fontSize: 7, fontStyle: "bold" },
      bodyStyles: { fontSize: 6.5, cellPadding: 1.5 },
      alternateRowStyles: { fillColor: GRAY_BG as [number, number, number] },
      theme: "grid",
    });
  }

  // ---------- Footer on all pages ----------
  addFooter();

  // ---------- Save ----------
  const safeDate = reportDate.replace(/-/g, "");
  doc.save(`AQ_Maritime_${reportType}_Report_${safeDate}.pdf`);
}
