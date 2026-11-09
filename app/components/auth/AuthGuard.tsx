"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { useParams, usePathname, useRouter } from "next/navigation";

type UserRole =
  | "superadmin"
  | "school_admin"
  | "teacher"
  | "parent"
  | "student";

type AuthUser = {
  role: UserRole;
  school_code?: string;
};

type AuthGuardProps = {
  children: ReactNode;
  allowedRoles: UserRole[];
};

type AuthStatus = "checking" | "authorized";

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ schoolCode?: string }>();

  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");

  const redirectToLogin = useCallback(
    (schoolCode?: string) => {
      if (pathname.startsWith("/superadmin")) {
        router.replace("/superadmin/login");
      } else if (schoolCode) {
        router.replace(`/school/${encodeURIComponent(schoolCode)}/login`);
      } else {
        router.replace("/login");
      }
    },
    [pathname, router],
  );

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const storedUser = localStorage.getItem("user");

    const routeSchoolCode = params.schoolCode?.trim().toUpperCase();

    if (!token || !storedUser) {
      redirectToLogin(routeSchoolCode);
      return;
    }

    try {
      const user: AuthUser = JSON.parse(storedUser);

      if (!user.role || !allowedRoles.includes(user.role)) {
        router.replace("/");
        return;
      }
      if (user.role === "superadmin") {
        requestAnimationFrame(() => {
          setAuthStatus("authorized");
        });
        return;
      }
      const storedSchoolCode = (localStorage.getItem("school_code") || "")
        .trim()
        .toUpperCase();

      const userSchoolCode = (user.school_code || storedSchoolCode)
        .trim()
        .toUpperCase();

      if (!userSchoolCode) {
        router.replace("/");
        return;
      }

      if (routeSchoolCode && routeSchoolCode !== userSchoolCode) {
        router.replace(
          `/school/${encodeURIComponent(userSchoolCode)}/dashboard`,
        );
        return;
      }

      localStorage.setItem("school_code", userSchoolCode);

      requestAnimationFrame(() => {
        setAuthStatus("authorized");
      });
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      localStorage.removeItem("school_code");

      redirectToLogin(routeSchoolCode);
    }
  }, [allowedRoles, params.schoolCode, redirectToLogin, router]);

  if (authStatus !== "authorized") {
    return <main>Verifying your access...</main>;
  }

  return <>{children}</>;
}
