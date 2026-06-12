import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

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

function formFromFixtures(
  fixtures: { teams: { home: { id: number }; away: { id: number } }; goals: { home: number | null; away: number | null } }[],
  teamId: number
): string {
  return fixtures.slice(-5).map((f) => {
    const isHome = f.teams.home.id === teamId;
    const gs = isHome ? (f.goals.home ?? 0) : (f.goals.away ?? 0);
    const gc = isHome ? (f.goals.away ?? 0) : (f.goals.home ?? 0);
    return gs > gc ? "W" : gs === gc ? "D" : "L";
  }).join("");
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  try {
    const { homeTeamId, awayTeamId, matchDate } = await req.json() as {
      homeTeamId: number; awayTeamId: number; matchDate: string;
    };
    if (!homeTeamId || !awayTeamId || !matchDate)
      return NextResponse.json({ error: "Lipsesc parametrii" }, { status: 400 });

    const season = new Date(matchDate).getFullYear();

    // Fetch secvențial pentru rate limit
    const homeTeamData = await af(`/teams?id=${homeTeamId}`); await delay(200);
    const awayTeamData = await af(`/teams?id=${awayTeamId}`); await delay(200);
    const homeFixData  = await af(`/fixtures?team=${homeTeamId}&last=10&status=FT`); await delay(200);
    const awayFixData  = await af(`/fixtures?team=${awayTeamId}&last=10&status=FT`); await delay(200);
    const h2hData      = await af(`/fixtures/headtohead?h2h=${homeTeamId}-${awayTeamId}&last=6`); await delay(200);
    const homeSquadData= await af(`/players/squads?team=${homeTeamId}`); await delay(200);
    const awaySquadData= await af(`/players/squads?team=${awayTeamId}`); await delay(200);
    // Accidentați/suspendați
    const homeInjData  = await af(`/injuries?team=${homeTeamId}&season=${season}`); await delay(200);
    const awayInjData  = await af(`/injuries?team=${awayTeamId}&season=${season}`);

    const homeTeam   = homeTeamData?.response?.[0]?.team ?? null;
    const awayTeam   = awayTeamData?.response?.[0]?.team ?? null;
    const homeFix    = homeFixData?.response ?? [];
    const awayFix    = awayFixData?.response ?? [];
    const h2hFix     = h2hData?.response ?? [];
    const homePlayers= homeSquadData?.response?.[0]?.players ?? [];
    const awayPlayers= awaySquadData?.response?.[0]?.players ?? [];

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

    const calcTeamBio = (players: { birth?: { date?: string } }[]) => {
      const scores = players.filter((p) => p.birth?.date).map((p) => biorhythm(p.birth!.date!, matchDate));
      return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    };
    const homeBio = calcTeamBio(homePlayers);
    const awayBio = calcTeamBio(awayPlayers);

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

    const prompt = `Ești un analist fotbalistic expert. Prezice meciul bazat pe date reale.

MECI: ${homeTeam?.name ?? homeTeamId} (ACASĂ) vs ${awayTeam?.name ?? awayTeamId} (DEPLASARE)
DATA: ${matchDate}

ACASĂ — ${homeTeam?.name}:
- Formă 5 meciuri: ${homeForm||"N/A"} (${hf.w}V/${hf.d}E/${hf.l}P)
- Bioritm echipă: ${(homeBio*100).toFixed(1)}%
- ${injText(homeInjuries, homeTeam?.name ?? "acasă")}

DEPLASARE — ${awayTeam?.name}:
- Formă 5 meciuri: ${awayForm||"N/A"} (${af2.w}V/${af2.d}E/${af2.l}P)
- Bioritm echipă: ${(awayBio*100).toFixed(1)}%
- ${injText(awayInjuries, awayTeam?.name ?? "deplasare")}

ISTORIC DIRECT: ${h2hSummary}

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
    {"icon":"🔬","label":"Bioritm","detail":"<scurt>","advantage":"home|away|equal"},
    {"icon":"🏟️","label":"Avantaj teren","detail":"<scurt>","advantage":"home|away|equal"},
    {"icon":"⚔️","label":"Istoric direct","detail":"<scurt>","advantage":"home|away|equal"},
    {"icon":"🏥","label":"Accidentați","detail":"<scurt>","advantage":"home|away|equal"}
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
      homeTeam: { id: homeTeamId, name: homeTeam?.name ?? String(homeTeamId), crest: homeTeam?.logo ?? "", form: homeForm, biorhythm: Math.round(homeBio * 100), injuries: homeInjuries },
      awayTeam: { id: awayTeamId, name: awayTeam?.name ?? String(awayTeamId), crest: awayTeam?.logo ?? "", form: awayForm, biorhythm: Math.round(awayBio * 100), injuries: awayInjuries },
      prediction,
      matchDate,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
