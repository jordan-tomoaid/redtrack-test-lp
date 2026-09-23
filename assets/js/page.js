/**
 * Shared page bootstrap: read settings, resolve the click ID, render the two
 * panels, and hand the page a logger it can append to.
 */
import { readConfig } from './config.js';
import { parseQuery } from './params.js';
import { parseCookies, resolveClickId, readStoredClickId, persistClickId } from './clickid.js';
import { trackerOf, modeOf, MODE_LABELS } from './trackers.js';
import { createLog, appendEntry } from './log.js';
import { renderInspector, renderLog } from './inspector.js';
import { renderBanner } from './banner.js';
import { activateBuiltInScript } from './redtrack.js';

const COOKIE_RECHECK_MS = 3000;

/** True when diagnostics should be visible: ?debug=1 (or debug=true) on the URL. */
export function debugRequested(search) {
  const v = new URLSearchParams(String(search ?? '').replace(/^\?/, '')).get('debug');
  return v === '1' || v === 'true';
}

/**
 * @param {{persist?: boolean, debugOnly?: boolean}} opts
 *   debugOnly: keep the diagnostic panels hidden unless ?debug=1 — for pages real
 *   visitors see. Capture and logging still run; only the rendering is gated.
 */
export function bootstrap({ persist = false, debugOnly = false } = {}) {
  const debug = !debugOnly || debugRequested(window.location.search);
  document.querySelectorAll('[data-debug-only]').forEach((node) => { node.hidden = !debug; });
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
  const mode = modeOf(config);
  errors.forEach((message) => log('error', message));
  log('info', `Tracker profile: ${tracker.label} · mode: ${mode}.`, `${MODE_LABELS[mode]} · click params ${tracker.clickParams.join(' > ')} · cookie ${tracker.cookie}`);

  // The tracker script ships in the HTML but only runs for the active profile AND only in
  // script mode. In redirect mode the 302 already recorded the click; running the script
  // would register a second visit against the script's default campaign.
  const builtIn = mode !== 'script'
    ? Object.freeze({ activated: false, reason: `mode is ${mode}; the click was recorded by the tracker redirect` })
    : activateBuiltInScript(document, tracker, {
    onLoad: (src) => {
      log('ok', `${tracker.label} built-in script loaded.`, src);
      // The script registers the visit over XHR and writes its cookie only after the reply,
      // so check once the network has had a moment — checking at load would always say "not set".
      setTimeout(() => {
        const now = parseCookies(document.cookie)[tracker.cookie] ?? '';
        log(now === '' ? 'warn' : 'ok', `${tracker.cookie} cookie ${COOKIE_RECHECK_MS / 1000}s after the script ran: ${now === '' ? '(not set by the script)' : now}`);
      }, COOKIE_RECHECK_MS);
    },
    onError: (message) => log('error', message),
  });
  if (builtIn.activated) log('info', `${tracker.label} built-in script activated from the page HTML.`, builtIn.src);
  else if (tracker.builtInScript) log(mode === 'script' ? 'warn' : 'info', `Built-in ${tracker.label} script not activated: ${builtIn.reason}.`);
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
    log(mode === 'redirect' ? 'error' : 'warn', 'No click ID found in the URL, cookie or localStorage.',
      mode === 'redirect'
        ? `In redirect mode the ${tracker.label} 302 must append ?${tracker.clickParams[0]}={clickid} to this page's URL — check the lander URL in the campaign.`
        : `Open this page through a ${tracker.label} campaign link, or append ?${tracker.clickParams[0]}=test123 to try the flow.`);
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
    trackerLabel: `${tracker.label} · ${mode}`,
    referrer: document.referrer,
    href: window.location.href,
  });

  return Object.freeze({ config, tracker, mode, params, clickid, source, cookies: cookiesNow, validation, log, debug });
}
