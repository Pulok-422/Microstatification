import { useFilters } from "@/hooks/useFilters";
import { getSelectedMonthCases, computeCompleteness, computeAggregateAPI } from "@/lib/computations";
import { MONTHS } from "@/types/dashboard";
import { MapPin, Activity, BarChart3, ClipboardCheck, AlertTriangle } from "lucide-react";

export function KPICards() {
  const { filters, filteredVillages, alerts } = useFilters();

  const totalCases = filteredVillages.reduce((s, v) => s + getSelectedMonthCases(v, filters.year, filters.monthStart, filters.monthEnd), 0);
  const api = computeAggregateAPI(filteredVillages, filters.year, filters.monthStart, filters.monthEnd);
  const completeness = filters.year === 2026 ? computeCompleteness(filteredVillages, filters.monthStart, filters.monthEnd) : 100;

  const kpis = [
    { label: "Villages Selected", value: filteredVillages.length.toLocaleString(), icon: MapPin, color: "text-foreground" },
    { label: `Cases (${MONTHS[filters.monthStart]}–${MONTHS[filters.monthEnd]} ${filters.year})`, value: totalCases.toLocaleString(), icon: Activity, color: "text-foreground" },
    { label: "Aggregate API", value: api.toFixed(2), icon: BarChart3, color: api >= 10 ? "text-destructive" : "text-foreground" },
    { label: "Reporting Completeness", value: `${completeness.toFixed(1)}%`, icon: ClipboardCheck, color: completeness < 80 ? "text-warning" : "text-foreground" },
    { label: "Alerts", value: alerts.length.toLocaleString(), icon: AlertTriangle, color: alerts.length > 0 ? "text-destructive" : "text-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {kpis.map((k) => (
        <div key={k.label} className="kpi-card">
          <div className="flex items-center gap-1.5 mb-2">
            <k.icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="kpi-label">{k.label}</span>
          </div>
          <div className={`kpi-value ${k.color}`}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}
