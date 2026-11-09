
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type SidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
};

const navigation = [
  { label: "Overview", href: "/superadmin", icon: "▦" },
  { label: "Schools", href: "/superadmin/schools", icon: "▤" },
  { label: "Students", href: "/superadmin/students", icon: "♙" },
  { label: "AI Usage", href: "/superadmin/usage", icon: "✧" },
  {
    label: "Subscriptions",
    href: "/superadmin/subscriptions",
    icon: "▣",
  },
];

export default function Sidebar({
  mobileOpen,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("school_code");

    router.replace("/superadmin/login");
  }

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="superadmin-overlay"
          onClick={onClose}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={`superadmin-sidebar ${
          mobileOpen ? "superadmin-sidebar-open" : ""
        }`}
      >
        <Link
          href="/superadmin"
          className="superadmin-brand"
          onClick={onClose}
        >
          <span className="superadmin-brand-icon">E</span>
          <span>
            Edu<span className="superadmin-brand-light">Rise</span>
          </span>
        </Link>

        <div className="superadmin-nav-heading">
          WORKSPACE
        </div>

        <nav className="superadmin-navigation">
          {navigation.map((item) => {
            const active =
              item.href === "/superadmin"
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`superadmin-nav-link ${
                  active ? "active" : ""
                }`}
              >
                <span className="superadmin-nav-icon">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="superadmin-sidebar-footer">
          <div className="superadmin-profile">
            <div className="superadmin-avatar">SA</div>

            <div className="superadmin-profile-info">
              <strong>Super Admin</strong>
              <span>Superadmin</span>
            </div>

            <button
              type="button"
              className="superadmin-logout"
              onClick={logout}
              title="Logout"
              aria-label="Logout"
            >
              ↪
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
