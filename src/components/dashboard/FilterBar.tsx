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
import { Slider } from "@/components/ui/slider";

export function FilterBar() {
  const { filters, updateFilter, allVillages, resetFilters } = useFilters();

  const districts = useMemo(
    () => [...new Set(allVillages.map((v) => v.district))],
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
  if (filters.districts.length)
    chips.push({
      label: `District: ${filters.districts.join(", ")}`,
      onRemove: () => updateFilter("districts", []),
    });
  if (filters.upazilas.length)
    chips.push({
      label: `Upazila: ${filters.upazilas.join(", ")}`,
      onRemove: () => updateFilter("upazilas", []),
    });
  if (filters.unions.length)
    chips.push({
      label: `Union: ${filters.unions.join(", ")}`,
      onRemove: () => updateFilter("unions", []),
    });
  if (filters.designations.length)
    chips.push({
      label: `Desig: ${filters.designations.join(", ")}`,
      onRemove: () => updateFilter("designations", []),
    });
  if (filters.borderFilter !== "all")
    chips.push({
      label: `Border: ${filters.borderFilter}`,
      onRemove: () => updateFilter("borderFilter", "all"),
    });
  if (filters.villageSearch)
    chips.push({
      label: `Search: ${filters.villageSearch}`,
      onRemove: () => updateFilter("villageSearch", ""),
    });
  if (filters.distanceRange[0] > 0 || filters.distanceRange[1] < 40)
    chips.push({
      label: `Dist: ${filters.distanceRange[0]}-${filters.distanceRange[1]}km`,
      onRemove: () => updateFilter("distanceRange", [0, 40]),
    });

  return (
    <div className="border-b border-border bg-card px-4 py-2 space-y-2 sticky top-0 z-30">
      {/* Increased spacing: each control has more min width + larger gaps */}
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <div className="min-w-[92px]">
          <div className="filter-label">Year</div>
          <Select
            value={String(filters.year)}
            onValueChange={(v) => updateFilter("year", Number(v))}
          >
            <SelectTrigger className="h-8 w-full text-xs">
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

        <div className="min-w-[110px]">
          <div className="filter-label">From</div>
          <Select
            value={String(filters.monthStart)}
            onValueChange={(v) => updateFilter("monthStart", Number(v))}
          >
            <SelectTrigger className="h-8 w-full text-xs">
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

        <div className="min-w-[110px]">
          <div className="filter-label">To</div>
          <Select
            value={String(filters.monthEnd)}
            onValueChange={(v) => updateFilter("monthEnd", Number(v))}
          >
            <SelectTrigger className="h-8 w-full text-xs">
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

        <div className="min-w-[180px]">
          <div className="filter-label">District</div>
          <MultiSelect
            options={districts}
            selected={filters.districts}
            onChange={(v) => updateFilter("districts", v)}
            placeholder="All"
          />
        </div>

        <div className="min-w-[200px]">
          <div className="filter-label">Upazila</div>
          <MultiSelect
            options={upazilas}
            selected={filters.upazilas}
            onChange={(v) => updateFilter("upazilas", v)}
            placeholder="All"
          />
        </div>

        <div className="min-w-[190px]">
          <div className="filter-label">Union</div>
          <MultiSelect
            options={unions}
            selected={filters.unions}
            onChange={(v) => updateFilter("unions", v)}
            placeholder="All"
          />
        </div>

        <div className="min-w-[190px]">
          <div className="filter-label">Village Search</div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              className="h-8 w-full text-xs pl-6"
              placeholder="Name or code..."
              value={filters.villageSearch}
              onChange={(e) => updateFilter("villageSearch", e.target.value)}
            />
          </div>
        </div>

        <div className="min-w-[160px]">
          <div className="filter-label">Designation</div>
          <MultiSelect
            options={["SK(H)", "SHW(H)"]}
            selected={filters.designations}
            onChange={(v) => updateFilter("designations", v)}
            placeholder="All"
          />
        </div>

        <div className="min-w-[130px]">
          <div className="filter-label">Border</div>
          <Select
            value={filters.borderFilter}
            onValueChange={(v: "all" | "border" | "non-border") =>
              updateFilter("borderFilter", v)
            }
          >
            <SelectTrigger className="h-8 w-full text-xs">
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

        <div className="min-w-[220px]">
          <div className="filter-label">
            Distance (km): {filters.distanceRange[0]}–{filters.distanceRange[1]}
          </div>
          <Slider
            min={0}
            max={40}
            step={1}
            value={filters.distanceRange}
            onValueChange={(v) => updateFilter("distanceRange", v as [number, number])}
            className="w-full mt-2"
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs px-3"
          onClick={resetFilters}
        >
          <RotateCcw className="h-3 w-3 mr-1" /> Reset
        </Button>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c, i) => (
            <span key={i} className="filter-chip">
              {c.label}
              <button onClick={c.onRemove}>
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
