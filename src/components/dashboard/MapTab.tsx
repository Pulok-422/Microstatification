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
import type {
  Feature,
  FeatureCollection,
  GeoJSON as GeoJSONType,
  Geometry,
  Point,
} from "geojson";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type ClassifyField = "Case" | "API";

type GeoJsonProperties = {
  [key: string]: any;
  Case2024?: number | string;
  API?: number | string;
  name?: string;
  NAME?: string;
  village?: string;
  VILLAGE?: string;
  para?: string;
  PARA?: string;
};

type PointFeature = Feature<Point, GeoJsonProperties>;

function FitToData({
  pointData,
  boundaryData,
}: {
  pointData: FeatureCollection | null;
  boundaryData: FeatureCollection | null;
}) {
  const map = useMap();

  useEffect(() => {
    const layers: L.Layer[] = [];

    if (boundaryData?.features?.length) {
      layers.push(L.geoJSON(boundaryData as any));
    }

    if (pointData?.features?.length) {
      layers.push(L.geoJSON(pointData as any));
    }

    if (!layers.length) return;

    const group = L.featureGroup(layers);
    const bounds = group.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [pointData, boundaryData, map]);

  return null;
}

function getNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function getFeatureName(props?: GeoJsonProperties) {
  if (!props) return "Unnamed location";
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
    "Unnamed location"
  );
}

function getBoundaryName(properties?: Record<string, any>) {
  if (!properties) return "Union boundary";
  return (
    properties.name ||
    properties.NAME ||
    properties.union ||
    properties.UNION ||
    properties.un_name ||
    properties.ward ||
    properties.id ||
    "Union boundary"
  );
}

function getDemoApiValue(props?: GeoJsonProperties, index = 0): number {
  const realApi = getNumber(props?.API);
  if (realApi > 0) return realApi;

  const caseValue = getNumber(props?.Case2024);

  if (caseValue === 0) return Number((0.1 + (index % 3) * 0.1).toFixed(1));
  if (caseValue <= 5) return Number((0.5 + (index % 5) * 0.3).toFixed(1));
  if (caseValue <= 20) return Number((2 + (index % 6) * 0.8).toFixed(1));
  return Number((7 + (index % 8) * 1.5).toFixed(1));
}

function getMetricValue(
  classifyBy: ClassifyField,
  props?: GeoJsonProperties,
  index = 0
): number {
  if (classifyBy === "API") {
    return getDemoApiValue(props, index);
  }
  return getNumber(props?.Case2024);
}

function getMarkerStyle(classifyBy: ClassifyField, value: number) {
  if (classifyBy === "Case") {
    if (value >= 21) {
      return {
        radius: 15,
        fillColor: "#dc2626",
        color: "#991b1b",
        weight: 1,
        fillOpacity: 0.85,
      };
    }
    if (value >= 6) {
      return {
        radius: 12,
        fillColor: "#ea580c",
        color: "#9a3412",
        weight: 1,
        fillOpacity: 0.82,
      };
    }
    if (value >= 1) {
      return {
        radius: 9,
        fillColor: "#f59e0b",
        color: "#b45309",
        weight: 1,
        fillOpacity: 0.8,
      };
    }
    return {
      radius: 6,
      fillColor: "#facc15",
      color: "#ca8a04",
      weight: 1,
      fillOpacity: 0.78,
    };
  }

  if (value >= 10) {
    return {
      radius: 15,
      fillColor: "#dc2626",
      color: "#991b1b",
      weight: 1,
      fillOpacity: 0.85,
    };
  }
  if (value >= 5) {
    return {
      radius: 12,
      fillColor: "#ea580c",
      color: "#9a3412",
      weight: 1,
      fillOpacity: 0.82,
    };
  }
  if (value >= 1) {
    return {
      radius: 9,
      fillColor: "#f59e0b",
      color: "#b45309",
      weight: 1,
      fillOpacity: 0.8,
    };
  }
  return {
    radius: 6,
    fillColor: "#facc15",
    color: "#ca8a04",
    weight: 1,
    fillOpacity: 0.78,
  };
}

function Legend({ classifyBy }: { classifyBy: ClassifyField }) {
  const items =
    classifyBy === "Case"
      ? [
          { label: "0", color: "#facc15", size: 6 },
          { label: "1-5", color: "#f59e0b", size: 9 },
          { label: "6-20", color: "#ea580c", size: 12 },
          { label: "21+", color: "#dc2626", size: 15 },
        ]
      : [
          { label: "< 1", color: "#facc15", size: 6 },
          { label: "1-4.9", color: "#f59e0b", size: 9 },
          { label: "5-9.9", color: "#ea580c", size: 12 },
          { label: "10+", color: "#dc2626", size: 15 },
        ];

  return (
    <div className="absolute bottom-4 right-4 z-[1000] rounded-lg border border-border bg-background/95 p-3 shadow-md">
      <div className="mb-2 text-sm font-semibold">
        {classifyBy === "Case" ? "Case2024" : "API"}
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className="inline-block rounded-full border border-white/50"
              style={{
                width: item.size * 2,
                height: item.size * 2,
                backgroundColor: item.color,
              }}
            />
            <span className="text-xs text-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MapTab() {
  const [villageData, setVillageData] = useState<FeatureCollection | null>(null);
  const [boundaryData, setBoundaryData] = useState<FeatureCollection | null>(null);
  const [error, setError] = useState("");
  const [classifyBy, setClassifyBy] = useState<ClassifyField>("Case");

  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}Lama.geojson`).then((res) => {
        if (!res.ok) throw new Error(`Failed to load village GeoJSON: ${res.status}`);
        return res.json();
      }),
      fetch(`${import.meta.env.BASE_URL}lama_unions.geojson`).then((res) => {
        if (!res.ok) throw new Error(`Failed to load union boundary GeoJSON: ${res.status}`);
        return res.json();
      }),
    ])
      .then(([villageJson, boundaryJson]: [GeoJSONType, GeoJSONType]) => {
        setVillageData(villageJson as FeatureCollection);
        setBoundaryData(boundaryJson as FeatureCollection);
      })
      .catch((err) => {
        console.error(err);
        setError(String(err));
      });
  }, []);

  const pointFeatures = useMemo(() => {
    if (!villageData?.features) return [];

    return villageData.features.filter(
      (feature): feature is PointFeature =>
        feature?.type === "Feature" &&
        feature?.geometry?.type === "Point" &&
        Array.isArray(feature.geometry.coordinates)
    );
  }, [villageData]);

  const boundaryStyle = () => ({
    color: "#334155",
    weight: 1.8,
    fillOpacity: 0,
    opacity: 0.95,
  });

  const onEachBoundaryFeature = (
    feature: Feature<Geometry, Record<string, any>>,
    layer: L.Layer
  ) => {
    const props = feature?.properties || {};
    const name = getBoundaryName(props);

    if (layer instanceof L.Path) {
      layer.on({
        mouseover: (e: any) => {
          e.target.setStyle({
            weight: 3,
            color: "#0f172a",
          });
        },
        mouseout: (e: any) => {
          e.target.setStyle({
            weight: 1.8,
            color: "#334155",
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
    <div className="panel">
      <div className="panel-header flex items-center justify-between gap-3">
        <span className="panel-title">Village Map</span>

        <div className="flex items-center gap-2">
          <label htmlFor="classifyBy" className="text-sm font-medium">
            Classify by
          </label>
          <select
            id="classifyBy"
            value={classifyBy}
            onChange={(e) => setClassifyBy(e.target.value as ClassifyField)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="Case">Case</option>
            <option value="API">API</option>
          </select>
        </div>
      </div>

      <div className="panel-body">
        {error ? (
          <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <div className="relative h-[700px] w-full overflow-hidden rounded border border-border">
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

              {(villageData || boundaryData) && (
                <FitToData pointData={villageData} boundaryData={boundaryData} />
              )}

              {boundaryData && (
                <GeoJSON
                  data={boundaryData as any}
                  style={boundaryStyle}
                  onEachFeature={onEachBoundaryFeature}
                />
              )}

              {pointFeatures.map((feature, index) => {
                const [lng, lat] = feature.geometry.coordinates;
                const props = feature.properties || {};
                const name = getFeatureName(props);

                const metricValue = getMetricValue(classifyBy, props, index);
                const markerStyle = getMarkerStyle(classifyBy, metricValue);

                const caseValue = getNumber(props.Case2024);
                const apiValue = getDemoApiValue(props, index);

                return (
                  <CircleMarker
                    key={`${name}-${index}`}
                    center={[lat, lng]}
                    radius={markerStyle.radius}
                    pathOptions={{
                      color: markerStyle.color,
                      weight: markerStyle.weight,
                      fillColor: markerStyle.fillColor,
                      fillOpacity: markerStyle.fillOpacity,
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                      <div className="text-xs">
                        <div className="font-semibold">{String(name)}</div>
                        <div>Case2024: {caseValue}</div>
                        <div>API: {apiValue}</div>
                      </div>
                    </Tooltip>

                    <Popup>
                      <div className="min-w-[190px] text-sm">
                        <div className="mb-2 font-semibold">{String(name)}</div>
                        <div className="mb-1">
                          <span className="font-medium">Case2024:</span> {caseValue}
                        </div>
                        <div className="mb-1">
                          <span className="font-medium">API:</span> {apiValue}
                        </div>
                        <div className="mb-2">
                          <span className="font-medium">Classified by:</span> {classifyBy}
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

            <Legend classifyBy={classifyBy} />
          </div>
        )}
      </div>
    </div>
  );
}
