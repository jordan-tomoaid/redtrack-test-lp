/**
 * Pure query-string analysis. No DOM, no network.
 */
import { TRACKING_PARAMS } from './constants.js';
import { TRACKERS, DEFAULT_TRACKER } from './trackers.js';

const SUB_PATTERN = /^sub_?\d+$/;

/**
 * Parse a query string into a frozen flat object.
 * Repeated keys are joined with ", " so duplicates stay visible instead of
 * being silently dropped.
 */
export function parseQuery(search) {
  const raw = typeof search === 'string' ? search : '';
  const usp = new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw);
  return Object.freeze(
    [...usp.keys()].reduce(
      (acc, key) => (key in acc ? acc : { ...acc, [key]: usp.getAll(key).join(', ') }),
      {},
    ),
  );
}

function bucketFor(name) {
  const lower = name.toLowerCase();
  if (TRACKING_PARAMS.includes(lower)) return 'tracking';
  if (SUB_PATTERN.test(lower)) return 'sub';
  if (lower.startsWith('utm_')) return 'utm';
  return 'other';
}

/** Group params into tracking / sub / utm / other, preserving input order. */
export function classifyParams(params) {
  const entries = Object.entries(params ?? {});
  return Object.freeze(
    entries.reduce(
      (acc, [name, value]) => {
        const bucket = bucketFor(name);
        return { ...acc, [bucket]: [...acc[bucket], Object.freeze({ name, value })] };
      },
      { tracking: [], sub: [], utm: [], other: [] },
    ),
  );
}

/** First non-empty click ID param (in the tracker's priority order), or "" when none is present. */
export function findClickId(params, clickParams = TRACKERS[DEFAULT_TRACKER].clickParams) {
  const source = params ?? {};
  const hit = clickParams.find(
    (name) => typeof source[name] === 'string' && source[name].trim() !== '',
  );
  return hit ? source[hit].trim() : '';
}

/** Sub and utm params, which should follow the visitor through the funnel. */
export function pickPassThrough(params) {
  const { sub, utm } = classifyParams(params);
  return Object.freeze(
    [...sub, ...utm].reduce((acc, { name, value }) => ({ ...acc, [name]: value }), {}),
  );
}
