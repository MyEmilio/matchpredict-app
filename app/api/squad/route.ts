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
  const team = searchParams.get("team");

  if (!team) {
    return NextResponse.json({ error: "Lipsește parametrul team" }, { status: 400 });
  }

  try {
    const data = await af(`/players/squads?team=${team}`);
    const players = (data.response?.[0]?.players ?? []) as {
      id: number; name: string; age: number; number: number | null; position: string; photo: string;
    }[];

    return NextResponse.json(
      players
        .map((p) => ({ id: p.id, name: p.name, position: p.position, number: p.number, photo: p.photo }))
        .sort((a, b) => {
          const order = ["Goalkeeper", "Defender", "Midfielder", "Attacker"];
          return order.indexOf(a.position) - order.indexOf(b.position);
        })
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
