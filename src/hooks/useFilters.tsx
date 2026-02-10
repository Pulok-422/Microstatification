import { createContext, useContext, useState, useMemo, useCallback, ReactNode } from "react";
import { Filters, FilterContextType, ComputedVillage, Alert } from "@/types/dashboard";
import { sampleVillages } from "@/data/sampleData";
import { computeVillageStats, filterVillages, computeAlerts } from "@/lib/computations";

const DEFAULT_FILTERS: Filters = {
  year: 2026,
  monthStart: 0,
  monthEnd: 8,
  districts: ["Bandarban"],
  upazilas: [],
  unions: [],
  villageSearch: "",
  designations: [],
  borderFilter: "all",
  distanceRange: [0, 40],
};

const FilterContext = createContext<FilterContextType | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const allVillages = useMemo<ComputedVillage[]>(
    () => sampleVillages.map(computeVillageStats),
    []
  );

  const filteredVillages = useMemo(
    () => filterVillages(allVillages, filters),
    [allVillages, filters]
  );

  const alerts = useMemo(
    () => computeAlerts(filteredVillages, filters.year, filters.monthStart, filters.monthEnd),
    [filteredVillages, filters.year, filters.monthStart, filters.monthEnd]
  );

  const updateFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  return (
    <FilterContext.Provider value={{ filters, setFilters, updateFilter, filteredVillages, allVillages, alerts, resetFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
}
