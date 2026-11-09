"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Password reset API integration will be added here.
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="w-full border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
              E
            </span>

            <span className="text-2xl font-bold tracking-tight text-slate-900">
              Edu<span className="text-blue-600">Rise</span>
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <section className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">

            {/* Icon */}
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              Forgot your password?
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              No worries! Enter your registered email address below.
              We will help you recover access to your EduRise account.
            </p>

            {!submitted ? (
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Email address
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your registered email"
                    autoComplete="email"
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
                >
                  Continue
                </button>
              </form>
            ) : (
              <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">
                  Password recovery is not available yet.
                </p>
                <p className="mt-2 text-sm leading-6 text-amber-800">
                  Please contact your school administrator to recover access
                  to your account.
                </p>
              </div>
            )}

            <div className="mt-8 border-t border-slate-100 pt-6 text-center">
              <Link
                href="/"
                className="text-sm font-semibold text-blue-600 transition hover:text-blue-700"
              >
                ← Back to Login
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} EduRise. All rights reserved.
          </p>
        </div>
      </section>
    </main>
  );
}