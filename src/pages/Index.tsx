import { FilterProvider } from "@/hooks/useFilters";
import { Header } from "@/components/dashboard/Header";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { MonitoringTab } from "@/components/dashboard/MonitoringTab";
import { SummaryTab } from "@/components/dashboard/SummaryTab";
import { MapTab } from "@/components/dashboard/MapTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  return (
    <FilterProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <FilterBar />
        <main className="flex-1 container mx-auto px-4 py-4">
          <Tabs defaultValue="monitoring">
            <TabsList className="mb-4">
              <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="map">Map</TabsTrigger>
            </TabsList>
            <TabsContent value="monitoring">
              <MonitoringTab />
            </TabsContent>
            <TabsContent value="summary">
              <SummaryTab />
            </TabsContent>
            <TabsContent value="map">
              <MapTab />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </FilterProvider>
  );
};

export default Index;
