// MapTab.tsx
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
type BaseMap = "osm" | "light" | "dark" | "satellite";

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

type HistoryPoint = {
  year: number;
  case: number;
  api: number;
};

type RankedVillage = {
  index: number;
  name: string;
  case2024: number;
  case2023: number;
  api: number;
  diff: number;
  feature: PointFeature;
  history: HistoryPoint[];
};

function numberValue(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
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

function getVillageLocation(props: VillageProps) {
  return [props.union, props.upazila, props.district].filter(Boolean).join(" • ");
}

function seededNoise(index: number, salt = 1) {
  const x = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
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
  const pattern = index % 7;
  const noise = seededNoise(index, 2);

  if (current === 0) {
    return pattern === 0 ? 1 : 0;
  }

  if (current <= 3) {
    return Math.max(0, Math.round(current + (pattern - 3) * 0.4 + noise));
  }

  if (current <= 10) {
    const shift = [-3, -2, -1, 0, 1, 2, 4][pattern];
    return Math.max(0, Math.round(current - shift + noise * 2 - 1));
  }

  if (current <= 25) {
    const factor = [0.7, 0.82, 0.95, 1.05, 1.12, 1.22, 0.9][pattern];
    return Math.max(0, Math.round(current * factor + noise * 3 - 1));
  }

  const factor = [0.62, 0.78, 0.88, 0.98, 1.08, 1.18, 1.28][pattern];
  return Math.max(0, Math.round(current * factor + noise * 4 - 2));
}

function demoApi(props: VillageProps, index: number) {
  if (props.API !== undefined && props.API !== null && props.API !== "") {
    return numberValue(props.API);
  }

  const cases = numberValue(props.Case2024);
  const noise = seededNoise(index, 3);
  const pattern = index % 8;

  if (cases === 0) {
    return Number((0.05 + pattern * 0.08 + noise * 0.15).toFixed(2));
  }

  if (cases <= 4) {
    return Number((0.45 + pattern * 0.22 + noise * 0.35).toFixed(2));
  }

  if (cases <= 12) {
    return Number((1.8 + pattern * 0.45 + noise * 0.8).toFixed(2));
  }

  if (cases <= 25) {
    return Number((4.2 + pattern * 0.8 + noise * 1.2).toFixed(2));
  }

  return Number((8 + pattern * 1.15 + noise * 1.75).toFixed(2));
}

function buildDemoHistory(
  case2023: number,
  case2024: number,
  api2024: number,
  index: number
) {
  const pattern = index % 10;
  const noise1 = seededNoise(index, 11);
  const noise2 = seededNoise(index, 17);
  const noise3 = seededNoise(index, 23);
  const noise4 = seededNoise(index, 29);

  const trendType =
    pattern < 2
      ? "surge"
      : pattern < 4
      ? "decline"
      : pattern < 6
      ? "volatile"
      : pattern < 8
      ? "steady-up"
      : "steady-down";

  let case2022 = case2023;
  let case2021 = case2023;
  let case2020 = case2023;

  if (trendType === "surge") {
    case2022 = Math.max(0, Math.round(case2023 * (0.55 + noise1 * 0.2)));
    case2021 = Math.max(0, Math.round(case2022 * (0.75 + noise2 * 0.15)));
    case2020 = Math.max(0, Math.round(case2021 * (0.8 + noise3 * 0.12)));
  } else if (trendType === "decline") {
    case2022 = Math.max(0, Math.round(case2023 * (1.2 + noise1 * 0.25)));
    case2021 = Math.max(0, Math.round(case2022 * (1.08 + noise2 * 0.18)));
    case2020 = Math.max(0, Math.round(case2021 * (1.06 + noise3 * 0.14)));
  } else if (trendType === "volatile") {
    case2022 = Math.max(
      0,
      Math.round(case2023 + (noise1 > 0.5 ? 1 : -1) * (2 + noise2 * 8))
    );
    case2021 = Math.max(
      0,
      Math.round(case2022 + (noise3 > 0.5 ? 1 : -1) * (2 + noise4 * 9))
    );
    case2020 = Math.max(
      0,
      Math.round(case2021 + (noise1 > 0.3 ? -1 : 1) * (1 + noise2 * 7))
    );
  } else if (trendType === "steady-up") {
    case2022 = Math.max(0, Math.round(case2023 * (0.84 + noise1 * 0.08)));
    case2021 = Math.max(0, Math.round(case2022 * (0.84 + noise2 * 0.08)));
    case2020 = Math.max(0, Math.round(case2021 * (0.86 + noise3 * 0.08)));
  } else {
    case2022 = Math.max(0, Math.round(case2023 * (1.08 + noise1 * 0.1)));
    case2021 = Math.max(0, Math.round(case2022 * (1.06 + noise2 * 0.08)));
    case2020 = Math.max(0, Math.round(case2021 * (1.04 + noise3 * 0.08)));
  }

  if (case2024 === 0) {
    case2023 = clamp(case2023, 0, 2);
    case2022 = clamp(case2022, 0, 3);
    case2021 = clamp(case2021, 0, 4);
    case2020 = clamp(case2020, 0, 5);
  }

  const apiScale = (
    caseVal: number,
    baseCase: number,
    baseApi: number,
    localNoise: number
  ) => {
    if (baseCase <= 0) {
      return Number(
        Math.max(0.05, baseApi * (0.65 + localNoise * 0.35)).toFixed(2)
      );
    }
    const ratio = (caseVal + 1) / (baseCase + 1);
    return Number(
      Math.max(0.05, baseApi * ratio * (0.88 + localNoise * 0.25)).toFixed(2)
    );
  };

  const api2023 = apiScale(case2023, case2024, api2024, noise1);
  const api2022 = apiScale(case2022, case2024, api2024, noise2);
  const api2021 = apiScale(case2021, case2024, api2024, noise3);
  const api2020 = apiScale(case2020, case2024, api2024, noise4);

  return [
    { year: 2020, case: Math.max(0, case2020), api: api2020 },
    { year: 2021, case: Math.max(0, case2021), api: api2021 },
    { year: 2022, case: Math.max(0, case2022), api: api2022 },
    { year: 2023, case: Math.max(0, case2023), api: api2023 },
    { year: 2024, case: Math.max(0, case2024), api: Number(api2024.toFixed(2)) },
  ];
}

function caseStyle(value: number, isSelected = false, isDimmed = false, rank = 999) {
  const topBoost = rank < 3 ? 2 : rank < 10 ? 1 : 0;
  const baseExtra = isSelected ? 2 : 0;

  if (value >= 21) {
    return {
      radius: 12.5 + topBoost + baseExtra,
      fill: "#C2410C",
      stroke: "#7C2D12",
      opacity: isDimmed ? 0.25 : 1,
      weight: isSelected ? 2.5 : 1.4,
    };
  }
  if (value >= 6) {
    return {
      radius: 10.5 + topBoost + baseExtra,
      fill: "#D97706",
      stroke: "#92400E",
      opacity: isDimmed ? 0.25 : 1,
      weight: isSelected ? 2.5 : 1.4,
    };
  }
  if (value >= 1) {
    return {
      radius: 8.5 + topBoost + baseExtra,
      fill: "#CA8A04",
      stroke: "#854D0E",
      opacity: isDimmed ? 0.25 : 1,
      weight: isSelected ? 2.5 : 1.4,
    };
  }
  return {
    radius: 6.5 + topBoost + baseExtra,
    fill: "#CBD5E1",
    stroke: "#64748B",
    opacity: isDimmed ? 0.25 : 1,
    weight: isSelected ? 2.5 : 1.4,
  };
}

function apiStyle(value: number, isSelected = false, isDimmed = false, rank = 999) {
  const topBoost = rank < 3 ? 2 : rank < 10 ? 1 : 0;
  const baseExtra = isSelected ? 2 : 0;

  if (value >= 10) {
    return {
      radius: 12.5 + topBoost + baseExtra,
      fill: "#0F766E",
      stroke: "#134E4A",
      opacity: isDimmed ? 0.25 : 1,
      weight: isSelected ? 2.5 : 1.4,
    };
  }
  if (value >= 5) {
    return {
      radius: 10.5 + topBoost + baseExtra,
      fill: "#0EA5A4",
      stroke: "#155E75",
      opacity: isDimmed ? 0.25 : 1,
      weight: isSelected ? 2.5 : 1.4,
    };
  }
  if (value >= 1) {
    return {
      radius: 8.5 + topBoost + baseExtra,
      fill: "#38BDF8",
      stroke: "#1D4ED8",
      opacity: isDimmed ? 0.25 : 1,
      weight: isSelected ? 2.5 : 1.4,
    };
  }
  return {
    radius: 6.5 + topBoost + baseExtra,
    fill: "#CBD5E1",
    stroke: "#64748B",
    opacity: isDimmed ? 0.25 : 1,
    weight: isSelected ? 2.5 : 1.4,
  };
}

function diffStyle(diff: number, isSelected = false, rank = 999) {
  const base = isSelected ? 14.5 : 12;
  const topBoost = rank < 3 ? 2 : rank < 10 ? 1 : 0;

  if (diff > 0) {
    return {
      label: "Increase",
      symbol: "↑",
      fill: "#B91C1C",
      stroke: "#7F1D1D",
      text: "#FFFFFF",
      radius: base + topBoost,
    };
  }

  if (diff < 0) {
    return {
      label: "Decrease",
      symbol: "↓",
      fill: "#1D4ED8",
      stroke: "#1E3A8A",
      text: "#FFFFFF",
      radius: base + topBoost,
    };
  }

  return {
    label: "No change",
    symbol: "–",
    fill: "#64748B",
    stroke: "#334155",
    text: "#FFFFFF",
    radius: base - 0.5 + topBoost,
  };
}

function createDiffIcon(meta: ReturnType<typeof diffStyle>, isDimmed = false) {
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
        font-size:16px;
        font-weight:700;
        line-height:1;
        box-shadow:0 6px 18px rgba(15,23,42,0.18);
        opacity:${isDimmed ? 0.28 : 1};
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
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [village, boundary, map]);

  return null;
}

function FlyToVillage({ village }: { village: RankedVillage | null }) {
  const map = useMap();

  useEffect(() => {
    if (!village) return;
    const [lng, lat] = village.feature.geometry.coordinates;
    map.flyTo([lat, lng], Math.max(map.getZoom(), 12), {
      animate: true,
      duration: 0.8,
    });
  }, [map, village]);

  return null;
}

function MapLegend({ mode }: { mode: ClassifyMode }) {
  const items =
    mode === "Case"
      ? [
          { label: "0", color: "#CBD5E1" },
          { label: "1-5", color: "#CA8A04" },
          { label: "6-20", color: "#D97706" },
          { label: "21+", color: "#C2410C" },
        ]
      : mode === "API"
      ? [
          { label: "< 1", color: "#CBD5E1" },
          { label: "1-4.9", color: "#38BDF8" },
          { label: "5-9.9", color: "#0EA5A4" },
          { label: "10+", color: "#0F766E" },
        ]
      : [
          { label: "Increase", color: "#B91C1C", symbol: "↑" },
          { label: "Decrease", color: "#1D4ED8", symbol: "↓" },
          { label: "No change", color: "#64748B", symbol: "–" },
        ];

  return (
    <div className="absolute bottom-4 left-4 z-[1000] w-44 rounded-2xl border border-slate-200/90 bg-white/95 p-3 shadow-lg backdrop-blur">
      <div className="mb-2 text-sm font-semibold text-slate-900">
        {mode === "Case"
          ? "Case 2024"
          : mode === "API"
          ? "API"
          : "Year-on-year change"}
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2.5 text-xs text-slate-700"
          >
            {"symbol" in item ? (
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full border border-white/50 text-xs font-bold text-white"
                style={{ backgroundColor: item.color }}
              >
                {item.symbol}
              </span>
            ) : (
              <span
                className="inline-block h-3.5 w-3.5 rounded-full border border-white/70 shadow-sm"
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

function MetricCard({
  title,
  value,
  subtitle,
  accent = "slate",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: "slate" | "orange" | "teal" | "blue" | "red";
}) {
  const accentMap = {
    slate: {
      bar: "bg-slate-500",
      badge: "bg-slate-50 text-slate-700",
    },
    orange: {
      bar: "bg-orange-600",
      badge: "bg-orange-50 text-orange-700",
    },
    teal: {
      bar: "bg-teal-600",
      badge: "bg-teal-50 text-teal-700",
    },
    blue: {
      bar: "bg-blue-600",
      badge: "bg-blue-50 text-blue-700",
    },
    red: {
      bar: "bg-red-700",
      badge: "bg-red-50 text-red-700",
    },
  }[accent];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className={`absolute inset-x-0 top-0 h-1 ${accentMap.bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {title}
          </div>
          <div className="mt-1.5 text-2xl font-semibold leading-none text-slate-900">
            {value}
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${accentMap.badge}`}
        >
          KPI
        </span>
      </div>
      {subtitle ? (
        <div className="mt-2 text-[11px] leading-5 text-slate-500">{subtitle}</div>
      ) : null}
    </div>
  );
}

function formatDiff(diff: number) {
  if (diff > 0) return `+${diff}`;
  return `${diff}`;
}

function getTrendStroke(history: HistoryPoint[]) {
  const first = history[0]?.case ?? 0;
  const last = history[history.length - 1]?.case ?? 0;

  if (last > first) return "#DC2626";
  if (last < first) return "#2563EB";
  return "#64748B";
}

function getTrendPreviewCount(topCount: TopFilter, visibleLength: number) {
  if (visibleLength === 0) return 0;
  if (topCount === 10) return Math.min(10, visibleLength);
  if (topCount === 20) return Math.min(8, visibleLength);
  if (topCount === 30) return Math.min(6, visibleLength);
  return 0;
}

function CompactSparkline({
  history,
  active,
}: {
  history: HistoryPoint[];
  active?: boolean;
}) {
  const width = 176;
  const height = 68;
  const padLeft = 8;
  const padRight = 8;
  const padTop = 18;
  const padBottom = 16;

  const values = history.map((d) => d.case);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = Math.max(1, maxValue - minValue);
  const stroke = getTrendStroke(history);

  const x = (i: number) =>
    padLeft + (i / Math.max(1, history.length - 1)) * (width - padLeft - padRight);

  const y = (value: number) =>
    padTop + ((maxValue - value) / range) * (height - padTop - padBottom);

  const path = history
    .map((point, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(point.case)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-[68px] w-[176px] shrink-0"
      role="img"
      aria-label="Village trend sparkline"
    >
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={active ? 2.8 : 2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {history.map((point, i) => (
        <g key={`${point.year}-${point.case}-${i}`}>
          <circle
            cx={x(i)}
            cy={y(point.case)}
            r={i === history.length - 1 ? 2.7 : 2.1}
            fill={stroke}
            opacity={i === history.length - 1 ? 1 : 0.85}
          />
          <text
            x={x(i)}
            y={Math.max(10, y(point.case) - 5)}
            textAnchor="middle"
            fontSize="8.5"
            fontWeight="600"
            fill="#334155"
          >
            {point.case}
          </text>
          <text
            x={x(i)}
            y={height - 3}
            textAnchor="middle"
            fontSize="8.5"
            fill="#64748B"
          >
            {point.year}
          </text>
        </g>
      ))}
    </svg>
  );
}

function TrendRow({
  village,
  rank,
  isActive,
  onSelect,
}: {
  village: RankedVillage;
  rank: number;
  isActive: boolean;
  onSelect: () => void;
}) {
  const diffTone =
    village.diff > 0
      ? "bg-red-50 text-red-700"
      : village.diff < 0
      ? "bg-blue-50 text-blue-700"
      : "bg-slate-100 text-slate-700";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border px-3 py-2.5 text-left transition ${
        isActive
          ? "border-blue-300 bg-blue-50"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-[1.35]">
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              #{rank}
            </span>
            <div
              className="text-sm font-medium leading-5 text-slate-900"
              title={village.name}
            >
              {village.name}
            </div>
          </div>

          <div className="mt-1.5 space-y-1 text-[11px] text-slate-500">
            <div>2024: {village.case2024}</div>
            <div>2023: {village.case2023}</div>
            <div>API: {village.api.toFixed(2)}</div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <CompactSparkline history={village.history} active={isActive} />
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${diffTone}`}
          >
            {village.diff > 0
              ? `↑ ${formatDiff(village.diff)}`
              : village.diff < 0
              ? `↓ ${formatDiff(village.diff)}`
              : "– 0"}
          </span>
        </div>
      </div>
    </button>
  );
}

export function MapTab() {
  const [villageData, setVillageData] = useState<FeatureCollection | null>(null);
  const [boundaryData, setBoundaryData] = useState<FeatureCollection | null>(null);
  const [mode, setMode] = useState<ClassifyMode>("Case");
  const [topCount, setTopCount] = useState<TopFilter>(999999);
  const [baseMap, setBaseMap] = useState<BaseMap>("light");
  const [selectedVillageIndex, setSelectedVillageIndex] = useState<number | null>(null);
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
        feature.geometry?.type === "Point" &&
        Array.isArray(feature.geometry.coordinates)
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
        const history = buildDemoHistory(case2023, case2024, api, index);

        return {
          index,
          name,
          case2024,
          case2023,
          api,
          diff,
          feature,
          history,
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

  useEffect(() => {
    if (!visibleVillages.length) {
      setSelectedVillageIndex(null);
      return;
    }
    if (
      selectedVillageIndex === null ||
      !visibleVillages.some((item) => item.index === selectedVillageIndex)
    ) {
      setSelectedVillageIndex(visibleVillages[0].index);
    }
  }, [visibleVillages, selectedVillageIndex]);

  const selectedVillage =
    visibleVillages.find((item) => item.index === selectedVillageIndex) || null;

  const summary = useMemo(() => {
    const totalVillages = pointFeatures.length;
    const totalCase2024 = pointFeatures.reduce(
      (sum, feature) => sum + numberValue(feature.properties?.Case2024),
      0
    );
    const avgApi =
      pointFeatures.length > 0
        ? pointFeatures.reduce(
            (sum, feature, index) => sum + demoApi(feature.properties || {}, index),
            0
          ) / pointFeatures.length
        : 0;

    const visibleTotalCases = visibleVillages.reduce(
      (sum, item) => sum + item.case2024,
      0
    );
    const visibleAvgApi =
      visibleVillages.length > 0
        ? visibleVillages.reduce((sum, item) => sum + item.api, 0) /
          visibleVillages.length
        : 0;

    const increaseCount = visibleVillages.filter((item) => item.diff > 0).length;
    const decreaseCount = visibleVillages.filter((item) => item.diff < 0).length;
    const sameCount = visibleVillages.filter((item) => item.diff === 0).length;

    return {
      totalVillages,
      totalCase2024,
      avgApi,
      visibleTotalCases,
      visibleAvgApi,
      increaseCount,
      decreaseCount,
      sameCount,
    };
  }, [pointFeatures, visibleVillages]);

  const trendPreviewCount = useMemo(
    () => getTrendPreviewCount(topCount, visibleVillages.length),
    [topCount, visibleVillages.length]
  );

  const trendPreviewVillages = useMemo(
    () => visibleVillages.slice(0, trendPreviewCount),
    [visibleVillages, trendPreviewCount]
  );

  const showTrendPreview = topCount !== 999999 && trendPreviewVillages.length > 0;

  const rightPanelTitle =
    mode === "Case"
      ? "Village case summary"
      : mode === "API"
      ? "Village API summary"
      : "Village change summary";

  const helperText =
    topCount === 999999
      ? "All villages are shown. Click any village on the map to focus it."
      : `Top villages are selected based on the current color mode: ${mode}.`;

  const boundaryStyle = () => ({
    color: "#64748B",
    weight: 1.2,
    fillOpacity: 0,
    opacity: 0.95,
    dashArray: "5 5",
  });

  return (
    <div className="panel overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/70 shadow-sm">
      <div className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-1">
            <div className="text-xl font-semibold tracking-tight text-slate-900">
              Village Map Panel
            </div>
            <div className="max-w-3xl text-sm leading-6 text-slate-600">
              Explore Lama villages by case burden, API, or year-on-year change.
              Click villages on the map or trend rows to focus them.
            </div>
            <div className="text-[11px] text-slate-500">{helperText}</div>
          </div>

          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Color & ranking by
              </div>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as ClassifyMode)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
              >
                <option value="Case">Case</option>
                <option value="API">API</option>
                <option value="Diff">Difference from previous year</option>
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Show villages
              </div>
              <select
                value={String(topCount)}
                onChange={(e) => setTopCount(Number(e.target.value) as TopFilter)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
              >
                <option value="999999">All villages</option>
                <option value="10">Top 10</option>
                <option value="20">Top 20</option>
                <option value="30">Top 30</option>
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Base map
              </div>
              <select
                value={baseMap}
                onChange={(e) => setBaseMap(e.target.value as BaseMap)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
              >
                <option value="light">Light</option>
                <option value="osm">OpenStreetMap</option>
                <option value="dark">Dark</option>
                <option value="satellite">Satellite</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            Total villages: {summary.totalVillages}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            Visible now: {visibleVillages.length}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            Total cases 2024: {summary.totalCase2024}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            Average API: {summary.avgApi.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="p-4">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_460px]">
            <div className="relative h-[760px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <MapContainer
                center={[22.1, 92.1]}
                zoom={10}
                zoomControl={false}
                scrollWheelZoom={true}
                className="h-full w-full"
              >
                <ZoomControl position="topleft" />

                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked={baseMap === "osm"} name="OpenStreetMap">
                    <TileLayer
                      attribution="&copy; OpenStreetMap contributors"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                  </LayersControl.BaseLayer>

                  <LayersControl.BaseLayer checked={baseMap === "light"} name="CartoDB Light">
                    <TileLayer
                      attribution="&copy; OpenStreetMap contributors &copy; CARTO"
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />
                  </LayersControl.BaseLayer>

                  <LayersControl.BaseLayer checked={baseMap === "dark"} name="CartoDB Dark">
                    <TileLayer
                      attribution="&copy; OpenStreetMap contributors &copy; CARTO"
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />
                  </LayersControl.BaseLayer>

                  <LayersControl.BaseLayer checked={baseMap === "satellite"} name="Satellite">
                    <TileLayer
                      attribution="Tiles &copy; Esri"
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                  </LayersControl.BaseLayer>
                </LayersControl>

                <FitBounds village={villageData} boundary={boundaryData} />
                <FlyToVillage village={selectedVillage} />

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
                              weight: 1.8,
                              color: "#334155",
                              dashArray: "",
                            });
                          },
                          mouseout: (e: any) => {
                            e.target.setStyle({
                              weight: 1.2,
                              color: "#64748B",
                              dashArray: "5 5",
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
                  const isSelected = selectedVillage?.index === item.index;
                  const isDimmed = !!selectedVillage && !isSelected;
                  const locationText = getVillageLocation(props);

                  if (mode === "Diff") {
                    const meta = diffStyle(item.diff, isSelected, rank);

                    return (
                      <Marker
                        key={`diff-${item.index}`}
                        position={[lat, lng]}
                        icon={createDiffIcon(meta, isDimmed)}
                        eventHandlers={{
                          click: () => setSelectedVillageIndex(item.index),
                        }}
                      >
                        <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                          <div className="text-xs">
                            <div className="font-semibold">
                              #{rank + 1} {item.name}
                            </div>
                            <div>Case 2024: {item.case2024}</div>
                            <div>Case 2023: {item.case2023}</div>
                            <div>
                              Change: {meta.label} ({formatDiff(item.diff)})
                            </div>
                          </div>
                        </Tooltip>

                        <Popup>
                          <div className="min-w-[250px] text-sm text-slate-700">
                            <div className="mb-3">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                Village overview
                              </div>
                              <div className="mt-1 text-base font-semibold text-slate-900">
                                #{rank + 1} {item.name}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {locationText || "Administrative location not available"}
                              </div>
                            </div>

                            <div className="mb-3 grid grid-cols-2 gap-2">
                              <div className="rounded-xl bg-slate-50 px-3 py-2">
                                <div className="text-[10px] uppercase text-slate-500">Case 2024</div>
                                <div className="mt-1 font-semibold text-slate-900">{item.case2024}</div>
                              </div>
                              <div className="rounded-xl bg-slate-50 px-3 py-2">
                                <div className="text-[10px] uppercase text-slate-500">Case 2023</div>
                                <div className="mt-1 font-semibold text-slate-900">{item.case2023}</div>
                              </div>
                              <div className="rounded-xl bg-slate-50 px-3 py-2">
                                <div className="text-[10px] uppercase text-slate-500">API</div>
                                <div className="mt-1 font-semibold text-slate-900">{item.api.toFixed(2)}</div>
                              </div>
                              <div className="rounded-xl bg-slate-50 px-3 py-2">
                                <div className="text-[10px] uppercase text-slate-500">Difference</div>
                                <div className="mt-1 font-semibold text-slate-900">
                                  {meta.label} ({formatDiff(item.diff)})
                                </div>
                              </div>
                            </div>

                            <details className="rounded-xl border border-slate-200 bg-white p-2">
                              <summary className="cursor-pointer text-xs font-medium text-slate-700">
                                More details
                              </summary>
                              <div className="mt-2 space-y-1 text-xs">
                                {Object.entries(props).map(([key, value]) => (
                                  <div key={key} className="break-words">
                                    <span className="font-medium">{key}:</span>{" "}
                                    {value === null || value === undefined || value === ""
                                      ? "-"
                                      : String(value)}
                                  </div>
                                ))}
                              </div>
                            </details>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  }

                  const style =
                    mode === "Case"
                      ? caseStyle(item.case2024, isSelected, isDimmed, rank)
                      : apiStyle(item.api, isSelected, isDimmed, rank);

                  return (
                    <CircleMarker
                      key={`circle-${item.index}`}
                      center={[lat, lng]}
                      radius={style.radius}
                      pathOptions={{
                        fillColor: style.fill,
                        color: style.stroke,
                        fillOpacity: 0.9,
                        weight: style.weight,
                        opacity: style.opacity,
                      }}
                      eventHandlers={{
                        click: () => setSelectedVillageIndex(item.index),
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
                        <div className="min-w-[250px] text-sm text-slate-700">
                          <div className="mb-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                              Village overview
                            </div>
                            <div className="mt-1 text-base font-semibold text-slate-900">
                              #{rank + 1} {item.name}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {locationText || "Administrative location not available"}
                            </div>
                          </div>

                          <div className="mb-3 grid grid-cols-2 gap-2">
                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <div className="text-[10px] uppercase text-slate-500">Case 2024</div>
                              <div className="mt-1 font-semibold text-slate-900">{item.case2024}</div>
                            </div>
                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <div className="text-[10px] uppercase text-slate-500">Case 2023</div>
                              <div className="mt-1 font-semibold text-slate-900">{item.case2023}</div>
                            </div>
                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <div className="text-[10px] uppercase text-slate-500">API</div>
                              <div className="mt-1 font-semibold text-slate-900">{item.api.toFixed(2)}</div>
                            </div>
                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <div className="text-[10px] uppercase text-slate-500">Difference</div>
                              <div className="mt-1 font-semibold text-slate-900">
                                {item.diff > 0
                                  ? `Increase (${formatDiff(item.diff)})`
                                  : item.diff < 0
                                  ? `Decrease (${formatDiff(item.diff)})`
                                  : "No change (0)"}
                              </div>
                            </div>
                          </div>

                          <details className="rounded-xl border border-slate-200 bg-white p-2">
                            <summary className="cursor-pointer text-xs font-medium text-slate-700">
                              More details
                            </summary>
                            <div className="mt-2 space-y-1 text-xs">
                              {Object.entries(props).map(([key, value]) => (
                                <div key={key} className="break-words">
                                  <span className="font-medium">{key}:</span>{" "}
                                  {value === null || value === undefined || value === ""
                                    ? "-"
                                    : String(value)}
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>

              <MapLegend mode={mode} />
            </div>

            <div className="flex h-[760px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-3.5 py-3">
                <div className="text-base font-semibold text-slate-900">Insights</div>
                <div className="text-sm text-slate-600">{rightPanelTitle}</div>
              </div>

              <div className="space-y-3 overflow-y-auto p-3">
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    title="Villages shown"
                    value={visibleVillages.length}
                    subtitle={
                      topCount === 999999
                        ? "All villages are currently displayed."
                        : "Current display follows the selected ranking mode."
                    }
                    accent="blue"
                  />
                  <MetricCard
                    title={
                      mode === "Case"
                        ? "Cases in current view"
                        : mode === "API"
                        ? "Visible average API"
                        : "Villages with increase"
                    }
                    value={
                      mode === "Case"
                        ? summary.visibleTotalCases
                        : mode === "API"
                        ? summary.visibleAvgApi.toFixed(2)
                        : summary.increaseCount
                    }
                    subtitle={
                      mode === "Case"
                        ? "Across currently shown villages."
                        : mode === "API"
                        ? "Mean API across visible villages."
                        : "Shown villages higher than 2023."
                    }
                    accent={mode === "API" ? "teal" : mode === "Diff" ? "red" : "orange"}
                  />
                </div>

                {showTrendPreview ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2.5 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          Trend preview
                        </div>
                        <div className="mt-0.5 text-[11px] leading-5 text-slate-500">
                          Compact case trends for highest-ranked villages.
                        </div>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-medium text-slate-600">
                        Showing {trendPreviewVillages.length}
                      </span>
                    </div>

                    <div className="max-h-[390px] space-y-2 overflow-y-auto pr-1">
                      {trendPreviewVillages.map((village, idx) => (
                        <TrendRow
                          key={`${village.name}-${idx}-trend-row`}
                          village={village}
                          rank={idx + 1}
                          isActive={selectedVillage?.index === village.index}
                          onSelect={() => setSelectedVillageIndex(village.index)}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {mode === "Diff" && (
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Change summary
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-red-50 px-2.5 py-1 font-medium text-red-700">
                        Increase: {summary.increaseCount}
                      </span>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                        Decrease: {summary.decreaseCount}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                        Unchanged: {summary.sameCount}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
