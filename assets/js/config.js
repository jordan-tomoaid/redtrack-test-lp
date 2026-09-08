/**
 * Settings state. Storage is injected so this module stays testable in Node.
 * Every function returns a new frozen config; nothing is mutated in place.
 */
import { DEFAULT_CONFIG, STORAGE_KEY, CONFIG_URL_OVERRIDES } from './constants.js';
import { parseQuery } from './params.js';
import { normalizeDomain } from './urls.js';

/** Coerce anything into a complete, frozen config. Unknown keys are dropped. */
export function withDefaults(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return Object.freeze(
    Object.keys(DEFAULT_CONFIG).reduce(
      (acc, key) => ({
        ...acc,
        [key]: typeof source[key] === 'string' ? source[key] : DEFAULT_CONFIG[key],
      }),
      {},
    ),
  );
}

export function updateConfig(config, patch) {
  return withDefaults({ ...withDefaults(config), ...(patch ?? {}) });
}

/**
 * Recover a config from stored JSON. Corrupt data falls back to defaults and
 * reports why, rather than throwing or resetting silently.
 */
export function parseStoredConfig(json) {
  if (json === null || json === undefined || json === '') {
    return Object.freeze({ config: withDefaults(), error: null });
  }
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return Object.freeze({
        config: withDefaults(),
        error: 'Stored settings are not an object. Defaults are in use.',
      });
    }
    return Object.freeze({ config: withDefaults(parsed), error: null });
  } catch (err) {
    return Object.freeze({
      config: withDefaults(),
      error: `Stored settings are not valid JSON (${err.message}). Defaults are in use.`,
    });
  }
}

/** Let ?rt_domain= / ?rt_cmpid= / ?rt_offer= override stored values for one visit. */
export function applyUrlOverrides(config, search) {
  const params = parseQuery(search);
  const patch = Object.entries(CONFIG_URL_OVERRIDES).reduce(
    (acc, [param, field]) =>
      typeof params[param] === 'string' && params[param].trim() !== ''
        ? { ...acc, [field]: params[param].trim() }
        : acc,
    {},
  );
  return Object.freeze({
    config: updateConfig(config, patch),
    applied: Object.freeze(Object.keys(patch)),
  });
}

export function validateConfig(config) {
  const current = withDefaults(config);
  const errors = [
    normalizeDomain(current.trackingDomain) === ''
      ? 'Tracking domain is missing — CTA and postback URLs cannot be built.'
      : null,
    current.campaignId.trim() === '' ? 'Campaign ID (cmpid) is missing.' : null,
    current.offerUrl.trim() === '' ? 'Offer URL is missing.' : null,
    current.universalScript.trim() === ''
      ? 'No universal script pasted — click recording will not happen.'
      : null,
  ].filter(Boolean);
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

function safeGet(storage, key) {
  try {
    return { value: storage?.getItem?.(key) ?? null, error: null };
  } catch (err) {
    return { value: null, error: `Could not read saved settings: ${err.message}` };
  }
}

export function readConfig(storage, search = '') {
  const raw = safeGet(storage, STORAGE_KEY);
  const stored = parseStoredConfig(raw.value);
  const { config, applied } = applyUrlOverrides(stored.config, search);
  return Object.freeze({
    config,
    applied,
    errors: Object.freeze([raw.error, stored.error].filter(Boolean)),
  });
}

export function writeConfig(storage, config) {
  const next = withDefaults(config);
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
    return Object.freeze({ config: next, error: null });
  } catch (err) {
    return Object.freeze({ config: next, error: `Could not save settings: ${err.message}` });
  }
}
