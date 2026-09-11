/**
 * Landing page: inject the universal script, persist the click ID, and build
 * the outbound CTAs.
 */
import { bootstrap } from '../page.js';
import { injectScript } from '../redtrack.js';
import { buildClickUrl, buildPreClickUrl, appendParams } from '../urls.js';
import { pickPassThrough } from '../params.js';
import { el, mount } from '../dom.js';
import { ctaLink, navLink } from '../cta.js';

const page = bootstrap({ persist: true });
const { config, tracker, params, clickid, log } = page;

if (config.universalScript.trim() !== '') {
  const result = injectScript(document, config.universalScript, {
    onLoad: (src) => log('ok', 'Universal script loaded.', src),
    onError: (message) => log('error', message),
  });
  result.errors.forEach((message) => log('error', message));
  if (result.injected > 0) log('info', `Injected ${result.injected} script tag(s) from settings.`);
} else if (tracker.script === 'optional') {
  log('info', `${tracker.label}: no lander script pasted — that is fine for redirect tracking.`);
}

const passThrough = pickPassThrough(params);

mount(document.getElementById('cta-area'), [
  ctaLink({
    label: 'Go to offer via /click',
    hint: `Single landing page flow. ${tracker.label} records the click and redirects to the offer.`,
    build: () => buildClickUrl(config, passThrough),
    log,
  }),
  ctaLink({
    label: 'Go to pre-lander via /preclick',
    hint: `Two-step flow. Only trackers with a /preclick endpoint support it (${tracker.paths.preclick ? 'yes for ' : 'not '}${tracker.label}).`,
    build: () => buildPreClickUrl(config, passThrough),
    log,
  }),
  ctaLink({
    label: 'Go straight to the offer URL',
    hint: 'Skips RedTrack and appends the click ID directly. Useful for isolating a redirect problem.',
    build: () => appendParams(config.offerUrl, { ...passThrough, [tracker.clickParams[0]]: clickid }),
    log,
  }),
  navLink({
    label: 'Skip ahead to the conversion page',
    href: './thankyou.html',
    hint: 'Fires conversions using the click ID captured on this page.',
  }),
]);

mount(document.getElementById('tracker-notes'), [
  el('h3', { text: `${tracker.label} notes` }),
  el('ul', { class: 'notes' }, tracker.notes.map((note) => el('li', { text: note }))),
]);
