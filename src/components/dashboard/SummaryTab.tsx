import { useState, useMemo } from "react";
import { useFilters } from "@/hooks/useFilters";
import { MONTHS, REPORT_TYPE_LABELS, ReportType, CHART_COLORS } from "@/types/dashboard";
import { getSelectedMonthCases, computeCompleteness, computeAggregateAPI } from "@/lib/computations";
import { exportPDF, exportExcel } from "@/lib/exports";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FileText, FileSpreadsheet, BarChart3 } from "lucide-react";

type SectionKey = "kpis" | "insights" | "chart" | "table" | "completeness" | "definitions";
type ChartMetric = "cases" | "api";

type Column = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  format?: (v: any) => string;
};

function num(x: any, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function fmtInt(x: any) {
  return num(x, 0).toLocaleString();
}

function fmt1(x: any) {
  const n = num(x, 0);
  return n.toFixed(1);
}

function safeAPI(cases: number, pop: number) {
  if (!pop || pop <= 0) return 0;
  return (cases / pop) * 1000;
}

function titleFor(reportType: ReportType, metric: ChartMetric) {
  const metricLabel = metric === "cases" ? "Cases" : "API";
  if (reportType === "monthly_upazila" || reportType === "district_snapshot") return `${metricLabel} by Upazila`;
  if (reportType === "union_table") return `${metricLabel} by Union`;
  return `${metricLabel} by Village`;
}

function groupLabelFor(reportType: ReportType) {
  if (reportType === "monthly_upazila" || reportType === "district_snapshot") return "Upazila";
  if (reportType === "union_table") return "Union";
  return "Village";
}

export function SummaryTab() {
  const { filters, filteredVillages } = useFilters();

  const [reportType, setReportType] = useState<ReportType>("monthly_upazila");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("cases");
  const [rowLimit, setRowLimit] = useState<number>(15);

  const [sections, setSections] = useState<Record<SectionKey, boolean>>({
    kpis: true,
    insights: true,
    chart: true,
    table: true,
    completeness: true,
    definitions: true,
  });

  const toggleSection = (key: SectionKey) => setSections((p) => ({ ...p, [key]: !p[key] }));

  const filtersText = useMemo(() => {
    const d = filters.districts.join(", ") || "All";
    const u = filters.upazilas.join(", ") || "All";
    const un = filters.unions.join(", ") || "All";
    return `District: ${d} | Upazila: ${u} | Union: ${un} | Year: ${filters.year} | ${MONTHS[filters.monthStart]}–${MONTHS[filters.monthEnd]}`;
  }, [filters]);

  const totalCases = useMemo(() => {
    return filteredVillages.reduce(
      (s, v) => s + getSelectedMonthCases(v, filters.year, filters.monthStart, filters.monthEnd),
      0
    );
  }, [filteredVillages, filters.year, filters.monthStart, filters.monthEnd]);

  const aggregateAPI = useMemo(() => {
    return computeAggregateAPI(filteredVillages, filters.year, filters.monthStart, filters.monthEnd);
  }, [filteredVillages, filters.year, filters.monthStart, filters.monthEnd]);

  const completeness = useMemo(() => {
    // Only meaningful when monthly data exists (your app currently treats 2026 as monthly)
    return filters.year === 2026 ? computeCompleteness(filteredVillages, filters.monthStart, filters.monthEnd) : null;
  }, [filteredVillages, filters.year, filters.monthStart, filters.monthEnd]);

  const kpis = useMemo(
    () => [
      { label: "Villages Included", value: fmtInt(filteredVillages.length) },
      { label: "Total Cases", value: fmtInt(totalCases) },
      { label: "Aggregate API", value: aggregateAPI.toFixed(2) },
      {
        label: "Reporting Completeness",
        value: completeness === null ? "N/A" : `${completeness.toFixed(1)}%`,
      },
    ],
    [filteredVillages.length, totalCases, aggregateAPI, completeness]
  );

  // Build a unified “rows” dataset per reportType (with consistent keys)
  const rows = useMemo(() => {
    const base = [...filteredVillages].map((v: any) => {
      const selCases = getSelectedMonthCases(v, filters.year, filters.monthStart, filters.monthEnd);
      const pop = num(v.population, 0);
      return { ...v, selCases, pop, selAPI: safeAPI(selCases, pop) };
    });

    base.sort((a, b) => b.selCases - a.selCases);

    if (reportType === "monthly_upazila" || reportType === "district_snapshot") {
      const byUpazila: Record<string, { cases: number; pop: number; villages: number }> = {};
      for (const v of base) {
        const key = v.upazila || "Unknown";
        if (!byUpazila[key]) byUpazila[key] = { cases: 0, pop: 0, villages: 0 };
        byUpazila[key].cases += v.selCases;
        byUpazila[key].pop += v.pop;
        byUpazila[key].villages += 1;
      }
      return Object.entries(byUpazila)
        .map(([name, d]) => ({
          group: name,
          villages: d.villages,
          cases: d.cases,
          population: d.pop,
          api: safeAPI(d.cases, d.pop),
        }))
        .sort((a, b) => b.cases - a.cases);
    }

    if (reportType === "union_table") {
      const byUnion: Record<string, { upazila: string; union: string; cases: number; pop: number; villages: number }> =
        {};
      for (const v of base) {
        const up = v.upazila || "Unknown";
        const un = v.union || "Unknown";
        const key = `${up} • ${un}`;
        if (!byUnion[key]) byUnion[key] = { upazila: up, union: un, cases: 0, pop: 0, villages: 0 };
        byUnion[key].cases += v.selCases;
        byUnion[key].pop += v.pop;
        byUnion[key].villages += 1;
      }
      return Object.entries(byUnion)
        .map(([k, d]) => ({
          group: k,
          upazila: d.upazila,
          union: d.union,
          villages: d.villages,
          cases: d.cases,
          population: d.pop,
          api: safeAPI(d.cases, d.pop),
        }))
        .sort((a, b) => b.cases - a.cases);
    }

    // Village list (top by selected cases)
    return base.map((v) => ({
      group: `${v.village_code} • ${v.village_name_en || ""}`.trim(),
      village_code: v.village_code,
      village_name_en: v.village_name_en,
      upazila: v.upazila,
      union: v.union,
      cases: v.selCases,
      population: v.pop,
      api: v.selAPI,
    }));
  }, [filteredVillages, filters.year, filters.monthStart, filters.monthEnd, reportType]);

  // Chart data derived from rows
  const chartData = useMemo(() => {
    const top = rows.slice(0, 12); // keep chart readable
    return top.map((r: any) => ({
      name: r.group,
      cases: num(r.cases, 0),
      api: num(r.api, 0),
    }));
  }, [rows]);

  const columns = useMemo<Column[]>(() => {
    if (reportType === "monthly_upazila" || reportType === "district_snapshot") {
      return [
        { key: "group", label: "Upazila" },
        { key: "villages", label: "Villages", align: "right", format: fmtInt },
        { key: "cases", label: "Cases", align: "right", format: fmtInt },
        { key: "population", label: "Population", align: "right", format: fmtInt },
        { key: "api", label: "API", align: "right", format: fmt1 },
      ];
    }
    if (reportType === "union_table") {
      return [
        { key: "group", label: "Upazila • Union" },
        { key: "villages", label: "Villages", align: "right", format: fmtInt },
        { key: "cases", label: "Cases", align: "right", format: fmtInt },
        { key: "population", label: "Population", align: "right", format: fmtInt },
        { key: "api", label: "API", align: "right", format: fmt1 },
      ];
    }
    return [
      { key: "group", label: "Village" },
      { key: "upazila", label: "Upazila" },
      { key: "union", label: "Union" },
      { key: "cases", label: "Cases", align: "right", format: fmtInt },
      { key: "population", label: "Population", align: "right", format: fmtInt },
      { key: "api", label: "API", align: "right", format: fmt1 },
    ];
  }, [reportType]);

  const insights = useMemo(() => {
    if (!rows.length) return [];

    const topByCases = [...rows].sort((a: any, b: any) => num(b.cases) - num(a.cases))[0];
    const topByAPI = [...rows].sort((a: any, b: any) => num(b.api) - num(a.api))[0];

    const highAPIcount = rows.filter((r: any) => num(r.api) >= 10).length;
    const nonZeroCount = rows.filter((r: any) => num(r.cases) > 0).length;

    const avgAPI =
      rows.reduce((s: number, r: any) => s + num(r.api), 0) / Math.max(1, rows.length);

    const warnings: string[] = [];
    if (completeness !== null && completeness < 80) warnings.push("Low reporting completeness (<80%).");
    if (filteredVillages.length === 0) warnings.push("No villages found for the current filters.");

    return [
      `Top ${groupLabelFor(reportType)} by cases: ${topByCases?.group || "N/A"} (${fmtInt(topByCases?.cases)} cases).`,
      `Top ${groupLabelFor(reportType)} by API: ${topByAPI?.group || "N/A"} (${fmt1(topByAPI?.api)} API).`,
      `High API (≥10): ${fmtInt(highAPIcount)} ${groupLabelFor(reportType).toLowerCase()}(s).`,
      `Non-zero reporting: ${fmtInt(nonZeroCount)} out of ${fmtInt(rows.length)} ${groupLabelFor(reportType).toLowerCase()}(s).`,
      `Average API (selected): ${avgAPI.toFixed(2)}.`,
      ...warnings.map((w) => `Note: ${w}`),
    ];
  }, [rows, reportType, completeness, filteredVillages.length]);

  // Keep export signature compatible with your current exports
  const handlePDF = () =>
    exportPDF(REPORT_TYPE_LABELS[reportType], filtersText, kpis, filteredVillages, filters);
  const handleExcel = () =>
    exportExcel(REPORT_TYPE_LABELS[reportType], filtersText, kpis, filteredVillages, filters);

  const reportTitle = REPORT_TYPE_LABELS[reportType];
  const chartTitle = titleFor(reportType, chartMetric);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Report Builder sidebar */}
      <div className="panel lg:col-span-1">
        <div className="panel-header">
          <span className="panel-title">Report Builder</span>
        </div>

        <div className="panel-body space-y-4">
          <div>
            <div className="filter-label">Report Type</div>
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {Object.entries(REPORT_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="filter-label">Chart Metric</div>
            <div className="flex gap-1">
              <Button
                variant={chartMetric === "cases" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs px-3"
                onClick={() => setChartMetric("cases")}
              >
                Cases
              </Button>
              <Button
                variant={chartMetric === "api" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs px-3"
                onClick={() => setChartMetric("api")}
              >
                API
              </Button>
            </div>
          </div>

          <div>
            <div className="filter-label">Table Rows</div>
            <Select value={String(rowLimit)} onValueChange={(v) => setRowLimit(Number(v))}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {[10, 15, 25, 50].map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-xs">
                    Show {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="filter-label mb-2">Sections</div>
            <div className="space-y-2">
              {(
                [
                  ["kpis", "Executive KPIs"],
                  ["insights", "Key Insights"],
                  ["chart", "Chart"],
                  ["table", "Data Table"],
                  ["completeness", "Completeness Summary"],
                  ["definitions", "Methods/Definitions"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox checked={sections[key]} onCheckedChange={() => toggleSection(key)} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            <Button size="sm" className="w-full text-xs h-8" onClick={handlePDF}>
              <FileText className="h-3 w-3 mr-1" />
              Download PDF
            </Button>
            <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={handleExcel}>
              <FileSpreadsheet className="h-3 w-3 mr-1" />
              Download Excel
            </Button>
          </div>

          <div className="border border-border rounded p-2 text-[10px] text-muted-foreground space-y-1">
            <div className="flex items-center gap-1 text-foreground">
              <BarChart3 className="h-3 w-3" />
              <span className="font-medium">Report Metadata</span>
            </div>
            <div>{filtersText}</div>
            <div>Generated: {new Date().toLocaleString()}</div>
            <div>Rows in table: {Math.min(rowLimit, rows.length)} / {rows.length}</div>
          </div>
        </div>
      </div>

      {/* Report Preview */}
      <div className="lg:col-span-3 report-preview" id="report-preview">
        <div className="report-header">
          <h2 className="text-base font-semibold">{reportTitle}</h2>
          <p className="text-[10px] text-muted-foreground mt-1">{filtersText}</p>
          <p className="text-[10px] text-muted-foreground">Generated: {new Date().toLocaleString()}</p>
        </div>

        <div className="report-body space-y-4">
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

          {sections.insights && (
            <div className="border border-border rounded p-3 bg-card">
              <h3 className="text-xs font-semibold mb-2">Key Insights</h3>
              {insights.length === 0 ? (
                <div className="text-xs text-muted-foreground">No insights available (no data).</div>
              ) : (
                <ul className="list-disc pl-4 space-y-1 text-xs">
                  {insights.slice(0, 6).map((t, i) => (
                    <li key={i} className="text-muted-foreground">
                      <span className="text-foreground">{t}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {sections.chart && (
            <div>
              <h3 className="text-xs font-semibold mb-2">{chartTitle}</h3>
              {chartData.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                  No data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={0} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 10 }}
                      formatter={(value: any, name: any) => {
                        if (name === "api") return [Number(value).toFixed(2), "API"];
                        return [fmtInt(value), "Cases"];
                      }}
                    />
                    <Bar
                      dataKey={chartMetric}
                      fill={chartMetric === "api" ? CHART_COLORS.accent : CHART_COLORS.destructive}
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">
                Showing top {Math.min(12, rows.length)} {groupLabelFor(reportType).toLowerCase()}(s) for the selected filters.
              </p>
            </div>
          )}

          {sections.table && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold">Data Table</h3>
                <div className="text-[10px] text-muted-foreground">
                  Showing {Math.min(rowLimit, rows.length)} of {rows.length}
                </div>
              </div>

              <div className="overflow-x-auto border border-border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((c) => (
                        <TableHead key={c.key} className="text-[10px]">
                          {c.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {rows.slice(0, rowLimit).map((row: any, i: number) => (
                      <TableRow key={i}>
                        {columns.map((c) => {
                          const v = row[c.key];
                          const txt = c.format ? c.format(v) : String(v ?? "");
                          const align =
                            c.align === "right"
                              ? "text-right"
                              : c.align === "center"
                              ? "text-center"
                              : "text-left";
                          return (
                            <TableCell key={c.key} className={`text-[11px] py-1 ${align}`}>
                              {txt}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {sections.completeness && (
            <div className="text-xs">
              <h3 className="font-semibold mb-1">Completeness Summary</h3>

              {completeness === null ? (
                <p className="text-muted-foreground">
                  Completeness is not available for {filters.year} (monthly completeness is currently available for 2026 only).
                </p>
              ) : (
                <>
                  <p>
                    Reporting completeness for {MONTHS[filters.monthStart]}–{MONTHS[filters.monthEnd]} {filters.year}:{" "}
                    <strong>{completeness.toFixed(1)}%</strong>
                  </p>
                  <p className="text-muted-foreground">
                    Based on {filteredVillages.length} villages in the selected filters.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {sections.definitions && (
          <div className="report-footer space-y-1">
            <p className="font-semibold">Methods & Definitions</p>
            <p>Cases = total confirmed cases in the selected month range for the selected year.</p>
            <p>API (Annual Parasite Incidence) = (Total confirmed cases / Population) × 1000.</p>
            <p>
              Aggregate API = (Total cases across selected villages / Total population across selected villages) × 1000.
            </p>
            <p>
              Reporting completeness = % of selected villages with non-null case values for the selected month(s) (2026 monthly series).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
