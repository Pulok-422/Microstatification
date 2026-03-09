import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  GeoJSON,
  LayersControl,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
} from "react-leaflet";
import type { Feature, FeatureCollection, Point } from "geojson";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type ClassifyMode = "Case" | "API" | "Diff";
type TopFilter = 10 | 20 | 30 | 999999;

type VillageProps = {
  VIL_N_E?: string;
  Case2024?: number | string;
  Case2023?: number | string;
  API?: number | string;
  name?: string;
  NAME?: string;
  village?: string;
  VILLAGE?: string;
  para?: string;
  PARA?: string;
  SiteName?: string;
  site_name?: string;
  id?: string | number;
  [key: string]: any;
};

type PointFeature = Feature<Point, VillageProps>;

type RankedVillage = {
  index: number;
  name: string;
  case2024: number;
  case2023: number;
  api: number;
  diff: number;
  feature: PointFeature;
};

function numberValue(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getVillageName(props: VillageProps) {
  return (
    props.VIL_N_E ||
    props.name ||
    props.NAME ||
    props.village ||
    props.VILLAGE ||
    props.para ||
    props.PARA ||
    props.SiteName ||
    props.site_name ||
    props.id ||
    "Unnamed village"
  );
}

function getBoundaryName(props: Record<string, any>) {
  return (
    props.UNION ||
    props.union ||
    props.name ||
    props.NAME ||
    props.un_name ||
    props.ward ||
    props.id ||
    "Union boundary"
  );
}

function demoCase2023(props: VillageProps, index: number) {
  if (
    props.Case2023 !== undefined &&
    props.Case2023 !== null &&
    props.Case2023 !== ""
  ) {
    return numberValue(props.Case2023);
  }

  const current = numberValue(props.Case2024);
  const offset = (index % 5) - 2;
  return Math.max(0, current - offset);
}

function demoApi(props: VillageProps, index: number) {
  if (props.API !== undefined && props.API !== null && props.API !== "") {
    return numberValue(props.API);
  }

  const cases = numberValue(props.Case2024);

  if (cases === 0) return Number((0.1 + (index % 3) * 0.1).toFixed(2));
  if (cases <= 5) return Number((0.8 + (index % 4) * 0.35).toFixed(2));
  if (cases <= 20) return Number((3 + (index % 5) * 0.9).toFixed(2));
  return Number((10 + (index % 6) * 1.4).toFixed(2));
}

function caseStyle(value: number, highlight = false) {
  const extra = highlight ? 2 : 0;

  if (value >= 21) return { radius: 15 + extra, fill: "#dc2626", stroke: "#7f1d1d" };
  if (value >= 6) return { radius: 12 + extra, fill: "#ea580c", stroke: "#9a3412" };
  if (value >= 1) return { radius: 9 + extra, fill: "#f59e0b", stroke: "#b45309" };
  return { radius: 6 + extra, fill: "#fde047", stroke: "#a16207" };
}

function apiStyle(value: number, highlight = false) {
  const extra = highlight ? 2 : 0;

  if (value >= 10) return { radius: 15 + extra, fill: "#dc2626", stroke: "#7f1d1d" };
  if (value >= 5) return { radius: 12 + extra, fill: "#ea580c", stroke: "#9a3412" };
  if (value >= 1) return { radius: 9 + extra, fill: "#f59e0b", stroke: "#b45309" };
  return { radius: 6 + extra, fill: "#fde047", stroke: "#a16207" };
}

function diffStyle(diff: number, highlight = false) {
  const radius = highlight ? 15 : 13;

  if (diff > 0) {
    return {
      label: "Increase",
      symbol: "↑",
      fill: "#ef4444",
      stroke: "#991b1b",
      text: "#ffffff",
      radius,
    };
  }

  if (diff < 0) {
    return {
      label: "Decrease",
      symbol: "↓",
      fill: "#3b82f6",
      stroke: "#1e3a8a",
      text: "#ffffff",
      radius,
    };
  }

  return {
    label: "Same",
    symbol: "–",
    fill: "#9ca3af",
    stroke: "#4b5563",
    text: "#ffffff",
    radius: highlight ? 14 : 12,
  };
}

function createDiffIcon(meta: ReturnType<typeof diffStyle>) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:${meta.radius * 2}px;
        height:${meta.radius * 2}px;
        border-radius:9999px;
        background:${meta.fill};
        border:2px solid ${meta.stroke};
        color:${meta.text};
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:18px;
        font-weight:700;
        line-height:1;
        box-shadow:0 3px 10px rgba(0,0,0,0.20);
      ">
        ${meta.symbol}
      </div>
    `,
    iconSize: [meta.radius * 2, meta.radius * 2],
    iconAnchor: [meta.radius, meta.radius],
    popupAnchor: [0, -meta.radius],
    tooltipAnchor: [0, -meta.radius],
  });
}

function FitBounds({
  village,
  boundary,
}: {
  village: FeatureCollection | null;
  boundary: FeatureCollection | null;
}) {
  const map = useMap();

  useEffect(() => {
    const layers: L.Layer[] = [];
    if (boundary) layers.push(L.geoJSON(boundary as any));
    if (village) layers.push(L.geoJSON(village as any));

    if (!layers.length) return;

    const group = L.featureGroup(layers);
    const bounds = group.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24] });
    }
  }, [village, boundary, map]);

  return null;
}

function MapLegend({ mode }: { mode: ClassifyMode }) {
  const items =
    mode === "Case"
      ? [
          { label: "0", color: "#fde047" },
          { label: "1-5", color: "#f59e0b" },
          { label: "6-20", color: "#ea580c" },
          { label: "21+", color: "#dc2626" },
        ]
      : mode === "API"
      ? [
          { label: "< 1", color: "#fde047" },
          { label: "1-4.9", color: "#f59e0b" },
          { label: "5-9.9", color: "#ea580c" },
          { label: "10+", color: "#dc2626" },
        ]
      : [
          { label: "Increase", color: "#ef4444", symbol: "↑" },
          { label: "Decrease", color: "#3b82f6", symbol: "↓" },
          { label: "Same", color: "#9ca3af", symbol: "–" },
        ];

  return (
    <div className="absolute bottom-4 left-4 z-[1000] w-44 rounded-2xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
      <div className="mb-2 text-sm font-semibold">
        {mode === "Case" ? "Case 2024" : mode === "API" ? "API" : "Yearly Change"}
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs">
            {"symbol" in item ? (
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full border text-sm font-bold text-white"
                style={{ backgroundColor: item.color }}
              >
                {item.symbol}
              </span>
            ) : (
              <span
                className="inline-block h-4 w-4 rounded-full border border-white/50"
                style={{ backgroundColor: item.color }}
              />
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightCard({
  title,
  value,
  subtitle,
  tone = "default",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  tone?: "default" | "red" | "blue" | "amber" | "slate";
}) {
  const toneClass =
    tone === "red"
      ? "bg-red-50"
      : tone === "blue"
      ? "bg-blue-50"
      : tone === "amber"
      ? "bg-amber-50"
      : tone === "slate"
      ? "bg-slate-100"
      : "bg-card";

  return (
    <div className={`rounded-2xl border border-border p-4 shadow-sm ${toneClass}`}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
      {subtitle ? <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div> : null}
    </div>
  );
}

export function MapTab() {
  const [villageData, setVillageData] = useState<FeatureCollection | null>(null);
  const [boundaryData, setBoundaryData] = useState<FeatureCollection | null>(null);
  const [mode, setMode] = useState<ClassifyMode>("Case");
  const [topCount, setTopCount] = useState<TopFilter>(20);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}Lama.geojson`).then((res) => {
        if (!res.ok) throw new Error(`Failed to load Lama.geojson: ${res.status}`);
        return res.json();
      }),
      fetch(`${import.meta.env.BASE_URL}lama_unions.geojson`).then((res) => {
        if (!res.ok) throw new Error(`Failed to load lama_unions.geojson: ${res.status}`);
        return res.json();
      }),
    ])
      .then(([villages, boundaries]) => {
        setVillageData(villages);
        setBoundaryData(boundaries);
      })
      .catch((err) => {
        console.error(err);
        setError(String(err));
      });
  }, []);

  const pointFeatures = useMemo(() => {
    if (!villageData) return [];
    return villageData.features.filter(
      (feature): feature is PointFeature =>
        feature.geometry?.type === "Point" && Array.isArray(feature.geometry.coordinates)
    );
  }, [villageData]);

  const rankedVillages = useMemo<RankedVillage[]>(() => {
    return pointFeatures
      .map((feature, index) => {
        const props = feature.properties || {};
        const case2024 = numberValue(props.Case2024);
        const case2023 = demoCase2023(props, index);
        const api = demoApi(props, index);
        const diff = case2024 - case2023;
        const name = String(getVillageName(props));

        return {
          index,
          name,
          case2024,
          case2023,
          api,
          diff,
          feature,
        };
      })
      .sort((a, b) => {
        if (mode === "Case") return b.case2024 - a.case2024;
        if (mode === "API") return b.api - a.api;
        return Math.abs(b.diff) - Math.abs(a.diff);
      });
  }, [pointFeatures, mode]);

  const visibleVillages = useMemo(() => {
    if (topCount === 999999) return rankedVillages;
    return rankedVillages.slice(0, topCount);
  }, [rankedVillages, topCount]);

  const visibleSet = useMemo(() => {
    return new Set(visibleVillages.map((item) => item.index));
  }, [visibleVillages]);

  const summary = useMemo(() => {
    const totalVillages = pointFeatures.length;
    const totalCase2024 = pointFeatures.reduce(
      (sum, feature) => sum + numberValue(feature.properties?.Case2024),
      0
    );
    const totalCase2023 = pointFeatures.reduce(
      (sum, feature, index) => sum + demoCase2023(feature.properties || {}, index),
      0
    );
    const avgApi =
      pointFeatures.length > 0
        ? pointFeatures.reduce((sum, feature, index) => sum + demoApi(feature.properties || {}, index), 0) /
          pointFeatures.length
        : 0;

    const visibleTotalCases = visibleVillages.reduce((sum, item) => sum + item.case2024, 0);
    const visibleAvgApi =
      visibleVillages.length > 0
        ? visibleVillages.reduce((sum, item) => sum + item.api, 0) / visibleVillages.length
        : 0;

    const increaseCount = visibleVillages.filter((item) => item.diff > 0).length;
    const decreaseCount = visibleVillages.filter((item) => item.diff < 0).length;
    const sameCount = visibleVillages.filter((item) => item.diff === 0).length;

    return {
      totalVillages,
      totalCase2024,
      totalCase2023,
      avgApi,
      visibleTotalCases,
      visibleAvgApi,
      increaseCount,
      decreaseCount,
      sameCount,
    };
  }, [pointFeatures, visibleVillages]);

  const boundaryStyle = () => ({
    color: "#475569",
    weight: 1.4,
    fillOpacity: 0,
    opacity: 0.95,
    dashArray: "4 4",
  });

  const rightPanelTitle =
    mode === "Case"
      ? `Top ${topCount === 999999 ? "All" : topCount} villages by Case`
      : mode === "API"
      ? `Top ${topCount === 999999 ? "All" : topCount} villages by API`
      : `Top ${topCount === 999999 ? "All" : topCount} villages by yearly change`;

  return (
    <div className="panel overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="border-b border-border/70 bg-muted/30 px-4 py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-lg font-semibold">Village Map</div>
            <div className="text-sm text-muted-foreground">
              Explore Lama villages by case burden, API, and year-to-year change
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Classify by</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as ClassifyMode)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none"
              >
                <option value="Case">Case</option>
                <option value="API">API</option>
                <option value="Diff">Difference from previous year</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <select
                value={String(topCount)}
                onChange={(e) => setTopCount(Number(e.target.value) as TopFilter)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none"
              >
                <option value="10">Top 10</option>
                <option value="20">Top 20</option>
                <option value="30">Top 30</option>
                <option value="999999">All villages</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        {error ? (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="relative h-[780px] overflow-hidden rounded-2xl border border-border bg-background">
              <MapContainer
                center={[22.1, 92.1]}
                zoom={10}
                zoomControl={false}
                scrollWheelZoom={true}
                className="h-full w-full"
              >
                <ZoomControl position="topleft" />

                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name="OpenStreetMap">
                    <TileLayer
                      attribution="&copy; OpenStreetMap contributors"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                  </LayersControl.BaseLayer>

                  <LayersControl.BaseLayer name="CartoDB Light">
                    <TileLayer
                      attribution="&copy; OpenStreetMap contributors &copy; CARTO"
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />
                  </LayersControl.BaseLayer>

                  <LayersControl.BaseLayer name="CartoDB Dark">
                    <TileLayer
                      attribution="&copy; OpenStreetMap contributors &copy; CARTO"
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />
                  </LayersControl.BaseLayer>

                  <LayersControl.BaseLayer name="Satellite">
                    <TileLayer
                      attribution="Tiles &copy; Esri"
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                  </LayersControl.BaseLayer>
                </LayersControl>

                <FitBounds village={villageData} boundary={boundaryData} />

                {boundaryData && (
                  <GeoJSON
                    data={boundaryData as any}
                    style={boundaryStyle}
                    onEachFeature={(feature: any, layer: L.Layer) => {
                      const props = feature?.properties || {};
                      const name = getBoundaryName(props);

                      if (layer instanceof L.Path) {
                        layer.on({
                          mouseover: (e: any) => {
                            e.target.setStyle({
                              weight: 2.2,
                              color: "#0f172a",
                              dashArray: "",
                            });
                          },
                          mouseout: (e: any) => {
                            e.target.setStyle({
                              weight: 1.4,
                              color: "#475569",
                              dashArray: "4 4",
                            });
                          },
                        });
                      }

                      layer.bindTooltip(String(name), { sticky: true });
                    }}
                  />
                )}

                {visibleVillages.map((item, rank) => {
                  const feature = item.feature;
                  const [lng, lat] = feature.geometry.coordinates;
                  const props = feature.properties || {};
                  const highlight = visibleSet.has(item.index);

                  if (mode === "Diff") {
                    const meta = diffStyle(item.diff, highlight);

                    return (
                      <Marker
                        key={`diff-${item.index}`}
                        position={[lat, lng]}
                        icon={createDiffIcon(meta)}
                      >
                        <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                          <div className="text-xs">
                            <div className="font-semibold">
                              #{rank + 1} {item.name}
                            </div>
                            <div>Case 2024: {item.case2024}</div>
                            <div>Case 2023: {item.case2023}</div>
                            <div>
                              Change: {meta.label} ({item.diff > 0 ? `+${item.diff}` : item.diff})
                            </div>
                          </div>
                        </Tooltip>

                        <Popup>
                          <div className="min-w-[220px] text-sm">
                            <div className="mb-2 text-base font-semibold">
                              #{rank + 1} {item.name}
                            </div>
                            <div className="mb-1">
                              <span className="font-medium">Case 2024:</span> {item.case2024}
                            </div>
                            <div className="mb-1">
                              <span className="font-medium">Case 2023:</span> {item.case2023}
                            </div>
                            <div className="mb-1">
                              <span className="font-medium">API:</span> {item.api.toFixed(2)}
                            </div>
                            <div className="mb-2">
                              <span className="font-medium">Difference:</span> {meta.label} (
                              {item.diff > 0 ? `+${item.diff}` : item.diff})
                            </div>

                            {Object.entries(props).map(([key, value]) => (
                              <div key={key} className="mb-1 break-words">
                                <span className="font-medium">{key}:</span>{" "}
                                {value === null || value === undefined || value === ""
                                  ? "-"
                                  : String(value)}
                              </div>
                            ))}
                          </div>
                        </Popup>
                      </Marker>
                    );
                  }

                  const style =
                    mode === "Case"
                      ? caseStyle(item.case2024, highlight)
                      : apiStyle(item.api, highlight);

                  return (
                    <CircleMarker
                      key={`circle-${item.index}`}
                      center={[lat, lng]}
                      radius={style.radius}
                      pathOptions={{
                        fillColor: style.fill,
                        color: style.stroke,
                        fillOpacity: 0.88,
                        weight: highlight ? 2 : 1.2,
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                        <div className="text-xs">
                          <div className="font-semibold">
                            #{rank + 1} {item.name}
                          </div>
                          <div>Case 2024: {item.case2024}</div>
                          <div>Case 2023: {item.case2023}</div>
                          <div>API: {item.api.toFixed(2)}</div>
                        </div>
                      </Tooltip>

                      <Popup>
                        <div className="min-w-[220px] text-sm">
                          <div className="mb-2 text-base font-semibold">
                            #{rank + 1} {item.name}
                          </div>
                          <div className="mb-1">
                            <span className="font-medium">Case 2024:</span> {item.case2024}
                          </div>
                          <div className="mb-1">
                            <span className="font-medium">Case 2023:</span> {item.case2023}
                          </div>
                          <div className="mb-1">
                            <span className="font-medium">API:</span> {item.api.toFixed(2)}
                          </div>
                          <div className="mb-2">
                            <span className="font-medium">Difference:</span>{" "}
                            {item.diff > 0
                              ? `Increase (+${item.diff})`
                              : item.diff < 0
                              ? `Decrease (${item.diff})`
                              : "Same (0)"}
                          </div>

                          {Object.entries(props).map(([key, value]) => (
                            <div key={key} className="mb-1 break-words">
                              <span className="font-medium">{key}:</span>{" "}
                              {value === null || value === undefined || value === ""
                                ? "-"
                                : String(value)}
                            </div>
                          ))}
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>

              <MapLegend mode={mode} />
            </div>

            <div className="flex h-[780px] flex-col overflow-hidden rounded-2xl border border-border bg-background">
              <div className="border-b border-border bg-muted/30 p-4">
                <div className="text-lg font-semibold">Insights</div>
                <div className="text-sm text-muted-foreground">{rightPanelTitle}</div>
              </div>

              <div className="space-y-4 overflow-y-auto p-4">
                <div className="grid grid-cols-2 gap-3">
                  <InsightCard
                    title="Total villages"
                    value={summary.totalVillages}
                    subtitle="All village points in the dataset"
                  />
                  <InsightCard
                    title="Showing"
                    value={visibleVillages.length}
                    subtitle="Visible on the current map"
                  />
                </div>

                {mode === "Case" && (
                  <div className="grid grid-cols-1 gap-3">
                    <InsightCard
                      title="Total Case 2024"
                      value={summary.totalCase2024}
                      subtitle="Across all villages"
                      tone="red"
                    />
                    <InsightCard
                      title="Visible village cases"
                      value={summary.visibleTotalCases}
                      subtitle="Sum of villages currently displayed"
                      tone="amber"
                    />
                  </div>
                )}

                {mode === "API" && (
                  <div className="grid grid-cols-1 gap-3">
                    <InsightCard
                      title="Average API"
                      value={summary.avgApi.toFixed(2)}
                      subtitle="Across all villages"
                      tone="amber"
                    />
                    <InsightCard
                      title="Visible average API"
                      value={summary.visibleAvgApi.toFixed(2)}
                      subtitle="For villages currently displayed"
                      tone="default"
                    />
                  </div>
                )}

                {mode === "Diff" && (
                  <div className="grid grid-cols-1 gap-3">
                    <InsightCard
                      title="Increase"
                      value={summary.increaseCount}
                      subtitle="Visible villages with higher cases than previous year"
                      tone="red"
                    />
                    <InsightCard
                      title="Decrease"
                      value={summary.decreaseCount}
                      subtitle="Visible villages with lower cases than previous year"
                      tone="blue"
                    />
                    <InsightCard
                      title="Same"
                      value={summary.sameCount}
                      subtitle="Visible villages with unchanged cases"
                      tone="slate"
                    />
                  </div>
                )}

                <div className="rounded-2xl border border-border p-4 shadow-sm">
                  <div className="mb-3 text-sm font-semibold">Top villages</div>
                  <div className="space-y-2">
                    {visibleVillages.map((item, idx) => (
                      <div key={`${item.name}-${idx}`} className="rounded-xl border border-border/70 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium">
                              #{idx + 1} {item.name}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Case 2024: {item.case2024} | Case 2023: {item.case2023} | API:{" "}
                              {item.api.toFixed(2)}
                            </div>
                          </div>

                          {mode === "Diff" ? (
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${
                                item.diff > 0
                                  ? "bg-red-100 text-red-700"
                                  : item.diff < 0
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {item.diff > 0 ? `↑ +${item.diff}` : item.diff < 0 ? `↓ ${item.diff}` : "– 0"}
                            </span>
                          ) : mode === "API" ? (
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                              API {item.api.toFixed(2)}
                            </span>
                          ) : (
                            <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                              {item.case2024} cases
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-border p-4 shadow-sm">
                  <div className="mb-2 text-sm font-semibold">Notes</div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div>Village labels are taken from the <span className="font-medium text-foreground">VIL_N_E</span> field.</div>
                    <div>The map shows the selected top-ranked villages based on the current classification.</div>
                    <div>Union boundaries are displayed as hollow outlines behind village points.</div>
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
