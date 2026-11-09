"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import SuperadminPage from "./_lib/SuperadminPage";
import { readSuperadminSession, superadminRequest } from "./_lib/api";

type School = { id: number; name: string; code: string; status: string };
export default function SuperadminOverview() {
  const [schools, setSchools] = useState<School[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    async function load() {
      const { token } = readSuperadminSession();
      try { const result = await superadminRequest<{ schools: School[] }>("/schools", token); setSchools(result.schools || []); }
      catch (e) { setError(e instanceof Error ? e.message : "Unable to load overview."); }
    }
    void load();
  }, []);
  const active = schools.filter((s) => s.status === "active").length;
  return <SuperadminPage title="Platform overview" description="Manage schools, school administrators, student records and platform configuration.">
    {error && <p role="alert" style={{ color: "#b42318" }}>{error}</p>}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 16, marginBottom: 24 }}>
      {[ ["Total schools", schools.length], ["Active schools", active], ["Inactive schools", schools.length-active] ].map(([label,value]) => <article key={String(label)} style={card}><span style={muted}>{label}</span><strong style={{ fontSize: 30 }}>{value}</strong></article>)}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 16 }}>
      {[["Schools & administrators","Create schools, manage tenant status and assign School Admin accounts.","/superadmin/schools"],["Student directory","Search students across active school databases.","/superadmin/students"],["AI usage","Review recorded AI requests and estimated usage costs.","/superadmin/usage"],["Subscriptions & plans","Configure school plan, AI access and monthly limits.","/superadmin/subscriptions"]].map(([title,desc,url]) => <Link key={url} href={url} style={{ ...card, textDecoration:"none", color:"inherit" }}><strong style={{fontSize:18}}>{title}</strong><p style={muted}>{desc}</p><span>Open module →</span></Link>)}
    </div>
  </SuperadminPage>;
}
const card: React.CSSProperties = { background:"white", border:"1px solid #e5e9f0", borderRadius:14, padding:22, display:"flex", flexDirection:"column", gap:8 };
const muted: React.CSSProperties = { color:"#64748b", margin:0 };
