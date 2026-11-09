"use client";
import { useEffect, useState } from "react";
import SuperadminPage from "../_lib/SuperadminPage";
import { readSuperadminSession, superadminRequest } from "../_lib/api";
type Usage = {
  totals: { request_count: number; estimated_cost: number };
  schools: Array<{
    school_id: number;
    school_name: string;
    school_code: string;
    request_count: number;
    estimated_cost: number;
  }>;
  logs: Array<{
    id: number;
    school_name: string;
    school_code: string;
    feature: string;
    request_count: number;
    estimated_cost: number;
    created_at: string | null;
  }>;
};
export default function UsagePage() {
  const [data, setData] = useState<Usage | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    async function load() {
      const { token } = readSuperadminSession();
      if (!token) return;
      try {
        setData(await superadminRequest<Usage>("/schools/usage/ai", token));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load AI usage.");
      }
    }
    void load();
  }, []);
  return (
    <SuperadminPage
      title="AI usage"
      description="Usage is calculated from the AIUsageLog records currently stored in the central database."
    >
      {error && (
        <p role="alert" style={{ color: "#b42318" }}>
          {error}
        </p>
      )}

      {/* Usage Summary */}
      <div className="superadmin-usage-summary">
        <article className="superadmin-usage-card">
          <span className="superadmin-usage-card-label">
            Total requests (recorded)
          </span>
          <strong className="superadmin-usage-card-value">
            {data?.totals.request_count ?? "—"}
          </strong>
        </article>

        <article className="superadmin-usage-card">
          <span className="superadmin-usage-card-label">Estimated cost</span>
          <strong className="superadmin-usage-card-value">
            {data ? data.totals.estimated_cost.toFixed(4) : "—"}
          </strong>
        </article>
      </div>

      {/* Usage by School */}
      <section className="superadmin-usage-section">
        <h2>Usage by school</h2>

        <div className="superadmin-usage-table-wrapper">
          <table className="superadmin-usage-table">
            <thead>
              <tr>
                <th>School</th>
                <th>Code</th>
                <th>Requests</th>
                <th>Estimated cost</th>
              </tr>
            </thead>

            <tbody>
              {data?.schools.map((school) => (
                <tr key={school.school_id}>
                  <td className="usage-school-name">{school.school_name}</td>
                  <td className="usage-school-code">{school.school_code}</td>
                  <td className="usage-number">{school.request_count}</td>
                  <td className="usage-number">
                    {school.estimated_cost.toFixed(4)}
                  </td>
                </tr>
              ))}

              {data && !data.schools.length && (
                <tr>
                  <td colSpan={4} className="superadmin-usage-empty">
                    No AI usage records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Latest Usage */}
      <section className="superadmin-usage-section">
        <h2>Latest recorded usage (up to 1,000 entries)</h2>

        <div className="superadmin-usage-table-wrapper">
          <table className="superadmin-usage-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>School</th>
                <th>Feature</th>
                <th>Requests</th>
                <th>Cost</th>
              </tr>
            </thead>

            <tbody>
              {data?.logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    {log.created_at
                      ? new Date(log.created_at).toLocaleString()
                      : "—"}
                  </td>
                  <td>
                    <span className="usage-school-name">{log.school_name}</span>{" "}
                    <span className="usage-school-code">
                      ({log.school_code})
                    </span>
                  </td>
                  <td className="usage-feature">{log.feature}</td>
                  <td className="usage-number">{log.request_count}</td>
                  <td className="usage-number">
                    {log.estimated_cost.toFixed(4)}
                  </td>
                </tr>
              ))}

              {data && !data.logs.length && (
                <tr>
                  <td colSpan={5} className="superadmin-usage-empty">
                    No usage records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section style={card}>
        <h2>Usage by school</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead>
              <tr>
                <th>School</th>
                <th>Code</th>
                <th>Requests</th>
                <th>Estimated cost</th>
              </tr>
            </thead>
            <tbody>
              {data?.schools.map((s) => (
                <tr key={s.school_id}>
                  <td>{s.school_name}</td>
                  <td>{s.school_code}</td>
                  <td>{s.request_count}</td>
                  <td>{s.estimated_cost.toFixed(4)}</td>
                </tr>
              ))}
              {!data?.schools.length && (
                <tr>
                  <td colSpan={4}>No AI usage records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section style={{ ...card, marginTop: 18 }}>
        <h2>Latest recorded usage (up to 1,000 entries)</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>School</th>
                <th>Feature</th>
                <th>Requests</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {data?.logs.map((l) => (
                <tr key={l.id}>
                  <td>
                    {l.created_at
                      ? new Date(l.created_at).toLocaleString()
                      : "—"}
                  </td>
                  <td>
                    {l.school_name} ({l.school_code})
                  </td>
                  <td>{l.feature}</td>
                  <td>{l.request_count}</td>
                  <td>{l.estimated_cost.toFixed(4)}</td>
                </tr>
              ))}
              {!data?.logs.length && (
                <tr>
                  <td colSpan={5}>No usage records.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </SuperadminPage>
  );
}
const card: React.CSSProperties = {
  background: "white",
  border: "1px solid #e5e9f0",
  borderRadius: 14,
  padding: 20,
};
const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  textAlign: "left",
};
