
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./Sidebar.module.css";

type UserRole =
  | "superadmin"
  | "school_admin"
  | "teacher"
  | "parent"
  | "student";

type SidebarProps = {
  role: UserRole;
  schoolCode?: string;
  fullName?: string;
};

type MenuItem = {
  label: string;
  href?: string;
  icon: string;
  comingSoon?: boolean;
};

export default function Sidebar({
  role,
  schoolCode = "",
  fullName = "EduRise User",
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const schoolBase = `/school/${encodeURIComponent(
    schoolCode.toUpperCase()
  )}`;

  const schoolMenus: MenuItem[] = [
    { label: "Overview", href: `${schoolBase}/dashboard`, icon: "▦" },
    { label: "Classes", href: `${schoolBase}/classes`, icon: "▣" },
    { label: "Students", href: `${schoolBase}/students`, icon: "♟" },
    { label: "Teachers", href: `${schoolBase}/teachers`, icon: "♙" },
    { label: "Parents", href: `${schoolBase}/parents`, icon: "♧" },
    { label: "Marks Management", href: `${schoolBase}/marks`, icon: "▤" },
    {
      label: "Timetable Management",
      href: `${schoolBase}/timetable`,
      icon: "▤",
    },
    { label: "Reports & Analytics", href: `${schoolBase}/reports`, icon: "▥" },
  ];

  const teacherMenus: MenuItem[] = [
    { label: "Overview", href: `${schoolBase}/dashboard`, icon: "▦" },
    { label: "Classes", href: `${schoolBase}/classes`, icon: "▣" },
    { label: "Students", href: `${schoolBase}/students`, icon: "♟" },
    { label: "Marks Management", href: `${schoolBase}/marks`, icon: "▤" },
    {
      label: "My Timetable",
      href: `${schoolBase}/timetable`,
      icon: "▤",
    },
    { label: "Reports & Analytics", href: `${schoolBase}/reports`, icon: "▥" },
  ];

  const superadminMenus: MenuItem[] = [
    { label: "Overview", href: "/dashboard", icon: "▦" },
    { label: "Schools", href: "/superadmin/schools", icon: "▤" },
  ];

  const menus =
    role === "superadmin"
      ? superadminMenus
      : role === "teacher"
        ? teacherMenus
        : schoolMenus;

  function isActive(href?: string) {
    if (!href) return false;

    return href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  function logout() {
    const redirectPath =
      role === "superadmin" ? "/" : `${schoolBase}/login`;

    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("school_code");

    router.replace(redirectPath);
  }

  return (
    <aside className={styles.dashboardSidebar}>
      <Link className={styles.brand} href="/">
        <span className={styles.brandMark}>E</span>
        <span>
          Edu<span>Rise</span>
        </span>
      </Link>

      <div className={styles.sidebarLabel}>WORKSPACE</div>

      <nav className={styles.navigation} aria-label="Main navigation">
        {menus.map((item) => {
          const active = isActive(item.href);

          return (
            <div key={item.label}>
              {item.href ? (
                <Link
                  href={item.href}
                  className={`${styles.link} ${active ? styles.active : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className={styles.icon}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ) : (
                <div
                  className={`${styles.link} ${styles.disabled}`}
                  aria-disabled="true"
                  title="This module is not implemented yet"
                >
                  <span className={styles.icon}>{item.icon}</span>
                  <span>{item.label}</span>

                  {item.comingSoon && (
                    <span className={styles.comingSoon}>Soon</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className={styles.sidebarBottom}>
        <div className={styles.avatar}>
          {fullName.trim().charAt(0).toUpperCase()}
        </div>

        <div className={styles.userMeta}>
          <strong>{fullName}</strong>
          <span>{role.replace("_", " ")}</span>
        </div>

        <button
          type="button"
          className={styles.logoutButton}
          onClick={logout}
          title="Sign out"
          aria-label="Sign out"
        >
          ↪
        </button>
      </div>
    </aside>
  );
}
