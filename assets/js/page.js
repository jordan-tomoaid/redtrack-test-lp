/**
 * Shared page bootstrap: read settings, resolve the click ID, render the two
 * panels, and hand the page a logger it can append to.
 */
import { readConfig } from './config.js';
import { parseQuery } from './params.js';
import { parseCookies, resolveClickId, readStoredClickId, persistClickId } from './clickid.js';
import { trackerOf } from './trackers.js';
import { createLog, appendEntry } from './log.js';
import { renderInspector, renderLog } from './inspector.js';
import { renderBanner } from './banner.js';
import { activateBuiltInScript } from './redtrack.js';

export function bootstrap({ persist = false } = {}) {
  const logNode = document.getElementById('event-log');
  const inspectorNode = document.getElementById('inspector');
  const bannerNode = document.getElementById('config-banner');

  let logState = createLog();
  const log = (level, message, detail = null) => {
    logState = appendEntry(logState, { level, message, detail });
    renderLog(logNode, logState);
  };

  const { config, applied, errors } = readConfig(window.localStorage, window.location.search);
  const tracker = trackerOf(config);
  errors.forEach((message) => log('error', message));
  log('info', `Tracker profile: ${tracker.label}.`, `click params ${tracker.clickParams.join(' > ')} · cookie ${tracker.cookie}`);

  // The tracker script ships in the HTML but only runs for the active profile.
  const builtIn = activateBuiltInScript(document, tracker, {
    onLoad: (src) => {
      const now = parseCookies(document.cookie)[tracker.cookie] ?? '';
      log('ok', `${tracker.label} built-in script loaded.`, src);
      log(now === '' ? 'warn' : 'ok', `${tracker.cookie} cookie after the script ran: ${now === '' ? '(not set by the script)' : now}`);
    },
    onError: (message) => log('error', message),
  });
  if (builtIn.activated) log('info', `${tracker.label} built-in script activated from the page HTML.`, builtIn.src);
  else if (tracker.builtInScript) log('warn', `Built-in ${tracker.label} script not activated: ${builtIn.reason}.`);
  if (applied.length > 0) log('info', `Settings overridden by URL: ${applied.join(', ')}`);

  const params = parseQuery(window.location.search);
  const cookies = parseCookies(document.cookie);
  const { clickid, source } = resolveClickId({
    params,
    cookies,
    stored: readStoredClickId(window.localStorage),
    tracker,
  });

  if (clickid === '') {
    log('warn', 'No click ID found in the URL, cookie or localStorage.',
      `Open this page through a ${tracker.label} campaign link, or append ?${tracker.clickParams[0]}=test123 to try the flow.`);
  } else {
    log('ok', `Click ID resolved from ${source}.`, clickid);
    if (persist && source === 'url') {
      // When the tracker's own script is on the page it owns the cookie; we only keep localStorage.
      const stored = persistClickId(document, window.localStorage, clickid, tracker.cookie, { cookie: !builtIn.activated });
      if (stored.ok) log('ok', builtIn.activated
        ? `Click ID kept in localStorage; the ${tracker.cookie} cookie is left to the ${tracker.label} script.`
        : `Click ID persisted to the ${tracker.cookie} cookie and localStorage.`);
      else stored.errors.forEach((message) => log('error', message));
    }
  }

  const validation = renderBanner(bannerNode, config);
  validation.errors.forEach((message) => log('warn', message));

  // Re-read the cookie jar: persistence above may have just written to it.
  const cookiesNow = parseCookies(document.cookie);

  renderInspector(inspectorNode, {
    params,
    clickid,
    source,
    cookieName: tracker.cookie,
    cookieValue: cookiesNow[tracker.cookie] ?? '',
    trackerLabel: tracker.label,
    referrer: document.referrer,
    href: window.location.href,
  });

  return Object.freeze({ config, tracker, params, clickid, source, cookies: cookiesNow, validation, log });
}
