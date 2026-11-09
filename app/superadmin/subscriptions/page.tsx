"use client";
import { useEffect, useState } from "react";
import { readSuperadminSession, superadminRequest } from "../_lib/api";
type School = {
  id: number;
  name: string;
  code: string;
  plan_type?: string;
  ai_enabled?: boolean;
  monthly_ai_limit?: number;
  subscription_status?: string;
};
export default function SubscriptionsPage() {
  const [token, setToken] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [drafts, setDrafts] = useState<
    Record<
      number,
      {
        plan_type: string;
        ai_enabled: boolean;
        monthly_ai_limit: number;
        subscription_status: string;
      }
    >
  >({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  useEffect(() => {
    async function load() {
      const s = readSuperadminSession();
      if (!s.token) return;
      try {
        const r = await superadminRequest<{ schools: School[] }>(
          "/schools",
          s.token,
        );
        setSchools(r.schools || []);
        setToken(s.token);
        const values: typeof drafts = {};
        for (const school of r.schools || [])
          values[school.id] = {
            plan_type: school.plan_type || "basic",
            ai_enabled: school.ai_enabled ?? false,
            monthly_ai_limit: school.monthly_ai_limit ?? 0,
            subscription_status: school.subscription_status || "inactive",
          };
        setDrafts(values);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Unable to load subscriptions.",
        );
      }
    }
    void load();
  }, []);
  function change(id: number, key: string, value: string | number | boolean) {
    setDrafts((old) => ({ ...old, [id]: { ...old[id], [key]: value } }));
  }
  async function save(id: number) {
    setBusy(id);
    setError("");
    setNotice("");
    try {
      await superadminRequest(`/schools/${id}/subscription`, token, {
        method: "PUT",
        body: JSON.stringify(drafts[id]),
      });
      setNotice(
        `Subscription settings saved for ${schools.find((s) => s.id === id)?.name || "school"}.`,
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to save subscription settings.",
      );
    } finally {
      setBusy(null);
    }
  }
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 28, fontWeight: 500, margin: "0 0 8px" }}>
          Subscriptions & AI plans
        </h2>
        <p style={{ color: "#64748b", margin: 0 }}>
          Configure each school's plan, subscription status, AI access and
          monthly request limit.
        </p>
      </div>

      {error && (
        <p role="alert" style={{ color: "#b42318" }}>
          {error}
        </p>
      )}

      {notice && (
        <p role="status" style={{ color: "#067647" }}>
          {notice}
        </p>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {schools.map((s) => {
          const d = drafts[s.id];
          if (!d) return null;

          return (
            <section key={s.id} style={card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 4px" }}>{s.name}</h3>
                  <span style={{ color: "#64748b" }}>
                    {s.code} · School ID {s.id}
                  </span>
                </div>

                <button
                  style={button}
                  disabled={busy === s.id}
                  onClick={() => void save(s.id)}
                >
                  {busy === s.id ? "Saving…" : "Save settings"}
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(180px,1fr))",
                  gap: 12,
                  marginTop: 16,
                }}
              >
                <label>
                  Plan type
                  <input
                    style={field}
                    value={d.plan_type}
                    onChange={(e) =>
                      change(s.id, "plan_type", e.target.value)
                    }
                  />
                </label>

                <label>
                  Subscription status
                  <select
                    style={field}
                    value={d.subscription_status}
                    onChange={(e) =>
                      change(s.id, "subscription_status", e.target.value)
                    }
                  >
                    {[
                      "active",
                      "inactive",
                      "trial",
                      "expired",
                      "cancelled",
                    ].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Monthly AI request limit
                  <input
                    type="number"
                    min={0}
                    style={field}
                    value={d.monthly_ai_limit}
                    onChange={(e) =>
                      change(
                        s.id,
                        "monthly_ai_limit",
                        Number(e.target.value)
                      )
                    }
                  />
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    paddingTop: 24,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={d.ai_enabled}
                    onChange={(e) =>
                      change(s.id, "ai_enabled", e.target.checked)
                    }
                  />
                  Enable AI features
                </label>
              </div>
            </section>
          );
        })}

        {!schools.length && (
          <section style={card}>No schools available.</section>
        )}
      </div>
    </div>
  );

}
const card: React.CSSProperties = {
  background: "white",
  border: "1px solid #e5e9f0",
  borderRadius: 14,
  padding: 20,
};
const field: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: 10,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  marginTop: 6,
};
const button: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#fff",
  cursor: "pointer",
};
