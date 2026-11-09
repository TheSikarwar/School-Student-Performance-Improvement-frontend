"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "../../../components/layout/Sidebar";
import Loading from "../../../components/common/Loading";
const SCHOOL_ROLES = ["school_admin", "teacher", "parent", "student"] as const;

type SchoolRole = (typeof SCHOOL_ROLES)[number];
type UserRole = SchoolRole | "superadmin";

type User = {
  id: number;
  full_name?: string;
  email: string;
  role: UserRole;
  school_code?: string;
};

type AuthSnapshot = {
  token: string | null;
  rawUser: string | null;
  storedSchoolCode: string;
};

type DashboardSubject = {
  class_subject_id: number;
  subject_id: number;
  subject_name: string;
  subject_code?: string | null;
  is_class_teacher: boolean;
};

type DashboardClass = {
  class_id: number;
  class_name: string;
  section: string;
  academic_year?: string | null;
  is_class_teacher: boolean;
  subjects: DashboardSubject[];
};

type TimetableEntry = {
  id: number;
  class_id: number;
  class_name: string;
  section: string;
  subject_id: number;
  subject_name: string;
  period_id: number;
  period_number: number;
  period_name: string;
  start_time: string;
  end_time: string;
};

type TeacherDashboardResponse = {
  school_code: string;
  teacher: {
    id: number;
    full_name: string;
    email: string;
  };
  statistics: {
    assigned_classes: number;
    assigned_subjects: number;
    today_periods: number;
    total_students: number;
  };
  today: {
    day_of_week: string;
    timetable: TimetableEntry[];
  };
  classes: DashboardClass[];
};

type DashboardState = {
  data: TeacherDashboardResponse | null;
  loading: boolean;
  error: string | null;
};

function subscribeToAuth(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getAuthSnapshot(): string {
  return JSON.stringify({
    token: localStorage.getItem("access_token"),
    rawUser: localStorage.getItem("user"),
    storedSchoolCode: localStorage.getItem("school_code") || "",
  });
}

function getServerAuthSnapshot(): null {
  return null;
}

function isUserRole(role: unknown): role is UserRole {
  return (
    role === "superadmin" ||
    SCHOOL_ROLES.some((schoolRole) => schoolRole === role)
  );
}

function isUser(value: unknown): value is User {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "number" &&
    typeof candidate.email === "string" &&
    isUserRole(candidate.role) &&
    (candidate.full_name === undefined ||
      typeof candidate.full_name === "string") &&
    (candidate.school_code === undefined ||
      typeof candidate.school_code === "string")
  );
}

function parseAuthSnapshot(value: string | null): AuthSnapshot | null {
  if (value === null) return null;

  try {
    return JSON.parse(value) as AuthSnapshot;
  } catch {
    return {
      token: null,
      rawUser: null,
      storedSchoolCode: "",
    };
  }
}

export default function SchoolDashboardClient() {
  const router = useRouter();
  const params = useParams<{ schoolCode: string }>();
  const schoolCode = params.schoolCode?.trim().toUpperCase() || "";

  const authSnapshotText = useSyncExternalStore(
    subscribeToAuth,
    getAuthSnapshot,
    getServerAuthSnapshot,
  );

  const authSnapshot = useMemo(
    () => parseAuthSnapshot(authSnapshotText),
    [authSnapshotText],
  );

  const user = useMemo<User | null>(() => {
    if (!authSnapshot?.rawUser) return null;

    try {
      const parsed: unknown = JSON.parse(authSnapshot.rawUser);
      return isUser(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }, [authSnapshot]);

  const storedSchoolCode = (authSnapshot?.storedSchoolCode || "")
    .trim()
    .toUpperCase();

  const userSchoolCode = (user?.school_code || storedSchoolCode)
    .trim()
    .toUpperCase();

  const checkingAuth = authSnapshot === null;
  const hasSession = Boolean(authSnapshot?.token && user);
  const isSchoolUser = Boolean(
    user && SCHOOL_ROLES.includes(user.role as SchoolRole),
  );
  const authorized = Boolean(
    !checkingAuth &&
    hasSession &&
    isSchoolUser &&
    schoolCode &&
    userSchoolCode === schoolCode,
  );

  useEffect(() => {
    if (checkingAuth) return;

    if (!authSnapshot?.token || !authSnapshot.rawUser || !user) {
      router.replace(`/school/${schoolCode}/login`);
      return;
    }

    if (user.role === "superadmin") {
      router.replace("/dashboard");
      return;
    }

    if (!isSchoolUser) {
      router.replace("/");
      return;
    }

    if (!schoolCode || !userSchoolCode) {
      router.replace("/");
      return;
    }

    if (schoolCode !== userSchoolCode) {
      router.replace(`/school/${userSchoolCode}/dashboard`);
      return;
    }

    if (storedSchoolCode !== schoolCode) {
      localStorage.setItem("school_code", schoolCode);
    }
  }, [
    checkingAuth,
    authSnapshot,
    user,
    isSchoolUser,
    schoolCode,
    userSchoolCode,
    storedSchoolCode,
    router,
  ]);

  const dashboard = useTeacherDashboard(
    authorized && user?.role === "teacher",
    schoolCode,
    authSnapshot?.token || null,
  );

  if (checkingAuth || !authorized || !user) {
    return (
       <Loading message="Please wait, preparing your EduRise workspace..." />
    );
  }

  const roleLabel = user.role.replace("_", " ");
  const pageTitle =
    user.role === "school_admin"
      ? "School overview"
      : user.role === "teacher"
        ? "Teacher overview"
        : user.role === "parent"
          ? "Parent overview"
          : "Student overview";

  const sectionTitle =
    user.role === "school_admin"
      ? "School management"
      : user.role === "teacher"
        ? "Teaching workspace"
        : user.role === "parent"
          ? "Your child's academic information"
          : "Your academic information";

  return (
    <main className="dashboard-shell">
      <Sidebar
        role={user.role as SchoolRole}
        schoolCode={schoolCode}
        fullName={user.full_name || user.email}
      />

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="dashboard-overline">
              EDURISE / SCHOOL WORKSPACE
            </span>
            <h1>{pageTitle}</h1>
            <p>Welcome back, {user.full_name || user.email}.</p>
          </div>
          <span className="role-chip">{roleLabel}</span>
        </header>

        {user.role === "teacher" ? (
          <TeacherDashboard
            dashboard={dashboard.data}
            loading={dashboard.loading}
            error={dashboard.error}
            onRetry={dashboard.retry}
          />
        ) : (
          <section className="content-card">
            <h2>{sectionTitle}</h2>
            <p>
              School: <strong>{schoolCode}</strong>
            </p>
            <p>
              Your {roleLabel} dashboard is now independent of the Superadmin
              dashboard.
            </p>
          </section>
        )}
      </section>
    </main>
  );
}

function useTeacherDashboard(
  enabled: boolean,
  schoolCode: string,
  token: string | null,
) {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<DashboardState>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!enabled || !token) return;

    const controller = new AbortController();
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
    const endpoint = `${apiBase}/schools/${encodeURIComponent(
      schoolCode,
    )}/teacher-dashboard/`;

    async function fetchDashboard() {
      try {
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          cache: "no-store",
          signal: controller.signal,
        });

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            result?.error ||
              `Unable to load teacher dashboard (HTTP ${response.status}).`,
          );
        }

        setState({
          data: result as TeacherDashboardResponse,
          loading: false,
          error: null,
        });
      } catch (requestError) {
        if (controller.signal.aborted) return;

        setState((current) => ({
          ...current,
          loading: false,
          error:
            requestError instanceof Error
              ? requestError.message
              : "Unable to load teacher dashboard.",
        }));
      }
    }

    void fetchDashboard();
    return () => controller.abort();
  }, [enabled, schoolCode, token, reloadKey]);

  return {
    ...state,
    retry: () => {
      setState((current) => ({ ...current, loading: true, error: null }));
      setReloadKey((current) => current + 1);
    },
  };
}

function TeacherDashboard({
  dashboard,
  loading,
  error,
  onRetry,
}: {
  dashboard: TeacherDashboardResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const stats = dashboard?.statistics;

  return (
    <div className="teacher-dashboard">
      <div className="teacher-heading">
        <div>
          <h2>Teaching workspace</h2>
          <p>Your teaching activity and assigned classes at a glance.</p>
        </div>
        {dashboard?.today?.day_of_week && (
          <span className="teacher-day-chip">
            {dashboard.today.day_of_week}
          </span>
        )}
      </div>

      {error && (
        <div className="teacher-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}

      <div className="teacher-stat-grid">
        <StatCard
          label="Assigned Classes"
          value={stats?.assigned_classes}
          loading={loading}
        />
        <StatCard
          label="Assigned Subjects"
          value={stats?.assigned_subjects}
          loading={loading}
        />
        <StatCard
          label="Today's Periods"
          value={stats?.today_periods}
          loading={loading}
        />
        <StatCard
          label="Total Students"
          value={stats?.total_students}
          loading={loading}
        />
      </div>

      <section className="teacher-panel">
        <div className="teacher-panel-heading">
          <div>
            <h3>Today&apos;s Timetable</h3>
            <p>Classes scheduled for today.</p>
          </div>
        </div>

        {loading && !dashboard ? (
          <p className="teacher-muted">Loading today&apos;s timetable...</p>
        ) : dashboard?.today?.timetable?.length ? (
          <div className="teacher-table-wrap">
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Time</th>
                  <th>Class</th>
                  <th>Subject</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.today.timetable.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      {entry.period_name || `Period ${entry.period_number}`}
                    </td>
                    <td>
                      {entry.start_time} – {entry.end_time}
                    </td>
                    <td>
                      {entry.class_name} - {entry.section}
                    </td>
                    <td>{entry.subject_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !loading && (
            <p className="teacher-muted">
              No timetable periods are scheduled for today.
            </p>
          )
        )}
      </section>

      <section className="teacher-panel">
        <div className="teacher-panel-heading">
          <div>
            <h3>My Classes & Subjects</h3>
            <p>All assigned classes, including classes without a timetable.</p>
          </div>
        </div>

        {loading && !dashboard ? (
          <p className="teacher-muted">Loading your assignments...</p>
        ) : dashboard?.classes?.length ? (
          <div className="teacher-class-grid">
            {dashboard.classes.map((classItem) => (
              <article className="teacher-class-card" key={classItem.class_id}>
                <div className="teacher-class-heading">
                  <div>
                    <h4>
                      {classItem.class_name} - {classItem.section}
                    </h4>
                    {classItem.academic_year && (
                      <span>{classItem.academic_year}</span>
                    )}
                  </div>
                  {classItem.is_class_teacher && (
                    <span className="teacher-class-badge">Class Teacher</span>
                  )}
                </div>
                <div className="teacher-subject-list">
                  {classItem.subjects.map((subject) => (
                    <div
                      className="teacher-subject-row"
                      key={subject.class_subject_id}
                    >
                      <span>{subject.subject_name}</span>
                      {subject.is_class_teacher && (
                        <small>Class teacher assignment</small>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          !loading && (
            <p className="teacher-muted">
              No classes have been assigned to you yet.
            </p>
          )
        )}
      </section>

      <style jsx>{`
        .teacher-dashboard { display: grid; gap: 22px; }
        .teacher-heading, .teacher-panel-heading, .teacher-class-heading {
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
        }
        .teacher-heading h2 { margin: 0 0 6px; color: #12384a; font-size: 25px; }
        .teacher-heading p, .teacher-panel-heading p { margin: 0; color: #718096; font-size: 14px; }
        .teacher-day-chip, .teacher-class-badge {
          border-radius: 999px; padding: 7px 12px; background: #e5f5f1;
          color: #087e70; font-size: 12px; font-weight: 700; white-space: nowrap;
        }
        .teacher-stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
        .teacher-stat-card {
          background: #fff; border: 1px solid #e1e9ed; border-radius: 14px;
          padding: 20px; box-shadow: 0 3px 12px rgba(16, 48, 64, .035);
        }
        .teacher-stat-label { color: #718096; font-size: 13px; }
        .teacher-stat-value { margin-top: 9px; color: #12384a; font-size: 29px; font-weight: 750; }
        .teacher-panel {
          background: #fff; border: 1px solid #e1e9ed; border-radius: 14px;
          padding: 22px; box-shadow: 0 3px 12px rgba(16, 48, 64, .035);
        }
        .teacher-panel-heading { margin-bottom: 18px; }
        .teacher-panel-heading h3 { margin: 0 0 5px; color: #12384a; font-size: 19px; }
        .teacher-table-wrap { overflow-x: auto; }
        .teacher-table { width: 100%; border-collapse: collapse; text-align: left; }
        .teacher-table th, .teacher-table td { padding: 13px 12px; border-bottom: 1px solid #edf1f3; font-size: 14px; }
        .teacher-table th { color: #718096; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
        .teacher-muted { color: #718096; font-size: 14px; }
        .teacher-class-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .teacher-class-card { border: 1px solid #e8eef1; border-radius: 12px; padding: 17px; }
        .teacher-class-heading h4 { margin: 0 0 5px; color: #12384a; font-size: 16px; }
        .teacher-class-heading > div > span { color: #84919a; font-size: 12px; }
        .teacher-subject-list { margin-top: 14px; display: grid; gap: 9px; }
        .teacher-subject-row { display: flex; justify-content: space-between; gap: 10px; color: #334e5c; font-size: 14px; }
        .teacher-subject-row small { color: #087e70; font-size: 11px; }
        .teacher-error {
          display: flex; justify-content: space-between; align-items: center; gap: 12px;
          padding: 12px 15px; border: 1px solid #f3c5c5; background: #fff5f5;
          color: #a52a2a; border-radius: 10px; font-size: 14px;
        }
        .teacher-error button { border: 0; border-radius: 7px; background: #a52a2a; color: #fff; padding: 7px 12px; cursor: pointer; font-weight: 600; }
        @media (max-width: 1050px) { .teacher-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 650px) {
          .teacher-stat-grid, .teacher-class-grid { grid-template-columns: 1fr; }
          .teacher-panel { padding: 16px; }
          .teacher-heading { align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
}) {
  return (
    <>
      <div className="teacher-stat-card">
        <div className="teacher-stat-label">{label}</div>
        <div className="teacher-stat-value">
          {loading && value === undefined ? "…" : (value ?? 0)}
        </div>
      </div>

      <style jsx>{`
        .teacher-stat-card {
          background: #ffffff;
          border: 1px solid #e1e9ed;
          border-radius: 14px;
          padding: 22px;
          box-shadow: 0 3px 12px rgba(16, 48, 64, 0.05);
          min-height: 110px;
        }

        .teacher-stat-label {
          color: #718096;
          font-size: 14px;
          font-weight: 500;
        }

        .teacher-stat-value {
          margin-top: 12px;
          color: #12384a;
          font-size: 30px;
          font-weight: 750;
        }
      `}</style>
    </>
  );
}
