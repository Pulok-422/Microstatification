export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export const CHART_COLORS = {
  primary: "#1f2d3d",
  accent: "#347f74",
  destructive: "#d9363e",
  success: "#1a9147",
  warning: "#ed8b00",
  info: "#0d8bcc",
  muted: "#718096",
  grid: "#e2e8f0",
};

export interface Village {
  country: string;
  division: string;
  district: string;
  upazila: string;
  union: string;
  ward_no: string;
  sk_shw_name: string;
  designation: "SK(H)" | "SHW(H)";
  ss_name: string;
  village_name_en: string;
  village_name_bn: string;
  village_code: string;
  population: number;
  active_llin_2026: number;
  active_llin_2025: number;
  active_llin_2024: number;
  service_point: string;
  distance_km: number;
  border_country: "None" | "Myanmar";
  other_activities: string;
  cases_monthly_2026: (number | null)[];
  cases_2025_total: number;
  cases_2024_total: number;
}

export interface ComputedVillage extends Village {
  cases_2026_total: number;
  api_2026: number;
  api_2025: number;
  api_2024: number;
}

export interface Alert {
  village_code: string;
  village_name: string;
  type: "spike" | "high_api" | "missing" | "border_increase";
  message: string;
  severity: "high" | "medium" | "low";
}

export interface Filters {
  year: number;
  monthStart: number;
  monthEnd: number;
  districts: string[];
  upazilas: string[];
  unions: string[];
  villageSearch: string;
  designations: string[];
  borderFilter: "all" | "border" | "non-border";
  distanceRange: [number, number];
}

export type ReportType =
  | "monthly_upazila"
  | "district_snapshot"
  | "union_table"
  | "hotspots"
  | "llin_coverage"
  | "completeness";

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  monthly_upazila: "Monthly Upazila Summary",
  district_snapshot: "District Snapshot",
  union_table: "Union-level Table",
  hotspots: "Hotspots (Village)",
  llin_coverage: "LLIN & Coverage Summary",
  completeness: "Data Completeness Report",
};

export interface FilterContextType {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  filteredVillages: ComputedVillage[];
  allVillages: ComputedVillage[];
  alerts: Alert[];
  resetFilters: () => void;
}
