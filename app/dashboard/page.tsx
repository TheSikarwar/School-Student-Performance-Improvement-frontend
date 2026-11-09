"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Loading from "../components/common/Loading";

type User = {
  id: number;
  full_name?: string;
  email: string;
  role: "superadmin" | "school_admin" | "teacher" | "parent" | "student";
  school_code?: string | null;
  school_id?: number | null;
};

type School = {
  id: number;
  name: string;
  code: string;
  status: string;
  plan_type?: string;
  ai_enabled?: boolean;
  monthly_ai_limit?: number;
  subscription_status?: string;
  created_at?: string | null;
};

type SchoolAdmin = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at?: string | null;
};

type ApiError = { error?: string; message?: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function apiRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL is not configured.");

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = data as ApiError;
    throw new Error(
      error.message || error.error || `Request failed (${response.status}).`,
    );
  }
  return data as T;
}

function getStoredSession() {
  if (typeof window === "undefined") {
    return {
      token: "",
      user: null as User | null,
      schoolCode: "",
    };
  }

  try {
    const token = localStorage.getItem("access_token") || "";
    const storedUser = localStorage.getItem("user");
    const user = storedUser ? (JSON.parse(storedUser) as User) : null;
    const schoolCode =
      localStorage.getItem("school_code") || user?.school_code || "";

    return { token, user, schoolCode };
  } catch {
    return {
      token: "",
      user: null as User | null,
      schoolCode: "",
    };
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [session] = useState(getStoredSession);

  const user = session.user;
  const token = session.token;
  const schoolCode = session.schoolCode;
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [newSchoolCode, setNewSchoolCode] = useState("");
  const [search, setSearch] = useState("");
  const [adminSchool, setAdminSchool] = useState<School | null>(null);
  const [schoolAdmins, setSchoolAdmins] = useState<SchoolAdmin[]>([]);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminsLoading, setAdminsLoading] = useState(false);

  const isSuperadmin = user?.role === "superadmin";
  const isSchoolAdmin = user?.role === "school_admin";
  const isTeacher = user?.role === "teacher";

  const loadDashboard = useCallback(
    async (activeToken: string, activeUser: User, code: string) => {
      // setError("");
      if (activeUser.role === "superadmin") {
        const data = await apiRequest<{ schools: School[] }>(
          "/schools",
          activeToken,
        );
        setSchools(data.schools || []);
        return;
      }

      if (activeUser.role === "school_admin" || activeUser.role === "teacher") {
        if (!code) {
          throw new Error(
            "School code is missing. Please sign in again from your school login page.",
          );
        }

        const classResult = await apiRequest<{
          classes?: Array<Record<string, unknown>>;
        }>(`/schools/${encodeURIComponent(code)}/classes/`, activeToken);

        setClasses(classResult.classes || []);
      }
    },
    [],
  );

  useEffect(() => {
    if (!token || !user) {
      const code =
        schoolCode ||
        (typeof window !== "undefined"
          ? localStorage.getItem("school_code")
          : "");

      if (code && user?.role !== "superadmin") {
        router.replace(`/school/${code.toUpperCase()}/login`);
      } else {
        router.replace("/");
      }

      return;
    }

    let cancelled = false;

    // Start the request in the effect, then update React state only from
    // asynchronous callbacks. This avoids calling a state-updating helper
    // synchronously from the effect body.
    const request =
      user.role === "superadmin"
        ? apiRequest<{ schools: School[] }>("/schools", token).then((result) => {
            if (!cancelled) {
              setSchools(result.schools || []);
            }
          })
        : user.role === "school_admin" || user.role === "teacher"
          ? !schoolCode
            ? Promise.reject(
                new Error(
                  "School code is missing. Please sign in again from your school login page.",
                ),
              )
            : apiRequest<{ classes?: Array<Record<string, unknown>> }>(
                `/schools/${encodeURIComponent(schoolCode)}/classes/`,
                token,
              ).then((result) => {
                if (!cancelled) {
                  setClasses(result.classes || []);
                }
              })
          : Promise.resolve();

    request
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load dashboard.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, user, schoolCode, router]);
  const filteredSchools = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return schools;
    return schools.filter((school) =>
      `${school.name} ${school.code} ${school.status}`
        .toLowerCase()
        .includes(term),
    );
  }, [schools, search]);

  async function refresh() {
    if (!user || !token) return;
    setBusy(true);
    setError("");
    try {
      await loadDashboard(token, user, schoolCode);
      setNotice("Dashboard refreshed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed.");
    } finally {
      setBusy(false);
    }
  }

  async function createSchool(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest("/schools", token, {
        method: "POST",
        body: JSON.stringify({
          name: schoolName.trim(),
          code: newSchoolCode.trim().toUpperCase(),
        }),
      });
      setSchoolName("");
      setNewSchoolCode("");
      setShowCreate(false);
      await loadDashboard(token, user!, schoolCode);
      setNotice("School created and tenant database provisioning completed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create school.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleSchoolStatus(school: School) {
    const nextStatus = school.status === "active" ? "inactive" : "active";
    if (
      !window.confirm(
        `${nextStatus === "inactive" ? "Deactivate" : "Activate"} ${school.name}?`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/schools/${school.id}`, token, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadDashboard(token, user!, schoolCode);
      setNotice(
        `${school.name} ${nextStatus === "active" ? "activated" : "deactivated"}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update school.");
    } finally {
      setBusy(false);
    }
  }

  async function openSchoolAdmins(school: School) {
    setAdminSchool(school);
    setSchoolAdmins([]);
    setAdminName("");
    setAdminEmail("");
    setAdminPassword("");
    setError("");
    setAdminsLoading(true);
    try {
      const result = await apiRequest<{ admins: SchoolAdmin[] }>(
        `/schools/${school.id}/admins`,
        token,
      );
      setSchoolAdmins(result.admins || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load school admins.",
      );
    } finally {
      setAdminsLoading(false);
    }
  }

  async function createSchoolAdmin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adminSchool) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/schools/${adminSchool.id}/admins`, token, {
        method: "POST",
        body: JSON.stringify({
          full_name: adminName.trim(),
          email: adminEmail.trim(),
          password: adminPassword,
        }),
      });
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");
      const result = await apiRequest<{ admins: SchoolAdmin[] }>(
        `/schools/${adminSchool.id}/admins`,
        token,
      );
      setSchoolAdmins(result.admins || []);
      setNotice(`School administrator added to ${adminSchool.name}.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create school admin.",
      );
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    const currentUser = user;
    const currentSchoolCode = schoolCode || localStorage.getItem("school_code");

    const isSchoolUser =
      currentUser?.role !== "superadmin" && Boolean(currentSchoolCode);

    // Clear authentication
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("school_code");

    // Redirect according to user role
    if (isSchoolUser) {
      router.replace(`/school/${currentSchoolCode!.toUpperCase()}/login`);
    } else {
      router.replace("/");
    }
  }
  if (loading)
    return (
      <Loading message="Please wait, preparing your EduRise workspace..." />
    );

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link className="dashboard-brand" href="/">
          <span className="dashboard-brand-mark">E</span>
          <span>
            Edu<span>Rise</span>
          </span>
        </Link>
        <div className="sidebar-label">WORKSPACE</div>
        <div className="sidebar-link active">
          <span>▦</span> Overview
        </div>
        {isSuperadmin && (
          <div className="sidebar-link">
            <span>▤</span> Schools
          </div>
        )}
        {(isSchoolAdmin || isTeacher) && (
          <div className="sidebar-link">
            <span>▣</span> Classes
          </div>
        )}

        <div className="sidebar-bottom">
          <div className="user-avatar">
            {(user?.full_name || user?.email || "U").slice(0, 1).toUpperCase()}
          </div>
          <div className="user-meta">
            <strong>{user?.full_name || "EduRise user"}</strong>
            <span>{user?.role?.replace("_", " ")}</span>
          </div>
          <button
            className="logout-button"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
          >
            ↪
          </button>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="dashboard-overline">EDURISE / WORKSPACE</span>
            <h1>
              {isSuperadmin
                ? "Platform overview"
                : isSchoolAdmin
                  ? "School overview"
                  : "Teacher overview"}
            </h1>
            <p>
              {isSuperadmin
                ? "Manage schools and monitor your platform."
                : `Welcome back, ${user?.full_name || "there"}. Here's your academic workspace.`}
            </p>
          </div>
          <div className="header-actions">
            <span className="role-chip">{user?.role?.replace("_", " ")}</span>
            <button
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

        {isSuperadmin && (
          <>
            <div className="stat-grid">
              <article className="stat-card">
                <span>Total schools</span>
                <strong>{schools.length}</strong>
                <small>Registered on EduRise</small>
              </article>
              <article className="stat-card">
                <span>Active schools</span>
                <strong>
                  {schools.filter((s) => s.status === "active").length}
                </strong>
                <small>Currently enabled</small>
              </article>
              <article className="stat-card">
                <span>Inactive / other</span>
                <strong>
                  {schools.filter((s) => s.status !== "active").length}
                </strong>
                <small>Not currently active</small>
              </article>
            </div>
            <section className="content-card">
              <div className="section-heading">
                <div>
                  <h2>School management</h2>
                  <p>Create schools and manage tenant access.</p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => setShowCreate((v) => !v)}
                >
                  ＋ Add school
                </button>
              </div>
              {showCreate && (
                <form className="create-school-form" onSubmit={createSchool}>
                  <label>
                    School name
                    <input
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="e.g. Sunrise Public School"
                      maxLength={150}
                      required
                    />
                  </label>
                  <label>
                    School code
                    <input
                      value={newSchoolCode}
                      onChange={(e) =>
                        setNewSchoolCode(e.target.value.toUpperCase())
                      }
                      placeholder="e.g. SUN001"
                      minLength={3}
                      maxLength={50}
                      pattern="[A-Za-z0-9]{3,50}"
                      required
                    />
                  </label>
                  <div className="form-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setShowCreate(false)}
                    >
                      Cancel
                    </button>
                    <button className="primary-button" disabled={busy}>
                      {busy ? "Creating…" : "Create school"}
                    </button>
                  </div>
                  <p className="form-hint">
                    The backend creates a separate tenant database for the new
                    school.
                  </p>
                </form>
              )}
              <div className="table-toolbar">
                <input
                  aria-label="Search schools"
                  placeholder="Search by school name, code or status…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <span>{filteredSchools.length} schools</span>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>School</th>
                      <th>Code</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSchools.map((school) => (
                      <tr key={school.id}>
                        <td>
                          <strong>{school.name}</strong>
                          <small>School ID: {school.id}</small>
                        </td>
                        <td>
                          <code>{school.code}</code>
                        </td>
                        <td>
                          <span className={`status-pill ${school.status}`}>
                            {school.status}
                          </span>
                        </td>
                        <td>
                          {school.created_at
                            ? new Date(school.created_at).toLocaleDateString()
                            : "—"}
                        </td>
                        <td>
                          <button
                            className="table-action"
                            disabled={
                              busy ||
                              school.status === "provisioning" ||
                              school.status === "failed"
                            }
                            onClick={() => toggleSchoolStatus(school)}
                          >
                            {school.status === "active"
                              ? "Deactivate"
                              : "Activate"}
                          </button>
                          <button
                            className="table-action"
                            disabled={busy || school.status !== "active"}
                            onClick={() => openSchoolAdmins(school)}
                          >
                            Manage admins
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredSchools.length === 0 && (
                      <tr>
                        <td colSpan={5} className="empty-state">
                          No schools found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {adminSchool && (
              <section className="content-card admin-management-card">
                <div className="section-heading">
                  <div>
                    <h2>School administrators</h2>
                    <p>
                      {adminSchool.name} · {adminSchool.code}
                    </p>
                  </div>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setAdminSchool(null)}
                  >
                    Close
                  </button>
                </div>

                <form
                  className="create-school-form"
                  onSubmit={createSchoolAdmin}
                >
                  <label>
                    Administrator full name
                    <input
                      value={adminName}
                      onChange={(event) => setAdminName(event.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      maxLength={150}
                      required
                    />
                  </label>
                  <label>
                    Email address
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(event) => setAdminEmail(event.target.value)}
                      placeholder="admin@school.com"
                      maxLength={255}
                      required
                    />
                  </label>
                  <label>
                    Temporary password
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(event) => setAdminPassword(event.target.value)}
                      placeholder="At least 8 characters"
                      minLength={8}
                      autoComplete="new-password"
                      required
                    />
                  </label>
                  <div className="form-actions">
                    <button className="primary-button" disabled={busy}>
                      {busy ? "Adding…" : "Add school administrator"}
                    </button>
                  </div>
                  <p className="form-hint">
                    The account is created in this school&apos;s tenant database.
                    Share the temporary password securely with the
                    administrator.
                  </p>
                </form>

                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminsLoading ? (
                        <tr>
                          <td colSpan={4} className="empty-state">
                            Loading administrators…
                          </td>
                        </tr>
                      ) : schoolAdmins.length ? (
                        schoolAdmins.map((admin) => (
                          <tr key={admin.id}>
                            <td>
                              <strong>{admin.full_name}</strong>
                            </td>
                            <td>{admin.email}</td>
                            <td>
                              <span
                                className={`status-pill ${admin.is_active ? "active" : "inactive"}`}
                              >
                                {admin.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>
                              {admin.created_at
                                ? new Date(
                                    admin.created_at,
                                  ).toLocaleDateString()
                                : "—"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="empty-state">
                            No school administrators yet. Add the first
                            administrator above.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        {(isSchoolAdmin || isTeacher) && (
          <>
            <div className="stat-grid">
              <article className="stat-card">
                <span>Assigned classes</span>
                <strong>{classes.length}</strong>
                <small>Available in your workspace</small>
              </article>
              <article className="stat-card">
                <span>School</span>
                <strong className="stat-code">{schoolCode || "—"}</strong>
                <small>Current tenant</small>
              </article>
              <article className="stat-card">
                <span>Role</span>
                <strong className="stat-role">
                  {isTeacher ? "Teacher" : "School Admin"}
                </strong>
                <small>Role-based access</small>
              </article>
            </div>
            <section className="content-card">
              <div className="section-heading">
                <div>
                  <h2>{isTeacher ? "Your classes" : "School classes"}</h2>
                  <p>
                    {isTeacher
                      ? "Classes available to your teacher account."
                      : "Classes registered in your school."}
                  </p>
                </div>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Section</th>
                      <th>Academic year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((item, index) => (
                      <tr key={String(item.id ?? index)}>
                        <td>
                          <strong>{String(item.name ?? "—")}</strong>
                        </td>
                        <td>{String(item.section ?? "—")}</td>
                        <td>{String(item.academic_year ?? "—")}</td>
                      </tr>
                    ))}
                    {classes.length === 0 && (
                      <tr>
                        <td colSpan={3} className="empty-state">
                          No classes were returned by the API.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {!isSuperadmin && !isSchoolAdmin && !isTeacher && (
          <section className="content-card">
            <h2>Your dashboard is coming next</h2>
            <p>
              The {user?.role} workspace will be implemented after the
              Superadmin, School Admin and Teacher dashboards.
            </p>
          </section>
        )}
      </section>
    </main>
  );
}
