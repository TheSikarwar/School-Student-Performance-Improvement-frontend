const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

type ApiOptions = RequestInit & {
  skipAuth?: boolean;
};
let isRedirecting = false;
function getSchoolCode(): string {
  if (typeof window === "undefined") return "";

  const storedCode = localStorage.getItem("school_code");
  if (storedCode) return storedCode.toUpperCase();

  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return (user.school_code || "").toUpperCase();
  } catch {
    return "";
  }
}

function handleUnauthorized(): void {
  if (typeof window === "undefined" || isRedirecting) return;

  isRedirecting = true;

  const schoolCode =
    getSchoolCode() ||
    window.location.pathname.match(/^\/school\/([^/]+)/i)?.[1] ||
    "";

  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
  localStorage.removeItem("school_code");

  if (schoolCode) {
    window.location.replace(
      `/school/${encodeURIComponent(schoolCode)}/login`
    );
  } else if (window.location.pathname.startsWith("/superadmin")) {
    window.location.replace("/superadmin/login");
  } else {
    window.location.replace("/login");
  }
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { skipAuth = false, headers, ...requestOptions } = options;

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...requestOptions,
    headers: {
      ...(requestOptions.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...headers,
      ...(!skipAuth && token
        ? { Authorization: `Bearer ${token}` }
        : {}),
    },
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Session expired. Please log in again.");
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      result?.message ||
      result?.error ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return result as T;
}
