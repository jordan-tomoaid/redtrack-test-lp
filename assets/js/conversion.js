/**
 * The conversion panel: fields → postback URL → send, plus the equivalent curl.
 * Rendered by the landing page (fire while the click ID is still in the URL)
 * and the conversion page. All tracker-specific names come from the profile.
 */
import { el, mount } from './dom.js';
import { buildPostbackUrl } from './urls.js';
import { sendByFetch, sendByPixel, curlFor, copyToClipboard } from './postback.js';
import { CONVERSION_TYPES } from './constants.js';
import { trackerOf } from './trackers.js';

const FIELDS = Object.freeze([
  { key: 'clickid', label: 'Click ID', placeholder: 'not captured yet', hint: 'from this visit' },
  { key: 'sum', label: 'Sum', placeholder: '1.00', hint: 'payout; anything but 0', inputmode: 'decimal' },
  { key: 'type', label: 'Type', placeholder: '(leave empty on the first run)', hint: 'must exist in the tracker' },
  { key: 'txid', label: 'Transaction ID', placeholder: 'order-1001', hint: 'de-duplicates; optional' },
]);

function describe(result) {
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
 * @param {HTMLElement} root
 * @param {{config: object, clickid: string, log: Function, title?: string, lede?: string}} opts
 */
export function renderConversionPanel(root, { config, clickid, log, title = 'Fire a conversion', lede }) {
  if (!root) return;
  const tracker = trackerOf(config);
  const defaults = { clickid, sum: config.defaultSum, type: '', txid: '' };

  const inputs = Object.fromEntries(
    FIELDS.filter((f) => f.key !== 'txid' || tracker.postback.txid).map((f) => [
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
    const { type, sum } = values();
    log('info', `Sending conversion via ${transport}.`, `type=${type || '(none)'} sum=${sum || '(none)'}`);
    const result = transport === 'pixel' ? await sendByPixel(url, document) : await sendByFetch(url);
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
    el('span', { class: 'hint', text: `${tracker.postback[f.key] ?? '—'} · ${f.hint}` }),
    inputs[f.key],
  ]);

  mount(root, [
    el('h2', { text: title }),
    el('p', { class: 'lede', text: lede ?? `Sends to ${tracker.label} at /${tracker.paths.postback}. HTTP status and reply are shown in the event log.` }),
    el('div', { class: 'field-row' }, FIELDS.filter((f) => inputs[f.key]).map(field)),
    el('div', {}, [
      el('span', { class: 'muted', text: 'Preset types' }),
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
    el('p', { class: 'note', text: `Send conversion reads the tracker's real HTTP status and reply when the tracker allows cross-origin reads (${tracker.label === 'RedTrack' ? 'RedTrack does' : 'check the log'}). If it does not, the request is still sent and the log says the reply was unreadable — use the curl line then.` }),
  ]);

  Object.values(inputs).forEach((i) => i.addEventListener('input', currentUrl));
  currentUrl();
}
