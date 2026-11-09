
"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { readSuperadminSession } from "./api";

interface SuperadminPageProps {
  title: string;
  description: string;
  children: ReactNode;
}

type AuthStatus = "checking" | "authorized" | "unauthorized";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("superadmin-session-change", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("superadmin-session-change", callback);
  };
}

function getSnapshot(): AuthStatus {
  const session = readSuperadminSession();

  return session.token && session.user?.role === "superadmin"
    ? "authorized"
    : "unauthorized";
}

function getServerSnapshot(): AuthStatus {
  return "checking";
}

export default function SuperadminPage({
  title,
  description,
  children,
}: SuperadminPageProps) {
  const router = useRouter();

  const authStatus = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  useEffect(() => {
    if (authStatus === "unauthorized") {
      router.replace("/superadmin/login");
    }
  }, [authStatus, router]);

  if (authStatus !== "authorized") {
    return <main>Checking Superadmin access...</main>;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: "#64748b", marginTop: 0 }}>
          {description}
        </p>
      </div>

      {children}
    </div>
  );
}
