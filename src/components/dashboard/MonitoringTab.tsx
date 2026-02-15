import { useState } from "react";
import { ComputedVillage } from "@/types/dashboard";
import { KPICards } from "./KPICards";
import { TrendChart } from "./TrendChart";
import { HotspotChart } from "./HotspotChart";
import { CompletenessHeatmap } from "./CompletenessHeatmap";
import { DataQuality } from "./DataQuality";
import { DetailTable } from "./DetailTable";
import { VillageDrawer } from "./VillageDrawer";
import { LLINGapPanel } from "./LLINGapPanel";

export function MonitoringTab() {
  const [selectedVillage, setSelectedVillage] = useState<ComputedVillage | null>(null);

  return (
    <div className="space-y-4">
      <KPICards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrendChart />
        <HotspotChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CompletenessHeatmap onSelectVillage={setSelectedVillage} />
        </div>
        <DataQuality />
      </div>

      <LLINGapPanel />

      <DetailTable onViewVillage={setSelectedVillage} />

      <VillageDrawer
        village={selectedVillage}
        open={!!selectedVillage}
        onClose={() => setSelectedVillage(null)}
      />
    </div>
  );
}
