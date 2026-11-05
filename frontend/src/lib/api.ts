import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export const api = axios.create({
  baseURL: `${API_URL}/v1`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Auth endpoints must never trigger the refresh-and-retry flow themselves,
// otherwise a failed refresh would recurse and force a spurious logout.
const AUTH_PATHS = ["/auth/login", "/auth/refresh", "/auth/logout"];

// Single-flight refresh: concurrent 401s (e.g. several queries on one page)
// share ONE refresh request instead of firing a storm of them.
let refreshPromise: Promise<void> | null = null;

function refreshSession(): Promise<void> {
  if (!refreshPromise) {
    // Use a bare axios call (not `api`) so this request does NOT pass through
    // the interceptor below — a 401 here resolves to a single logout, never a loop.
    refreshPromise = axios
      .post(`${API_URL}/v1/auth/refresh`, null, { withCredentials: true })
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function forceLogout() {
  if (typeof window === "undefined") return;
  // Clear persisted auth so the app state matches the expired session.
  try {
    localStorage.removeItem("gms-auth");
  } catch {
    /* ignore */
  }
  const isAdmin = window.location.pathname.startsWith("/admin");
  const target = isAdmin ? "/admin/login" : "/login";
  if (window.location.pathname !== target) {
    window.location.href = target;
  }
}

// Response interceptor: on 401, try a single refresh, retry once, else log out.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url: string = originalRequest?.url ?? "";
    const isAuthPath = AUTH_PATHS.some((p) => url.includes(p));

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthPath) {
      originalRequest._retry = true;
      try {
        await refreshSession();
        return api(originalRequest);
      } catch {
        forceLogout();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
