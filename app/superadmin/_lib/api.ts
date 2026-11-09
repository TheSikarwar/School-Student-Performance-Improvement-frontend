export const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type SessionUser = {
  id: number;
  email: string;
  full_name?: string;
  role: string;
};

export function readSuperadminSession() {
  if (typeof window === "undefined") return { token: "", user: null as SessionUser | null };
  const token = localStorage.getItem("access_token") || "";
  try {
    const raw = localStorage.getItem("user");
    const user = raw ? (JSON.parse(raw) as SessionUser) : null;
    return { token, user };
  } catch {
    return { token, user: null };
  }
}

export async function superadminRequest<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || payload.error || `Request failed (${response.status}).`);
  }
  return payload as T;
}
