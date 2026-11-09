"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import SuperadminPage from "../_lib/SuperadminPage";
import { readSuperadminSession, superadminRequest } from "../_lib/api";

type School = {
  id: number;
  name: string;
  code: string;
  status: string;
  created_at?: string | null;
};

type Admin = {
  id: number;
  full_name: string;
  email: string;
  is_active: boolean;
  created_at?: string | null;
};

const panel: React.CSSProperties = {
  background: "#fff",
  border: "1px solid var(--superadmin-border, #e2e9eb)",
  borderRadius: 14,
  padding: 20,
  marginBottom: 18,
};

const field: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  marginTop: 6,
  background: "#fff",
  color: "#173e51",
  boxSizing: "border-box",
};

const button: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#173e51",
  cursor: "pointer",
};

export default function SchoolsPage() {
  // Read the token during initialization instead of setting it in an effect.
  const [token] = useState(() => readSuperadminSession().token);

  const [schools, setSchools] = useState<School[]>([]);
  const [selected, setSelected] = useState<number | "">("");
  const [admins, setAdmins] = useState<Admin[]>([]);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadSchools = useCallback(async (currentToken: string) => {
    const result = await superadminRequest<{ schools: School[] }>(
      "/schools",
      currentToken,
    );

    setSchools(result.schools || []);
  }, []);

  // Load schools when the page mounts.

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    superadminRequest<{ schools: School[] }>("/schools", token)
      .then((result) => {
        if (!cancelled) {
          setSchools(result.schools || []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load schools.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const loadAdmins = useCallback(
    async (schoolId: number, currentToken = token) => {
      const result = await superadminRequest<{ admins: Admin[] }>(
        `/schools/${schoolId}/admins`,
        currentToken,
      );

      setAdmins(result.admins || []);
    },
    [token],
  );

  // Load admins when a school is selected.

  useEffect(() => {
    if (selected === "") return;

    let cancelled = false;

    superadminRequest<{ admins: Admin[] }>(`/schools/${selected}/admins`, token)
      .then((result) => {
        if (!cancelled) {
          setAdmins(result.admins || []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load admins.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selected, token]);

  // Create school.
  async function createSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await superadminRequest("/schools", token, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
        }),
      });

      setName("");
      setCode("");

      await loadSchools(token);

      setNotice(
        "School created. Tenant provisioning result is shown by its status.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create school.");
    } finally {
      setBusy(false);
    }
  }

  // Activate or deactivate school.
  async function toggleSchool(school: School) {
    const nextStatus =
      school.status?.toLowerCase() === "active" ? "inactive" : "active";

    const action = nextStatus === "inactive" ? "Deactivate" : "Activate";

    if (!window.confirm(`${action} ${school.name}?`)) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await superadminRequest(`/schools/${school.id}`, token, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus }),
      });

      await loadSchools(token);

      setNotice(`${school.name} updated.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update school.");
    } finally {
      setBusy(false);
    }
  }

  // Create school administrator.
  async function createAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selected === "") return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await superadminRequest(`/schools/${selected}/admins`, token, {
        method: "POST",
        body: JSON.stringify({
          full_name: adminName.trim(),
          email: email.trim(),
          password,
        }),
      });

      setAdminName("");
      setEmail("");
      setPassword("");

      await loadAdmins(selected);

      setNotice("School Admin account created.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create administrator.",
      );
    } finally {
      setBusy(false);
    }
  }

  // Activate or deactivate school administrator.
  async function toggleAdmin(admin: Admin) {
    if (selected === "") return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await superadminRequest(
        `/schools/${selected}/admins/${admin.id}`,
        token,
        {
          method: "PATCH",
          body: JSON.stringify({
            is_active: !admin.is_active,
          }),
        },
      );

      await loadAdmins(selected);

      setNotice("Administrator status updated.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update administrator.",
      );
    } finally {
      setBusy(false);
    }
  }

  // Search schools.
  const filtered = schools.filter((school) =>
    `${school.name} ${school.code} ${school.status}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  return (
    <SuperadminPage
      title="Schools & administrators"
      description="Create schools, manage their active status and provision School Admin accounts."
    >
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

      {/* Create School */}
      <section style={panel}>
        <h2>Create school</h2>

        <form
          onSubmit={createSchool}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
            alignItems: "end",
          }}
        >
          <label>
            School name
            <input
              style={field}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={150}
            />
          </label>

          <label>
            School code
            <input
              style={field}
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              required
              minLength={3}
              maxLength={50}
            />
          </label>

          <button type="submit" style={button} disabled={busy}>
            {busy ? "Please wait..." : "Create school"}
          </button>
        </form>
      </section>

      {/* School Directory */}
      <section style={panel}>
        <h2>School directory</h2>

        <input
          style={field}
          placeholder="Search schools by name, code or status"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search schools by name, code or status"
        />

        <div className="superadmin-table-wrapper">
          <table className="superadmin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>School</th>
                <th>Code</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((school) => (
                <tr key={school.id}>
                  <td>{school.id}</td>

                  <td className="school-name">{school.name}</td>

                  <td className="school-code">{school.code}</td>

                  <td>
                    <span
                      className={`school-status ${
                        school.status?.toLowerCase() !== "active"
                          ? "inactive"
                          : ""
                      }`}
                    >
                      {school.status}
                    </span>
                  </td>

                  <td>
                    {school.created_at
                      ? new Date(school.created_at).toLocaleDateString("en-IN")
                      : "—"}
                  </td>

                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="table-action-btn"
                        onClick={() => {
                          setAdmins([]);
                          setSelected(school.id);
                          setError("");
                          setNotice(
                            `Managing administrators for ${school.name}.`,
                          );
                        }}
                        disabled={busy}
                      >
                        Manage admins
                      </button>

                      <button
                        type="button"
                        className="table-action-btn table-action-danger"
                        onClick={() => void toggleSchool(school)}
                        disabled={busy}
                      >
                        {school.status?.toLowerCase() === "active"
                          ? "Deactivate"
                          : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!filtered.length && (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      color: "#64748b",
                    }}
                  >
                    {search
                      ? "No schools match your search."
                      : "No schools found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* School Admin Management */}
      <section style={panel}>
        <h2>School Admin management</h2>

        <label>
          Select school
          <select
            style={field}
            value={selected}
            onChange={(event) => {
              setAdmins([]);
              setSelected(event.target.value ? Number(event.target.value) : "");
            }}
          >
            <option value="">Choose a school</option>

            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name} ({school.code}) — {school.status}
              </option>
            ))}
          </select>
        </label>

        {selected !== "" && (
          <>
            <form
              onSubmit={createAdmin}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: 12,
                alignItems: "end",
                marginTop: 18,
              }}
            >
              <label>
                Full name
                <input
                  style={field}
                  value={adminName}
                  onChange={(event) => setAdminName(event.target.value)}
                  required
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  style={field}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>

              <label>
                Temporary password
                <input
                  type="password"
                  minLength={8}
                  style={field}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>

              <button type="submit" style={button} disabled={busy}>
                {busy ? "Please wait..." : "Add School Admin"}
              </button>
            </form>

            {/* Admin Directory */}
            <div className="superadmin-table-wrapper" style={{ marginTop: 18 }}>
              <table className="superadmin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.id}>
                      <td className="school-name">{admin.full_name}</td>

                      <td>{admin.email}</td>

                      <td>
                        <span
                          className={`school-status ${
                            admin.is_active ? "" : "inactive"
                          }`}
                        >
                          {admin.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td>
                        {admin.created_at
                          ? new Date(admin.created_at).toLocaleDateString(
                              "en-IN",
                            )
                          : "—"}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="table-action-btn table-action-danger"
                          onClick={() => void toggleAdmin(admin)}
                          disabled={busy}
                        >
                          {admin.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!admins.length && (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          textAlign: "center",
                          color: "#64748b",
                        }}
                      >
                        No School Admin accounts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </SuperadminPage>
  );
}
