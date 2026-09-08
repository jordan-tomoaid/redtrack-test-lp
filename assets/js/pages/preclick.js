/**
 * Pre-lander: proves the click ID survives a hop, then forwards to the offer.
 */
import { bootstrap } from '../page.js';
import { buildClickUrl, appendParams } from '../urls.js';
import { pickPassThrough } from '../params.js';
import { mount } from '../dom.js';
import { ctaLink, navLink } from '../cta.js';

const page = bootstrap({ persist: true });
const { config, params, clickid, source, log } = page;

if (clickid === '') {
  log('error', 'The click ID did not survive the hop to this page.',
    'Check that the /preclick script variant is selected in RedTrack and that the cookie domain matches.');
} else {
  log('ok', `Click ID carried over from ${source}.`, clickid);
}

const passThrough = pickPassThrough(params);

mount(document.getElementById('cta-area'), [
  ctaLink({
    label: 'Continue to offer via /click',
    hint: 'Completes the two-step flow. RedTrack records the click here.',
    build: () => buildClickUrl(config, { ...passThrough, clickid }),
    log,
  }),
  ctaLink({
    label: 'Continue straight to the offer URL',
    hint: 'Bypasses RedTrack, carrying the click ID by hand.',
    build: () => appendParams(config.offerUrl, { ...passThrough, clickid }),
    log,
  }),
  navLink({ label: 'Back to the landing page', href: './index.html' }),
]);
