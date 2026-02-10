import { User, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="relative h-12 border-b border-border bg-primary text-white flex items-center justify-center px-4 shrink-0">
      {/* Centered Title */}
      <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold tracking-wide text-white">
        Micro-Stratification Monitoring & Summary
      </h1>

      {/* Right Controls */}
      <div className="ml-auto flex items-center gap-3 text-white">
        <span className="text-[10px] opacity-80 flex items-center gap-1">
          <RefreshCw className="h-3 w-3" />
          Last Refresh:{" "}
          {new Date().toLocaleDateString()}{" "}
          {new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-white hover:bg-white/10"
            >
              <User className="h-3.5 w-3.5 mr-1" />
              <span className="text-xs">Admin</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="bg-popover z-50">
            <DropdownMenuItem className="text-xs">
              Role: District Coordinator
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs">
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
