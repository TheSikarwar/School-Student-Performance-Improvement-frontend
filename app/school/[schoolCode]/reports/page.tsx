"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import AuthGuard from "../../../components/auth/AuthGuard";
import Sidebar from "../../../components/layout/Sidebar";

type JsonValue = unknown;
type StudentRow = Record<string, unknown>;
type ReportTab =
  | "overview"
  | "student"
  | "analysis"
  | "trends"
  | "early-warning"
  | "prediction"
  | "recommendations"
  | "study-plan";

const REPORT_TABS: { id: ReportTab; label: string; endpoint?: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "student", label: "Student report" },
  { id: "analysis", label: "Performance analysis", endpoint: "analysis" },
  { id: "trends", label: "Performance trends", endpoint: "trends" },
  { id: "early-warning", label: "Early warning", endpoint: "early-warning" },
  { id: "prediction", label: "Prediction", endpoint: "prediction" },
  { id: "recommendations", label: "Recommendations", endpoint: "recommendations" },
  { id: "study-plan", label: "AI study plan", endpoint: "study-plan" },
];

const ID_KEYS = ["student_id", "id", "studentId"];
const NAME_KEYS = ["full_name", "student_name", "name", "first_name"];

// Subscribe to browser auth storage without setting React state inside an effect.
function subscribeToAuthStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("edurise-auth-changed", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("edurise-auth-changed", onStoreChange);
  };
}

function getAuthSnapshot(): string {
  try {
    return JSON.stringify({
      token: localStorage.getItem("access_token") || "",
      user: JSON.parse(localStorage.getItem("user") || "{}"),
    });
  } catch {
    return JSON.stringify({ token: "", user: {} });
  }
}

function getServerAuthSnapshot(): string {
  return JSON.stringify({ token: "", user: {} });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function findStudentId(row: StudentRow): number | null {
  for (const key of ID_KEYS) {
    const value = row[key];
    const id = typeof value === "number" ? value : Number(value);
    if (Number.isInteger(id) && id > 0) return id;
  }
  return null;
}

function studentName(row: StudentRow): string {
  for (const key of NAME_KEYS) {
    if (typeof row[key] === "string" && row[key]) return row[key] as string;
  }
  const first = typeof row.first_name === "string" ? row.first_name : "";
  const last = typeof row.last_name === "string" ? row.last_name : "";
  return `${first} ${last}`.trim() || `Student ${findStudentId(row) ?? ""}`;
}

function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function JsonViewer({ value }: { value: JsonValue }) {
  if (value === null || value === undefined) {
    return <p className="report-muted">No data returned.</p>;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <p className="report-value">{String(value)}</p>;
  }

  if (Array.isArray(value)) {
    if (!value.length) return <p className="report-muted">No records found.</p>;
    const allObjects = value.every((item) => asRecord(item));
    if (allObjects) {
      const rows = value as Record<string, unknown>[];
      const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
      return (
        <div className="report-table-wrap">
          <table className="report-table">
            <thead><tr>{keys.map((key) => <th key={key}>{formatLabel(key)}</th>)}</tr></thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={String(row.id ?? row.student_id ?? index)}>
                  {keys.map((key) => (
                    <td key={key}>
                      {row[key] !== null && typeof row[key] === "object"
                        ? JSON.stringify(row[key])
                        : String(row[key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return <ul className="report-list">{value.map((item, i) => <li key={i}><JsonViewer value={item} /></li>)}</ul>;
  }

  const record = asRecord(value);
  if (!record) return <p className="report-muted">Unsupported response.</p>;

  return (
    <div className="json-grid">
      {Object.entries(record).map(([key, item]) => (
        <div className="json-item" key={key}>
          <div className="json-key">{formatLabel(key)}</div>
          <div className="json-content">
            {item !== null && typeof item === "object"
              ? <JsonViewer value={item} />
              : <span>{String(item ?? "—")}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportsContent({ schoolCode }: { schoolCode: string }) {
  const authSnapshot = useSyncExternalStore(
    subscribeToAuthStorage,
    getAuthSnapshot,
    getServerAuthSnapshot,
  );
  const auth = useMemo(() => {
    try {
      return JSON.parse(authSnapshot) as {
        token?: string;
        user?: { full_name?: string; email?: string; role?: string };
      };
    } catch {
      return { token: "", user: {} };
    }
  }, [authSnapshot]);
  const token = auth.token || "";
  const userName = auth.user?.full_name || auth.user?.email || "School User";
  const role = auth.user?.role || "teacher";
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [dashboard, setDashboard] = useState<JsonValue>(null);
  const [aiUsage, setAiUsage] = useState<Record<string, unknown> | null>(null);
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");
  const [studentReport, setStudentReport] = useState<JsonValue>(null);
  const [detailResults, setDetailResults] = useState<Partial<Record<ReportTab, JsonValue>>>({});
  const [dailyStudyHours, setDailyStudyHours] = useState(2);
  const [planDays, setPlanDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [studyPlanLoading, setStudyPlanLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [notice, setNotice] = useState("");

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  const reportsBase = `/schools/${encodeURIComponent(schoolCode)}/reports`;

  const request = useCallback(async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
    if (!apiBase) throw new Error("NEXT_PUBLIC_API_URL is not configured.");
    if (!token) throw new Error("Your session token is missing. Please sign in again.");
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...((options.headers || {}) as Record<string, string>),
      },
      cache: "no-store",
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(result?.error || `Request failed (HTTP ${response.status}).`);
    }
    return result as T;
  }, [apiBase, token]);

  const loadOverview = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [dashboardResult, studentsResult, usageResult] = await Promise.all([
        request<JsonValue>(`${reportsBase}/dashboard`),
        request<{ students?: StudentRow[] }>(`${reportsBase}/students`),
        request<Record<string, unknown>>(`${reportsBase}/ai-usage`),
      ]);
      setDashboard(dashboardResult);
      const rows = Array.isArray(studentsResult?.students) ? studentsResult.students : [];
      setStudents(rows);
      setAiUsage(usageResult);
      setSelectedStudentId((current) => {
        if (current && rows.some((row) => String(findStudentId(row)) === current)) return current;
        const firstId = rows.map(findStudentId).find((id) => id !== null);
        return firstId ? String(firstId) : "";
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }, [token, request, reportsBase]);

  useEffect(() => {
    // Defer the request to the next task so state updates in the loader do not
    // run synchronously inside the effect body.
    const timer = window.setTimeout(() => {
      void loadOverview();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadOverview]);

  const selectedStudent = useMemo(
    () => students.find((row) => String(findStudentId(row)) === selectedStudentId) || null,
    [students, selectedStudentId],
  );

  const loadStudentReport = useCallback(async (studentId: string) => {
    if (!studentId) return;
    setDetailLoading(true);
    setDetailError("");
    try {
      const result = await request<JsonValue>(`${reportsBase}/students/${encodeURIComponent(studentId)}`);
      setStudentReport(result);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Unable to load student report.");
    } finally {
      setDetailLoading(false);
    }
  }, [request, reportsBase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (selectedStudentId) {
        void loadStudentReport(selectedStudentId);
      } else {
        setStudentReport(null);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedStudentId, loadStudentReport]);

  const loadStudentFeature = useCallback(async (tab: ReportTab) => {
    const studentId = selectedStudentId;
    const tabConfig = REPORT_TABS.find((item) => item.id === tab);
    if (!studentId || !tabConfig?.endpoint || tab === "study-plan") return;
    setDetailLoading(true);
    setDetailError("");
    try {
      const result = await request<JsonValue>(
        `${reportsBase}/students/${encodeURIComponent(studentId)}/${tabConfig.endpoint}`,
      );
      setDetailResults((current) => ({ ...current, [tab]: result }));
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Unable to load this report.");
    } finally {
      setDetailLoading(false);
    }
  }, [selectedStudentId, request, reportsBase]);

  useEffect(() => {
    if (activeTab === "overview" || activeTab === "student" || activeTab === "study-plan" || detailResults[activeTab]) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadStudentFeature(activeTab);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeTab, detailResults, loadStudentFeature]);

  async function generateStudyPlan() {
    if (!selectedStudentId) return;
    setStudyPlanLoading(true);
    setDetailError("");
    setNotice("");
    try {
      const result = await request<JsonValue>(
        `${reportsBase}/students/${encodeURIComponent(selectedStudentId)}/study-plan`,
        {
          method: "POST",
          body: JSON.stringify({
            daily_study_hours: dailyStudyHours,
            plan_days: planDays,
          }),
        },
      );
      setDetailResults((current) => ({ ...current, "study-plan": result }));
      setNotice("Study plan generated successfully.");
      const usage = await request<Record<string, unknown>>(`${reportsBase}/ai-usage`);
      setAiUsage(usage);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Unable to generate the study plan.");
    } finally {
      setStudyPlanLoading(false);
    }
  }

  function selectTab(tab: ReportTab) {
    setActiveTab(tab);
    setDetailError("");
    setNotice("");
  }

  const usagePercent = Math.max(0, Math.min(100, Number(aiUsage?.usage_percentage ?? 0)));

  return (
    <main className="dashboard-shell">
      <Sidebar role={role as "school_admin" | "teacher" | "parent" | "student"} schoolCode={schoolCode} fullName={userName} />
      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="dashboard-overline">EDURISE / SCHOOL / REPORTS</span>
            <h1>Reports &amp; Analytics</h1>
            <p>Student performance insights and AI-assisted improvement tools.</p>
          </div>
          <div className="reports-header-actions">
            <span className="role-chip">{formatLabel(role)}</span>
            <button type="button" className="secondary-button" onClick={() => void loadOverview()} disabled={loading}>↻ Refresh</button>
          </div>
        </header>

        {error && <div className="dashboard-alert error" role="alert">{error}</div>}
        {notice && <div className="dashboard-alert success" role="status">{notice}</div>}

        <nav className="reports-tabs" aria-label="Report sections">
          {REPORT_TABS.map((tab) => (
            <button key={tab.id} type="button" className={activeTab === tab.id ? "reports-tab active" : "reports-tab"} onClick={() => selectTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === "overview" && (
          <>
            <section className="reports-stats">
              <article className="stat-card"><span>Total students in report</span><strong>{loading ? "…" : students.length}</strong><small>Students with performance records</small></article>
              <article className="stat-card"><span>AI plan</span><strong className="report-status">{aiUsage?.ai_enabled ? "Enabled" : "Disabled"}</strong><small>{String(aiUsage?.plan_type ?? "Plan not available")}</small></article>
              <article className="stat-card"><span>AI requests used</span><strong>{loading ? "…" : String(aiUsage?.requests_used ?? 0)}</strong><small>Current month</small></article>
              <article className="stat-card"><span>Requests remaining</span><strong>{loading ? "…" : String(aiUsage?.requests_remaining ?? 0)}</strong><small>Monthly quota</small></article>
            </section>

            <section className="content-card">
              <div className="section-heading"><div><h2>Class performance dashboard</h2><p>School-wide class performance summary from the reports API.</p></div></div>
              {loading ? <p className="report-muted">Loading dashboard…</p> : <JsonViewer value={dashboard} />}
            </section>

            <section className="content-card">
              <div className="section-heading"><div><h2>AI usage</h2><p>Usage recorded for this school during the current month.</p></div></div>
              {aiUsage && (
                <>
                  <div className="usage-meta"><strong>{String(aiUsage.requests_used ?? 0)} / {String(aiUsage.monthly_limit ?? 0)} requests</strong><span>{usagePercent.toFixed(1)}%</span></div>
                  <div className="usage-track"><div className="usage-fill" style={{ width: `${usagePercent}%` }} /></div>
                  <JsonViewer value={aiUsage.usage_by_feature ?? []} />
                </>
              )}
            </section>

            <section className="content-card">
              <div className="section-heading"><div><h2>Students performance</h2><p>Select a student to open their detailed reports and AI insights.</p></div></div>
              <StudentPicker students={students} value={selectedStudentId} onChange={(id) => { setSelectedStudentId(id); setActiveTab("student"); }} />
            </section>
          </>
        )}

        {activeTab !== "overview" && (
          <>
            <section className="content-card">
              <div className="section-heading">
                <div><h2>{REPORT_TABS.find((tab) => tab.id === activeTab)?.label}</h2><p>{selectedStudent ? studentName(selectedStudent) : "Choose a student to view their report."}</p></div>
              </div>
              <StudentPicker students={students} value={selectedStudentId} onChange={(id) => { setSelectedStudentId(id); setDetailResults({}); setStudentReport(null); }} />
              {detailError && <div className="dashboard-alert error" role="alert">{detailError}</div>}
              {detailLoading && <p className="report-muted">Loading report…</p>}

              {activeTab === "student" && !detailLoading && <JsonViewer value={studentReport} />}

              {activeTab !== "student" && activeTab !== "study-plan" && !detailLoading && (
                detailResults[activeTab] !== undefined
                  ? <JsonViewer value={detailResults[activeTab]} />
                  : !detailError && <p className="report-muted">Select a student to load this report.</p>
              )}

              {activeTab === "study-plan" && (
                <div className="study-plan-controls">
                  <div className="study-plan-fields">
                    <label>Daily study hours
                      <input type="number" min="0.5" max="8" step="0.5" value={dailyStudyHours} onChange={(e) => setDailyStudyHours(Number(e.target.value))} />
                    </label>
                    <label>Plan duration (days)
                      <input type="number" min="1" max="14" step="1" value={planDays} onChange={(e) => setPlanDays(Number(e.target.value))} />
                    </label>
                  </div>
                  <p className="report-muted">Generating a study plan uses one monthly AI request. Premium AI access and available quota are required.</p>
                  <button type="button" className="primary-button" onClick={() => void generateStudyPlan()} disabled={!selectedStudentId || studyPlanLoading || dailyStudyHours < 0.5 || dailyStudyHours > 8 || planDays < 1 || planDays > 14 || !Number.isInteger(planDays)}>
                    {studyPlanLoading ? "Generating plan…" : "Generate AI study plan"}
                  </button>
                  {detailResults["study-plan"] !== undefined && <div className="study-plan-result"><JsonViewer value={detailResults["study-plan"]} /></div>}
                </div>
              )}
            </section>
          </>
        )}
      </section>

      <style jsx global>{`
        .reports-header-actions { display:flex; align-items:center; gap:12px; }
        .reports-tabs { display:flex; flex-wrap:wrap; gap:8px; margin:0 0 20px; }
        .reports-tab { border:1px solid #dce6eb; background:#fff; color:#526875; border-radius:9px; padding:9px 13px; cursor:pointer; font-size:13px; font-weight:600; }
        .reports-tab.active { background:#12384a; color:#fff; border-color:#12384a; }
        .reports-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:15px; margin-bottom:20px; }
        .report-status { color:#087e70 !important; }
        .report-muted { color:#718096; font-size:14px; }
        .report-value { color:#12384a; font-weight:600; }
        .report-table-wrap { width:100%; overflow-x:auto; }
        .report-table { width:100%; border-collapse:collapse; text-align:left; }
        .report-table th,.report-table td { padding:12px; border-bottom:1px solid #edf1f3; font-size:13px; white-space:nowrap; }
        .report-table th { color:#718096; text-transform:uppercase; font-size:11px; letter-spacing:.04em; }
        .json-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
        .json-item { min-width:0; border:1px solid #e8eef1; border-radius:10px; padding:13px; }
        .json-key { color:#718096; font-size:11px; text-transform:uppercase; letter-spacing:.04em; font-weight:700; margin-bottom:7px; }
        .json-content { color:#244453; font-size:14px; overflow-wrap:anywhere; }
        .json-content .json-grid { grid-template-columns:1fr; }
        .report-list { padding-left:20px; color:#244453; }
        .usage-meta { display:flex; justify-content:space-between; margin:12px 0 8px; color:#244453; font-size:13px; }
        .usage-track { height:9px; background:#edf2f4; border-radius:99px; overflow:hidden; margin-bottom:18px; }
        .usage-fill { height:100%; background:#0d9488; border-radius:99px; }
        .student-picker { display:flex; flex-wrap:wrap; align-items:center; gap:12px; }
        .student-picker label { color:#526875; font-size:13px; font-weight:600; }
        .student-picker select { min-width:260px; max-width:100%; padding:10px 12px; border:1px solid #dce6eb; border-radius:9px; background:#fff; color:#244453; }
        .study-plan-controls { display:grid; gap:16px; margin-top:18px; }
        .study-plan-fields { display:flex; flex-wrap:wrap; gap:16px; }
        .study-plan-fields label { display:grid; gap:7px; color:#526875; font-size:13px; font-weight:600; }
        .study-plan-fields input { width:180px; padding:10px 12px; border:1px solid #dce6eb; border-radius:8px; }
        .study-plan-result { border-top:1px solid #edf1f3; padding-top:18px; margin-top:8px; }
        @media(max-width:1000px) { .reports-stats { grid-template-columns:repeat(2,minmax(0,1fr)); } }
        @media(max-width:650px) { .reports-stats,.json-grid { grid-template-columns:1fr; } .reports-header-actions { align-items:flex-end; flex-direction:column; } .student-picker select { min-width:0; width:100%; } }
      `}</style>
    </main>
  );
}

function StudentPicker({ students, value, onChange }: { students: StudentRow[]; value: string; onChange: (value: string) => void }) {
  const usableStudents = students.filter((student) => findStudentId(student) !== null);
  return (
    <div className="student-picker">
      <label htmlFor="report-student-select">Student</label>
      <select id="report-student-select" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select a student</option>
        {usableStudents.map((student) => {
          const id = findStudentId(student)!;
          return <option key={id} value={String(id)}>{studentName(student)} (ID: {id})</option>;
        })}
      </select>
      {!usableStudents.length && <span className="report-muted">No student records with an ID were returned.</span>}
    </div>
  );
}

function ReportsPageContent() {
  const params = useParams<{ schoolCode: string }>();
  const schoolCode = (params.schoolCode || "").trim().toUpperCase();
  return (
    <AuthGuard allowedRoles={["school_admin", "teacher"]}>
      <ReportsContent schoolCode={schoolCode} />
    </AuthGuard>
  );
}

export default function ReportsPage() {
  return <ReportsPageContent />;
}
