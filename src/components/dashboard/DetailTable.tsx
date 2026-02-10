import { useState, useMemo } from "react";
import { useFilters } from "@/hooks/useFilters";
import { getSelectedMonthCases, getYearAPI } from "@/lib/computations";
import { ComputedVillage, MONTHS } from "@/types/dashboard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, ChevronLeft, ChevronRight, ArrowUpDown, Settings2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  onViewVillage: (v: ComputedVillage) => void;
}

type SortDir = "asc" | "desc";

const ALL_COLUMNS = [
  { key: "district", label: "District" },
  { key: "upazila", label: "Upazila" },
  { key: "union", label: "Union" },
  { key: "ward_no", label: "Ward" },
  { key: "village_name_en", label: "Village" },
  { key: "village_code", label: "Code" },
  { key: "population", label: "Pop." },
  { key: "distance_km", label: "Dist.(km)" },
  { key: "border_country", label: "Border" },
  { key: "designation", label: "Desig." },
  { key: "ss_name", label: "SS Name" },
  { key: "selectedCases", label: "Cases (sel.)" },
  { key: "yearTotal", label: "Year Total" },
  { key: "api", label: "API" },
] as const;

const DEFAULT_VISIBLE = ["upazila", "union", "ward_no", "village_name_en", "village_code", "population", "distance_km", "border_country", "designation", "ss_name", "selectedCases", "yearTotal", "api"];

export function DetailTable({ onViewVillage }: Props) {
  const { filteredVillages, filters } = useFilters();
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string>("selectedCases");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visibleCols, setVisibleCols] = useState<string[]>(DEFAULT_VISIBLE);
  const pageSize = 15;

  const enriched = useMemo(() => filteredVillages.map((v) => ({
    ...v,
    selectedCases: getSelectedMonthCases(v, filters.year, filters.monthStart, filters.monthEnd),
    yearTotal: filters.year === 2026 ? v.cases_2026_total : filters.year === 2025 ? v.cases_2025_total : v.cases_2024_total,
    api: getYearAPI(v, filters.year),
  })), [filteredVillages, filters]);

  const sorted = useMemo(() => {
    return [...enriched].sort((a, b) => {
      const av = (a as any)[sortKey];
      const bv = (b as any)[sortKey];
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [enriched, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const pageData = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const toggleCol = (key: string) => {
    setVisibleCols((prev) => prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]);
  };

  const cols = ALL_COLUMNS.filter((c) => visibleCols.includes(c.key));

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Village Detail Table ({sorted.length} rows)</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-[10px]"><Settings2 className="h-3 w-3 mr-1" />Columns</Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2 bg-popover z-50" align="end">
            {ALL_COLUMNS.map((c) => (
              <label key={c.key} className="flex items-center gap-2 py-1 text-xs cursor-pointer">
                <Checkbox checked={visibleCols.includes(c.key)} onCheckedChange={() => toggleCol(c.key)} />
                {c.label}
              </label>
            ))}
          </PopoverContent>
        </Popover>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {cols.map((c) => (
                <TableHead key={c.key} className="text-[10px] cursor-pointer whitespace-nowrap select-none" onClick={() => toggleSort(c.key)}>
                  <span className="inline-flex items-center gap-0.5">{c.label}<ArrowUpDown className="h-2.5 w-2.5 opacity-40" /></span>
                </TableHead>
              ))}
              <TableHead className="text-[10px] w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageData.length === 0 && (
              <TableRow><TableCell colSpan={cols.length + 1} className="text-center text-xs text-muted-foreground py-8">No villages match filters</TableCell></TableRow>
            )}
            {pageData.map((v) => (
              <TableRow key={v.village_code} className="text-xs">
                {cols.map((c) => (
                  <TableCell key={c.key} className="py-1.5 text-[11px] whitespace-nowrap">
                    {c.key === "api" ? (v as any)[c.key].toFixed(1) : String((v as any)[c.key])}
                  </TableCell>
                ))}
                <TableCell className="py-1.5">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onViewVillage(v)}>
                    <Eye className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border">
          <span className="text-[10px] text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="h-3 w-3" /></Button>
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}><ChevronRight className="h-3 w-3" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
