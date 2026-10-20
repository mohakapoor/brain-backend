import type { Context } from 'hono'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'

export const SESSION_COOKIE_NAME = 'session_id'

/**
 * Sets the active session cookie with standard secure defaults:
 * HttpOnly (blocks client JS access), Secure (HTTPS only), SameSite=Lax, path=/
 */
export const setSessionCookie = (c: Context, sessionId: string, maxAge: number): void => {
  setCookie(c, SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge,
    path: '/',
  })
}

/**
 * Reads the active session ID from incoming request cookies.
 */
export const getSessionCookie = (c: Context): string | undefined => {
  return getCookie(c, SESSION_COOKIE_NAME)
}

/**
 * Clears the active session cookie from the client's browser.
 */
export const clearSessionCookie = (c: Context): void => {
  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: '/',
    secure: true,
    sameSite: 'Lax',
  })
}
