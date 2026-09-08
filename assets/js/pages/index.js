/**
 * Landing page: inject the universal script, persist the click ID, and build
 * the outbound CTAs.
 */
import { bootstrap } from '../page.js';
import { injectScript } from '../redtrack.js';
import { buildClickUrl, buildPreClickUrl, appendParams } from '../urls.js';
import { pickPassThrough } from '../params.js';
import { mount } from '../dom.js';
import { ctaLink, navLink } from '../cta.js';

const page = bootstrap({ persist: true });
const { config, params, clickid, log } = page;

if (config.universalScript.trim() !== '') {
  const result = injectScript(document, config.universalScript, {
    onLoad: (src) => log('ok', 'Universal script loaded.', src),
    onError: (message) => log('error', message),
  });
  result.errors.forEach((message) => log('error', message));
  if (result.injected > 0) log('info', `Injected ${result.injected} script tag(s) from settings.`);
}

const passThrough = pickPassThrough(params);

mount(document.getElementById('cta-area'), [
  ctaLink({
    label: 'Go to offer via /click',
    hint: 'Single landing page flow. RedTrack records the click and redirects to the offer.',
    build: () => buildClickUrl(config, passThrough),
    log,
  }),
  ctaLink({
    label: 'Go to pre-lander via /preclick',
    hint: 'Two-step flow. Use this when a second page sits between the landing page and the offer.',
    build: () => buildPreClickUrl(config, passThrough),
    log,
  }),
  ctaLink({
    label: 'Go straight to the offer URL',
    hint: 'Skips RedTrack and appends the click ID directly. Useful for isolating a redirect problem.',
    build: () => appendParams(config.offerUrl, { ...passThrough, clickid }),
    log,
  }),
  navLink({
    label: 'Skip ahead to the conversion page',
    href: './thankyou.html',
    hint: 'Fires conversions using the click ID captured on this page.',
  }),
]);
