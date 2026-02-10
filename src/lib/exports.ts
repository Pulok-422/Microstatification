import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { ComputedVillage, Filters, MONTHS } from "@/types/dashboard";
import { getYearCases, getYearAPI, getSelectedMonthCases } from "./computations";

interface KPI {
  label: string;
  value: string;
}

export function exportPDF(
  title: string,
  filtersText: string,
  kpis: KPI[],
  villages: ComputedVillage[],
  filters: Filters
) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Filters: ${filtersText}`, 14, 28);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);
  doc.setTextColor(0);

  let y = 44;
  doc.setFontSize(11);
  doc.text("Key Performance Indicators", 14, y);
  y += 7;
  doc.setFontSize(9);
  for (const kpi of kpis) {
    doc.text(`${kpi.label}: ${kpi.value}`, 14, y);
    y += 5;
  }
  y += 4;

  const columns = ["Village Code", "Village", "Upazila", "Union", "Pop.", "Cases", "API", "Distance"];
  const top = villages.slice(0, 50);
  const body = top.map((v) => [
    v.village_code,
    v.village_name_en,
    v.upazila,
    v.union,
    String(v.population),
    String(getSelectedMonthCases(v, filters.year, filters.monthStart, filters.monthEnd)),
    getYearAPI(v, filters.year).toFixed(1),
    String(v.distance_km),
  ]);

  autoTable(doc, {
    head: [columns],
    body,
    startY: y,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [31, 45, 61] },
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? y + 20;
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text("Definitions:", 14, finalY + 8);
  doc.text("API = (Total confirmed cases / Population) × 1000", 14, finalY + 12);
  doc.text("Completeness = % of selected villages with non-null values for selected month(s)", 14, finalY + 16);
  doc.text("Spike Alert: month cases ≥ 2× previous month AND previous ≥ 3", 14, finalY + 20);

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 10);
  }

  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
}

export function exportExcel(
  title: string,
  filtersText: string,
  kpis: KPI[],
  villages: ComputedVillage[],
  filters: Filters
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryRows = [
    [title],
    [`Generated: ${new Date().toLocaleString()}`],
    [`Filters: ${filtersText}`],
    [],
    ["Key Performance Indicators"],
    ...kpis.map((k) => [k.label, k.value]),
    [],
    ["Top Villages by Cases"],
    ["Code", "Village", "Upazila", "Union", "Population", "Cases", "API"],
    ...villages
      .sort((a, b) => getYearCases(b, filters.year) - getYearCases(a, filters.year))
      .slice(0, 20)
      .map((v) => [
        v.village_code,
        v.village_name_en,
        v.upazila,
        v.union,
        v.population,
        getSelectedMonthCases(v, filters.year, filters.monthStart, filters.monthEnd),
        Number(getYearAPI(v, filters.year).toFixed(1)),
      ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Summary");

  // Sheet 2: Filtered Data
  const rows = villages.map((v) => ({
    village_code: v.village_code,
    village_name_en: v.village_name_en,
    village_name_bn: v.village_name_bn,
    district: v.district,
    upazila: v.upazila,
    union: v.union,
    ward_no: v.ward_no,
    population: v.population,
    designation: v.designation,
    sk_shw_name: v.sk_shw_name,
    ss_name: v.ss_name,
    service_point: v.service_point,
    distance_km: v.distance_km,
    border_country: v.border_country,
    llin_2026: v.active_llin_2026,
    llin_2025: v.active_llin_2025,
    llin_2024: v.active_llin_2024,
    ...Object.fromEntries(MONTHS.map((m, i) => [`cases_2026_${m}`, v.cases_monthly_2026[i]])),
    cases_2026_total: v.cases_2026_total,
    cases_2025_total: v.cases_2025_total,
    cases_2024_total: v.cases_2024_total,
    api_2026: Number(v.api_2026.toFixed(2)),
    api_2025: Number(v.api_2025.toFixed(2)),
    api_2024: Number(v.api_2024.toFixed(2)),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Filtered_Data");

  // Sheet 3: Metadata
  const meta = [
    ["Report Title", title],
    ["Generation Date", new Date().toLocaleString()],
    ["Filters Applied", filtersText],
    ["Year", filters.year],
    ["Month Range", `${MONTHS[filters.monthStart]} - ${MONTHS[filters.monthEnd]}`],
    ["Total Rows", villages.length],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(meta), "Metadata");

  XLSX.writeFile(wb, `${title.replace(/\s+/g, "_")}.xlsx`);
}
