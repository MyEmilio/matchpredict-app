import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { geocodeCity, fetchArchiveWeather, fetchForecastWeather, type DayWeather, type WeatherCondition } from "@/app/lib/weather";

const AF_KEY = process.env.API_FOOTBALL_KEY!;
const AF_BASE = "https://v3.football.api-sports.io";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

async function af(path: string) {
  const res = await fetch(`${AF_BASE}${path}`, {
    headers: { "x-apisports-key": AF_KEY },
    next: { revalidate: 300 },
  });
  if (!res.ok) return null;
  return res.json();
}

function biorhythm(birthDate: string, matchDate: string): number {
  const birth = new Date(birthDate).getTime();
  const match = new Date(matchDate).getTime();
  if (isNaN(birth) || isNaN(match)) return 0;
  const days = Math.floor((match - birth) / 86400000);
  return (
    Math.sin((2 * Math.PI * days) / 23) +
    Math.sin((2 * Math.PI * days) / 28) +
    Math.sin((2 * Math.PI * days) / 33)
  ) / 3;
}

type Fixture = {
  fixture: { id: number; date: string };
  teams: { home: { id: number }; away: { id: number } };
  goals: { home: number | null; away: number | null };
};

function formFromFixtures(fixtures: Fixture[], teamId: number): string {
  return fixtures.slice(-5).map((f) => {
    const isHome = f.teams.home.id === teamId;
    const gs = isHome ? (f.goals.home ?? 0) : (f.goals.away ?? 0);
    const gc = isHome ? (f.goals.away ?? 0) : (f.goals.home ?? 0);
    return gs > gc ? "W" : gs === gc ? "D" : "L";
  }).join("");
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Planul gratuit API-Football nu permite parametrul "last" (întoarce mereu gol).
// Folosim sezoanele accesibile (2023+2024) ca alternativă — cea mai recentă
// fereastră reală e ~iunie 2023 - mai 2025, nu literalmente "ultimii 2 ani" de azi.
const FIXTURE_SEASONS = [2023, 2024];
const FIXTURE_DATA_WINDOW_NOTE = "date din sezoanele 2023-2024 (iun.2023–mai 2025) — limitare plan API";

async function fetchTeamFixtures(teamId: number): Promise<Fixture[]> {
  const all: Fixture[] = [];
  for (const season of FIXTURE_SEASONS) {
    const data = await af(`/fixtures?team=${teamId}&season=${season}&status=FT`);
    if (data?.response?.length) all.push(...data.response);
    await delay(200);
  }
  const seen = new Set<number>();
  return all
    .filter((f) => (seen.has(f.fixture.id) ? false : (seen.add(f.fixture.id), true)))
    .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime());
}

type WeatherRow = {
  condition: WeatherCondition;
  matches: number; w: number; d: number; l: number;
  goalsForAvg: number; goalsAgainstAvg: number; winRate: number;
};

function buildWeatherRows(homeFixtures: Fixture[], weatherByDate: Map<string, DayWeather>): WeatherRow[] {
  const buckets = new Map<WeatherCondition, { matches: number; w: number; d: number; l: number; gf: number; ga: number }>();
  for (const f of homeFixtures) {
    const dayWeather = weatherByDate.get(f.fixture.date.slice(0, 10));
    if (!dayWeather) continue;
    const gf = f.goals.home ?? 0, ga = f.goals.away ?? 0;
    const b = buckets.get(dayWeather.condition) ?? { matches: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
    b.matches++;
    if (gf > ga) b.w++; else if (gf === ga) b.d++; else b.l++;
    b.gf += gf; b.ga += ga;
    buckets.set(dayWeather.condition, b);
  }
  return Array.from(buckets.entries()).map(([condition, b]) => ({
    condition, matches: b.matches, w: b.w, d: b.d, l: b.l,
    goalsForAvg: Math.round((b.gf / b.matches) * 10) / 10,
    goalsAgainstAvg: Math.round((b.ga / b.matches) * 10) / 10,
    winRate: Math.round((b.w / b.matches) * 100),
  })).sort((a, b) => b.matches - a.matches);
}

function dateRangeOf(fixtures: Fixture[]): [string, string] | null {
  if (!fixtures.length) return null;
  const dates = fixtures.map((f) => f.fixture.date.slice(0, 10)).sort();
  return [dates[0], dates[dates.length - 1]];
}

// Datele de naștere nu se schimbă, dar planul gratuit API-Football acceptă
// doar sezoanele 2022-2024 pe endpoint-ul /players — îl folosim doar ca sursă
// pentru profilul jucătorului (naștere), indiferent de sezonul meciului real.
const BIRTH_LOOKUP_SEASON = 2024;

type AfFn = (path: string) => Promise<{ response?: { player?: { birth?: { date?: string } } }[] } | null>;

async function fetchBirthDate(af: AfFn, playerId: number): Promise<string | null> {
  const data = await af(`/players?id=${playerId}&season=${BIRTH_LOOKUP_SEASON}`);
  return data?.response?.[0]?.player?.birth?.date ?? null;
}

async function fetchStartersWithBirth(
  af: AfFn,
  starters: { id: number; name: string }[]
) {
  const out: { id: number; name: string; birthDate: string | null }[] = [];
  for (const p of starters.slice(0, 11)) {
    const birthDate = await fetchBirthDate(af, p.id);
    out.push({ id: p.id, name: p.name, birthDate });
    await delay(200);
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const { homeTeamId, awayTeamId, matchDate, homeStarters, awayStarters } = await req.json() as {
      homeTeamId: number; awayTeamId: number; matchDate: string;
      homeStarters?: { id: number; name: string }[]; awayStarters?: { id: number; name: string }[];
    };
    if (!homeTeamId || !awayTeamId || !matchDate)
      return NextResponse.json({ error: "Lipsesc parametrii" }, { status: 400 });

    const season = new Date(matchDate).getFullYear();

    // Pentru H2H pe baza from/to — "last" nu e disponibil pe planul gratuit.
    const h2hFromDate = new Date(matchDate);
    h2hFromDate.setFullYear(h2hFromDate.getFullYear() - 3);
    const h2hFrom = h2hFromDate.toISOString().slice(0, 10);

    // Fetch secvențial pentru rate limit
    const homeTeamData = await af(`/teams?id=${homeTeamId}`); await delay(200);
    const awayTeamData = await af(`/teams?id=${awayTeamId}`); await delay(200);
    const homeFix      = await fetchTeamFixtures(homeTeamId);
    const awayFix      = await fetchTeamFixtures(awayTeamId);
    const h2hData      = await af(`/fixtures/headtohead?h2h=${homeTeamId}-${awayTeamId}&from=${h2hFrom}&to=${matchDate}&status=FT`); await delay(200);
    // Accidentați/suspendați
    const homeInjData  = await af(`/injuries?team=${homeTeamId}&season=${season}`); await delay(200);
    const awayInjData  = await af(`/injuries?team=${awayTeamId}&season=${season}`); await delay(200);

    // Bioritm — calculat DOAR din titularii selectați manual (cu dată de naștere reală)
    const homeStartersRaw = homeStarters?.length ? await fetchStartersWithBirth(af, homeStarters) : [];
    const awayStartersRaw = awayStarters?.length ? await fetchStartersWithBirth(af, awayStarters) : [];
    const withBio = (s: { id: number; name: string; birthDate: string | null }[]) =>
      s.map((p) => ({ ...p, bioPct: p.birthDate ? Math.round(biorhythm(p.birthDate, matchDate) * 100) : null }));
    const homeStartersDetail = withBio(homeStartersRaw);
    const awayStartersDetail = withBio(awayStartersRaw);

    const homeTeam      = homeTeamData?.response?.[0]?.team ?? null;
    const awayTeam      = awayTeamData?.response?.[0]?.team ?? null;
    const homeVenueCity = homeTeamData?.response?.[0]?.venue?.city ?? null;
    const awayVenueCity = awayTeamData?.response?.[0]?.venue?.city ?? null;
    const h2hFix        = h2hData?.response ?? [];

    // Meteo — performanța fiecărei echipe pe teren propriu în funcție de
    // condițiile meteo istorice, plus prognoza pentru ziua meciului.
    const [homeCoord, awayCoord] = await Promise.all([
      homeVenueCity ? geocodeCity(homeVenueCity) : Promise.resolve(null),
      awayVenueCity ? geocodeCity(awayVenueCity) : Promise.resolve(null),
    ]);
    const homeOnlyFix = homeFix.filter((f) => f.teams.home.id === homeTeamId);
    const awayOnlyFix = awayFix.filter((f) => f.teams.home.id === awayTeamId);
    const homeRange = dateRangeOf(homeOnlyFix);
    const awayRange = dateRangeOf(awayOnlyFix);
    const [homeWeatherMap, awayWeatherMap] = await Promise.all([
      homeCoord && homeRange ? fetchArchiveWeather(homeCoord, homeRange[0], homeRange[1]) : Promise.resolve(new Map<string, DayWeather>()),
      awayCoord && awayRange ? fetchArchiveWeather(awayCoord, awayRange[0], awayRange[1]) : Promise.resolve(new Map<string, DayWeather>()),
    ]);
    const homeWeatherRows = buildWeatherRows(homeOnlyFix, homeWeatherMap);
    const awayWeatherRows = buildWeatherRows(awayOnlyFix, awayWeatherMap);

    const forecastRaw = homeCoord ? await fetchForecastWeather(homeCoord, matchDate) : { error: "Oraș stadion necunoscut" };
    const forecast = forecastRaw && !("error" in forecastRaw) ? forecastRaw : null;
    const forecastError = forecastRaw && "error" in forecastRaw ? forecastRaw.error : null;

    // Procesare accidentați
    const parseInjuries = (data: { response?: { player: { name: string }; type: string }[] } | null) => {
      if (!data?.response?.length) return [];
      return data.response.slice(0, 5).map((i) => ({
        name: i.player.name,
        type: i.type,
      }));
    };
    const homeInjuries = parseInjuries(homeInjData);
    const awayInjuries = parseInjuries(awayInjData);

    const homeForm = formFromFixtures(homeFix, homeTeamId);
    const awayForm = formFromFixtures(awayFix, awayTeamId);

    const calcTeamBio = (starters: { birthDate: string | null }[]): number | null => {
      const scores = starters.filter((p) => p.birthDate).map((p) => biorhythm(p.birthDate!, matchDate));
      return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    };
    const homeBio = calcTeamBio(homeStartersDetail);
    const awayBio = calcTeamBio(awayStartersDetail);
    const bioText = (bio: number | null, count: number) =>
      bio === null ? "necunoscut (titularii nu au fost selectați)" : `${(bio*100).toFixed(1)}% (din ${count} titulari selectați)`;

    // H2H
    let h2hSummary = "Fără date H2H";
    if (h2hFix.length > 0) {
      let hW = 0, dr = 0, aW = 0;
      for (const f of h2hFix) {
        const isHome = f.teams.home.id === homeTeamId;
        const gs = isHome ? (f.goals.home ?? 0) : (f.goals.away ?? 0);
        const gc = isHome ? (f.goals.away ?? 0) : (f.goals.home ?? 0);
        if (gs > gc) hW++; else if (gs === gc) dr++; else aW++;
      }
      h2hSummary = `Ultimele ${h2hFix.length} meciuri: ${homeTeam?.name} ${hW}V–${dr}E–${aW}V ${awayTeam?.name}`;
    }

    const pf = (f: string) => ({ w: (f.match(/W/g)??[]).length, d: (f.match(/D/g)??[]).length, l: (f.match(/L/g)??[]).length });
    const hf = pf(homeForm); const af2 = pf(awayForm);

    const injText = (inj: {name:string;type:string}[], name: string) =>
      inj.length ? `${inj.length} jucători indisponibili la ${name}: ${inj.map(i=>i.name).join(", ")}` : `Fără accidentări cunoscute la ${name}`;

    const weatherRowsText = (rows: WeatherRow[], name: string) =>
      rows.length
        ? rows.map((r) => `${r.condition} (${r.matches} meciuri): ${r.w}V-${r.d}E-${r.l}P, ${r.winRate}% victorii, ${r.goalsForAvg}-${r.goalsAgainstAvg} goluri/meci`).join(" | ")
        : `Fără date meteo istorice pentru ${name}`;

    const forecastText = forecast
      ? `${forecast.tempC.toFixed(1)}°C, ${forecast.precipMm.toFixed(1)}mm precipitații → condiție: ${forecast.condition}`
      : `Prognoză indisponibilă (${forecastError ?? "motiv necunoscut"})`;

    const prompt = `Ești un analist fotbalistic expert. Prezice meciul bazat pe date reale.

MECI: ${homeTeam?.name ?? homeTeamId} (ACASĂ) vs ${awayTeam?.name ?? awayTeamId} (DEPLASARE)
DATA: ${matchDate}

ACASĂ — ${homeTeam?.name}:
- Formă 5 meciuri: ${homeForm||"N/A"} (${hf.w}V/${hf.d}E/${hf.l}P)
- Bioritm titulari: ${bioText(homeBio, homeStartersDetail.length)}
- ${injText(homeInjuries, homeTeam?.name ?? "acasă")}

DEPLASARE — ${awayTeam?.name}:
- Formă 5 meciuri: ${awayForm||"N/A"} (${af2.w}V/${af2.d}E/${af2.l}P)
- Bioritm titulari: ${bioText(awayBio, awayStartersDetail.length)}
- ${injText(awayInjuries, awayTeam?.name ?? "deplasare")}

ISTORIC DIRECT: ${h2hSummary}

PROGNOZĂ METEO ZIUA MECIULUI (la stadionul echipei ACASĂ): ${forecastText}

PERFORMANȚĂ PE TEREN PROPRIU DUPĂ VREME (${FIXTURE_DATA_WINDOW_NOTE}):
- ${homeTeam?.name ?? "Acasă"}: ${weatherRowsText(homeWeatherRows, homeTeam?.name ?? "acasă")}
- ${awayTeam?.name ?? "Deplasare"} (pe teren propriu, ca referință generală): ${weatherRowsText(awayWeatherRows, awayTeam?.name ?? "deplasare")}

Răspunde EXCLUSIV JSON:
{
  "predictedHome": <0-5>,
  "predictedAway": <0-5>,
  "homeWinPct": <0-100>,
  "drawPct": <0-100>,
  "awayWinPct": <0-100>,
  "confidence": <0-100>,
  "keyFactors": [
    {"icon":"📊","label":"Formă recentă","detail":"<scurt>","advantage":"home|away|equal"},
    {"icon":"🔬","label":"Bioritm","detail":"<scurt; dacă e necunoscut la o echipă, scrie asta și pune advantage equal>","advantage":"home|away|equal"},
    {"icon":"🏟️","label":"Avantaj teren","detail":"<scurt>","advantage":"home|away|equal"},
    {"icon":"⚔️","label":"Istoric direct","detail":"<scurt>","advantage":"home|away|equal"},
    {"icon":"🏥","label":"Accidentați","detail":"<scurt>","advantage":"home|away|equal"},
    {"icon":"🌦️","label":"Meteo","detail":"<scurt; compară istoricul echipelor în condiții similare cu prognoza; dacă prognoza e indisponibilă, spune asta și pune advantage equal>","advantage":"home|away|equal"}
  ],
  "reasoning": "<2-3 propoziții în română>",
  "tip": "<recomandare pariu simplu>"
}
homeWinPct+drawPct+awayWinPct=100.`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 900,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Răspuns AI invalid");
    const prediction = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      homeTeam: {
        id: homeTeamId, name: homeTeam?.name ?? String(homeTeamId), crest: homeTeam?.logo ?? "", form: homeForm,
        biorhythm: homeBio === null ? null : Math.round(homeBio * 100), biorhythmDetail: homeStartersDetail, injuries: homeInjuries,
        weather: { rows: homeWeatherRows, dataWindow: FIXTURE_DATA_WINDOW_NOTE },
      },
      awayTeam: {
        id: awayTeamId, name: awayTeam?.name ?? String(awayTeamId), crest: awayTeam?.logo ?? "", form: awayForm,
        biorhythm: awayBio === null ? null : Math.round(awayBio * 100), biorhythmDetail: awayStartersDetail, injuries: awayInjuries,
        weather: { rows: awayWeatherRows, dataWindow: FIXTURE_DATA_WINDOW_NOTE },
      },
      forecast: forecast ? { ...forecast, venueCity: homeVenueCity } : null,
      forecastError,
      prediction,
      matchDate,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
