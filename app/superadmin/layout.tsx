
"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import AdminLayout from "../components/superadmin/AdminLayout";

export default function SuperadminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  // Keep the login page outside the authenticated workspace layout.
  if (pathname === "/superadmin/login") {
    return <>{children}</>;
  }

  return <AdminLayout>{children}</AdminLayout>;
}
