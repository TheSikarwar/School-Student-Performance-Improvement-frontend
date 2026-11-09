
"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import "./superadmin.css";

type AdminLayoutProps = {
  children: ReactNode;
};

const pageTitles: Record<string, string> = {
  "/superadmin": "Platform overview",
  "/superadmin/schools": "School management",
  "/superadmin/students": "Student directory",
  "/superadmin/usage": "AI usage",
  "/superadmin/subscriptions": "Subscriptions & plans",
};

export default function AdminLayout({
  children,
}: AdminLayoutProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const title =
    pageTitles[pathname] ||
    Object.entries(pageTitles).find(
      ([path]) =>
        path !== "/superadmin" &&
        pathname.startsWith(`${path}/`)
    )?.[1] ||
    "Superadmin workspace";

  return (
    <div className="superadmin-layout">
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <main className="superadmin-main">
        <Header
          title={title}
          onMenuClick={() => setMobileOpen(true)}
          onRefresh={() => window.location.reload()}
        />

        <div className="superadmin-content">
          {children}
        </div>
      </main>
    </div>
  );
}
