"use client";

import { useState, useEffect, useRef } from "react";

type Team = { id: number; name: string; shortName: string; tla: string; crest: string; area: { name: string } };

type PredictionResult = {
  homeTeam: { id: number; name: string; crest: string; form: string; biorhythm: number; injuries: { name: string; type: string }[] };
  awayTeam: { id: number; name: string; crest: string; form: string; biorhythm: number; injuries: { name: string; type: string }[] };
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
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
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
        body: JSON.stringify({ homeTeamId: homeTeam.id, awayTeamId: awayTeam.id, matchDate }),
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
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>🔬 Bioritm echipă (medie jucători)</div>
              <div style={{ display: "grid", gap: 10 }}>
                {[
                  { name: result.homeTeam.name, crest: result.homeTeam.crest, bio: result.homeTeam.biorhythm, color: "#22c55e" },
                  { name: result.awayTeam.name, crest: result.awayTeam.crest, bio: result.awayTeam.biorhythm, color: "#3b82f6" },
                ].map((t) => {
                  const pct = Math.round((t.bio + 100) / 2);
                  return (
                    <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {t.crest ? <img src={t.crest} alt="" style={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0 }} /> : <span>⚽</span>}
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", minWidth: 160, flexShrink: 0 }}>{t.name}</div>
                      <div style={{ flex: 1, background: "#1e293b", borderRadius: 6, height: 8, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: t.color, borderRadius: 6, transition: "width 1s ease" }} />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: t.color, minWidth: 50, textAlign: "right" }}>
                        {t.bio > 0 ? "+" : ""}{t.bio}%
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: "#334155", marginTop: 10 }}>
                * Bioritm calculat pe baza datelor de naștere ale jucătorilor (ciclu fizic 23z / emoțional 28z / intelectual 33z)
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
