"use client";

const PLANS = [
  {
    name: "Free",
    price: "0",
    color: "#475569",
    border: "#1e293b",
    features: [
      "✅ 5 predicții/zi",
      "✅ Formă echipe",
      "✅ Bioritm basic",
      "✅ Toate ligile",
      "❌ Accidentați/suspendați",
      "❌ Statistici avansate",
      "❌ Predicții live",
      "❌ Fără reclame",
    ],
    cta: "Plan curent",
    active: true,
  },
  {
    name: "Pro ⭐",
    price: "4.99",
    color: "#f59e0b",
    border: "#713f12",
    features: [
      "✅ Predicții nelimitate",
      "✅ Formă echipe",
      "✅ Bioritm avansat",
      "✅ Toate ligile",
      "✅ Accidentați/suspendați",
      "✅ Statistici avansate",
      "❌ Predicții live",
      "✅ Fără reclame",
    ],
    cta: "Începe Pro",
    active: false,
    popular: true,
  },
  {
    name: "Elite 🏆",
    price: "9.99",
    color: "#a855f7",
    border: "#6b21a8",
    features: [
      "✅ Predicții nelimitate",
      "✅ Formă echipe",
      "✅ Bioritm avansat",
      "✅ Toate ligile",
      "✅ Accidentați/suspendați",
      "✅ Statistici avansate",
      "✅ Predicții live in-play",
      "✅ Fără reclame",
    ],
    cta: "Începe Elite",
    active: false,
  },
];

export default function PremiumPage() {
  return (
    <div style={{ minHeight: "100dvh", background: "#030712", color: "#f1f5f9" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 13, color: "#22c55e", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>
            MatchPredict AI Premium
          </div>
          <h1 style={{ fontSize: "clamp(24px,5vw,40px)", fontWeight: 900, margin: "0 0 12px" }}>
            Predicții mai precise,<br />câștiguri mai mari
          </h1>
          <p style={{ fontSize: 15, color: "#64748b", maxWidth: 500, margin: "0 auto" }}>
            Accesează date complete despre accidentați, statistici avansate și predicții în timp real pentru orice meci din lume.
          </p>
        </div>

        {/* Plans */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 40 }}>
          {PLANS.map((plan) => (
            <div key={plan.name} style={{
              background: "#0a0f1e", border: `2px solid ${plan.active ? plan.color : plan.border}`,
              borderRadius: 20, padding: "24px 20px", position: "relative",
              boxShadow: plan.popular ? `0 0 30px ${plan.color}33` : "none",
            }}>
              {plan.popular && (
                <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: plan.color, color: "#000", fontSize: 11, fontWeight: 800, padding: "3px 12px", borderRadius: 20, whiteSpace: "nowrap" }}>
                  CEL MAI POPULAR
                </div>
              )}
              <div style={{ fontSize: 18, fontWeight: 800, color: plan.color, marginBottom: 8 }}>{plan.name}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 20 }}>
                <span style={{ fontSize: 36, fontWeight: 900, color: "#f1f5f9" }}>{plan.price === "0" ? "Gratuit" : `€${plan.price}`}</span>
                {plan.price !== "0" && <span style={{ fontSize: 13, color: "#475569" }}>/lună</span>}
              </div>
              <div style={{ display: "grid", gap: 8, marginBottom: 24 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ fontSize: 13, color: f.startsWith("✅") ? "#cbd5e1" : "#334155" }}>{f}</div>
                ))}
              </div>
              <button
                style={{
                  width: "100%", padding: "12px", borderRadius: 10,
                  border: plan.active ? `1px solid ${plan.color}` : "none",
                  background: plan.active ? "transparent" : plan.color,
                  color: plan.active ? plan.color : "#000",
                  fontWeight: 800, fontSize: 14, cursor: plan.active ? "default" : "pointer",
                  opacity: plan.active ? 0.7 : 1,
                }}
                onClick={() => !plan.active && alert("🚧 Plățile online vor fi disponibile în curând! Contactează-ne pe email pentru acces anticipat.")}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Features grid */}
        <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 20, padding: "28px 24px", marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, textAlign: "center" }}>De ce MatchPredict AI?</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {[
              { icon: "🤖", title: "Analiză AI", desc: "Claude AI analizează zeci de factori pentru fiecare meci" },
              { icon: "🔬", title: "Bioritm unic", desc: "Calculăm starea fizică/mentală a fiecărui jucător" },
              { icon: "🌍", title: "Orice ligă", desc: "Acoperim toate competițiile fotbalistice din lume" },
              { icon: "📊", title: "Date reale", desc: "API-Football + statistici actualizate în timp real" },
              { icon: "📋", title: "Istoric", desc: "Urmărești acuratețea predicțiilor tale în timp" },
              { icon: "📱", title: "Mobile-first", desc: "Instalabil ca aplicație pe orice telefon" },
            ].map((f) => (
              <div key={f.title} style={{ textAlign: "center", padding: "12px" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{f.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "#475569" }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: 12, color: "#334155" }}>
          ⚠️ MatchPredict AI este pentru divertisment. Predicțiile nu garantează rezultate. Joacă responsabil.
        </div>
      </div>
    </div>
  );
}
