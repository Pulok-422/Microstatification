// VillageMapPanel.tsx
// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import { useFilters } from "@/hooks/useFilters";
import { MONTHS } from "@/types/dashboard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// @ts-ignore
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type MapMode = "distribution" | "completeness";
type BaseMap = "osm" | "light" | "satellite";

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

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL(
    "leaflet/dist/images/marker-icon-2x.png",
    import.meta.url
  ).toString(),
  iconUrl: new URL(
    "leaflet/dist/images/marker-icon.png",
    import.meta.url
  ).toString(),
  shadowUrl: new URL(
    "leaflet/dist/images/marker-shadow.png",
    import.meta.url
  ).toString(),
});

type VillagePoint = {
  village_code: string;
  village_name_en?: string;
  upazila?: string;
  union?: string;
  district?: string;
  lat: number;
  lng: number;
  totalMonths: number;
  missingMonths: number;
  completenessPct: number;
};

function getPointLabel(p: VillagePoint) {
  return p.village_name_en?.trim() || p.village_code;
}

function getLocationText(p: VillagePoint) {
  return [p.district, p.upazila, p.union].filter(Boolean).join(" • ");
}

function completenessBucket(p: number) {
  if (p >= 95) return "≥95%";
  if (p >= 80) return "80–94%";
  if (p >= 60) return "60–79%";
  return "<60%";
}

function completenessColors(bucket: string) {
  if (bucket === "≥95%") {
    return {
      stroke: "rgba(34,197,94,0.95)",
      fill: "rgba(34,197,94,0.30)",
      chip: "bg-emerald-50 text-emerald-700",
    };
  }
  if (bucket === "80–94%") {
    return {
      stroke: "rgba(234,179,8,0.95)",
      fill: "rgba(234,179,8,0.30)",
      chip: "bg-yellow-50 text-yellow-700",
    };
  }
  if (bucket === "60–79%") {
    return {
      stroke: "rgba(249,115,22,0.95)",
      fill: "rgba(249,115,22,0.30)",
      chip: "bg-orange-50 text-orange-700",
    };
  }
  return {
    stroke: "rgba(220,38,38,0.95)",
    fill: "rgba(220,38,38,0.30)",
    chip: "bg-red-50 text-red-700",
  };
}

function distributionStyle(isSelected: boolean, isDimmed: boolean, rank?: number) {
  const topBoost = rank !== undefined && rank < 3 ? 1.6 : rank !== undefined && rank < 10 ? 0.8 : 0;

  return {
    radius: isSelected ? 10 + topBoost : 6.5 + topBoost,
    stroke: isSelected ? "rgba(30,64,175,1)" : "rgba(59,130,246,0.92)",
    fill: isSelected ? "rgba(37,99,235,0.46)" : "rgba(59,130,246,0.26)",
    opacity: isDimmed ? 0.28 : 1,
    weight: isSelected ? 3 : 2,
  };
}

function completenessStyle(
  point: VillagePoint,
  isSelected: boolean,
  isDimmed: boolean,
  rank?: number
) {
  const bucket = completenessBucket(point.completenessPct);
  const col = completenessColors(bucket);
  const topBoost = rank !== undefined && rank < 3 ? 1.6 : rank !== undefined && rank < 10 ? 0.8 : 0;
  return {
    radius: clamp((isSelected ? 7 : 5) + point.missingMonths * 2 + topBoost, 5, 16),
    stroke: col.stroke,
    fill: col.fill,
    opacity: isDimmed ? 0.28 : 1,
    weight: isSelected ? 3 : 2,
    bucket,
    chipClass: col.chip,
  };
}

function FitBounds({ points }: { points: VillagePoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds.pad(0.15), { animate: true });
  }, [map, points]);

  return null;
}

function FlyToPoint({ point }: { point: VillagePoint | null }) {
  const map = useMap();

  useEffect(() => {
    if (!point) return;
    map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 12), {
      animate: true,
      duration: 0.8,
    });
  }, [map, point]);

  return null;
}

function MetricMini({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  tone?: "slate" | "blue" | "red" | "emerald";
}) {
  const tones = {
    slate: "bg-slate-50 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-sm font-semibold ${tones[tone]}`}>
        {value}
      </div>
    </div>
  );
}

export function VillageMapPanel() {
  const { filteredVillages, filters } = useFilters();

  const [isClient, setIsClient] = useState(false);
  const [mode, setMode] = useState<MapMode>("distribution");
  const [baseMap, setBaseMap] = useState<BaseMap>("osm");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string>("");

  useEffect(() => setIsClient(true), []);

  const defaultCenter: [number, number] = [22.6, 92.2];

  const points = useMemo<VillagePoint[]>(() => {
    const out: VillagePoint[] = [];

    for (const v of filteredVillages as any[]) {
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

  const canShowCompleteness = filters.year === 2026;

  useEffect(() => {
    if (mode === "completeness" && !canShowCompleteness) setMode("distribution");
  }, [mode, canShowCompleteness]);

  const rankedPoints = useMemo(() => {
    const arr = [...points];
    if (mode === "completeness" && canShowCompleteness) {
      return arr.sort((a, b) => {
        if (b.missingMonths !== a.missingMonths) return b.missingMonths - a.missingMonths;
        return a.completenessPct - b.completenessPct;
      });
    }
    return arr.sort((a, b) => getPointLabel(a).localeCompare(getPointLabel(b)));
  }, [points, mode, canShowCompleteness]);

  const searchTerm = search.trim().toLowerCase();

  const listPoints = useMemo(() => {
    if (!searchTerm) return rankedPoints;
    return rankedPoints.filter((p) =>
      [
        p.village_code,
        p.village_name_en,
        p.union,
        p.upazila,
        p.district,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchTerm)
    );
  }, [rankedPoints, searchTerm]);

  const selectedPoint =
    points.find((p) => p.village_code === selectedKey) ||
    listPoints[0] ||
    points[0] ||
    null;

  useEffect(() => {
    if (!points.length) {
      setSelectedKey("");
      return;
    }
    if (!selectedKey || !points.some((p) => p.village_code === selectedKey)) {
      setSelectedKey(points[0].village_code);
    }
  }, [points, selectedKey]);

  const visibleCodes = useMemo(() => new Set(listPoints.map((p) => p.village_code)), [listPoints]);
  const topCodes = useMemo(
    () => new Set(rankedPoints.slice(0, 10).map((p) => p.village_code)),
    [rankedPoints]
  );

  const stats = useMemo(() => {
    const total = points.length;
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
      missingPct: total ? pct(missing, total) : 0,
      buckets,
    };
  }, [points]);

  const topSummary = useMemo(() => {
    if (!rankedPoints.length) return null;
    return rankedPoints[0];
  }, [rankedPoints]);

  const headerRight = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="hidden sm:block text-[10px] text-muted-foreground">
        Mapped villages:{" "}
        <span className="font-medium text-foreground">{stats.total.toLocaleString()}</span>
      </div>

      <Select value={mode} onValueChange={(v) => setMode(v as MapMode)}>
        <SelectTrigger className="h-8 w-[190px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-50 bg-popover">
          <SelectItem value="distribution" className="text-xs">
            Color & ranking by distribution
          </SelectItem>
          <SelectItem value="completeness" className="text-xs" disabled={!canShowCompleteness}>
            Color & ranking by completeness
          </SelectItem>
        </SelectContent>
      </Select>

      <Select value={baseMap} onValueChange={(v) => setBaseMap(v as BaseMap)}>
        <SelectTrigger className="h-8 w-[120px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-50 bg-popover">
          <SelectItem value="osm" className="text-xs">
            OSM
          </SelectItem>
          <SelectItem value="light" className="text-xs">
            Light
          </SelectItem>
          <SelectItem value="satellite" className="text-xs">
            Satellite
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  if (!isClient) return null;

  if (!points.length) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Village Map</span>
          {headerRight}
        </div>
        <div className="panel-body py-8 text-center text-sm text-muted-foreground">
          No villages with coordinates in the current filter.
        </div>
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/70 shadow-sm">
      <div className="panel-header border-b border-slate-200 bg-white px-5 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-1">
            <span className="panel-title text-xl font-semibold tracking-tight text-slate-900">
              Village Map
            </span>
            <div className="max-w-3xl text-sm leading-6 text-slate-600">
              Browse mapped villages and review the current filtered geography. Use search or select a village from the list to focus it on the map.
            </div>
            <div className="text-[11px] text-slate-500">
              {mode === "distribution"
                ? "Color & ranking use the current village distribution."
                : canShowCompleteness
                ? `Completeness is based on ${MONTHS[filters.monthStart]}–${MONTHS[filters.monthEnd]} ${filters.year}.`
                : "Completeness is available for 2026 monthly data only."}
            </div>
          </div>
          {headerRight}
        </div>
      </div>

      <div className="panel-body p-5">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="relative h-[560px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <MapContainer
              center={defaultCenter}
              zoom={8}
              scrollWheelZoom
              style={{ height: "100%", width: "100%" }}
            >
              {baseMap === "osm" && (
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              )}
              {baseMap === "light" && (
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors &copy; CARTO"
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
              )}
              {baseMap === "satellite" && (
                <TileLayer
                  attribution="Tiles &copy; Esri"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
              )}

              <FitBounds points={points} />
              <FlyToPoint point={selectedPoint} />

              {rankedPoints.map((p, idx) => {
                const isSelected = selectedPoint?.village_code === p.village_code;
                const isVisible = visibleCodes.has(p.village_code);
                const isDimmed = !!selectedPoint && !isSelected && !isVisible;
                const rank = idx;
                const style =
                  mode === "completeness" && canShowCompleteness
                    ? completenessStyle(p, isSelected, isDimmed, rank)
                    : distributionStyle(isSelected, isDimmed, rank);

                return (
                  <CircleMarker
                    key={`${p.village_code}-${p.lat}-${p.lng}`}
                    center={[p.lat, p.lng]}
                    radius={style.radius}
                    pathOptions={{
                      color: style.stroke,
                      fillColor: style.fill,
                      fillOpacity: 0.78,
                      weight: style.weight,
                      opacity: style.opacity,
                    }}
                    eventHandlers={{
                      click: () => setSelectedKey(p.village_code),
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -6]} opacity={1} sticky>
                      <div className="text-xs">
                        <div className="font-semibold">
                          {p.village_code}
                          {p.village_name_en ? ` • ${p.village_name_en}` : ""}
                        </div>
                        <div className="text-slate-500">{getLocationText(p) || "Location not specified"}</div>
                        {mode === "completeness" && canShowCompleteness ? (
                          <div className="mt-1">
                            Completeness: <b>{p.completenessPct.toFixed(0)}%</b> • Missing:{" "}
                            <b>{p.missingMonths}</b>/{p.totalMonths}
                          </div>
                        ) : (
                          <div className="mt-1">
                            {topCodes.has(p.village_code) ? "Top ranked village in current view" : "Mapped village"}
                          </div>
                        )}
                      </div>
                    </Tooltip>
                  </CircleMarker>
                );
              })}
            </MapContainer>

            <div className="absolute bottom-4 left-4 z-[1000] w-56 rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xl backdrop-blur">
              <div className="mb-2 text-sm font-semibold text-slate-900">
                {mode === "distribution" ? "Distribution view" : "Completeness view"}
              </div>
              {mode === "distribution" ? (
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3.5 w-3.5 rounded-full bg-blue-500/30 ring-2 ring-blue-500" />
                    Selected village
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3.5 w-3.5 rounded-full bg-blue-500/25" />
                    Other mapped villages
                  </div>
                  <div className="pt-1 text-[11px] text-slate-500">
                    Search or click a village to focus it.
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-xs text-slate-700">
                  {(["≥95%", "80–94%", "60–79%", "<60%"] as const).map((b) => {
                    const c = completenessColors(b);
                    return (
                      <div key={b} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-3.5 w-3.5 rounded-sm border border-slate-200"
                            style={{ background: c.fill }}
                          />
                          {b}
                        </span>
                        <span className="text-slate-500">{stats.buckets[b].toLocaleString()}</span>
                      </div>
                    );
                  })}
                  <div className="pt-1 text-[11px] text-slate-500">Bigger circles indicate more missing months.</div>
                </div>
              )}
            </div>
          </div>

          <div className="flex h-[560px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-lg font-semibold text-slate-900">Village insights</div>
              <div className="text-sm text-slate-600">
                {mode === "distribution"
                  ? "Search, select, and review mapped villages."
                  : "Selection and ranking follow completeness for the current month range."}
              </div>
            </div>

            <div className="space-y-4 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                <MetricMini label="Mapped villages" value={stats.total.toLocaleString()} tone="blue" />
                <MetricMini
                  label={mode === "distribution" ? "Search results" : "Missing data"}
                  value={
                    mode === "distribution"
                      ? listPoints.length.toLocaleString()
                      : `${stats.missing.toLocaleString()}`
                  }
                  tone={mode === "distribution" ? "slate" : "red"}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Find village</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Search by village code, name, district, upazila, or union.
                    </div>
                  </div>
                  {search ? (
                    <button
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200"
                      onClick={() => setSearch("")}
                    >
                      Clear
                    </button>
                  ) : null}
                </div>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type to search village..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>

              {selectedPoint ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Selected village
                      </div>
                      <div className="mt-2 truncate text-base font-semibold text-slate-900">
                        {getPointLabel(selectedPoint)}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {getLocationText(selectedPoint) || "Location not specified"}
                      </div>
                    </div>

                    {mode === "completeness" && canShowCompleteness ? (
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                          completenessColors(completenessBucket(selectedPoint.completenessPct)).chip
                        }`}
                      >
                        {completenessBucket(selectedPoint.completenessPct)}
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                        {selectedPoint.village_code}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <MetricMini label="Village code" value={selectedPoint.village_code} tone="slate" />
                    <MetricMini
                      label="Completeness"
                      value={`${selectedPoint.completenessPct.toFixed(0)}%`}
                      tone={selectedPoint.missingMonths > 0 ? "red" : "emerald"}
                    />
                    <MetricMini label="Missing months" value={selectedPoint.missingMonths} tone="red" />
                    <MetricMini label="Observed months" value={selectedPoint.totalMonths} tone="blue" />
                  </div>
                </div>
              ) : null}

              {topSummary ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {mode === "distribution" ? "Quick note" : "Highest priority village"}
                  </div>
                  <div className="mt-2 text-sm text-slate-700">
                    {mode === "distribution"
                      ? `Use the list below to focus any village on the map. The current search returns ${listPoints.length.toLocaleString()} village${listPoints.length === 1 ? "" : "s"}.`
                      : `${getPointLabel(topSummary)} currently has the strongest missingness signal in the filtered set.`}
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">
                    {search ? "Matching villages" : mode === "distribution" ? "Village list" : "Completeness ranking"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {mode === "distribution"
                      ? "Click a row to focus the map"
                      : "Ranked by missing months and completeness"}
                  </div>
                </div>

                <div className="space-y-2.5">
                  {listPoints.slice(0, 80).map((p, idx) => {
                    const isSelected = selectedPoint?.village_code === p.village_code;
                    const bucket = completenessBucket(p.completenessPct);

                    return (
                      <button
                        key={`${p.village_code}-${idx}`}
                        type="button"
                        onClick={() => setSelectedKey(p.village_code)}
                        className={`w-full rounded-2xl border px-3.5 py-3 text-left transition ${
                          isSelected
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium text-slate-900">
                              {getPointLabel(p)}
                            </div>
                            <div className="mt-1 text-xs leading-5 text-slate-500">
                              {p.village_code}
                              {getLocationText(p) ? ` · ${getLocationText(p)}` : ""}
                            </div>
                          </div>

                          {mode === "completeness" ? (
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                                completenessColors(bucket).chip
                              }`}
                            >
                              {p.missingMonths}/{p.totalMonths}
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                              Focus
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {!listPoints.length ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                      No village matches your search.
                    </div>
                  ) : null}
                </div>
              </div>

              {mode === "completeness" && canShowCompleteness ? (
                <div className="text-[11px] text-slate-500">
                  Period: {MONTHS[filters.monthStart]}–{MONTHS[filters.monthEnd]} {filters.year} • Complete:{" "}
                  <span className="font-medium text-emerald-700">{stats.complete.toLocaleString()}</span> • Missing:{" "}
                  <span className="font-medium text-red-700">{stats.missing.toLocaleString()}</span> (
                  {stats.missingPct.toFixed(1)}%)
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
