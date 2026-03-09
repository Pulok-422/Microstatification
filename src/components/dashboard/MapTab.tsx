import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  GeoJSON,
  LayersControl,
  MapContainer,
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
  Case2024?: number;
  Case2023?: number;
  API?: number;
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

    if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });
  }, [village, boundary, map]);

  return null;
}

function getNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/* -------- DEMO DATA GENERATION -------- */

function demoCase2023(props: Props, index: number) {
  if (props.Case2023 !== undefined) return getNumber(props.Case2023);

  const case2024 = getNumber(props.Case2024);

  const variation = (index % 5) - 2; // -2 to +2
  return Math.max(0, case2024 - variation);
}

function demoAPI(props: Props, index: number) {
  if (props.API !== undefined) return getNumber(props.API);

  const c = getNumber(props.Case2024);

  if (c === 0) return 0.1 + (index % 3) * 0.1;
  if (c <= 5) return 0.8 + (index % 4) * 0.3;
  if (c <= 20) return 3 + (index % 5);
  return 10 + (index % 5) * 1.5;
}

/* -------- CLASSIFICATION -------- */

function caseStyle(v: number) {
  if (v >= 21) return { r: 15, c: "#dc2626", s: "#7f1d1d" };
  if (v >= 6) return { r: 12, c: "#ea580c", s: "#9a3412" };
  if (v >= 1) return { r: 9, c: "#f59e0b", s: "#b45309" };
  return { r: 6, c: "#fde047", s: "#a16207" };
}

function apiStyle(v: number) {
  if (v >= 10) return { r: 15, c: "#dc2626", s: "#7f1d1d" };
  if (v >= 5) return { r: 12, c: "#ea580c", s: "#9a3412" };
  if (v >= 1) return { r: 9, c: "#f59e0b", s: "#b45309" };
  return { r: 6, c: "#fde047", s: "#a16207" };
}

function diffStyle(diff: number) {
  if (diff > 0)
    return { r: 12, c: "#ef4444", s: "#7f1d1d", label: "Increase" };

  if (diff < 0)
    return { r: 12, c: "#3b82f6", s: "#1e3a8a", label: "Decrease" };

  return { r: 10, c: "#9ca3af", s: "#374151", label: "Same" };
}

/* -------- LEGEND -------- */

function Legend({ mode }: { mode: ClassifyMode }) {
  let items: any[] = [];

  if (mode === "Case") {
    items = [
      ["0", "#fde047"],
      ["1-5", "#f59e0b"],
      ["6-20", "#ea580c"],
      ["21+", "#dc2626"],
    ];
  }

  if (mode === "API") {
    items = [
      ["<1", "#fde047"],
      ["1-4.9", "#f59e0b"],
      ["5-9.9", "#ea580c"],
      ["10+", "#dc2626"],
    ];
  }

  if (mode === "Diff") {
    items = [
      ["Increase", "#ef4444"],
      ["Decrease", "#3b82f6"],
      ["Same", "#9ca3af"],
    ];
  }

  return (
    <div className="absolute bottom-4 right-4 z-[1000] rounded bg-white p-3 shadow">
      <div className="text-sm font-semibold mb-2">{mode}</div>
      {items.map(([l, c]) => (
        <div key={l} className="flex items-center gap-2 text-xs mb-1">
          <span
            style={{ background: c }}
            className="w-4 h-4 rounded-full inline-block"
          />
          {l}
        </div>
      ))}
    </div>
  );
}

export function MapTab() {
  const [village, setVillage] = useState<FeatureCollection | null>(null);
  const [boundary, setBoundary] = useState<FeatureCollection | null>(null);
  const [mode, setMode] = useState<ClassifyMode>("Case");

  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}Lama.geojson`).then((r) => r.json()),
      fetch(`${import.meta.env.BASE_URL}lama_unions.geojson`).then((r) =>
        r.json()
      ),
    ]).then(([v, b]) => {
      setVillage(v);
      setBoundary(b);
    });
  }, []);

  const features = useMemo(() => {
    if (!village) return [];
    return village.features.filter(
      (f): f is PointFeature => f.geometry?.type === "Point"
    );
  }, [village]);

  return (
    <div className="panel">
      <div className="panel-header flex justify-between">
        <span className="panel-title">Village Map</span>

        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as ClassifyMode)}
          className="border px-2 py-1 rounded text-sm"
        >
          <option value="Case">Case</option>
          <option value="API">API</option>
          <option value="Diff">Diff from previous year</option>
        </select>
      </div>

      <div className="panel-body">
        <div className="relative h-[700px] w-full rounded border">
          <MapContainer
            center={[22.1, 92.1]}
            zoom={10}
            zoomControl={false}
            className="h-full w-full"
          >
            <ZoomControl position="topleft" />

            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="OpenStreetMap">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              </LayersControl.BaseLayer>

              <LayersControl.BaseLayer name="Carto Light">
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
              </LayersControl.BaseLayer>

              <LayersControl.BaseLayer name="Carto Dark">
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              </LayersControl.BaseLayer>

              <LayersControl.BaseLayer name="Satellite">
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
              </LayersControl.BaseLayer>
            </LayersControl>

            <FitBounds village={village} boundary={boundary} />

            {/* UNION BOUNDARY */}
            {boundary && (
              <GeoJSON
                data={boundary as any}
                style={{ color: "#374151", weight: 2, fillOpacity: 0 }}
              />
            )}

            {/* POINTS */}
            {features.map((f, i) => {
              const [lng, lat] = f.geometry.coordinates;

              const p = f.properties || {};

              const c24 = getNumber(p.Case2024);
              const c23 = demoCase2023(p, i);
              const api = demoAPI(p, i);

              let style;

              if (mode === "Case") style = caseStyle(c24);
              else if (mode === "API") style = apiStyle(api);
              else style = diffStyle(c24 - c23);

              return (
                <CircleMarker
                  key={i}
                  center={[lat, lng]}
                  radius={style.r}
                  pathOptions={{
                    fillColor: style.c,
                    color: style.s,
                    fillOpacity: 0.85,
                    weight: 1,
                  }}
                >
                  <Tooltip>
                    <div className="text-xs">
                      Case2024: {c24}
                      <br />
                      Case2023: {c23}
                      <br />
                      API: {api.toFixed(2)}
                    </div>
                  </Tooltip>

                  <Popup>
                    <b>Case2024:</b> {c24}
                    <br />
                    <b>Case2023:</b> {c23}
                    <br />
                    <b>API:</b> {api.toFixed(2)}
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>

          <Legend mode={mode} />
        </div>
      </div>
    </div>
  );
}
