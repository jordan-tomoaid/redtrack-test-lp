/**
 * Frozen names and defaults shared across modules. Tracker-specific names
 * (click-ID params, cookie, paths, postback keys) live in trackers.js.
 */
import { DEFAULT_TRACKER } from './trackers.js';

export const STORAGE_KEY = 'redtrack-test-lp:config';
export const CLICKID_STORAGE_KEY = 'redtrack-test-lp:clickid';
export const CLICKID_COOKIE_DAYS = 30;

// Params a tracker itself owns, shown in their own bucket by the inspector.
export const TRACKING_PARAMS = Object.freeze([
  'clickid', 'rtkcid', 'rtkclickid', 'cmpid', 'campaign_id', 'rt_campaignid', 'type', 'sum',
  'cid', 'payout', 'et', 'txid', 'cep',
]);

export const DEFAULT_CONFIG = Object.freeze({
  tracker: DEFAULT_TRACKER,
  trackingDomain: '',
  campaignId: '',
  offerUrl: '',
  universalScript: '',
  defaultSum: '1.00',
});

export const CONVERSION_TYPES = Object.freeze(['Lead', 'Sale', 'Purchase', 'Signup', 'Deposit']);

// Query params that override stored settings for a single visit.
export const CONFIG_URL_OVERRIDES = Object.freeze({
  rt_tracker: 'tracker',
  rt_domain: 'trackingDomain',
  rt_cmpid: 'campaignId',
  rt_offer: 'offerUrl',
});
