"use client";

import {
  Fragment,
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

type Teacher = {
  id: number;
  full_name: string;
  email: string;
  role: "teacher";
  is_active: boolean;
  created_at?: string | null;
};

type TeacherAssignment = {
  id: number;
  teacher_user_id: number;
  class_subject_id: number;
  class_id: number;
  class_name: string;
  section: string;
  subject_id: number;
  subject_name: string;
  is_class_teacher: boolean;
};

type TeacherAssignmentsResponse = {
  teacher: Teacher;
  total: number;
  assignments: TeacherAssignment[];
  message?: string;
};

type TeachersResponse = {
  school_code: string;
  total: number;
  users: Teacher[];
};

type AvailableClassSubject = {
  id: number;
  class_id: number;
  class_name: string;
  section: string;
  subject_id: number;
  subject_name: string;
  assigned: boolean;
  assigned_teacher: string | null;
  assigned_teacher_id: number | null;
};

type AvailableClassSubjectsResponse = {
  total: number;
  class_subjects: AvailableClassSubject[];
};

type AssignmentSelection = {
  class_subject_id: number;
  is_class_teacher: boolean;
};

type TeacherForm = {
  full_name: string;
  email: string;
  password: string;
};

const EMPTY_FORM: TeacherForm = {
  full_name: "",
  email: "",
  password: "",
};

function TeachersContent({ schoolCode }: { schoolCode: string }) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [form, setForm] = useState<TeacherForm>(EMPTY_FORM);
  const [userName, setUserName] = useState("School Administrator");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [expandedTeacherId, setExpandedTeacherId] = useState<number | null>(null);
  const [assignmentsByTeacher, setAssignmentsByTeacher] = useState<
    Record<number, TeacherAssignment[]>
  >({});
  const [assignmentLoading, setAssignmentLoading] = useState<number | null>(null);

  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [availableClassSubjects, setAvailableClassSubjects] = useState<
    AvailableClassSubject[]
  >([]);
  const [selectedAssignments, setSelectedAssignments] = useState<
    AssignmentSelection[]
  >([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [savingAssignments, setSavingAssignments] = useState(false);

  const loadTeachers = useCallback(async () => {
    const result = await apiRequest<TeachersResponse>(
      `/schools/${encodeURIComponent(schoolCode)}/teachers/`,
      { method: "GET", cache: "no-store" },
    );
    setTeachers(Array.isArray(result.users) ? result.users : []);
  }, [schoolCode]);

  const loadTeacherAssignments = async (teacherId: number) => {
    if (expandedTeacherId === teacherId) {
      setExpandedTeacherId(null);
      return;
    }

    setExpandedTeacherId(teacherId);

    if (assignmentsByTeacher[teacherId]) return;

    setAssignmentLoading(teacherId);
    setError("");

    try {
      const result = await apiRequest<TeacherAssignmentsResponse>(
        `/schools/${encodeURIComponent(schoolCode)}/teachers/${teacherId}/assignments`,
        { method: "GET", cache: "no-store" },
      );

      setAssignmentsByTeacher((current) => ({
        ...current,
        [teacherId]: result.assignments || [],
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load teacher assignments.");
      setExpandedTeacherId(null);
    } finally {
      setAssignmentLoading(null);
    }
  };

  async function openAssignmentEditor(teacher: Teacher) {
    setEditingTeacher(teacher);
    setError("");
    setNotice("");
    setLoadingOptions(true);
    setSelectedAssignments([]);

    try {
      const [availableResult, assignedResult] = await Promise.all([
        apiRequest<AvailableClassSubjectsResponse>(
          `/schools/${encodeURIComponent(schoolCode)}/teachers/available-class-subjects/`,
          { method: "GET", cache: "no-store" },
        ),
        apiRequest<TeacherAssignmentsResponse>(
          `/schools/${encodeURIComponent(schoolCode)}/teachers/${teacher.id}/assignments`,
          { method: "GET", cache: "no-store" },
        ),
      ]);

      setAvailableClassSubjects(availableResult.class_subjects || []);
      setSelectedAssignments(
        (assignedResult.assignments || []).map((assignment) => ({
          class_subject_id: assignment.class_subject_id,
          is_class_teacher: assignment.is_class_teacher,
        })),
      );

      setAssignmentsByTeacher((current) => ({
        ...current,
        [teacher.id]: assignedResult.assignments || [],
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load assignment options.");
      setEditingTeacher(null);
    } finally {
      setLoadingOptions(false);
    }
  }

  function toggleSubjectAssignment(classSubjectId: number, checked: boolean) {
    setSelectedAssignments((current) => {
      if (checked) {
        if (current.some((item) => item.class_subject_id === classSubjectId)) {
          return current;
        }
        return [
          ...current,
          { class_subject_id: classSubjectId, is_class_teacher: false },
        ];
      }

      return current.filter((item) => item.class_subject_id !== classSubjectId);
    });
  }

  function toggleClassTeacher(classSubjectId: number, checked: boolean) {
    const selectedSubject = availableClassSubjects.find(
      (item) => item.id === classSubjectId,
    );
    if (!selectedSubject) return;

    // The class-teacher flag belongs to one subject assignment in that class.
    // Clear the flag from other selected subjects in the same class.
    setSelectedAssignments((current) =>
      current.map((item) => {
        const subject = availableClassSubjects.find(
          (option) => option.id === item.class_subject_id,
        );

        if (subject?.class_id !== selectedSubject.class_id) return item;

        return {
          ...item,
          is_class_teacher: checked
            ? item.class_subject_id === classSubjectId
            : false,
        };
      }),
    );
  }

  async function saveTeacherAssignments() {
    if (!editingTeacher) return;

    // A teacher can only be marked as class teacher after selecting at least
    // one subject in that class. The backend checks conflicts with other teachers.
    setSavingAssignments(true);
    setError("");
    setNotice("");

    try {
      const result = await apiRequest<TeacherAssignmentsResponse>(
        `/schools/${encodeURIComponent(schoolCode)}/teachers/${editingTeacher.id}/assignments`,
        {
          method: "PUT",
          body: JSON.stringify({ assignments: selectedAssignments }),
        },
      );

      const saved = result.assignments || [];
      setAssignmentsByTeacher((current) => ({
        ...current,
        [editingTeacher.id]: saved,
      }));
      setExpandedTeacherId(editingTeacher.id);
      setEditingTeacher(null);
      setNotice(result.message || "Teacher assignments saved successfully.");

      // Refresh all assignment availability so the next editor has current data.
      const availableResult =
        await apiRequest<AvailableClassSubjectsResponse>(
          `/schools/${encodeURIComponent(schoolCode)}/teachers/available-class-subjects/`,
          { method: "GET", cache: "no-store" },
        );
      setAvailableClassSubjects(availableResult.class_subjects || []);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to save teacher assignments. Please try again.",
      );
    } finally {
      setSavingAssignments(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initializePage() {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (user.full_name && !cancelled) setUserName(user.full_name);
      } catch {
        // AuthGuard handles invalid sessions.
      }

      try {
        await loadTeachers();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unable to load teachers.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initializePage();
    return () => {
      cancelled = true;
    };
  }, [loadTeachers]);

  const filteredTeachers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return teachers;

    return teachers.filter(
      (teacher) =>
        teacher.full_name.toLowerCase().includes(query) ||
        teacher.email.toLowerCase().includes(query),
    );
  }, [teachers, search]);

  const unassignedCount = teachers.filter(
    (teacher) =>
      assignmentsByTeacher[teacher.id] !== undefined &&
      assignmentsByTeacher[teacher.id].length === 0,
  ).length;

  function change<K extends keyof TeacherForm>(key: K, value: TeacherForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function closeForm() {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setError("");
  }

  async function createTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const result = await apiRequest<{ message?: string }>(
        `/schools/${encodeURIComponent(schoolCode)}/teachers/`,
        {
          method: "POST",
          body: JSON.stringify({
            full_name: form.full_name.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
          }),
        },
      );

      await loadTeachers();
      setNotice(result.message || "Teacher created successfully.");
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create teacher.");
    } finally {
      setSaving(false);
    }
  }

  async function refreshTeachers() {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      await loadTeachers();
      // Refresh cached assignment lists as well.
      const refreshed: Record<number, TeacherAssignment[]> = {};
      await Promise.all(
        teachers.map(async (teacher) => {
          try {
            const result = await apiRequest<TeacherAssignmentsResponse>(
              `/schools/${encodeURIComponent(schoolCode)}/teachers/${teacher.id}/assignments`,
              { method: "GET", cache: "no-store" },
            );
            refreshed[teacher.id] = result.assignments || [];
          } catch {
            // Keep the teacher list usable if one assignment request fails.
          }
        }),
      );
      setAssignmentsByTeacher((current) => ({ ...current, ...refreshed }));
      setNotice("Teacher list refreshed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to refresh teachers.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dashboard-shell">
      <Sidebar role="school_admin" schoolCode={schoolCode} fullName={userName} />

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="dashboard-overline">EDURISE / SCHOOL / TEACHERS</span>
            <h1>Teacher Management</h1>
            <p>Create and manage teacher accounts for {schoolCode}.</p>
          </div>

          <div className="header-actions">
            <span className="role-chip">School Admin</span>
            <button
              type="button"
              className="secondary-button"
              onClick={refreshTeachers}
              disabled={loading || saving || savingAssignments}
            >
              {loading ? "Loading..." : "↻ Refresh"}
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setError("");
                setNotice("");
                setForm(EMPTY_FORM);
                setShowForm(true);
              }}
              disabled={saving}
            >
              + Add Teacher
            </button>
          </div>
        </header>

        {error && <div className="dashboard-alert error" role="alert">{error}</div>}
        {notice && <div className="dashboard-alert success" role="status">{notice}</div>}

        <div className="stat-grid">
          <article className="stat-card">
            <span>School</span>
            <strong className="stat-code">{schoolCode}</strong>
            <small>Current school</small>
          </article>
          <article className="stat-card">
            <span>Total teachers</span>
            <strong className="stat-role">{teachers.length}</strong>
            <small>Registered teacher accounts</small>
          </article>
          <article className="stat-card">
            <span>Active teachers</span>
            <strong className="stat-role">
              {teachers.filter((teacher) => teacher.is_active).length}
            </strong>
            <small>Accounts currently enabled</small>
          </article>
        </div>

        {showForm && (
          <section className="content-card">
            <form className="create-school-form" onSubmit={createTeacher}>
              <div className="student-form-heading">
                <h2>Create Teacher Account</h2>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  ✕ Close
                </button>
              </div>

              <p>Enter the teacher&apos;s details and set an initial password.</p>

              <label>
                Full name *
                <input
                  value={form.full_name}
                  onChange={(event) => change("full_name", event.target.value)}
                  placeholder="Enter teacher full name"
                  maxLength={150}
                  autoComplete="name"
                  required
                />
              </label>

              <label>
                Email address *
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => change("email", event.target.value)}
                  placeholder="teacher@example.com"
                  maxLength={255}
                  autoComplete="email"
                  required
                />
              </label>

              <label>
                Initial password *
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => change("password", event.target.value)}
                  placeholder="At least 8 characters"
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
              </label>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? "Creating..." : "Create Teacher"}
                </button>
              </div>
            </form>
          </section>
        )}

        {editingTeacher && (
          <section className="content-card">
            <div className="section-heading">
              <div>
                <h2>Assign Classes &amp; Subjects</h2>
                <p>Select the subjects taught by {editingTeacher.full_name}.</p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setEditingTeacher(null)}
                disabled={savingAssignments}
              >
                Close
              </button>
            </div>

            {loadingOptions ? (
              <div className="empty-state">Loading classes and subjects...</div>
            ) : availableClassSubjects.length === 0 ? (
              <div className="empty-state">
                No class-subject combinations found. Create classes and assign
                subjects to them first.
              </div>
            ) : (
              <>
                {Object.entries(
                  availableClassSubjects.reduce<
                    Record<string, AvailableClassSubject[]>
                  >((groups, subject) => {
                    const key = `${subject.class_name} - ${subject.section}`;
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(subject);
                    return groups;
                  }, {}),
                ).map(([className, subjects]) => (
                  <div className="teacher-assignment-panel" key={className}>
                    <h3>{className}</h3>
                    {subjects.map((subject) => {
                      const selected = selectedAssignments.find(
                        (item) => item.class_subject_id === subject.id,
                      );

                      return (
                        <div className="assignment-option" key={subject.id}>
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={Boolean(selected)}
                              onChange={(event) =>
                                toggleSubjectAssignment(
                                  subject.id,
                                  event.target.checked,
                                )
                              }
                            />
                            <span>{subject.subject_name}</span>
                          </label>

                          {selected && (
                            <label className="checkbox-label class-teacher-option">
                              <input
                                type="checkbox"
                                checked={selected.is_class_teacher}
                                onChange={(event) =>
                                  toggleClassTeacher(
                                    subject.id,
                                    event.target.checked,
                                  )
                                }
                              />
                              <span>Class Teacher</span>
                            </label>
                          )}

                          {subject.assigned &&
                            subject.assigned_teacher_id !== editingTeacher.id && (
                              <small className="assignment-hint">
                                Also assigned to: {subject.assigned_teacher}
                              </small>
                            )}
                        </div>
                      );
                    })}
                  </div>
                ))}

                <div className="form-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setEditingTeacher(null)}
                    disabled={savingAssignments}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={saveTeacherAssignments}
                    disabled={savingAssignments}
                  >
                    {savingAssignments ? "Saving..." : "Save Assignments"}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        <section className="content-card">
          <div className="section-heading">
            <div>
              <h2>Teacher accounts</h2>
              <p>View teachers and manage their class-subject assignments.</p>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={refreshTeachers}
              disabled={loading || savingAssignments}
            >
              {loading ? "Loading..." : "↻ Refresh"}
            </button>
          </div>

          <div className="teacher-search">
            <input
              type="search"
              placeholder="Search by teacher name or email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search teachers"
            />
          </div>

          {loading ? (
            <div className="empty-state">Loading teachers...</div>
          ) : filteredTeachers.length === 0 ? (
            <div className="empty-state">
              {teachers.length === 0
                ? "No teachers found. Create your first teacher account using Add Teacher."
                : "No teachers match your search."}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Assignment</th>
                    <th>Actions</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.map((teacher) => {
                    const isExpanded = expandedTeacherId === teacher.id;
                    const assignments = assignmentsByTeacher[teacher.id];
                    const hasAssignments = assignments && assignments.length > 0;

                    return (
                      <Fragment key={teacher.id}>
                        <tr>
                          <td><strong>{teacher.full_name}</strong></td>
                          <td>{teacher.email}</td>
                          <td>
                            <span className={`status-badge ${teacher.is_active ? "active" : "inactive"}`}>
                              {teacher.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>
                            {assignments === undefined ? (
                              <span className="status-badge">Not checked</span>
                            ) : hasAssignments ? (
                              <span className="status-badge active">
                                {assignments.length} subject(s)
                              </span>
                            ) : (
                              <span className="status-badge inactive">Unassigned</span>
                            )}
                          </td>
                          <td>
                            <div className="header-actions">
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => openAssignmentEditor(teacher)}
                                disabled={!teacher.is_active || loadingOptions || savingAssignments}
                              >
                                {hasAssignments ? "Edit Assignments" : "Assign Classes"}
                              </button>
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => loadTeacherAssignments(teacher.id)}
                                disabled={assignmentLoading === teacher.id}
                              >
                                {assignmentLoading === teacher.id
                                  ? "Loading..."
                                  : isExpanded
                                    ? "Hide"
                                    : "View"}
                              </button>
                            </div>
                          </td>
                          <td>
                            {teacher.created_at
                              ? new Date(teacher.created_at).toLocaleDateString()
                              : "—"}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={6}>
                              <div className="teacher-assignment-panel">
                                <h3>Assigned Classes — {teacher.full_name}</h3>
                                {assignmentLoading === teacher.id ? (
                                  <p>Loading assignments...</p>
                                ) : !assignments || assignments.length === 0 ? (
                                  <p>No classes or subjects assigned to this teacher yet.</p>
                                ) : (
                                  <div className="table-responsive">
                                    <table className="data-table">
                                      <thead>
                                        <tr>
                                          <th>Class</th>
                                          <th>Section</th>
                                          <th>Subject</th>
                                          <th>Assignment</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {assignments.map((assignment) => (
                                          <tr key={assignment.id}>
                                            <td>{assignment.class_name}</td>
                                            <td>{assignment.section}</td>
                                            <td>{assignment.subject_name}</td>
                                            <td>
                                              {assignment.is_class_teacher
                                                ? "Class Teacher"
                                                : "Subject Teacher"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && (
            <div className="table-footer">
              Showing {filteredTeachers.length} of {teachers.length} teachers
              {unassignedCount > 0 &&
                ` · ${unassignedCount} unassigned teacher(s) checked`}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function TeachersPageContent() {
  const params = useParams<{ schoolCode: string }>();
  const schoolCode = (params.schoolCode || "").trim().toUpperCase();

  return (
    <AuthGuard allowedRoles={["school_admin"]}>
      <TeachersContent schoolCode={schoolCode} />
    </AuthGuard>
  );
}

export default function TeachersPage() {
  return (
    <Suspense fallback={<main className="dashboard-loading">Loading teachers...</main>}>
      <TeachersPageContent />
    </Suspense>
  );
}
