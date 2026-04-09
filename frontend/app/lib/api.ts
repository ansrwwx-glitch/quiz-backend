import Client, { Environment } from "./client";

const API_URL = "https://staging-quiz-backend-wbii.encr.app";

export function getClient(token?: string) {
  return new Client(Environment("staging"), {
    auth: token ?? getToken() ?? "",
  });
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function getRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("role");
}

export function saveAuth(token: string, role: string) {
  localStorage.setItem("token", token);
  localStorage.setItem("role", role);
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
}

export function isLoggedIn(): boolean {
  return !!getToken();
}
