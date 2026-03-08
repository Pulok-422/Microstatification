import { useEffect, useMemo, useState } from "react";
import { useFilters } from "@/hooks/useFilters";
import { MONTHS } from "@/types/dashboard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// @ts-ignore
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type MapMode = "distribution" | "completeness";

function num(x: any, fallback = NaN) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function pct(part: number, total: number) {
  if (!total || total <= 0) return 0;
  return (part / total) * 100;
}

/**
 * IMPORTANT: Leaflet uses window/document.
 * This component is made client-safe for Vercel by gating render until mounted.
 */

// Fix default marker icon paths (Vite builds often need this)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).toString(),
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString(),
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString(),
});

type VillagePoint = {
  village_code: string;
  village_name_en?: string;
  upazila?: string;
  union?: string;
  district?: string;

  lat: number;
  lng: number;

  // Completeness mode (2026 only)
  totalMonths: number;
  missingMonths: number;
  completenessPct: number; // 0-100
};

function FitBounds({ points }: { points: VillagePoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds.pad(0.15), { animate: true });
  }, [map, points]);

  return null;
}

function completenessBucket(p: number) {
  if (p >= 95) return "≥95%";
  if (p >= 80) return "80–94%";
  if (p >= 60) return "60–79%";
  return "<60%";
}

function completenessColors(bucket: string) {
  // Keep it simple and readable
  if (bucket === "≥95%") return { stroke: "rgba(34,197,94,0.95)", fill: "rgba(34,197,94,0.35)" };
  if (bucket === "80–94%") return { stroke: "rgba(234,179,8,0.95)", fill: "rgba(234,179,8,0.35)" };
  if (bucket === "60–79%") return { stroke: "rgba(249,115,22,0.95)", fill: "rgba(249,115,22,0.35)" };
  return { stroke: "rgba(220,38,38,0.95)", fill: "rgba(220,38,38,0.35)" };
}

export function VillageMapPanel() {
  const { filteredVillages, filters } = useFilters();

  const [isClient, setIsClient] = useState(false);
  const [mode, setMode] = useState<MapMode>("distribution");

  useEffect(() => setIsClient(true), []);

  // Default center (Bangladesh southeast-ish). FitBounds will override if points exist.
  const defaultCenter: [number, number] = [22.6, 92.2];

  const points = useMemo<VillagePoint[]>(() => {
    const out: VillagePoint[] = [];

    for (const v of filteredVillages as any[]) {
      // Adjust if your dataset uses different field names:
      const lat = num(v.latitude ?? v.lat);
      const lng = num(v.longitude ?? v.lng ?? v.lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      let totalMonths = 0;
      let missingMonths = 0;

      if (filters.year === 2026 && Array.isArray(v.cases_monthly_2026)) {
        for (let m = filters.monthStart; m <= filters.monthEnd; m++) {
          totalMonths += 1;
          const val = v.cases_monthly_2026[m];
          if (val === null || val === undefined) missingMonths += 1;
        }
      }

      const completenessPct =
        totalMonths === 0 ? 100 : ((totalMonths - missingMonths) / totalMonths) * 100;

      out.push({
        village_code: String(v.village_code ?? "UNKNOWN"),
        village_name_en: v.village_name_en,
        upazila: v.upazila,
        union: v.union,
        district: v.district,
        lat,
        lng,
        totalMonths,
        missingMonths,
        completenessPct,
      });
    }

    return out;
  }, [filteredVillages, filters.year, filters.monthStart, filters.monthEnd]);

  const stats = useMemo(() => {
    const total = points.length;

    // For completeness mode: "complete" means missingMonths == 0 for selected month range
    const complete = points.filter((p) => p.totalMonths === 0 || p.missingMonths === 0).length;
    const missing = total - complete;

    const buckets = {
      "≥95%": 0,
      "80–94%": 0,
      "60–79%": 0,
      "<60%": 0,
    } as Record<string, number>;

    for (const p of points) {
      buckets[completenessBucket(p.completenessPct)] += 1;
    }

    return {
      total,
      complete,
      missing,
      buckets,
      missingPct: total ? pct(missing, total) : 0,
    };
  }, [points]);

  const canShowCompleteness = filters.year === 2026;

  // If user switches to completeness while not 2026, auto revert to distribution
  useEffect(() => {
    if (mode === "completeness" && !canShowCompleteness) setMode("distribution");
  }, [mode, canShowCompleteness]);

  const headerRight = (
    <div className="flex items-center gap-2">
      <div className="hidden sm:block text-[10px] text-muted-foreground">
        Mapped villages: <span className="text-foreground font-medium">{stats.total.toLocaleString()}</span>
      </div>

      <Select value={mode} onValueChange={(v) => setMode(v as MapMode)}>
        <SelectTrigger className="h-8 w-[220px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover z-50">
          <SelectItem value="distribution" className="text-xs">
            Distribution (All Villages)
          </SelectItem>
          <SelectItem value="completeness" className="text-xs" disabled={!canShowCompleteness}>
            Completeness (Missing vs Complete)
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  if (!points.length) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Village Map</span>
          {headerRight}
        </div>
        <div className="panel-body text-sm text-muted-foreground text-center py-8">
          No villages with coordinates in the current filter.
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Village Map</span>
        {headerRight}
      </div>

      <div className="panel-body space-y-3">
        {mode === "completeness" && canShowCompleteness && (
          <div className="text-[11px] text-muted-foreground">
            Period: {MONTHS[filters.monthStart]}–{MONTHS[filters.monthEnd]} {filters.year} • Complete:{" "}
            <span className="text-success font-medium">{stats.complete.toLocaleString()}</span> • Missing:{" "}
            <span className="text-destructive font-medium">{stats.missing.toLocaleString()}</span> (
            {stats.missingPct.toFixed(1)}%)
          </div>
        )}

        {mode === "completeness" && !canShowCompleteness && (
          <div className="text-[11px] text-muted-foreground">
            Completeness map is available for 2026 monthly data only.
          </div>
        )}

        <div className="h-[440px] w-full rounded overflow-hidden border border-border">
          <MapContainer
            center={defaultCenter}
            zoom={8}
            scrollWheelZoom
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FitBounds points={points} />

            {points.map((p) => {
              const isCompleteness = mode === "completeness" && canShowCompleteness;

              const bucket = completenessBucket(p.completenessPct);
              const col = isCompleteness
                ? completenessColors(bucket)
                : { stroke: "rgba(59,130,246,0.9)", fill: "rgba(59,130,246,0.25)" };

              // Slightly larger when missing months exist (helps visual scanning)
              const radius = isCompleteness
                ? clamp(5 + p.missingMonths * 2, 5, 14)
                : 5;

              return (
                <CircleMarker
                  key={`${p.village_code}-${p.lat}-${p.lng}`}
                  center={[p.lat, p.lng]}
                  radius={radius}
                  pathOptions={{
                    color: col.stroke,
                    fillColor: col.fill,
                    fillOpacity: 0.7,
                    weight: 2,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -6]} opacity={1} sticky>
                    <div className="text-xs">
                      <div className="font-semibold">
                        {p.village_code}
                        {p.village_name_en ? ` • ${p.village_name_en}` : ""}
                      </div>
                      <div className="text-muted-foreground">
                        {p.district ? `${p.district} • ` : ""}
                        {p.upazila ?? ""}{p.union ? `, ${p.union}` : ""}
                      </div>

                      {isCompleteness && (
                        <div className="mt-1">
                          Completeness: <b>{p.completenessPct.toFixed(0)}%</b> • Missing:{" "}
                          <b>{p.missingMonths}</b>/{p.totalMonths}
                        </div>
                      )}
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {/* Legend */}
        {mode === "completeness" && canShowCompleteness ? (
          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            {(["≥95%", "80–94%", "60–79%", "<60%"] as const).map((b) => {
              const c = completenessColors(b);
              return (
                <span key={b} className="flex items-center gap-1">
                  <span
                    className="w-3 h-3 rounded-sm border border-border"
                    style={{ background: c.fill }}
                    aria-hidden
                  />
                  {b} ({stats.buckets[b].toLocaleString()})
                </span>
              );
            })}
            <span className="ml-auto text-[10px] text-muted-foreground">
              Tip: bigger circles = more missing months
            </span>
          </div>
        ) : (
          <div className="text-[10px] text-muted-foreground">
            Distribution view shows all mapped villages in the current filter.
          </div>
        )}
      </div>
    </div>
  );
}
