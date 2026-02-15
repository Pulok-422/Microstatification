import { useMemo } from "react";
import { useFilters } from "@/hooks/useFilters";
import { MONTHS, CHART_COLORS } from "@/types/dashboard";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

function pct(part: number, total: number) {
  if (!total || total <= 0) return 0;
  return (part / total) * 100;
}

export function DataQuality() {
  const { filteredVillages, filters } = useFilters();

  const { missingCells, totalCells, missingVillages } = useMemo(() => {
    let missingCells = 0;
    let totalCells = 0;
    let missingVillages = 0;

    if (filters.year !== 2026) {
      return { missingCells: 0, totalCells: 0, missingVillages: 0 };
    }

    for (const v of filteredVillages as any[]) {
      let hasMissing = false;

      for (let m = filters.monthStart; m <= filters.monthEnd; m++) {
        totalCells += 1;
        const val = v.cases_monthly_2026?.[m];
        if (val === null || val === undefined) {
          missingCells += 1;
          hasMissing = true;
        }
      }

      if (hasMissing) missingVillages += 1;
    }

    return { missingCells, totalCells, missingVillages };
  }, [filteredVillages, filters.year, filters.monthStart, filters.monthEnd]);

  const presentCells = Math.max(0, totalCells - missingCells);

  const pieData = [
    { name: "Present", value: presentCells },
    { name: "Missing", value: missingCells },
  ];

  if (filters.year !== 2026) {
    return (
      <div className="panel h-full">
        <div className="panel-header">
          <span className="panel-title">Missing Monthly Entries</span>
        </div>
        <div className="panel-body text-sm text-muted-foreground text-center py-8">
          Monthly missing-entry chart is available for 2026 only
        </div>
      </div>
    );
  }

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <span className="panel-title">Missing Monthly Entries</span>
      </div>

      <div className="panel-body">
        {totalCells === 0 ? (
          <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground">
            No data
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-[11px] text-muted-foreground">
              Period: {MONTHS[filters.monthStart]}–{MONTHS[filters.monthEnd]} {filters.year} •
              Villages affected:{" "}
              <span className="text-foreground font-medium">
                {missingVillages.toLocaleString()}
              </span>{" "}
              / {filteredVillages.length.toLocaleString()} • Missing cells:{" "}
              <span className="text-destructive font-medium">
                {missingCells.toLocaleString()}
              </span>{" "}
              / {totalCells.toLocaleString()} (
              {pct(missingCells, totalCells).toFixed(1)}%)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Pie Chart */}
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      stroke={CHART_COLORS.grid}
                    >
                      <Cell fill={CHART_COLORS.success} />
                      <Cell fill={CHART_COLORS.destructive} />
                    </Pie>

                    <Tooltip
                      contentStyle={{ fontSize: 11 }}
                      formatter={(v: any, name: any) => {
                        const val = Number(v) || 0;
                        return [
                          `${val.toLocaleString()} (${pct(val, totalCells).toFixed(1)}%)`,
                          name,
                        ];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Compact Right Summary */}
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded border border-border p-3">
                  <div className="text-xs text-muted-foreground">Present Entries</div>
                  <div className="text-sm font-semibold tabular-nums text-success">
                    {presentCells.toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded border border-border p-3">
                  <div className="text-xs text-muted-foreground">Missing Entries</div>
                  <div className="text-sm font-semibold tabular-nums text-destructive">
                    {missingCells.toLocaleString()}
                  </div>
                </div>


              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
