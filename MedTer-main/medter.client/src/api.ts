import axios from "axios";

// In production the app is served from the same origin as the API (ASP.NET wwwroot),
// so use relative URLs. In dev the API runs on a separate port.
export const API_BASE = import.meta.env.PROD ? "" : "http://medter.runasp.net";

const api = axios.create({ baseURL: `${API_BASE}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
