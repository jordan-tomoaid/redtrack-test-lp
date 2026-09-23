/**
 * Social casino lander — the page a RedTrack campaign points real traffic at.
 * Visitors see a clean offer page; the diagnostic panels render only with
 * ?debug=1. Click capture, cookie and event log run regardless.
 */
import { bootstrap } from '../page.js';
import { buildClickUrl } from '../urls.js';
import { pickPassThrough } from '../params.js';
import { el, mount } from '../dom.js';
import { renderConversionPanel } from '../conversion.js';

const page = bootstrap({ persist: true, debugOnly: true });
const { config, tracker, params, clickid, log, debug } = page;

const cta = document.getElementById('lp-cta');
const passThrough = pickPassThrough(params);

// One CTA, one destination: the tracker's /click, which records the click and
// 302s to the offer. If it cannot be built the button stays visible but inert,
// and the reason goes to the log — a real visitor never sees a broken link.
try {
  const href = buildClickUrl(config, { ...passThrough, [tracker.outParam]: clickid });
  cta.href = href;
  log('info', 'CTA target built.', href);
} catch (err) {
  cta.removeAttribute('href');
  cta.setAttribute('aria-disabled', 'true');
  cta.classList.add('is-disabled');
  log('error', 'CTA is inert — the tracker click URL could not be built.', err.message);
}

// Only in debug: the conversion panel, so a test run can fire from here.
if (debug) {
  renderConversionPanel(document.getElementById('conversion-panel'), {
    config,
    clickid,
    log,
    title: 'Fire a test conversion',
    lede: `Debug only — real visitors never see this. Sends to ${tracker.label} at /${tracker.paths.postback}.`,
  });
} else {
  mount(document.getElementById('conversion-panel'), []);
}
