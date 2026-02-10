import { useFilters } from "@/hooks/useFilters";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AlertsPanel() {
  const { alerts } = useFilters();

  if (alerts.length === 0) return null;

  const grouped = alerts.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const top10 = alerts.slice(0, 10);

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          Alerts ({alerts.length})
        </span>
        <div className="flex gap-2 text-[10px]">
          {Object.entries(grouped).map(([type, count]) => (
            <span key={type} className="text-muted-foreground">{type}: {count}</span>
          ))}
        </div>
      </div>
      <div className="panel-body">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
          {top10.map((a, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded border border-border text-xs">
              <Badge variant="outline" className={`text-[9px] shrink-0 ${a.severity === "high" ? "alert-badge-high" : a.severity === "medium" ? "alert-badge-medium" : "alert-badge-low"}`}>
                {a.severity}
              </Badge>
              <div>
                <div className="font-medium text-[11px]">{a.village_code}</div>
                <div className="text-muted-foreground text-[10px]">{a.message}</div>
              </div>
            </div>
          ))}
        </div>
        {alerts.length > 10 && <p className="text-[10px] text-muted-foreground mt-2">+ {alerts.length - 10} more alerts</p>}
      </div>
    </div>
  );
}
