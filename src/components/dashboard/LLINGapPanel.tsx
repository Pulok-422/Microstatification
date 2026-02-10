import { useMemo } from "react";
import { useFilters } from "@/hooks/useFilters";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Package, ArrowDownRight, AlertTriangle } from "lucide-react";

type LLINGapType = "Low LLIN coverage" | "High API + Low LLIN" | "Missing LLIN/Pop";
type LLINGapSeverity = "high" | "medium" | "low";

type LLINGapItem = {
  village_code: string;
  village_name_en?: string;
  union?: string;
  upazila?: string;
  border_country?: string;

  population: number;
  active_llin: number;
  llin_per_1000: number;
  api: number;

  type: LLINGapType;
  severity: LLINGapSeverity;
};

const MONTH_KEYS_2026 = [
  "cases_2026_jan",
  "cases_2026_feb",
  "cases_2026_mar",
  "cases_2026_apr",
  "cases_2026_may",
  "cases_2026_jun",
  "cases_2026_jul",
  "cases_2026_aug",
  "cases_2026_sep",
  "cases_2026_oct",
  "cases_2026_nov",
  "cases_2026_dec",
] as const;

// Tunable thresholds
const LOW_LLIN_PER_1000 = 500; // gap signal
const VERY_LOW_LLIN_PER_1000 = 350;
const HIGH_API = 10;

// Progress bar scaling caps (so bars look consistent)
const LLIN_PROGRESS_MAX_PER_1000 = 800; // 800/1000 will show ~100%
const API_PROGRESS_MAX = 20; // API 20 will show ~100%

function toNum(x: any, fallback = 0) {
  if (x === null || x === undefined || x === "") return fallback;
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function getActiveLLIN(v: any, year: number) {
  if (year === 2026) return toNum(v.active_llin_2026);
  if (year === 2025) return toNum(v.active_llin_2025);
  if (year === 2024) return toNum(v.active_llin_2024);
  return 0;
}

function getYearTotalCases(v: any, year: number) {
  if (year === 2026) {
    return MONTH_KEYS_2026.reduce((s, k) => s + toNum((v as any)[k]), 0);
  }
  if (year === 2025) return toNum(v.cases_2025_total);
  if (year === 2024) return toNum(v.cases_2024_total);
  return 0;
}

function safeRatePer1000(numerator: number, denominator: number) {
  if (!denominator || denominator <= 0) return 0;
  return (numerator / denominator) * 1000;
}

function clampPct(x: number) {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 100) return 100;
  return x;
}

export function LLINGapPanel() {
  const { filters, filteredVillages } = useFilters();
  const year = filters.year;

  const items = useMemo<LLINGapItem[]>(() => {
    if (!filteredVillages?.length) return [];

    const out: LLINGapItem[] = [];

    for (const v of filteredVillages as any[]) {
      const pop = toNum(v.population, 0);
      const llin = getActiveLLIN(v, year);

      const popMissing = !pop || pop <= 0;

      const rawLLIN = (v as any)[`active_llin_${year}`];
      const llinMissing = rawLLIN === null || rawLLIN === undefined || rawLLIN === "";

      const yearTotalCases = popMissing ? 0 : getYearTotalCases(v, year);
      const api = popMissing ? 0 : safeRatePer1000(yearTotalCases, pop);
      const llinPer1000 = popMissing ? 0 : safeRatePer1000(llin, pop);

      const villageCode = String(v.village_code ?? "UNKNOWN");

      // Missing essentials
      if (popMissing || llinMissing) {
        out.push({
          village_code: villageCode,
          village_name_en: v.village_name_en,
          union: v.union,
          upazila: v.upazila,
          border_country: v.border_country,

          population: pop,
          active_llin: llin,
          llin_per_1000: llinPer1000,
          api,

          type: "Missing LLIN/Pop",
          severity: "medium",
        });
        continue;
      }

      // Priority: High API + Low LLIN
      if (api >= HIGH_API && llinPer1000 < LOW_LLIN_PER_1000) {
        out.push({
          village_code: villageCode,
          village_name_en: v.village_name_en,
          union: v.union,
          upazila: v.upazila,
          border_country: v.border_country,

          population: pop,
          active_llin: llin,
          llin_per_1000: llinPer1000,
          api,

          type: "High API + Low LLIN",
          severity: llinPer1000 < VERY_LOW_LLIN_PER_1000 ? "high" : "medium",
        });
        continue;
      }

      // General: Low LLIN coverage
      if (llinPer1000 < LOW_LLIN_PER_1000) {
        out.push({
          village_code: villageCode,
          village_name_en: v.village_name_en,
          union: v.union,
          upazila: v.upazila,
          border_country: v.border_country,

          population: pop,
          active_llin: llin,
          llin_per_1000: llinPer1000,
          api,

          type: "Low LLIN coverage",
          severity: llinPer1000 < VERY_LOW_LLIN_PER_1000 ? "high" : "low",
        });
      }
    }

    const sevRank: Record<LLINGapSeverity, number> = { high: 3, medium: 2, low: 1 };
    const typeRank: Record<LLINGapType, number> = {
      "High API + Low LLIN": 3,
      "Low LLIN coverage": 2,
      "Missing LLIN/Pop": 1,
    };

    return out.sort((a, b) => {
      const s = sevRank[b.severity] - sevRank[a.severity];
      if (s !== 0) return s;

      const t = typeRank[b.type] - typeRank[a.type];
      if (t !== 0) return t;

      // Lower LLIN/1000 first (bigger gap)
      return a.llin_per_1000 - b.llin_per_1000;
    });
  }, [filteredVillages, year]);

  const grouped = useMemo(() => {
    return items.reduce((acc, it) => {
      acc[it.type] = (acc[it.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [items]);

  const top10 = useMemo(() => items.slice(0, 10), [items]);

  if (items.length === 0) return null;

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5 text-foreground" />
          LLIN Coverage & Gaps ({items.length})
        </span>

        <div className="flex gap-2 text-[10px]">
          {Object.entries(grouped).map(([type, count]) => (
            <span key={type} className="text-muted-foreground">
              {type}: {count}
            </span>
          ))}
        </div>
      </div>

      <div className="panel-body">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
          {top10.map((it, i) => {
            const isPriority = it.type === "High API + Low LLIN";
            const isBorder = it.border_country && it.border_country !== "None";

            // Progress %
            const llinPct = clampPct((it.llin_per_1000 / LLIN_PROGRESS_MAX_PER_1000) * 100);
            const apiPct = clampPct((it.api / API_PROGRESS_MAX) * 100);

            // Labels kept minimal (no long sentences)
            const subtitle =
              it.type === "Missing LLIN/Pop"
                ? "Missing essentials"
                : it.type === "High API + Low LLIN"
                ? "Priority gap"
                : "Coverage gap";

            return (
              <div
                key={`${it.village_code}-${i}`}
                className="flex items-start gap-2 p-2 rounded border border-border text-xs"
              >
                <Badge
                  variant="outline"
                  className={`text-[9px] shrink-0 ${
                    it.severity === "high"
                      ? "alert-badge-high"
                      : it.severity === "medium"
                      ? "alert-badge-medium"
                      : "alert-badge-low"
                  }`}
                >
                  {it.severity}
                </Badge>

                <div className="min-w-0 w-full">
                  <div className="flex items-center gap-1">
                    {isPriority ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}

                    <div className="font-medium text-[11px] truncate">
                      {it.village_code}
                      {it.village_name_en ? ` • ${it.village_name_en}` : ""}
                    </div>
                  </div>

                  <div className="text-muted-foreground text-[10px] mt-0.5">
                    {subtitle}
                    {it.upazila ? ` • ${it.upazila}` : ""}
                    {it.union ? `, ${it.union}` : ""}
                    {isBorder ? ` • Border: ${it.border_country}` : ""}
                  </div>

                  {/* Progress bars */}
                  <div className="mt-2 space-y-2">
                    {/* LLIN */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                        <span>LLIN / 1000</span>
                        <span>{it.llin_per_1000.toFixed(0)}</span>
                      </div>
                      <Progress value={llinPct} />
                    </div>

                    {/* API */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                        <span>API</span>
                        <span>{it.api.toFixed(1)}</span>
                      </div>
                      <Progress value={apiPct} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {items.length > 10 && (
          <p className="text-[10px] text-muted-foreground mt-2">
            + {items.length - 10} more villages with LLIN gaps
          </p>
        )}

        <div className="mt-3 text-[10px] text-muted-foreground">
          Thresholds: Low LLIN &lt; {LOW_LLIN_PER_1000}/1000, High API ≥ {HIGH_API}. Progress scale caps: LLIN {LLIN_PROGRESS_MAX_PER_1000}/1000, API {API_PROGRESS_MAX}.
        </div>
      </div>
    </div>
  );
}
