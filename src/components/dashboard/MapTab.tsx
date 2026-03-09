import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import type { GeoJSON as GeoJSONType } from "geojson";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type PropsFeature = {
  properties?: Record<string, any>;
};

function FitBounds({ data }: { data: GeoJSONType | null }) {
  const map = useMap();

  useEffect(() => {
    if (!data) return;

    const layer = L.geoJSON(data as any);
    const bounds = layer.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [data, map]);

  return null;
}

export function MapTab() {
  const [geojsonData, setGeojsonData] = useState<GeoJSONType | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetch("/Lama.geojson")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load GeoJSON: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => setGeojsonData(data))
      .catch((err) => {
        console.error(err);
        setError(String(err));
      });
  }, []);

  const style = () => ({
    color: "#2563eb",
    weight: 1.5,
    fillColor: "#60a5fa",
    fillOpacity: 0.35,
  });

  const onEachFeature = (feature: PropsFeature, layer: L.Layer) => {
    if (!(layer instanceof L.Path)) return;

    const props = feature?.properties || {};
    const name =
      props.name ||
      props.NAME ||
      props.village ||
      props.VILLAGE ||
      props.para ||
      props.PARA ||
      "Unnamed area";

    layer.bindTooltip(String(name), { sticky: true });

    layer.bindPopup(`
      <div style="min-width:180px">
        <strong>${String(name)}</strong>
      </div>
    `);

    layer.on({
      mouseover: (e: any) => {
        e.target.setStyle({
          weight: 3,
          fillOpacity: 0.55,
        });
      },
      mouseout: (e: any) => {
        e.target.setStyle({
          weight: 1.5,
          fillOpacity: 0.35,
        });
      },
    });
  };

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
          <div className="h-[650px] w-full overflow-hidden rounded border border-border">
            <MapContainer
              center={[22.1, 92.1]}
              zoom={10}
              scrollWheelZoom={true}
              className="h-full w-full"
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {geojsonData && <FitBounds data={geojsonData} />}

              {geojsonData && (
                <GeoJSON
                  data={geojsonData as any}
                  style={style}
                  onEachFeature={onEachFeature}
                />
              )}
            </MapContainer>
          </div>
        )}
      </div>
    </div>
  );
}
