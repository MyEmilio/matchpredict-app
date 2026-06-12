"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/",        icon: "⚽", label: "Predicții" },
  { href: "/history", icon: "📋", label: "Istoric" },
  { href: "/premium", icon: "⭐", label: "Premium" },
];

export default function Navbar() {
  const path = usePathname();
  return (
    <nav style={{
      background: "#030712", borderBottom: "1px solid #0f172a",
      padding: "0 16px", display: "flex", alignItems: "center",
      gap: 4, height: 52, flexShrink: 0,
    }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", marginRight: 16 }}>
        <span style={{ fontSize: 22 }}>⚽</span>
        <span style={{ fontWeight: 900, fontSize: 15, background: "linear-gradient(90deg,#22c55e,#4ade80)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          MatchPredict AI
        </span>
      </Link>
      {LINKS.map(({ href, icon, label }) => {
        const active = path === href;
        return (
          <Link key={href} href={href} style={{
            padding: "6px 12px", borderRadius: 8, fontSize: 13, textDecoration: "none",
            fontWeight: active ? 700 : 400,
            color: active ? "#22c55e" : "#475569",
            background: active ? "#052e16" : "transparent",
            border: active ? "1px solid #166534" : "1px solid transparent",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            {icon} {label}
          </Link>
        );
      })}
      <div style={{ marginLeft: "auto", fontSize: 11, color: "#1e293b", background: "#0f172a", borderRadius: 6, padding: "4px 8px", border: "1px solid #1e293b" }}>
        🤖 Claude AI
      </div>
    </nav>
  );
}
