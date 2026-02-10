import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({ options, selected, onChange, placeholder = "Select...", className }: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((s) => s !== value) : [...selected, value]);
  };

  const label = selected.length === 0 ? placeholder : selected.length <= 2 ? selected.join(", ") : `${selected.length} selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("justify-between font-normal text-xs h-8", className)}>
          <span className="truncate max-w-[120px]">{label}</span>
          <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0 bg-popover z-50" align="start">
        <div className="max-h-56 overflow-y-auto p-1">
          {options.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">No options</div>}
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => toggle(opt)}
              className="flex items-center w-full px-2 py-1.5 text-xs rounded hover:bg-muted gap-2"
            >
              <div className={cn("w-3.5 h-3.5 border rounded-sm flex items-center justify-center", selected.includes(opt) ? "bg-primary border-primary" : "border-input")}>
                {selected.includes(opt) && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
              </div>
              {opt}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
