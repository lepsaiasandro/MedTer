import axios from "axios";

// Production: same origin as the API (ASP.NET wwwroot).
// Dev: local backend by default (override with VITE_API_BASE if needed).
export const API_BASE = import.meta.env.PROD
  ? ""
  : (import.meta.env.VITE_API_BASE as string | undefined) || "http://localhost:5234";

const api = axios.create({ baseURL: `${API_BASE}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
