import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Popup,
  Tooltip,
} from "react-leaflet";
import L from "leaflet";
import type { GeoJSON as GeoJSONType } from "geojson";
import "leaflet/dist/leaflet.css";

import lamaGeojsonUrl from "@/assets/Lama.geojson?url";

export function MapTab() {
  const [geojsonData, setGeojsonData] = useState<GeoJSONType | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    const loadGeojson = async () => {
      try {
        const res = await fetch(lamaGeojsonUrl);
        const data = await res.json();
        setGeojsonData(data);
      } catch (error) {
        console.error("Failed to load Lama.geojson:", error);
      }
    };

    loadGeojson();
  }, []);

  const defaultStyle = useMemo<L.PathOptions>(
    () => ({
      color: "#2563eb",
      weight: 1.5,
      fillColor: "#60a5fa",
      fillOpacity: 0.35,
    }),
    []
  );

  const highlightStyle = useMemo<L.PathOptions>(
    () => ({
      color: "#1d4ed8",
      weight: 3,
      fillColor: "#3b82f6",
      fillOpacity: 0.55,
    }),
    []
  );

  const onEachFeature = (
    feature: any,
    layer: L.Layer
  ) => {
    if (!(layer instanceof L.Path)) return;

    const props = feature?.properties || {};

    const villageName =
      props.name ||
      props.NAME ||
      props.village ||
      props.Village ||
      props.VILLAGE ||
      props.para ||
      props.Para ||
      props.id ||
      "Unnamed area";

    layer.on({
      mouseover: (e) => {
        const target = e.target as L.Path;
        target.setStyle(highlightStyle);
        target.bringToFront();
      },
      mouseout: (e) => {
        const target = e.target as L.Path;
        geoJsonLayerRef.current?.resetStyle(target);
      },
      click: (e) => {
        const target = e.target as L.Path;
        target.openPopup();
      },
    });

    layer.bindTooltip(String(villageName), {
      sticky: true,
      direction: "top",
    });

    layer.bindPopup(`
      <div style="min-width:180px">
        <div style="font-weight:600; margin-bottom:6px;">${villageName}</div>
        ${Object.entries(props)
          .map(
            ([key, value]) =>
              `<div><strong>${key}:</strong> ${String(value ?? "")}</div>`
          )
          .join("")}
      </div>
    `);
  };

  const handleGeoJsonReady = (layer: L.GeoJSON) => {
    geoJsonLayerRef.current = layer;

    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      const map = layer._map;
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Village Map</span>
      </div>

      <div className="panel-body">
        <div className="h-[650px] w-full overflow-hidden rounded border border-border">
          <MapContainer
            center={[22.0, 92.2]}
            zoom={11}
            scrollWheelZoom={true}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {geojsonData && (
              <GeoJSON
                data={geojsonData}
                style={() => defaultStyle}
                onEachFeature={onEachFeature}
                ref={(ref) => {
                  if (ref) handleGeoJsonReady(ref);
                }}
              />
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
