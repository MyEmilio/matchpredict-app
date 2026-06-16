"use client";

import { useState, useEffect, useRef } from "react";

type Team = { id: number; name: string; shortName: string; tla: string; crest: string; area: { name: string } };

type SquadPlayer = { id: number; name: string; position: string; number: number | null; photo: string };

type StarterDetail = { id: number; name: string; birthDate: string | null; bioPct: number | null };

type WeatherRow = { condition: string; matches: number; w: number; d: number; l: number; goalsForAvg: number; goalsAgainstAvg: number; winRate: number };
type WeatherStats = { rows: WeatherRow[]; dataWindow: string };
type Forecast = { tempC: number; precipMm: number; condition: string; venueCity: string | null };

type TeamResult = {
  id: number; name: string; crest: string; form: string;
  biorhythm: number | null; biorhythmDetail: StarterDetail[];
  injuries: { name: string; type: string }[];
  weather: WeatherStats;
};

type PredictionResult = {
  homeTeam: TeamResult;
  awayTeam: TeamResult;
  forecast: Forecast | null;
  forecastError: string | null;
  prediction: {
    predictedHome: number;
    predictedAway: number;
    homeWinPct: number;
    drawPct: number;
    awayWinPct: number;
    confidence: number;
    keyFactors: { icon: string; label: string; detail: string; advantage: "home" | "away" | "equal" }[];
    reasoning: string;
    tip: string;
  };
  matchDate: string;
};

function TeamPicker({ label, selected, onSelect }: {
  label: string;
  selected: Team | null;
  onSelect: (t: Team) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/teams?q=${encodeURIComponent(query)}`);
        setResults(await res.json());
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div ref={ref} style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
        {label}
      </div>

      {selected ? (
        <div style={{ background: "#0f172a", border: "2px solid #22c55e", borderRadius: 16, padding: "16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", position: "relative" }}
          onClick={() => { setSelected(null); setQuery(""); }}
        >
          {selected.crest
            ? <img src={selected.crest} alt="" style={{ width: 48, height: 48, objectFit: "contain" }} />
            : <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#475569" }}>⚽</div>
          }
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#f1f5f9" }}>{selected.name}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{selected.area.name}</div>
          </div>
          <button style={{ marginLeft: "auto", background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 18, lineHeight: 1 }}
            onClick={(e) => { e.stopPropagation(); setSelected(null); setQuery(""); }}>✕</button>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Caută echipă..."
            style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid #1e293b", background: "#0f172a", color: "#f1f5f9", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            onFocus={() => results.length > 0 && setOpen(true)}
          />
          {loading && (
            <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 18, height: 18, border: "2px solid #22c55e", borderTopColor: "transparent", borderRadius: "50%" }} className="animate-spin" />
          )}
          {open && results.length > 0 && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, zIndex: 100, maxHeight: 280, overflowY: "auto", boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
              {results.map((t) => (
                <div key={t.id}
                  onClick={() => { onSelect(t); setQuery(""); setOpen(false); setResults([]); }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #1e293b" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#1e293b")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {t.crest
                    ? <img src={t.crest} alt="" style={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0 }} />
                    : <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#334155", flexShrink: 0 }} />
                  }
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: "#475569" }}>{t.area.name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  function setSelected(v: Team | null) { if (!v) onSelect(null as unknown as Team); }
}

const MAX_STARTERS = 11;
const POSITION_LABEL: Record<string, string> = {
  Goalkeeper: "Portar", Defender: "Fundaș", Midfielder: "Mijlocaș", Attacker: "Atacant",
};

function StarterPicker({ label, team, selected, onChange }: {
  label: string;
  team: Team | null;
  selected: SquadPlayer[];
  onChange: (players: SquadPlayer[]) => void;
}) {
  const [squad, setSquad] = useState<SquadPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!team) { setSquad([]); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/squad?team=${team.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data)) setSquad(data);
        else setError("Nu am putut încărca lotul");
      })
      .catch(() => !cancelled && setError("Nu am putut încărca lotul"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [team]);

  if (!team) return null;

  const isSelected = (p: SquadPlayer) => selected.some((s) => s.id === p.id);
  const toggle = (p: SquadPlayer) => {
    if (isSelected(p)) onChange(selected.filter((s) => s.id !== p.id));
    else if (selected.length < MAX_STARTERS) onChange([...selected, p]);
  };

  const visible = squad.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div style={{ flex: 1, minWidth: 260 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
        <span>{label}</span>
        <span style={{ color: selected.length === MAX_STARTERS ? "#22c55e" : "#475569" }}>{selected.length}/{MAX_STARTERS} titulari</span>
      </div>

      {loading && <div style={{ fontSize: 12, color: "#64748b", padding: "10px 0" }}>⏳ Se încarcă lotul...</div>}
      {error && <div style={{ fontSize: 12, color: "#f87171", padding: "10px 0" }}>⚠️ {error}</div>}

      {!loading && !error && (
        <div style={{ border: "1px solid #1e293b", borderRadius: 12, background: "#0f172a", overflow: "hidden" }}>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrează jucător..."
            style={{ width: "100%", padding: "10px 12px", border: "none", borderBottom: "1px solid #1e293b", background: "transparent", color: "#f1f5f9", fontSize: 13, outline: "none", boxSizing: "border-box" }}
          />
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {visible.map((p) => {
              const checked = isSelected(p);
              const disabled = !checked && selected.length >= MAX_STARTERS;
              return (
                <div key={p.id}
                  onClick={() => !disabled && toggle(p)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", cursor: disabled ? "not-allowed" : "pointer",
                    background: checked ? "#0f2a1c" : "transparent", opacity: disabled ? 0.4 : 1,
                    borderBottom: "1px solid #16213a",
                  }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                    border: `1px solid ${checked ? "#22c55e" : "#475569"}`, background: checked ? "#22c55e" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#000", fontWeight: 900,
                  }}>{checked ? "✓" : ""}</div>
                  {p.number != null && <span style={{ fontSize: 11, color: "#475569", width: 18, textAlign: "right", flexShrink: 0 }}>{p.number}</span>}
                  <span style={{ fontSize: 13, color: "#e2e8f0", flex: 1 }}>{p.name}</span>
                  <span style={{ fontSize: 10, color: "#475569", flexShrink: 0 }}>{POSITION_LABEL[p.position] ?? p.position}</span>
                </div>
              );
            })}
            {visible.length === 0 && <div style={{ padding: "12px", fontSize: 12, color: "#475569" }}>Niciun jucător găsit</div>}
          </div>
        </div>
      )}
      <div style={{ fontSize: 11, color: "#334155", marginTop: 6 }}>
        Selectează titularii anunțați pentru acest meci — folosim datele lor de naștere pentru bioritm exact.
      </div>
    </div>
  );
}

const CONDITION_ICON: Record<string, string> = {
  Ploaie: "🌧️", Ger: "🥶", Frig: "❄️", "Caniculă": "🔥", Normal: "🌤️",
};

function WeatherTable({ name, crest, weather, highlightCondition }: {
  name: string; crest: string; weather: WeatherStats; highlightCondition?: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        {crest ? <img src={crest} alt="" style={{ width: 20, height: 20, objectFit: "contain" }} /> : <span>⚽</span>}
        <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{name}</span>
        <span style={{ fontSize: 10, color: "#475569" }}>(pe teren propriu)</span>
      </div>
      {weather.rows.length === 0 ? (
        <div style={{ fontSize: 12, color: "#475569", padding: "6px 0" }}>Fără date meteo istorice disponibile</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ color: "#475569", textAlign: "left" }}>
              <th style={{ padding: "4px 6px", fontWeight: 600 }}>Condiție</th>
              <th style={{ padding: "4px 6px", fontWeight: 600 }}>Meciuri</th>
              <th style={{ padding: "4px 6px", fontWeight: 600 }}>V-E-P</th>
              <th style={{ padding: "4px 6px", fontWeight: 600 }}>% V</th>
              <th style={{ padding: "4px 6px", fontWeight: 600 }}>Goluri/meci</th>
            </tr>
          </thead>
          <tbody>
            {weather.rows.map((r) => (
              <tr key={r.condition} style={{
                background: r.condition === highlightCondition ? "#0f2a1c" : "transparent",
                border: r.condition === highlightCondition ? "1px solid #166534" : "1px solid transparent",
              }}>
                <td style={{ padding: "5px 6px", color: "#e2e8f0" }}>{CONDITION_ICON[r.condition] ?? ""} {r.condition}</td>
                <td style={{ padding: "5px 6px", color: "#94a3b8" }}>{r.matches}</td>
                <td style={{ padding: "5px 6px", color: "#94a3b8" }}>{r.w}-{r.d}-{r.l}</td>
                <td style={{ padding: "5px 6px", color: r.winRate >= 50 ? "#4ade80" : "#f87171", fontWeight: 700 }}>{r.winRate}%</td>
                <td style={{ padding: "5px 6px", color: "#94a3b8" }}>{r.goalsForAvg}-{r.goalsAgainstAvg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function FormBadge({ form }: { form: string }) {
  return (
    <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
      {form.split("").map((r, i) => (
        <div key={i} style={{
          width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800,
          background: r === "W" ? "#14532d" : r === "D" ? "#1c1a00" : "#450a0a",
          color: r === "W" ? "#4ade80" : r === "D" ? "#fbbf24" : "#f87171",
          border: `1px solid ${r === "W" ? "#166534" : r === "D" ? "#713f12" : "#7f1d1d"}`,
        }}>{r}</div>
      ))}
    </div>
  );
}

function ProbBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6, textAlign: "center" }}>{label}</div>
      <div style={{ background: "#1e293b", borderRadius: 8, height: 10, overflow: "hidden", marginBottom: 4 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 8, transition: "width 1s ease" }} />
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color, textAlign: "center" }}>{pct}%</div>
    </div>
  );
}

export default function Home() {
  const [homeTeam, setHomeTeamRaw] = useState<Team | null>(null);
  const [awayTeam, setAwayTeamRaw] = useState<Team | null>(null);
  const [homeStarters, setHomeStarters] = useState<SquadPlayer[]>([]);
  const [awayStarters, setAwayStarters] = useState<SquadPlayer[]>([]);
  const setHomeTeam = (t: Team) => { setHomeTeamRaw(t); setHomeStarters([]); };
  const setAwayTeam = (t: Team) => { setAwayTeamRaw(t); setAwayStarters([]); };
  const [matchDate, setMatchDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  async function predict() {
    if (!homeTeam || !awayTeam) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeTeamId: homeTeam.id, awayTeamId: awayTeam.id, matchDate,
          homeStarters: homeStarters.map((p) => ({ id: p.id, name: p.name })),
          awayStarters: awayStarters.map((p) => ({ id: p.id, name: p.name })),
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? "Eroare server");
      }
      const data = await res.json() as PredictionResult;
      setResult(data);
      // Salvează în istoric
      try {
        const history = JSON.parse(localStorage.getItem("matchpredict_history") ?? "[]");
        history.push({ id: Date.now().toString(), savedAt: new Date().toISOString(), matchDate: data.matchDate, homeTeam: data.homeTeam, awayTeam: data.awayTeam, prediction: data.prediction });
        localStorage.setItem("matchpredict_history", JSON.stringify(history));
      } catch { /* ignore */ }
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const canPredict = homeTeam && awayTeam && homeTeam.id !== awayTeam.id && !loading;

  return (
    <div style={{ minHeight: "100dvh", background: "#030712", color: "#f1f5f9", fontFamily: "system-ui, sans-serif" }}>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>

        {/* Team Selector */}
        <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 20, padding: "24px", marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>
            Selectează echipele
          </h2>

          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <TeamPicker label="⚽ Echipă Acasă" selected={homeTeam} onSelect={setHomeTeam} />

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 8px", color: "#334155", fontWeight: 900, fontSize: 20, flexShrink: 0 }}>
              VS
            </div>

            <TeamPicker label="✈️ Echipă Deplasare" selected={awayTeam} onSelect={setAwayTeam} />
          </div>

          {/* Titulari */}
          {(homeTeam || awayTeam) && (
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap", marginTop: 20 }}>
              <StarterPicker label="⚽ Titulari acasă" team={homeTeam} selected={homeStarters} onChange={setHomeStarters} />
              <StarterPicker label="✈️ Titulari deplasare" team={awayTeam} selected={awayStarters} onChange={setAwayStarters} />
            </div>
          )}

          {/* Data meciului */}
          <div style={{ marginTop: 20, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                📅 Data meciului
              </div>
              <input
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid #1e293b", background: "#0f172a", color: "#f1f5f9", fontSize: 14, width: "100%", boxSizing: "border-box" }}
              />
            </div>

            <button
              onClick={predict}
              disabled={!canPredict}
              style={{
                flex: 2, minWidth: 220, padding: "14px 24px", borderRadius: 12, border: "none", cursor: canPredict ? "pointer" : "not-allowed",
                background: canPredict ? "linear-gradient(135deg,#16a34a,#22c55e)" : "#1e293b",
                color: canPredict ? "#000" : "#334155",
                fontWeight: 800, fontSize: 15, marginTop: 24,
                boxShadow: canPredict ? "0 4px 20px rgba(34,197,94,0.3)" : "none",
                transition: "all 0.2s",
              }}
            >
              {loading ? "⏳ Se analizează..." : "🤖 Analizează & Prezice"}
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 20, padding: "40px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚽</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#22c55e", marginBottom: 8 }}>Se analizează meciul...</div>
            <div style={{ fontSize: 13, color: "#475569", marginBottom: 20 }}>Colectez statistici · calculez bioritm · consult AI</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {["📊 Formă recentă", "🔬 Bioritm jucători", "⚔️ Istoric direct", "🤖 Analiză AI"].map((s, i) => (
                <div key={i} style={{ padding: "6px 12px", borderRadius: 8, background: "#0f172a", border: "1px solid #1e293b", fontSize: 12, color: "#64748b" }} className="shimmer">{s}</div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: "#1a0000", border: "1px solid #7f1d1d", borderRadius: 16, padding: "16px 20px", color: "#f87171", fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div ref={resultRef} className="animate-fade-in-up" style={{ display: "grid", gap: 12 }}>

            {/* Score principal */}
            <div style={{ background: "linear-gradient(135deg,#0a0f1e,#0d1a2e)", border: "1px solid #1e3a5f", borderRadius: 20, padding: "32px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>
                Predicție meci · {new Date(result.matchDate).toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" })}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
                {/* Acasă */}
                <div style={{ textAlign: "center", flex: 1, minWidth: 120 }}>
                  {result.homeTeam.crest
                    ? <img src={result.homeTeam.crest} alt="" style={{ width: 64, height: 64, objectFit: "contain", margin: "0 auto 8px" }} />
                    : <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#1e293b", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>⚽</div>
                  }
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#f1f5f9" }}>{result.homeTeam.name}</div>
                  <div style={{ fontSize: 11, color: "#475569", marginBottom: 4 }}>Acasă</div>
                  {result.homeTeam.form && <FormBadge form={result.homeTeam.form} />}
                </div>

                {/* Scor */}
                <div style={{ textAlign: "center" }} className="animate-score-pop">
                  <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, color: "#22c55e", textShadow: "0 0 30px rgba(34,197,94,0.4)" }}>
                    {result.prediction.predictedHome} – {result.prediction.predictedAway}
                  </div>
                  <div style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
                    Încredere: <span style={{ color: "#f59e0b", fontWeight: 700 }}>{result.prediction.confidence}%</span>
                  </div>
                </div>

                {/* Deplasare */}
                <div style={{ textAlign: "center", flex: 1, minWidth: 120 }}>
                  {result.awayTeam.crest
                    ? <img src={result.awayTeam.crest} alt="" style={{ width: 64, height: 64, objectFit: "contain", margin: "0 auto 8px" }} />
                    : <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#1e293b", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>⚽</div>
                  }
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#f1f5f9" }}>{result.awayTeam.name}</div>
                  <div style={{ fontSize: 11, color: "#475569", marginBottom: 4 }}>Deplasare</div>
                  {result.awayTeam.form && <FormBadge form={result.awayTeam.form} />}
                </div>
              </div>
            </div>

            {/* Probabilități */}
            <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 16, padding: "20px 24px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>📈 Probabilități</div>
              <div style={{ display: "flex", gap: 16 }}>
                <ProbBar label={`${result.homeTeam.name} câștigă`} pct={result.prediction.homeWinPct} color="#22c55e" />
                <ProbBar label="Egal" pct={result.prediction.drawPct} color="#f59e0b" />
                <ProbBar label={`${result.awayTeam.name} câștigă`} pct={result.prediction.awayWinPct} color="#3b82f6" />
              </div>
            </div>

            {/* Factori cheie */}
            <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 16, padding: "20px 24px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>🔍 Factori de decizie</div>
              <div style={{ display: "grid", gap: 10 }}>
                {result.prediction.keyFactors.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#0f172a", borderRadius: 10, border: "1px solid #1e293b" }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{f.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{f.label}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{f.detail}</div>
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, flexShrink: 0,
                      background: f.advantage === "home" ? "#14532d" : f.advantage === "away" ? "#1e1a00" : "#1e293b",
                      color: f.advantage === "home" ? "#4ade80" : f.advantage === "away" ? "#fbbf24" : "#64748b",
                      border: `1px solid ${f.advantage === "home" ? "#166534" : f.advantage === "away" ? "#713f12" : "#334155"}`,
                    }}>
                      {f.advantage === "home" ? `✓ ${result.homeTeam.name}` : f.advantage === "away" ? `✓ ${result.awayTeam.name}` : "Egal"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bioritm */}
            <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 16, padding: "20px 24px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>🔬 Bioritm titulari</div>
              <div style={{ display: "grid", gap: 14 }}>
                {[
                  { name: result.homeTeam.name, crest: result.homeTeam.crest, bio: result.homeTeam.biorhythm, detail: result.homeTeam.biorhythmDetail, color: "#22c55e" },
                  { name: result.awayTeam.name, crest: result.awayTeam.crest, bio: result.awayTeam.biorhythm, detail: result.awayTeam.biorhythmDetail, color: "#3b82f6" },
                ].map((t) => {
                  const pct = t.bio === null ? 50 : Math.round((t.bio + 100) / 2);
                  return (
                    <div key={t.name}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {t.crest ? <img src={t.crest} alt="" style={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0 }} /> : <span>⚽</span>}
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", minWidth: 160, flexShrink: 0 }}>{t.name}</div>
                        <div style={{ flex: 1, background: "#1e293b", borderRadius: 6, height: 8, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: t.bio === null ? "#334155" : t.color, borderRadius: 6, transition: "width 1s ease" }} />
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: t.bio === null ? "#475569" : t.color, minWidth: 80, textAlign: "right" }}>
                          {t.bio === null ? "necunoscut" : `${t.bio > 0 ? "+" : ""}${t.bio}%`}
                        </div>
                      </div>
                      {t.detail.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, marginLeft: 40 }}>
                          {t.detail.map((p) => (
                            <div key={p.id} title={p.birthDate ? `n. ${p.birthDate}` : "dată necunoscută"}
                              style={{ fontSize: 11, padding: "3px 8px", borderRadius: 8, background: "#0f172a", border: "1px solid #1e293b", color: "#94a3b8" }}>
                              {p.name} {p.bioPct !== null ? <span style={{ color: p.bioPct >= 0 ? "#4ade80" : "#f87171", fontWeight: 700 }}>{p.bioPct > 0 ? "+" : ""}{p.bioPct}%</span> : <span style={{ color: "#475569" }}>N/A</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: "#334155", marginTop: 12 }}>
                * Bioritm calculat din datele de naștere reale ale titularilor selectați manual (ciclu fizic 23z / emoțional 28z / intelectual 33z). Selectează titularii deasupra pentru un calcul exact.
              </div>
            </div>

            {/* Meteo */}
            <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 16, padding: "20px 24px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>🌦️ Meteo & performanță în condiții similare</div>

              {result.forecast ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 22 }}>{CONDITION_ICON[result.forecast.condition] ?? "🌤️"}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
                      Prognoză {result.forecast.venueCity ? `(${result.forecast.venueCity})` : ""}: {result.forecast.tempC.toFixed(1)}°C, {result.forecast.precipMm.toFixed(1)}mm — <span style={{ color: "#fbbf24" }}>{result.forecast.condition}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#475569" }}>Rândurile evidențiate de mai jos arată cum se descurcă fiecare echipă în condiții similare</div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "#f59e0b", padding: "10px 14px", background: "#1c1a00", border: "1px solid #713f12", borderRadius: 10, marginBottom: 16 }}>
                  ⚠️ Prognoză indisponibilă: {result.forecastError ?? "data meciului e prea îndepărtată sau orașul stadionului e necunoscut"}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <WeatherTable name={result.homeTeam.name} crest={result.homeTeam.crest} weather={result.homeTeam.weather} highlightCondition={result.forecast?.condition} />
                <WeatherTable name={result.awayTeam.name} crest={result.awayTeam.crest} weather={result.awayTeam.weather} highlightCondition={result.forecast?.condition} />
              </div>

              <div style={{ fontSize: 11, color: "#334155", marginTop: 12 }}>
                * Calculat din meciurile jucate pe teren propriu de fiecare echipă — {result.homeTeam.weather.dataWindow}.
              </div>
            </div>

            {/* Analiză AI + Tip */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, flexWrap: "wrap" }}>
              <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 16, padding: "20px 24px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>🤖 Analiză AI</div>
                <p style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.6 }}>{result.prediction.reasoning}</p>
              </div>
              <div style={{ background: "linear-gradient(135deg,#14532d,#166534)", border: "1px solid #16a34a", borderRadius: 16, padding: "20px 24px", minWidth: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>💡</div>
                <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Tip pariu</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#f0fdf4" }}>{result.prediction.tip}</div>
              </div>
            </div>

            {/* Accidentați */}
            {((result.homeTeam.injuries?.length ?? 0) > 0 || (result.awayTeam.injuries?.length ?? 0) > 0) && (
              <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 16, padding: "20px 24px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>🏥 Accidentați / Suspendați</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { team: result.homeTeam, label: "Acasă" },
                    { team: result.awayTeam, label: "Deplasare" },
                  ].map(({ team, label }) => (
                    <div key={label}>
                      <div style={{ fontSize: 12, color: "#475569", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                        {team.crest && <img src={team.crest} alt="" style={{ width: 16, height: 16, objectFit: "contain" }} />}
                        {team.name}
                      </div>
                      {(team.injuries?.length ?? 0) === 0
                        ? <div style={{ fontSize: 12, color: "#166534" }}>✅ Fără absențe cunoscute</div>
                        : team.injuries.map((inj, i) => (
                          <div key={i} style={{ fontSize: 12, color: "#f87171", marginBottom: 3 }}>
                            🚑 {inj.name} <span style={{ color: "#475569" }}>({inj.type})</span>
                          </div>
                        ))
                      }
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div style={{ fontSize: 11, color: "#1e293b", textAlign: "center", padding: "8px" }}>
              ⚠️ Predicțiile sunt orientative și nu constituie sfaturi de pariu. Joacă responsabil.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
