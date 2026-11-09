
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type LoginFormProps = {
  schoolCode: string;
};

type LoginResponse = {
  message?: string;
  error?: string;
  access_token?: string;
  token_type?: string;
  user?: {
    id: number;
    email: string;
    role: string;
    full_name?: string;
    school_id?: number;
    school_code?: string;
    [key: string]: unknown;
  };
};

export default function LoginForm({ schoolCode: rawSchoolCode }: LoginFormProps) {
  const router = useRouter();
  const schoolCode = rawSchoolCode.trim().toUpperCase();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        throw new Error("Frontend API URL is not configured.");
      }

      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          school_code: schoolCode,
          email: email.trim(),
          password,
        }),
      });

      const data: LoginResponse = await response.json();

      if (!response.ok) {
        if (data.error === "INVALID_SCHOOL_CODE") {
          throw new Error(
            "Invalid school code. Please check your school login link."
          );
        }

        if (data.error === "SCHOOL_DATABASE_UNAVAILABLE") {
          throw new Error(
            "This school's login service is temporarily unavailable. Please contact your school administrator."
          );
        }

        if (data.error === "INVALID_CREDENTIALS") {
          throw new Error("Invalid email or password.");
        }

        throw new Error(
          data.message || data.error || "Unable to sign in. Please try again."
        );
      }

      if (!data.access_token || !data.user) {
        throw new Error("The server returned an invalid login response.");
      }

      const allowedRoles = [
        "school_admin",
        "teacher",
        "parent",
        "student",
      ];

      if (!allowedRoles.includes(data.user.role)) {
        throw new Error(
          "Your account role is not supported for school login."
        );
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("school_code", schoolCode);

      // The shared school login accepts school administrators, teachers, parents and students.
      // Their workspace is selected by the authenticated role on the dashboard.
      router.replace(`/school/${schoolCode}/dashboard`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <Link href="/" className="brand">
          <span className="brand-icon">E</span>
          <span>
            Edu<span className="brand-light">Rise</span>
          </span>
        </Link>

        <div className="brand-content">
          <span className="eyebrow">
            SMARTER SCHOOLS. BETTER FUTURES.
          </span>

          <h1>Every student deserves the chance to excel.</h1>

          <p>
            Bring student performance, teacher insights and personalized
            learning support together in one platform.
          </p>

          <div className="brand-stat">
            <span className="stat-dot" />
            One platform for your entire school
          </div>
        </div>

        <p className="brand-footer">
          Student Performance &amp; School Management Platform
        </p>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-container">
          <Link href="/" className="mobile-brand brand">
            <span className="brand-icon">E</span>
            <span>
              Edu<span className="brand-light">Rise</span>
            </span>
          </Link>

          <span className="eyebrow">SCHOOL PORTAL</span>

          <h2>Welcome back</h2>

          <p className="auth-description">
            Sign in to access your school account.
          </p>

          <div className="form-field">
            <label htmlFor="schoolCode">School code</label>
            <input
              id="schoolCode"
              value={schoolCode}
              readOnly
              aria-label="School code from URL"
            />
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@school.com"
                autoComplete="username"
                required
              />
            </div>

            <div className="form-field">
              <div className="password-label">
                <label htmlFor="password">Password</label>
                <Link href="/forgot-password">
                  Forgot password?
                </Link>
              </div>

              <div className="password-input">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in to your school"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="auth-note">
            Having trouble signing in? Contact your school administrator.
          </p>
        </div>
      </section>
    </main>
  );
}
