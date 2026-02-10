import { ComputedVillage, MONTHS, CHART_COLORS } from "@/types/dashboard";
import { useFilters } from "@/hooks/useFilters";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Badge } from "@/components/ui/badge";

interface Props {
  village: ComputedVillage | null;
  open: boolean;
  onClose: () => void;
}

export function VillageDrawer({ village, open, onClose }: Props) {
  const { alerts } = useFilters();

  if (!village) return null;

  const sparkData = MONTHS.map((m, i) => ({ month: m, cases: village.cases_monthly_2026[i] ?? 0 }));
  const villageAlerts = alerts.filter((a) => a.village_code === village.village_code);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[380px] sm:w-[420px] overflow-y-auto bg-card">
        <SheetHeader>
          <SheetTitle className="text-sm">{village.village_name_en}</SheetTitle>
          <p className="text-[10px] text-muted-foreground">{village.village_name_bn}</p>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Admin Hierarchy</div>
            <p className="text-xs">{village.district} › {village.upazila} › {village.union} › {village.ward_no} › {village.village_name_en}</p>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><span className="text-muted-foreground">Code:</span> {village.village_code}</div>
            <div><span className="text-muted-foreground">Population:</span> {village.population.toLocaleString()}</div>
            <div><span className="text-muted-foreground">Service Point:</span> {village.service_point}</div>
            <div><span className="text-muted-foreground">Distance:</span> {village.distance_km} km</div>
            <div><span className="text-muted-foreground">Border:</span> {village.border_country}</div>
            <div><span className="text-muted-foreground">Designation:</span> {village.designation}</div>
            <div><span className="text-muted-foreground">SK/SHW:</span> {village.sk_shw_name}</div>
            <div><span className="text-muted-foreground">SS:</span> {village.ss_name}</div>
          </div>

          <Separator />

          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">LLINs</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="kpi-card !p-2"><div className="kpi-label">2026</div><div className="text-sm font-semibold">{village.active_llin_2026}</div></div>
              <div className="kpi-card !p-2"><div className="kpi-label">2025</div><div className="text-sm font-semibold">{village.active_llin_2025}</div></div>
              <div className="kpi-card !p-2"><div className="kpi-label">2024</div><div className="text-sm font-semibold">{village.active_llin_2024}</div></div>
            </div>
          </div>

          <Separator />

          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Monthly Cases 2026</div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={sparkData}>
                <XAxis dataKey="month" tick={{ fontSize: 8 }} />
                <YAxis tick={{ fontSize: 8 }} width={25} />
                <Tooltip contentStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="cases" stroke={CHART_COLORS.accent} strokeWidth={1.5} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="kpi-card !p-2"><div className="kpi-label">API 2026</div><div className="text-sm font-semibold">{village.api_2026.toFixed(1)}</div></div>
            <div className="kpi-card !p-2"><div className="kpi-label">API 2025</div><div className="text-sm font-semibold">{village.api_2025.toFixed(1)}</div></div>
            <div className="kpi-card !p-2"><div className="kpi-label">API 2024</div><div className="text-sm font-semibold">{village.api_2024.toFixed(1)}</div></div>
          </div>

          {villageAlerts.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Alerts ({villageAlerts.length})</div>
                <div className="space-y-1">
                  {villageAlerts.map((a, i) => (
                    <Badge key={i} variant="outline" className={`text-[10px] ${a.severity === "high" ? "alert-badge-high" : a.severity === "medium" ? "alert-badge-medium" : "alert-badge-low"}`}>
                      {a.message}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
