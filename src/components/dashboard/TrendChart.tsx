import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useFilters } from "@/hooks/useFilters";
import { getMonthlyTrendData } from "@/lib/computations";
import { CHART_COLORS } from "@/types/dashboard";
import { Button } from "@/components/ui/button";

export function TrendChart() {
  const { filters, filteredVillages, updateFilter } = useFilters();
  const [metric, setMetric] = useState<"cases" | "api">("cases");

  if (filters.year !== 2026) {
    return (
      <div className="panel h-full">
        <div className="panel-header"><span className="panel-title">Monthly Trend</span></div>
        <div className="panel-body flex items-center justify-center h-[280px] text-sm text-muted-foreground">
          Monthly breakdown only available for 2026
        </div>
      </div>
    );
  }

  const data = getMonthlyTrendData(filteredVillages, metric);

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <span className="panel-title">Monthly Trend ({filters.year})</span>
        <div className="flex gap-1">
          <Button variant={metric === "cases" ? "default" : "outline"} size="sm" className="h-6 text-[10px] px-2" onClick={() => setMetric("cases")}>Cases</Button>
          <Button variant={metric === "api" ? "default" : "outline"} size="sm" className="h-6 text-[10px] px-2" onClick={() => setMetric("api")}>API</Button>
        </div>
      </div>
      <div className="panel-body">
        <ResponsiveContainer width="100%" height={270}>
          <LineChart data={data} onClick={(e) => { if (e?.activeTooltipIndex !== undefined) { updateFilter("monthStart", e.activeTooltipIndex); updateFilter("monthEnd", e.activeTooltipIndex); } }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => [metric === "api" ? v.toFixed(2) : v, metric === "cases" ? "Cases" : "API"]} />
            <Line type="monotone" dataKey="value" stroke={CHART_COLORS.accent} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.accent }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
