/**
 * Conversion page: the shared conversion panel, with the click ID restored from
 * cookie / localStorage when it is no longer in the URL.
 */
import { bootstrap } from '../page.js';
import { renderConversionPanel } from '../conversion.js';

const page = bootstrap({ persist: false });
const { config, clickid, log } = page;

if (clickid === '') {
  log('warn', 'No click ID available, so conversions cannot be attributed.',
    'Visit the landing page through a campaign link first, or type a click ID below.');
}

renderConversionPanel(document.getElementById('conversion-panel'), { config, clickid, log });
