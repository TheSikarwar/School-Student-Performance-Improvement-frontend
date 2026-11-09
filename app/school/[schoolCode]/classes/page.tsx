"use client";

import {
  useCallback,
  useEffect,
  useState,
  Suspense,
  type FormEvent,
} from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Sidebar from "../../../components/layout/Sidebar";

import AuthGuard from "../../../components/auth/AuthGuard";
import { apiRequest } from "../../../lib/api";
import Loading from "@/app/components/common/Loading";

type SchoolClass = {
  id: number;
  name: string;
  section: string;
  academic_year: string;
  created_at?: string | null;
};

type UserRole =
  | "superadmin"
  | "school_admin"
  | "teacher"
  | "parent"
  | "student";

type ClassesResponse = {
  school_code: string;
  total: number;
  classes: SchoolClass[];
};

type ClassPayload = {
  name: string;
  section: string;
  academic_year: string;
};

type Subject = {
  id: number;
  name: string;
  code: string;
};

type SubjectsResponse = {
  total: number;
  subjects: Subject[];
};

type ClassSubjectMapping = {
  id: number;
  class_id: number;
  subject_id: number;
  class_name: string;
  section: string;
  subject_name: string;
  subject_code: string;
};

type ClassSubjectsResponse = {
  total: number;
  class_subjects: ClassSubjectMapping[];
};

function ClassesContent({ schoolCode }: { schoolCode: string }) {
  // const router = useRouter();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingClassId, setEditingClassId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [academicYear, setAcademicYear] = useState("2026-2027");

  const [userName, setUserName] = useState("School Administrator");
  // const [userRole, setUserRole] = useState("school_admin");
  const [userRole, setUserRole] = useState<UserRole>("school_admin");

  const [showSubjectsModal, setShowSubjectsModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [classSubjectMappings, setClassSubjectMappings] = useState<
    ClassSubjectMapping[]
  >([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsSaving, setSubjectsSaving] = useState(false);

  const loadClasses = useCallback(async () => {
    const result = await apiRequest<ClassesResponse>(
      `/schools/${encodeURIComponent(schoolCode)}/classes/`,
      { cache: "no-store" },
    );

    setClasses(result.classes || []);
  }, [schoolCode]);

  useEffect(() => {
    let cancelled = false;

    async function initializePage() {
      try {
        // Defer localStorage synchronization until after the effect starts.
        await Promise.resolve();

        if (cancelled) return;

        try {
          const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

          if (!cancelled) {
            if (storedUser.full_name) {
              setUserName(storedUser.full_name);
            }

            if (storedUser.role) {
              setUserRole(storedUser.role);
            }
          }
        } catch {
          // AuthGuard handles invalid sessions.
        }

        await loadClasses();
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load classes.",
          );
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
  }, [loadClasses]);

  function resetForm() {
    setShowForm(false);
    setEditingClassId(null);
    setName("");
    setSection("");
    setAcademicYear("2026-2027");
  }

  function openEditForm(item: SchoolClass) {
    setEditingClassId(item.id);
    setName(item.name);
    setSection(item.section);
    setAcademicYear(item.academic_year);
    setShowForm(true);
    setError("");
    setNotice("");
  }

  async function saveClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: ClassPayload = {
      name: name.trim(),
      section: section.trim(),
      academic_year: academicYear.trim(),
    };

    setBusy(true);
    setError("");
    setNotice("");

    const baseUrl = `/schools/${encodeURIComponent(schoolCode)}/classes/`;

    try {
      if (editingClassId !== null) {
        await apiRequest(`${baseUrl}${editingClassId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setNotice("Class updated successfully.");
      } else {
        await apiRequest(baseUrl, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setNotice("Class created successfully.");
      }

      resetForm();
      await loadClasses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save class.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteClass(classId: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this class?",
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await apiRequest(
        `/schools/${encodeURIComponent(schoolCode)}/classes/${classId}`,
        { method: "DELETE" },
      );

      await loadClasses();
      setNotice("Class deleted successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete class.");
    } finally {
      setBusy(false);
    }
  }

  async function refreshClasses() {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      await loadClasses();
      setNotice("Classes refreshed successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to refresh classes.",
      );
    } finally {
      setBusy(false);
    }
  }

  const isSchoolAdmin = userRole === "school_admin";

  async function openManageSubjects(item: SchoolClass) {
    setSelectedClass(item);
    setShowSubjectsModal(true);
    setSubjectsLoading(true);
    setError("");
    setNotice("");

    try {
      const [subjectsResult, mappingsResult] = await Promise.all([
        apiRequest<SubjectsResponse>(
          `/schools/${encodeURIComponent(schoolCode)}/subjects/`,
          { cache: "no-store" },
        ),
        apiRequest<ClassSubjectsResponse>(
          `/schools/${encodeURIComponent(schoolCode)}/class-subjects/`,
          { cache: "no-store" },
        ),
      ]);

      const availableSubjects = subjectsResult.subjects || [];
      const mappings = (mappingsResult.class_subjects || []).filter(
        (mapping) => mapping.class_id === item.id,
      );

      setSubjects(availableSubjects);
      setClassSubjectMappings(mappings);
      setSelectedSubjectIds(mappings.map((mapping) => mapping.subject_id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load class subjects.",
      );
    } finally {
      setSubjectsLoading(false);
    }
  }

  function toggleSubject(subjectId: number) {
    setSelectedSubjectIds((previous) =>
      previous.includes(subjectId)
        ? previous.filter((id) => id !== subjectId)
        : [...previous, subjectId],
    );
  }

  async function saveClassSubjects() {
    if (!selectedClass) return;

    setSubjectsSaving(true);
    setError("");
    setNotice("");

    try {
      const existingSubjectIds = classSubjectMappings.map(
        (mapping) => mapping.subject_id,
      );

      // Find newly selected subjects.
      const subjectsToAdd = selectedSubjectIds.filter(
        (subjectId) => !existingSubjectIds.includes(subjectId),
      );

      // Find existing mappings that were unchecked.
      const mappingsToRemove = classSubjectMappings.filter(
        (mapping) => !selectedSubjectIds.includes(mapping.subject_id),
      );

      // Add all new subjects in one API request.
      if (subjectsToAdd.length > 0) {
        await apiRequest(
          `/schools/${encodeURIComponent(schoolCode)}/class-subjects/bulk`,
          {
            method: "POST",
            body: JSON.stringify({
              class_id: selectedClass.id,
              subject_ids: subjectsToAdd,
            }),
          },
        );
      }

      // Delete removed mappings using their mapping IDs.
      for (const mapping of mappingsToRemove) {
        await apiRequest(
          `/schools/${encodeURIComponent(schoolCode)}/class-subjects/${mapping.id}`,
          {
            method: "DELETE",
          },
        );
      }

      setShowSubjectsModal(false);
      setSelectedClass(null);
      setSelectedSubjectIds([]);
      setClassSubjectMappings([]);

      setNotice("Class subjects updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update class subjects.",
      );
    } finally {
      setSubjectsSaving(false);
    }
  }

  if (loading) {
    return <Loading message="Please wait, preparing your EduRise workspace..." />;
  }

  return (
    <main className="dashboard-shell">
      <Sidebar role={userRole} schoolCode={schoolCode} fullName={userName} />

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="dashboard-overline">
              EDURISE / SCHOOL / CLASSES
            </span>

            <h1>Class Management</h1>

            <p>Manage classes and sections for school {schoolCode}.</p>
          </div>

          <div className="header-actions">
            <span className="role-chip">{userRole.replace("_", " ")}</span>

            <button
              className="secondary-button"
              onClick={refreshClasses}
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
            <span>Total classes</span>
            <strong>{classes.length}</strong>
            <small>Registered in your school</small>
          </article>

          <article className="stat-card">
            <span>School code</span>
            <strong className="stat-code">{schoolCode}</strong>
            {/* <small>Current tenant</small> */}
          </article>

          <article className="stat-card">
            <span>Access level</span>
            <strong className="stat-role">
              {isSchoolAdmin ? "Management" : "Read only"}
            </strong>
            <small>Based on your account role</small>
          </article>
        </div>

        <section className="content-card">
          <div className="section-heading">
            <div>
              <h2>School classes</h2>
              <p>View and manage classes registered in your school.</p>
            </div>

            {isSchoolAdmin && (
              <button
                type="button"
                className="primary-button add-class-button"
                onClick={() => {
                  if (showForm) {
                    resetForm();
                    return;
                  }

                  resetForm();
                  setShowForm(true);
                  setError("");
                  setNotice("");
                }}
                disabled={busy}
              >
                {showForm ? "✕ Close" : "+ Add Class"}
              </button>
            )}
          </div>

          {isSchoolAdmin && showForm && (
            <form className="create-school-form" onSubmit={saveClass}>
              <h3>
                {editingClassId !== null ? "Edit Class" : "Create New Class"}
              </h3>

              <label>
                Class name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Class 5"
                  maxLength={50}
                  required
                />
              </label>

              <label>
                Section
                <input
                  value={section}
                  onChange={(event) => setSection(event.target.value)}
                  placeholder="e.g. A"
                  maxLength={20}
                  required
                />
              </label>

              <label>
                Academic year
                <input
                  value={academicYear}
                  onChange={(event) => setAcademicYear(event.target.value)}
                  placeholder="e.g. 2026-2027"
                  maxLength={20}
                  required
                />
              </label>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={resetForm}
                  disabled={busy}
                >
                  ← Back to Classes
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={busy}
                >
                  {busy
                    ? "Saving..."
                    : editingClassId !== null
                      ? "Update Class"
                      : "Create Class"}
                </button>
              </div>
            </form>
          )}

          <div className="table-toolbar">
            <span>{classes.length} classes</span>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Section</th>
                  <th>Academic year</th>
                  {isSchoolAdmin && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {classes.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                    </td>

                    <td>{item.section}</td>

                    <td>{item.academic_year}</td>

                    {isSchoolAdmin && (
                      <td>
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => openEditForm(item)}
                          disabled={busy || subjectsSaving}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="table-action"
                          onClick={() => openManageSubjects(item)}
                          disabled={busy || subjectsLoading || subjectsSaving}
                        >
                          Manage Subjects
                        </button>

                        <button
                          type="button"
                          className="table-action"
                          onClick={() => deleteClass(item.id)}
                          disabled={busy || subjectsSaving}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}

                {classes.length === 0 && (
                  <tr>
                    <td colSpan={isSchoolAdmin ? 4 : 3} className="empty-state">
                      No classes found.
                      {isSchoolAdmin && " Create your first class."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {showSubjectsModal && selectedClass && (
            <div className="modal-overlay">
              <div
                className="content-card"
                style={{ width: "100%", maxWidth: "550px" }}
              >
                <div className="section-heading">
                  <div>
                    <h2>Manage Subjects</h2>
                    <p>
                      {selectedClass.name} - Section {selectedClass.section}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowSubjectsModal(false)}
                    disabled={subjectsSaving}
                  >
                    ✕ Close
                  </button>
                </div>

                {subjectsLoading ? (
                  <p>Loading subjects...</p>
                ) : subjects.length === 0 ? (
                  <p>No subjects found. Please create subjects first.</p>
                ) : (
                  <>
                    <p>Select subjects for this class:</p>

                    <div
                      style={{ display: "grid", gap: "12px", margin: "20px 0" }}
                    >
                      {subjects.map((subject) => (
                        <label
                          key={subject.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "12px",
                            border: "1px solid #dce5e5",
                            borderRadius: "8px",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedSubjectIds.includes(subject.id)}
                            onChange={() => toggleSubject(subject.id)}
                            disabled={subjectsSaving}
                          />

                          <span>
                            <strong>{subject.name}</strong>
                            <small
                              style={{ marginLeft: "8px", color: "#64748b" }}
                            >
                              {subject.code}
                            </small>
                          </span>
                        </label>
                      ))}
                    </div>

                    <p>{selectedSubjectIds.length} subjects selected</p>

                    <div className="form-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setShowSubjectsModal(false)}
                        disabled={subjectsSaving}
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        className="primary-button"
                        onClick={saveClassSubjects}
                        disabled={subjectsSaving || subjectsLoading}
                      >
                        {subjectsSaving ? "Saving..." : "Save Subjects"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function ClassesPageContent() {
  const params = useParams<{ schoolCode: string }>();
  const schoolCode = (params.schoolCode || "").toUpperCase();

  return (
    <AuthGuard allowedRoles={["school_admin", "teacher"]}>
      <ClassesContent schoolCode={schoolCode} />
    </AuthGuard>
  );
}

export default function ClassesPage() {
  return (
    <Suspense
      fallback={<main className="dashboard-loading">Loading classes...</main>}
    >
      <ClassesPageContent />
    </Suspense>
  );
}
