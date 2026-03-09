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

type Props = {
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

type PointFeature = Feature<Point, Props>;

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
      map.fitBounds(bounds, { padding: [25, 25] });
    }
  }, [village, boundary, map]);

  return null;
}

function getNumber(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getVillageName(props: Props) {
  return (
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
    props.name ||
    props.NAME ||
    props.union ||
    props.UNION ||
    props.un_name ||
    props.ward ||
    props.id ||
    "Union boundary"
  );
}

function demoCase2023(props: Props, index: number) {
  if (
    props.Case2023 !== undefined &&
    props.Case2023 !== null &&
    props.Case2023 !== ""
  ) {
    return getNumber(props.Case2023);
  }

  const c24 = getNumber(props.Case2024);
  const offset = (index % 5) - 2;
  return Math.max(0, c24 - offset);
}

function demoAPI(props: Props, index: number) {
  if (props.API !== undefined && props.API !== null && props.API !== "") {
    return getNumber(props.API);
  }

  const c24 = getNumber(props.Case2024);

  if (c24 === 0) return Number((0.1 + (index % 3) * 0.1).toFixed(2));
  if (c24 <= 5) return Number((0.8 + (index % 4) * 0.35).toFixed(2));
  if (c24 <= 20) return Number((3 + (index % 5) * 0.9).toFixed(2));
  return Number((10 + (index % 6) * 1.4).toFixed(2));
}

function caseStyle(v: number, isTopVillage: boolean) {
  const boost = isTopVillage ? 2 : 0;

  if (v >= 21) return { r: 15 + boost, fill: "#dc2626", stroke: "#7f1d1d" };
  if (v >= 6) return { r: 12 + boost, fill: "#ea580c", stroke: "#9a3412" };
  if (v >= 1) return { r: 9 + boost, fill: "#f59e0b", stroke: "#b45309" };
  return { r: 6 + boost, fill: "#fde047", stroke: "#a16207" };
}

function apiStyle(v: number, isTopVillage: boolean) {
  const boost = isTopVillage ? 2 : 0;

  if (v >= 10) return { r: 15 + boost, fill: "#dc2626", stroke: "#7f1d1d" };
  if (v >= 5) return { r: 12 + boost, fill: "#ea580c", stroke: "#9a3412" };
  if (v >= 1) return { r: 9 + boost, fill: "#f59e0b", stroke: "#b45309" };
  return { r: 6 + boost, fill: "#fde047", stroke: "#a16207" };
}

function diffMeta(diff: number, isTopVillage: boolean) {
  const radius = isTopVillage ? 15 : 13;

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
    radius: isTopVillage ? 14 : 12,
  };
}

function createDiffDivIcon(meta: ReturnType<typeof diffMeta>) {
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
        box-shadow:0 2px 10px rgba(0,0,0,0.20);
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

function Legend({ mode }: { mode: ClassifyMode }) {
  const content =
    mode === "Case"
      ? [
          { label: "0", color: "#fde047", symbol: "" },
          { label: "1-5", color: "#f59e0b", symbol: "" },
          { label: "6-20", color: "#ea580c", symbol: "" },
          { label: "21+", color: "#dc2626", symbol: "" },
        ]
      : mode === "API"
      ? [
          { label: "< 1", color: "#fde047", symbol: "" },
          { label: "1-4.9", color: "#f59e0b", symbol: "" },
          { label: "5-9.9", color: "#ea580c", symbol: "" },
          { label: "10+", color: "#dc2626", symbol: "" },
        ]
      : [
          { label: "Increase", color: "#ef4444", symbol: "↑" },
          { label: "Decrease", color: "#3b82f6", symbol: "↓" },
          { label: "Same", color: "#9ca3af", symbol: "–" },
        ];

  return (
    <div className="absolute bottom-4 left-4 z-[1000] w-44 rounded-xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
      <div className="mb-2 text-sm font-semibold">
        {mode === "Case" ? "Case2024" : mode === "API" ? "API" : "Difference"}
      </div>
      <div className="space-y-2">
        {content.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs">
            {mode === "Diff" ? (
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

type RankedVillage = {
  index: number;
  name: string;
  case2024: number;
  case2023: number;
  api: number;
  diff: number;
  feature: PointFeature;
};

export function MapTab() {
  const [village, setVillage] = useState<FeatureCollection | null>(null);
  const [boundary, setBoundary] = useState<FeatureCollection | null>(null);
  const [mode, setMode] = useState<ClassifyMode>("Case");
  const [topCount, setTopCount] = useState<TopFilter>(20);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}Lama.geojson`).then((r) => {
        if (!r.ok) throw new Error(`Failed to load Lama.geojson: ${r.status}`);
        return r.json();
      }),
      fetch(`${import.meta.env.BASE_URL}lama_unions.geojson`).then((r) => {
        if (!r.ok) {
          throw new Error(`Failed to load lama_unions.geojson: ${r.status}`);
        }
        return r.json();
      }),
    ])
      .then(([v, b]) => {
        setVillage(v);
        setBoundary(b);
      })
      .catch((err) => {
        console.error(err);
        setError(String(err));
      });
  }, []);

  const features = useMemo(() => {
    if (!village) return [];
    return village.features.filter(
      (f): f is PointFeature =>
        f.geometry?.type === "Point" && Array.isArray(f.geometry.coordinates)
    );
  }, [village]);

  const rankedVillages = useMemo<RankedVillage[]>(() => {
    return features
      .map((f, i) => {
        const props = f.properties || {};
        const case2024 = getNumber(props.Case2024);
        const case2023 = demoCase2023(props, i);
        const api = demoAPI(props, i);
        const diff = case2024 - case2023;
        const name = String(getVillageName(props));

        return {
          index: i,
          name,
          case2024,
          case2023,
          api,
          diff,
          feature: f,
        };
      })
      .sort((a, b) => {
        if (mode === "Case") return b.case2024 - a.case2024;
        if (mode === "API") return b.api - a.api;
        return Math.abs(b.diff) - Math.abs(a.diff);
      });
  }, [features, mode]);

  const visibleVillages = useMemo(() => {
    if (topCount === 999999) return rankedVillages;
    return rankedVillages.slice(0, topCount);
  }, [rankedVillages, topCount]);

  const visibleIndexSet = useMemo(() => {
    return new Set(visibleVillages.map((v) => v.index));
  }, [visibleVillages]);

  const summary = useMemo(() => {
    const totalVillages = features.length;
    const totalCase2024 = features.reduce(
      (sum, f) => sum + getNumber(f.properties?.Case2024),
      0
    );
    const totalCase2023 = features.reduce(
      (sum, f, i) => sum + demoCase2023(f.properties || {}, i),
      0
    );
    const apiValues = features.map((f, i) => demoAPI(f.properties || {}, i));
    const avgAPI = apiValues.length
      ? apiValues.reduce((a, b) => a + b, 0) / apiValues.length
      : 0;

    let increased = 0;
    let decreased = 0;
    let same = 0;

    features.forEach((f, i) => {
      const c24 = getNumber(f.properties?.Case2024);
      const c23 = demoCase2023(f.properties || {}, i);
      const diff = c24 - c23;
      if (diff > 0) increased += 1;
      else if (diff < 0) decreased += 1;
      else same += 1;
    });

    const topTotalCase = visibleVillages.reduce((sum, v) => sum + v.case2024, 0);
    const topAvgAPI = visibleVillages.length
      ? visibleVillages.reduce((sum, v) => sum + v.api, 0) / visibleVillages.length
      : 0;
    const topIncrease = visibleVillages.filter((v) => v.diff > 0).length;
    const topDecrease = visibleVillages.filter((v) => v.diff < 0).length;
    const topSame = visibleVillages.filter((v) => v.diff === 0).length;

    return {
      totalVillages,
      totalCase2024,
      totalCase2023,
      avgAPI,
      increased,
      decreased,
      same,
      topTotalCase,
      topAvgAPI,
      topIncrease,
      topDecrease,
      topSame,
    };
  }, [features, visibleVillages]);

  const boundaryStyle = () => ({
    color: "#475569",
    weight: 1.5,
    fillOpacity: 0,
    opacity: 0.95,
    dashArray: "4 4",
  });

  const onEachBoundaryFeature = (feature: any, layer: L.Layer) => {
    const props = feature?.properties || {};
    const name = getBoundaryName(props);

    if (layer instanceof L.Path) {
      layer.on({
        mouseover: (e: any) => {
          e.target.setStyle({
            weight: 2.5,
            color: "#0f172a",
            dashArray: "",
          });
        },
        mouseout: (e: any) => {
          e.target.setStyle({
            weight: 1.5,
            color: "#475569",
            dashArray: "4 4",
          });
        },
      });
    }

    layer.bindTooltip(String(name), { sticky: true });
    layer.bindPopup(`
      <div style="min-width:160px">
        <div style="font-weight:600;">${String(name)}</div>
      </div>
    `);
  };

  const rightPanelTitle =
    mode === "Case"
      ? `Top ${topCount === 999999 ? "All" : topCount} Villages by Case`
      : mode === "API"
      ? `Top ${topCount === 999999 ? "All" : topCount} Villages by API`
      : `Top ${topCount === 999999 ? "All" : topCount} Villages by Yearly Change`;

  return (
    <div className="panel overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="panel-header flex flex-col gap-3 border-b border-border/70 bg-muted/30 px-4 py-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="text-lg font-semibold">Village Map</div>
          <div className="text-sm text-muted-foreground">
            Interactive village surveillance map with ranked insights
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Classify by</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ClassifyMode)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none"
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
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none"
            >
              <option value="10">Top 10</option>
              <option value="20">Top 20</option>
              <option value="30">Top 30</option>
              <option value="999999">All</option>
            </select>
          </div>
        </div>
      </div>

      <div className="panel-body p-4">
        {error ? (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="relative h-[780px] w-full overflow-hidden rounded-2xl border border-border bg-background">
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

                <FitBounds village={village} boundary={boundary} />

                {boundary && (
                  <GeoJSON
                    data={boundary as any}
                    style={boundaryStyle}
                    onEachFeature={onEachBoundaryFeature}
                  />
                )}

                {visibleVillages.map((item, rank) => {
                  const f = item.feature;
                  const [lng, lat] = f.geometry.coordinates;
                  const props = f.properties || {};
                  const name = item.name;
                  const c24 = item.case2024;
                  const c23 = item.case2023;
                  const api = item.api;
                  const diff = item.diff;
                  const isTopVillage = visibleIndexSet.has(item.index);

                  if (mode === "Diff") {
                    const meta = diffMeta(diff, isTopVillage);

                    return (
                      <Marker
                        key={`diff-${item.index}`}
                        position={[lat, lng]}
                        icon={createDiffDivIcon(meta)}
                      >
                        <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                          <div className="text-xs">
                            <div className="font-semibold">
                              #{rank + 1} {String(name)}
                            </div>
                            <div>Case2024: {c24}</div>
                            <div>Case2023: {c23}</div>
                            <div>
                              Change: {meta.label} ({diff > 0 ? `+${diff}` : diff})
                            </div>
                          </div>
                        </Tooltip>

                        <Popup>
                          <div className="min-w-[220px] text-sm">
                            <div className="mb-2 text-base font-semibold">
                              #{rank + 1} {String(name)}
                            </div>
                            <div className="mb-1">
                              <span className="font-medium">Case2024:</span> {c24}
                            </div>
                            <div className="mb-1">
                              <span className="font-medium">Case2023:</span> {c23}
                            </div>
                            <div className="mb-1">
                              <span className="font-medium">API:</span> {api.toFixed(2)}
                            </div>
                            <div className="mb-2">
                              <span className="font-medium">Difference:</span>{" "}
                              {meta.label} ({diff > 0 ? `+${diff}` : diff})
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
                      ? caseStyle(c24, isTopVillage)
                      : apiStyle(api, isTopVillage);

                  return (
                    <CircleMarker
                      key={`circle-${item.index}`}
                      center={[lat, lng]}
                      radius={style.r}
                      pathOptions={{
                        fillColor: style.fill,
                        color: style.stroke,
                        fillOpacity: 0.88,
                        weight: isTopVillage ? 2 : 1.2,
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                        <div className="text-xs">
                          <div className="font-semibold">
                            #{rank + 1} {String(name)}
                          </div>
                          <div>Case2024: {c24}</div>
                          <div>Case2023: {c23}</div>
                          <div>API: {api.toFixed(2)}</div>
                        </div>
                      </Tooltip>

                      <Popup>
                        <div className="min-w-[220px] text-sm">
                          <div className="mb-2 text-base font-semibold">
                            #{rank + 1} {String(name)}
                          </div>
                          <div className="mb-1">
                            <span className="font-medium">Case2024:</span> {c24}
                          </div>
                          <div className="mb-1">
                            <span className="font-medium">Case2023:</span> {c23}
                          </div>
                          <div className="mb-1">
                            <span className="font-medium">API:</span> {api.toFixed(2)}
                          </div>
                          <div className="mb-2">
                            <span className="font-medium">Difference:</span>{" "}
                            {diff > 0
                              ? `Increase (+${diff})`
                              : diff < 0
                              ? `Decrease (${diff})`
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

              <Legend mode={mode} />
            </div>

            <div className="flex h-[780px] flex-col overflow-hidden rounded-2xl border border-border bg-background">
              <div className="border-b border-border bg-muted/30 p-4">
                <div className="text-lg font-semibold">Insights</div>
                <div className="text-sm text-muted-foreground">{rightPanelTitle}</div>
              </div>

              <div className="space-y-3 overflow-y-auto p-4">
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="mb-3 text-sm font-semibold">Overview</div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">Total villages</div>
                      <div className="text-2xl font-semibold">{summary.totalVillages}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Showing on map</div>
                      <div className="text-2xl font-semibold">{visibleVillages.length}</div>
                    </div>
                  </div>
                </div>

                {mode === "Case" && (
                  <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="mb-3 text-sm font-semibold">Case insights</div>
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="text-muted-foreground">Total Case2024</div>
                        <div className="text-xl font-semibold">{summary.totalCase2024}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">
                          Cases in visible top villages
                        </div>
                        <div className="text-xl font-semibold">{summary.topTotalCase}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Total Case2023</div>
                        <div className="text-xl font-semibold">{summary.totalCase2023}</div>
                      </div>
                    </div>
                  </div>
                )}

                {mode === "API" && (
                  <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="mb-3 text-sm font-semibold">API insights</div>
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="text-muted-foreground">Average API, all villages</div>
                        <div className="text-xl font-semibold">{summary.avgAPI.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">
                          Average API, visible villages
                        </div>
                        <div className="text-xl font-semibold">
                          {summary.topAvgAPI.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {mode === "Diff" && (
                  <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="mb-3 text-sm font-semibold">Change insights</div>
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg bg-red-50 p-3">
                          <div className="text-xs text-muted-foreground">Increase</div>
                          <div className="text-xl font-semibold text-red-600">
                            {summary.topIncrease}
                          </div>
                        </div>
                        <div className="rounded-lg bg-blue-50 p-3">
                          <div className="text-xs text-muted-foreground">Decrease</div>
                          <div className="text-xl font-semibold text-blue-600">
                            {summary.topDecrease}
                          </div>
                        </div>
                        <div className="rounded-lg bg-slate-100 p-3">
                          <div className="text-xs text-muted-foreground">Same</div>
                          <div className="text-xl font-semibold text-slate-600">
                            {summary.topSame}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Counts above are for currently visible ranked villages.
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="mb-3 text-sm font-semibold">Top villages</div>
                  <div className="space-y-2">
                    {visibleVillages.map((v, idx) => (
                      <div
                        key={`${v.name}-${idx}`}
                        className="rounded-lg border border-border/70 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium">
                              #{idx + 1} {v.name}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Case2024: {v.case2024} | Case2023: {v.case2023} | API:{" "}
                              {v.api.toFixed(2)}
                            </div>
                          </div>

                          {mode === "Diff" ? (
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${
                                v.diff > 0
                                  ? "bg-red-100 text-red-700"
                                  : v.diff < 0
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {v.diff > 0 ? `↑ +${v.diff}` : v.diff < 0 ? `↓ ${v.diff}` : "– 0"}
                            </span>
                          ) : mode === "API" ? (
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                              API {v.api.toFixed(2)}
                            </span>
                          ) : (
                            <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                              {v.case2024} cases
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="mb-2 text-sm font-semibold">How this view works</div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div>
                      The map currently displays only the selected top-ranked villages.
                    </div>
                    <div>
                      Ranking is based on the selected classification: Case, API, or
                      absolute year-to-year difference.
                    </div>
                    <div>
                      Union boundaries are shown as hollow outlines behind village points.
                    </div>
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
