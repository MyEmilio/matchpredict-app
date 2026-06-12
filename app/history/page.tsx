"use client";
import { useEffect, useState } from "react";
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

export default function HistoryPage() {
  const [predictions, setPredictions] = useState<SavedPrediction[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [actualH, setActualH] = useState("");
  const [actualA, setActualA] = useState("");

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

  function isCorrect(p: SavedPrediction) {
    if (p.actualHome == null || p.actualAway == null) return null;
    const predWinner = p.prediction.predictedHome > p.prediction.predictedAway ? "home"
      : p.prediction.predictedHome < p.prediction.predictedAway ? "away" : "draw";
    const actualWinner = p.actualHome! > p.actualAway! ? "home"
      : p.actualHome! < p.actualAway! ? "away" : "draw";
    return predWinner === actualWinner;
  }

  const withResult = predictions.filter((p) => p.actualHome != null);
  const correct = withResult.filter((p) => isCorrect(p) === true).length;
  const accuracy = withResult.length ? Math.round((correct / withResult.length) * 100) : null;

  return (
    <div style={{ minHeight: "100dvh", background: "#030712", color: "#f1f5f9" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>📋 Istoric predicții</h1>
            <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>{predictions.length} predicții salvate</div>
          </div>
          {accuracy != null && (
            <div style={{ background: "#0a0f1e", border: "1px solid #1e3a5f", borderRadius: 12, padding: "10px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#475569" }}>Acuratețe predicții</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: accuracy >= 60 ? "#22c55e" : accuracy >= 40 ? "#f59e0b" : "#f87171" }}>{accuracy}%</div>
              <div style={{ fontSize: 11, color: "#475569" }}>{correct}/{withResult.length} corecte</div>
            </div>
          )}
        </div>

        {predictions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#334155" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚽</div>
            <div style={{ fontSize: 16, marginBottom: 8 }}>Nicio predicție salvată încă</div>
            <Link href="/" style={{ color: "#22c55e", textDecoration: "none", fontSize: 14 }}>
              → Fă prima predicție
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {predictions.map((p) => {
              const correct = isCorrect(p);
              return (
                <div key={p.id} style={{
                  background: "#0a0f1e", border: `1px solid ${correct === true ? "#166534" : correct === false ? "#7f1d1d" : "#1e293b"}`,
                  borderRadius: 16, padding: "16px 20px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    {/* Echipe + scor */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 200 }}>
                      {p.homeTeam.crest && <img src={p.homeTeam.crest} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />}
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{p.homeTeam.name}</span>
                      <span style={{ color: "#22c55e", fontWeight: 900, fontSize: 18, margin: "0 4px" }}>
                        {p.prediction.predictedHome}–{p.prediction.predictedAway}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{p.awayTeam.name}</span>
                      {p.awayTeam.crest && <img src={p.awayTeam.crest} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />}
                    </div>

                    {/* Meta */}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: "#475569" }}>{new Date(p.matchDate).toLocaleDateString("ro-RO")}</span>
                      <span style={{ fontSize: 11, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, padding: "2px 8px", color: "#f59e0b" }}>
                        💡 {p.prediction.tip}
                      </span>
                      <span style={{ fontSize: 11, color: "#475569" }}>
                        Încredere: <span style={{ color: "#60a5fa", fontWeight: 700 }}>{p.prediction.confidence}%</span>
                      </span>
                    </div>
                  </div>

                  {/* Rezultat real */}
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    {p.actualHome != null ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "#64748b" }}>Rezultat real:</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{p.actualHome}–{p.actualAway}</span>
                        <span style={{ fontSize: 13 }}>{correct ? "✅" : "❌"}</span>
                      </div>
                    ) : (
                      editing === p.id ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span style={{ fontSize: 12, color: "#64748b" }}>Scor real:</span>
                          <input type="number" value={actualH} onChange={(e) => setActualH(e.target.value)} min="0" max="20"
                            style={{ width: 44, padding: "4px", borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#fff", textAlign: "center" }} />
                          <span style={{ color: "#475569" }}>–</span>
                          <input type="number" value={actualA} onChange={(e) => setActualA(e.target.value)} min="0" max="20"
                            style={{ width: 44, padding: "4px", borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#fff", textAlign: "center" }} />
                          <button onClick={() => saveActual(p.id)}
                            style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#22c55e", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                            ✓
                          </button>
                          <button onClick={() => setEditing(null)}
                            style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #334155", background: "transparent", color: "#64748b", cursor: "pointer", fontSize: 12 }}>
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setEditing(p.id)}
                          style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #1e3a5f", background: "transparent", color: "#60a5fa", cursor: "pointer", fontSize: 12 }}>
                          + Adaugă scor real
                        </button>
                      )
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
        )}
      </div>
    </div>
  );
}
