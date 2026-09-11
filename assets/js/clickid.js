/**
 * Click ID capture. Cookie parsing and serialization are pure; persistence
 * takes the document and storage as arguments so it can be exercised in tests.
 * Which URL params and which cookie name to use come from the tracker profile.
 */
import { CLICKID_COOKIE_DAYS, CLICKID_STORAGE_KEY } from './constants.js';
import { TRACKERS, DEFAULT_TRACKER } from './trackers.js';
import { findClickId } from './params.js';

export function parseCookies(cookieString) {
  return Object.freeze(
    String(cookieString ?? '')
      .split(';')
      .reduce((acc, part) => {
        const idx = part.indexOf('=');
        if (idx < 1) return acc;
        const name = part.slice(0, idx).trim();
        if (name === '') return acc;
        try {
          return { ...acc, [name]: decodeURIComponent(part.slice(idx + 1).trim()) };
        } catch {
          // A malformed escape sequence should not hide the rest of the cookies.
          return { ...acc, [name]: part.slice(idx + 1).trim() };
        }
      }, {}),
  );
}

/**
 * No Domain attribute is set on purpose: github.io is on the public suffix
 * list, so a Domain cookie would be rejected there. Test cross-subdomain
 * behavior on a custom domain instead.
 */
export function serializeCookie(name, value, { days = CLICKID_COOKIE_DAYS, now = new Date() } = {}) {
  const expires = new Date(now.getTime() + days * 86400000).toUTCString();
  return `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/** URL wins over cookie, cookie wins over localStorage. */
export function resolveClickId({ params = {}, cookies = {}, stored = null, tracker = TRACKERS[DEFAULT_TRACKER] } = {}) {
  const fromUrl = findClickId(params, tracker.clickParams);
  if (fromUrl !== '') return Object.freeze({ clickid: fromUrl, source: 'url' });

  const fromCookie = String(cookies[tracker.cookie] ?? '').trim();
  if (fromCookie !== '') return Object.freeze({ clickid: fromCookie, source: 'cookie' });

  const fromStorage = String(stored ?? '').trim();
  if (fromStorage !== '') return Object.freeze({ clickid: fromStorage, source: 'localStorage' });

  return Object.freeze({ clickid: '', source: 'none' });
}

/** Write the click ID to the tracker's cookie and to localStorage. */
export function persistClickId(doc, storage, clickid, cookieName = TRACKERS[DEFAULT_TRACKER].cookie) {
  const value = String(clickid ?? '').trim();
  if (value === '') {
    return Object.freeze({ ok: false, errors: Object.freeze(['No click ID to persist.']) });
  }

  const errors = [];
  try {
    doc.cookie = serializeCookie(cookieName, value);
  } catch (err) {
    errors.push(`Could not write the ${cookieName} cookie: ${err.message}`);
  }
  try {
    storage?.setItem?.(CLICKID_STORAGE_KEY, value);
  } catch (err) {
    errors.push(`Could not write the click ID to localStorage: ${err.message}`);
  }

  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}

export function readStoredClickId(storage) {
  try {
    return storage?.getItem?.(CLICKID_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}
