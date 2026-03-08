import mapImage from "@/assets/map-reference.png";

export function MapTab() {
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Village Map</span>
      </div>
      <div className="panel-body flex justify-center">
        <img
          src={mapImage}
          alt="Village case count map"
          className="w-full max-w-4xl rounded border border-border"
        />
      </div>
    </div>
  );
}
