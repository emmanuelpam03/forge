export async function signIn(email: string, password: string) {
  const res = await fetch(`/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });
  return res;
}

export async function signUp(email: string, password: string, name?: string) {
  const res = await fetch(`/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
    credentials: "include",
  });
  return res;
}

export async function signOut() {
  return fetch(`/api/auth/signout`, { method: "POST", credentials: "include" });
}

export async function getSession() {
  const res = await fetch(`/api/auth/session`, { credentials: "include" });
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}
