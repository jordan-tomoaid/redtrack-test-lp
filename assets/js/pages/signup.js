/**
 * Offer page: a sign-up form that stands in for the advertiser's. Submitting
 * fires the `reg` conversion from the browser — a stand-in for the server-side
 * postback a real offer would send — then moves on to the thank-you page
 * whatever the tracker answered. Nothing typed is kept or sent.
 */
import { bootstrap } from '../page.js';
import { sendPreset, renderPresetPanel, renderConversionPanel } from '../conversion.js';
import { REG_PRESET } from '../presets.js';

const page = bootstrap({ persist: true, debugOnly: true });
const { config, tracker, clickid, log, debug } = page;

const form = document.getElementById('signup-form');
const submit = document.getElementById('signup-submit');
const errorBox = document.getElementById('signup-error');

const thankYouUrl = () => `./thankyou.html${clickid ? `?clickid=${encodeURIComponent(clickid)}` : ''}`;

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.hidden = true;
  if (!form.reportValidity()) {
    errorBox.textContent = 'Please enter a valid email and a password of at least 6 characters.';
    errorBox.hidden = false;
    return;
  }
  submit.disabled = true;
  submit.textContent = 'Creating your account…';

  if (clickid) {
    await sendPreset(config, clickid, REG_PRESET, log);
  } else {
    log('warn', 'No click ID — reg conversion not sent. Open this page through the tracker redirect.');
  }
  // The visitor moves on regardless: a blocked or slow postback is our problem, not theirs.
  window.location.assign(thankYouUrl());
});

if (debug) {
  renderPresetPanel(document.getElementById('preset-panel'), { config, clickid, log });
  renderConversionPanel(document.getElementById('conversion-panel'), {
    config,
    clickid,
    log,
    title: 'Free-form conversion',
    lede: `Debug only. Sends to ${tracker.label} at /${tracker.paths.postback}; use Copy curl if an extension blocks the request.`,
  });
}
