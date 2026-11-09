"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { useParams } from "next/navigation";
import AuthGuard from "../../../components/auth/AuthGuard";
import Sidebar from "../../../components/layout/Sidebar";
import { apiRequest } from "../../../lib/api";
import Loading from "@/app/components/common/Loading";

type Role = "superadmin" | "school_admin" | "teacher" | "parent" | "student";
type SchoolClass = {
  id: number;
  name: string;
  section?: string;
  academic_year?: string;
};
type Student = {
  id: number;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  roll_number: string;
  class_id?: number | null;
  father_name?: string | null;
  mother_name?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  admission_number?: string | null;
  student_phone?: string | null;
  parent_phone?: string | null;
  parent_email?: string | null;
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  admission_date?: string | null;
};

type FormValues = {
  first_name: string;
  middle_name: string;
  last_name: string;
  roll_number: string;
  class_id: string;
  date_of_birth: string;
  gender: string;
  father_name: string;
  mother_name: string;
  guardian_name: string;
  guardian_phone: string;
  parent_email: string;
  parent_full_name: string;
  parent_relationship_type: string;
  student_phone: string;
  admission_number: string;
  admission_date: string;
  address_line: string;
  city: string;
  state: string;
  postal_code: string;
};

const EMPTY: FormValues = {
  first_name: "",
  middle_name: "",
  last_name: "",
  roll_number: "",
  class_id: "",
  date_of_birth: "",
  gender: "",
  father_name: "",
  mother_name: "",
  guardian_name: "",
  guardian_phone: "",
  parent_email: "",
  parent_full_name: "",
  parent_relationship_type: "father",
  student_phone: "",
  admission_number: "",
  admission_date: "",
  address_line: "",
  city: "",
  state: "",
  postal_code: "",
};

function rows<T>(result: unknown, key: string): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object") {
    const obj = result as Record<string, unknown>;
    if (Array.isArray(obj[key])) return obj[key] as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (
      obj.data &&
      typeof obj.data === "object" &&
      Array.isArray((obj.data as Record<string, unknown>)[key])
    ) {
      return (obj.data as Record<string, unknown>)[key] as T[];
    }
  }
  return [];
}

function StudentsContent({ schoolCode }: { schoolCode: string }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY);
  const [userName, setUserName] = useState("School Administrator");
  const [role, setRole] = useState<Role>("school_admin");

  const base = `/schools/${encodeURIComponent(schoolCode)}/students`;
  const classesUrl = `/schools/${encodeURIComponent(schoolCode)}/classes/`;

  const loadData = useCallback(async () => {
    const [studentResult, classResult] = await Promise.all([
      apiRequest<unknown>(base, { cache: "no-store" }),
      apiRequest<unknown>(classesUrl, { cache: "no-store" }),
    ]);
    setStudents(rows<Student>(studentResult, "students"));
    setClasses(rows<SchoolClass>(classResult, "classes"));
  }, [base, classesUrl]);

  useEffect(() => {
    let cancelled = false;

    async function initializePage() {
      // Defer state updates outside the synchronous effect execution.
      await Promise.resolve();

      if (cancelled) return;

      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");

        if (user.full_name) {
          setUserName(user.full_name);
        }

        if (user.role) {
          setRole(user.role as Role);
        }
      } catch {
        // AuthGuard handles invalid sessions.
      }

      try {
        await loadData();
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unable to load students.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    initializePage();

    return () => {
      cancelled = true;
    };
  }, [loadData]);
  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY);
  }

  function change<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((old) => ({ ...old, [key]: value }));
  }

  function editStudent(student: Student) {
    setEditingId(student.id);
    setForm({
      first_name: student.first_name || "",
      middle_name: student.middle_name || "",
      last_name: student.last_name || "",
      roll_number: student.roll_number || "",
      class_id: student.class_id ? String(student.class_id) : "",
      date_of_birth: student.date_of_birth || "",
      gender: student.gender || "",
      father_name: student.father_name || "",
      mother_name: student.mother_name || "",
      guardian_name: student.guardian_name || "",
      guardian_phone: student.guardian_phone || "",
      parent_email: student.parent_email || "",
      parent_full_name: "",
      parent_relationship_type: "father",
      student_phone: student.student_phone || "",
      admission_number: student.admission_number || "",
      admission_date: student.admission_date || "",
      address_line: student.address_line || "",
      city: student.city || "",
      state: student.state || "",
      postal_code: student.postal_code || "",
    });
    setError("");
    setNotice("");
    setShowForm(true);
  }

  async function saveStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    const payload = {
      first_name: form.first_name.trim(),
      middle_name: form.middle_name.trim() || null,
      last_name: form.last_name.trim(),
      roll_number: form.roll_number.trim(),
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      father_name: form.father_name.trim() || null,
      mother_name: form.mother_name.trim() || null,
      guardian_name: form.guardian_name.trim() || null,
      guardian_phone: form.guardian_phone.trim() || null,
      parent_email: form.parent_email.trim() || null,
      student_phone: form.student_phone.trim() || null,
      admission_number: form.admission_number.trim() || null,
      admission_date: form.admission_date || null,
      address_line: form.address_line.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      postal_code: form.postal_code.trim() || null,
    };

    const parentEmail = form.parent_email.trim().toLowerCase();
    const parentPayload = parentEmail
      ? {
          full_name: form.parent_full_name.trim(),
          email: parentEmail,
          phone: form.guardian_phone.trim() || null,
          relationship_type: form.parent_relationship_type,
        }
      : undefined;

    if (editingId === null && parentPayload && !parentPayload.full_name) {
      setError("Please enter the parent full name.");
      setBusy(false);
      return;
    }

    try {
      let savedResult: Student | { student?: Student };
      if (editingId !== null) {
        savedResult = await apiRequest<Student>(`${base}/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        savedResult = await apiRequest<Student | { student?: Student }>(base, {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            ...(parentPayload ? { parent: parentPayload } : {}),
          }),
        });
      }

      const savedStudent =
        "student" in savedResult && savedResult.student
          ? savedResult.student
          : (savedResult as Student);
      const studentId = savedStudent?.id ?? editingId;
      if (form.class_id && studentId) {
        await apiRequest(`${base}/${studentId}/class`, {
          method: "PUT",
          body: JSON.stringify({ class_id: Number(form.class_id) }),
        });
      }

      const wasEdit = editingId !== null;
      closeForm();
      await loadData();
      setNotice(
        wasEdit
          ? "Student updated successfully."
          : "Student created successfully.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save student.");
      await loadData().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  async function removeStudent(student: Student) {
    if (!window.confirm(`Delete ${student.first_name} ${student.last_name}?`))
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest(`${base}/${student.id}`, { method: "DELETE" });
      await loadData();
      setNotice("Student deleted successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete student.");
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await loadData();
      setNotice("Student list refreshed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to refresh students.");
    } finally {
      setBusy(false);
    }
  }

  const isAdmin = role === "school_admin";
  const isTeacher = role === "teacher";
  const filtered = students.filter((s) =>
    [
      s.first_name,
      s.middle_name,
      s.last_name,
      s.roll_number,
      s.admission_number,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  const className = (id?: number | null) => {
    const found = classes.find((c) => c.id === id);
    return found
      ? `${found.name}${found.section ? ` - ${found.section}` : ""}`
      : "Not assigned";
  };

  if (loading)
    return (
      <Loading message="Please wait, preparing your EduRise workspace..." />
    );

  return (
    <main className="dashboard-shell">
      <Sidebar role={role} schoolCode={schoolCode} fullName={userName} />
      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="dashboard-overline">
              EDURISE / SCHOOL / STUDENTS
            </span>
            <h1>{isTeacher ? "My Students" : "Student Management"}</h1>
            <p>
              {isTeacher
                ? "View students from your assigned classes."
                : `Manage student profiles and class assignments for ${schoolCode}.`}
            </p>
          </div>
          <div className="header-actions">
            <span className="role-chip">{role.replace("_", " ")}</span>
            <button
              type="button"
              className="secondary-button"
              onClick={refresh}
              disabled={busy}
            >
              ↻ Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="dashboard-alert error" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="dashboard-alert success" role="status">
            {notice}
          </div>
        )}

        <div className="stat-grid">
          <article className="stat-card">
            <span>{isTeacher ? "My Students" : "Total students"}</span>
            <strong>{students.length}</strong>
            <small>
              {isTeacher
                ? "Students in your assigned classes"
                : "Registered in your school"}
            </small>
          </article>
          <article className="stat-card">
            <span>School code</span>
            <strong className="stat-code">{schoolCode}</strong>
            {/* <small>Current tenant</small> */}
          </article>
          <article className="stat-card">
            <span>{isTeacher ? "School classes" : "Total classes"}</span>
            <strong>{classes.length}</strong>
            <small>
              {isTeacher
                ? "Classes in this school"
                : "Available for assignment"}
            </small>
          </article>
        </div>

        <section className="content-card">
          <div className="section-heading">
            <div>
              <h2>{isTeacher ? "My Students" : "School students"}</h2>
              <p>
                {isTeacher
                  ? "View student details for the classes assigned to you."
                  : "View student records and manage class assignments."}
              </p>
            </div>
            <div className="header-actions">
              <input
                className="table-search"
                type="search"
                placeholder={
                  isTeacher
                    ? "Search my students"
                    : "Search name or roll number"
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {isAdmin && (
                <button
                  type="button"
                  className="primary-button add-class-button"
                  onClick={() => {
                    setForm(EMPTY);
                    setEditingId(null);
                    setError("");
                    setNotice("");
                    setShowForm(true);
                  }}
                  disabled={busy}
                >
                  + Add Student
                </button>
              )}
            </div>
          </div>

          {isAdmin && showForm && (
            <form
              className="create-school-form student-form"
              onSubmit={saveStudent}
            >
              <div className="student-form-heading">
                <h3>
                  {editingId !== null ? "Edit Student" : "Add New Student"}
                </h3>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeForm}
                  disabled={busy}
                >
                  ✕ Close
                </button>
              </div>

              <label>
                First name *
                <input
                  value={form.first_name}
                  onChange={(e) => change("first_name", e.target.value)}
                  required
                  maxLength={100}
                />
              </label>
              <label>
                Middle name
                <input
                  value={form.middle_name}
                  onChange={(e) => change("middle_name", e.target.value)}
                  maxLength={100}
                />
              </label>
              <label>
                Last name *
                <input
                  value={form.last_name}
                  onChange={(e) => change("last_name", e.target.value)}
                  required
                  maxLength={100}
                />
              </label>
              <label>
                Roll number *
                <input
                  value={form.roll_number}
                  onChange={(e) => change("roll_number", e.target.value)}
                  required
                  maxLength={50}
                />
              </label>
              <label>
                Class
                <select
                  value={form.class_id}
                  onChange={(e) => change("class_id", e.target.value)}
                >
                  <option value="">Select class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.section ? ` - ${c.section}` : ""}
                      {c.academic_year ? ` (${c.academic_year})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date of birth
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => change("date_of_birth", e.target.value)}
                />
              </label>
              <label>
                Gender
                <select
                  value={form.gender}
                  onChange={(e) => change("gender", e.target.value)}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                Father name
                <input
                  value={form.father_name}
                  onChange={(e) => change("father_name", e.target.value)}
                />
              </label>
              <label>
                Mother name
                <input
                  value={form.mother_name}
                  onChange={(e) => change("mother_name", e.target.value)}
                />
              </label>
              <label>
                Guardian name
                <input
                  value={form.guardian_name}
                  onChange={(e) => change("guardian_name", e.target.value)}
                />
              </label>
              <label>
                Guardian phone
                <input
                  type="tel"
                  value={form.guardian_phone}
                  onChange={(e) => change("guardian_phone", e.target.value)}
                />
              </label>
              {editingId === null && (
                <>
                  <div className="student-form-heading">
                    <h3>Parent Account (Optional)</h3>
                  </div>
                  <p>
                    Enter the parent&apos;s details to link an existing parent
                    account by email or create a new parent account. You can
                    skip this and link a parent later.
                  </p>
                  <label>
                    Parent full name
                    <input
                      value={form.parent_full_name}
                      onChange={(e) =>
                        change("parent_full_name", e.target.value)
                      }
                      maxLength={150}
                      placeholder="Enter parent full name"
                    />
                  </label>
                  <label>
                    Parent email
                    <input
                      type="email"
                      value={form.parent_email}
                      onChange={(e) => change("parent_email", e.target.value)}
                      placeholder="Enter parent email"
                    />
                  </label>
                  <label>
                    Relationship
                    <select
                      value={form.parent_relationship_type}
                      onChange={(e) =>
                        change("parent_relationship_type", e.target.value)
                      }
                    >
                      <option value="father">Father</option>
                      <option value="mother">Mother</option>
                      <option value="guardian">Guardian</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                </>
              )}
              <label>
                Student phone
                <input
                  type="tel"
                  value={form.student_phone}
                  onChange={(e) => change("student_phone", e.target.value)}
                />
              </label>
              <label>
                Admission number
                <input
                  value={form.admission_number}
                  onChange={(e) => change("admission_number", e.target.value)}
                />
              </label>
              <label>
                Admission date
                <input
                  type="date"
                  value={form.admission_date}
                  onChange={(e) => change("admission_date", e.target.value)}
                />
              </label>
              <label>
                Address
                <input
                  value={form.address_line}
                  onChange={(e) => change("address_line", e.target.value)}
                />
              </label>
              <label>
                City
                <input
                  value={form.city}
                  onChange={(e) => change("city", e.target.value)}
                />
              </label>
              <label>
                State
                <input
                  value={form.state}
                  onChange={(e) => change("state", e.target.value)}
                />
              </label>
              <label>
                Postal code
                <input
                  value={form.postal_code}
                  onChange={(e) => change("postal_code", e.target.value)}
                />
              </label>

              <div className="form-actions student-form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeForm}
                  disabled={busy}
                >
                  ← Back to Students
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={busy}
                >
                  {busy
                    ? "Saving..."
                    : editingId !== null
                      ? "Update Student"
                      : "Create Student"}
                </button>
              </div>
            </form>
          )}

          <div className="table-toolbar">
            <span>
              {filtered.length} of {students.length}{" "}
              {isTeacher ? "assigned students" : "students"}
            </span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll number</th>
                  <th>Student name</th>
                  <th>Class</th>
                  <th>Parent / Guardian</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.roll_number}</strong>
                    </td>
                    <td>
                      {[s.first_name, s.middle_name, s.last_name]
                        .filter(Boolean)
                        .join(" ")}
                    </td>
                    <td>{className(s.class_id)}</td>
                    <td>
                      {s.guardian_name || s.father_name || s.mother_name || "—"}
                    </td>
                    {isAdmin && (
                      <td>
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => editStudent(s)}
                          disabled={busy}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => removeStudent(s)}
                          disabled={busy}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} className="empty-state">
                      {search
                        ? "No students match your search."
                        : isTeacher
                          ? "You do not have any students in your assigned classes yet."
                          : "No students found. Add your first student."}
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

function StudentsPageContent() {
  const params = useParams<{ schoolCode: string }>();
  const schoolCode = (params.schoolCode || "").trim().toUpperCase();

  return (
    <AuthGuard allowedRoles={["school_admin", "teacher"]}>
      <StudentsContent schoolCode={schoolCode} />
    </AuthGuard>
  );
}

export default function StudentsPage() {
  return (
    <Suspense
      fallback={<main className="dashboard-loading">Loading students...</main>}
    >
      <StudentsPageContent />
    </Suspense>
  );
}
