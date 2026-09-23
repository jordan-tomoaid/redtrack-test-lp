/**
 * Conversion sending, three ways that share one path:
 *   sendPreset()            — fixed parameter set (the real sign-up form, and the debug presets)
 *   renderPresetPanel()     — debug: one button per preset
 *   renderConversionPanel() — debug: free-form fields, URL, curl
 * All tracker-specific names come from the profile via buildPostbackUrl.
 */
import { el, mount } from './dom.js';
import { buildPostbackUrl } from './urls.js';
import { sendByFetch, sendByPixel, curlFor, copyToClipboard } from './postback.js';
import { CONVERSION_TYPES } from './constants.js';
import { trackerOf } from './trackers.js';
import { PRESETS, resolvePreset } from './presets.js';

const FIELDS = Object.freeze([
  { key: 'clickid', label: 'Click ID', placeholder: 'not captured yet', hint: 'from this visit' },
  { key: 'type', label: 'Type', placeholder: 'reg', hint: 'case-sensitive; must exist in the tracker' },
  { key: 'sum', label: 'Sum', placeholder: '0', hint: 'payout', inputmode: 'decimal' },
  { key: 'status', label: 'Status', placeholder: 'approved', hint: 'approved / pending / declined' },
  { key: 'txid', label: 'Event ID', placeholder: 'order-1001', hint: 'de-dup token; optional' },
]);

// A visitor must never be held on the sign-up page by a slow or blocked postback.
const SEND_TIMEOUT_MS = 4000;
const TIMED_OUT = Object.freeze({
  sent: true, transport: 'fetch', readable: false, status: null, ok: null, body: '', reply: null, error: null,
  note: `No reply within ${SEND_TIMEOUT_MS / 1000}s — the request may still have gone out; check the tracker's conversion log.`,
});
const withTimeout = (promise) => Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(TIMED_OUT), SEND_TIMEOUT_MS))]);

export function describe(result) {
  if (!result.sent) return { level: 'error', message: `Conversion failed via ${result.transport}.`, detail: result.error };
  if (result.readable) {
    const reply = result.reply
      ? Object.entries(result.reply).map(([k, v]) => `${k}=${v}`).join(' ')
      : (result.body || '(empty body)');
    return {
      level: result.ok ? 'ok' : 'error',
      message: `HTTP ${result.status} — ${result.ok ? 'tracker accepted the conversion' : 'tracker rejected the request'}.`,
      detail: reply,
    };
  }
  return { level: 'warn', message: `Sent via ${result.transport}, response not readable.`, detail: result.note };
}

/**
 * Send one preset for a click ID. Logs the exact URL before sending and the
 * tracker's answer after. Never throws; returns the send result (or null when
 * the URL could not be built).
 */
export async function sendPreset(config, clickid, preset, log) {
  let url;
  try {
    url = buildPostbackUrl(config, resolvePreset(preset, clickid));
  } catch (err) {
    log('error', `Preset "${preset.label}" — could not build the postback URL.`, err.message);
    return null;
  }
  log('info', `Preset "${preset.label}" → sending`, url);
  const result = await withTimeout(sendByFetch(url));
  const { level, message, detail } = describe(result);
  log(level, `Preset "${preset.label}" — ${message}`, detail);
  return result;
}

/** Debug only: one button per preset, in the order the verification table lists them. */
export function renderPresetPanel(root, { config, clickid, log }) {
  if (!root) return;
  const tracker = trackerOf(config);
  const disabled = String(clickid ?? '').trim() === '';
  mount(root, [
    el('h2', { text: 'Parameter presets' }),
    el('p', { class: 'lede', text: `Each button sends a fixed set to ${tracker.label} for click ID ${clickid || '(none — open this page through the tracker first)'}. Press them top to bottom, then compare the tracker's Conversions and S2S Postbacks logs with the hints.` }),
    el('ol', { class: 'presets' }, PRESETS.map((preset) => el('li', {}, [
      el('button', { class: 'btn', type: 'button', text: preset.label, disabled: disabled ? 'disabled' : null, onclick: () => sendPreset(config, clickid, preset, log) }),
      el('span', { class: 'preset-verify', text: preset.verify }),
    ]))),
  ]);
}

/**
 * Debug only: free-form fields → postback URL → send, plus the equivalent curl.
 * @param {HTMLElement} root
 * @param {{config: object, clickid: string, log: Function, title?: string, lede?: string}} opts
 */
export function renderConversionPanel(root, { config, clickid, log, title = 'Fire a conversion', lede }) {
  if (!root) return;
  const tracker = trackerOf(config);
  const defaults = { clickid, type: '', sum: config.defaultSum, status: 'approved', txid: '' };

  // Only fields this tracker has a postback parameter for.
  const inputs = Object.fromEntries(
    FIELDS.filter((f) => tracker.postback[f.key]).map((f) => [
      f.key,
      el('input', { type: 'text', name: `pb-${f.key}`, autocomplete: 'off', inputmode: f.inputmode ?? null, placeholder: f.placeholder, value: defaults[f.key] ?? '' }),
    ]),
  );
  const values = () => Object.freeze(Object.fromEntries(Object.entries(inputs).map(([k, i]) => [k, i.value.trim()])));

  const urlBox = el('div');
  const curlBox = el('code', { class: 'url' });

  const currentUrl = () => {
    try {
      const url = buildPostbackUrl(config, values());
      mount(urlBox, el('code', { class: 'url', text: url }));
      curlBox.textContent = curlFor(url);
      return url;
    } catch (err) {
      mount(urlBox, el('p', { class: 'error-text', text: err.message }));
      curlBox.textContent = '';
      return null;
    }
  };

  const fire = async (transport) => {
    const url = currentUrl();
    if (url === null) { log('error', 'Could not build the postback URL.'); return; }
    const { type, sum, status } = values();
    log('info', `Sending conversion via ${transport}.`, `type=${type || '(none)'} sum=${sum || '(none)'} status=${status || '(none)'}`);
    const result = transport === 'pixel' ? await sendByPixel(url, document) : await withTimeout(sendByFetch(url));
    const { level, message, detail } = describe(result);
    log(level, message, detail);
  };

  const copy = async (text, what) => {
    if (!text) return;
    const result = await copyToClipboard(text);
    log(result.copied ? 'ok' : 'error', result.copied ? `${what} copied.` : 'Copy failed.', result.copied ? null : result.error);
  };

  const field = (f) => el('label', {}, [
    f.label,
    el('span', { class: 'hint', text: `${tracker.postback[f.key]} · ${f.hint}` }),
    inputs[f.key],
  ]);

  mount(root, [
    el('h2', { text: title }),
    el('p', { class: 'lede', text: lede ?? `Sends to ${tracker.label} at /${tracker.paths.postback}. HTTP status and reply are shown in the event log.` }),
    el('div', { class: 'field-row' }, FIELDS.filter((f) => inputs[f.key]).map(field)),
    el('div', {}, [
      el('span', { class: 'muted', text: 'Conversion types in this account' }),
      el('div', { class: 'row', style: 'margin-top:.4rem' }, CONVERSION_TYPES.map((t) =>
        el('button', { class: 'btn', type: 'button', text: t, onclick: () => { inputs.type.value = t; currentUrl(); } }))),
    ]),
    el('div', {}, [el('span', { class: 'muted', text: 'Postback URL' }), urlBox]),
    el('div', { class: 'row' }, [
      el('button', { class: 'btn primary', type: 'button', text: 'Send conversion', onclick: () => fire('fetch') }),
      el('button', { class: 'btn', type: 'button', text: 'Send via image pixel', onclick: () => fire('pixel') }),
      el('button', { class: 'btn', type: 'button', text: 'Copy URL', onclick: () => copy(currentUrl(), 'Postback URL') }),
    ]),
    el('div', {}, [
      el('span', { class: 'muted', text: 'Same request from a terminal' }),
      curlBox,
      el('div', { class: 'row', style: 'margin-top:.4rem' }, [
        el('button', { class: 'btn', type: 'button', text: 'Copy curl', onclick: () => copy(curlBox.textContent, 'curl command') }),
      ]),
    ]),
    el('p', { class: 'note', text: 'If the network tab shows (blocked:other), a browser extension cancelled the request before it left — the tracker never saw it. Use the curl line, or an extension-free profile.' }),
  ]);

  Object.values(inputs).forEach((i) => i.addEventListener('input', currentUrl));
  currentUrl();
}
