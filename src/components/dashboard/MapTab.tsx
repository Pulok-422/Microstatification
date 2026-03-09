import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  LayersControl,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
} from "react-leaflet";
import type { GeoJSON as GeoJSONType, FeatureCollection, Point } from "geojson";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type GeoJsonProperties = {
  [key: string]: any;
  Case2024?: number | string;
  name?: string;
  NAME?: string;
  village?: string;
  VILLAGE?: string;
  para?: string;
  PARA?: string;
};

type PointFeature = {
  type: "Feature";
  geometry: Point;
  properties?: GeoJsonProperties;
};

function FitToData({ data }: { data: FeatureCollection | null }) {
  const map = useMap();

  useEffect(() => {
    if (!data || !data.features?.length) return;

    const bounds = L.latLngBounds(
      data.features
        .filter(
          (f: any) =>
            f?.geometry?.type === "Point" &&
            Array.isArray(f?.geometry?.coordinates) &&
            f.geometry.coordinates.length >= 2
        )
        .map((f: any) => [
          f.geometry.coordinates[1],
          f.geometry.coordinates[0],
        ] as [number, number])
    );

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [data, map]);

  return null;
}

function Legend() {
  const items = [
    { label: "0", color: "#facc15", size: 6 },
    { label: "1-5", color: "#f59e0b", size: 9 },
    { label: "6-20", color: "#ea580c", size: 12 },
    { label: "21+", color: "#dc2626", size: 15 },
  ];

  return (
    <div className="absolute bottom-4 right-4 z-[1000] rounded-lg border border-border bg-background/95 p-3 shadow-md">
      <div className="mb-2 text-sm font-semibold">Case2024</div>
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

function getCaseValue(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function getMarkerStyle(caseValue: number) {
  if (caseValue >= 21) {
    return {
      radius: 15,
      fillColor: "#dc2626",
      color: "#991b1b",
      weight: 1,
      fillOpacity: 0.85,
    };
  }

  if (caseValue >= 6) {
    return {
      radius: 12,
      fillColor: "#ea580c",
      color: "#9a3412",
      weight: 1,
      fillOpacity: 0.82,
    };
  }

  if (caseValue >= 1) {
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

export function MapTab() {
  const [geojsonData, setGeojsonData] = useState<FeatureCollection | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}Lama.geojson`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load GeoJSON: ${res.status}`);
        }
        return res.json();
      })
      .then((data: GeoJSONType) => {
        setGeojsonData(data as FeatureCollection);
      })
      .catch((err) => {
        console.error(err);
        setError(String(err));
      });
  }, []);

  const pointFeatures = useMemo(() => {
    if (!geojsonData?.features) return [];

    return geojsonData.features.filter(
      (feature): feature is PointFeature =>
        feature?.type === "Feature" &&
        feature?.geometry?.type === "Point" &&
        Array.isArray(feature.geometry.coordinates)
    );
  }, [geojsonData]);

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Village Map</span>
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
                    attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  />
                </LayersControl.BaseLayer>

                <LayersControl.BaseLayer name="CartoDB Dark">
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors &copy; CARTO'
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

              {geojsonData && <FitToData data={geojsonData} />}

              {pointFeatures.map((feature, index) => {
                const [lng, lat] = feature.geometry.coordinates;
                const props = feature.properties || {};
                const caseValue = getCaseValue(props.Case2024);
                const markerStyle = getMarkerStyle(caseValue);
                const name = getFeatureName(props);

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
                      </div>
                    </Tooltip>

                    <Popup>
                      <div className="min-w-[180px] text-sm">
                        <div className="mb-2 font-semibold">{String(name)}</div>
                        <div className="mb-1">
                          <span className="font-medium">Case2024:</span> {caseValue}
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

            <Legend />
          </div>
        )}
      </div>
    </div>
  );
}
