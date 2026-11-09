"use client";

import "./loading.css";

type LoadingProps = {
  message?: string;
  fullScreen?: boolean;
  overlay?: boolean;
};

export default function Loading({
  message = "Please wait while we get things ready...",
  fullScreen = true,
  overlay = false,
}: LoadingProps) {
  const className = [
    "edurise-loading",
    fullScreen ? "edurise-loading--fullscreen" : "edurise-loading--inline",
    overlay ? "edurise-loading--overlay" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="edurise-loading__content">
        <div className="edurise-loading__spinner" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <p className="edurise-loading__message">{message}</p>
        <span className="edurise-loading__brand">EduRise</span>
      </div>
    </div>
  );
}
