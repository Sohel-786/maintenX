          import axios, { AxiosInstance } from "axios";

// Axios instance: cookies + optional X-Company-Id / X-Location-Id for scoped APIs.
const api: AxiosInstance = axios.create({
  withCredentials: true,
  // Use relative /api in both Dev and Prod to leverage:
  // - dev-only Next rewrites: /api/* -> backend port
  // - production: backend serves /api/* on the same IIS port
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
});

function getSelectedOrgContext(): { companyId: number; locationId: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("selectedOrgContext");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.companyId === "number" && typeof parsed?.locationId === "number") return parsed;
  } catch {
    // ignore
  }
  return null;
}

// Attach company/location headers for scoped APIs
api.interceptors.request.use((config) => {
  const sel = getSelectedOrgContext();
  if (sel) {
    config.headers = config.headers || {};
    config.headers["X-Company-Id"] = sel.companyId;
    config.headers["X-Location-Id"] = sel.locationId;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If the request was cancelled (e.g. by browser navigation or React unmount), don't log or redirect.
    if (error.code === 'ERR_CANCELED' || axios.isCancel(error)) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      const requestUrl: string | undefined = error.config?.url;
      const backendMessage: string | undefined = error.response?.data?.message;

      // For login itself, just bubble the error (no full page reload)
      const isLoginRequest =
        requestUrl?.includes("/auth/login") ||
        requestUrl?.endsWith("/auth/login");

      const isLocationContextIssue =
        typeof backendMessage === "string" &&
        (backendMessage.includes("X-Location-Id") ||
          backendMessage.toLowerCase().includes("location") ||
          backendMessage.toLowerCase().includes("access to this location"));

      if (isLocationContextIssue && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("orgContextRequired", { detail: { message: backendMessage } }));
        // Don't redirect to login; let UI ask for company/location selection.
        return Promise.reject(error);
      }

      if (
        !isLoginRequest &&
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        // Redirect to login on unauthorized for protected API calls.
        // Use a small check to avoid multiple simultaneous redirects if many requests fail at once.
        if (!(window as any)._isRedirectingToLogin) {
          (window as any)._isRedirectingToLogin = true;
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
