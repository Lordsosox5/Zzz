import { setAuthTokenGetter } from "@workspace/api-client-react";

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem("ehr_token", token);
  } else {
    localStorage.removeItem("ehr_token");
  }
}

export function getToken(): string | null {
  return localStorage.getItem("ehr_token");
}

export function setUser(user: any | null) {
  if (user) {
    localStorage.setItem("ehr_user", JSON.stringify(user));
  } else {
    localStorage.removeItem("ehr_user");
  }
}

export function getUser(): any | null {
  const user = localStorage.getItem("ehr_user");
  return user ? JSON.parse(user) : null;
}

export function logout() {
  setToken(null);
  setUser(null);
  window.location.href = "/login";
}

// Initialize API client with token from local storage
setAuthTokenGetter(() => getToken());
