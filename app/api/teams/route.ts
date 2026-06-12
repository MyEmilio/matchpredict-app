import { NextResponse } from "next/server";

const AF_KEY = process.env.API_FOOTBALL_KEY!;
const AF_BASE = "https://v3.football.api-sports.io";

async function af(path: string) {
  const res = await fetch(`${AF_BASE}${path}`, {
    headers: { "x-apisports-key": AF_KEY },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`API-Football ${res.status}`);
  return res.json();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const data = await af(`/teams?search=${encodeURIComponent(query)}`);
    const teams = (data.response ?? []).map((item: {
      team: { id: number; name: string; code: string; logo: string; country: string };
    }) => ({
      id: item.team.id,
      name: item.team.name,
      shortName: item.team.code ?? item.team.name,
      tla: item.team.code ?? "",
      crest: item.team.logo,
      area: { name: item.team.country ?? "" },
    }));

    return NextResponse.json(teams.slice(0, 20));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
