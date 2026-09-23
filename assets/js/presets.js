/**
 * Conversion presets. Each one sends a fixed parameter set so a single debug run
 * shows where every /postback parameter lands in the tracker's reports, and how
 * its de-duplication modes behave. Pure data plus one resolver; no DOM.
 *
 * Account setup these presets assume (RedTrack → Conversion types):
 *   reg        = Ignore duplicate postbacks
 *   ftd        = Ignore duplicate postbacks by event id
 *   redeposit  = Ignore duplicate postbacks by event id
 *   (default)  = Create new: new or repeated
 */
export const SIGNUP_SOURCE = 'onclick_test';

const CLICKID_TOKEN = '{clickid}';

/** The conversion the real sign-up form fires. */
export const REG_PRESET = Object.freeze({
  key: 'reg',
  label: 'reg',
  type: 'reg',
  sum: '0',
  status: 'approved',
  txid: `reg-${CLICKID_TOKEN}`,
  extra: Object.freeze({ sub1: 'signup_form', sub2: SIGNUP_SOURCE }),
  verify: 'Type=reg · convSub1/2 filled · one S2S postback with payout=0',
});

export const PRESETS = Object.freeze([
  REG_PRESET,
  Object.freeze({ ...REG_PRESET, key: 'reg-dup', label: 'reg (dup)', verify: 'NO new row — Ignore duplicate' }),
  Object.freeze({ key: 'ftd-20', label: 'ftd 20', type: 'ftd', sum: '20', status: 'approved', txid: 'order-1001', extra: Object.freeze({ sub1: 'card' }), verify: 'Payout=20 · S2S payout=20 · Deduplicate Token=order-1001' }),
  Object.freeze({ key: 'ftd-20-same', label: 'ftd 20 (same id)', type: 'ftd', sum: '20', status: 'approved', txid: 'order-1001', extra: Object.freeze({ sub1: 'card' }), verify: 'NO new row — same event id' }),
  Object.freeze({ key: 'ftd-20-new', label: 'ftd 20 (new id)', type: 'ftd', sum: '20', status: 'approved', txid: 'order-1002', extra: Object.freeze({ sub1: 'card' }), verify: 'ONE more ftd — second deposit on the same click' }),
  Object.freeze({ key: 'redeposit-10', label: 'redeposit 10', type: 'redeposit', sum: '10', status: 'approved', txid: 'order-1003', extra: Object.freeze({}), verify: 'Type=redeposit · Payout=10' }),
  Object.freeze({ key: 'unknown', label: 'unknown type', type: 'foo', sum: '1', status: 'approved', txid: null, extra: Object.freeze({}), verify: 'Falls into the Default "conversion" column, not reg/ftd/redeposit' }),
  Object.freeze({ key: 'reg-pending', label: 'reg pending', type: 'reg', sum: '0', status: 'pending', txid: `reg-pending-${CLICKID_TOKEN}`, extra: Object.freeze({}), verify: 'Status=pending · is pending forwarded to the traffic source?' }),
]);

/** Fill the click-ID token and return the exact fields buildPostbackUrl needs. */
export function resolvePreset(preset, clickid) {
  const id = String(clickid ?? '').trim();
  const fill = (v) => (typeof v === 'string' ? v.split(CLICKID_TOKEN).join(id) : v);
  return Object.freeze({
    clickid: id,
    type: preset.type,
    sum: preset.sum,
    status: preset.status,
    txid: fill(preset.txid) ?? undefined,
    extra: Object.freeze({ ...preset.extra }),
  });
}
