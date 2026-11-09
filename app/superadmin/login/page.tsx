"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SuperadminLoginPage() {
  const router = useRouter();
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
      if (!apiUrl) throw new Error("Please configure the backend API URL.");

      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok)
        throw new Error(data.error || data.message || "Unable to sign in.");
      if (!data.access_token || !data.user)
        throw new Error("The server returned an invalid login response.");
      if (data.user.role !== "superadmin")
        throw new Error(
          "This login is only for EduRise platform administrators.",
        );

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.removeItem("school_code");

      window.dispatchEvent(new Event("superadmin-session-change"));

      router.replace("/superadmin");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="edurise-page">
      <aside className="edurise-intro">
        <Link href="/" className="edurise-brand">
          <span className="edurise-logo">
            <span aria-hidden="true">E</span>
          </span>
          <span>
            Edu<span className="edurise-brand-light">Rise</span>
          </span>
        </Link>
        <div className="edurise-hero">
          <span className="edurise-eyebrow">PLATFORM ADMINISTRATION</span>
          <h1>
            Manage schools. <span>Enable growth.</span>
          </h1>
          <p>
            Access the EduRise platform workspace to manage registered schools
            and tenant access.
          </p>
        </div>
        <p className="edurise-footer">EduRise Platform Administration</p>
      </aside>

      <section className="edurise-login-area">
        <div className="edurise-login-card">
          <div className="edurise-mobile-brand">
            Edu<span>Rise</span>
          </div>
          <span className="edurise-eyebrow">SUPERADMIN PORTAL</span>
          <h2>Platform administrator sign in</h2>
          <p className="edurise-subtitle">
            Use your EduRise platform administrator account.
          </p>

          <form onSubmit={handleSubmit} className="edurise-form">
            <div className="edurise-field">
              <label htmlFor="admin-email">Email address</label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@edurise.com"
                autoComplete="username"
                required
              />
            </div>
            <div className="edurise-field">
              <div className="edurise-password-label">
                <label htmlFor="admin-password">Password</label>
                <Link href="/forgot-password">Forgot password?</Link>
              </div>
              <div className="edurise-password">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {error && (
              <p className="edurise-error" role="alert">
                {error}
              </p>
            )}
            <button className="edurise-submit" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in as platform admin"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>
          <p className="edurise-help">
            <Link href="/">← Back to school login</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
