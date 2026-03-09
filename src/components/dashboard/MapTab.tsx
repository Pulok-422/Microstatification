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
      map.fitBounds(bounds, { padding: [30, 30] });
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

/* ---------------- demo values ---------------- */

function demoCase2023(props: Props, index: number) {
  if (props.Case2023 !== undefined && props.Case2023 !== null && props.Case2023 !== "") {
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

/* ---------------- styles ---------------- */

function caseStyle(v: number) {
  if (v >= 21) return { r: 15, fill: "#dc2626", stroke: "#7f1d1d" };
  if (v >= 6) return { r: 12, fill: "#ea580c", stroke: "#9a3412" };
  if (v >= 1) return { r: 9, fill: "#f59e0b", stroke: "#b45309" };
  return { r: 6, fill: "#fde047", stroke: "#a16207" };
}

function apiStyle(v: number) {
  if (v >= 10) return { r: 15, fill: "#dc2626", stroke: "#7f1d1d" };
  if (v >= 5) return { r: 12, fill: "#ea580c", stroke: "#9a3412" };
  if (v >= 1) return { r: 9, fill: "#f59e0b", stroke: "#b45309" };
  return { r: 6, fill: "#fde047", stroke: "#a16207" };
}

function diffMeta(diff: number) {
  if (diff > 0) {
    return {
      label: "Increase",
      symbol: "↑",
      fill: "#ef4444",
      stroke: "#991b1b",
      text: "#ffffff",
      radius: 13,
    };
  }
  if (diff < 0) {
    return {
      label: "Decrease",
      symbol: "↓",
      fill: "#3b82f6",
      stroke: "#1e3a8a",
      text: "#ffffff",
      radius: 13,
    };
  }
  return {
    label: "Same",
    symbol: "–",
    fill: "#9ca3af",
    stroke: "#4b5563",
    text: "#ffffff",
    radius: 12,
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
        box-shadow:0 2px 8px rgba(0,0,0,0.18);
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

/* ---------------- UI blocks ---------------- */

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
    <div className="absolute bottom-4 right-4 z-[1000] w-44 rounded-xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
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

function InfoPanel({
  mode,
  totalVillages,
  totalCase2024,
  totalCase2023,
  avgAPI,
  increased,
  decreased,
  same,
}: {
  mode: ClassifyMode;
  totalVillages: number;
  totalCase2024: number;
  totalCase2023: number;
  avgAPI: number;
  increased: number;
  decreased: number;
  same: number;
}) {
  return (
    <div className="absolute left-4 top-4 z-[1000] grid grid-cols-2 gap-2 md:grid-cols-4">
      <div className="rounded-xl border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Villages</div>
        <div className="text-lg font-semibold">{totalVillages}</div>
      </div>

      {mode === "Case" && (
        <>
          <div className="rounded-xl border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Case 2024</div>
            <div className="text-lg font-semibold">{totalCase2024}</div>
          </div>
          <div className="rounded-xl border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Case 2023</div>
            <div className="text-lg font-semibold">{totalCase2023}</div>
          </div>
        </>
      )}

      {mode === "API" && (
        <div className="rounded-xl border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Average API</div>
          <div className="text-lg font-semibold">{avgAPI.toFixed(2)}</div>
        </div>
      )}

      {mode === "Diff" && (
        <>
          <div className="rounded-xl border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Increase</div>
            <div className="text-lg font-semibold text-red-600">{increased}</div>
          </div>
          <div className="rounded-xl border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Decrease</div>
            <div className="text-lg font-semibold text-blue-600">{decreased}</div>
          </div>
          <div className="rounded-xl border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Same</div>
            <div className="text-lg font-semibold text-slate-600">{same}</div>
          </div>
        </>
      )}
    </div>
  );
}

export function MapTab() {
  const [village, setVillage] = useState<FeatureCollection | null>(null);
  const [boundary, setBoundary] = useState<FeatureCollection | null>(null);
  const [mode, setMode] = useState<ClassifyMode>("Case");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}Lama.geojson`).then((r) => {
        if (!r.ok) throw new Error(`Failed to load Lama.geojson: ${r.status}`);
        return r.json();
      }),
      fetch(`${import.meta.env.BASE_URL}lama_unions.geojson`).then((r) => {
        if (!r.ok) throw new Error(`Failed to load lama_unions.geojson: ${r.status}`);
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
      (f): f is PointFeature => f.geometry?.type === "Point" && Array.isArray(f.geometry.coordinates)
    );
  }, [village]);

  const summary = useMemo(() => {
    const totalVillages = features.length;
    const totalCase2024 = features.reduce((sum, f) => sum + getNumber(f.properties?.Case2024), 0);
    const totalCase2023 = features.reduce((sum, f, i) => sum + demoCase2023(f.properties || {}, i), 0);
    const apiValues = features.map((f, i) => demoAPI(f.properties || {}, i));
    const avgAPI = apiValues.length ? apiValues.reduce((a, b) => a + b, 0) / apiValues.length : 0;

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

    return {
      totalVillages,
      totalCase2024,
      totalCase2023,
      avgAPI,
      increased,
      decreased,
      same,
    };
  }, [features]);

  const boundaryStyle = () => ({
    color: "#334155",
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
            color: "#334155",
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

  return (
    <div className="panel overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="panel-header flex flex-col gap-3 border-b border-border/70 bg-muted/30 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-lg font-semibold">Village Map</div>
          <div className="text-sm text-muted-foreground">
            Interactive village point map with case, API, and year-to-year change view
          </div>
        </div>

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
      </div>

      <div className="panel-body p-4">
        {error ? (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <div className="relative h-[760px] w-full overflow-hidden rounded-2xl border border-border bg-background">
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

              {features.map((f, i) => {
                const [lng, lat] = f.geometry.coordinates;
                const props = f.properties || {};
                const name = getVillageName(props);

                const c24 = getNumber(props.Case2024);
                const c23 = demoCase2023(props, i);
                const api = demoAPI(props, i);
                const diff = c24 - c23;

                if (mode === "Diff") {
                  const meta = diffMeta(diff);

                  return (
                    <Marker
                      key={`diff-${i}`}
                      position={[lat, lng]}
                      icon={createDiffDivIcon(meta)}
                    >
                      <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                        <div className="text-xs">
                          <div className="font-semibold">{String(name)}</div>
                          <div>Case2024: {c24}</div>
                          <div>Case2023: {c23}</div>
                          <div>
                            Change: {meta.label} ({diff > 0 ? `+${diff}` : diff})
                          </div>
                        </div>
                      </Tooltip>

                      <Popup>
                        <div className="min-w-[220px] text-sm">
                          <div className="mb-2 text-base font-semibold">{String(name)}</div>
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
                            <span className="font-medium">Difference:</span> {meta.label} (
                            {diff > 0 ? `+${diff}` : diff})
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

                const style = mode === "Case" ? caseStyle(c24) : apiStyle(api);

                return (
                  <CircleMarker
                    key={`circle-${i}`}
                    center={[lat, lng]}
                    radius={style.r}
                    pathOptions={{
                      fillColor: style.fill,
                      color: style.stroke,
                      fillOpacity: 0.86,
                      weight: 1.2,
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                      <div className="text-xs">
                        <div className="font-semibold">{String(name)}</div>
                        <div>Case2024: {c24}</div>
                        <div>Case2023: {c23}</div>
                        <div>API: {api.toFixed(2)}</div>
                      </div>
                    </Tooltip>

                    <Popup>
                      <div className="min-w-[220px] text-sm">
                        <div className="mb-2 text-base font-semibold">{String(name)}</div>
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
                          {diff > 0 ? `Increase (+${diff})` : diff < 0 ? `Decrease (${diff})` : "Same (0)"}
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

            <InfoPanel
              mode={mode}
              totalVillages={summary.totalVillages}
              totalCase2024={summary.totalCase2024}
              totalCase2023={summary.totalCase2023}
              avgAPI={summary.avgAPI}
              increased={summary.increased}
              decreased={summary.decreased}
              same={summary.same}
            />

            <Legend mode={mode} />
          </div>
        )}
      </div>
    </div>
  );
}
