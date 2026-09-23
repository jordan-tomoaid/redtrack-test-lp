/**
 * Thank-you page: the end of the funnel. A visitor page — no postback is sent
 * here, ever. With ?debug=1 the free-form conversion panel appears so a tester
 * can re-send by hand (or copy the curl) if the sign-up send was blocked.
 */
import { bootstrap } from '../page.js';
import { renderConversionPanel } from '../conversion.js';

const page = bootstrap({ persist: false, debugOnly: true });
const { config, tracker, clickid, log, debug } = page;

if (debug) {
  if (clickid === '') log('warn', 'No click ID on this page — nothing can be attributed from here.');
  renderConversionPanel(document.getElementById('conversion-panel'), {
    config,
    clickid,
    log,
    title: 'Re-send a conversion by hand',
    lede: `Debug only. Nothing is sent automatically on this page. Sends to ${tracker.label} at /${tracker.paths.postback}.`,
  });
}
