/**
 * Pure URL construction for RedTrack endpoints.
 * Every builder returns a new string and throws a readable error when the
 * inputs cannot produce a valid URL.
 */
import { CLICK_PATH, PRECLICK_PATH, POSTBACK_PATH } from './constants.js';

/** Strip scheme, whitespace and trailing slashes from a tracking domain. */
export function normalizeDomain(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
    .replace(/\s+/g, '');
}

function queryString(params) {
  const pairs = Object.entries(params ?? {})
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([key, value]) => [key, String(value)]);
  const qs = new URLSearchParams(pairs).toString();
  return qs === '' ? '' : `?${qs}`;
}

export function buildTrackingUrl(domain, path, params = {}) {
  const host = normalizeDomain(domain);
  if (host === '') throw new Error('Tracking domain is not configured.');
  const cleanPath = String(path ?? '').replace(/^\/+/, '');
  return `https://${host}/${cleanPath}${queryString(params)}`;
}

export function buildClickUrl(config, extra = {}) {
  return buildTrackingUrl(config?.trackingDomain, CLICK_PATH, {
    cmpid: config?.campaignId,
    ...extra,
  });
}

export function buildPreClickUrl(config, extra = {}) {
  return buildTrackingUrl(config?.trackingDomain, PRECLICK_PATH, {
    cmpid: config?.campaignId,
    ...extra,
  });
}

export function buildPostbackUrl(domain, { clickid, sum, type, extra = {} } = {}) {
  if (String(clickid ?? '').trim() === '') {
    throw new Error('A click ID is required to build a postback URL.');
  }
  return buildTrackingUrl(domain, POSTBACK_PATH, { clickid, sum, type, ...extra });
}

/** Merge params into an absolute URL. Supplied params win over existing ones. */
export function appendParams(baseUrl, params = {}) {
  const raw = String(baseUrl ?? '').trim();
  if (raw === '') throw new Error('Offer URL is empty.');

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`"${raw}" is not a valid absolute URL (include https://).`);
  }

  const kept = [...new URLSearchParams(url.search).entries()].filter(
    ([key]) => !Object.prototype.hasOwnProperty.call(params, key),
  );
  const added = Object.entries(params)
    .filter(([, value]) => String(value ?? '').trim() !== '')
    .map(([key, value]) => [key, String(value)]);
  const qs = new URLSearchParams([...kept, ...added]).toString();

  return `${url.origin}${url.pathname}${qs === '' ? '' : `?${qs}`}${url.hash}`;
}
