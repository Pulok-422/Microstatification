import { Village, ComputedVillage, Alert, Filters, MONTHS } from "@/types/dashboard";

export function computeVillageStats(village: Village): ComputedVillage {
  const cases_2026_total = village.cases_monthly_2026.reduce((sum: number, v) => sum + (v ?? 0), 0);
  const pop = village.population || 1;
  return {
    ...village,
    cases_2026_total,
    api_2026: (cases_2026_total / pop) * 1000,
    api_2025: (village.cases_2025_total / pop) * 1000,
    api_2024: (village.cases_2024_total / pop) * 1000,
  };
}

export function getYearCases(v: ComputedVillage, year: number): number {
  if (year === 2026) return v.cases_2026_total;
  if (year === 2025) return v.cases_2025_total;
  return v.cases_2024_total;
}

export function getYearAPI(v: ComputedVillage, year: number): number {
  if (year === 2026) return v.api_2026;
  if (year === 2025) return v.api_2025;
  return v.api_2024;
}

export function getSelectedMonthCases(v: ComputedVillage, year: number, monthStart: number, monthEnd: number): number {
  if (year !== 2026) return getYearCases(v, year);
  let total = 0;
  for (let m = monthStart; m <= monthEnd; m++) {
    total += v.cases_monthly_2026[m] ?? 0;
  }
  return total;
}

export function filterVillages(villages: ComputedVillage[], filters: Filters): ComputedVillage[] {
  return villages.filter((v) => {
    if (filters.districts.length > 0 && !filters.districts.includes(v.district)) return false;
    if (filters.upazilas.length > 0 && !filters.upazilas.includes(v.upazila)) return false;
    if (filters.unions.length > 0 && !filters.unions.includes(v.union)) return false;
    if (filters.designations.length > 0 && !filters.designations.includes(v.designation)) return false;
    if (filters.borderFilter === "border" && v.border_country === "None") return false;
    if (filters.borderFilter === "non-border" && v.border_country !== "None") return false;
    if (v.distance_km < filters.distanceRange[0] || v.distance_km > filters.distanceRange[1]) return false;
    if (filters.villageSearch) {
      const s = filters.villageSearch.toLowerCase();
      if (!v.village_name_en.toLowerCase().includes(s) && !v.village_name_bn.includes(filters.villageSearch) && !v.village_code.toLowerCase().includes(s)) return false;
    }
    return true;
  });
}

export function computeAlerts(villages: ComputedVillage[], year: number, monthStart: number, monthEnd: number): Alert[] {
  const alerts: Alert[] = [];
  for (const v of villages) {
    if (year === 2026) {
      const cm = monthEnd;
      const cur = v.cases_monthly_2026[cm];
      const prev = cm > 0 ? v.cases_monthly_2026[cm - 1] : null;
      if (cur !== null && prev !== null && prev >= 3 && cur >= 2 * prev) {
        alerts.push({ village_code: v.village_code, village_name: v.village_name_en, type: "spike", message: `Spike: ${prev}→${cur} in ${MONTHS[cm]}`, severity: "high" });
        if (v.border_country !== "None") {
          alerts.push({ village_code: v.village_code, village_name: v.village_name_en, type: "border_increase", message: `Border spike: ${prev}→${cur} in ${MONTHS[cm]}`, severity: "high" });
        }
      }
      if (v.cases_monthly_2026[cm] === null) {
        alerts.push({ village_code: v.village_code, village_name: v.village_name_en, type: "missing", message: `Missing report for ${MONTHS[cm]}`, severity: "low" });
      }
    }
    const api = getYearAPI(v, year);
    if (api >= 10) {
      alerts.push({ village_code: v.village_code, village_name: v.village_name_en, type: "high_api", message: `API=${api.toFixed(1)} (≥10)`, severity: "medium" });
    }
  }
  return alerts;
}

export function computeCompleteness(villages: ComputedVillage[], monthStart: number, monthEnd: number): number {
  if (villages.length === 0) return 0;
  let reported = 0, total = 0;
  for (const v of villages) {
    for (let m = monthStart; m <= monthEnd; m++) {
      total++;
      if (v.cases_monthly_2026[m] !== null) reported++;
    }
  }
  return total > 0 ? (reported / total) * 100 : 0;
}

export function computeAggregateAPI(villages: ComputedVillage[], year: number, monthStart: number, monthEnd: number): number {
  const totalPop = villages.reduce((s, v) => s + v.population, 0);
  const totalCases = villages.reduce((s, v) => s + getSelectedMonthCases(v, year, monthStart, monthEnd), 0);
  return totalPop > 0 ? (totalCases / totalPop) * 1000 : 0;
}

export function getMonthlyTrendData(villages: ComputedVillage[], metric: "cases" | "api") {
  return MONTHS.map((month, i) => {
    const totalCases = villages.reduce((s, v) => s + (v.cases_monthly_2026[i] ?? 0), 0);
    const totalPop = villages.reduce((s, v) => s + v.population, 0);
    return {
      month,
      value: metric === "cases" ? totalCases : totalPop > 0 ? (totalCases / totalPop) * 1000 : 0,
    };
  });
}
