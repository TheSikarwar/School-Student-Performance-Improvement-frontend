"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import CurrentYear from "../components/CurrentYear";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<"school" | "admin">("school");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) throw new Error("Please configure the backend API URL.");

      const payload: Record<string, string> = { email, password };
      if (accountType === "school") payload.school_code = schoolCode.trim().toUpperCase();

      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data.error || "Unable to sign in.");
      if (!data.access_token || !data.user) throw new Error("The server returned an invalid login response.");

      if (accountType === "admin" && data.user.role !== "superadmin") {
        throw new Error("This login is only for EduRise platform administrators.");
      }
      if (accountType === "school" && !["school_admin", "teacher", "parent", "student"].includes(data.user.role)) {
        throw new Error("This account is not permitted to use the school login.");
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (accountType === "school") {
        const code = schoolCode.trim().toUpperCase();
        localStorage.setItem("school_code", code);
        window.location.assign(`/school/${code}/dashboard`);
      } else {
        localStorage.removeItem("school_code");
        window.location.assign("/superadmin");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="edurise-page">
      <aside className="edurise-intro">
        <Link href="/" className="edurise-brand">
          <span className="edurise-logo" aria-hidden="true">E</span>
          <span>Edu<span className="edurise-brand-light">Rise</span></span>
        </Link>
        <div className="edurise-hero">
          <span className="edurise-eyebrow">A BETTER WAY TO LEARN</span>
          <h1>Every student has the potential to <span>rise.</span></h1>
          <p>Understand performance, discover opportunities, and help every learner move forward with confidence.</p>
          <div className="edurise-benefit"><span>✓</span><div><strong>Meaningful insights</strong><p>Understand student progress at a glance.</p></div></div>
          <div className="edurise-benefit"><span>✓</span><div><strong>Personalized improvement</strong><p>Turn performance data into actionable plans.</p></div></div>
        </div>
        <p className="edurise-footer">Student Performance &amp; School Management Platform</p>
      </aside>

      <section className="edurise-login-area">
        <div className="edurise-login-card">
          <Link href="/" className="edurise-mobile-brand">Edu<span>Rise</span></Link>
          <span className="edurise-eyebrow">WELCOME BACK</span>
          <h2>Sign in to EduRise</h2>
          <p className="edurise-subtitle">Enter your account details to continue.</p>
          <div className="edurise-tabs">
            <button type="button" className={accountType === "school" ? "selected" : ""} onClick={() => { setAccountType("school"); setError(""); }}>School account</button>
            <button type="button" className={accountType === "admin" ? "selected" : ""} onClick={() => { setAccountType("admin"); setError(""); }}>Platform admin</button>
          </div>
          <form onSubmit={handleLogin} className="edurise-form">
            {accountType === "school" && <div className="edurise-field"><label htmlFor="schoolCode">School code</label><input id="schoolCode" value={schoolCode} onChange={(event) => setSchoolCode(event.target.value)} placeholder="Enter your school code" autoComplete="organization" required /></div>}
            <div className="edurise-field"><label htmlFor="email">Email address</label><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@school.com" autoComplete="username" required /></div>
            <div className="edurise-field">
              <div className="edurise-password-label"><label htmlFor="password">Password</label><Link href="/forgot-password">Forgot password?</Link></div>
              <div className="edurise-password"><input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button></div>
            </div>
            {error && <p className="edurise-error" role="alert">{error}</p>}
            <button className="edurise-submit" type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in to your account"} {!loading && <span aria-hidden="true">→</span>}</button>
          </form>
          <p className="edurise-help">Need help accessing your account? Contact your school administrator.</p>
          <p className="edurise-help">Platform administrator? <Link href="/superadmin/login">Use the dedicated admin login</Link></p>
          <p className="edurise-legal">© <CurrentYear /> EduRise</p>
        </div>
      </section>
    </main>
  );
}
