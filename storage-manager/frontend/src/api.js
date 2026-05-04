import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:5000",
});

export const log = (...args) => console.log("[WEB]", ...args);

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sm_token"); // ✅ matches AuthContext.jsx
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
  console.log('[WEB] token in interceptor:', token ? token.slice(0, 20) + '...' : null);
});