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

type SchoolClass = {
  id: number;
  name: string;
  section: string;
  academic_year: string;
};

type SubjectMapping = {
  id: number;
  class_id: number;
  subject_id: number;
  class_name: string;
  section: string;
  subject_name: string;
  subject_code?: string;
};

type Teacher = {
  id: number;
  full_name: string;
  email: string;
  is_active: boolean;
};

type TeacherAssignment = {
  class_subject_id: number;
  is_class_teacher: boolean;
};

type SchoolPeriod = {
  id: number;
  period_number: number;
  name: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
};

type TimetableEntry = {
  id: number;
  class_id: number;
  class_name: string;
  section: string;
  class_subject_id: number;
  subject_id: number;
  subject_name: string;
  teacher_user_id: number;
  teacher_name: string;
  period_id: number;
  period_number: number;
  period_name: string;
  start_time: string;
  end_time: string;
  day_of_week: string;
};

type TimetableForm = {
  class_id: string;
  class_subject_id: string;
  teacher_user_id: string;
  period_id: string;
};

type PeriodForm = {
  period_number: string;
  name: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
};

type ApiResponse<T> = {
  total?: number;
  assignment_summary?: { classes: number; subjects: number };
  classes?: T[];
  users?: T[];
  class_subjects?: T[];
  periods?: T[];
  timetable?: T[];
  assignments?: T[];
  message?: string;
};

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const EMPTY_TIMETABLE_FORM: TimetableForm = {
  class_id: "",
  class_subject_id: "",
  teacher_user_id: "",
  period_id: "",
};

const EMPTY_PERIOD_FORM: PeriodForm = {
  period_number: "",
  name: "",
  start_time: "09:00",
  end_time: "09:45",
  is_break: false,
};

function TimetableContent({ schoolCode }: { schoolCode: string }) {
  const base = `/schools/${encodeURIComponent(schoolCode)}`;

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [mappings, setMappings] = useState<SubjectMapping[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [periods, setPeriods] = useState<SchoolPeriod[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [assignmentSummary, setAssignmentSummary] = useState({
    classes: 0,
    subjects: 0,
  });
  const [teacherAssignments, setTeacherAssignments] = useState<
    Record<number, TeacherAssignment[]>
  >({});

  const [form, setForm] = useState<TimetableForm>(EMPTY_TIMETABLE_FORM);
  // Admin selects the teacher first. Class and subject options are then
  // restricted to that teacher's saved TeacherAssignment records.
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [periodForm, setPeriodForm] = useState<PeriodForm>(EMPTY_PERIOD_FORM);

  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editingPeriodId, setEditingPeriodId] = useState<number | null>(null);

  const [selectedDay, setSelectedDay] = useState("Monday");
  const [filterClassId, setFilterClassId] = useState("");
  const [viewMode, setViewMode] = useState<"class" | "teacher">("class");

  const [userName, setUserName] = useState("School Administrator");
  const [userRole, setUserRole] = useState("school_admin");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const timetableUrl = `${base}/timetable/`;
  const periodsUrl = `${base}/periods/`;

  const loadData = useCallback(async () => {
    // Teachers must only request their own timetable. The backend derives the
    // teacher ID from the verified JWT; no teacher ID is accepted from the UI.
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (currentUser.role === "teacher") {
      const result = await apiRequest<ApiResponse<TimetableEntry>>(
        `${timetableUrl}my`,
        { cache: "no-store" },
      );
      setEntries(result.timetable || []);
      setAssignmentSummary(
        result.assignment_summary || { classes: 0, subjects: 0 },
      );
      setClasses([]);
      setMappings([]);
      setTeachers([]);
      setPeriods([]);
      setTeacherAssignments({});
      return;
    }

    const [
      classResult,
      subjectResult,
      teacherResult,
      periodResult,
      timetableResult,
    ] = await Promise.all([
      apiRequest<ApiResponse<SchoolClass>>(`${base}/classes/`, {
        cache: "no-store",
      }),
      apiRequest<ApiResponse<SubjectMapping>>(`${base}/class-subjects/`, {
        cache: "no-store",
      }),
      apiRequest<ApiResponse<Teacher>>(`${base}/teachers/`, {
        cache: "no-store",
      }),
      apiRequest<ApiResponse<SchoolPeriod>>(periodsUrl, { cache: "no-store" }),
      apiRequest<ApiResponse<TimetableEntry>>(timetableUrl, {
        cache: "no-store",
      }),
    ]);

    const classList = classResult.classes || [];
    const teacherList = teacherResult.users || [];

    setClasses(classList);
    setMappings(subjectResult.class_subjects || []);
    setTeachers(teacherList);
    setPeriods(periodResult.periods || []);
    setEntries(timetableResult.timetable || []);

    // Load each teacher's subject assignments.
    const assignmentResults = await Promise.all(
      teacherList.map(async (teacher) => {
        const result = await apiRequest<ApiResponse<TeacherAssignment>>(
          `${base}/teachers/${teacher.id}/assignments`,
          { cache: "no-store" },
        );

        return {
          teacherId: teacher.id,
          assignments: result.assignments || [],
        };
      }),
    );

    const assignmentMap: Record<number, TeacherAssignment[]> = {};

    assignmentResults.forEach((item) => {
      assignmentMap[item.teacherId] = item.assignments;
    });

    setTeacherAssignments(assignmentMap);
  }, [base, periodsUrl, timetableUrl]);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");

        if (user.full_name && !cancelled) {
          setUserName(user.full_name);
        }
        if (user.role && !cancelled) {
          setUserRole(user.role);
        }

        await loadData();
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load timetable data.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const selectedTeacherAssignments = useMemo(
    () =>
      selectedTeacherId
        ? teacherAssignments[Number(selectedTeacherId)] || []
        : [],
    [teacherAssignments, selectedTeacherId],
  );

  const selectedTeacherMappingIds = useMemo(
    () =>
      new Set(
        selectedTeacherAssignments.map(
          (assignment) => assignment.class_subject_id,
        ),
      ),
    [selectedTeacherAssignments],
  );

  const availableClassesForSelectedTeacher = useMemo(() => {
    if (!selectedTeacherId) return [];

    const assignedClassIds = new Set(
      mappings
        .filter((mapping) => selectedTeacherMappingIds.has(mapping.id))
        .map((mapping) => mapping.class_id),
    );

    return classes.filter((schoolClass) =>
      assignedClassIds.has(schoolClass.id),
    );
  }, [classes, mappings, selectedTeacherId, selectedTeacherMappingIds]);

  const selectedMappings = useMemo(
    () =>
      mappings.filter(
        (mapping) =>
          mapping.class_id === Number(form.class_id) &&
          selectedTeacherMappingIds.has(mapping.id),
      ),
    [mappings, form.class_id, selectedTeacherMappingIds],
  );

  const selectedTeacherIsClassTeacher = selectedTeacherAssignments.some(
    (assignment) =>
      assignment.class_subject_id === Number(form.class_subject_id) &&
      assignment.is_class_teacher,
  );

  // const filteredEntries = useMemo(() => {
  //   return entries
  //     .filter((entry) => entry.day_of_week === selectedDay)
  //     .filter(
  //       (entry) =>
  //         !filterClassId ||
  //         entry.class_id === Number(filterClassId),
  //     )
  //     .sort((a, b) => a.period_number - b.period_number);
  // }, [entries, selectedDay, filterClassId]);

  const filteredEntries = useMemo(() => {
    return entries
      .filter((entry) => entry.day_of_week === selectedDay)
      .filter((entry) => {
        if (!filterClassId) return true;

        if (viewMode === "class") {
          return entry.class_id === Number(filterClassId);
        }

        return entry.teacher_user_id === Number(filterClassId);
      })
      .sort((a, b) => a.period_number - b.period_number);
  }, [entries, selectedDay, filterClassId, viewMode]);

  function updateForm<K extends keyof TimetableForm>(
    key: K,
    value: TimetableForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetTimetableForm() {
    setForm(EMPTY_TIMETABLE_FORM);
    setSelectedTeacherId("");
    setEditingEntryId(null);
  }

  function editEntry(entry: TimetableEntry) {
    setEditingEntryId(entry.id);
    setSelectedTeacherId(String(entry.teacher_user_id));
    setForm({
      class_id: String(entry.class_id),
      class_subject_id: String(entry.class_subject_id),
      teacher_user_id: String(entry.teacher_user_id),
      period_id: String(entry.period_id),
    });

    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveTimetable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !selectedTeacherId ||
      !form.class_id ||
      !form.class_subject_id ||
      !form.teacher_user_id ||
      !form.period_id
    ) {
      setError("Please complete all timetable fields.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      class_id: Number(form.class_id),
      class_subject_id: Number(form.class_subject_id),
      teacher_user_id: Number(form.teacher_user_id),
      period_id: Number(form.period_id),
    };

    try {
      if (editingEntryId) {
        await apiRequest(`${timetableUrl}${editingEntryId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setNotice("Timetable entry updated successfully.");
      } else {
        await apiRequest(timetableUrl, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setNotice("Timetable entry created successfully.");
      }

      resetTimetableForm();
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save timetable entry.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(entryId: number) {
    if (!window.confirm("Delete this timetable entry?")) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await apiRequest(`${timetableUrl}${entryId}`, {
        method: "DELETE",
      });

      await loadData();
      setNotice("Timetable entry deleted successfully.");

      if (editingEntryId === entryId) resetTimetableForm();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete timetable entry.",
      );
    } finally {
      setSaving(false);
    }
  }

  function updatePeriodForm<K extends keyof PeriodForm>(
    key: K,
    value: PeriodForm[K],
  ) {
    setPeriodForm((current) => ({ ...current, [key]: value }));
  }

  function editPeriod(period: SchoolPeriod) {
    setEditingPeriodId(period.id);
    setPeriodForm({
      period_number: String(period.period_number),
      name: period.name,
      start_time: period.start_time,
      end_time: period.end_time,
      is_break: period.is_break,
    });
  }

  function resetPeriodForm() {
    setEditingPeriodId(null);
    setPeriodForm(EMPTY_PERIOD_FORM);
  }

  async function savePeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      period_number: Number(periodForm.period_number),
      name: periodForm.name.trim(),
      start_time: periodForm.start_time,
      end_time: periodForm.end_time,
      is_break: periodForm.is_break,
    };

    try {
      if (editingPeriodId) {
        await apiRequest(`${periodsUrl}${editingPeriodId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setNotice("School period updated successfully.");
      } else {
        await apiRequest(periodsUrl, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setNotice("School period created successfully.");
      }

      resetPeriodForm();
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save school period.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deletePeriod(periodId: number) {
    if (!window.confirm("Delete this school period?")) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await apiRequest(`${periodsUrl}${periodId}`, {
        method: "DELETE",
      });

      await loadData();
      setNotice("School period deleted successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete school period.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Loading message="Please wait, preparing your EduRise workspace..." />;
  }

  if (userRole === "teacher") {
    // Build the class filter from this teacher's own timetable response.
    // This keeps the dropdown limited to classes in which the teacher has
    // scheduled lessons and avoids requesting school-wide class data.
    const teacherClasses = Array.from(
      new Map(
        entries.map((entry) => [
          entry.class_id,
          {
            id: entry.class_id,
            name: entry.class_name,
            section: entry.section,
          },
        ]),
      ).values(),
    ).sort((a, b) =>
      `${a.name} ${a.section}`.localeCompare(`${b.name} ${b.section}`),
    );

    const teacherDayEntries = entries
      .filter((entry) => entry.day_of_week === selectedDay)
      .filter(
        (entry) =>
          !filterClassId || entry.class_id === Number(filterClassId),
      )
      .sort((a, b) => a.period_number - b.period_number);

    return (
      <main className="dashboard-shell">
        <Sidebar role="teacher" schoolCode={schoolCode} fullName={userName} />
        <section className="dashboard-main">
          <header className="dashboard-header">
            <div>
              <span className="dashboard-overline">
                EDURISE / TEACHER / TIMETABLE
              </span>
              <h1>My Weekly Timetable</h1>
              <p>View your scheduled classes, subjects and teaching periods.</p>
            </div>
            <div className="header-actions">
              <span className="role-chip">Teacher</span>
              <button
                type="button"
                className="secondary-button"
                disabled={saving}
                onClick={() => {
                  setLoading(true);
                  loadData()
                    .catch((err) =>
                      setError(
                        err instanceof Error
                          ? err.message
                          : "Unable to refresh timetable.",
                      ),
                    )
                    .finally(() => setLoading(false));
                }}
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
          <div className="stat-grid">
            <article className="stat-card">
              <span>Total scheduled periods</span>
              <strong>{entries.length}</strong>
              <small>Monday to Saturday</small>
            </article>
            <article className="stat-card">
              <span>Classes assigned</span>
              <strong>{assignmentSummary.classes}</strong>
              <small>From teacher assignments</small>
            </article>
            <article className="stat-card">
              <span>Subjects assigned</span>
              <strong>{assignmentSummary.subjects}</strong>
              <small>From teacher assignments</small>
            </article>
          </div>

          <section className="content-card">
            <div className="section-heading">
              <div>
                <h2>Weekly schedule</h2>
                <p>
                  Only periods scheduled for your teacher account are shown.
                </p>
              </div>
            </div>
            {assignmentSummary.classes >
              new Set(entries.map((entry) => entry.class_id)).size && (
              <div className="dashboard-alert" role="status">
                You have teaching assignments in {assignmentSummary.classes}{" "}
                classes, but timetable periods are currently scheduled for{" "}
                {new Set(entries.map((entry) => entry.class_id)).size} classes.
                Ask the school admin to add periods for the remaining class or
                classes.
              </div>
            )}
            <div className="table-toolbar">
              <label>
                Day
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                >
                  {DAYS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Class
                <select
                  value={filterClassId}
                  onChange={(e) => setFilterClassId(e.target.value)}
                >
                  <option value="">All classes</option>
                  {teacherClasses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} - {item.section}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Time</th>
                    <th>Class</th>
                    <th>Subject</th>
                    <th>Assignment</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherDayEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <strong>{entry.period_name}</strong>
                      </td>
                      <td>
                        {entry.start_time} - {entry.end_time}
                      </td>
                      <td>
                        {entry.class_name} - {entry.section}
                      </td>
                      <td>{entry.subject_name}</td>
                      <td>{entry.teacher_user_id ? "Teaching period" : "—"}</td>
                    </tr>
                  ))}
                  {teacherDayEntries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty-state">
                        {filterClassId
                          ? `No lessons scheduled for the selected class on ${selectedDay}.`
                          : `No lessons scheduled for ${selectedDay}.`}
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

  return (
    <main className="dashboard-shell">
      <Sidebar
        role="school_admin"
        schoolCode={schoolCode}
        fullName={userName}
      />

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="dashboard-overline">
              EDURISE / SCHOOL / TIMETABLE
            </span>
            <h1>Timetable Management</h1>
            <p>
              Manage school periods, class schedules and teacher teaching
              periods for {schoolCode}.
            </p>
          </div>

          <div className="header-actions">
            <span className="role-chip">School Admin</span>
            <button
              type="button"
              className="secondary-button"
              disabled={saving}
              onClick={() => {
                setLoading(true);
                loadData()
                  .catch((err) =>
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Unable to refresh data.",
                    ),
                  )
                  .finally(() => setLoading(false));
              }}
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
            <small>Registered classes</small>
          </article>

          <article className="stat-card">
            <span>School periods</span>
            <strong>{periods.length}</strong>
            <small>Including breaks</small>
          </article>

          <article className="stat-card">
            <span>Timetable entries</span>
            <strong>{entries.length}</strong>
            <small>Scheduled lessons</small>
          </article>
        </div>

        {/* SCHOOL PERIOD MANAGEMENT */}
        <section className="content-card">
          <div className="section-heading">
            <div>
              <h2>School periods</h2>
              <p>Define common period timings used by all classes.</p>
            </div>
          </div>

          <form className="create-school-form" onSubmit={savePeriod}>
            <h3>{editingPeriodId ? "Edit period" : "Add school period"}</h3>

            <div className="form-grid">
              <label>
                Period number
                <input
                  type="number"
                  min="1"
                  value={periodForm.period_number}
                  onChange={(e) =>
                    updatePeriodForm("period_number", e.target.value)
                  }
                  required
                />
              </label>

              <label>
                Period name
                <input
                  value={periodForm.name}
                  onChange={(e) => updatePeriodForm("name", e.target.value)}
                  placeholder="Period 1 / Lunch Break"
                  maxLength={50}
                  required
                />
              </label>

              <label>
                Start time
                <input
                  type="time"
                  value={periodForm.start_time}
                  onChange={(e) =>
                    updatePeriodForm("start_time", e.target.value)
                  }
                  required
                />
              </label>

              <label>
                End time
                <input
                  type="time"
                  value={periodForm.end_time}
                  onChange={(e) => updatePeriodForm("end_time", e.target.value)}
                  required
                />
              </label>
            </div>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={periodForm.is_break}
                onChange={(e) => updatePeriodForm("is_break", e.target.checked)}
              />
              This is a break period
            </label>

            <div className="form-actions">
              {editingPeriodId && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={resetPeriodForm}
                  disabled={saving}
                >
                  Cancel edit
                </button>
              )}

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingPeriodId
                    ? "Update period"
                    : "Add period"}
              </button>
            </div>
          </form>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Period</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {periods
                  .slice()
                  .sort((a, b) => a.period_number - b.period_number)
                  .map((period) => (
                    <tr key={period.id}>
                      <td>{period.period_number}</td>
                      <td>
                        <strong>{period.name}</strong>
                      </td>
                      <td>{period.start_time}</td>
                      <td>{period.end_time}</td>
                      <td>{period.is_break ? "Break" : "Teaching"}</td>
                      <td>
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => editPeriod(period)}
                          disabled={saving}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => deletePeriod(period.id)}
                          disabled={saving}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}

                {periods.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty-state">
                      No periods configured. Add your first period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* CREATE / UPDATE TIMETABLE */}
        <section className="content-card">
          <div className="section-heading">
            <div>
              <h2>
                {editingEntryId
                  ? "Update timetable entry"
                  : "Assign teacher to a period"}
              </h2>
              <p>
                Select a class, its subject, an assigned teacher and period. The
                schedule repeats Monday to Saturday.
              </p>
            </div>
          </div>

          <form className="create-school-form" onSubmit={saveTimetable}>
            <div className="form-grid">
              <label>
                Select assigned teacher *
                <select
                  value={selectedTeacherId}
                  onChange={(e) => {
                    const teacherId = e.target.value;
                    setSelectedTeacherId(teacherId);
                    updateForm("teacher_user_id", teacherId);
                    updateForm("class_id", "");
                    updateForm("class_subject_id", "");
                  }}
                  required
                >
                  <option value="">Choose teacher</option>
                  {teachers
                    .filter((teacher) => teacher.is_active)
                    .map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.full_name}
                      </option>
                    ))}
                </select>
              </label>

              <label>
                Select assigned class *
                <select
                  value={form.class_id}
                  onChange={(e) => {
                    updateForm("class_id", e.target.value);
                    updateForm("class_subject_id", "");
                  }}
                  disabled={!selectedTeacherId}
                  required
                >
                  <option value="">Choose class</option>
                  {availableClassesForSelectedTeacher.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} - {item.section}
                    </option>
                  ))}
                </select>
                {selectedTeacherId &&
                  availableClassesForSelectedTeacher.length === 0 && (
                    <small>
                      No classes are assigned to this teacher yet. Assign
                      classes and subjects first in Teacher Management.
                    </small>
                  )}
              </label>

              <label>
                Select assigned subject *
                <select
                  value={form.class_subject_id}
                  onChange={(e) =>
                    updateForm("class_subject_id", e.target.value)
                  }
                  disabled={!form.class_id}
                  required
                >
                  <option value="">Choose subject</option>
                  {selectedMappings.map((mapping) => (
                    <option key={mapping.id} value={mapping.id}>
                      {mapping.subject_name}
                      {mapping.section ? ` — ${mapping.section}` : ""}
                    </option>
                  ))}
                </select>
                {form.class_subject_id && selectedTeacherIsClassTeacher && (
                  <small>This teacher is also the class teacher.</small>
                )}
                {form.class_id && selectedMappings.length === 0 && (
                  <small>
                    No subjects assigned to this teacher for the selected class.
                  </small>
                )}
              </label>

              <label>
                Select period *
                <select
                  value={form.period_id}
                  onChange={(e) => updateForm("period_id", e.target.value)}
                  required
                >
                  <option value="">Choose period</option>
                  {periods
                    .filter((period) => !period.is_break)
                    .sort((a, b) => a.period_number - b.period_number)
                    .map((period) => (
                      <option key={period.id} value={period.id}>
                        {period.name} ({period.start_time} - {period.end_time})
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <div className="form-actions">
              {editingEntryId && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={resetTimetableForm}
                  disabled={saving}
                >
                  Cancel edit
                </button>
              )}

              <button
                type="submit"
                className="primary-button"
                disabled={
                  saving ||
                  periods.filter((period) => !period.is_break).length === 0
                }
              >
                {saving
                  ? "Saving..."
                  : editingEntryId
                    ? "Update timetable"
                    : "Add to timetable"}
              </button>
            </div>
          </form>
        </section>

        {/* TIMETABLE VIEW */}
        <section className="content-card">
          <div className="section-heading">
            <div>
              <h2>Weekly timetable</h2>
              <p>
                View the recurring weekly schedule by day and class, including
                teacher and period timings.
              </p>
            </div>
          </div>

          <div className="table-toolbar">
            <label>
              View
              <select
                value={viewMode}
                onChange={(e) =>
                  setViewMode(e.target.value as "class" | "teacher")
                }
              >
                <option value="class">Class timetable</option>
                <option value="teacher">Teacher timetable</option>
              </select>
            </label>

            <label>
              Day
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
              >
                {DAYS.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>

            {viewMode === "class" ? (
              <label>
                Class
                <select
                  value={filterClassId}
                  onChange={(e) => setFilterClassId(e.target.value)}
                >
                  <option value="">All classes</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} - {item.section}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                Teacher
                <select
                  value={filterClassId}
                  onChange={(e) => setFilterClassId(e.target.value)}
                >
                  <option value="">All teachers</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.full_name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Time</th>
                  <th>Class</th>
                  <th>Subject</th>
                  <th>Teacher</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredEntries
                  .filter((entry) =>
                    viewMode === "class"
                      ? true
                      : !filterClassId ||
                        entry.teacher_user_id === Number(filterClassId),
                  )
                  .map((entry) => {
                    const teacherIsClassTeacher = (
                      teacherAssignments[entry.teacher_user_id] || []
                    ).some(
                      (assignment) =>
                        assignment.class_subject_id ===
                          entry.class_subject_id && assignment.is_class_teacher,
                    );

                    return (
                      <tr key={entry.id}>
                        <td>
                          <strong>{entry.period_name}</strong>
                        </td>
                        <td>
                          {entry.start_time} - {entry.end_time}
                        </td>
                        <td>
                          {entry.class_name} - {entry.section}
                        </td>
                        <td>{entry.subject_name}</td>
                        <td>
                          {entry.teacher_name}
                          {teacherIsClassTeacher && (
                            <span className="status-badge active">
                              Class Teacher
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => editEntry(entry)}
                            disabled={saving}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => deleteEntry(entry.id)}
                            disabled={saving}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                {filteredEntries.filter((entry) =>
                  viewMode === "class"
                    ? true
                    : !filterClassId ||
                      entry.teacher_user_id === Number(filterClassId),
                ).length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty-state">
                      No timetable entries found for {selectedDay}.
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

function TimetablePageContent() {
  const params = useParams<{ schoolCode: string }>();
  const schoolCode = (params.schoolCode || "").trim().toUpperCase();

  return (
    <AuthGuard allowedRoles={["school_admin", "teacher"]}>
      <TimetableContent schoolCode={schoolCode} />
    </AuthGuard>
  );
}

export default function TimetablePage() {
  return (
    <Suspense
      fallback={<main className="dashboard-loading">Loading timetable...</main>}
    >
      <TimetablePageContent />
    </Suspense>
  );
}
