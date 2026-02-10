import { useState, useMemo } from "react";
import { useFilters } from "@/hooks/useFilters";
import { MONTHS, REPORT_TYPE_LABELS, ReportType, CHART_COLORS } from "@/types/dashboard";
import { getSelectedMonthCases, getYearAPI, computeCompleteness, computeAggregateAPI } from "@/lib/computations";
import { exportPDF, exportExcel } from "@/lib/exports";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FileText, FileSpreadsheet } from "lucide-react";

export function SummaryTab() {
  const { filters, filteredVillages } = useFilters();
  const [reportType, setReportType] = useState<ReportType>("monthly_upazila");
  const [sections, setSections] = useState({ kpis: true, trend: true, hotspot: true, completeness: true, definitions: true });

  const toggleSection = (key: keyof typeof sections) => setSections((p) => ({ ...p, [key]: !p[key] }));

  const filtersText = `District: ${filters.districts.join(", ") || "All"} | Upazila: ${filters.upazilas.join(", ") || "All"} | Year: ${filters.year} | ${MONTHS[filters.monthStart]}–${MONTHS[filters.monthEnd]}`;

  const totalCases = filteredVillages.reduce((s, v) => s + getSelectedMonthCases(v, filters.year, filters.monthStart, filters.monthEnd), 0);
  const api = computeAggregateAPI(filteredVillages, filters.year, filters.monthStart, filters.monthEnd);
  const completeness = filters.year === 2026 ? computeCompleteness(filteredVillages, filters.monthStart, filters.monthEnd) : 100;

  const kpis = [
    { label: "Villages", value: String(filteredVillages.length) },
    { label: "Total Cases", value: totalCases.toLocaleString() },
    { label: "Aggregate API", value: api.toFixed(2) },
    { label: "Completeness", value: `${completeness.toFixed(1)}%` },
  ];

  const tableData = useMemo(() => {
    const sorted = [...filteredVillages]
      .map((v) => ({ ...v, selCases: getSelectedMonthCases(v, filters.year, filters.monthStart, filters.monthEnd) }))
      .sort((a, b) => b.selCases - a.selCases);

    if (reportType === "monthly_upazila") {
      const byUpazila: Record<string, { cases: number; pop: number; villages: number }> = {};
      for (const v of sorted) {
        if (!byUpazila[v.upazila]) byUpazila[v.upazila] = { cases: 0, pop: 0, villages: 0 };
        byUpazila[v.upazila].cases += v.selCases;
        byUpazila[v.upazila].pop += v.population;
        byUpazila[v.upazila].villages++;
      }
      return Object.entries(byUpazila).map(([name, d]) => ({ name, cases: d.cases, pop: d.pop, api: d.pop > 0 ? ((d.cases / d.pop) * 1000).toFixed(1) : "0", villages: d.villages }));
    }
    if (reportType === "union_table") {
      const byUnion: Record<string, { upazila: string; cases: number; pop: number; villages: number }> = {};
      for (const v of sorted) {
        const key = `${v.upazila}-${v.union}`;
        if (!byUnion[key]) byUnion[key] = { upazila: v.upazila, cases: 0, pop: 0, villages: 0 };
        byUnion[key].cases += v.selCases;
        byUnion[key].pop += v.population;
        byUnion[key].villages++;
      }
      return Object.entries(byUnion).map(([key, d]) => ({ name: key, upazila: d.upazila, cases: d.cases, api: d.pop > 0 ? ((d.cases / d.pop) * 1000).toFixed(1) : "0", villages: d.villages }));
    }
    return sorted.slice(0, 20).map((v) => ({ name: v.village_name_en, code: v.village_code, upazila: v.upazila, cases: v.selCases, api: getYearAPI(v, filters.year).toFixed(1), pop: v.population }));
  }, [filteredVillages, filters, reportType]);

  const chartData = useMemo(() => {
    if (reportType === "monthly_upazila" || reportType === "district_snapshot") {
      const byUpazila: Record<string, number> = {};
      for (const v of filteredVillages) {
        byUpazila[v.upazila] = (byUpazila[v.upazila] || 0) + getSelectedMonthCases(v, filters.year, filters.monthStart, filters.monthEnd);
      }
      return Object.entries(byUpazila).map(([name, cases]) => ({ name, cases })).sort((a, b) => b.cases - a.cases);
    }
    return tableData.slice(0, 10).map((r: any) => ({ name: r.name || r.code, cases: r.cases }));
  }, [filteredVillages, filters, reportType, tableData]);

  const handlePDF = () => exportPDF(REPORT_TYPE_LABELS[reportType], filtersText, kpis, filteredVillages, filters);
  const handleExcel = () => exportExcel(REPORT_TYPE_LABELS[reportType], filtersText, kpis, filteredVillages, filters);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Report Builder sidebar */}
      <div className="panel lg:col-span-1">
        <div className="panel-header"><span className="panel-title">Report Builder</span></div>
        <div className="panel-body space-y-4">
          <div>
            <div className="filter-label">Report Type</div>
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {Object.entries(REPORT_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="filter-label mb-2">Sections</div>
            <div className="space-y-2">
              {([["kpis", "Executive KPIs"], ["trend", "Trend Chart"], ["hotspot", "Hotspot Table"], ["completeness", "Completeness Summary"], ["definitions", "Methods/Definitions"]] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox checked={sections[key]} onCheckedChange={() => toggleSection(key)} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2 pt-2 border-t border-border">
            <Button size="sm" className="w-full text-xs h-8" onClick={handlePDF}><FileText className="h-3 w-3 mr-1" />Download PDF</Button>
            <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={handleExcel}><FileSpreadsheet className="h-3 w-3 mr-1" />Download Excel</Button>
          </div>
        </div>
      </div>

      {/* Report Preview */}
      <div className="lg:col-span-3 report-preview" id="report-preview">
        <div className="report-header">
          <h2 className="text-base font-semibold">{REPORT_TYPE_LABELS[reportType]}</h2>
          <p className="text-[10px] text-muted-foreground mt-1">{filtersText}</p>
          <p className="text-[10px] text-muted-foreground">Generated: {new Date().toLocaleString()}</p>
        </div>

        <div className="report-body">
          {sections.kpis && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {kpis.map((k) => (
                <div key={k.label} className="kpi-card">
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-value text-lg">{k.value}</div>
                </div>
              ))}
            </div>
          )}

          {sections.trend && (
            <div>
              <h3 className="text-xs font-semibold mb-2">Cases by Upazila / Group</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ fontSize: 10 }} />
                  <Bar dataKey="cases" fill={CHART_COLORS.accent} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {sections.hotspot && (
            <div>
              <h3 className="text-xs font-semibold mb-2">Data Table</h3>
              <div className="overflow-x-auto border border-border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(tableData[0] || {}).map((k) => <TableHead key={k} className="text-[10px]">{k}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.slice(0, 15).map((row: any, i: number) => (
                      <TableRow key={i}>
                        {Object.values(row).map((v: any, j: number) => <TableCell key={j} className="text-[11px] py-1">{String(v)}</TableCell>)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {tableData.length > 15 && <p className="text-[10px] text-muted-foreground mt-1">Showing 15 of {tableData.length} rows</p>}
            </div>
          )}

          {sections.completeness && (
            <div className="text-xs">
              <h3 className="font-semibold mb-1">Completeness Summary</h3>
              <p>Reporting completeness for {MONTHS[filters.monthStart]}–{MONTHS[filters.monthEnd]} {filters.year}: <strong>{completeness.toFixed(1)}%</strong></p>
              <p className="text-muted-foreground">Based on {filteredVillages.length} villages in selected filters.</p>
            </div>
          )}
        </div>

        {sections.definitions && (
          <div className="report-footer space-y-1">
            <p className="font-semibold">Definitions</p>
            <p>API (Annual Parasite Incidence) = (Total confirmed cases / Population) × 1000</p>
            <p>Reporting Completeness = % of selected villages with non-null case values for the selected month(s)</p>
            <p>Spike Alert = Monthly cases ≥ 2× previous month AND previous month ≥ 3</p>
            <p>High API Alert = API ≥ 10 for the selected year</p>
          </div>
        )}
      </div>
    </div>
  );
}
