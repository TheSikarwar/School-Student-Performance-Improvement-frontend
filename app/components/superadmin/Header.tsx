
"use client";

type HeaderProps = {
  title: string;
  onMenuClick: () => void;
  onRefresh: () => void;
};

export default function Header({
  title,
  onMenuClick,
  onRefresh,
}: HeaderProps) {
  return (
    <header className="superadmin-header">
      <div className="superadmin-header-left">
        <button
          type="button"
          className="superadmin-menu-button"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          ☰
        </button>

        <div>
          <div className="superadmin-breadcrumb">
            EDURISE / WORKSPACE
          </div>
          <h1>{title}</h1>
        </div>
      </div>

      <div className="superadmin-header-actions">
        <span className="superadmin-role-badge">
          Superadmin
        </span>

        <button
          type="button"
          className="superadmin-refresh-button"
          onClick={onRefresh}
        >
          ↻ <span>Refresh</span>
        </button>
      </div>
    </header>
  );
}
