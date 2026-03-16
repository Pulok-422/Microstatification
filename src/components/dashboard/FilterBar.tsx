import { useMemo } from "react";
import { Search, X, RotateCcw } from "lucide-react";
import { useFilters } from "@/hooks/useFilters";
import { MONTHS } from "@/types/dashboard";
import { MultiSelect } from "./MultiSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function FilterBar() {
  const { filters, updateFilter, allVillages, resetFilters } = useFilters();

  const districts = useMemo(
    () => [...new Set(allVillages.map((v) => v.district))].sort(),
    [allVillages]
  );

  const upazilas = useMemo(() => {
    const filtered =
      filters.districts.length > 0
        ? allVillages.filter((v) => filters.districts.includes(v.district))
        : allVillages;
    return [...new Set(filtered.map((v) => v.upazila))].sort();
  }, [allVillages, filters.districts]);

  const unions = useMemo(() => {
    const filtered =
      filters.upazilas.length > 0
        ? allVillages.filter((v) => filters.upazilas.includes(v.upazila))
        : allVillages;
    return [...new Set(filtered.map((v) => v.union))].sort();
  }, [allVillages, filters.upazilas]);

  const chips: { label: string; onRemove: () => void }[] = [];

  if (filters.districts.length) {
    chips.push({
      label: `District: ${filters.districts.join(", ")}`,
      onRemove: () => updateFilter("districts", []),
    });
  }

  if (filters.upazilas.length) {
    chips.push({
      label: `Upazila: ${filters.upazilas.join(", ")}`,
      onRemove: () => updateFilter("upazilas", []),
    });
  }

  if (filters.unions.length) {
    chips.push({
      label: `Union: ${filters.unions.join(", ")}`,
      onRemove: () => updateFilter("unions", []),
    });
  }

  if (filters.designations.length) {
    chips.push({
      label: `Designation: ${filters.designations.join(", ")}`,
      onRemove: () => updateFilter("designations", []),
    });
  }

  if (filters.borderFilter !== "all") {
    chips.push({
      label: `Border: ${filters.borderFilter}`,
      onRemove: () => updateFilter("borderFilter", "all"),
    });
  }

  if (filters.villageSearch) {
    chips.push({
      label: `Search: ${filters.villageSearch}`,
      onRemove: () => updateFilter("villageSearch", ""),
    });
  }

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-card px-4 py-3 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-10 gap-3 items-end">
        <div className="min-w-0">
          <div className="filter-label mb-1">Year</div>
          <Select
            value={String(filters.year)}
            onValueChange={(v) => updateFilter("year", Number(v))}
          >
            <SelectTrigger className="h-9 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {[2024, 2025, 2026].map((y) => (
                <SelectItem key={y} value={String(y)} className="text-xs">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0">
          <div className="filter-label mb-1">From</div>
          <Select
            value={String(filters.monthStart)}
            onValueChange={(v) => updateFilter("monthStart", Number(v))}
          >
            <SelectTrigger className="h-9 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i)} className="text-xs">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0">
          <div className="filter-label mb-1">To</div>
          <Select
            value={String(filters.monthEnd)}
            onValueChange={(v) => updateFilter("monthEnd", Number(v))}
          >
            <SelectTrigger className="h-9 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i)} className="text-xs">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0">
          <div className="filter-label mb-1">District</div>
          <MultiSelect
            options={districts}
            selected={filters.districts}
            onChange={(v) => updateFilter("districts", v)}
            placeholder="All"
          />
        </div>

        <div className="min-w-0">
          <div className="filter-label mb-1">Upazila</div>
          <MultiSelect
            options={upazilas}
            selected={filters.upazilas}
            onChange={(v) => updateFilter("upazilas", v)}
            placeholder="All"
          />
        </div>

        <div className="min-w-0">
          <div className="filter-label mb-1">Union</div>
          <MultiSelect
            options={unions}
            selected={filters.unions}
            onChange={(v) => updateFilter("unions", v)}
            placeholder="All"
          />
        </div>

        <div className="min-w-0 xl:col-span-2">
          <div className="filter-label mb-1">Village Search</div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-9 w-full pl-8 text-xs"
              placeholder="Search village name or code..."
              value={filters.villageSearch}
              onChange={(e) => updateFilter("villageSearch", e.target.value)}
            />
          </div>
        </div>

        <div className="min-w-0">
          <div className="filter-label mb-1">Designation</div>
          <MultiSelect
            options={["SK(H)", "SHW(H)"]}
            selected={filters.designations}
            onChange={(v) => updateFilter("designations", v)}
            placeholder="All"
          />
        </div>

        <div className="min-w-0">
          <div className="filter-label mb-1">Border</div>
          <Select
            value={filters.borderFilter}
            onValueChange={(v: "all" | "border" | "non-border") =>
              updateFilter("borderFilter", v)
            }
          >
            <SelectTrigger className="h-9 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all" className="text-xs">
                All
              </SelectItem>
              <SelectItem value="border" className="text-xs">
                Border
              </SelectItem>
              <SelectItem value="non-border" className="text-xs">
                Non-border
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-[11px] text-foreground"
              >
                {c.label}
                <button
                  onClick={c.onRemove}
                  className="rounded-sm p-0.5 hover:bg-background"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            No filters applied
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs shrink-0"
          onClick={resetFilters}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Reset Filters
        </Button>
      </div>
    </div>
  );
}
