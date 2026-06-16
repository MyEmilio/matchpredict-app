// Surse meteo: Open-Meteo (gratuit, fără cheie API) — geocodificare oraș,
// arhivă istorică și prognoză pe termen scurt.

const GEOCODE_BASE = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_BASE = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_BASE = "https://archive-api.open-meteo.com/v1/archive";

export type Coord = { lat: number; lon: number };

export type WeatherCondition = "Ploaie" | "Ger" | "Frig" | "Caniculă" | "Normal";

export type DayWeather = { tempC: number; precipMm: number; condition: WeatherCondition };

export function classifyWeather(tempC: number, precipMm: number): WeatherCondition {
  if (precipMm > 1) return "Ploaie";
  if (tempC < 0) return "Ger";
  if (tempC < 10) return "Frig";
  if (tempC > 28) return "Caniculă";
  return "Normal";
}

export async function geocodeCity(city: string): Promise<Coord | null> {
  try {
    const res = await fetch(`${GEOCODE_BASE}?name=${encodeURIComponent(city)}&count=1`, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.json();
    const r = data?.results?.[0];
    return r ? { lat: r.latitude, lon: r.longitude } : null;
  } catch {
    return null;
  }
}

// Hartă dată(YYYY-MM-DD) -> vreme, pentru un interval istoric la o locație.
export async function fetchArchiveWeather(coord: Coord, startDate: string, endDate: string): Promise<Map<string, DayWeather>> {
  const map = new Map<string, DayWeather>();
  try {
    const url = `${ARCHIVE_BASE}?latitude=${coord.lat}&longitude=${coord.lon}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_mean,precipitation_sum&timezone=auto`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return map;
    const data = await res.json();
    const dates: string[] = data?.daily?.time ?? [];
    const temps: number[] = data?.daily?.temperature_2m_mean ?? [];
    const precs: number[] = data?.daily?.precipitation_sum ?? [];
    dates.forEach((d, i) => {
      if (temps[i] == null) return;
      map.set(d, { tempC: temps[i], precipMm: precs[i] ?? 0, condition: classifyWeather(temps[i], precs[i] ?? 0) });
    });
  } catch { /* ignore, returnăm map gol */ }
  return map;
}

// Prognoză pentru o singură zi. Open-Meteo acoperă doar o fereastră de
// aproximativ -3 luni / +16 zile față de azi — în afara ei, întoarcem null.
export async function fetchForecastWeather(coord: Coord, date: string): Promise<DayWeather | { error: string } | null> {
  try {
    const url = `${FORECAST_BASE}?latitude=${coord.lat}&longitude=${coord.lon}&daily=temperature_2m_mean,precipitation_sum&start_date=${date}&end_date=${date}&timezone=auto`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    const data = await res.json();
    if (!res.ok || data?.error) return { error: data?.reason ?? "Prognoză indisponibilă pentru această dată" };
    const tempC = data?.daily?.temperature_2m_mean?.[0];
    const precipMm = data?.daily?.precipitation_sum?.[0] ?? 0;
    if (tempC == null) return { error: "Prognoză indisponibilă pentru această dată" };
    return { tempC, precipMm, condition: classifyWeather(tempC, precipMm) };
  } catch {
    return { error: "Prognoză indisponibilă (eroare rețea)" };
  }
}
