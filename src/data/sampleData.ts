import { Village } from "@/types/dashboard";

function createRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const UPAZILA_CONFIG = [
  { name: "Bandarban Sadar", code: "BS", count: 40, hotspot: false, borderPct: 0, avgDist: 8 },
  { name: "Thanchi", code: "TH", count: 40, hotspot: true, borderPct: 30, avgDist: 25 },
  { name: "Ruma", code: "RU", count: 35, hotspot: true, borderPct: 25, avgDist: 20 },
  { name: "Alikadam", code: "AL", count: 35, hotspot: false, borderPct: 5, avgDist: 15 },
  { name: "Naikkhyongchhari", code: "NK", count: 35, hotspot: false, borderPct: 10, avgDist: 18 },
  { name: "Rowangchhari", code: "RC", count: 30, hotspot: false, borderPct: 5, avgDist: 12 },
  { name: "Lama", code: "LA", count: 35, hotspot: true, borderPct: 10, avgDist: 10 },
] as const;

const UPAZILA_BN: Record<string, string> = {
  "Bandarban Sadar": "বান্দরবান সদর",
  Thanchi: "থানচি",
  Ruma: "রুমা",
  Alikadam: "আলীকদম",
  Naikkhyongchhari: "নাইক্ষ্যংছড়ি",
  Rowangchhari: "রোয়াংছড়ি",
  Lama: "লামা",
};

const SK_NAMES = ["SK Ayesha", "SK Fatima", "SK Rahima", "SK Nasrin", "SK Halima", "SK Khadija", "SK Mariam", "SK Sultana", "SK Razia", "SK Begum"];
const SHW_NAMES = ["SHW Nahar", "SHW Lily", "SHW Rina", "SHW Salma", "SHW Parul", "SHW Mina", "SHW Josna", "SHW Rekha", "SHW Shilpi", "SHW Doli"];
const SS_NAMES = ["SS Rahim", "SS Salma", "SS Karim", "SS Jamal", "SS Farid", "SS Noor", "SS Hasan", "SS Mamun", "SS Tariq", "SS Liton"];
const SERVICE_POINTS = ["MMW", "Health Post", "CHW", "Community Clinic", "UHC"];
const ACTIVITIES = ["TDA", "Dev Care", "None", "IRS", "None", "SBCC"];

function generateVillages(): Village[] {
  const rng = createRng(42);
  const villages: Village[] = [];

  for (const config of UPAZILA_CONFIG) {
    for (let i = 0; i < config.count; i++) {
      const idx = i + 1;
      const code = `BB-${config.code}-${String(idx).padStart(3, "0")}`;
      const unionNum = (i % 5) + 1;
      const wardNum = (i % 9) + 1;
      const isSK = rng() > 0.5;
      const pop = Math.floor(150 + rng() * rng() * 2350);
      const dist = Math.max(1, Math.round(config.avgDist + (rng() - 0.5) * 20));
      const isBorder = rng() * 100 < config.borderPct;
      const isHotVillage = config.hotspot && rng() < 0.3;

      const baseline = isHotVillage ? 3 + rng() * 20 : rng() * 4;
      const monthly: (number | null)[] = [];
      for (let m = 0; m < 12; m++) {
        if (m >= 10) {
          monthly.push(null);
        } else if (m === 9) {
          monthly.push(rng() < 0.5 ? null : Math.max(0, Math.floor(baseline + (rng() - 0.4) * baseline)));
        } else {
          const missingChance = dist > 20 ? 0.15 : dist > 15 ? 0.08 : 0.03;
          if (rng() < missingChance) {
            monthly.push(null);
          } else {
            const seasonal = m >= 5 && m <= 7 ? 1.5 : 1.0;
            monthly.push(Math.max(0, Math.floor(baseline * seasonal + (rng() - 0.4) * baseline)));
          }
        }
      }

      const total2026 = monthly.reduce((s: number, v) => s + (v ?? 0), 0);
      const total2025 = Math.floor(total2026 * (0.8 + rng() * 0.6));
      const total2024 = Math.floor(total2025 * (0.8 + rng() * 0.6));

      villages.push({
        country: "Bangladesh",
        division: "Chattogram",
        district: "Bandarban",
        upazila: config.name,
        union: `Union-0${unionNum}`,
        ward_no: `Ward-0${wardNum}`,
        sk_shw_name: isSK ? SK_NAMES[i % SK_NAMES.length] : SHW_NAMES[i % SHW_NAMES.length],
        designation: isSK ? "SK(H)" : "SHW(H)",
        ss_name: SS_NAMES[i % SS_NAMES.length],
        village_name_en: `${config.name} Village ${idx}`,
        village_name_bn: `${UPAZILA_BN[config.name]} গ্রাম ${idx}`,
        village_code: code,
        population: pop,
        active_llin_2026: Math.floor(pop * (0.4 + rng() * 0.8)),
        active_llin_2025: Math.floor(pop * (0.3 + rng() * 0.7)),
        active_llin_2024: Math.floor(pop * (0.2 + rng() * 0.6)),
        service_point: SERVICE_POINTS[Math.floor(rng() * SERVICE_POINTS.length)],
        distance_km: dist,
        border_country: isBorder ? "Myanmar" : "None",
        other_activities: ACTIVITIES[Math.floor(rng() * ACTIVITIES.length)],
        cases_monthly_2026: monthly,
        cases_2025_total: total2025,
        cases_2024_total: total2024,
      });
    }
  }

  return villages;
}

export const sampleVillages = generateVillages();
