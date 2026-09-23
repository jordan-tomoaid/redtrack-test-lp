/**
 * Tracker profiles. Everything that differs between trackers lives here:
 * inbound click-ID parameter names, the cookie the click ID is kept in,
 * endpoint paths, postback parameter names, and which settings a tracker
 * actually needs. Adding a tracker means adding one frozen object below;
 * no other module should hard-code a tracker-specific name.
 */
export const TRACKERS = Object.freeze({
  redtrack: Object.freeze({
    key: 'redtrack',
    label: 'RedTrack',
    // Checked in this order when resolving an inbound click ID.
    clickParams: Object.freeze(['rtkcid', 'clickid', 'rtkclickid']),
    // The name to use when WE put the click ID on a URL (lander URL, direct-to-offer).
    outParam: 'clickid',
    // RedTrack requires this exact cookie name. The docs state it must not be renamed.
    cookie: 'rtkclickid-store',
    paths: Object.freeze({ click: 'click', preclick: 'preclick', postback: 'postback' }),
    // Our field name -> the query parameter this tracker expects. null = not supported.
    postback: Object.freeze({ clickid: 'clickid', sum: 'sum', type: 'type', txid: null }),
    campaignParam: 'cmpid',
    // Tracking modes this tracker supports; the first is the default.
    modes: Object.freeze(['redirect', 'script']),
    // In 'script' mode clicks are only recorded when the universal script runs.
    // In 'redirect' mode the click is recorded by the 302 and the script must NOT run —
    // it would register a second visit against defaultcampaignid.
    script: 'required',
    // Shipped statically in index / preclick / thankyou as <script type="text/plain" data-tracker-script="redtrack">.
    // Must match that tag's src; page.js warns if it drifts.
    builtInScript: 'https://wmipr.ttrk.io/uniclick.js?attribution=lastpaid&cookiedomain=&cookieduration=90&defaultcampaignid=6aa0cde2056bd43dd734e77c&regviewonce=false&script_id=6aa0d33e056bd43dd735a8f1',
    notes: Object.freeze([
      'Redirect mode (PropellerAds and most sources): the click is recorded by the 302 before you arrive; nothing on this page needs to run. Put ?clickid={clickid} on the lander URL in the campaign.',
      'Script mode (Meta, no-redirect): the universal script on this page records the visit and sets rtkclickid-store; switch mode in settings only for that flow.',
    ]),
  }),
  voluum: Object.freeze({
    key: 'voluum',
    label: 'Voluum',
    // Voluum does not fix the lander parameter name — you choose it in the lander URL
    // (e.g. ?cid={clickid}). cid is the conventional choice and matches the postback.
    clickParams: Object.freeze(['cid', 'clickid']),
    outParam: 'cid',
    // Voluum does not prescribe a lander cookie; this name is ours.
    cookie: 'voluum-clickid-store',
    // Multi-offer landers use /click/1, /click/2 … — not modelled yet.
    paths: Object.freeze({ click: 'click', preclick: null, postback: 'postback' }),
    postback: Object.freeze({ clickid: 'cid', sum: 'payout', type: 'et', txid: 'txid' }),
    campaignParam: null,
    modes: Object.freeze(['redirect']),
    // Redirect tracking needs no script. Voluum still recommends a lander script; paste it if you use one.
    script: 'optional',
    builtInScript: null,
    notes: Object.freeze([
      'Start every test from the Voluum campaign URL. /click only works when the visit began there — otherwise the cep parameter is empty and Voluum ignores the click.',
      'Put ?cid={clickid} on the lander URL in Voluum so the click ID reaches this page.',
      'et must match a custom conversion type defined in Voluum; txid de-duplicates conversions.',
    ]),
  }),
});

export const TRACKER_KEYS = Object.freeze(Object.keys(TRACKERS));
export const DEFAULT_TRACKER = 'redtrack';

export function isKnownTracker(key) {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(TRACKERS, key);
}

export const MODE_LABELS = Object.freeze({
  redirect: 'Redirect (302 → this page, click ID in URL)',
  script: 'No-redirect (tracker script on this page)',
});

/** The tracking mode for a config, constrained to what the tracker supports. */
export function modeOf(config) {
  const tracker = trackerOf(config);
  const wanted = config?.mode;
  return tracker.modes.includes(wanted) ? wanted : tracker.modes[0];
}

/** True when the tracker's script should run on this page under the current config. */
export const scriptModeActive = (config) => modeOf(config) === 'script';

/** The profile for a config. Unknown or missing tracker keys fall back to the default. */
export function trackerOf(config) {
  const key = config?.tracker;
  return isKnownTracker(key) ? TRACKERS[key] : TRACKERS[DEFAULT_TRACKER];
}
