/**
 * Conversion page: fire conversions by type, and build a raw postback URL for
 * server-to-server testing.
 */
import { bootstrap } from '../page.js';
import { buildPostbackUrl } from '../urls.js';
import { sendByFetch, sendByPixel, copyToClipboard } from '../postback.js';
import { CONVERSION_TYPES } from '../constants.js';
import { el, mount } from '../dom.js';
import { trackerOf } from '../trackers.js';

const page = bootstrap({ persist: false });
const { config, clickid, log } = page;
const tracker = trackerOf(config);

const urlOutput = document.getElementById('postback-url');
const clickidInput = document.getElementById('pb-clickid');
const sumInput = document.getElementById('pb-sum');
const typeInput = document.getElementById('pb-type');
const txidInput = document.getElementById('pb-txid');

// Show the parameter names this tracker actually receives.
Object.entries(tracker.postback).forEach(([field, key]) => {
  const label = document.getElementById(`k-${field}`);
  if (label) label.textContent = key ?? '—';
});
document.getElementById('txid-field').hidden = !tracker.postback.txid;
document.getElementById('fire-lede').textContent =
  `Sending to ${tracker.label} at /${tracker.paths.postback}. The click ID is prefilled from this visit; edit any field to rebuild the URL.`;

clickidInput.value = clickid;
sumInput.value = config.defaultSum;

if (clickid === '') {
  log('warn', 'No click ID available, so conversions cannot be attributed.',
    'Visit the landing page through a campaign link first, or type a click ID below.');
}

/** Current form values as a frozen object. */
function formValues() {
  return Object.freeze({
    clickid: clickidInput.value.trim(),
    sum: sumInput.value.trim(),
    type: typeInput.value.trim(),
    txid: txidInput.value.trim(),
  });
}

function showUrl(url) {
  mount(urlOutput, el('code', { class: 'url', text: url }));
}

function showError(message) {
  mount(urlOutput, el('p', { class: 'error-text', text: message }));
}

/** @returns {string|null} the built URL, or null after reporting the failure. */
function currentUrl() {
  try {
    const url = buildPostbackUrl(config, formValues());
    showUrl(url);
    return url;
  } catch (err) {
    showError(err.message);
    log('error', 'Could not build the postback URL.', err.message);
    return null;
  }
}

async function fire(transport) {
  const url = currentUrl();
  if (url === null) return;

  const { type, sum } = formValues();
  log('info', `Sending conversion via ${transport}.`, `type=${type || '(none)'} sum=${sum || '(none)'}`);

  const result = transport === 'pixel' ? await sendByPixel(url, document) : await sendByFetch(url);

  if (result.sent) log('ok', `Conversion sent via ${result.transport}.`, result.note);
  else log('error', `Conversion failed via ${result.transport}.`, result.error);
}

// Preset conversion type buttons.
mount(
  document.getElementById('type-buttons'),
  CONVERSION_TYPES.map((type) =>
    el('button', {
      class: 'btn',
      type: 'button',
      text: type,
      onclick: () => {
        typeInput.value = type;
        currentUrl();
        log('info', `Conversion type set to ${type}.`);
      },
    })),
);

document.getElementById('send-fetch').addEventListener('click', () => fire('fetch'));
document.getElementById('send-pixel').addEventListener('click', () => fire('pixel'));
document.getElementById('build-url').addEventListener('click', () => currentUrl());

document.getElementById('copy-url').addEventListener('click', async () => {
  const url = currentUrl();
  if (url === null) return;
  const result = await copyToClipboard(url);
  if (result.copied) log('ok', 'Postback URL copied to the clipboard.');
  else log('error', 'Copy failed.', result.error);
});

[clickidInput, sumInput, typeInput, txidInput].forEach((input) =>
  input.addEventListener('input', () => currentUrl()));

currentUrl();
