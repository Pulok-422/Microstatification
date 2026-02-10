import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useFilters } from "@/hooks/useFilters";
import { getSelectedMonthCases } from "@/lib/computations";
import { CHART_COLORS } from "@/types/dashboard";
import { Button } from "@/components/ui/button";

export function HotspotChart() {
  const { filters, filteredVillages, updateFilter } = useFilters();

  // default = cases
  const [metric, setMetric] = useState<"cases" | "api">("cases");

  const data = useMemo(() => {
    const rows = [...filteredVillages].map((v: any) => {
      const selectedCases = getSelectedMonthCases(
        v,
        filters.year,
        filters.monthStart,
        filters.monthEnd
      );

      const pop = Number(v.population ?? 0);
      const api = pop > 0 ? (selectedCases / pop) * 1000 : 0;

      return {
        name: `${v.village_code} ${v.village_name_en}`,
        code: v.village_code,
        cases: selectedCases,
        api: Number.isFinite(api) ? api : 0,
      };
    });

    return rows
      .sort((a, b) => (metric === "cases" ? b.cases - a.cases : b.api - a.api))
      .slice(0, 10);
  }, [filteredVillages, filters.year, filters.monthStart, filters.monthEnd, metric]);

  const title = metric === "cases" ? "Top 10 Villages by Cases" : "Top 10 Villages by API";
  const barKey = metric;
  const xTickFormatter = metric === "api" ? (v: any) => Number(v).toFixed(1) : undefined;

  return (
    <div className="panel h-full">
      <div className="panel-header flex items-center justify-between">
        <span className="panel-title">{title}</span>

        <div className="flex items-center gap-1">
          <Button
            variant={metric === "cases" ? "default" : "outline"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setMetric("cases")}
          >
            Cases
          </Button>
          <Button
            variant={metric === "api" ? "default" : "outline"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setMetric("api")}
          >
            API
          </Button>
        </div>
      </div>

      <div className="panel-body">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[270px] text-sm text-muted-foreground">
            No data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={270}>
            <BarChart
              data={data}
              layout="vertical"
              onClick={(e) => {
                const code = (e as any)?.activePayload?.[0]?.payload?.code;
                if (code) updateFilter("villageSearch", code);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={xTickFormatter} />
              <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 9 }} />
              <Tooltip
                contentStyle={{ fontSize: 11 }}
                formatter={(value: any) =>
                  metric === "api" ? [Number(value).toFixed(2), "API"] : [value, "Cases"]
                }
              />
              <Bar dataKey={barKey} fill={CHART_COLORS.destructive} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
