/**
 * Cookie used by middleware to know if the user is logged in (server-side).
 * Set when token is saved (login/refresh); cleared on logout.
 */
export const AUTH_COOKIE_NAME = "auth-token";

export function setAuthCookie(token: string): void {
  if (typeof document === "undefined") return;
  const value = token.replace("Bearer ", "");
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=86400; samesite=lax`;
}

export function removeAuthCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0`;
}
