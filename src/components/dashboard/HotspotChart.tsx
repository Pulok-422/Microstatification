import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useFilters } from "@/hooks/useFilters";
import { getSelectedMonthCases } from "@/lib/computations";
import { CHART_COLORS } from "@/types/dashboard";

export function HotspotChart() {
  const { filters, filteredVillages, updateFilter } = useFilters();

  const sorted = [...filteredVillages]
    .map((v) => ({ ...v, selectedCases: getSelectedMonthCases(v, filters.year, filters.monthStart, filters.monthEnd) }))
    .sort((a, b) => b.selectedCases - a.selectedCases)
    .slice(0, 10)
    .map((v) => ({ name: `${v.village_code} ${v.village_name_en}`, cases: v.selectedCases, code: v.village_code }));

  return (
    <div className="panel h-full">
      <div className="panel-header"><span className="panel-title">Top 10 Villages by Cases</span></div>
      <div className="panel-body">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-[270px] text-sm text-muted-foreground">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={sorted} layout="vertical" onClick={(e) => { if (e?.activePayload?.[0]?.payload?.code) { updateFilter("villageSearch", e.activePayload[0].payload.code); } }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 9 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Bar dataKey="cases" fill={CHART_COLORS.destructive} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
