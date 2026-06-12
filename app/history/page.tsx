"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

type SavedPrediction = {
  id: string;
  savedAt: string;
  matchDate: string;
  homeTeam: { name: string; crest: string; form: string };
  awayTeam: { name: string; crest: string; form: string };
  prediction: {
    predictedHome: number; predictedAway: number;
    homeWinPct: number; drawPct: number; awayWinPct: number;
    confidence: number; tip: string;
  };
  actualHome?: number;
  actualAway?: number;
};

type Filter = "all" | "correct" | "wrong" | "pending";
type SortBy = "date" | "confidence";

function isCorrect(p: SavedPrediction): boolean | null {
  if (p.actualHome == null || p.actualAway == null) return null;
  const predWinner = p.prediction.predictedHome > p.prediction.predictedAway ? "home"
    : p.prediction.predictedHome < p.prediction.predictedAway ? "away" : "draw";
  const actualWinner = p.actualHome > p.actualAway ? "home"
    : p.actualHome < p.actualAway ? "away" : "draw";
  return predWinner === actualWinner;
}

function exportCSV(predictions: SavedPrediction[]) {
  const rows = [
    ["Data meci", "Acasă", "Deplasare", "Prezis", "Scor real", "Tip", "Încredere", "Corect"],
    ...predictions.map((p) => {
      const ok = isCorrect(p);
      return [
        p.matchDate,
        p.homeTeam.name,
        p.awayTeam.name,
        `${p.prediction.predictedHome}-${p.prediction.predictedAway}`,
        p.actualHome != null ? `${p.actualHome}-${p.actualAway}` : "",
        p.prediction.tip,
        `${p.prediction.confidence}%`,
        ok == null ? "?" : ok ? "DA" : "NU",
      ];
    }),
  ];
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "matchpredict_history.csv"; a.click();
  URL.revokeObjectURL(url);
}

export default function HistoryPage() {
  const [predictions, setPredictions] = useState<SavedPrediction[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [actualH, setActualH] = useState("");
  const [actualA, setActualA] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [search, setSearch] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("matchpredict_history") ?? "[]");
      setPredictions(saved.reverse());
    } catch { setPredictions([]); }
  }, []);

  function saveActual(id: string) {
    const h = parseInt(actualH); const a = parseInt(actualA);
    if (isNaN(h) || isNaN(a)) return;
    const updated = predictions.map((p) => p.id === id ? { ...p, actualHome: h, actualAway: a } : p);
    setPredictions(updated);
    localStorage.setItem("matchpredict_history", JSON.stringify([...updated].reverse()));
    setEditing(null); setActualH(""); setActualA("");
  }

  function deletePrediction(id: string) {
    const updated = predictions.filter((p) => p.id !== id);
    setPredictions(updated);
    localStorage.setItem("matchpredict_history", JSON.stringify([...updated].reverse()));
  }

  function clearAll() {
    setPredictions([]);
    localStorage.removeItem("matchpredict_history");
    setConfirmClear(false);
  }

  // Stats
  const withResult = predictions.filter((p) => p.actualHome != null);
  const correctCount = withResult.filter((p) => isCorrect(p) === true).length;
  const accuracy = withResult.length ? Math.round((correctCount / withResult.length) * 100) : null;
  const avgConfidence = predictions.length
    ? Math.round(predictions.reduce((s, p) => s + p.prediction.confidence, 0) / predictions.length)
    : null;
  const homeWins = withResult.filter((p) => p.actualHome! > p.actualAway!).length;
  const draws = withResult.filter((p) => p.actualHome === p.actualAway).length;
  const awayWins = withResult.filter((p) => p.actualHome! < p.actualAway!).length;

  // Filter + sort + search
  const displayed = useMemo(() => {
    let list = [...predictions];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.homeTeam.name.toLowerCase().includes(q) || p.awayTeam.name.toLowerCase().includes(q)
      );
    }
    if (filter === "correct") list = list.filter((p) => isCorrect(p) === true);
    else if (filter === "wrong") list = list.filter((p) => isCorrect(p) === false);
    else if (filter === "pending") list = list.filter((p) => isCorrect(p) === null);
    if (sortBy === "confidence") list.sort((a, b) => b.prediction.confidence - a.prediction.confidence);
    return list;
  }, [predictions, filter, sortBy, search]);

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "Toate", count: predictions.length },
    { key: "correct", label: "✅ Corecte", count: predictions.filter((p) => isCorrect(p) === true).length },
    { key: "wrong", label: "❌ Greșite", count: predictions.filter((p) => isCorrect(p) === false).length },
    { key: "pending", label: "⏳ Fără scor", count: predictions.filter((p) => isCorrect(p) === null).length },
  ];

  return (
    <div style={{ minHeight: "100dvh", background: "#030712", color: "#f1f5f9" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px" }}>

        {/* Title row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>📋 Istoric predicții</h1>
            <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>{predictions.length} predicții salvate</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {predictions.length > 0 && (
              <>
                <button onClick={() => exportCSV(predictions)}
                  style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #1e3a5f", background: "transparent", color: "#60a5fa", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  ⬇️ Export CSV
                </button>
                {confirmClear ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={clearAll}
                      style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                      Confirmă ștergere
                    </button>
                    <button onClick={() => setConfirmClear(false)}
                      style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#64748b", cursor: "pointer", fontSize: 12 }}>
                      Anulează
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmClear(true)}
                    style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #450a0a", background: "transparent", color: "#f87171", cursor: "pointer", fontSize: 12 }}>
                    🗑️ Șterge tot
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Stats cards */}
        {predictions.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Acuratețe", value: accuracy != null ? `${accuracy}%` : "—", sub: `${correctCount}/${withResult.length} cu scor`, color: accuracy != null ? (accuracy >= 60 ? "#22c55e" : accuracy >= 40 ? "#f59e0b" : "#f87171") : "#64748b" },
              { label: "Încredere medie", value: avgConfidence != null ? `${avgConfidence}%` : "—", sub: "media tuturor", color: "#60a5fa" },
              { label: "Rezultate reale", value: `${withResult.length}`, sub: `din ${predictions.length} total`, color: "#a78bfa" },
              { label: "Scor real V/E/P", value: `${homeWins}/${draws}/${awayWins}`, sub: "meciuri punctate", color: "#f59e0b" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#334155", marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        )}

        {predictions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#334155" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚽</div>
            <div style={{ fontSize: 16, marginBottom: 8, color: "#475569" }}>Nicio predicție salvată încă</div>
            <Link href="/" style={{ color: "#22c55e", textDecoration: "none", fontSize: 14 }}>
              → Fă prima predicție
            </Link>
          </div>
        ) : (
          <>
            {/* Search + Filter + Sort */}
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 Caută echipă..."
                style={{ flex: 1, minWidth: 160, padding: "8px 12px", borderRadius: 8, border: "1px solid #1e293b", background: "#0f172a", color: "#f1f5f9", fontSize: 13, outline: "none" }}
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #1e293b", background: "#0f172a", color: "#94a3b8", fontSize: 13, cursor: "pointer" }}
              >
                <option value="date">Sortare: Dată</option>
                <option value="confidence">Sortare: Încredere</option>
              </select>
            </div>

            {/* Filter tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              {FILTERS.map((f) => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  style={{
                    padding: "6px 12px", borderRadius: 8, border: `1px solid ${filter === f.key ? "#22c55e" : "#1e293b"}`,
                    background: filter === f.key ? "#052e16" : "transparent",
                    color: filter === f.key ? "#22c55e" : "#475569",
                    cursor: "pointer", fontSize: 12, fontWeight: filter === f.key ? 700 : 400,
                    display: "flex", gap: 6, alignItems: "center",
                  }}>
                  {f.label}
                  <span style={{ background: "#0f172a", borderRadius: 10, padding: "1px 6px", fontSize: 11 }}>{f.count}</span>
                </button>
              ))}
            </div>

            {displayed.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px", color: "#334155", fontSize: 14 }}>
                Nicio predicție în această categorie.
              </div>
            )}

            {/* List */}
            <div style={{ display: "grid", gap: 10 }}>
              {displayed.map((p) => {
                const ok = isCorrect(p);
                return (
                  <div key={p.id} style={{
                    background: "#0a0f1e",
                    border: `1px solid ${ok === true ? "#166534" : ok === false ? "#7f1d1d" : "#1e293b"}`,
                    borderRadius: 16, padding: "16px 20px",
                  }}>
                    {/* Teams + score */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 200 }}>
                        {p.homeTeam.crest && <img src={p.homeTeam.crest} alt="" style={{ width: 26, height: 26, objectFit: "contain", flexShrink: 0 }} />}
                        <span style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}>{p.homeTeam.name}</span>
                        <span style={{ color: "#22c55e", fontWeight: 900, fontSize: 17, margin: "0 4px" }}>
                          {p.prediction.predictedHome}–{p.prediction.predictedAway}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}>{p.awayTeam.name}</span>
                        {p.awayTeam.crest && <img src={p.awayTeam.crest} alt="" style={{ width: 26, height: 26, objectFit: "contain", flexShrink: 0 }} />}
                      </div>

                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: "#475569" }}>
                          {new Date(p.matchDate).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                        <span style={{ fontSize: 11, background: "#1c1a00", border: "1px solid #713f12", borderRadius: 6, padding: "2px 8px", color: "#fbbf24" }}>
                          💡 {p.prediction.tip}
                        </span>
                        <span style={{ fontSize: 11, background: "#0f172a", border: "1px solid #1e3a5f", borderRadius: 6, padding: "2px 8px", color: "#60a5fa" }}>
                          {p.prediction.confidence}% încredere
                        </span>
                        {ok === true && <span style={{ fontSize: 13 }}>✅</span>}
                        {ok === false && <span style={{ fontSize: 13 }}>❌</span>}
                      </div>
                    </div>

                    {/* Probabilities mini bar */}
                    <div style={{ display: "flex", gap: 4, marginTop: 10, height: 4, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ flex: p.prediction.homeWinPct, background: "#22c55e" }} />
                      <div style={{ flex: p.prediction.drawPct, background: "#f59e0b" }} />
                      <div style={{ flex: p.prediction.awayWinPct, background: "#3b82f6" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#334155", marginTop: 3 }}>
                      <span>{p.prediction.homeWinPct}% 1</span>
                      <span>{p.prediction.drawPct}% X</span>
                      <span>{p.prediction.awayWinPct}% 2</span>
                    </div>

                    {/* Scor real + delete */}
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      {p.actualHome != null ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, color: "#64748b" }}>Scor real:</span>
                          <span style={{ fontSize: 14, fontWeight: 800, color: ok ? "#4ade80" : "#f87171" }}>
                            {p.actualHome}–{p.actualAway}
                          </span>
                          <button onClick={() => { setEditing(p.id); setActualH(String(p.actualHome)); setActualA(String(p.actualAway)); }}
                            style={{ fontSize: 11, color: "#475569", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                            editează
                          </button>
                        </div>
                      ) : editing === p.id ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span style={{ fontSize: 12, color: "#64748b" }}>Scor real:</span>
                          <input type="number" value={actualH} onChange={(e) => setActualH(e.target.value)} min="0" max="20"
                            style={{ width: 42, padding: "4px", borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#fff", textAlign: "center" }} />
                          <span style={{ color: "#475569" }}>–</span>
                          <input type="number" value={actualA} onChange={(e) => setActualA(e.target.value)} min="0" max="20"
                            style={{ width: 42, padding: "4px", borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#fff", textAlign: "center" }} />
                          <button onClick={() => saveActual(p.id)}
                            style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#22c55e", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>✓</button>
                          <button onClick={() => setEditing(null)}
                            style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #334155", background: "transparent", color: "#64748b", cursor: "pointer", fontSize: 12 }}>✕</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditing(p.id); setActualH(""); setActualA(""); }}
                          style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #1e3a5f", background: "transparent", color: "#60a5fa", cursor: "pointer", fontSize: 12 }}>
                          + Adaugă scor real
                        </button>
                      )}

                      <button onClick={() => deletePrediction(p.id)}
                        style={{ marginLeft: "auto", padding: "4px 8px", borderRadius: 6, border: "1px solid #450a0a", background: "transparent", color: "#f87171", cursor: "pointer", fontSize: 11 }}>
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
