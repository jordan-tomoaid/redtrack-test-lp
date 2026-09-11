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
    // RedTrack requires this exact cookie name. The docs state it must not be renamed.
    cookie: 'rtkclickid-store',
    paths: Object.freeze({ click: 'click', preclick: 'preclick', postback: 'postback' }),
    // Our field name -> the query parameter this tracker expects. null = not supported.
    postback: Object.freeze({ clickid: 'clickid', sum: 'sum', type: 'type', txid: null }),
    campaignParam: 'cmpid',
    // 'required': clicks are only recorded when the pasted universal script runs.
    script: 'required',
    notes: Object.freeze([
      'Generate the universal script in RedTrack under Tools → Scripts → New and paste it in settings; without it this visit is not recorded as a click.',
    ]),
  }),
  voluum: Object.freeze({
    key: 'voluum',
    label: 'Voluum',
    // Voluum does not fix the lander parameter name — you choose it in the lander URL
    // (e.g. ?cid={clickid}). cid is the conventional choice and matches the postback.
    clickParams: Object.freeze(['cid', 'clickid']),
    // Voluum does not prescribe a lander cookie; this name is ours.
    cookie: 'voluum-clickid-store',
    // Multi-offer landers use /click/1, /click/2 … — not modelled yet.
    paths: Object.freeze({ click: 'click', preclick: null, postback: 'postback' }),
    postback: Object.freeze({ clickid: 'cid', sum: 'payout', type: 'et', txid: 'txid' }),
    campaignParam: null,
    // Redirect tracking needs no script. Voluum still recommends a lander script; paste it if you use one.
    script: 'optional',
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

/** The profile for a config. Unknown or missing tracker keys fall back to the default. */
export function trackerOf(config) {
  const key = config?.tracker;
  return isKnownTracker(key) ? TRACKERS[key] : TRACKERS[DEFAULT_TRACKER];
}
