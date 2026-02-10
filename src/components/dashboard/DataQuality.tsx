import { useFilters } from "@/hooks/useFilters";
import { MONTHS } from "@/types/dashboard";
import { AlertTriangle, FileWarning, Copy, TrendingUp } from "lucide-react";

export function DataQuality() {
  const { filteredVillages, filters } = useFilters();

  const missingPop = filteredVillages.filter((v) => !v.population).length;
  const missingCode = filteredVillages.filter((v) => !v.village_code).length;
  const missingUnion = filteredVillages.filter((v) => !v.union).length;

  let missingMonthly = 0;
  if (filters.year === 2026) {
    for (const v of filteredVillages) {
      for (let m = filters.monthStart; m <= filters.monthEnd; m++) {
        if (v.cases_monthly_2026[m] === null) missingMonthly++;
      }
    }
  }

  const outliers = filteredVillages.filter((v) => {
    if (filters.year === 2026) {
      return v.cases_monthly_2026.some((c) => c !== null && c > 30) || v.api_2026 > 20;
    }
    return false;
  });

  const codes = filteredVillages.map((v) => v.village_code);
  const dupes = codes.filter((c, i) => codes.indexOf(c) !== i).length;

  const items = [
    { icon: FileWarning, label: "Missing population", count: missingPop, severity: missingPop > 0 ? "warn" : "ok" },
    { icon: FileWarning, label: "Missing village code", count: missingCode, severity: missingCode > 0 ? "warn" : "ok" },
    { icon: FileWarning, label: "Missing union", count: missingUnion, severity: missingUnion > 0 ? "warn" : "ok" },
    { icon: AlertTriangle, label: `Missing monthly entries (${MONTHS[filters.monthStart]}–${MONTHS[filters.monthEnd]})`, count: missingMonthly, severity: missingMonthly > 0 ? "warn" : "ok" },
    { icon: TrendingUp, label: "Outlier villages (cases>30 or API>20)", count: outliers.length, severity: outliers.length > 0 ? "warn" : "ok" },
    { icon: Copy, label: "Duplicate village codes", count: dupes, severity: dupes > 0 ? "error" : "ok" },
  ];

  return (
    <div className="panel h-full">
      <div className="panel-header"><span className="panel-title">Data Quality Checks</span></div>
      <div className="panel-body space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
            <div className="flex items-center gap-2 text-xs">
              <item.icon className={`h-3.5 w-3.5 ${item.severity === "ok" ? "text-success" : item.severity === "warn" ? "text-warning" : "text-destructive"}`} />
              <span>{item.label}</span>
            </div>
            <span className={`text-xs font-semibold tabular-nums ${item.severity === "ok" ? "text-success" : item.severity === "warn" ? "text-warning" : "text-destructive"}`}>
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
