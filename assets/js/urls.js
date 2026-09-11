/**
 * Pure URL construction for tracker endpoints. Paths and parameter names come
 * from the tracker profile in the config; nothing tracker-specific is written here.
 * Every builder returns a new string and throws a readable error when the
 * inputs cannot produce a valid URL.
 */
import { trackerOf } from './trackers.js';

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
    .filter(([key, value]) => key && value !== undefined && value !== null && String(value).trim() !== '')
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

function campaignParams(config, tracker) {
  return tracker.campaignParam ? { [tracker.campaignParam]: config?.campaignId } : {};
}

export function buildClickUrl(config, extra = {}) {
  const tracker = trackerOf(config);
  return buildTrackingUrl(config?.trackingDomain, tracker.paths.click, {
    ...campaignParams(config, tracker),
    ...extra,
  });
}

export function buildPreClickUrl(config, extra = {}) {
  const tracker = trackerOf(config);
  if (!tracker.paths.preclick) {
    throw new Error(`${tracker.label} has no /preclick two-step flow.`);
  }
  return buildTrackingUrl(config?.trackingDomain, tracker.paths.preclick, {
    ...campaignParams(config, tracker),
    ...extra,
  });
}

/**
 * Map our field names onto the tracker's postback parameter names.
 * Fields the tracker does not support (postback.<field> === null) are dropped.
 */
export function buildPostbackUrl(config, { clickid, sum, type, txid, extra = {} } = {}) {
  const tracker = trackerOf(config);
  if (String(clickid ?? '').trim() === '') {
    throw new Error('A click ID is required to build a postback URL.');
  }
  const mapped = Object.entries({ clickid, sum, type, txid }).reduce((acc, [field, value]) => {
    const key = tracker.postback[field];
    return key ? { ...acc, [key]: value } : acc;
  }, {});
  return buildTrackingUrl(config?.trackingDomain, tracker.paths.postback, { ...mapped, ...extra });
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
