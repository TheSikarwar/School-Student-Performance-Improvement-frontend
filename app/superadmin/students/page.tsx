"use client";
import { FormEvent, useEffect, useState } from "react";
import SuperadminPage from "../_lib/SuperadminPage";
import { readSuperadminSession, superadminRequest } from "../_lib/api";
type Student = {
  id: number;
  first_name: string;
  last_name: string;
  roll_number: string;
  class_id: number | null;
  school_name: string;
  school_code: string;
};
export default function StudentsPage() {
  const [token, setToken] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    async function init() {
      const s = readSuperadminSession();
      if (s.token) {
        try {
          const result = await superadminRequest<{ data: Student[] }>(
            "/students",
            s.token,
          );
          setStudents(result.data || []);
          setToken(s.token);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Unable to load students.");
        }
      }
    }
    void init();
  }, []);
  async function searchStudents(e?: FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (schoolCode.trim())
        params.set("school_code", schoolCode.trim().toUpperCase());
      const result = await superadminRequest<{ data: Student[] }>(
        `/students?${params.toString()}`,
        token,
      );
      setStudents(result.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <SuperadminPage
      title="Student directory"
      description="Search student records across active school tenant databases. This page is read-only; student creation and editing remain school-scoped operations."
    >
      {error && (
        <p role="alert" style={{ color: "#b42318" }}>
          {error}
        </p>
      )}
      <section style={panel}>
        <form
          onSubmit={searchStudents}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
            gap: 12,
            alignItems: "end",
          }}
        >
          <label>
            Student name / roll number
            <input
              style={field}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student"
            />
          </label>
          <label>
            School code
            <input
              style={field}
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
              placeholder="All schools"
            />
          </label>
          <button style={button} disabled={loading}>
            {loading ? "Searching…" : "Search students"}
          </button>
        </form>
        <p style={{ color: "#64748b" }}>
          {students.length} student records loaded
        </p>
        <div className="superadmin-table-wrapper">
          <table className="superadmin-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll number</th>
                <th>Class ID</th>
                <th>School</th>
                <th>School code</th>
              </tr>
            </thead>

            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td className="student-name">
                    {student.first_name} {student.last_name}
                  </td>
                  <td>{student.roll_number}</td>
                  <td>
                    {student.class_id ?? <span className="empty-value">—</span>}
                  </td>
                  <td>{student.school_name}</td>
                  <td className="school-code">{student.school_code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </SuperadminPage>
  );
}
const panel: React.CSSProperties = {
  background: "white",
  border: "1px solid #e5e9f0",
  borderRadius: 14,
  padding: 20,
};
const field: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: 10,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  marginTop: 6,
};
const button: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#fff",
  cursor: "pointer",
};
const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  textAlign: "left",
};
