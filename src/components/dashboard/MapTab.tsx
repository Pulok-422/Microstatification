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

function buildDemoHistory(case2023: number, case2024: number, api2024: number, index: number) {
  const growth = case2024 - case2023;

  const case2022 = Math.max(
    0,
    Math.round(case2023 - growth * 0.7 - ((index % 4) - 1))
  );
  const case2021 = Math.max(
    0,
    Math.round(case2022 - growth * 0.5 - ((index % 3) - 1))
  );
  const case2020 = Math.max(
    0,
    Math.round(case2021 - growth * 0.35 - ((index % 5) - 2))
  );

  const safeCase = (v: number) => Math.max(0, v);

  const api2023 = Number(
    Math.max(0.05, api2024 * (case2023 + 1) / (case2024 + 1) + ((index % 3) - 1) * 0.12).toFixed(2)
  );
  const api2022 = Number(
    Math.max(0.05, api2023 * 0.9 + (safeCase(case2022) - safeCase(case2023)) * 0.05 + ((index % 4) - 1.5) * 0.08).toFixed(2)
  );
  const api2021 = Number(
    Math.max(0.05, api2022 * 0.9 + (safeCase(case2021) - safeCase(case2022)) * 0.05 + ((index % 5) - 2) * 0.05).toFixed(2)
  );
  const api2020 = Number(
    Math.max(0.05, api2021 * 0.92 + (safeCase(case2020) - safeCase(case2021)) * 0.05 + ((index % 2) - 0.5) * 0.04).toFixed(2)
  );

  return [
    { year: 2020, case: safeCase(case2020), api: api2020 },
    { year: 2021, case: safeCase(case2021), api: api2021 },
    { year: 2022, case: safeCase(case2022), api: api2022 },
    { year: 2023, case: safeCase(case2023), api: api2023 },
    { year: 2024, case: safeCase(case2024), api: Number(api2024.toFixed(2)) },
  ];
}

function caseStyle(value: number, highlight = false) {
  const extra = highlight ? 1.5 : 0;

  if (value >= 21) {
    return {
      radius: 13 + extra,
      fill: "#C2410C",
      stroke: "#7C2D12",
      ring: "rgba(194,65,12,0.18)",
    };
  }
  if (value >= 6) {
    return {
      radius: 10.5 + extra,
      fill: "#D97706",
      stroke: "#92400E",
      ring: "rgba(217,119,6,0.18)",
    };
  }
  if (value >= 1) {
    return {
      radius: 8.5 + extra,
      fill: "#CA8A04",
      stroke: "#854D0E",
      ring: "rgba(202,138,4,0.18)",
    };
  }
  return {
    radius: 6.5 + extra,
    fill: "#CBD5E1",
    stroke: "#64748B",
    ring: "rgba(100,116,139,0.16)",
  };
}

function apiStyle(value: number, highlight = false) {
  const extra = highlight ? 1.5 : 0;

  if (value >= 10) {
    return {
      radius: 13 + extra,
      fill: "#0F766E",
      stroke: "#134E4A",
      ring: "rgba(15,118,110,0.18)",
    };
  }
  if (value >= 5) {
    return {
      radius: 10.5 + extra,
      fill: "#0EA5A4",
      stroke: "#155E75",
      ring: "rgba(14,165,164,0.18)",
    };
  }
  if (value >= 1) {
    return {
      radius: 8.5 + extra,
      fill: "#38BDF8",
      stroke: "#1D4ED8",
      ring: "rgba(56,189,248,0.18)",
    };
  }
  return {
    radius: 6.5 + extra,
    fill: "#CBD5E1",
    stroke: "#64748B",
    ring: "rgba(100,116,139,0.16)",
  };
}

function diffStyle(diff: number, highlight = false) {
  const radius = highlight ? 14 : 12.5;

  if (diff > 0) {
    return {
      label: "Increase",
      symbol: "↑",
      fill: "#B91C1C",
      stroke: "#7F1D1D",
      text: "#FFFFFF",
      radius,
    };
  }

  if (diff < 0) {
    return {
      label: "Decrease",
      symbol: "↓",
      fill: "#1D4ED8",
      stroke: "#1E3A8A",
      text: "#FFFFFF",
      radius,
    };
  }

  return {
    label: "No change",
    symbol: "–",
    fill: "#64748B",
    stroke: "#334155",
    text: "#FFFFFF",
    radius: highlight ? 13.5 : 12,
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
        font-size:17px;
        font-weight:700;
        line-height:1;
        box-shadow:0 6px 18px rgba(15,23,42,0.20);
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
    <div className="absolute bottom-4 left-4 z-[1000] w-48 rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xl backdrop-blur">
      <div className="mb-2 text-sm font-semibold text-slate-900">
        {mode === "Case" ? "Case 2024" : mode === "API" ? "API" : "Year-on-year change"}
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5 text-xs text-slate-700">
            {"symbol" in item ? (
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full border border-white/50 text-sm font-bold text-white"
                style={{ backgroundColor: item.color }}
              >
                {item.symbol}
              </span>
            ) : (
              <span
                className="inline-block h-4 w-4 rounded-full border border-white/70 shadow-sm"
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
      value: "text-slate-900",
      badge: "bg-slate-50 text-slate-700",
    },
    orange: {
      bar: "bg-orange-600",
      value: "text-slate-900",
      badge: "bg-orange-50 text-orange-700",
    },
    teal: {
      bar: "bg-teal-600",
      value: "text-slate-900",
      badge: "bg-teal-50 text-teal-700",
    },
    blue: {
      bar: "bg-blue-600",
      value: "text-slate-900",
      badge: "bg-blue-50 text-blue-700",
    },
    red: {
      bar: "bg-red-700",
      value: "text-slate-900",
      badge: "bg-red-50 text-red-700",
    },
  }[accent];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
      <div className={`absolute inset-x-0 top-0 h-1.5 ${accentMap.bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {title}
          </div>
          <div className={`mt-2 text-3xl font-semibold leading-none ${accentMap.value}`}>
            {value}
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${accentMap.badge}`}>
          KPI
        </span>
      </div>
      {subtitle ? <div className="mt-3 text-xs leading-5 text-slate-500">{subtitle}</div> : null}
    </div>
  );
}

function formatDiff(diff: number) {
  if (diff > 0) return `+${diff}`;
  return `${diff}`;
}

function getLineColor(index: number) {
  const palette = [
    "#DC2626",
    "#2563EB",
    "#0F766E",
    "#D97706",
    "#7C3AED",
    "#0891B2",
    "#BE123C",
    "#4F46E5",
    "#65A30D",
    "#EA580C",
    "#1D4ED8",
    "#0D9488",
    "#9333EA",
    "#CA8A04",
    "#E11D48",
    "#0369A1",
    "#7C2D12",
    "#334155",
    "#16A34A",
    "#A21CAF",
    "#0284C7",
    "#B45309",
    "#1E40AF",
    "#BE185D",
    "#0F766E",
    "#374151",
    "#4D7C0F",
    "#C2410C",
    "#5B21B6",
    "#047857",
  ];
  return palette[index % palette.length];
}

function MiniTrendChart({
  title,
  villages,
  metric,
  formatter,
}: {
  title: string;
  villages: RankedVillage[];
  metric: "case" | "api";
  formatter?: (value: number) => string;
}) {
  const width = 300;
  const height = 180;
  const padding = { top: 18, right: 16, bottom: 28, left: 36 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const years = [2020, 2021, 2022, 2023, 2024];

  const allValues = villages.flatMap((v) => v.history.map((d) => d[metric]));
  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(...allValues, 0);
  const range = maxValue - minValue || 1;

  const yTicks = 4;

  const x = (year: number) =>
    padding.left + ((year - years[0]) / (years[years.length - 1] - years[0])) * chartWidth;

  const y = (value: number) =>
    padding.top + ((maxValue - value) / range) * chartHeight;

  const makePath = (series: HistoryPoint[]) =>
    series
      .map((point, i) => `${i === 0 ? "M" : "L"} ${x(point.year)} ${y(point[metric])}`)
      .join(" ");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-1 text-sm font-semibold text-slate-900">{title}</div>
      <div className="mb-3 text-xs leading-5 text-slate-500">
        Individual village trends for the currently filtered set ({villages.length} villages).
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[190px] min-w-[300px] w-full"
          role="img"
          aria-label={title}
        >
          <rect x="0" y="0" width={width} height={height} fill="white" rx="16" />

          {Array.from({ length: yTicks + 1 }).map((_, i) => {
            const value = minValue + ((yTicks - i) / yTicks) * range;
            const yPos = padding.top + (i / yTicks) * chartHeight;
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={yPos}
                  x2={width - padding.right}
                  y2={yPos}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={yPos + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#64748B"
                >
                  {formatter ? formatter(Number(value.toFixed(metric === "api" ? 1 : 0))) : value}
                </text>
              </g>
            );
          })}

          {years.map((year) => (
            <g key={year}>
              <line
                x1={x(year)}
                y1={padding.top}
                x2={x(year)}
                y2={height - padding.bottom}
                stroke="#F1F5F9"
                strokeWidth="1"
              />
              <text
                x={x(year)}
                y={height - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#64748B"
              >
                {year}
              </text>
            </g>
          ))}

          {villages.map((village, idx) => {
            const color = getLineColor(idx);
            return (
              <g key={`${village.name}-${metric}`}>
                <path
                  d={makePath(village.history)}
                  fill="none"
                  stroke={color}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {village.history.map((point) => (
                  <circle
                    key={`${village.name}-${point.year}-${metric}`}
                    cx={x(point.year)}
                    cy={y(point[metric])}
                    r="2.6"
                    fill={color}
                  />
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {villages.map((village, idx) => (
          <span
            key={`${village.name}-legend-${metric}`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: getLineColor(idx) }}
            />
            <span className="max-w-[160px] truncate">{village.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function MapTab() {
  const [villageData, setVillageData] = useState<FeatureCollection | null>(null);
  const [boundaryData, setBoundaryData] = useState<FeatureCollection | null>(null);
  const [mode, setMode] = useState<ClassifyMode>("Case");
  const [topCount, setTopCount] = useState<TopFilter>(999999);
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

  const visibleSet = useMemo(() => {
    return new Set(visibleVillages.map((item) => item.index));
  }, [visibleVillages]);

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

    const visibleTotalCases = visibleVillages.reduce((sum, item) => sum + item.case2024, 0);
    const visibleAvgApi =
      visibleVillages.length > 0
        ? visibleVillages.reduce((sum, item) => sum + item.api, 0) / visibleVillages.length
        : 0;

    const increaseCount = visibleVillages.filter((item) => item.diff > 0).length;
    const decreaseCount = visibleVillages.filter((item) => item.diff < 0).length;
    const sameCount = visibleVillages.filter((item) => item.diff === 0).length;

    const maxCaseVillage = [...rankedVillages].sort((a, b) => b.case2024 - a.case2024)[0];
    const maxApiVillage = [...rankedVillages].sort((a, b) => b.api - a.api)[0];
    const maxDiffVillage = [...rankedVillages].sort(
      (a, b) => Math.abs(b.diff) - Math.abs(a.diff)
    )[0];

    return {
      totalVillages,
      totalCase2024,
      avgApi,
      visibleTotalCases,
      visibleAvgApi,
      increaseCount,
      decreaseCount,
      sameCount,
      maxCaseVillage,
      maxApiVillage,
      maxDiffVillage,
    };
  }, [pointFeatures, visibleVillages, rankedVillages]);

  const listVillages = useMemo(() => {
    if (topCount === 999999) return rankedVillages.slice(0, 20);
    return visibleVillages;
  }, [rankedVillages, visibleVillages, topCount]);

  const boundaryStyle = () => ({
    color: "#64748B",
    weight: 1.3,
    fillOpacity: 0,
    opacity: 0.95,
    dashArray: "5 5",
  });

  const rightPanelTitle =
    mode === "Case"
      ? "Village case summary"
      : mode === "API"
      ? "Village API summary"
      : "Village change summary";

  const showTrendCharts = topCount !== 999999 && visibleVillages.length > 0;

  return (
    <div className="panel overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/70 shadow-sm">
      <div className="border-b border-slate-200 bg-white px-5 py-5">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div className="space-y-1">
            <div className="text-xl font-semibold tracking-tight text-slate-900">
              Village Map Panel
            </div>
            <div className="max-w-3xl text-sm leading-6 text-slate-600">
              Explore Lama villages by 2024 case burden, API, and year-on-year change. All
              villages are displayed by default, with union boundaries shown as hollow reference
              outlines.
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 shadow-sm">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Classification
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

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 shadow-sm">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Village display
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
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
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

      <div className="p-5">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="relative h-[780px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
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
                              weight: 2,
                              color: "#334155",
                              dashArray: "",
                            });
                          },
                          mouseout: (e: any) => {
                            e.target.setStyle({
                              weight: 1.3,
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
                              Change: {meta.label} ({formatDiff(item.diff)})
                            </div>
                          </div>
                        </Tooltip>

                        <Popup>
                          <div className="min-w-[230px] text-sm text-slate-700">
                            <div className="mb-2 text-base font-semibold text-slate-900">
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
                              {formatDiff(item.diff)})
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
                        fillOpacity: 0.9,
                        weight: highlight ? 2 : 1.2,
                        opacity: 1,
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
                        <div className="min-w-[230px] text-sm text-slate-700">
                          <div className="mb-2 text-base font-semibold text-slate-900">
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
                              ? `Increase (${formatDiff(item.diff)})`
                              : item.diff < 0
                              ? `Decrease (${formatDiff(item.diff)})`
                              : "No change (0)"}
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

            <div className="flex h-[780px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-lg font-semibold text-slate-900">Insights</div>
                <div className="text-sm text-slate-600">{rightPanelTitle}</div>
              </div>

              <div className="space-y-4 overflow-y-auto p-4">
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    title="Villages in dataset"
                    value={summary.totalVillages}
                    subtitle="Total village point records available for mapping."
                    accent="slate"
                  />
                  <MetricCard
                    title="Villages shown"
                    value={visibleVillages.length}
                    subtitle={
                      topCount === 999999
                        ? "All villages are currently displayed."
                        : "Current display based on selected ranking."
                    }
                    accent="blue"
                  />
                </div>

                {mode === "Case" && (
                  <>
                    <div className="grid grid-cols-1 gap-3">
                      <MetricCard
                        title="Total cases in 2024"
                        value={summary.totalCase2024}
                        subtitle="Combined reported case count across all mapped villages."
                        accent="red"
                      />
                      <MetricCard
                        title="Cases in current view"
                        value={summary.visibleTotalCases}
                        subtitle="Sum of cases from villages currently displayed on the map."
                        accent="orange"
                      />
                    </div>

                    {summary.maxCaseVillage ? (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Highest case burden
                        </div>
                        <div className="mt-2 text-base font-semibold text-slate-900">
                          {summary.maxCaseVillage.name}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {summary.maxCaseVillage.case2024} reported cases in 2024
                        </div>
                      </div>
                    ) : null}
                  </>
                )}

                {mode === "API" && (
                  <>
                    <div className="grid grid-cols-1 gap-3">
                      <MetricCard
                        title="Average API"
                        value={summary.avgApi.toFixed(2)}
                        subtitle="Mean API across all mapped villages."
                        accent="teal"
                      />
                      <MetricCard
                        title="Visible average API"
                        value={summary.visibleAvgApi.toFixed(2)}
                        subtitle="Mean API for villages currently displayed."
                        accent="blue"
                      />
                    </div>

                    {summary.maxApiVillage ? (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Highest API
                        </div>
                        <div className="mt-2 text-base font-semibold text-slate-900">
                          {summary.maxApiVillage.name}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          API {summary.maxApiVillage.api.toFixed(2)}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}

                {mode === "Diff" && (
                  <>
                    <div className="grid grid-cols-1 gap-3">
                      <MetricCard
                        title="Villages with increase"
                        value={summary.increaseCount}
                        subtitle="Displayed villages with higher cases than the previous year."
                        accent="red"
                      />
                      <MetricCard
                        title="Villages with decrease"
                        value={summary.decreaseCount}
                        subtitle="Displayed villages with lower cases than the previous year."
                        accent="blue"
                      />
                      <MetricCard
                        title="Villages unchanged"
                        value={summary.sameCount}
                        subtitle="Displayed villages with no difference from the previous year."
                        accent="slate"
                      />
                    </div>

                    {summary.maxDiffVillage ? (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Largest absolute change
                        </div>
                        <div className="mt-2 text-base font-semibold text-slate-900">
                          {summary.maxDiffVillage.name}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {summary.maxDiffVillage.diff > 0
                            ? "Increase"
                            : summary.maxDiffVillage.diff < 0
                            ? "Decrease"
                            : "No change"}{" "}
                          ({formatDiff(summary.maxDiffVillage.diff)})
                        </div>
                      </div>
                    ) : null}
                  </>
                )}

                {showTrendCharts && (
                  <>
                    <MiniTrendChart
                      title="Historical Case Trend"
                      villages={visibleVillages}
                      metric="case"
                      formatter={(value) => `${Math.round(value)}`}
                    />
                    <MiniTrendChart
                      title="Historical API Trend"
                      villages={visibleVillages}
                      metric="api"
                      formatter={(value) => Number(value).toFixed(1)}
                    />
                  </>
                )}

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">
                      {topCount === 999999 ? "Top 20 villages" : "Ranked villages"}
                    </div>
                    <div className="text-xs text-slate-500">
                      Ranked by{" "}
                      {mode === "Case"
                        ? "Case"
                        : mode === "API"
                        ? "API"
                        : "absolute year-on-year change"}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {listVillages.map((item, idx) => (
                      <div
                        key={`${item.name}-${idx}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 transition hover:border-slate-300 hover:bg-white"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium text-slate-900">
                              #{idx + 1} {item.name}
                            </div>
                            <div className="mt-1 text-xs leading-5 text-slate-500">
                              Case 2024: {item.case2024} · Case 2023: {item.case2023} · API:{" "}
                              {item.api.toFixed(2)}
                            </div>
                          </div>

                          {mode === "Diff" ? (
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                                item.diff > 0
                                  ? "bg-red-50 text-red-700"
                                  : item.diff < 0
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {item.diff > 0
                                ? `↑ ${formatDiff(item.diff)}`
                                : item.diff < 0
                                ? `↓ ${formatDiff(item.diff)}`
                                : "– 0"}
                            </span>
                          ) : mode === "API" ? (
                            <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
                              API {item.api.toFixed(2)}
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">
                              {item.case2024} cases
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
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
