import { useFilters } from "@/hooks/useFilters";
import { getSelectedMonthCases } from "@/lib/computations";
import { MONTHS } from "@/types/dashboard";
import { ComputedVillage } from "@/types/dashboard";

interface Props {
  onSelectVillage: (v: ComputedVillage) => void;
}

export function CompletenessHeatmap({ onSelectVillage }: Props) {
  const { filteredVillages, filters } = useFilters();

  if (filters.year !== 2026) {
    return (
      <div className="panel h-full">
        <div className="panel-header">
          <span className="panel-title">Completeness Matrix</span>
        </div>
        <div className="panel-body text-sm text-muted-foreground text-center py-8">
          Monthly data only for 2026
        </div>
      </div>
    );
  }

  const ranked = [...filteredVillages]
    .map((v) => {
      const cases = getSelectedMonthCases(v, 2026, filters.monthStart, filters.monthEnd);
      return { ...v, totalCases: cases };
    })
    .sort((a, b) => b.totalCases - a.totalCases)
    .slice(0, 30);

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <span className="panel-title">Completeness Matrix (Top 30 by Cases)</span>
      </div>

      <div className="panel-body overflow-x-auto">
        <table className="text-[10px] w-full">
          <thead>
            <tr>
              <th className="text-left px-1 py-1 font-medium text-muted-foreground sticky left-0 bg-card">
                Village
              </th>
              {MONTHS.map((m) => (
                <th
                  key={m}
                  className="px-0.5 py-1 font-medium text-muted-foreground text-center"
                >
                  {m}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {ranked.map((v) => (
              <tr
                key={v.village_code}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => onSelectVillage(v)}
              >
                <td className="px-1 py-0.5 whitespace-nowrap font-medium sticky left-0 bg-card">
                  {v.village_code}
                </td>

                {v.cases_monthly_2026.map((c, i) => (
                  <td key={i} className="px-0.5 py-0.5 text-center">
                    <span
                      className={`heatmap-cell inline-flex ${
                        c === null
                          ? "heatmap-missing"
                          : c === 0
                          ? "heatmap-zero"
                          : "heatmap-reported"
                      }`}
                    >
                      {c === null ? "–" : c}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-destructive/15" /> Missing
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-success/15" /> Zero
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-success/30" /> Reported
          </span>
        </div>
      </div>
    </div>
  );
}
