"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useParams } from "next/navigation";
import AuthGuard from "../../../components/auth/AuthGuard";
import Sidebar from "../../../components/layout/Sidebar";
import { apiRequest } from "../../../lib/api";
import Loading from "@/app/components/common/Loading";

type Role = "superadmin" | "school_admin" | "teacher";

type Mark = {
  id: number;
  student_id: number;
  roll_number?: string;
  subject: string;
  assessment_type: string;
  assessment_name: string;
  assessment_date: string;
  marks_obtained: number;
  max_marks: number;
};

type MarkForm = {
  roll_number: string;
  subject: string;
  assessment_type: string;
  assessment_name: string;
  assessment_date: string;
  marks_obtained: string;
  max_marks: string;
};

const ASSESSMENT_TYPES = [
  { value: "weekly_test", label: "Weekly Test" },
  { value: "monthly_test", label: "Monthly Test" },
  { value: "midterm_exam", label: "Midterm Exam" },
  { value: "final_exam", label: "Final Exam" },
  { value: "quarterly_exam", label: "Quarterly Exam" },
  { value: "practical", label: "Practical" },
];

const EMPTY_FORM: MarkForm = {
  roll_number: "",
  subject: "",
  assessment_type: "weekly_test",
  assessment_name: "",
  assessment_date: new Date().toLocaleDateString("en-CA"),
  marks_obtained: "",
  max_marks: "100",
};

function getRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object") {
    const value = result as Record<string, unknown>;
    if (Array.isArray(value.marks)) return value.marks as T[];
    if (Array.isArray(value.data)) return value.data as T[];
  }
  return [];
}

function formatDate(value: string) {
  if (!value) return "—";
  const datePart = value.slice(0, 10);
  const [year, month, day] = datePart.split("-");
  return year && month && day ? `${day}-${month}-${year}` : value;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function MarksContent({ schoolCode }: { schoolCode: string }) {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [role, setRole] = useState<Role>("school_admin");
  const [userName, setUserName] = useState("School Administrator");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [assessmentFilter, setAssessmentFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<MarkForm>(EMPTY_FORM);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [showImport, setShowImport] = useState(false);

  const base = `/schools/${encodeURIComponent(schoolCode)}/marks`;
  const isAdmin = role === "school_admin" || role === "superadmin";
  const isTeacher = role === "teacher";

  const loadMarks = useCallback(async () => {
    const result = await apiRequest<unknown>(base, { cache: "no-store" });
    setMarks(getRows<Mark>(result));
  }, [base]);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const stored = JSON.parse(localStorage.getItem("user") || "{}");
        if (!cancelled) {
          if (stored.full_name) setUserName(stored.full_name);
          if (stored.role) setRole(stored.role as Role);
        }
        await loadMarks();
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "Unable to load marks."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initialize();
    return () => {
      cancelled = true;
    };
  }, [loadMarks]);

  function change<K extends keyof MarkForm>(key: K, value: MarkForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setNotice("");
    setShowForm(true);
  }

  function openEditForm(mark: Mark) {
    setEditingId(mark.id);
    setForm({
      roll_number: mark.roll_number || "",
      subject: mark.subject || "",
      assessment_type: mark.assessment_type || "weekly_test",
      assessment_name: mark.assessment_name || "",
      assessment_date: mark.assessment_date?.slice(0, 10) || "",
      marks_obtained: String(mark.marks_obtained ?? ""),
      max_marks: String(mark.max_marks ?? ""),
    });
    setError("");
    setNotice("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function saveMark(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const obtained = Number(form.marks_obtained);
    const maximum = Number(form.max_marks);

    if (!Number.isFinite(obtained) || !Number.isFinite(maximum) ||
        obtained < 0 || maximum <= 0 || obtained > maximum) {
      setError("Marks obtained must be between 0 and maximum marks.");
      return;
    }

    const payload = {
      roll_number: form.roll_number.trim(),
      subject: form.subject.trim(),
      assessment_type: form.assessment_type,
      assessment_name: form.assessment_name.trim(),
      assessment_date: form.assessment_date,
      marks_obtained: obtained,
      max_marks: maximum,
    };

    setBusy(true);
    try {
      if (editingId === null) {
        await apiRequest(base, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest(`${base}/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }

      closeForm();
      await loadMarks();
      setNotice(editingId === null ? "Marks added successfully." : "Marks updated successfully.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save marks."));
    } finally {
      setBusy(false);
    }
  }

  async function removeMark(mark: Mark) {
    if (!window.confirm(`Delete marks for ${mark.roll_number || "this student"} — ${mark.subject}?`)) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest(`${base}/${mark.id}`, { method: "DELETE" });
      await loadMarks();
      setNotice("Mark record deleted successfully.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to delete mark record."));
    } finally {
      setBusy(false);
    }
  }

  async function importMarks(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!importFile) {
      setError("Please select an Excel file.");
      return;
    }

    const token = localStorage.getItem("access_token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!token || !apiUrl) {
      setError("Your login session or API configuration is missing. Please sign in again.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const body = new FormData();
      body.append("file", importFile);

      const response = await fetch(`${apiUrl}${base}/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || result.message || `Import failed (${response.status}).`);
      }

      setImportFile(null);
      setShowImport(false);
      await loadMarks();
      setNotice(`${result.imported ?? 0} mark records imported successfully.`);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to import marks."));
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await loadMarks();
      setNotice("Marks refreshed successfully.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to refresh marks."));
    } finally {
      setBusy(false);
    }
  }

  const filteredMarks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return marks.filter((mark) => {
      const matchesSearch = [
        mark.roll_number,
        mark.subject,
        mark.assessment_name,
        mark.assessment_type,
      ].filter(Boolean).join(" ").toLowerCase().includes(query);
      const matchesType = assessmentFilter === "all" || mark.assessment_type === assessmentFilter;
      return matchesSearch && matchesType;
    });
  }, [marks, search, assessmentFilter]);

  const averagePercentage = marks.length
    ? marks.reduce((total, mark) => total + (Number(mark.max_marks) > 0
        ? (Number(mark.marks_obtained) / Number(mark.max_marks)) * 100
        : 0), 0) / marks.length
    : 0;

  if (loading) return <Loading message="Please wait, preparing your EduRise workspace..." />;

  return (
    <main className="dashboard-shell">
      <Sidebar role={role} schoolCode={schoolCode} fullName={userName} />
      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="dashboard-overline">EDURISE / SCHOOL / MARKS</span>
            <h1>{isTeacher ? "Marks Management" : "Student Marks Management"}</h1>
            <p>
              {isTeacher
                ? "View and enter marks for students in your assigned classes."
                : `Record, review and manage student assessment marks for ${schoolCode}.`}
            </p>
          </div>
          <div className="header-actions">
            <span className="role-chip">{role.replace("_", " ")}</span>
            <button type="button" className="secondary-button" onClick={refresh} disabled={busy}>
              ↻ Refresh
            </button>
          </div>
        </header>

        {error && <div className="dashboard-alert error" role="alert">{error}</div>}
        {notice && <div className="dashboard-alert success" role="status">{notice}</div>}

        <div className="stat-grid">
          <article className="stat-card">
            <span>Total mark records</span>
            <strong>{marks.length}</strong>
            <small>{isTeacher ? "Records available to you" : "Assessment records in this school"}</small>
          </article>
          <article className="stat-card">
            <span>School code</span>
            <strong className="stat-code">{schoolCode}</strong>
            {/* <small>Current tenant</small> */}
          </article>
          <article className="stat-card">
            <span>Average percentage</span>
            <strong>{averagePercentage.toFixed(1)}%</strong>
            <small>Across loaded mark records</small>
          </article>
        </div>

        <section className="content-card">
          <div className="section-heading">
            <div>
              <h2>{isTeacher ? "My students' marks" : "Assessment records"}</h2>
              <p>
                {isTeacher
                  ? "Enter marks and review assessment performance."
                  : "Add individual marks or import records from an Excel file."}
              </p>
            </div>
            <div className="header-actions">
              <input
                className="table-search"
                type="search"
                placeholder="Search roll number, subject or assessment"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button type="button" className="primary-button" onClick={openCreateForm} disabled={busy}>
                + Add Marks
              </button>
              <button type="button" className="secondary-button" onClick={() => {
                setShowImport((value) => !value);
                setShowForm(false);
                setError("");
              }} disabled={busy}>
                Import Excel
              </button>
            </div>
          </div>

          {showImport && (
            <form className="create-school-form" onSubmit={importMarks}>
              <div className="student-form-heading">
                <h3>Import marks from Excel</h3>
                <button type="button" className="secondary-button" onClick={() => setShowImport(false)} disabled={busy}>✕ Close</button>
              </div>
              <p>
                First download the sample Excel template, fill in your students&apos; marks,
                and upload the completed file. Keep the column headings unchanged.
              </p>
              <p>
                <a className="table-action" href="/sample_marks_import.xlsx" download>
                  ↓ Download sample Excel template
                </a>
              </p>
              <label>
                Excel file (.xlsx / .xls)
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(event) => setImportFile(event.target.files?.[0] || null)}
                  required
                />
              </label>
              <div className="form-actions">
                <button type="submit" className="primary-button" disabled={busy || !importFile}>
                  {busy ? "Importing..." : "Upload and Import"}
                </button>
              </div>
              <small>Required columns: roll_number, subject, assessment_type, assessment_name, assessment_date, marks_obtained, max_marks. Do not rename or remove these headings.</small>
            </form>
          )}

          {showForm && (
            <form className="create-school-form student-form" onSubmit={saveMark}>
              <div className="student-form-heading">
                <h3>{editingId === null ? "Add Student Marks" : "Edit Student Marks"}</h3>
                <button type="button" className="secondary-button" onClick={closeForm} disabled={busy}>✕ Close</button>
              </div>

              <label>
                Student roll number *
                <input value={form.roll_number} onChange={(event) => change("roll_number", event.target.value)} required maxLength={50} placeholder="Enter registered roll number" />
              </label>
              <label>
                Subject *
                <input value={form.subject} onChange={(event) => change("subject", event.target.value)} required maxLength={120} placeholder="e.g. Mathematics" />
              </label>
              <label>
                Assessment type *
                <select value={form.assessment_type} onChange={(event) => change("assessment_type", event.target.value)} required>
                  {ASSESSMENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </label>
              <label>
                Assessment name *
                <input value={form.assessment_name} onChange={(event) => change("assessment_name", event.target.value)} required maxLength={150} placeholder="e.g. Chapter 1 Test" />
              </label>
              <label>
                Assessment date *
                <input type="date" value={form.assessment_date} onChange={(event) => change("assessment_date", event.target.value)} required />
              </label>
              <label>
                Marks obtained *
                <input type="number" min="0" step="0.01" value={form.marks_obtained} onChange={(event) => change("marks_obtained", event.target.value)} required />
              </label>
              <label>
                Maximum marks *
                <input type="number" min="0.01" step="0.01" value={form.max_marks} onChange={(event) => change("max_marks", event.target.value)} required />
              </label>

              <div className="form-actions student-form-actions">
                <button type="button" className="secondary-button" onClick={closeForm} disabled={busy}>Cancel</button>
                <button type="submit" className="primary-button" disabled={busy}>
                  {busy ? "Saving..." : editingId === null ? "Save Marks" : "Update Marks"}
                </button>
              </div>
            </form>
          )}

          <div className="table-toolbar">
            <span>{filteredMarks.length} of {marks.length} records</span>
            <select value={assessmentFilter} onChange={(event) => setAssessmentFilter(event.target.value)} aria-label="Filter by assessment type">
              <option value="all">All assessment types</option>
              {ASSESSMENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll number</th>
                  <th>Subject</th>
                  <th>Assessment</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Marks</th>
                  <th>Percentage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMarks.map((mark) => {
                  const percentage = Number(mark.max_marks) > 0
                    ? (Number(mark.marks_obtained) / Number(mark.max_marks)) * 100
                    : 0;
                  const assessmentLabel = ASSESSMENT_TYPES.find((item) => item.value === mark.assessment_type)?.label || mark.assessment_type;
                  return (
                    <tr key={mark.id}>
                      <td><strong>{mark.roll_number || `Student #${mark.student_id}`}</strong></td>
                      <td>{mark.subject}</td>
                      <td>{mark.assessment_name}</td>
                      <td>{assessmentLabel}</td>
                      <td>{formatDate(mark.assessment_date)}</td>
                      <td>{mark.marks_obtained} / {mark.max_marks}</td>
                      <td>{percentage.toFixed(1)}%</td>
                      <td>
                        <button type="button" className="table-action" onClick={() => openEditForm(mark)} disabled={busy}>Edit</button>
                        {isAdmin && (
                          <button type="button" className="table-action" onClick={() => removeMark(mark)} disabled={busy}>Delete</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredMarks.length === 0 && (
                  <tr>
                    <td colSpan={8} className="empty-state">
                      {search || assessmentFilter !== "all"
                        ? "No mark records match your filters."
                        : "No marks have been recorded yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}

function MarksPageContent() {
  const params = useParams<{ schoolCode: string }>();
  const schoolCode = (params.schoolCode || "").trim().toUpperCase();

  return (
    <AuthGuard allowedRoles={["school_admin", "teacher", "superadmin"]}>
      <MarksContent schoolCode={schoolCode} />
    </AuthGuard>
  );
}

export default function MarksPage() {
  return (
    <Suspense fallback={<main className="dashboard-loading">Loading marks...</main>}>
      <MarksPageContent />
    </Suspense>
  );
}
